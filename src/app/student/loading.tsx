import * as React from "react";

export default function StudentLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 1. Top Strip Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-64 rounded-lg bg-slate-300" />
            <div className="h-6 w-40 rounded-full bg-slate-200" />
          </div>
          <div className="h-4 w-48 rounded bg-slate-200" />
        </div>
        <div className="h-12 w-32 rounded-lg bg-slate-300" />
      </div>

      {/* 2. Stat Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-36 rounded-2xl border-[1.5px] border-[#0F172A]/20 bg-white p-5 shadow-[3px_3px_0px_0px_#0F172A]/20 space-y-3">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-8 w-32 rounded bg-slate-300" />
          <div className="h-3 w-full rounded bg-slate-200" />
        </div>
        <div className="h-36 rounded-2xl border-[1.5px] border-[#0F172A]/20 bg-white p-5 shadow-[3px_3px_0px_0px_#0F172A]/20 space-y-3">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-8 w-20 rounded bg-slate-300" />
          <div className="h-3 w-3/4 rounded bg-slate-200" />
        </div>
        <div className="h-36 rounded-2xl border-[1.5px] border-[#0F172A]/20 bg-white p-5 shadow-[3px_3px_0px_0px_#0F172A]/20 space-y-3">
          <div className="h-4 w-28 rounded bg-slate-200" />
          <div className="h-8 w-28 rounded bg-slate-300" />
          <div className="h-7 w-full rounded bg-slate-200" />
        </div>
      </div>

      {/* 3. 12-Column Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Timeline Skeleton */}
        <div className="lg:col-span-8 h-96 rounded-2xl border-[1.5px] border-[#0F172A]/20 bg-white p-6 shadow-[3px_3px_0px_0px_#0F172A]/20 space-y-4">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="h-20 rounded-xl bg-slate-100 border border-slate-200" />
          <div className="h-20 rounded-xl bg-slate-100 border border-slate-200" />
          <div className="h-16 rounded-xl bg-slate-100 border border-slate-200" />
        </div>

        {/* Right 4 Cols: Stacked Cards Skeleton */}
        <div className="lg:col-span-4 space-y-6">
          <div className="h-44 rounded-2xl border-[1.5px] border-[#0F172A]/20 bg-white p-5 shadow-[3px_3px_0px_0px_#0F172A]/20 space-y-3">
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="h-16 rounded-xl bg-slate-100" />
          </div>
          <div className="h-44 rounded-2xl border-[1.5px] border-[#0F172A]/20 bg-white p-5 shadow-[3px_3px_0px_0px_#0F172A]/20 space-y-3">
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="h-16 rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
