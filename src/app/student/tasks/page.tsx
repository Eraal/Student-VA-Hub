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
        <div className="w-full max-w-5xl mx-auto space-y-6">
          <div className="space-y-1">
            <div className="h-8 w-44 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-4 w-96 max-w-full rounded bg-slate-200 animate-pulse" />
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-[#0F172A]/20 bg-[#FAF7F2] p-1 shadow-[2px_2px_0px_0px_#0F172A]/20 w-full sm:w-fit animate-pulse">
            <div className="h-8 w-16 rounded-lg bg-slate-200" />
            <div className="h-8 w-20 rounded-lg bg-slate-200" />
            <div className="h-8 w-24 rounded-lg bg-slate-200" />
            <div className="h-8 w-16 rounded-lg bg-slate-200" />
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[110px] rounded-2xl border-[1.5px] border-[#0F172A]/20 bg-white p-4 shadow-[3px_3px_0px_0px_#0F172A]/10 relative overflow-hidden flex flex-col justify-between animate-pulse"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200" />
                <div className="flex items-center justify-between">
                  <div className="h-5 w-48 rounded bg-slate-200" />
                  <div className="h-8 w-24 rounded-lg bg-slate-200" />
                </div>
                <div className="h-3.5 w-72 rounded bg-slate-100" />
                <div className="flex items-center gap-4">
                  <div className="h-4 w-28 rounded bg-slate-200" />
                  <div className="h-4 w-36 rounded bg-slate-200" />
                  <div className="h-4 w-24 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <StudentTasksContent />
    </React.Suspense>
  );
}
