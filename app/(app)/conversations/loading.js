export default function ConversationsLoading() {
  return (
    <div className="flex flex-col min-h-full animate-pulse">
      {/* Header skeleton */}
      <div className="px-6 py-5 border-b border-zinc-100">
        <div className="h-5 w-36 bg-zinc-100 rounded mb-1.5" />
        <div className="h-3.5 w-48 bg-zinc-100 rounded" />
      </div>

      {/* Summary bar skeleton */}
      <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50">
        <div className="h-3 w-40 bg-zinc-100 rounded" />
      </div>

      {/* Row skeletons */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-zinc-100">
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-16 bg-zinc-100 rounded" />
              <div className="h-3 w-12 bg-zinc-100 rounded-full" />
            </div>
            <div className="h-3.5 w-3/4 bg-zinc-100 rounded" />
            <div className="h-3 w-1/2 bg-zinc-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
