/**
 * Dashboard loading skeleton — AutoCare AI
 *
 * Shown while the dashboard Server Component fetches data.
 * Mirrors the actual dashboard layout precisely to prevent layout shift.
 */

function Skeleton({ className }) {
  return (
    <div className={`bg-zinc-100 rounded animate-pulse ${className}`} />
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-100 last:border-0">
      <Skeleton className="w-4 h-4 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-5 w-20 rounded" />
    </div>
  );
}

function SkeletonCard({ rows = 3, title }) {
  return (
    <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {title}
        </div>
      </div>
      <div className="divide-y divide-zinc-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col min-h-full">

      {/* PageHeader skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 px-4 sm:px-8 pt-5 sm:pt-7 pb-5 sm:pb-6 bg-white border-b border-zinc-200">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 sm:w-52 max-w-full" />
          <Skeleton className="h-4 w-64 sm:w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-44 rounded-md sm:flex-shrink-0" />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_264px] gap-6 px-4 sm:px-8 py-6 items-start">

        {/* Main column */}
        <div className="space-y-8">

          {/* Service requests section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3.5 w-14" />
            </div>
            <div className="rounded-md border border-zinc-200 overflow-hidden">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          </section>

          {/* Conversations section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-3.5 w-44" />
            </div>
            <div className="rounded-md border border-dashed border-zinc-200 py-10 flex flex-col items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-md" />
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-7 w-36 rounded-md mt-1" />
            </div>
          </section>

        </div>

        {/* Right panel */}
        <aside className="space-y-4">
          <SkeletonCard title="My Vehicle" rows={4} />
          <SkeletonCard title="Account"    rows={3} />
        </aside>

      </div>
    </div>
  );
}
