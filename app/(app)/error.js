'use client';

/**
 * App-level error boundary — AutoCare AI
 *
 * MUST be a Client Component (Next.js requirement for error boundaries).
 * Receives `error` and `reset` from Next.js.
 *
 * Designed to be non-frightening: clear message, single action, no stack traces
 * exposed to the user in production.
 */

import { useEffect } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';

export default function AppError({ error, reset }) {
  useEffect(() => {
    // Log to error reporting service (Sentry, etc.) in Phase 5+
    console.error('[AppError]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 py-16 text-center">

      {/* Error icon */}
      <div className="w-11 h-11 rounded-md bg-red-50 border border-red-100 flex items-center justify-center mb-5">
        <AlertCircle className="w-5 h-5 text-red-500" />
      </div>

      {/* Message */}
      <h2 className="text-base font-semibold text-zinc-950 mb-2 tracking-tight">
        Something went wrong
      </h2>
      <p className="text-sm text-zinc-500 leading-relaxed mb-8 max-w-sm">
        {/* Only show the message in development — not full stack traces */}
        {process.env.NODE_ENV === 'development'
          ? error?.message || 'An unexpected error occurred.'
          : 'An unexpected error occurred. Please try again or return to the dashboard.'}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={reset} className={buttonClass('accent', 'md')}>
          <RotateCcw className="w-4 h-4" />
          Try again
        </button>
        <Link href="/dashboard" className={buttonClass('secondary', 'md')}>
          <Home className="w-4 h-4" />
          Dashboard
        </Link>
      </div>

    </div>
  );
}
