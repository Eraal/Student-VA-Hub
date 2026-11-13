import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role, TaskStatus, StudentResponse } from "@prisma/client";
import { getStudentTimeData } from "@/lib/services/time-service";
import { StudentTimeView } from "@/components/student/time/student-time-view";
import { prisma } from "@/lib/prisma";

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

  const [timeData, profile, tasksRaw, logsWithTask] = await Promise.all([
    getStudentTimeData(user.id),
    prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { maxHoursPerDay: true },
    }),
    prisma.task.findMany({
      where: {
        studentId: user.id,
        status: { in: [TaskStatus.TODO, TaskStatus.DOING] },
        studentResponse: StudentResponse.ACCEPTED,
      },
      select: {
        id: true,
        title: true,
        status: true,
        dueAt: true,
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.timeLog.findMany({
      where: { studentId: user.id },
      select: {
        id: true,
        task: {
          select: {
            client: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const maxHoursPerDay = profile?.maxHoursPerDay ?? 4;

  const clientNameMap = new Map<string, string>();
  for (const item of logsWithTask) {
    if (item.task?.client?.name) {
      clientNameMap.set(item.id, item.task.client.name);
    }
  }

  const enrichedTasks = tasksRaw.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    dueAt: t.dueAt,
    clientName: t.client?.name ?? "Client",
  }));

  const enrichedLogs = timeData.logs.map((l) => ({
    ...l,
    clientName: clientNameMap.get(l.id) ?? "Client",
  }));

  const enrichedActiveLog = timeData.activeLog
    ? {
      ...timeData.activeLog,
      clientName: clientNameMap.get(timeData.activeLog.id) ?? "Client",
    }
    : null;

  return (
    <StudentTimeView
      initialData={{
        ...timeData,
        logs: enrichedLogs,
        activeLog: enrichedActiveLog,
      }}
      availableTasks={enrichedTasks}
      maxHoursPerDay={maxHoursPerDay}
      preselectedTaskId={resolvedParams?.taskId}
    />
  );
}

function StudentTimeSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-32 rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-200" />
      </div>

      {/* Hero card skeleton */}
      <div className="rounded-2xl border-[1.5px] border-[#0F172A]/20 bg-white p-6 sm:p-8 space-y-6 shadow-[3px_3px_0px_0px_rgba(15,23,42,0.1)]">
        <div className="h-16 sm:h-20 w-64 mx-auto rounded-xl bg-slate-100" />
        <div className="h-12 w-full rounded-lg bg-slate-100" />
        <div className="h-[52px] w-full rounded-lg bg-slate-200" />
        <div className="h-6 w-48 rounded bg-slate-100" />
      </div>

      {/* Stat tiles skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="h-24 rounded-2xl border-[1.5px] border-[#0F172A]/20 bg-white p-4" />
        <div className="h-24 rounded-2xl border-[1.5px] border-[#0F172A]/20 bg-white p-4" />
        <div className="h-24 rounded-2xl border-[1.5px] border-[#0F172A]/20 bg-white p-4" />
      </div>

      {/* Log history skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-28 rounded bg-slate-200" />
        <div className="h-10 w-72 rounded-lg bg-slate-100" />
        <div className="space-y-3">
          <div className="h-16 rounded-xl border-[1.5px] border-[#0F172A]/20 bg-white" />
          <div className="h-16 rounded-xl border-[1.5px] border-[#0F172A]/20 bg-white" />
          <div className="h-16 rounded-xl border-[1.5px] border-[#0F172A]/20 bg-white" />
        </div>
      </div>
    </div>
  );
}

export default function StudentTimePage({ searchParams }: StudentTimePageProps) {
  return (
    <React.Suspense fallback={<StudentTimeSkeleton />}>
      <StudentTimeContent searchParams={searchParams} />
    </React.Suspense>
  );
}
