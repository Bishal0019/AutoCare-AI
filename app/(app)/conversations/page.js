/**
 * Conversations list page
 *
 * Shows the authenticated user's conversation history, newest first.
 * Each row provides enough context to identify the session without
 * loading the full transcript.
 */

import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { MessageSquare, Clock, ClipboardCheck, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { connectDB } from '@/lib/db/mongoose';
import Conversation from '@/lib/db/models/Conversation';

export const metadata = { title: 'AutoCare AI — Conversations' };

/* ── Data fetch ─────────────────────────────────────────────────── */

async function getConversations(userId) {
  await connectDB();
  const docs = await Conversation
    .find({ clerkId: userId })
    .sort({ startedAt: -1 })
    .limit(50)
    .select('status transport language startedAt endedAt summary serviceRequestRef messageCount')
    .lean();

  return docs.map(c => JSON.parse(JSON.stringify({
    id:                c._id.toString(),
    status:            c.status,
    transport:         c.transport,
    language:          c.language,
    startedAt:         c.startedAt,
    endedAt:           c.endedAt,
    summary:           c.summary,
    serviceRequestRef: c.serviceRequestRef,
    messageCount:      c.messageCount,
  })));
}

/* ── Helpers ────────────────────────────────────────────────────── */

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isThisYear = d.getFullYear() === now.getFullYear();

  if (isToday) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  if (isThisYear) {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDuration(startedAt, endedAt) {
  if (!endedAt) return null;
  const ms = new Date(endedAt) - new Date(startedAt);
  if (ms < 0) return null;
  const mins = Math.round(ms / 60000);
  if (mins < 1) return '< 1 min';
  if (mins === 1) return '1 min';
  return `${mins} mins`;
}

/* ── Empty state ────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-20 text-center">
      <div className="w-10 h-10 rounded-md bg-zinc-100 flex items-center justify-center mb-5">
        <MessageSquare className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
      </div>
      <h2 className="text-sm font-semibold text-zinc-900 mb-2">No conversations yet</h2>
      <p className="text-sm text-zinc-500 leading-relaxed mb-6 max-w-sm">
        Start an AI Chat session and your conversation history will appear here for future reference.
      </p>
      <Link
        href="/session"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-900 hover:text-zinc-600 transition-colors"
      >
        Start a conversation <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

/* ── Conversation row ───────────────────────────────────────────── */

function ConversationRow({ c }) {
  const duration = formatDuration(c.startedAt, c.endedAt);
  const preview  = c.summary ?? 'No summary available';
  const turns    = Math.ceil((c.messageCount ?? 0) / 2);

  return (
    <Link
      href={`/conversations/${c.id}`}
      className="group flex items-start gap-4 px-5 py-4 border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
    >
      {/* Icon */}
      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-zinc-200 transition-colors">
        <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <time className="text-xs font-medium text-zinc-500" dateTime={c.startedAt}>
            {formatDate(c.startedAt)}
          </time>

          {/* Status badge */}
          {c.status === 'active' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          ) : (
            <span className="text-[10px] font-medium text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5">
              Ended
            </span>
          )}

          {/* Duration */}
          {duration && (
            <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {duration}
            </span>
          )}

          {/* Service request linked */}
          {c.serviceRequestRef && (
            <span className="text-[10px] text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2 py-0.5 flex items-center gap-1">
              <ClipboardCheck className="w-2.5 h-2.5" />
              {c.serviceRequestRef}
            </span>
          )}
        </div>

        <p className="text-sm text-zinc-700 leading-snug line-clamp-2">{preview}</p>

        {turns > 0 && (
          <p className="text-xs text-zinc-400 mt-1">
            {turns} {turns === 1 ? 'exchange' : 'exchanges'}
          </p>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-zinc-300 flex-shrink-0 mt-1 group-hover:text-zinc-500 transition-colors" />
    </Link>
  );
}

/* ── Page ───────────────────────────────────────────────────────── */

export default async function ConversationsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  let conversations = [];
  try {
    conversations = await getConversations(userId);
  } catch (err) {
    console.error('[ConversationsPage]', err.message);
  }

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Conversations"
        description="Your AI conversation history."
        border
      />

      {conversations.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1">
          {/* Summary bar */}
          <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50">
            <p className="text-xs text-zinc-500">
              {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'} ·{' '}
              <Link href="/session" className="text-zinc-900 font-medium hover:underline">
                Start new
              </Link>
            </p>
          </div>

          {/* List */}
          <div>
            {conversations.map(c => (
              <ConversationRow key={c.id} c={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
