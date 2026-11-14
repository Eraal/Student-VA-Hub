export default function ClientReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-5xl mx-auto w-full">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-44 rounded-lg bg-slate-200" />
        <div className="h-4 w-72 rounded-md bg-slate-200" />
      </div>

      {/* Date filter bar skeleton */}
      <div className="h-12 w-full rounded-xl border-[1.5px] border-[#E5DFD5] bg-white p-2" />

      {/* 4 Summary tiles skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="h-28 rounded-xl border-[1.5px] border-[#E5DFD5] bg-white p-4" />
        <div className="h-28 rounded-xl border-[1.5px] border-[#E5DFD5] bg-white p-4" />
        <div className="h-28 rounded-xl border-[1.5px] border-[#E5DFD5] bg-white p-4" />
        <div className="h-28 rounded-xl border-[1.5px] border-[#E5DFD5] bg-white p-4" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-36 rounded bg-slate-200" />
        <div className="h-48 rounded-xl border-[1.5px] border-[#E5DFD5] bg-white" />
      </div>
    </div>
  );
}

