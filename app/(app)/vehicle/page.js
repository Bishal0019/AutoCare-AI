/**
 * Vehicle page — AutoCare AI
 *
 * Server Component: fetches the user's vehicle from MongoDB,
 * serializes it, then passes to VehicleClient for the UI.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/mongoose';
import Vehicle from '@/lib/db/models/Vehicle';
import PageHeader from '@/components/layout/PageHeader';
import VehicleClient from './_components/VehicleClient';

export const metadata = { title: 'AutoCare AI — My Vehicle' };

export default async function VehiclePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  let vehicle = null;
  try {
    await connectDB();
    const raw = await Vehicle.findOne({ clerkId: userId })
      .sort({ createdAt: -1 })
      .lean();
    vehicle = raw ? JSON.parse(JSON.stringify(raw)) : null;
  } catch (err) {
    console.error('[VehiclePage] DB error:', err);
  }

  return (
    <div className="flex flex-col min-h-full">

      <PageHeader
        title="My Vehicle"
        description="Your registered vehicle details and service information."
      />

      <div className="flex-1 grid lg:grid-cols-[1fr_264px] gap-6 px-8 py-6 items-start">

        {/* ── Left: vehicle editor ── */}
        <div className="rounded-md border border-zinc-200 bg-white p-6">
          <VehicleClient vehicle={vehicle} />
        </div>

        {/* ── Right: info panel ── */}
        <aside className="space-y-4">
          <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
            <div className="px-4 py-3 border-b border-zinc-100">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                About this section
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Your vehicle details help AutoCare AI provide accurate service recommendations,
                appointment scheduling, and parts information.
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                The registration number is stored in uppercase and used to identify your
                vehicle in service records.
              </p>
            </div>
          </div>

          {vehicle && (
            <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
              <div className="px-4 py-3 border-b border-zinc-100">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Quick Info
                </h3>
              </div>
              <dl className="divide-y divide-zinc-100">
                {[
                  { label: 'Added',     value: new Date(vehicle.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                  { label: 'Last updated', value: new Date(vehicle.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5">
                    <dt className="text-xs text-zinc-500">{label}</dt>
                    <dd className="text-xs font-medium text-zinc-800">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}
