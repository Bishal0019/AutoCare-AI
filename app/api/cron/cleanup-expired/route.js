/**
 * GET /api/cron/cleanup-expired
 *
 * Scheduled cleanup job: permanently deletes expired pending service requests.
 *
 * Expiry rule:
 *   status === 'pending'  AND  scheduledDate < start-of-today (Asia/Kolkata)
 *
 * A booking for today in the service centre's timezone is never deleted
 * during that local day; only bookings whose date is fully in the past.
 * Invalid / null scheduledDates are excluded — we never treat a missing
 * date as expired.
 *
 * Protection:
 *   Requires the Authorization header to equal "Bearer <CRON_SECRET>".
 *   Set CRON_SECRET in Vercel Project Settings → Environment Variables.
 *   Vercel sends it as the Authorization bearer token for scheduled calls.
 *   Locally you can trigger it with:
 *     curl -H "Authorization: Bearer <secret>" http://localhost:3000/api/cron/cleanup-expired
 *
 * Idempotent: safe to run multiple times — a second run on the same data
 * deletes 0 documents and returns { deleted: 0 }.
 *
 * Does NOT delete:
 *   - scheduled, in_progress, completed, or cancelled records
 *   - pending records with null / undefined / invalid scheduledDate
 *   - pending records whose scheduledDate is today or in the future
 */

import { NextResponse } from 'next/server';
import { connectDB }    from '@/lib/db/mongoose';
import ServiceRequest   from '@/lib/db/models/ServiceRequest';
import { startOfBusinessDay } from '@/lib/date/business-day';

export async function GET(request) {
  /* ── Auth: verify cron secret ────────────────────────────────── */
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/cleanup-expired] CRON_SECRET env var is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  /* Expire by the service centre local calendar date. */
  const now = new Date();
  const startOfToday = startOfBusinessDay(now);

  try {
    await connectDB();

    const result = await ServiceRequest.deleteMany({
      status:        'pending',
      scheduledDate: {
        $lt:  startOfToday,      // strictly before today in Asia/Kolkata
        $ne:  null,              // exclude null (missing date)
        $exists: true,           // exclude missing field entirely
      },
    });

    const deleted = result.deletedCount ?? 0;
    console.log(`[cron/cleanup-expired] Deleted ${deleted} expired pending request(s) (boundary: ${startOfToday.toISOString()})`);

    return NextResponse.json({
      ok:        true,
      deleted,
      boundary:  startOfToday.toISOString(),
      runAt:     now.toISOString(),
    });
  } catch (err) {
    console.error('[cron/cleanup-expired]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
