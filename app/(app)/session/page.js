/**
 * Session page — AutoCare AI text chat
 *
 * Server Component. Fetches minimal display context (name, vehicle string)
 * for the header, then renders the ChatUI client component.
 *
 * Layout note:
 *   The app layout uses min-h-screen (grows with content). The session page
 *   uses h-screen on its root to pin to exactly the viewport, with
 *   overflow-hidden so the internal ChatUI scroll is self-contained and the
 *   input bar always stays at the bottom.
 *
 * Customer context for the AI is fetched per-message inside /api/chat,
 * keeping this page fast to load.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { getUIContext } from '@/lib/ai/context';
import ChatUI from './_components/ChatUI';

export const metadata = { title: 'AutoCare AI — Support Chat' };

export default async function SessionPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { firstName, vehicle } = await getUIContext(userId);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <PageHeader
        title="AutoCare AI"
        description={
          vehicle
            ? `Your ${vehicle} is registered · Ask anything about services, pricing, or bookings`
            : 'AI-powered support · Ask about services, pricing, or book an appointment'
        }
        border
      />
      <ChatUI firstName={firstName} />
    </div>
  );
}
