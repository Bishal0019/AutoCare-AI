/**
 * App-level loading state — AutoCare AI
 *
 * Shown by Next.js while any (app)/* route segment suspends.
 * Renders a skeleton that closely mirrors the dashboard layout so the
 * transition from loading → content is smooth and non-jarring.
 *
 * Uses animate-pulse on zinc-200 placeholders — no third-party library.
 */

function Skeleton({ className }) {
  return <div className={`animate-pulse rounded bg-zinc-200 ${className}`} aria-hidden="true" />;
}

function SkeletonRow({ isLast = false }) {
  return (
    <div
      className={`grid grid-cols-[1fr_120px_100px_24px] items-center gap-4 px-4 h-[52px]
        ${!isLast ? 'border-b border-zinc-100' : ''}`}
    >
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <Skeleton className="h-3 w-20 ml-auto" />
      <Skeleton className="h-5 w-16 mx-auto" />
      <Skeleton className="h-4 w-4" />
    </div>
  );
}

export default function AppLoading() {
  return (
    <div className="flex flex-col min-h-full" aria-label="Loading…" role="status">

      {/* PageHeader skeleton */}
      <div className="flex items-start justify-between gap-4 px-8 pt-7 pb-6 bg-white border-b border-zinc-200">
        <div className="space-y-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-40 flex-shrink-0" />
      </div>

      {/* Banner skeleton */}
      <div className="mx-8 mt-5">
        <Skeleton className="h-11 w-full rounded-md" />
      </div>

      {/* Content grid skeleton */}
      <div className="grid lg:grid-cols-[1fr_288px] gap-6 px-8 py-6 items-start">

        {/* Service table skeleton */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-24" />
          </div>
          <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_120px_100px_24px] gap-4 items-center px-4 h-9 bg-zinc-50 border-b border-zinc-200">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12 ml-auto" />
              <Skeleton className="h-3 w-14 mx-auto" />
              <span />
            </div>
            {[false, false, false, true].map((isLast, i) => (
              <SkeletonRow key={i} isLast={isLast} />
            ))}
          </div>
        </div>

        {/* Right panel skeleton */}
        <div className="space-y-4">
          {/* Vehicle card skeleton */}
          <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-md flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
              <div className="pt-4 border-t border-zinc-100 space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Reminders skeleton */}
          <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
            <div className="px-4 py-3 border-b border-zinc-100">
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="divide-y divide-zinc-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <Skeleton className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5" />
                  <Skeleton className="h-3 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
