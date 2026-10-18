/**
 * GET  /api/conversations      — list the user's conversations (newest first)
 * POST /api/conversations      — create a new conversation
 *
 * Auth: Clerk — 401 if not signed in.
 * Ownership: clerkId filter on every query.
 */

import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db/mongoose';
import Conversation from '@/lib/db/models/Conversation';

/* ── GET — conversation list ────────────────────────────────────── */

export async function GET(request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '30', 10), 50);
  const skip   = Math.max(parseInt(searchParams.get('skip')   ?? '0',  10), 0);
  const status = searchParams.get('status'); // optional filter: 'active' | 'ended'

  const filter = { clerkId: userId };
  if (status === 'active' || status === 'ended') filter.status = status;

  try {
    await connectDB();

    const [docs, total] = await Promise.all([
      Conversation
        .find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('status transport language startedAt endedAt summary serviceRequestRef messageCount')
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    const conversations = docs.map(c => ({
      id:                c._id.toString(),
      status:            c.status,
      transport:         c.transport,
      language:          c.language,
      startedAt:         c.startedAt,
      endedAt:           c.endedAt,
      summary:           c.summary,
      serviceRequestRef: c.serviceRequestRef,
      messageCount:      c.messageCount,
    }));

    return Response.json({ conversations, total });
  } catch (err) {
    console.error('[GET /api/conversations]', err.message);
    return new Response('Internal server error', { status: 500 });
  }
}

/* ── POST — create conversation ─────────────────────────────────── */

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let body = {};
  try { body = await request.json(); } catch { /* empty body is fine */ }

  const transport = body.transport === 'voice' ? 'voice' : 'text';
  const language  = typeof body.language === 'string' ? body.language.slice(0, 10) : null;

  try {
    await connectDB();
    const doc = await Conversation.create({
      clerkId:   userId,
      transport,
      language,
      status:    'active',
      startedAt: new Date(),
    });
    return Response.json({ id: doc._id.toString() }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/conversations]', err.message);
    return new Response('Internal server error', { status: 500 });
  }
}
