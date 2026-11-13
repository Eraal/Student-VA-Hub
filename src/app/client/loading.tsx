export default function ClientLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="h-4 w-32 rounded bg-slate-200" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-lg bg-slate-200" />
          <div className="h-9 w-28 rounded-lg bg-slate-200" />
        </div>
      </div>

      {/* Student card skeleton */}
      <div className="h-24 rounded-2xl border-[1.5px] border-[#E5DFD5] bg-white p-5" />

      {/* 3 Summary tiles skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="h-28 rounded-2xl border-[1.5px] border-[#E5DFD5] bg-white p-4" />
        <div className="h-28 rounded-2xl border-[1.5px] border-[#E5DFD5] bg-white p-4" />
        <div className="h-28 rounded-2xl border-[1.5px] border-[#E5DFD5] bg-white p-4" />
      </div>

      {/* 2-column main section skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 h-64 rounded-2xl border-[1.5px] border-[#E5DFD5] bg-white" />
        <div className="lg:col-span-4 h-64 rounded-2xl border-[1.5px] border-[#E5DFD5] bg-white" />
      </div>
    </div>
  );
}
