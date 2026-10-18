/**
 * Service Requests page — AutoCare AI
 *
 * Server Component. Fetches all service requests for the authenticated user
 * and passes them to ServiceRequestsList (client component) which handles
 * interactive deletion.
 */

import { auth }     from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link          from 'next/link';
import {
  ClipboardList, AlertTriangle, MessageSquare,
} from 'lucide-react';
import { connectDB }         from '@/lib/db/mongoose';
import ServiceRequest        from '@/lib/db/models/ServiceRequest';
import PageHeader            from '@/components/layout/PageHeader';
import { buttonClass }       from '@/components/ui/Button';
import ServiceRequestsList   from './_components/ServiceRequestsList';

export const metadata = { title: 'AutoCare AI — Service Requests' };

function serialize(doc) { return JSON.parse(JSON.stringify(doc)); }

export default async function ServiceRequestsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  let requests  = null;
  let fetchError = false;

  try {
    await connectDB();
    const raw = await ServiceRequest.find({ clerkId: userId })
      .sort({ createdAt: -1 })
      .lean();
    requests = serialize(raw);
  } catch (err) {
    console.error('[ServiceRequestsPage]', err);
    fetchError = true;
  }

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Service Requests"
        description="All service bookings and requests for your vehicle."
        action={
          <Link href="/session" className={buttonClass('accent', 'sm')}>
            <MessageSquare className="w-3.5 h-3.5" />
            Book via AI
          </Link>
        }
      />

      <div className="px-4 sm:px-8 py-6 flex-1">

        {/* Database / fetch error */}
        {fetchError && (
          <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-md border border-amber-100 bg-amber-50 mb-6">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700">Could not load service requests. Check your database connection.</p>
          </div>
        )}

        {/* Empty state */}
        {!fetchError && requests?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-md bg-zinc-100 flex items-center justify-center mb-5">
              <ClipboardList className="w-6 h-6 text-zinc-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-sm font-semibold text-zinc-950 mb-2">No service requests</h2>
            <p className="text-sm text-zinc-500 leading-relaxed mb-6 max-w-sm">
              Start a conversation with AutoCare AI to book a service, check vehicle health, or ask questions.
            </p>
            <Link href="/session" className={buttonClass('accent', 'md')}>
              <MessageSquare className="w-4 h-4" />
              Start a conversation
            </Link>
          </div>
        )}

        {/* List — rendered by the interactive client component */}
        {!fetchError && requests?.length > 0 && (
          <ServiceRequestsList initialRequests={requests} />
        )}

      </div>
    </div>
  );
}
