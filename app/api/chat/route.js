/**
 * POST /api/chat
 *
 * Streaming AI chat endpoint for AutoCare AI — AI SDK v7.
 *
 * v7 pattern:
 *   - Parse UIMessage[] from body
 *   - convertToModelMessages() to translate UI messages → model messages
 *   - streamText() with system prompt + tools
 *   - toUIMessageStream() + createUIMessageStreamResponse() for the client
 *
 * Security:
 *   - Auth-gated: 401 if not signed in
 *   - Customer context fetched server-side — never from request body
 *   - Tools bound to authenticated userId
 */

import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from 'ai';
import { google } from '@ai-sdk/google';
import { auth } from '@clerk/nextjs/server';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { buildCustomerContext } from '@/lib/ai/context';
import { buildTools } from '@/lib/ai/tools';
import { KNOWLEDGE_BASE_CONTEXT } from '@/lib/knowledge';

export const maxDuration = 60;

export async function POST(request) {
  /* ── Auth ── */
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  /* ── Config guard ── */
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          'The AI service is not configured. ' +
          'Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local and restart.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /* ── Parse request body ── */
  let messages;
  try {
    ({ messages } = await request.json());
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  /* ── Customer context (silently degrades on DB error) ── */
  let customerContext = null;
  try {
    customerContext = await buildCustomerContext(userId);
  } catch {
    // AI continues without customer context
  }

  /* ── System prompt ── */
  const systemPrompt = buildSystemPrompt({
    customerContext,
    knowledgeBase: KNOWLEDGE_BASE_CONTEXT,
  });

  /* ── Stream ── */
  try {
    const result = streamText({
      model:       google(process.env.GEMINI_MODEL ?? 'gemini-1.5-flash'),
      system:      systemPrompt,
      messages:    await convertToModelMessages(messages),
      tools:       buildTools(userId),
      maxSteps:    8,
      temperature: 0.1,
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (err) {
    console.error('[POST /api/chat]', err);
    return new Response(
      JSON.stringify({ error: 'AI service error. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
