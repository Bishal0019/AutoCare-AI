'use client';

/**
 * ChatUI — AutoCare AI conversational interface (AI SDK v7)
 *
 * Conversation persistence:
 *   - A Conversation document is created in MongoDB on the first user message.
 *   - Message pairs (user + assistant) are saved after each completed exchange.
 *   - The conversation is marked 'ended' when the component unmounts.
 *   - Service request references are linked if a createServiceRequest tool call succeeds.
 *   - Storage is transport-agnostic: this same Conversation model will serve voice.
 *
 * Privacy:
 *   - Only the text content of messages is stored.
 *   - Tool call details, system prompts, and internal IDs are never sent to the DB.
 */

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Send, Loader2, AlertCircle, MessageSquare,
  Wrench, Phone, Clock, CalendarCheck, ChevronRight,
} from 'lucide-react';

/* ── Suggested prompts ──────────────────────────────────────────── */

const SUGGESTED_PROMPTS = [
  { label: 'I need to book an oil change',  icon: Wrench        },
  { label: 'What are your opening hours?',  icon: Clock         },
  { label: 'What services do you offer?',   icon: MessageSquare },
  { label: 'Can someone call me back?',     icon: Phone         },
];

/* ── Tool display labels ────────────────────────────────────────── */

const TOOL_LABELS = {
  createServiceRequest:  'Creating your service request…',
  createCallbackRequest: 'Logging callback request…',
  escalateToHuman:       'Connecting you to our team…',
};

/* ── Message text extraction (v7 parts API) ─────────────────────── */

/**
 * Extract plain text from an AI SDK v7 message's parts array.
 * Ignores tool invocation parts — only stores readable text.
 */
function extractText(message) {
  if (!Array.isArray(message.parts)) return '';
  return message.parts
    .filter(p => p.type === 'text' && p.text)
    .map(p => p.text)
    .join('');
}

/**
 * Scan an assistant message's parts for a successful createServiceRequest call.
 * Returns the referenceId string if found, otherwise null.
 */
function extractServiceRequestRef(message) {
  if (!Array.isArray(message.parts)) return null;
  for (const part of message.parts) {
    if (
      part.type      === 'tool-invocation'    &&
      part.state     === 'result'             &&
      part.toolName  === 'createServiceRequest' &&
      part.output?.success === true           &&
      part.output?.referenceId
    ) {
      return part.output.referenceId;
    }
  }
  return null;
}

/* ── Conversation persistence helpers ───────────────────────────── */

async function apiCreateConversation() {
  try {
    const res = await fetch('/api/conversations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ transport: 'text' }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const { id } = await res.json();
    return id;
  } catch (err) {
    console.error('[ChatUI] create conversation failed:', err.message);
    return null;
  }
}

async function apiSaveMessages(conversationId, body) {
  try {
    await fetch(`/api/conversations/${conversationId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
  } catch (err) {
    console.error('[ChatUI] save messages failed:', err.message);
  }
}

/* ── Main component ─────────────────────────────────────────────── */

export default function ChatUI({ firstName }) {
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const [input, setInput] = useState('');

  /* ── Chat hook ── */
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onError:   (err) => console.error('[ChatUI]', err.message),
  });

  const isLoading   = status === 'submitted' || status === 'streaming';
  const hasMessages = messages.length > 0;

  /* ── Conversation persistence state ── */
  const conversationIdRef   = useRef(null);   // stable ref for cleanup
  const [conversationId, _setConvId] = useState(null);
  const savedCountRef       = useRef(0);       // how many messages already saved
  const serviceRefSavedRef  = useRef(false);   // whether we've linked a SR ref
  const summarySetRef       = useRef(false);   // whether summary was set

  /** Keep conversationIdRef in sync so the unmount cleanup sees the latest value. */
  const setConversationId = useCallback((id) => {
    conversationIdRef.current = id;
    _setConvId(id);
  }, []);

  /* ── Create conversation on first user message ── */
  useEffect(() => {
    if (conversationId) return;
    const hasUserMessage = messages.some(m => m.role === 'user');
    if (!hasUserMessage) return;

    apiCreateConversation().then(id => {
      if (id) setConversationId(id);
    });
  }, [messages, conversationId, setConversationId]);

  /* ── Save new messages after each completed exchange ── */
  useEffect(() => {
    if (status !== 'ready') return;
    if (!conversationId) return;

    const newMessages = messages.slice(savedCountRef.current);
    if (newMessages.length === 0) return;

    savedCountRef.current = messages.length;

    /* Extract only text-bearing messages for storage */
    const toSave = newMessages
      .map(m => ({ role: m.role, text: extractText(m), createdAt: new Date().toISOString() }))
      .filter(m => m.text);

    /* Check for a new service request reference in assistant messages */
    const newRef = !serviceRefSavedRef.current
      ? newMessages
          .filter(m => m.role === 'assistant')
          .reduce((ref, m) => ref ?? extractServiceRequestRef(m), null)
      : null;

    if (newRef) serviceRefSavedRef.current = true;

    /* Build update body */
    const body = {};
    if (toSave.length > 0) body.messages = toSave;
    if (newRef)            body.serviceRequestRef = newRef;

    /* Set summary on first save (first user message text) */
    if (!summarySetRef.current) {
      const firstUser = messages.find(m => m.role === 'user');
      const firstText = firstUser ? extractText(firstUser) : null;
      if (firstText) {
        body.summary = firstText.slice(0, 200);
        summarySetRef.current = true;
      }
    }

    if (Object.keys(body).length > 0) {
      apiSaveMessages(conversationId, body);
    }
  }, [status, conversationId, messages]);

  /* ── Mark conversation ended on unmount ── */
  useEffect(() => {
    return () => {
      const id = conversationIdRef.current;
      if (!id) return;
      /* fetch with keepalive works at unmount; sendBeacon doesn't support PATCH */
      fetch(`/api/conversations/${id}`, {
        method:    'PATCH',
        headers:   { 'Content-Type': 'application/json' },
        body:      JSON.stringify({ status: 'ended', endedAt: new Date().toISOString() }),
        keepalive: true,
      }).catch(() => {});
    };
  }, []); // intentionally empty — closure uses ref, not state

  /* ── Auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  /* ── Auto-resize textarea ── */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  /* ── Send helpers ── */
  function submit() {
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  function handleSuggestedPrompt(label) {
    sendMessage({ text: label });
  }

  /* ── Render ── */
  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-zinc-50">

      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-2xl mx-auto w-full space-y-4">

          {/* Welcome + suggested prompts */}
          {!hasMessages && (
            <>
              <div className="rounded-lg border border-zinc-200 bg-white px-6 py-5 text-center">
                <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto mb-3.5">
                  <MessageSquare className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-sm font-semibold text-zinc-900 mb-1">
                  {firstName ? `Hi ${firstName}, I'm AutoCare AI` : "Hi, I'm AutoCare AI"}
                </p>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">
                  I can help you book a service, check our hours and pricing, or answer questions about your vehicle.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED_PROMPTS.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => handleSuggestedPrompt(label)}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-left text-sm text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:border-zinc-300 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                      <span className="leading-snug">{label}</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Conversation messages */}
          {messages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}

          {/* Typing indicator */}
          {status === 'submitted' && (
            <div className="flex">
              <div className="bg-white border border-zinc-200 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms'   }} />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg border border-red-100 bg-red-50 max-w-[80%]">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Connection error</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Unable to reach AutoCare AI. Please try again or call us at +91 20 2634 5678.
                </p>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-zinc-200 bg-white px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-2xl mx-auto flex items-end gap-2.5">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message…"
              disabled={isLoading}
              rows={1}
              className={clsx(
                'w-full resize-none rounded-xl border px-4 py-2.5 text-sm leading-relaxed',
                'text-zinc-900 placeholder:text-zinc-400',
                'border-zinc-200 bg-zinc-50 focus:bg-white',
                'focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400',
                'disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150',
              )}
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={isLoading || !input.trim()}
            className={clsx(
              'flex-shrink-0 w-10 h-10 flex items-center justify-center',
              'rounded-xl bg-zinc-900 text-white',
              'hover:bg-zinc-700 active:bg-zinc-800',
              'disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150',
            )}
            aria-label="Send message"
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
          </button>
        </div>

        <p className="max-w-2xl mx-auto mt-2 text-center text-[11px] text-zinc-400">
          AutoCare AI · Responses may not be 100% accurate — verify important information with our team.
        </p>
      </div>
    </div>
  );
}

/* ── Single message row ─────────────────────────────────────────── */

function MessageRow({ message }) {
  if (message.role === 'user') {
    const text = extractText(message);
    if (!text) return null;
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] sm:max-w-[72%] bg-zinc-900 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-sm leading-relaxed whitespace-pre-wrap break-words">
          {text}
        </p>
      </div>
    );
  }

  if (message.role === 'assistant') {
    return (
      <div className="space-y-1.5">
        {message.parts.map((part, i) => {
          if (part.type === 'text' && part.text) {
            return (
              <div key={i} className="flex justify-start">
                <p className="max-w-[80%] sm:max-w-[72%] bg-white border border-zinc-200 text-zinc-800 text-sm px-4 py-2.5 rounded-2xl rounded-bl-sm leading-relaxed whitespace-pre-wrap break-words">
                  {part.text}
                </p>
              </div>
            );
          }
          if (part.type === 'tool-invocation') {
            return <ToolStatus key={i} part={part} />;
          }
          return null;
        })}
      </div>
    );
  }

  return null;
}

/* ── Tool status indicator ──────────────────────────────────────── */

function ToolStatus({ part }) {
  const { state, toolName, output } = part;

  if (state === 'call' || state === 'partial-call') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-zinc-400 pl-1">
        <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
        <span>{TOOL_LABELS[toolName] ?? 'Processing…'}</span>
      </div>
    );
  }

  if (state === 'result' && output?.success && toolName === 'createServiceRequest') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 pl-1">
        <CalendarCheck className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Service request logged</span>
      </div>
    );
  }

  return null;
}
