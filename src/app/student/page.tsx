import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getStudentDashboardData } from "@/lib/services/dashboard-service";
import { StudentDashboardView } from "@/components/student/dashboard/student-dashboard-view";

async function StudentDashboardContent() {
  const user = await requireRolePage(Role.STUDENT);
  const data = await getStudentDashboardData(user.id);

  return <StudentDashboardView data={data} />;
}

export default function StudentPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-48 rounded bg-[var(--color-border)]" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="h-28 rounded-md bg-[var(--color-surface)]" />
            <div className="h-28 rounded-md bg-[var(--color-surface)]" />
            <div className="h-28 rounded-md bg-[var(--color-surface)]" />
          </div>
          <div className="h-64 rounded-md bg-[var(--color-surface)]" />
        </div>
      }
    >
      <StudentDashboardContent />
    </React.Suspense>
  );
}
