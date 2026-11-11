import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getStudentTimeData } from "@/lib/services/time-service";
import { StudentTimeView } from "@/components/student/time/student-time-view";

interface StudentTimePageProps {
  searchParams?: Promise<{ taskId?: string }>;
}

async function StudentTimeContent({
  searchParams,
}: {
  searchParams?: Promise<{ taskId?: string }>;
}) {
  const user = await requireRolePage(Role.STUDENT);
  const resolvedParams = searchParams ? await searchParams : undefined;
  const timeData = await getStudentTimeData(user.id);

  return (
    <StudentTimeView
      initialData={timeData}
      preselectedTaskId={resolvedParams?.taskId}
    />
  );
}

export default function StudentTimePage({ searchParams }: StudentTimePageProps) {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-[var(--color-border)]" />
            <div className="h-4 w-72 rounded bg-[var(--color-border)]" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
            <div className="h-16 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
            <div className="h-16 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
          </div>
          <div className="h-48 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
        </div>
      }
    >
      <StudentTimeContent searchParams={searchParams} />
    </React.Suspense>
  );
}
