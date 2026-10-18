/**
 * Conversation detail page — /conversations/[id]
 *
 * Shows a readable transcript of a single conversation.
 * Layout is intentionally NOT a chat bubble UI — it reads like a
 * document log, which is easier to scan in a review context.
 *
 * Auth: Clerk — redirects to /sign-in if not authenticated.
 * Ownership: DB query includes { clerkId: userId } — 404 if not owned.
 */

import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { ChevronLeft, Clock, ClipboardCheck, MessageSquare } from 'lucide-react';
import { connectDB } from '@/lib/db/mongoose';
import Conversation from '@/lib/db/models/Conversation';

/* ── Data fetch ─────────────────────────────────────────────────── */

async function getConversation(userId, id) {
  await connectDB();
  const doc = await Conversation.findOne({ _id: id, clerkId: userId }).lean();
  if (!doc) return null;
  return JSON.parse(JSON.stringify({
    id:                doc._id.toString(),
    status:            doc.status,
    transport:         doc.transport,
    language:          doc.language,
    startedAt:         doc.startedAt,
    endedAt:           doc.endedAt,
    summary:           doc.summary,
    serviceRequestRef: doc.serviceRequestRef,
    messageCount:      doc.messageCount,
    messages:          doc.messages,
  }));
}

/* ── Helpers ────────────────────────────────────────────────────── */

function formatDatetime(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(startedAt, endedAt) {
  if (!endedAt) return null;
  const ms = new Date(endedAt) - new Date(startedAt);
  if (ms < 0) return null;
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'Less than 1 minute';
  if (mins === 1) return '1 minute';
  return `${mins} minutes`;
}

/* ── Page ───────────────────────────────────────────────────────── */

export default async function ConversationDetailPage({ params }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { id } = await params;
  let conversation;
  try {
    conversation = await getConversation(userId, id);
  } catch {
    notFound();
  }
  if (!conversation) notFound();

  const duration = formatDuration(conversation.startedAt, conversation.endedAt);
  const turns    = Math.ceil((conversation.messageCount ?? 0) / 2);

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-zinc-100 bg-white">
        <Link
          href="/conversations"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 mb-3 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          All conversations
        </Link>

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-zinc-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-semibold text-zinc-900">
                {conversation.summary
                  ? conversation.summary.slice(0, 80) + (conversation.summary.length > 80 ? '…' : '')
                  : 'Conversation'}
              </span>

              {conversation.status === 'active' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (
                <span className="text-[10px] font-medium text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5">
                  Ended
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
              <span>{formatDatetime(conversation.startedAt)}</span>

              {duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {duration}
                </span>
              )}

              {turns > 0 && (
                <span>{turns} {turns === 1 ? 'exchange' : 'exchanges'}</span>
              )}

              {conversation.serviceRequestRef && (
                <Link
                  href="/service-requests"
                  className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 transition-colors"
                >
                  <ClipboardCheck className="w-3 h-3" />
                  {conversation.serviceRequestRef}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Transcript ── */}
      <div className="flex-1 px-5 py-6 max-w-3xl mx-auto w-full">
        {conversation.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-zinc-400">No messages were recorded for this conversation.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversation.messages.map((msg, i) => (
              <TranscriptRow key={i} message={msg} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Transcript row ─────────────────────────────────────────────── */

function TranscriptRow({ message, index }) {
  const isUser      = message.role === 'user';
  const timeLabel   = message.createdAt ? formatTime(message.createdAt) : null;

  return (
    <div
      className={`flex gap-3 px-1 py-2 rounded-lg ${
        isUser ? 'hover:bg-zinc-50' : 'hover:bg-orange-50/30'
      } transition-colors`}
    >
      {/* Role label */}
      <div className="flex-shrink-0 w-20 pt-0.5 text-right">
        <span className={`text-xs font-medium ${isUser ? 'text-zinc-500' : 'text-orange-600'}`}>
          {isUser ? 'You' : 'AutoCare AI'}
        </span>
        {timeLabel && (
          <p className="text-[10px] text-zinc-300 mt-0.5">{timeLabel}</p>
        )}
      </div>

      {/* Separator */}
      <div className="flex-shrink-0 flex flex-col items-center pt-1">
        <div className={`w-px flex-1 ${index === 0 ? 'bg-transparent' : 'bg-zinc-100'}`} style={{ height: '6px' }} />
        <div className={`w-1.5 h-1.5 rounded-full ${isUser ? 'bg-zinc-300' : 'bg-orange-300'}`} />
        <div className={`w-px flex-1 bg-zinc-100`} />
      </div>

      {/* Message text */}
      <div className="flex-1 min-w-0 pt-0.5 pb-1">
        <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap break-words">
          {message.text}
        </p>
      </div>
    </div>
  );
}
