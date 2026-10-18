/**
 * GET /api/profile
 *
 * Returns the authenticated user's profile for the AI agent to use as
 * context when handling service enquiries (Phase 3+).
 *
 * Authorization: auth() — only returns data for the requesting user.
 * Sensitive fields excluded from response.
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const user = await User.findOne({ clerkId: userId })
      .select('firstName lastName email phone preferredLanguage location createdAt')
      .lean();

    return NextResponse.json({ user: user ? serialize(user) : null });
  } catch (err) {
    console.error('[GET /api/profile]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Serialize MongoDB document for JSON response */
function serialize(doc) {
  return JSON.parse(JSON.stringify(doc));
}
