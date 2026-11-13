import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role, TimeLogStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStudentEarningsData } from "@/lib/services/invoice-service";
import {
  StudentEarningsView,
  LoggedTimeSummary,
} from "@/components/student/earnings/student-earnings-view";

async function StudentEarningsContent() {
  const user = await requireRolePage(Role.STUDENT);
  const data = await getStudentEarningsData(user.id);

  // Single read-only query in this page's loader to support period filtering (This week, This month, All time)
  const timeLogs = await prisma.timeLog.findMany({
    where: {
      studentId: user.id,
      status: { in: [TimeLogStatus.CLOSED, TimeLogStatus.APPROVED] },
    },
    select: {
      id: true,
      timeIn: true,
      totalHours: true,
      status: true,
    },
    orderBy: { timeIn: "desc" },
  });

  const formattedLogs: LoggedTimeSummary[] = timeLogs.map((log) => ({
    id: log.id,
    timeIn: log.timeIn,
    totalHours: log.totalHours ?? 0,
    status: log.status,
  }));

  return <StudentEarningsView initialData={data} loggedHours={formattedLogs} />;
}

export default function StudentEarningsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6 animate-pulse max-w-5xl mx-auto w-full">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-2">
              <div className="h-7 w-32 rounded-lg bg-slate-200 border-[1.5px] border-slate-300" />
              <div className="h-4 w-64 rounded bg-slate-200" />
            </div>
            <div className="h-8 w-48 rounded-full bg-slate-200 border-[1.5px] border-slate-300" />
          </div>

          {/* Hero Card Skeleton */}
          <div className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-6 shadow-[3px_3px_0px_0px_#0F172A] space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="h-8 w-64 rounded-lg bg-slate-200" />
            </div>
            <div className="h-10 w-44 rounded bg-slate-200" />
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-72 rounded bg-slate-200" />
          </div>

          {/* Three Compact Tiles Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="h-24 rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[3px_3px_0px_0px_#0F172A]" />
            <div className="h-24 rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[3px_3px_0px_0px_#0F172A]" />
            <div className="h-24 rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[3px_3px_0px_0px_#0F172A]" />
          </div>

          {/* Invoices Skeleton */}
          <div className="space-y-3">
            <div className="h-6 w-32 rounded bg-slate-200" />
            <div className="h-40 rounded-xl border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A]" />
          </div>

          {/* By Task Skeleton */}
          <div className="space-y-3">
            <div className="h-6 w-32 rounded bg-slate-200" />
            <div className="h-40 rounded-xl border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A]" />
          </div>
        </div>
      }
    >
      <StudentEarningsContent />
    </React.Suspense>
  );
}
