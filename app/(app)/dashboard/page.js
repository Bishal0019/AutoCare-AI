/**
 * Dashboard — AutoCare AI
 *
 * Server Component. Fetches all user data in parallel using Promise.allSettled
 * so one failing query never crashes the entire page — each section handles its
 * own error state independently.
 *
 * Data sources (all queries scoped to authenticated clerkId):
 *   profile       → lib/db/models/User
 *   vehicle       → lib/db/models/Vehicle
 *   requests      → lib/db/models/ServiceRequest  (last 6, newest first)
 *   conversations → lib/db/models/Conversation    (last 4, newest first)
 *
 * ServiceRequest types stored by the AI tools:
 *   service    — normal service booking (e.g. "Oil & Filter Change")
 *   callback   — starts with "Callback Request"
 *   escalation — starts with "Escalation" or "URGENT"
 *
 * Service request status lifecycle (from schema):
 *   pending → scheduled → in_progress → completed
 *   any     → cancelled
 *
 * The dashboard NEVER implies a pending request is a confirmed appointment.
 * Only "scheduled" and "in_progress" statuses trigger the appointment banner.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect }          from 'next/navigation';
import Link                  from 'next/link';
import {
  MessageSquare, Mic, Car, ClipboardList, ChevronRight,
  AlertTriangle, Plus, CheckCircle2, Circle, UserCircle,
  Clock, CalendarCheck, Wrench, Info, Phone, AlertCircle,
  History,
} from 'lucide-react';
import { connectDB }      from '@/lib/db/mongoose';
import User               from '@/lib/db/models/User';
import Vehicle            from '@/lib/db/models/Vehicle';
import ServiceRequest     from '@/lib/db/models/ServiceRequest';
import Conversation       from '@/lib/db/models/Conversation';
import PageHeader         from '@/components/layout/PageHeader';
import Badge              from '@/components/ui/Badge';
import { buttonClass }    from '@/components/ui/Button';

export const metadata = { title: 'AutoCare AI — Dashboard' };

/* ── Helpers ────────────────────────────────────────────────────── */

function serialize(doc) {
  if (!doc) return null;
  return JSON.parse(JSON.stringify(doc));
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/** Derive the human-readable REQ-XXXXXXXX reference from a Mongo ObjectId string. */
function toRef(id) {
  if (!id) return null;
  return `REQ-${String(id).slice(-8).toUpperCase()}`;
}

/**
 * Classify a ServiceRequest by its type string so we can show the right
 * icon and label. The AI tools write these type strings; we read them back.
 */
function classifyRequest(req) {
  const t = req.type ?? '';
  if (t.startsWith('Callback Request'))       return 'callback';
  if (t.startsWith('URGENT') || t.startsWith('Escalation')) return 'escalation';
  return 'service';
}

const STATUS_META = {
  pending:     { label: 'Requested',    variant: 'warning', dot: true  },
  scheduled:   { label: 'Scheduled',   variant: 'info',    dot: true  },
  in_progress: { label: 'In Progress', variant: 'accent',  dot: true  },
  completed:   { label: 'Completed',   variant: 'success', dot: false },
  cancelled:   { label: 'Cancelled',   variant: 'default', dot: false },
};

const FUEL_LABELS = {
  petrol: 'Petrol', diesel: 'Diesel', electric: 'Electric',
  hybrid: 'Hybrid', cng: 'CNG',
};

/* ── Shared sub-components ───────────────────────────────────────── */

function SectionHeader({ title, href, linkLabel }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</h2>
      {href && (
        <Link
          href={href}
          className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-0.5 transition-colors"
        >
          {linkLabel ?? 'View all'}
          <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function SectionError({ message }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-md border border-amber-100 bg-amber-50">
      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
      <p className="text-sm text-amber-700">{message}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, href, linkLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center rounded-md border border-dashed border-zinc-200">
      <Icon className="w-8 h-8 text-zinc-300 mb-3" strokeWidth={1.5} />
      <p className="text-sm text-zinc-500 mb-1">{title}</p>
      {description && (
        <p className="text-xs text-zinc-400 mb-4 max-w-xs leading-relaxed">{description}</p>
      )}
      {href && (
        <Link href={href} className={buttonClass('secondary', 'sm')}>
          <MessageSquare className="w-3.5 h-3.5" />
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

/* ── Appointment banner ──────────────────────────────────────────── */

/** Shown only when a service is confirmed scheduled or actively in-progress. */
function AppointmentBanner({ request }) {
  const isActive = request.status === 'in_progress';
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-4 rounded-md border ${
      isActive ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-100'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <CalendarCheck className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-orange-500' : 'text-blue-500'}`} />
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${isActive ? 'text-orange-900' : 'text-blue-900'}`}>
            {isActive ? 'Your vehicle is currently being serviced' : 'Upcoming appointment confirmed'}
          </p>
          <p className={`text-xs mt-0.5 truncate ${isActive ? 'text-orange-700' : 'text-blue-600'}`}>
            {request.type}
            {request.scheduledDate && ` · ${formatDate(request.scheduledDate)}`}
            {request.scheduledTime && ` at ${request.scheduledTime}`}
          </p>
        </div>
      </div>
      <Badge variant={isActive ? 'accent' : 'info'} dot>
        {isActive ? 'In Progress' : 'Scheduled'}
      </Badge>
    </div>
  );
}

/* ── Service requests section ────────────────────────────────────── */

function RequestTypeIcon({ kind }) {
  if (kind === 'callback')   return <Phone      className="w-4 h-4 text-zinc-400" />;
  if (kind === 'escalation') return <AlertCircle className="w-4 h-4 text-amber-400" />;
  return                            <Wrench     className="w-4 h-4 text-zinc-400" />;
}

function ServiceRequestsSection({ requests, error }) {
  return (
    <section>
      <SectionHeader
        title="Service & Callback Requests"
        href="/service-requests"
        linkLabel={requests?.length > 0 ? 'View all' : undefined}
      />

      {error && (
        <SectionError message="Could not load service requests. Check your database connection." />
      )}

      {!error && requests?.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No requests yet"
          description="Start a conversation with AutoCare AI to schedule a service or request a callback."
          href="/session"
          linkLabel="Start a conversation"
        />
      )}

      {!error && requests?.length > 0 && (
        <div className="rounded-md border border-zinc-200 overflow-hidden">
          {requests.map((req, i) => {
            const meta  = STATUS_META[req.status] ?? STATUS_META.pending;
            const kind  = classifyRequest(req);
            const ref   = toRef(req._id);
            const isPending = req.status === 'pending';

            return (
              <div
                key={req._id}
                className={`flex items-start gap-3 px-4 py-3 ${
                  i < requests.length - 1 ? 'border-b border-zinc-100' : ''
                }`}
              >
                {/* Type icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {req.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : req.status === 'cancelled' ? (
                    <Circle className="w-4 h-4 text-zinc-300" />
                  ) : (
                    <RequestTypeIcon kind={kind} />
                  )}
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{req.type}</p>
                  <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                    {/* Reference */}
                    <span className="text-xs font-mono text-zinc-400">{ref}</span>

                    {/* Date / time */}
                    <span className="text-xs text-zinc-400">
                      {req.scheduledDate
                        ? `${formatDate(req.scheduledDate)}${req.scheduledTime ? ` at ${req.scheduledTime}` : ''}`
                        : `Requested ${formatDate(req.createdAt)}`}
                    </span>
                  </div>

                  {/* Pending clarification — do NOT say "appointment confirmed" */}
                  {isPending && kind === 'service' && (
                    <p className="text-xs text-zinc-400 mt-0.5 italic">
                      Awaiting confirmation from service team
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <Badge variant={meta.variant} dot={meta.dot}>
                  {meta.label}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ── Conversations section ───────────────────────────────────────── */

/** Transport icon: Mic for voice, MessageSquare for text. */
function TransportIcon({ transport }) {
  return transport === 'voice'
    ? <Mic       className="w-3 h-3 text-zinc-400 flex-shrink-0" />
    : <MessageSquare className="w-3 h-3 text-zinc-400 flex-shrink-0" />;
}

function ConversationsSection({ conversations, error }) {
  return (
    <section>
      <SectionHeader
        title="Recent Conversations"
        href="/conversations"
        linkLabel={conversations?.length > 0 ? 'View all' : undefined}
      />

      {error && (
        <SectionError message="Could not load conversation history." />
      )}

      {!error && conversations?.length === 0 && (
        <EmptyState
          icon={History}
          title="No conversations yet"
          description="Use the AI assistant to ask questions, request services, or speak to our team."
          href="/session"
          linkLabel="Start AI conversation"
        />
      )}

      {!error && conversations?.length > 0 && (
        <div className="rounded-md border border-zinc-200 overflow-hidden">
          {conversations.map((conv, i) => {
            const isEnded    = conv.status === 'ended';
            const summary    = conv.summary?.trim() || 'No summary available';
            const hasRef     = !!conv.serviceRequestRef;
            const canView    = isEnded && conv.messageCount > 0;

            return (
              <div
                key={conv._id}
                className={`px-4 py-3 ${i < conversations.length - 1 ? 'border-b border-zinc-100' : ''}`}
              >
                {/* Top row: transport + date + status */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <TransportIcon transport={conv.transport} />
                    <span className="text-xs text-zinc-400 capitalize">{conv.transport}</span>
                    <span className="text-zinc-200 text-xs">·</span>
                    <span className="text-xs text-zinc-400">
                      {formatDateTime(conv.startedAt)}
                    </span>
                  </div>
                  <Badge variant={isEnded ? 'default' : 'accent'} dot={!isEnded}>
                    {isEnded ? 'Ended' : 'Active'}
                  </Badge>
                </div>

                {/* Summary */}
                <p className="text-sm text-zinc-700 leading-snug line-clamp-2">{summary}</p>

                {/* Footer: service request ref + view transcript link */}
                {(hasRef || canView) && (
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    {hasRef ? (
                      <span className="text-xs font-mono text-orange-600">
                        {conv.serviceRequestRef}
                      </span>
                    ) : (
                      <span />
                    )}
                    {canView && (
                      <Link
                        href={`/conversations/${conv._id}`}
                        className="text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-0.5 transition-colors"
                      >
                        View transcript
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ── Vehicle card ────────────────────────────────────────────────── */

function VehicleCard({ vehicle, error }) {
  if (error) {
    return (
      <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">My Vehicle</h3>
        </div>
        <div className="p-4">
          <SectionError message="Could not load vehicle data." />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">My Vehicle</h3>
        </div>
        <div className="p-4 flex flex-col items-center text-center">
          <Car className="w-7 h-7 text-zinc-300 mb-3" strokeWidth={1.5} />
          <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
            No vehicle registered. Add your vehicle so AutoCare AI can tailor its advice.
          </p>
          <Link href="/vehicle" className={buttonClass('accent', 'sm')}>
            <Plus className="w-3.5 h-3.5" />
            Add vehicle
          </Link>
        </div>
      </div>
    );
  }

  const rows = [
    { label: 'Model',        value: vehicle.model },
    { label: 'Year',         value: String(vehicle.year) },
    { label: 'Fuel',         value: FUEL_LABELS[vehicle.fuelType] ?? vehicle.fuelType },
    { label: 'Registration', value: vehicle.registrationNumber, mono: true },
  ];

  return (
    <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">My Vehicle</h3>
        <Link href="/vehicle" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Edit</Link>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-zinc-950 mb-3">
          {vehicle.manufacturer} {vehicle.model}
        </p>
        <dl className="space-y-0 border-t border-zinc-100 pt-3">
          {rows.map(({ label, value, mono }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-zinc-100 last:border-0">
              <dt className="text-xs text-zinc-500">{label}</dt>
              <dd className={`text-xs font-medium text-zinc-800 ${mono ? 'font-mono tracking-wide' : ''}`}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/* ── Setup checklist ─────────────────────────────────────────────── */

function SetupPrompt({ hasProfile, hasVehicle }) {
  const items = [
    { done: true,       label: 'Account created' },
    { done: hasProfile, label: 'Profile complete',   href: '/profile' },
    { done: hasVehicle, label: 'Vehicle registered', href: '/vehicle' },
  ];
  if (items.every(i => i.done)) return null;

  return (
    <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-zinc-400" />
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Getting started</h3>
      </div>
      <ul className="divide-y divide-zinc-100">
        {items.map(({ done, label, href }) => (
          <li key={label} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              {done
                ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                : <Circle       className="w-4 h-4 text-zinc-300 flex-shrink-0" />
              }
              <span className={`text-xs ${done ? 'text-zinc-500 line-through' : 'text-zinc-700 font-medium'}`}>
                {label}
              </span>
            </div>
            {!done && href && (
              <Link href={href} className="text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors">
                Go →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Customer card ───────────────────────────────────────────────── */

function CustomerCard({ profile, clerkUser }) {
  const name  = profile?.firstName || clerkUser?.firstName || null;
  const email = profile?.email || clerkUser?.emailAddresses?.[0]?.emailAddress || null;
  const phone = profile?.phone || null;
  const lang  = profile?.preferredLanguage;
  const LANG_LABELS = { en:'English', hi:'Hindi', bn:'Bengali', ta:'Tamil', te:'Telugu', mr:'Marathi' };

  const rows = [
    email && { label: 'Email',    value: email },
    phone && { label: 'Phone',    value: phone },
    lang  && { label: 'Language', value: LANG_LABELS[lang] ?? lang },
  ].filter(Boolean);

  return (
    <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Account</h3>
        <Link href="/profile" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Edit</Link>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-zinc-950 mb-3">{name ?? 'Complete your profile'}</p>
        {rows.length > 0 ? (
          <dl className="space-y-0 border-t border-zinc-100 pt-3">
            {rows.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b border-zinc-100 last:border-0">
                <dt className="text-xs text-zinc-500">{label}</dt>
                <dd className="text-xs font-medium text-zinc-800 truncate max-w-[140px]">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-xs text-zinc-400 border-t border-zinc-100 pt-3">
            No contact details yet.{' '}
            <Link href="/profile" className="text-orange-600 hover:underline">Add them now.</Link>
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Activity summary (right panel) ─────────────────────────────── */

/**
 * Small summary numbers for the right panel.
 * Shows total pending requests and total conversations at a glance.
 */
function ActivityCard({ requests, conversations }) {
  const pending   = requests?.filter(r => r.status === 'pending').length ?? 0;
  const total     = requests?.length ?? 0;
  const convTotal = conversations?.length ?? 0;

  if (total === 0 && convTotal === 0) return null;

  const items = [
    total     > 0 && { label: 'Requests',       value: total,   sub: `${pending} pending` },
    convTotal > 0 && { label: 'Conversations',   value: convTotal },
  ].filter(Boolean);

  return (
    <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-zinc-100">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Activity</h3>
      </div>
      <div className="divide-y divide-zinc-100">
        {items.map(({ label, value, sub }) => (
          <div key={label} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-zinc-500">{label}</span>
            <div className="text-right">
              <span className="text-sm font-semibold text-zinc-900">{value}</span>
              {sub && <p className="text-xs text-zinc-400">{sub}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const clerkUser = await currentUser();

  /* ── Connect once; if it fails, mark all queries as rejected ── */
  let dbError = null;
  try {
    await connectDB();
  } catch (e) {
    console.error('[Dashboard] DB connection failed:', e.message);
    dbError = e;
  }

  const [profileResult, vehicleResult, requestsResult, convsResult] = dbError
    ? Array(4).fill({ status: 'rejected', reason: dbError })
    : await Promise.allSettled([
        User.findOne({ clerkId: userId }).lean(),
        Vehicle.findOne({ clerkId: userId }).lean(),
        ServiceRequest
          .find({ clerkId: userId })
          .sort({ createdAt: -1 })
          .limit(6)
          .lean(),
        Conversation
          .find({ clerkId: userId })
          .sort({ startedAt: -1 })
          .limit(4)
          // Only fetch fields needed for the dashboard list — no messages array
          .select('status transport startedAt endedAt summary serviceRequestRef messageCount')
          .lean(),
      ]);

  /* ── Resolve each result independently ── */
  const profile       = profileResult.status  === 'fulfilled' ? serialize(profileResult.value)  : null;
  const vehicle       = vehicleResult.status  === 'fulfilled' ? serialize(vehicleResult.value)  : null;
  const requests      = requestsResult.status === 'fulfilled' ? serialize(requestsResult.value) : null;
  const conversations = convsResult.status    === 'fulfilled' ? serialize(convsResult.value)    : null;

  const profileError       = profileResult.status  === 'rejected';
  const vehicleError       = vehicleResult.status  === 'rejected';
  const requestsError      = requestsResult.status === 'rejected';
  const conversationsError = convsResult.status    === 'rejected';

  /* ── Derived ── */
  const firstName  = profile?.firstName || clerkUser?.firstName || null;
  const hasProfile = !!(profile?.firstName && profile?.email);
  const hasVehicle = !!vehicle;

  // Appointment banner only for confirmed appointments (scheduled / in_progress)
  const activeRequest = requests?.find(
    r => r.status === 'in_progress' || r.status === 'scheduled'
  ) ?? null;

  return (
    <div className="flex flex-col min-h-full">

      <PageHeader
        title={`${getGreeting()}${firstName ? `, ${firstName}` : ''}`}
        description={
          activeRequest
            ? `You have an ${activeRequest.status === 'in_progress' ? 'active service in progress' : 'upcoming confirmed appointment'}.`
            : 'Manage your vehicle and service history, or start a conversation.'
        }
        action={
          <Link href="/session" className={buttonClass('accent', 'md')}>
            <MessageSquare className="w-4 h-4" />
            Start AI conversation
          </Link>
        }
      />

      {/* Appointment / in-progress banner */}
      {activeRequest && (
        <div className="px-4 sm:px-8 pb-2">
          <AppointmentBanner request={activeRequest} />
        </div>
      )}

      {/* Two-column layout: main + aside */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_264px] gap-6 px-4 sm:px-8 py-6 items-start">

        {/* ── Main column ── */}
        <div className="space-y-8 min-w-0">
          <ServiceRequestsSection requests={requests} error={requestsError} />
          <ConversationsSection   conversations={conversations} error={conversationsError} />
        </div>

        {/* ── Right panel ── */}
        <aside className="space-y-4">
          <ActivityCard    requests={requests} conversations={conversations} />
          <VehicleCard     vehicle={vehicle} error={vehicleError} />
          <CustomerCard    profile={profile} clerkUser={clerkUser} />
          <SetupPrompt     hasProfile={hasProfile} hasVehicle={hasVehicle} />
        </aside>

      </div>
    </div>
  );
}
