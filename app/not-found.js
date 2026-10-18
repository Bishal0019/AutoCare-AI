/**
 * Root 404 page — AutoCare AI
 *
 * Shown for any URL that doesn't match a route.
 * Minimal, unambiguous, offers navigation back.
 */

import Link from 'next/link';
import { Mic } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-6 text-center">

      {/* Subtle logo mark */}
      <div className="w-9 h-9 rounded-md bg-zinc-200 flex items-center justify-center mb-6">
        <Mic className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
      </div>

      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">404</p>

      <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight mb-3">
        Page not found
      </h1>

      <p className="text-sm text-zinc-500 leading-relaxed mb-8 max-w-xs">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-zinc-900 hover:text-zinc-600 transition-colors"
        >
          Go to Dashboard →
        </Link>
        <span className="text-zinc-300">·</span>
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          Home
        </Link>
      </div>

    </div>
  );
}
