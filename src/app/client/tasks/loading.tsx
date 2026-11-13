import * as React from "react";

export default function ClientTasksLoading() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-40 rounded-lg bg-slate-200 border-[1.5px] border-[#0F172A]/20" />
          <div className="h-4 w-64 rounded bg-slate-200" />
        </div>
        <div className="h-10 w-32 rounded-lg bg-slate-200 border-[1.5px] border-[#0F172A]/20" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2 p-1 rounded-xl border-[1.5px] border-[#0F172A]/20 bg-[#FAF7F2] w-fit">
        <div className="h-8 w-16 rounded-lg bg-slate-200" />
        <div className="h-8 w-20 rounded-lg bg-slate-200" />
        <div className="h-8 w-24 rounded-lg bg-slate-200" />
        <div className="h-8 w-16 rounded-lg bg-slate-200" />
      </div>

      {/* Cards skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border-[1.5px] border-[#0F172A]/30 bg-white p-4 shadow-[3px_3px_0px_0px_#0F172A]/30 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-48 rounded bg-slate-200" />
              <div className="h-5 w-20 rounded-full bg-slate-200" />
            </div>
            <div className="h-4 w-72 rounded bg-slate-100" />
            <div className="flex gap-3">
              <div className="h-4 w-28 rounded bg-slate-200" />
              <div className="h-4 w-36 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

