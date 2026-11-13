import * as React from "react";
import { Card } from "@/components/ui/card";

export function ProfileSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-pulse">
      {/* Header Card Skeleton (compact ~96px) */}
      <Card className="p-4 sm:p-5 border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] rounded-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="size-12 sm:size-14 rounded-full bg-slate-200 shrink-0" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-40 rounded bg-slate-200" />
                <div className="h-5 w-16 rounded-full bg-slate-200" />
              </div>
              <div className="h-4 w-48 rounded bg-slate-200" />
            </div>
          </div>
          <div className="hidden sm:block h-10 w-24 rounded-lg bg-slate-200 shrink-0" />
        </div>
      </Card>

      {/* Grid Layout Skeleton (2 balanced columns on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Right column (order-1 lg:order-2) */}
        <div className="order-1 lg:order-2 space-y-6">
          <Card className="p-5 sm:p-6 border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] rounded-2xl space-y-4">
            <div className="space-y-1.5 pb-4 border-b border-[#E5DFD5]">
              <div className="h-5 w-32 rounded bg-slate-200" />
              <div className="h-3.5 w-48 rounded bg-slate-200" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-11 sm:size-12 rounded-full bg-slate-200 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="h-3 w-40 rounded bg-slate-200" />
                </div>
              </div>
              <div className="h-7 w-20 rounded-full bg-slate-200" />
            </div>
          </Card>
        </div>

        {/* Left column (order-2 lg:order-1) */}
        <div className="order-2 lg:order-1 space-y-6">
          {/* Personal Details Skeleton */}
          <Card className="p-5 sm:p-6 border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] rounded-2xl space-y-5">
            <div className="space-y-1.5 pb-4 border-b border-[#E5DFD5]">
              <div className="h-5 w-36 rounded bg-slate-200" />
              <div className="h-3.5 w-56 rounded bg-slate-200" />
            </div>
            <div className="space-y-4">
              <div className="h-10 rounded-lg bg-slate-200 w-full" />
              <div className="h-10 rounded-lg bg-slate-200 w-full" />
            </div>
            <div className="pt-2 border-t border-[#E5DFD5] flex justify-end">
              <div className="h-10 w-28 rounded-lg bg-slate-200" />
            </div>
          </Card>

          {/* Password Skeleton */}
          <Card className="p-5 sm:p-6 border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5DFD5]">
              <div className="space-y-1.5">
                <div className="h-5 w-28 rounded bg-slate-200" />
                <div className="h-3.5 w-44 rounded bg-slate-200" />
              </div>
              <div className="h-9 w-32 rounded-lg bg-slate-200" />
            </div>
            <div className="h-4 w-60 rounded bg-slate-200" />
          </Card>
        </div>
      </div>
    </div>
  );
}
