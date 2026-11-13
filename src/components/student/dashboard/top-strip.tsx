"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { Play, Square, Clock, Sparkles, GraduationCap } from "lucide-react";
import type { StudentDashboardClass } from "@/lib/services/dashboard-service";
import { formatDuration } from "@/lib/format";

interface TopStripProps {
  student: {
    name: string;
    school: string;
    course: string;
  };
  formattedDate: string;
  classesToday: StudentDashboardClass[];
  activeTimer: {
    id: string;
    taskId: string;
    taskTitle: string;
    timeIn: Date | string;
  } | null;
}

export function TopStrip({
  student,
  formattedDate,
  classesToday,
  activeTimer,
}: TopStripProps) {
  // Live elapsed timer for active time log
  const [elapsed, setElapsed] = React.useState<string>("00:00:00");

  React.useEffect(() => {
    if (!activeTimer?.timeIn) return;

    const startTime = new Date(activeTimer.timeIn).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsed(formatDuration(diffSec));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Greeting in English based on local time
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
      ? "Good afternoon"
      : "Good evening";

  const firstName = student.name ? student.name.split(" ")[0] : "Student";

  // Status Chip logic computed from schedule
  const activeClass = classesToday.find((c) => c.status === "ONGOING");
  const nextUpcoming = classesToday.find((c) => c.status === "UPCOMING");

  let statusBadgeVariant: "class" | "work" | "secondary" = "work";
  let statusText = "";
  let statusIcon = <span className="size-2 rounded-full bg-[#16A34A] animate-pulse" />;

  if (activeClass) {
    statusBadgeVariant = "class";
    statusText = `In class until ${activeClass.endTimeFormatted}`;
    statusIcon = <GraduationCap className="size-3.5 text-[#1E40AF]" />;
  } else if (nextUpcoming) {
    statusBadgeVariant = "work";
    statusText = `Free until ${nextUpcoming.startTimeFormatted}`;
    statusIcon = <span className="size-2 rounded-full bg-[#16A34A] animate-pulse" />;
  } else if (classesToday.length > 0) {
    statusBadgeVariant = "work";
    statusText = "Classes finished for today • Free until 10:00 PM";
    statusIcon = <span className="size-2 rounded-full bg-[#16A34A] animate-pulse" />;
  } else {
    statusBadgeVariant = "work";
    statusText = "No classes today • Available for VA work";
    statusIcon = <span className="size-2 rounded-full bg-[#16A34A] animate-pulse" />;
  }

  return (
    <>
      <PageHeader
        title={`${greeting}, ${firstName}!`}
        badge={
          <Badge
            variant={statusBadgeVariant}
            className="px-3 py-1 text-xs font-bold gap-1.5 shadow-[1.5px_1.5px_0px_0px_currentColor]"
          >
            {statusIcon}
            <span>{statusText}</span>
          </Badge>
        }
        subtitle={`${formattedDate} • ${student.school} (${student.course})`}
        actions={
          <div className="hidden md:flex items-center">
            {activeTimer ? (
              <Link href="/student/time">
                <Button
                  size="lg"
                  className="h-12 px-6 text-sm font-bold bg-[#DC2626] hover:bg-red-700 text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer gap-2.5 animate-pulse"
                >
                  <Square className="size-4 fill-white" />
                  <span>Time Out ({elapsed})</span>
                </Button>
              </Link>
            ) : (
              <Link href="/student/time">
                <Button
                  size="lg"
                  className="h-12 px-7 text-sm font-bold bg-[#16A34A] hover:bg-green-700 text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer gap-2.5"
                >
                  <Play className="size-4 fill-white" />
                  <span>Time In</span>
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Sticky Mobile Time In / Time Out Button (above mobile bottom bar) */}
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        {activeTimer ? (
          <Link href="/student/time">
            <Button
              className="h-12 px-5 text-xs font-bold bg-[#DC2626] hover:bg-red-700 text-white border-[1.5px] border-[#0F172A] shadow-[3px_3px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer gap-2 animate-pulse"
            >
              <Square className="size-3.5 fill-white" />
              <span>Time Out ({elapsed})</span>
            </Button>
          </Link>
        ) : (
          <Link href="/student/time">
            <Button
              className="h-12 px-6 text-sm font-bold bg-[#16A34A] hover:bg-green-700 text-white border-[1.5px] border-[#0F172A] shadow-[3px_3px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer gap-2"
            >
              <Play className="size-4 fill-white" />
              <span>Time In</span>
            </Button>
          </Link>
        )}
      </div>
    </>
  );
}

