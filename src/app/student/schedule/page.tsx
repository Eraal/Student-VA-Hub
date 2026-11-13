import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getStudentSchedule } from "@/lib/services/schedule-service";
import { ScheduleView } from "@/components/student/schedule/schedule-view";

async function StudentScheduleContent() {
  const user = await requireRolePage(Role.STUDENT);
  const scheduleData = await getStudentSchedule(user.id);

  return <ScheduleView initialData={scheduleData} />;
}

function ScheduleLoadingSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-lg bg-slate-200" />
          <div className="h-4 w-80 max-w-full rounded bg-slate-200" />
        </div>
        <div className="h-10 w-28 rounded-lg bg-slate-200" />
      </div>

      {/* Tabs skeleton */}
      <div className="h-11 w-56 rounded-xl bg-slate-200" />

      {/* Summary Strip (3 tiles) skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 rounded-2xl border-[1.5px] border-[#0F172A]/20 bg-white p-5 shadow-[3px_3px_0px_0px_rgba(15,23,42,0.1)] space-y-3">
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="h-8 w-16 bg-slate-200 rounded" />
          <div className="h-3 w-32 bg-slate-200 rounded" />
        </div>
        <div className="h-32 rounded-2xl border-[1.5px] border-[#0F172A]/20 bg-white p-5 shadow-[3px_3px_0px_0px_rgba(15,23,42,0.1)] space-y-3">
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="h-8 w-16 bg-slate-200 rounded" />
          <div className="h-3 w-32 bg-slate-200 rounded" />
        </div>
        <div className="h-32 rounded-2xl border-[1.5px] border-[#0F172A]/20 bg-white p-5 shadow-[3px_3px_0px_0px_rgba(15,23,42,0.1)] space-y-3">
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="h-8 w-32 bg-slate-200 rounded" />
          <div className="h-3 w-28 bg-slate-200 rounded" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="rounded-2xl border-[1.5px] border-[#0F172A]/20 bg-white shadow-[3px_3px_0px_0px_rgba(15,23,42,0.1)] overflow-hidden">
        <div className="h-12 bg-slate-100 border-b border-slate-200" />
        <div className="space-y-px p-4">
          <div className="h-14 border-b border-slate-100" />
          <div className="h-14 border-b border-slate-100" />
          <div className="h-14 border-b border-slate-100" />
          <div className="h-14 border-b border-slate-100" />
          <div className="h-14" />
        </div>
      </div>
    </div>
  );
}

export default function StudentSchedulePage() {
  return (
    <React.Suspense fallback={<ScheduleLoadingSkeleton />}>
      <StudentScheduleContent />
    </React.Suspense>
  );
}
