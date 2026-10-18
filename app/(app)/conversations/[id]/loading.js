export default function ConversationDetailLoading() {
  return (
    <div className="flex flex-col min-h-full animate-pulse">
      {/* Header skeleton */}
      <div className="px-5 py-4 border-b border-zinc-100 bg-white">
        <div className="h-3 w-32 bg-zinc-100 rounded mb-3" />
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-100 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-64 bg-zinc-100 rounded" />
            <div className="h-3 w-48 bg-zinc-100 rounded" />
          </div>
        </div>
      </div>

      {/* Transcript skeleton */}
      <div className="flex-1 px-5 py-6 max-w-3xl mx-auto w-full space-y-1">
        {[80, 60, 90, 55, 70, 85, 50].map((w, i) => (
          <div key={i} className="flex gap-3 px-1 py-2">
            <div className="w-20 flex-shrink-0">
              <div className="h-3 w-14 bg-zinc-100 rounded ml-auto" />
            </div>
            <div className="w-px flex-shrink-0 bg-zinc-100" />
            <div className="flex-1">
              <div className="h-3.5 bg-zinc-100 rounded" style={{ width: `${w}%` }} />
              {i % 3 === 0 && <div className="h-3.5 bg-zinc-100 rounded mt-1.5" style={{ width: `${w - 20}%` }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
