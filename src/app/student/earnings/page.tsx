import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getStudentEarningsData } from "@/lib/services/invoice-service";
import { StudentEarningsView } from "@/components/student/earnings/student-earnings-view";

async function StudentEarningsContent() {
  const user = await requireRolePage(Role.STUDENT);
  const data = await getStudentEarningsData(user.id);

  return <StudentEarningsView initialData={data} />;
}

export default function StudentEarningsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-[var(--color-border)]" />
            <div className="h-4 w-72 rounded bg-[var(--color-border)]" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="h-20 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
            <div className="h-20 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
            <div className="h-20 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
            <div className="h-20 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
          </div>
          <div className="h-44 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
        </div>
      }
    >
      <StudentEarningsContent />
    </React.Suspense>
  );
}
