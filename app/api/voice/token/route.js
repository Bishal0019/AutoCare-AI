/**
 * POST /api/voice/token
 *
 * Mints a short-lived ephemeral token for the Gemini Live API.
 * The token is issued server-side so the primary API key is never
 * exposed to the browser.
 *
 * Security design:
 *   - Requires Clerk authentication — 401 if not signed in
 *   - Token is constrained (liveConnectConstraints) so the client
 *     cannot override the model, system instructions, or tools
 *   - Token is single-use (uses: 1) and expires in 30 minutes
 *   - New-session window is 2 minutes (the browser must connect quickly)
 *
 * The client receives { token } and uses it as an ephemeral API key
 * to open a WebSocket directly to the Gemini Live endpoint.
 *
 * References:
 *   https://ai.google.dev/gemini-api/docs/ephemeral-tokens
 *   https://ai.google.dev/gemini-api/docs/live
 */

import { auth }            from '@clerk/nextjs/server';
import { GoogleGenAI }     from '@google/genai';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { buildCustomerContext } from '@/lib/ai/context';
import { KNOWLEDGE_BASE_CONTEXT } from '@/lib/knowledge/index';
import { VOICE_TOOL_DECLARATIONS } from '@/lib/ai/voice-tools';

const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL ?? 'gemini-3.8-live';

export async function POST() {
  /* ── Auth ── */
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error('[voice/token] GOOGLE_GENERATIVE_AI_API_KEY not set');
    return Response.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    /* ── Build system prompt with customer context ── */
    const customerContext = await buildCustomerContext(userId);
    const systemInstruction = buildSystemPrompt({
      customerContext,
      knowledgeBase: KNOWLEDGE_BASE_CONTEXT,
    });

    /* ── Mint ephemeral token ──────────────────────────────────────────
     * The ephemeral-token API lives in v1alpha only (SDK line 24973).
     * Without apiVersion:'v1alpha' the request hits v1beta which does
     * not have the auth_tokens endpoint and the mint will fail or produce
     * a token that cannot open a constrained Live session.
     * ──────────────────────────────────────────────────────────────── */
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' },
    });

    console.log('[voice/token] Minting ephemeral token for model:', LIVE_MODEL);

    const expireTime       = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min
    const newSessionExpire = new Date(Date.now() +  2 * 60 * 1000).toISOString(); //  2 min

    const token = await client.authTokens.create({
      config: {
        uses:                 1,
        expireTime,
        newSessionExpireTime: newSessionExpire,
        /*
         * liveConnectConstraints locks the model, system instructions,
         * and tools server-side. The browser receives only a short-lived
         * token — the API key, system prompt, and tool set never leave
         * the server.
         */
        liveConnectConstraints: {
          model: LIVE_MODEL,
          config: {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            tools:             VOICE_TOOL_DECLARATIONS,
            responseModalities: ['AUDIO'],
            sessionResumption: {},
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Aoede' },
              },
            },
          },
        },
      },
    });

    console.log('[voice/token] Token minted OK, name prefix:', token.name?.slice(0, 20));
    return Response.json({ token: token.name, model: LIVE_MODEL });
  } catch (err) {
    console.error('[voice/token] Token mint failed:', err.message);

    /* Surface quota errors clearly */
    const msg = err.message ?? '';
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      return Response.json(
        { error: 'API quota reached. Please try again later or use the text chat.' },
        { status: 429 },
      );
    }

    return Response.json(
      { error: 'Unable to start voice session. Please try again.' },
      { status: 500 },
    );
  }
}
