/**
 * GET /api/vehicles
 *
 * Returns the authenticated user's vehicle(s) for the AI agent to use as
 * context when handling service enquiries (Phase 3+).
 *
 * Authorization: clerkId filter — returns only the requesting user's vehicles.
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import Vehicle from '@/lib/db/models/Vehicle';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const vehicles = await Vehicle.find({ clerkId: userId })
      .select('manufacturer model year registrationNumber fuelType createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ vehicles: serialize(vehicles) });
  } catch (err) {
    console.error('[GET /api/vehicles]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function serialize(doc) {
  return JSON.parse(JSON.stringify(doc));
}
