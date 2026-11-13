import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getClientTasks, getLinkedStudentForClient } from "@/lib/services/task-service";
import { ClientTasksView, ClientTaskWithLogs } from "@/components/client/tasks/client-tasks-view";
import { prisma } from "@/lib/prisma";
import ClientTasksLoading from "./loading";

async function ClientTasksContent() {
  const user = await requireRolePage(Role.CLIENT);
  const [tasks, linked] = await Promise.all([
    getClientTasks(user.id),
    getLinkedStudentForClient(user.id),
  ]);

  // Read-only query for this page's task logs (SPEC compliant: max 1 read-only query)
  const taskIds = tasks.map((t) => t.id);
  const timeLogs =
    taskIds.length > 0
      ? await prisma.timeLog.findMany({
          where: { taskId: { in: taskIds } },
          select: {
            id: true,
            taskId: true,
            timeIn: true,
            timeOut: true,
            totalHours: true,
            status: true,
          },
          orderBy: { timeIn: "desc" },
        })
      : [];

  const tasksWithLogs: ClientTaskWithLogs[] = tasks.map((t) => {
    const taskLogs = timeLogs.filter((l) => l.taskId === t.id);
    const awaitingApprovalHours = taskLogs
      .filter((l) => l.status === "CLOSED")
      .reduce((acc, l) => acc + (l.totalHours ?? 0), 0);

    return {
      ...t,
      timeLogs: taskLogs,
      awaitingApprovalHours,
    };
  });

  return (
    <ClientTasksView
      initialTasks={tasksWithLogs}
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
    <React.Suspense fallback={<ClientTasksLoading />}>
      <ClientTasksContent />
    </React.Suspense>
  );
}
