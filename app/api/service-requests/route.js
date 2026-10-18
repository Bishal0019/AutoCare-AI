/**
 * GET  /api/service-requests        → list authenticated user's requests (newest first)
 * POST /api/service-requests        → create a new service request
 *
 * Used by the AI agent (Phase 3) to read and create service requests.
 * Authorization: clerkId always comes from auth(), never from the request body.
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import ServiceRequest from '@/lib/db/models/ServiceRequest';
import { notifyBookingCreated } from '@/lib/email/notify.js';

const VALID_STATUSES = ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'];

export async function GET(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit  = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);

    const filter = { clerkId: userId };
    if (status && VALID_STATUSES.includes(status)) {
      filter.status = status;
    }

    await connectDB();
    const requests = await ServiceRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ requests: serialize(requests) });
  } catch (err) {
    console.error('[GET /api/service-requests]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.type || typeof body.type !== 'string' || !body.type.trim()) {
      return NextResponse.json({ error: 'Service type is required' }, { status: 400 });
    }

    // Whitelist accepted fields — never trust clerkId from client
    const data = {
      clerkId:       userId,
      type:          body.type.trim().slice(0, 120),
      status:        VALID_STATUSES.includes(body.status) ? body.status : 'pending',
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
      scheduledTime: body.scheduledTime ?? null,
      bay:           body.bay           ?? null,
      notes:         body.notes         ? String(body.notes).slice(0, 500) : '',
      estimatedCost: typeof body.estimatedCost === 'number' ? body.estimatedCost : null,
    };

    await connectDB();
    const created = await ServiceRequest.create(data);

    /* Fire booking email — fire-and-forget, must not affect HTTP response */
    notifyBookingCreated(userId, created.toObject()).catch(err =>
      console.error('[POST /api/service-requests] Email error:', err.message)
    );

    return NextResponse.json({ request: serialize(created.toObject()) }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/service-requests]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function serialize(doc) {
  return JSON.parse(JSON.stringify(doc));
}
