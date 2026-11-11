import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getStudentTasks } from "@/lib/services/task-service";
import { StudentTasksView } from "@/components/student/tasks/student-tasks-view";

async function StudentTasksContent() {
  const user = await requireRolePage(Role.STUDENT);
  const tasks = await getStudentTasks(user.id);

  return <StudentTasksView initialTasks={tasks} />;
}

export default function StudentTasksPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-[var(--color-border)]" />
            <div className="h-4 w-72 rounded bg-[var(--color-border)]" />
          </div>
          <div className="h-10 w-full border-b border-[var(--color-border)]" />
          <div className="space-y-3">
            <div className="h-32 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
            <div className="h-32 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
          </div>
        </div>
      }
    >
      <StudentTasksContent />
    </React.Suspense>
  );
}
