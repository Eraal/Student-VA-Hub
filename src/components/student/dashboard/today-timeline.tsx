"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  GraduationCap,
  Briefcase,
  Check,
  Clock,
  ArrowRight,
} from "lucide-react";
import type { StudentDashboardClass } from "@/lib/services/dashboard-service";
import {
  getTimelineIndexForNow,
  getCurrentFreeWindow,
  TimelineScheduleItem,
} from "@/lib/timeline-position";
import { formatTime } from "@/lib/format";

interface TodayTimelineProps {
  classesToday: StudentDashboardClass[];
  activeTimer: {
    id: string;
    taskId: string;
    taskTitle: string;
    timeIn: Date | string;
  } | null;
}

export function TodayTimeline({
  classesToday,
  activeTimer,
}: TodayTimelineProps) {
  // Current time in Asia/Manila (minutes from midnight)
  const [currentMinutes, setCurrentMinutes] = React.useState<number>(() => {
    const d = new Date();
    // Convert to Manila time (UTC + 8 hours)
    const utcHours = d.getUTCHours();
    const utcMins = d.getUTCMinutes();
    const manilaMins = (utcHours * 60 + utcMins + 8 * 60) % 1440;
    return manilaMins;
  });

  React.useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const utcHours = d.getUTCHours();
      const utcMins = d.getUTCMinutes();
      const manilaMins = (utcHours * 60 + utcMins + 8 * 60) % 1440;
      setCurrentMinutes(manilaMins);
    };

    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  // Format current minutes to 12-hour string (e.g. "1:00 PM")
  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  // Convert classes to sorted timeline schedule items
  const sortedClasses = [...classesToday].sort(
    (a, b) => a.startMinutes - b.startMinutes
  );
  const scheduleItems: TimelineScheduleItem[] = sortedClasses.map((c) => ({
    id: c.id,
    startMinutes: c.startMinutes,
    endMinutes: c.endMinutes,
  }));

  // Determine insertion index for the Now marker
  const nowIndex = getTimelineIndexForNow(scheduleItems, currentMinutes);
  const currentFreeWindow = getCurrentFreeWindow(scheduleItems, currentMinutes);

  const hasItems = classesToday.length > 0 || Boolean(activeTimer);

  const renderNowMarker = () => (
    <div
      key="now-marker"
      className="flex items-center gap-2 my-2 py-1"
      aria-label={`Current time: ${formatMinutes(currentMinutes)}`}
    >
      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DC2626] text-white text-[10px] font-bold shrink-0 shadow-[1px_1px_0px_0px_#0F172A]">
        <span className="size-1.5 rounded-full bg-white animate-pulse" />
        <span>Now ({formatMinutes(currentMinutes)})</span>
      </div>
      <div className="h-[2px] flex-1 bg-[#DC2626]" />
    </div>
  );

  return (
    <Card className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-6 shadow-[3px_3px_0px_0px_#0F172A]">
      <CardHeader className="p-0 pb-4 border-b border-[#E5DFD5]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#EFF6FF] text-[#2563EB] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
              <Calendar className="size-4" />
            </div>
            <div>
              <CardTitle className="font-display text-lg font-bold text-[#0F172A]">
                Today&apos;s Timeline
              </CardTitle>
              <p className="text-xs text-slate-500 font-medium">
                7:00 AM – 10:00 PM &bull; Schedule and free time
              </p>
            </div>
          </div>

          <Link href="/student/schedule">
            <Button
              variant="outline"
              size="xs"
              className="text-xs font-bold border-[1.5px] border-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] gap-1 cursor-pointer bg-white"
            >
              <span>Schedule</span>
              <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-5">
        {!hasItems ? (
          /* Empty state */
          <div className="rounded-xl border-[1.5px] border-dashed border-[#0F172A]/30 bg-[#FAF7F2] p-8 text-center space-y-3">
            <div className="flex size-11 items-center justify-center rounded-xl border-[1.5px] border-[#0F172A] bg-white text-slate-700 mx-auto shadow-[2px_2px_0px_0px_#0F172A]">
              <Calendar className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-[#0F172A]">
                No classes or tasks today
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Your day is currently clear. You can add recurring classes or availability windows in your schedule.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/student/schedule">
                <Button
                  size="sm"
                  className="bg-[#0F172A] text-white font-bold border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] text-xs gap-1.5"
                >
                  <Calendar className="size-3.5" />
                  <span>Go to Schedule</span>
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Active VA Work Block (if currently timed in) */}
            {activeTimer && (
              <div className="flex items-center justify-between rounded-xl border-[1.5px] border-[#0F172A] border-l-4 border-l-[#16A34A] bg-[#F0FDF4] p-4 text-[#166534] shadow-[2px_2px_0px_0px_#0F172A]">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#16A34A] text-white shrink-0">
                    <Briefcase className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold text-[#0F172A]">
                        {activeTimer.taskTitle}
                      </span>
                      <Badge className="bg-[#16A34A] text-white text-[10px] font-bold px-2 py-0">
                        Timed in now
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-green-800 mt-0.5">
                      Started: {formatTime(activeTimer.timeIn)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-green-700 bg-green-100/70 px-2 py-0.5 rounded">
                    Work
                  </span>
                </div>
              </div>
            )}

            {/* List of Scheduled Class Blocks with Chronologically Placed Now Marker */}
            {sortedClasses.map((cls, idx) => {
              const isOngoing = cls.status === "ONGOING";
              const isCompleted = cls.status === "COMPLETED";
              const isNowHere = nowIndex === idx;

              return (
                <React.Fragment key={cls.id}>
                  {/* Now marker placed before this item if current time is before it */}
                  {isNowHere && renderNowMarker()}

                  <div
                    className={`flex items-center justify-between rounded-xl border-[1.5px] border-[#0F172A] p-4 transition-all shadow-[2px_2px_0px_0px_#0F172A] ${
                      isOngoing
                        ? "bg-[#EFF6FF] border-l-4 border-l-[#2563EB] text-[#1E40AF] ring-2 ring-[#2563EB]/40"
                        : isCompleted
                        ? "bg-[#EFF6FF]/60 border-l-4 border-l-[#2563EB]/50 opacity-60 text-slate-600"
                        : "bg-[#EFF6FF] border-l-4 border-l-[#2563EB] text-[#1E40AF]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-9 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] text-white shrink-0 ${
                          isCompleted ? "bg-slate-500" : "bg-[#2563EB]"
                        }`}
                      >
                        <GraduationCap className="size-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-sm font-bold text-[#0F172A]">
                            {cls.subject}
                          </span>
                          {isOngoing && (
                            <Badge className="bg-[#2563EB] text-white text-[10px] font-bold px-2 py-0">
                              Current class
                            </Badge>
                          )}
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 rounded bg-white/80 border border-slate-300 text-slate-700 px-1.5 py-0.5 text-[10px] font-bold">
                              <Check className="size-2.5 text-[#16A34A] stroke-[3]" />
                              Completed
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">
                          {cls.startTimeFormatted} – {cls.endTimeFormatted}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                        Class
                      </span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {/* Now marker placed after all items if current time is after all items */}
            {nowIndex >= sortedClasses.length && renderNowMarker()}

            {/* Current Real Free Window (if enclosing current time) */}
            {currentFreeWindow && (
              <div className="flex items-center justify-between rounded-xl border-2 border-dashed border-[#16A34A] bg-[#F0FDF4]/50 p-3.5 text-[#166534]">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-[#16A34A]/10 text-[#16A34A]">
                    <Clock className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#166534] block">
                      Free: {currentFreeWindow.startTimeFormatted} – {currentFreeWindow.endTimeFormatted}
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Available for VA tasks and client communication without class conflicts.
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-bold tracking-wider text-green-800 bg-green-100 px-2 py-0.5 rounded">
                  Available window
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
