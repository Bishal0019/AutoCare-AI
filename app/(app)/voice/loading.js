export default function VoiceLoading() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-zinc-50 animate-pulse">
      <div className="w-20 h-20 rounded-full bg-zinc-100 mb-6" />
      <div className="h-4 w-32 bg-zinc-100 rounded mb-3" />
      <div className="h-3 w-48 bg-zinc-100 rounded" />
    </div>
  );
}
