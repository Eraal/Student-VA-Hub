"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Briefcase, Clock, ArrowRight } from "lucide-react";
import type { StudentDashboardClass, StudentDashboardData } from "@/lib/services/dashboard-service";
import { formatHours } from "@/lib/format";

interface NextUpCardProps {
  nextClass: StudentDashboardClass | null;
  nextTask: StudentDashboardData["tasksSummary"]["nextTask"];
  classesToday: StudentDashboardClass[];
}

export function NextUpCard({ nextClass, nextTask, classesToday }: NextUpCardProps) {
  // Current time in minutes (Asia/Manila)
  const [currentMinutes] = React.useState<number>(() => {
    const d = new Date();
    const utcHours = d.getUTCHours();
    const utcMins = d.getUTCMinutes();
    return (utcHours * 60 + utcMins + 8 * 60) % 1440;
  });

  // Calculate countdown for next class
  let countdownText = "";
  if (nextClass) {
    const diff = nextClass.startMinutes - currentMinutes;
    if (diff <= 0) {
      countdownText = "Starting now";
    } else if (diff < 60) {
      countdownText = `in ${diff} min`;
    } else {
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      countdownText = m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
    }
  }

  // Determine tomorrow's preview fallback when today is finished
  const firstClassToday = classesToday[0];
  const tomorrowTime = firstClassToday ? firstClassToday.startTimeFormatted : "9:00 AM";
  const tomorrowSubject = firstClassToday ? firstClassToday.subject : "First Class";

  return (
    <Card className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-5 shadow-[3px_3px_0px_0px_#0F172A] flex flex-col justify-between">
      <CardHeader className="p-0 pb-3 border-b border-[#E5DFD5]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Next Up
          </span>
          <div className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#EFF6FF] text-[#2563EB] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
            <Clock className="size-3.5" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-4 space-y-3">
        {nextClass ? (
          /* Active upcoming class today */
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl border-[1.5px] border-[#0F172A] bg-[#2563EB] text-white shrink-0 shadow-[2px_2px_0px_0px_#0F172A]">
                <GraduationCap className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-display text-base font-bold text-[#0F172A]">
                    {nextClass.subject}
                  </h4>
                  <Badge className="bg-[#2563EB] text-white text-[10px] font-bold px-2 py-0">
                    {countdownText}
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-slate-600">
                  {nextClass.startTimeFormatted} – {nextClass.endTimeFormatted}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E5DFD5]">
              Prepare for lecture or lab. This time block is protected from task bookings.
            </p>
          </div>
        ) : nextTask ? (
          /* Next task deadline if no more classes */
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl border-[1.5px] border-[#0F172A] bg-[#16A34A] text-white shrink-0 shadow-[2px_2px_0px_0px_#0F172A]">
                <Briefcase className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-display text-base font-bold text-[#0F172A]">
                    {nextTask.title}
                  </h4>
                  <Badge className="bg-[#16A34A] text-white text-[10px] font-bold px-2 py-0">
                    Task
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-slate-600">
                  Est: {formatHours(nextTask.estHours)} &bull; Upcoming deadline
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E5DFD5]">
              Classes completed! You can work on this task during your available window.
            </p>
          </div>
        ) : (
          /* Tomorrow's First Item Fallback (Without duplicated 'Tomorrow' text) */
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl border-[1.5px] border-[#0F172A] bg-[#0F172A] text-white shrink-0 shadow-[2px_2px_0px_0px_#0F172A]">
                <GraduationCap className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-display text-base font-bold text-[#0F172A]">
                    {tomorrowTime}
                  </h4>
                  <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0">
                    Tomorrow
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-slate-600">
                  {tomorrowSubject}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E5DFD5]">
              All scheduled items for today are completed. Rest and prepare for tomorrow!
            </p>
          </div>
        )}
      </CardContent>

      <div className="pt-3 border-t border-[#E5DFD5] flex items-center justify-between text-xs">
        <Link
          href="/student/schedule"
          className="text-[11px] font-bold text-[#0F172A] hover:underline inline-flex items-center gap-1"
        >
          <span>View full schedule</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}
