/**
 * Voice session page — /voice
 *
 * Server Component. Loads the user's display context and renders
 * the client-side VoiceUI component.
 */

import { auth }       from '@clerk/nextjs/server';
import { redirect }   from 'next/navigation';
import { getUIContext } from '@/lib/ai/context';
import VoiceUI        from './_components/VoiceUI';

export const metadata = { title: 'AutoCare AI — Voice' };

export default async function VoicePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { firstName, vehicle } = await getUIContext(userId);

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen overflow-hidden flex flex-col">
      <VoiceUI firstName={firstName} vehicle={vehicle} />
    </div>
  );
}
