'use client';

/**
 * VoiceUI — AutoCare AI real-time voice interface
 *
 * Connection model (ephemeral-token, client-to-Gemini):
 *   1. POST /api/voice/token  → server mints short-lived token (API key never
 *      leaves server; system prompt + tools locked in liveConnectConstraints)
 *   2. Browser opens Gemini Live session using the token as an ephemeral key
 *   3. Microphone audio is captured as PCM16 → sent as Blob via sendRealtimeInput
 *   4. AI audio comes back as msg.data (base64 PCM16 24 kHz) → decoded + played
 *   5. Tool calls (msg.toolCall.functionCalls) are proxied to /api/voice/tool
 *      so every DB write goes through Clerk-authenticated server code
 *   6. On end / unmount: mic, AudioContext, and session are released
 *
 * Audio formats (Gemini Live API spec):
 *   Input:  PCM16, mono, 16 000 Hz  — sent as Blob with mimeType audio/pcm;rate=16000
 *   Output: PCM16, mono, 24 000 Hz  — received as base64 via msg.data
 *
 * Reconnect policy:
 *   Max 3 automatic retries, exponential backoff: 1 s → 4 s → 16 s.
 *   After 3 failures the error is shown and no further reconnect is attempted.
 */

import { GoogleGenAI, Modality } from '@google/genai';
import { useEffect, useRef, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Mic, PhoneOff, AlertCircle, Volume2, Loader2, MessageSquare, ChevronRight,
} from 'lucide-react';

/* ── Constants ──────────────────────────────────────────────────── */

const INPUT_SAMPLE_RATE = 16000;  // Hz — Gemini Live input spec
const OUTPUT_SAMPLE_RATE = 24000;  // Hz — Gemini Live output spec
const SCRIPT_BUFFER_SIZE = 4096;   // samples per ScriptProcessorNode callback
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

/* ── Session state enum ─────────────────────────────────────────── */

const S = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  LISTENING: 'listening',
  SPEAKING: 'speaking',
  ENDING: 'ending',
  ERROR: 'error',
};

/* ── Audio helpers ──────────────────────────────────────────────── */

/**
 * Converts a Float32Array (Web Audio API) to a Google AI SDK Blob object.
 *
 * IMPORTANT: The SDK's sendRealtimeInput({ audio }) expects a Google AI SDK
 * Blob — a plain object { mimeType: string, data: string } — NOT a browser-
 * native Blob. The SDK's tAudioBlob validator reads .mimeType (not .type);
 * browser Blob has .type, so the SDK always sees undefined and throws:
 *   "Unsupported mime type: undefined"
 *
 * Confirmed from @google/genai/dist/index.mjs lines 3293–3299:
 *   function tAudioBlob(blob) {
 *     if (blob.mimeType && blob.mimeType.startsWith('audio/')) return blob;
 *     throw new Error(`Unsupported mime type: ${blob.mimeType}`);
 *   }
 *
 * Audio format required by Gemini Live input:
 *   - Encoding: signed 16-bit little-endian PCM (PCM16)
 *   - Sample rate: 16,000 Hz (INPUT_SAMPLE_RATE)
 *   - Channels: mono (1)
 *   - MIME type: 'audio/pcm;rate=16000'
 *   - Data: base64-encoded raw PCM bytes
 */
function float32ToSDKAudio(float32Array) {
  // Step 1: Float32 [-1,1] → Int16 PCM16 little-endian
  const pcmBuf = new ArrayBuffer(float32Array.length * 2);
  const pcmView = new DataView(pcmBuf);
  for (let i = 0; i < float32Array.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32Array[i]));
    // Asymmetric clamp: negative maps to -32768, positive to +32767
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    pcmView.setInt16(i * 2, int16, /* littleEndian= */ true);
  }

  // Step 2: ArrayBuffer → base64 string
  // Using Uint8Array + String.fromCharCode is the most reliable cross-browser path.
  const bytes = new Uint8Array(pcmBuf);
  let binary = '';
  // Process in chunks to avoid call-stack overflow on large buffers
  const CHUNK = 8192;
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }

  // Step 3: Return Google AI SDK Blob — { mimeType, data } plain object
  return {
    mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
    data: btoa(binary),
  };
}

/**
 * Decodes a base64 PCM16 string (from msg.data) into a Float32Array
 * suitable for Web Audio playback at OUTPUT_SAMPLE_RATE.
 */
function base64ToFloat32(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  const out = new Float32Array(bytes.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = view.getInt16(i * 2, true) / 0x7fff;
  }
  return out;
}

/* ── Component ──────────────────────────────────────────────────── */

export default function VoiceUI({ firstName, vehicle }) {
  const [state, setState] = useState(S.IDLE);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [transcript, setTranscript] = useState([]);   // { role, text }[]

  /* Refs — survive renders without triggering them */
  const stateRef        = useRef(S.IDLE);  // mirror of state, readable in callbacks
  const sessionRef      = useRef(null);    // Gemini Live Session
  const micStreamRef    = useRef(null);    // getUserMedia MediaStream
  const inputCtxRef     = useRef(null);    // AudioContext for mic capture (16 kHz)
  const outputCtxRef    = useRef(null);    // AudioContext for playback (24 kHz)
  const processorRef    = useRef(null);    // ScriptProcessorNode
  const outputQueueRef  = useRef([]);      // Float32Array[] queued for playback
  const isPlayingRef    = useRef(false);
  const retryCountRef   = useRef(0);
  const convIdRef       = useRef(null);
  const isMountedRef    = useRef(true);

  /**
   * Buffer for the assistant's in-progress transcription.
   * Gemini Live emits outputTranscription.text in incremental fragments.
   * We accumulate them here and commit to React state only on turnComplete,
   * so the transcript shows one message per assistant turn — not one per chunk.
   * Cleared on turnComplete (after commit) and on interruption (discard).
   */
  const assistantBufRef = useRef('');

  /**
   * Ref mirror of the `transcript` React state array.
   * Updated synchronously every time setTranscript is called via a wrapper.
   * Used in endSession so the PATCH body always contains the latest messages,
   * even if React hasn't re-rendered yet (stale closure on useCallback deps).
   */
  const transcriptRef = useRef([]);

  /* Keep stateRef in sync whenever state changes */
  const setStateSynced = useCallback((next) => {
    stateRef.current = next;
    setState(next);
  }, []);

  /**
   * Append one entry to transcript state AND keep transcriptRef in sync.
   * Always use this instead of calling setTranscript directly, so that
   * endSession can safely read transcriptRef.current without a stale closure.
   */
  const pushTranscript = useCallback((entry) => {
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript(transcriptRef.current);
  }, []);

  /* ── Cleanup ─────────────────────────────────────────────────── */
  const cleanup = useCallback(() => {
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;

    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch { }
      processorRef.current = null;
    }
    if (inputCtxRef.current && inputCtxRef.current.state !== 'closed') {
      inputCtxRef.current.close().catch(() => { });
      inputCtxRef.current = null;
    }
    if (outputCtxRef.current && outputCtxRef.current.state !== 'closed') {
      outputCtxRef.current.close().catch(() => { });
      outputCtxRef.current = null;
    }
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch { }
      sessionRef.current = null;
    }
    outputQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
      // Best-effort: mark conversation ended on unmount
      if (convIdRef.current) {
        fetch(`/api/conversations/${convIdRef.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ended', endedAt: new Date().toISOString() }),
          keepalive: true,
        }).catch(() => { });
      }
    };
  }, [cleanup]);

  /* ── Audio output: play queued PCM chunks sequentially ──────── */
  const playNextChunk = useCallback(() => {
    // Use ref so this is never stale inside onended callback
    if (!outputCtxRef.current || outputQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      // Only transition away from SPEAKING if we're still in that state
      if (isMountedRef.current && stateRef.current === S.SPEAKING) {
        setStateSynced(S.LISTENING);
      }
      return;
    }
    isPlayingRef.current = true;
    const floats = outputQueueRef.current.shift();
    const buf = outputCtxRef.current.createBuffer(1, floats.length, OUTPUT_SAMPLE_RATE);
    buf.copyToChannel(floats, 0);
    const src = outputCtxRef.current.createBufferSource();
    src.buffer = buf;
    src.connect(outputCtxRef.current.destination);
    src.onended = playNextChunk;
    try {
      src.start();
      console.log('[VoiceUI] ▶️ Playback started — samples:', floats.length,
        '| ctx state:', outputCtxRef.current.state);
    } catch (err) {
      console.error('[VoiceUI] ❌ Playback start failed:', err.message,
        '| ctx state:', outputCtxRef.current?.state);
      // Try to resume suspended AudioContext (browser autoplay policy)
      if (outputCtxRef.current?.state === 'suspended') {
        outputCtxRef.current.resume().then(() => {
          console.log('[VoiceUI] AudioContext resumed, retrying playback');
          outputQueueRef.current.unshift(floats); // put back
          isPlayingRef.current = false;
          playNextChunk();
        }).catch(e => console.error('[VoiceUI] AudioContext resume failed:', e.message));
      }
    }
  }, [setStateSynced]);

  const enqueueAudio = useCallback((base64) => {
    if (!outputCtxRef.current) {
      console.warn('[VoiceUI] enqueueAudio called but outputCtx is null');
      return;
    }
    outputQueueRef.current.push(base64ToFloat32(base64));
    console.log('[VoiceUI] 🔊 Audio queued — queue length:', outputQueueRef.current.length,
      '| already playing:', isPlayingRef.current);
    if (!isPlayingRef.current) {
      if (isMountedRef.current) setStateSynced(S.SPEAKING);
      playNextChunk();
    }
  }, [playNextChunk, setStateSynced]);


  /** Stop all queued/playing audio (interruption). Recreates output context. */
  const stopAudio = useCallback(() => {
    outputQueueRef.current = [];
    isPlayingRef.current = false;
    if (outputCtxRef.current && outputCtxRef.current.state !== 'closed') {
      outputCtxRef.current.close().catch(() => { });
    }
    outputCtxRef.current = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
  }, []);

  /* ── Tool call proxy ─────────────────────────────────────────── */
  /**
   * Receives a toolCall from Gemini Live, executes each functionCall
   * server-side (via /api/voice/tool), and sends the responses back to
   * the Live session so the model can continue the conversation.
   *
   * Error handling:
   *   - network error / non-200 → send error response (model speaks the error)
   *   - malformed args / unknown tool → backend returns { success: false }
   *   - duplicate submissions → treated as normal errors from backend
   */
  const handleToolCall = useCallback(async (toolCall) => {
    if (!sessionRef.current) return;
    const functionCalls = toolCall?.functionCalls ?? [];
    if (functionCalls.length === 0) return;

    const responses = await Promise.all(
      functionCalls.map(async (fc) => {
        // Guard: id is required for Google AI function responses
        if (!fc.id || !fc.name) {
          console.error('[VoiceUI] toolCall missing id or name:', fc);
          return {
            id: fc.id ?? 'unknown',
            name: fc.name ?? 'unknown',
            response: {
              success: false,
              errorCode: 'MALFORMED_CALL',
              errorMessage: 'I received an incomplete tool call. Please try again.',
            },
          };
        }

        let result;
        try {
          const res = await fetch('/api/voice/tool', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              toolName: fc.name,
              args: fc.args ?? {},
            }),
          });

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            result = {
              success: false,
              errorCode: 'HTTP_ERROR',
              errorMessage: errBody.errorMessage
                ?? `Tool request failed (HTTP ${res.status}). Please call +91 20 2634 5678.`,
            };
          } else {
            result = await res.json();
          }
        } catch (fetchErr) {
          console.error('[VoiceUI] Tool fetch failed:', fetchErr.message);
          result = {
            success: false,
            errorCode: 'NETWORK_ERROR',
            errorMessage: 'I was unable to reach the server to complete that action. ' +
              'Please try again or call +91 20 2634 5678.',
          };
        }

        return { id: fc.id, name: fc.name, response: result };
      })
    );

    // Return all responses to Gemini Live so the model can continue speaking
    try {
      await sessionRef.current.sendToolResponse({ functionResponses: responses });
    } catch (err) {
      console.error('[VoiceUI] sendToolResponse failed:', err.message);
    }
  }, []);

  /* ── Error / session-close handlers (plain functions, not hooks) */
  function handleConnectionError(msg) {
    cleanup();
    if (!isMountedRef.current) return;
    retryCountRef.current += 1;
    if (retryCountRef.current <= MAX_RETRIES) {
      const delay = BACKOFF_BASE_MS * Math.pow(4, retryCountRef.current - 1);
      const secs = Math.round(delay / 1000);
      setStatusMsg(`Connection failed. Retrying in ${secs}s… (${retryCountRef.current}/${MAX_RETRIES})`);
      setStateSynced(S.CONNECTING);
      setTimeout(() => { if (isMountedRef.current) startSession(); }, delay);
    } else {
      setStateSynced(S.ERROR);
      setError(msg ?? 'Voice session failed. Please try again or use text chat.');
    }
  }

  function handleSessionClosed(code, reason) {
    cleanup();
    if (!isMountedRef.current) return;
    // Normal close — treat as natural end
    if (!code || code === 1000 || code === 1001) {
      setStateSynced(S.IDLE);
      setStatusMsg('Session ended.');
      return;
    }
    // Quota exhausted
    if (code === 1011 || String(reason ?? '').includes('RESOURCE_EXHAUSTED')) {
      setStateSynced(S.ERROR);
      setError('API quota reached. Please try again later or use the text chat.');
      return;
    }
    handleConnectionError(reason ? String(reason) : `Session closed (code ${code})`);
  }

  /* ── Connect to Gemini Live ──────────────────────────────────── */
  async function startSession() {
    if (!isMountedRef.current) return;
    setStateSynced(S.CONNECTING);
    setError(null);
    setStatusMsg('Connecting…');

    /* 1 — Fetch ephemeral token (API key minted server-side) */
    let tokenData;
    try {
      const res = await fetch('/api/voice/token', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Token request failed (HTTP ${res.status})`);
      }
      tokenData = await res.json();
    } catch (err) {
      handleConnectionError(err.message);
      return;
    }

    /* 2 — Microphone access */
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
    } catch (err) {
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      setStateSynced(S.ERROR);
      setError(
        isDenied
          ? 'Microphone access was denied. Please allow microphone access in your browser and try again.'
          : `Microphone unavailable: ${err.message}`
      );
      return;
    }

    /* 3 — Set up AudioContexts (input 16 kHz, output 24 kHz) */
    try {
      if (inputCtxRef.current && inputCtxRef.current.state !== 'closed') {
        await inputCtxRef.current.close();
      }
      if (outputCtxRef.current && outputCtxRef.current.state !== 'closed') {
        await outputCtxRef.current.close();
      }
      inputCtxRef.current = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
      outputCtxRef.current = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
    } catch (err) {
      handleConnectionError(`AudioContext unavailable: ${err.message}`);
      return;
    }

    /* 4 — Open Gemini Live session
     *
     * IMPORTANT: The ephemeral-token Live path (BidiGenerateContentConstrained)
     * only exists in v1alpha. Without httpOptions:{apiVersion:'v1alpha'} the SDK
     * uses its default (v1beta), builds the wrong WebSocket URL, and the session
     * either silently connects to the unconstrained endpoint or is rejected.
     * SDK source reference: lines 22211-22219 of @google/genai/dist/index.mjs.
     */
    try {
      console.log('[VoiceUI] Opening Live session — model:', tokenData.model,
        '| token prefix:', tokenData.token?.slice(0, 20));

      const ai = new GoogleGenAI({
        apiKey: tokenData.token,
        httpOptions: { apiVersion: 'v1alpha' },
      });

      const session = await ai.live.connect({
        model: tokenData.model,
        /* Config here is intentionally minimal — model, system instruction,
           and tools are locked server-side in liveConnectConstraints.
           Only responseModalities is passed as a client hint. */
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            retryCountRef.current = 0;
            console.log('[VoiceUI] ✅ Session open — setup complete, listening');
            if (isMountedRef.current) {
              setStateSynced(S.LISTENING);
              setStatusMsg('Listening…');
            }
          },
          onclose: (evt) => {
            console.warn('[VoiceUI] Session closed — code:', evt?.code, 'reason:', evt?.reason);
            if (stateRef.current !== S.ENDING) {
              handleSessionClosed(evt?.code, evt?.reason);
            }
          },
          onerror: (err) => {
            console.error('[VoiceUI] Session error:', err?.message ?? err);
            handleConnectionError(err?.message ?? 'Voice session error');
          },
          onmessage: async (msg) => {
            // ── Diagnostic: log every incoming message type ───────────────
            const hasAudio = !!msg.data;
            const hasTool = !!msg?.toolCall;

            const content = msg?.serverContent;
            const inputText = content?.inputTranscription?.text?.trim();
            const outputText = content?.outputTranscription?.text?.trim();

            const hasInput = !!inputText;
            const hasOutput = !!outputText;
            const isInterrupt = !!content?.interrupted;
            const turnDone = !!content?.turnComplete;
            const setupDone = !!msg?.setupComplete;

            if (setupDone) {
              console.log('[VoiceUI] 📋 setupComplete received');
            }

            if (hasAudio) {
              console.log('[VoiceUI] 🔊 Audio chunk received — base64 length:', msg.data?.length);
            }

            if (hasInput) {
              console.log('[VoiceUI] 🎙️ Input transcript:', inputText);
            }

            if (hasOutput) {
              console.log('[VoiceUI] 💬 Output transcript:', outputText);
            }

            if (isInterrupt) {
              console.log('[VoiceUI] ✋ Interrupted by user');
            }

            if (turnDone) {
              console.log('[VoiceUI] ✅ Turn complete');
            }

            if (hasTool) {
              console.log(
                '[VoiceUI] 🔧 Tool call:',
                msg.toolCall?.functionCalls?.map(f => f.name)
              );
            }

            if (!hasAudio && !hasTool && !hasInput && !hasOutput && !isInterrupt && !turnDone && !setupDone) {
              console.log('[VoiceUI] ℹ️ Other message keys:', Object.keys(msg).join(', '));
            }

            /* ── Audio output ─────────────────────────────────── */
            if (hasAudio) {
              enqueueAudio(msg.data);
            }

            /* ── Input transcript (user speech, appears per turn) ────── */
            if (hasInput) {
              // Input transcription arrives as a complete turn string — push directly.
              pushTranscript({ role: 'user', text: inputText });
            }

            /* ── Output transcript (assistant speech, arrives in chunks) ─
             *
             * Gemini Live sends outputTranscription.text as incremental
             * fragments during the response. We accumulate them in
             * assistantBufRef and commit exactly ONE message to the transcript
             * when turnComplete fires. This prevents the fragmented appearance:
             *
             *   ❌ AutoCare AI: We offer      (chunk 1)
             *   ❌ AutoCare AI: a wide range  (chunk 2)
             *
             *   ✅ AutoCare AI: We offer a wide range of services.  (committed)
             *
             * Space guard: append a space between chunks only when the existing
             * buffer doesn't already end in whitespace and the new chunk doesn't
             * start with punctuation. This handles both "word""word" → "word word"
             * and "word," + " next" → "word, next" (no double-space).
             */
            if (hasOutput) {
              const existing = assistantBufRef.current;
              const chunk    = outputText; // already trimmed above
              if (existing.length === 0) {
                // First chunk of this turn — store as-is
                assistantBufRef.current = chunk;
              } else {
                // Subsequent chunk — add a space only when needed
                const needsSpace = !/\s$/.test(existing) && !/^[.,!?;:]/.test(chunk);
                assistantBufRef.current = existing + (needsSpace ? ' ' : '') + chunk;
              }
            }

            /* ── Turn complete — commit buffered assistant text ────────── */
            if (turnDone) {
              const buffered = assistantBufRef.current.trim();
              assistantBufRef.current = ''; // clear BEFORE setTranscript to avoid double-commit
              if (buffered.length > 0) {
                pushTranscript({ role: 'assistant', text: buffered });
              }
            }

            /* ── Interruption — discard incomplete assistant buffer ─────── *
             *
             * When the user interrupts, Gemini stops generating. The partial
             * text in assistantBufRef is from an incomplete, interrupted turn.
             * We discard it to avoid mixing it into the next assistant message.
             * Audio queue is also cleared so the model stops speaking.
             */
            if (isInterrupt) {
              assistantBufRef.current = ''; // discard incomplete turn
              stopAudio();
              if (isMountedRef.current) setStateSynced(S.LISTENING);
            }


            /* ── Tool call ───────────────────────────────────── */
            if (hasTool) {
              await handleToolCall(msg.toolCall);
            }
          },
        },
      });

      sessionRef.current = session;
      console.log('[VoiceUI] Session object created, starting mic pipeline');

      /* 5 — Pipe microphone PCM16 → sendRealtimeInput({ audio: Blob })
             The correct public API is sendRealtimeInput({ audio: Blob })
             where the Blob contains raw PCM16 samples at INPUT_SAMPLE_RATE.
             The SDK transforms this to mediaChunks internally.
             Using mediaChunks directly (the wire format) would bypass the
             SDK transformer and produce a malformed message. */
      const micSource = inputCtxRef.current.createMediaStreamSource(stream);
      const processor = inputCtxRef.current.createScriptProcessor(
        SCRIPT_BUFFER_SIZE, 1, 1
      );
      processorRef.current = processor;

      let chunksSent = 0;

      processor.onaudioprocess = (ev) => {
        if (!sessionRef.current) return;

        try {
          const pcmBlob = float32ToSDKAudio(
            ev.inputBuffer.getChannelData(0)
          );

          sessionRef.current.sendRealtimeInput({
            audio: pcmBlob,
          });

          chunksSent++;

          if (chunksSent === 1 || chunksSent % 20 === 0) {
            console.log(
              '[VoiceUI] 🎤 Mic chunk #' + chunksSent +
              ' sent — base64 length:', pcmBlob.data.length,
              '| MIME type:', pcmBlob.mimeType
            );
          }
        } catch (err) {
          console.error(
            '[VoiceUI] ❌ Failed to process/send microphone audio:',
            err
          );
        }
      };

      micSource.connect(processor);
      processor.connect(inputCtxRef.current.destination);
      console.log('[VoiceUI] 🎤 Microphone pipeline active —',
        INPUT_SAMPLE_RATE + 'Hz, buffer', SCRIPT_BUFFER_SIZE, 'samples');

      /* 6 — Create Conversation record for history */
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transport: 'voice' }),
        });
        if (res.ok) {
          const body = await res.json();
          convIdRef.current = body.id ?? null;
        }
      } catch { /* non-critical */ }

    } catch (err) {
      console.error('[VoiceUI] Live connect failed:', err.message);
      handleConnectionError(err.message);
    }
  }


  /* ── End session (user-initiated) ─────────────────────────────── */
  const endSession = useCallback(() => {
    setStateSynced(S.ENDING);

    /* Flush any assistant text that was buffered but not yet committed
     * (e.g. the user pressed End immediately after the final response).
     * We push directly to transcriptRef here rather than going through
     * pushTranscript, because we need the updated array synchronously for
     * the PATCH body — React state updates are async. */
    const pendingAssistant = assistantBufRef.current.trim();
    assistantBufRef.current = '';
    if (pendingAssistant.length > 0) {
      const flushed = [...transcriptRef.current, { role: 'assistant', text: pendingAssistant }];
      transcriptRef.current = flushed;
      setTranscript(flushed); // keep displayed transcript in sync
    }

    // Read from the ref, not from the stale React state closure
    const snap    = transcriptRef.current;
    const msgs    = snap.map(m => ({
      role:      m.role,
      text:      m.text.slice(0, 4000),
      createdAt: new Date().toISOString(),
    }));
    const summary = snap.find(m => m.role === 'user')?.text?.slice(0, 200) ?? null;

    if (convIdRef.current) {
      fetch(`/api/conversations/${convIdRef.current}`, {
        method:    'PATCH',
        headers:   { 'Content-Type': 'application/json' },
        body:      JSON.stringify({
          ...(msgs.length > 0 ? { messages: msgs, summary } : {}),
          status:  'ended',
          endedAt: new Date().toISOString(),
        }),
        keepalive: true,
      }).catch(() => { });
      convIdRef.current = null;
    }

    cleanup();
    setTimeout(() => {
      if (isMountedRef.current) {
        setStateSynced(S.IDLE);
        setStatusMsg('');
      }
    }, 300);
    // transcript removed from deps — we read transcriptRef.current instead
  }, [cleanup, setStateSynced]);

  /* ── Derived booleans ─────────────────────────────────────────── */
  const isActive = state === S.LISTENING || state === S.SPEAKING;
  const isConnecting = state === S.CONNECTING;
  const isError = state === S.ERROR;

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-zinc-50">

      {/* ── Header ── */}
      <div className="flex-shrink-0 border-b border-zinc-200 bg-white px-5 py-4">
        <div className="max-w-lg mx-auto">
          <p className="text-sm font-semibold text-zinc-900">
            {firstName ? `Voice Chat — ${firstName}` : 'Voice Chat'}
          </p>
          {vehicle && <p className="text-xs text-zinc-400 mt-0.5">{vehicle}</p>}
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="max-w-md w-full mx-auto flex flex-col items-center gap-8">

          {/* Orb */}
          <div className="relative">
            {isActive && (
              <>
                <span className={clsx(
                  'absolute inset-0 rounded-full animate-ping opacity-20',
                  state === S.SPEAKING ? 'bg-orange-400' : 'bg-zinc-400',
                )} />
                <span
                  className={clsx(
                    'absolute -inset-3 rounded-full animate-ping opacity-10',
                    state === S.SPEAKING ? 'bg-orange-400' : 'bg-zinc-300',
                  )}
                  style={{ animationDelay: '150ms' }}
                />
              </>
            )}

            <div className={clsx(
              'relative w-20 h-20 rounded-full flex items-center justify-center transition-colors duration-300',
              state === S.SPEAKING ? 'bg-orange-500' : '',
              state === S.LISTENING ? 'bg-zinc-900' : '',
              isConnecting ? 'bg-zinc-200' : '',
              isError ? 'bg-red-50 border border-red-200' : '',
              state === S.IDLE ? 'bg-white border-2 border-zinc-200' : '',
            )}>
              {isConnecting
                ? <Loader2 className="w-7 h-7 text-zinc-400 animate-spin" />
                : isError
                  ? <AlertCircle className="w-7 h-7 text-red-400" />
                  : state === S.LISTENING
                    ? <Mic className="w-7 h-7 text-white" />
                    : state === S.SPEAKING
                      ? <Volume2 className="w-7 h-7 text-white" />
                      : <Mic className="w-7 h-7 text-zinc-400" strokeWidth={1.5} />
              }
            </div>
          </div>

          {/* Status text */}
          <div className="text-center space-y-1">
            <p className={clsx(
              'text-sm font-medium',
              isError ? 'text-red-600' : '',
              state === S.SPEAKING ? 'text-orange-600' : '',
              state === S.LISTENING ? 'text-zinc-900' : '',
              isConnecting ? 'text-zinc-500' : '',
              state === S.IDLE ? 'text-zinc-500' : '',
            )}>
              {isConnecting && (statusMsg || 'Connecting…')}
              {state === S.LISTENING && 'Listening…'}
              {state === S.SPEAKING && 'AutoCare AI is speaking…'}
              {isError && 'Connection error'}
              {state === S.IDLE && (statusMsg || (firstName
                ? `Hi ${firstName} — tap to start`
                : 'Tap to start a voice conversation')
              )}
              {state === S.ENDING && 'Ending session…'}
            </p>
            {isError && error && (
              <p className="text-xs text-red-500 max-w-xs mx-auto leading-relaxed">{error}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col items-center gap-3 w-full">
            {!isActive && !isConnecting && (
              <button
                onClick={startSession}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-700 active:bg-zinc-800 transition-colors"
              >
                <Mic className="w-4 h-4" />
                {isError ? 'Try again' : 'Start voice chat'}
              </button>
            )}

            {isActive && (
              <button
                onClick={endSession}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:bg-red-200 transition-colors"
              >
                <PhoneOff className="w-4 h-4" />
                End session
              </button>
            )}

            {(isError || state === S.IDLE) && (
              <a
                href="/session"
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Switch to text chat
                <ChevronRight className="w-3 h-3" />
              </a>
            )}
          </div>

          {state === S.IDLE && !error && (
            <p className="text-xs text-zinc-400 text-center max-w-xs leading-relaxed">
              Speak naturally. AutoCare AI can book services,
              answer questions, and connect you to our team.
            </p>
          )}
        </div>
      </div>

      {/* ── Transcript strip ── */}
      {transcript.length > 0 && (
        <div className="flex-shrink-0 border-t border-zinc-200 bg-white">
          <div className="max-w-lg mx-auto px-4 py-3 max-h-48 overflow-y-auto space-y-2">
            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-2">
              Transcript
            </p>
            {transcript.map((m, i) => (
              <div key={i} className={clsx(
                'text-xs leading-relaxed',
                m.role === 'user' ? 'text-zinc-700' : 'text-orange-600',
              )}>
                <span className="font-medium mr-1">
                  {m.role === 'user' ? (firstName ?? 'You') : 'AutoCare AI'}:
                </span>
                {m.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
