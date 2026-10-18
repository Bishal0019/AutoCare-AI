/**
 * GET   /api/conversations/[id]  — get a single conversation with full transcript
 * PATCH /api/conversations/[id]  — append messages / end conversation / link request
 *
 * Auth: Clerk — 401 if not signed in.
 * Ownership: { clerkId: userId } on every query — users cannot access others' data.
 *
 * PATCH supports three non-exclusive operations in one request:
 *   1. Append messages: body.messages = [{ role, text, createdAt? }]
 *   2. End conversation: body.status = 'ended'
 *   3. Set metadata:  body.summary, body.serviceRequestRef
 */

import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db/mongoose';
import Conversation from '@/lib/db/models/Conversation';

/* ── GET — single conversation ──────────────────────────────────── */

export async function GET(request, { params }) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;

  try {
    await connectDB();
    const doc = await Conversation.findOne({ _id: id, clerkId: userId }).lean();
    if (!doc) return new Response('Not found', { status: 404 });

    return Response.json({
      id:                doc._id.toString(),
      status:            doc.status,
      transport:         doc.transport,
      language:          doc.language,
      startedAt:         doc.startedAt,
      endedAt:           doc.endedAt,
      summary:           doc.summary,
      serviceRequestRef: doc.serviceRequestRef,
      messageCount:      doc.messageCount,
      messages:          doc.messages,
    });
  } catch (err) {
    console.error('[GET /api/conversations/[id]]', err.message);
    return new Response('Internal server error', { status: 500 });
  }
}

/* ── PATCH — update conversation ────────────────────────────────── */

export async function PATCH(request, { params }) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;

  let body = {};
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  const update = {};

  /* ── 1. Append messages ── */
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    const validated = body.messages
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && m.text.trim())
      .map(m => ({
        role:      m.role,
        text:      m.text.trim().slice(0, 4000),
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
      }));

    if (validated.length > 0) {
      update.$push = { messages: { $each: validated } };
      update.$inc  = { messageCount: validated.length };
    }
  }

  /* ── 2. Metadata updates ($set) ── */
  const set = {};

  if (body.status === 'ended') {
    set.status  = 'ended';
    set.endedAt = body.endedAt ? new Date(body.endedAt) : new Date();
  }

  if (typeof body.summary === 'string' && body.summary.trim()) {
    set.summary = body.summary.trim().slice(0, 500);
  }

  if (typeof body.serviceRequestRef === 'string' && body.serviceRequestRef.trim()) {
    set.serviceRequestRef = body.serviceRequestRef.trim().slice(0, 20);
  }

  if (Object.keys(set).length > 0) {
    update.$set = set;
  }

  /* ── Guard: nothing to do ── */
  if (Object.keys(update).length === 0) {
    return new Response('Nothing to update', { status: 400 });
  }

  try {
    await connectDB();
    const doc = await Conversation.findOneAndUpdate(
      { _id: id, clerkId: userId },
      update,
      { new: true, select: '_id status messageCount' }
    );

    if (!doc) return new Response('Not found', { status: 404 });

    return Response.json({
      id:           doc._id.toString(),
      status:       doc.status,
      messageCount: doc.messageCount,
    });
  } catch (err) {
    console.error('[PATCH /api/conversations/[id]]', err.message);
    return new Response('Internal server error', { status: 500 });
  }
}
