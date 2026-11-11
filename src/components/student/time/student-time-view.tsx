"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { StudentTimeTrackingData } from "@/lib/services/time-service";
import { TimerCard } from "./timer-card";
import { TimeLogsList } from "./time-logs-list";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar, CheckCircle2 } from "lucide-react";

interface StudentTimeViewProps {
  initialData: StudentTimeTrackingData;
  preselectedTaskId?: string;
}

export function StudentTimeView({
  initialData,
  preselectedTaskId,
}: StudentTimeViewProps) {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Time Tracking
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          Time In and Time Out while working on client tasks. Times are converted to Manila (UTC+8).
        </p>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide block">
              Hours Today
            </span>
            <div className="text-lg font-bold text-[var(--color-text)]">
              {initialData.hoursToday.toFixed(2)} hrs
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide block">
              Past 7 Days
            </span>
            <div className="text-lg font-bold text-[var(--color-text)]">
              {initialData.hoursThisWeek.toFixed(2)} hrs
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1 border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide block">
              Timer State
            </span>
            <div className="text-sm font-semibold flex items-center gap-1.5 pt-0.5">
              {initialData.activeLog ? (
                <span className="text-[var(--color-work)] flex items-center gap-1">
                  <span className="size-2 rounded-full bg-[var(--color-work)] animate-pulse" />
                  <span>Tracking Active</span>
                </span>
              ) : (
                <span className="text-[var(--color-muted)]">Ready to Start</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Timer Action Widget */}
      <TimerCard
        activeLog={initialData.activeLog}
        availableTasks={initialData.availableTasks}
        preselectedTaskId={preselectedTaskId}
        onSuccess={handleRefresh}
      />

      {/* Historical Logs List */}
      <TimeLogsList logs={initialData.logs} onRefresh={handleRefresh} />
    </div>
  );
}

