/**
 * Session page loading skeleton — AutoCare AI
 */

function Skel({ className }) {
  return <div className={`bg-zinc-100 rounded animate-pulse ${className}`} />;
}

export default function SessionLoading() {
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Header */}
      <div className="flex items-start justify-between px-4 sm:px-8 pt-5 sm:pt-7 pb-5 sm:pb-6 bg-white border-b border-zinc-200">
        <div className="space-y-2">
          <Skel className="h-6 w-36" />
          <Skel className="h-4 w-64 sm:w-80" />
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-zinc-50 flex flex-col px-4 sm:px-8 py-6 overflow-hidden">
        <div className="max-w-2xl mx-auto w-full space-y-4 flex-1">
          {/* Welcome card skeleton */}
          <div className="rounded-lg border border-zinc-200 bg-white px-6 py-5 text-center">
            <Skel className="w-10 h-10 rounded-full mx-auto mb-3.5" />
            <Skel className="h-4 w-48 mx-auto mb-2" />
            <Skel className="h-3 w-64 mx-auto" />
          </div>
          {/* Prompt chips */}
          <div className="grid grid-cols-2 gap-2">
            {[1,2,3,4].map((i) => (
              <Skel key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-zinc-200 bg-white px-4 sm:px-8 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center gap-2.5">
          <Skel className="flex-1 h-10 rounded-xl" />
          <Skel className="w-10 h-10 rounded-xl flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
