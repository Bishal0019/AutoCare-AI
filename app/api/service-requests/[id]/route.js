/**
 * GET    /api/service-requests/[id]  → fetch single service request
 * PATCH  /api/service-requests/[id]  → update status / fields
 * DELETE /api/service-requests/[id]  → delete a pending service request
 *
 * PATCH now supports an optional `action: 'reschedule'` body field.
 * When action === 'reschedule':
 *   - Checks the booking belongs to the authenticated user.
 *   - Verifies status is 'pending' or 'scheduled' (eligible for rescheduling).
 *   - Validates scheduledDate is today or in the future.
 *   - Compares old vs. new date/time — skips the email if unchanged.
 *   - Fires notifyRescheduled only after the DB write succeeds.
 *
 * For all PATCH requests:
 *   - Field whitelist prevents mass assignment.
 *   - Compound { _id, clerkId } filter enforces ownership.
 *   - notifyStatusChanged fires for status transitions (cancelled / scheduled).
 *   - notifyRescheduled fires for reschedule actions (date/time change).
 *
 * Authorization: compound { _id, clerkId } filter on every query.
 * DELETE is restricted to pending status only.
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import ServiceRequest from '@/lib/db/models/ServiceRequest';
import { notifyStatusChanged, notifyRescheduled } from '@/lib/email/notify.js';

const VALID_STATUSES = ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'];

/** Statuses from which a customer may reschedule their own booking. */
const RESCHEDULE_ELIGIBLE = new Set(['pending', 'scheduled']);

export async function GET(_request, { params }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const sr = await ServiceRequest.findOne({ _id: id, clerkId: userId }).lean();
    if (!sr) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ request: serialize(sr) });
  } catch (err) {
    if (err.name === 'CastError') {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    console.error('[GET /api/service-requests/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const isReschedule = body.action === 'reschedule';

    /* ── Reschedule-specific server validation ───────────────────── */
    if (isReschedule) {
      // scheduledDate is required for reschedule
      if (!body.scheduledDate) {
        return NextResponse.json(
          { error: 'A new appointment date is required to reschedule.' },
          { status: 400 }
        );
      }

      // Validate date format and range (must be today or future in UTC)
      const newDate = new Date(body.scheduledDate);
      if (isNaN(newDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date format.' }, { status: 400 });
      }
      const todayUTC = new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate()
        )
      );
      if (newDate < todayUTC) {
        return NextResponse.json(
          { error: 'The appointment date must be today or in the future.' },
          { status: 422 }
        );
      }
    }

    /* ── Build whitelist update ──────────────────────────────────── */
    const allowed = ['status', 'scheduledDate', 'scheduledTime', 'bay', 'notes', 'estimatedCost'];
    const update = {};
    for (const key of allowed) {
      if (key in body) {
        if (key === 'status' && !VALID_STATUSES.includes(body[key])) continue;
        if (key === 'scheduledDate' && body[key]) {
          update[key] = new Date(body[key]);
          continue;
        }
        update[key] = body[key];
      }
    }

    await connectDB();

    /* ── Fetch the document before update ────────────────────────── *
     * new: false → returns the document AS IT WAS before the $set.
     * Needed for:
     *   - Reschedule eligibility check (status must be pending/scheduled)
     *   - Reschedule no-op guard (compare old vs. new date/time)
     *   - notifyStatusChanged (previousStatus)
     */
    const previous = await ServiceRequest.findOneAndUpdate(
      { _id: id, clerkId: userId },
      { $set: update },
      { new: false, runValidators: true }
    );

    if (!previous) {
      return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
    }

    /* ── Reschedule eligibility check (evaluated after DB fetch) ─── */
    if (isReschedule && !RESCHEDULE_ELIGIBLE.has(previous.status)) {
      // The update already ran — roll it back by restoring the original fields.
      // This is safe because we only changed date/time, not status.
      await ServiceRequest.updateOne(
        { _id: id, clerkId: userId },
        {
          $set: {
            scheduledDate: previous.scheduledDate,
            scheduledTime: previous.scheduledTime,
          },
        }
      );
      return NextResponse.json(
        {
          error: `Cannot reschedule a booking with status "${previous.status}". ` +
                 'Only pending and scheduled bookings may be rescheduled.',
        },
        { status: 409 }
      );
    }

    // Re-read the updated document to return to the client (and pass to email)
    const updated = await ServiceRequest.findOne({ _id: id, clerkId: userId }).lean();

    /* ── Fire appropriate email ──────────────────────────────────── */
    if (isReschedule) {
      // Only fire the reschedule email when date or time actually changed
      const prevDateStr = previous.scheduledDate?.toISOString() ?? null;
      const newDateStr  = updated.scheduledDate
        ? new Date(updated.scheduledDate).toISOString()
        : null;
      const prevTime = previous.scheduledTime ?? null;
      const newTime  = updated.scheduledTime  ?? null;

      const dateChanged = prevDateStr !== newDateStr;
      const timeChanged = prevTime !== newTime;

      if (dateChanged || timeChanged) {
        try {
          await notifyRescheduled(userId, updated, previous.scheduledDate, prevTime);
        } catch (err) {
          console.error('[PATCH /api/service-requests/[id]] Reschedule email error:', err.message);
        }
      } else {
        console.log(`[PATCH /api/service-requests/[id]] Reschedule no-op for ${id} — date and time unchanged, skipping email`);
      }
    } else {
      // Standard status-change notification (cancelled / scheduled)
      try {
        await notifyStatusChanged(userId, updated, previous.status);
      } catch (err) {
        console.error('[PATCH /api/service-requests/[id]] Email error:', err.message);
      }
    }

    return NextResponse.json({ request: serialize(updated) });
  } catch (err) {
    if (err.name === 'CastError') {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    console.error('[PATCH /api/service-requests/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/service-requests/[id]
 *
 * Permanently removes a service request. Restricted to:
 *   - Records owned by the authenticated user (clerkId match)
 *   - Records whose status is still 'pending'
 *
 * Returns:
 *   204 No Content  — deleted successfully
 *   400             — invalid MongoDB ObjectId format
 *   401             — not authenticated
 *   403             — record exists but status is not 'pending'
 *   404             — record not found or belongs to another user
 *   500             — internal server error
 */
export async function DELETE(_request, { params }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();

    const sr = await ServiceRequest.findOne({ _id: id, clerkId: userId }).lean();

    if (!sr) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (sr.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot delete a service request with status "${sr.status}". Only pending requests may be deleted.` },
        { status: 403 }
      );
    }

    await ServiceRequest.deleteOne({ _id: id, clerkId: userId });
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err.name === 'CastError') {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    console.error('[DELETE /api/service-requests/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function serialize(doc) {
  return JSON.parse(JSON.stringify(doc));
}
