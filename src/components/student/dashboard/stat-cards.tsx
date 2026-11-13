"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckSquare, TrendingUp, ArrowRight, Copy, Check, Users } from "lucide-react";
import type { StudentDashboardData } from "@/lib/services/dashboard-service";
import { formatHours, formatPeso } from "@/lib/format";

interface StatCardsProps {
  capacity: StudentDashboardData["capacity"];
  tasksSummary: StudentDashboardData["tasksSummary"];
  weeklyEarnings: StudentDashboardData["weeklyEarnings"];
  linkedClient: StudentDashboardData["linkedClient"];
}

export function StatCards({
  capacity,
  tasksSummary,
  weeklyEarnings,
  linkedClient,
}: StatCardsProps) {
  // Invite code copy state for empty tasks state
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/student/invite-code")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.code?.code) {
          setInviteCode(data.code.code);
        }
      })
      .catch(() => {});
  }, []);

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const totalActiveTasks = tasksSummary.todoCount + tasksSummary.doingCount;
  const maxSegments = Math.max(1, capacity.maxHoursPerDay);

  // 7-day bar chart mock distribution based on weeklyEarnings.hoursThisWeek and hoursToday
  const days = ["M", "T", "W", "Th", "F", "Sa", "Su"];
  // Highlight current day index (0 is Monday in Manila standard week)
  const currentDayIndex = Math.min(6, Math.max(0, new Date().getDay() === 0 ? 6 : new Date().getDay() - 1));

  const dayHeights = days.map((_, idx) => {
    if (idx === currentDayIndex) {
      return Math.min(100, Math.max(20, (capacity.hoursToday / capacity.maxHoursPerDay) * 100));
    }
    if (idx < currentDayIndex && weeklyEarnings.hoursThisWeek > 0) {
      return Math.min(85, Math.max(15, ((weeklyEarnings.hoursThisWeek / (currentDayIndex + 1)) / capacity.maxHoursPerDay) * 80));
    }
    return 10; // baseline placeholder for upcoming days
  });

  return (
    <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto snap-x snap-mandatory pb-2 md:pb-0 scrollbar-none">
      {/* 1. Daily Capacity Card */}
      <Card className="min-w-[280px] sm:min-w-0 snap-start rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-5 shadow-[3px_3px_0px_0px_#0F172A] flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Daily Capacity
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
              <Clock className="size-3.5" />
            </div>
          </div>

          {/* Focal Number */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-black tracking-tight text-[#0F172A]">
                {formatHours(capacity.hoursToday)}
              </span>
              <span className="text-xs font-bold text-slate-500">
                / {formatHours(capacity.maxHoursPerDay)} max
              </span>
            </div>

            {/* Segmented Bar (1 segment per hour of max capacity) */}
            <div className="flex items-center gap-1.5 pt-1">
              {Array.from({ length: maxSegments }).map((_, i) => {
                const isFilled = capacity.hoursToday >= i + 1;
                const isPartial = !isFilled && capacity.hoursToday > i;
                return (
                  <div
                    key={i}
                    className={`h-3.5 flex-1 rounded-md border-[1.5px] border-[#0F172A] transition-all overflow-hidden ${
                      isFilled
                        ? "bg-[#16A34A]"
                        : isPartial
                        ? "bg-[#16A34A]/50"
                        : "bg-[#FAF7F2]"
                    }`}
                    title={`Hour ${i + 1}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Status text */}
        <div className="pt-4 border-t border-[#E5DFD5] flex items-center justify-between text-xs">
          <span
            className={`font-bold ${
              capacity.isAtCapacity ? "text-[#DC2626]" : "text-[#16A34A]"
            }`}
          >
            {capacity.isAtCapacity
              ? `Limit reached (${formatHours(capacity.maxHoursPerDay)})`
              : `${formatHours(capacity.remainingHoursToday)} remaining today`}
          </span>
          <Link
            href="/student/schedule"
            className="text-[11px] font-bold text-[#0F172A] hover:underline inline-flex items-center gap-1"
          >
            <span>Schedule</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </Card>

      {/* 2. Tasks to Do Card */}
      <Card className="min-w-[280px] sm:min-w-0 snap-start rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-5 shadow-[3px_3px_0px_0px_#0F172A] flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tasks to do
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
              <CheckSquare className="size-3.5" />
            </div>
          </div>

          {/* Focal Number */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-black tracking-tight text-[#0F172A]">
                {totalActiveTasks}
              </span>
              <span className="text-xs font-bold text-slate-500">
                active ({tasksSummary.doingCount} in progress)
              </span>
            </div>

            {/* Task list or Empty state */}
            {totalActiveTasks > 0 && tasksSummary.nextTask ? (
              <div className="pt-1">
                <p className="text-xs font-bold text-[#0F172A] truncate">
                  &bull; {tasksSummary.nextTask.title}
                </p>
                <p className="text-[11px] text-slate-500">
                  Est: {formatHours(tasksSummary.nextTask.estHours)}
                </p>
              </div>
            ) : (
              <div className="pt-1 space-y-1.5">
                <p className="text-xs text-slate-600 leading-snug">
                  No tasks assigned yet. Share your invite code with your client.
                </p>
                {inviteCode && (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={handleCopyCode}
                    className="h-7 text-[11px] font-bold border-[1.5px] border-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] gap-1 cursor-pointer bg-[#FAF7F2]"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="size-3 text-[#16A34A]" />
                        <span>Copied ({inviteCode})!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy Code ({inviteCode})</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Link */}
        <div className="pt-4 border-t border-[#E5DFD5] flex items-center justify-between text-xs">
          <Link
            href="/student/tasks"
            className="text-[11px] font-bold text-[#0F172A] hover:underline inline-flex items-center gap-1"
          >
            <span>View tasks</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </Card>

      {/* 3. This Week's Earnings Card */}
      <Card className="min-w-[280px] sm:min-w-0 snap-start rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-5 shadow-[3px_3px_0px_0px_#0F172A] flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Weekly Earnings
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#16A34A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
              <TrendingUp className="size-3.5" />
            </div>
          </div>

          {/* Focal Number */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-black tracking-tight text-[#0F172A]">
                {formatPeso(weeklyEarnings.estimatedAmount)}
              </span>
              <span className="text-xs font-bold text-slate-500">
                ({formatHours(weeklyEarnings.hoursThisWeek)})
              </span>
            </div>

            {/* 7-Day Mini Bar Chart (plain divs, no chart library) */}
            <div className="space-y-1 pt-1">
              <div className="h-9 flex items-end justify-between gap-1.5 w-full">
                {dayHeights.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center h-full justify-end"
                  >
                    <div
                      style={{ height: `${h}%` }}
                      className={`w-full rounded-t-[3px] border-[1px] border-[#0F172A] transition-all duration-300 ${
                        i === currentDayIndex
                          ? "bg-[#16A34A]"
                          : h > 15
                          ? "bg-[#16A34A]/70"
                          : "bg-slate-200"
                      }`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                {days.map((d, i) => (
                  <span
                    key={i}
                    className={`flex-1 text-center ${
                      i === currentDayIndex ? "text-[#0F172A] font-black" : ""
                    }`}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rate + Client info underneath */}
        <div className="pt-3 border-t border-[#E5DFD5] flex items-center justify-between text-xs">
          <span className="text-[11px] font-bold text-slate-600 truncate max-w-[170px]">
            {linkedClient
              ? `${formatPeso(linkedClient.hourlyRate)}/hr • ${linkedClient.name}`
              : "No linked client"}
          </span>
          <Link
            href="/student/earnings"
            className="text-[11px] font-bold text-[#0F172A] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>Earnings</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </Card>
    </div>
  );
}

