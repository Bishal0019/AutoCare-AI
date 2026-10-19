/**
 * Profile page — AutoCare AI
 *
 * Server Component: fetches user data from MongoDB and Clerk,
 * then passes serialized plain objects to the Client Component.
 *
 * Date objects and ObjectIds from MongoDB are serialized via
 * JSON.parse(JSON.stringify()) before crossing the Server→Client boundary,
 * as Next.js cannot serialize them automatically.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { connectDB } from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import PageHeader from '@/components/layout/PageHeader';
import ProfileClient from './_components/ProfileClient';

export const metadata = { title: 'AutoCare AI — Profile' };

/** Format a date as "Month YYYY" (e.g. "September 2026"). */
function formatMonth(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const clerkUser = await currentUser();

  /* Fetch MongoDB profile — null on first visit */
  let profile = null;
  try {
    await connectDB();
    const raw = await User.findOne({ clerkId: userId }).lean();
    // Serialize: convert ObjectId → string, Date → ISO string
    profile = raw ? JSON.parse(JSON.stringify(raw)) : null;
  } catch (err) {
    console.error('[ProfilePage] DB error:', err);
    // Profile section still renders — user can save and it will create the record
  }

  const clerkEmail   = clerkUser?.emailAddresses?.[0]?.emailAddress ?? '';
  const clerkImage   = clerkUser?.imageUrl ?? null;
  const clerkName    = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ');
  const memberSince  = formatMonth(clerkUser?.createdAt);

  return (
    <div className="flex flex-col min-h-full">

      <PageHeader
        title="Profile"
        description="Your personal information and contact preferences."
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_264px] gap-6 px-4 sm:px-8 py-6 items-start">

        {/* ── Left: editable profile ── */}
        <div className="rounded-md border border-zinc-200 bg-white p-6">
          <ProfileClient
            profile={profile}
            clerkEmail={clerkEmail}
            clerkImage={clerkImage}
          />
        </div>

        {/* ── Right: account summary (Server-rendered, no interactivity) ── */}
        <aside className="space-y-4">

          {/* Account card */}
          <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
            <div className="px-4 py-3 border-b border-zinc-100">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Account
              </h3>
            </div>
            <div className="p-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-3 mb-4">
                {clerkImage ? (
                  <Image
                    src={clerkImage}
                    alt={clerkName || 'Profile photo'}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-zinc-500">
                      {clerkName?.charAt(0)?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-950 truncate">
                    {clerkName || 'Account'}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{clerkEmail}</p>
                </div>
              </div>

              {/* Stats */}
              <dl className="pt-3 border-t border-zinc-100 space-y-2">
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-zinc-500">Member since</dt>
                  <dd className="text-xs font-medium text-zinc-800">{memberSince}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Email note */}
          <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
            <div className="px-4 py-3 border-b border-zinc-100">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Login & Security
              </h3>
            </div>
            <div className="p-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Your email address and password are managed through your Clerk account.
                Contact details like phone and location are stored in AutoCare AI.
              </p>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
