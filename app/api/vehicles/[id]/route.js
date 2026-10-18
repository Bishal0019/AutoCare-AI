/**
 * GET  /api/vehicles/[id]   → fetch single vehicle
 * PATCH /api/vehicles/[id]  → update vehicle (JSON body, not form data)
 *
 * Both operations enforce authorization: _id + clerkId must match.
 * These routes are for the AI layer — forms use Server Actions instead.
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import Vehicle from '@/lib/db/models/Vehicle';

export async function GET(_request, { params }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const vehicle = await Vehicle.findOne({ _id: id, clerkId: userId }).lean();
    if (!vehicle) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ vehicle: serialize(vehicle) });
  } catch (err) {
    console.error('[GET /api/vehicles/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Whitelist only updatable fields — never accept clerkId from client
    const allowed = ['manufacturer', 'model', 'year', 'registrationNumber', 'fuelType'];
    const update = Object.fromEntries(
      Object.entries(body).filter(([k]) => allowed.includes(k))
    );

    await connectDB();
    const updated = await Vehicle.findOneAndUpdate(
      { _id: id, clerkId: userId },   // authorization: compound filter
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ vehicle: serialize(updated.toObject()) });
  } catch (err) {
    console.error('[PATCH /api/vehicles/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function serialize(doc) {
  return JSON.parse(JSON.stringify(doc));
}
