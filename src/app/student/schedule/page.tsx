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

export default function StudentSchedulePage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-6 w-64 rounded bg-[var(--color-border)]" />
            <div className="h-4 w-96 rounded bg-[var(--color-border)]" />
          </div>
          <div className="h-10 w-full border-b border-[var(--color-border)]" />
          <div className="space-y-3">
            <div className="h-28 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
            <div className="h-28 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
            <div className="h-28 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
          </div>
        </div>
      }
    >
      <StudentScheduleContent />
    </React.Suspense>
  );
}
