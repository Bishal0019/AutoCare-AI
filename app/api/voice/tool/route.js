/**
 * POST /api/voice/tool
 *
 * Proxy route that executes Gemini Live tool calls server-side.
 *
 * Why this exists:
 *   The Gemini Live WebSocket is opened directly from the browser
 *   (client-to-server architecture using an ephemeral token).
 *   When the Live model decides to call a function, the toolCall event
 *   arrives in the browser's onmessage callback.
 *
 *   However, tool execution (Mongoose DB writes) must stay server-side:
 *     - The browser must not have direct DB access
 *     - Auth must be verified on every write
 *     - Business logic must not be duplicated client-side
 *
 *   Flow:
 *     Gemini Live API → browser (toolCall event)
 *     browser → POST /api/voice/tool { toolName, args } (Clerk JWT)
 *     server → executes tool (Mongoose write)
 *     server → returns result
 *     browser → session.sendToolResponse({ result })
 *     browser → Gemini Live API (continues conversation)
 *
 * Auth: Clerk — 401 if not signed in.
 */

import { auth }             from '@clerk/nextjs/server';
import { executeVoiceTool } from '@/lib/ai/voice-tools';

export async function POST(request) {
  /* ── Auth ── */
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  const { toolName, args } = body;

  if (!toolName || typeof toolName !== 'string') {
    return Response.json({ success: false, errorMessage: 'toolName is required' }, { status: 400 });
  }

  const result = await executeVoiceTool(toolName, args ?? {}, userId);
  return Response.json(result);
}
