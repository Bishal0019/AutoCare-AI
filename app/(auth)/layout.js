/**
 * (auth) layout — AutoCare AI
 *
 * Minimal centered layout used for sign-in and sign-up pages.
 * Consistent with the app's light surface aesthetic so the transition
 * from auth → dashboard feels natural.
 *
 * Server Component — no interactivity needed at layout level.
 */

import Link from 'next/link';
import { Mic, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'AutoCare AI — Sign in',
};

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">

      {/* Minimal top bar — same proportions as the main nav */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
              <Mic className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold text-zinc-950 tracking-tight">AutoCare AI</span>
          </Link>
        </div>
      </header>

      {/* Centered content area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {children}
      </main>

      {/* Minimal footer with back link */}
      <footer className="border-t border-zinc-200 bg-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to home
          </Link>
          <p className="text-xs text-zinc-400">AutoCare AI · AIML Capstone 2026</p>
        </div>
      </footer>

    </div>
  );
}
