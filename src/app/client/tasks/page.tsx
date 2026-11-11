import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getClientTasks, getLinkedStudentForClient } from "@/lib/services/task-service";
import { ClientTasksView } from "@/components/client/tasks/client-tasks-view";

async function ClientTasksContent() {
  const user = await requireRolePage(Role.CLIENT);
  const [tasks, linked] = await Promise.all([
    getClientTasks(user.id),
    getLinkedStudentForClient(user.id),
  ]);

  return (
    <ClientTasksView
      initialTasks={tasks}
      linkedStudent={
        linked
          ? { id: linked.student.id, name: linked.student.name }
          : null
      }
    />
  );
}

export default function ClientTasksPage() {
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
      <ClientTasksContent />
    </React.Suspense>
  );
}
