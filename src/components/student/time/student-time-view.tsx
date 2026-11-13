"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { StudentTimeTrackingData } from "@/lib/services/time-service";
import { formatHours } from "@/lib/format";
import { TimerCard, StudentTimeTaskItem, EnrichedTimeLog } from "./timer-card";
import { TimeLogsList } from "./time-logs-list";
import { TimeLogStatus } from "@prisma/client";
import { Clock, Calendar, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export interface StudentTimeViewData
  extends Omit<StudentTimeTrackingData, "logs" | "activeLog" | "hourlyRate"> {
  logs: EnrichedTimeLog[];
  activeLog: EnrichedTimeLog | null;
  hourlyRate?: number;
}

interface StudentTimeViewProps {
  initialData: StudentTimeViewData;
  availableTasks?: StudentTimeTaskItem[];
  maxHoursPerDay?: number;
  preselectedTaskId?: string;
  error?: string | null;
}

export function StudentTimeView({
  initialData,
  availableTasks,
  maxHoursPerDay = 4,
  preselectedTaskId,
  error,
}: StudentTimeViewProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Compute Waiting for Approval hours from logs already loaded (status === CLOSED)
  const waitingForApprovalHours = React.useMemo(() => {
    return initialData.logs
      .filter((l) => l.status === TimeLogStatus.CLOSED)
      .reduce((sum, l) => sum + (l.totalHours ?? 0), 0);
  }, [initialData.logs]);

  // Tasks resolved from prop or initialData fallback
  const resolvedTasks: StudentTimeTaskItem[] = React.useMemo(() => {
    if (availableTasks && availableTasks.length > 0) {
      return availableTasks;
    }
    return (initialData.availableTasks || []).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueAt: new Date(),
      clientName: "Client",
    }));
  }, [availableTasks, initialData.availableTasks]);

  if (error) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12 text-center space-y-4">
        <div className="inline-flex size-12 items-center justify-center rounded-2xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] text-[#DC2626] shadow-[2px_2px_0px_0px_#DC2626]">
          <Clock className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold text-[#0F172A]">
            Unable to load time tracking
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            {error || "An unexpected error occurred while loading your time log data. Please try again."}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          className="h-10 px-5 text-xs font-bold bg-[#0F172A] hover:bg-slate-800 text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] gap-2"
        >
          <RotateCcw className="size-3.5" />
          <span>Retry</span>
        </Button>
      </div>
    );
  }

  return (
    <PageContainer className="space-y-8">
      {/* HEADER */}
      <PageHeader
        title="Time"
        subtitle="Start the timer when you begin a task and stop it when you finish. Your client reviews the hours."
      />

      {/* TIMER HERO CARD (The focal point, full content width) */}
      <TimerCard
        activeLog={initialData.activeLog}
        availableTasks={resolvedTasks}
        preselectedTaskId={preselectedTaskId}
        maxHoursPerDay={maxHoursPerDay}
        hoursToday={initialData.hoursToday}
        onSuccess={handleRefresh}
      />

      {/* STAT TILES (3 compact tiles, display-font numbers, no tall empty space) */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2 sm:pb-0 scrollbar-none">
        {/* 1. Today */}
        <div className="min-w-[220px] sm:min-w-0 snap-start rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-4 sm:p-5 shadow-[2px_2px_0px_0px_#0F172A] flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Today
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
                <Clock className="size-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
                {formatHours(initialData.hoursToday)}
              </span>
              <span className="text-xs font-bold text-slate-500">
                / {formatHours(maxHoursPerDay)} max
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium pt-3 border-t border-[#E5DFD5] mt-3">
            Daily limit for healthy pacing
          </p>
        </div>

        {/* 2. Last 7 days */}
        <div className="min-w-[220px] sm:min-w-0 snap-start rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-4 sm:p-5 shadow-[2px_2px_0px_0px_#0F172A] flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Last 7 days
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
                <Calendar className="size-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
                {formatHours(initialData.hoursThisWeek)}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium pt-3 border-t border-[#E5DFD5] mt-3">
            Total verified VA hours
          </p>
        </div>

        {/* 3. Waiting for approval */}
        <div className="min-w-[220px] sm:min-w-0 snap-start rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-4 sm:p-5 shadow-[2px_2px_0px_0px_#0F172A] flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Waiting for approval
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
                <CheckCircle2 className="size-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
                {formatHours(waitingForApprovalHours)}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium pt-3 border-t border-[#E5DFD5] mt-3">
            Awaiting client review
          </p>
        </div>
      </div>

      {/* LOG HISTORY */}
      <TimeLogsList
        logs={initialData.logs}
        hourlyRate={initialData.hourlyRate ?? 150}
        onRefresh={handleRefresh}
      />
    </PageContainer>
  );
}
