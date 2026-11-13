export default function ClientTimesheetsLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-5xl mx-auto w-full">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-44 rounded-lg bg-slate-200" />
        <div className="h-4 w-72 rounded-md bg-slate-200" />
      </div>

      {/* 3 Summary tiles skeleton */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3 overflow-hidden">
        <div className="shrink-0 w-[240px] sm:w-auto h-28 rounded-2xl border-[1.5px] border-[#E5DFD5] bg-white p-5" />
        <div className="shrink-0 w-[240px] sm:w-auto h-28 rounded-2xl border-[1.5px] border-[#E5DFD5] bg-white p-5" />
        <div className="shrink-0 w-[240px] sm:w-auto h-28 rounded-2xl border-[1.5px] border-[#E5DFD5] bg-white p-5" />
      </div>

      {/* Segmented tab track skeleton */}
      <div className="h-11 w-72 rounded-lg border-[1.5px] border-[#E5DFD5] bg-[#FAF7F2] p-1" />

      {/* Group card skeleton */}
      <div className="rounded-2xl border-[1.5px] border-[#E5DFD5] bg-white p-5 space-y-4">
        <div className="h-6 w-56 rounded bg-slate-200" />
        <div className="h-20 rounded-xl bg-slate-100" />
        <div className="h-20 rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

