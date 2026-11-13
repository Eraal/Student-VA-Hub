"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/lib/labels";
import { formatHours } from "@/lib/format";
import { convertTo24Hour, minutesToTimeString } from "@/lib/schedule-utils";
import { AssignTaskDialog } from "../tasks/assign-task-dialog";
import type {
  ClientCalendarData,
  CalendarDayData,
  CalendarEventItem,
} from "@/lib/services/calendar-service";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface ClientCalendarViewProps {
  initialData: ClientCalendarData;
  initialAnchorDate?: string;
}

const HOUR_HEIGHT = 56; // 56px per hour row

export function ClientCalendarView({
  initialData,
  initialAnchorDate,
}: ClientCalendarViewProps) {
  const router = useRouter();

  // Navigation state
  const [currentAnchor, setCurrentAnchor] = React.useState<string>(
    initialAnchorDate || initialData.weekStartKey || new Date().toISOString().split("T")[0]
  );

  // View mode toggle ("week" on desktop by default, "list" on mobile)
  const [viewMode, setViewMode] = React.useState<"week" | "list">("week");

  // Mobile selected day index (0 to 6)
  const [selectedDayIndex, setSelectedDayIndex] = React.useState<number>(() => {
    const todayIdx = initialData.days.findIndex((d) => d.isToday);
    return todayIdx >= 0 ? todayIdx : 0;
  });

  // Assign task dialog state
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [dialogDefaults, setDialogDefaults] = React.useState<{
    date?: string;
    start?: string;
    end?: string;
  }>({});

  const handleNavigateWeek = (targetDateKey: string) => {
    setCurrentAnchor(targetDateKey);
    router.push(`/client/calendar?date=${targetDateKey}`);
  };

  const handleOpenAssignWithSlot = (
    dateKey: string,
    startTime?: string,
    endTime?: string
  ) => {
    setDialogDefaults({
      date: dateKey,
      start: startTime ? convertTo24Hour(startTime) : "18:00",
      end: endTime ? convertTo24Hour(endTime) : "20:00",
    });
    setIsAssignDialogOpen(true);
  };

  const handleOpenGeneralAssign = () => {
    const selectedDate =
      initialData.days[selectedDayIndex]?.dateKey ||
      new Date().toISOString().split("T")[0];
    setDialogDefaults({
      date: selectedDate,
      start: "18:00",
      end: "20:00",
    });
    setIsAssignDialogOpen(true);
  };

  // State: No student linked
  if (!initialData.linked) {
    return (
      <PageContainer>
        <PageHeader
          title="Student Schedule"
          subtitle="Classes and free time. Pick a free window to assign a task."
        />

        <EmptyState
          icon={CalendarIcon}
          title="No student linked yet"
          description="No student linked yet. Enter your student's invite code in Settings."
          action={
            <Link href="/client/profile">
              <Button
                size="sm"
                className="gap-2 cursor-pointer font-bold bg-[#0F172A] text-white hover:bg-slate-800"
              >
                <span>Go to settings</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const studentName = initialData.student?.name || "Student";
  const studentFirstName = studentName.trim().split(/\s+/)[0] || "Student";
  const selectedDay = initialData.days[selectedDayIndex] || initialData.days[0];
  const todayDateKey =
    initialData.days.find((d) => d.isToday)?.dateKey ||
    new Date().toISOString().split("T")[0];

  // Calculate dynamic hour bounds (default: 7 AM to 10 PM)
  let minHour = 7;
  let maxHour = 22;

  for (const day of initialData.days) {
    for (const c of day.classes) {
      minHour = Math.min(minHour, Math.floor(c.startMinutes / 60));
      maxHour = Math.max(maxHour, Math.ceil(c.endMinutes / 60));
    }
    for (const s of day.openSlots) {
      minHour = Math.min(minHour, Math.floor(s.startMinutes / 60));
      maxHour = Math.max(maxHour, Math.ceil(s.endMinutes / 60));
    }
    for (const t of day.tasks) {
      minHour = Math.min(minHour, Math.floor(t.startMinutes / 60));
      maxHour = Math.max(maxHour, Math.ceil(t.endMinutes / 60));
    }
  }

  // Ensure minimum range of 7 AM to 10 PM
  minHour = Math.min(minHour, 7);
  maxHour = Math.max(maxHour, 22);

  const hourRows = Array.from(
    { length: maxHour - minHour },
    (_, i) => minHour + i
  );

  const formatHourLabel = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH} ${period}`;
  };

  const totalWeekOpenSlots = initialData.days.reduce(
    (acc, d) => acc + d.openSlots.length,
    0
  );

  return (
    <PageContainer>
      {/* HEADER */}
      <PageHeader
        title={`${studentFirstName}'s schedule`}
        subtitle="Classes and free time. Pick a free window to assign a task."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Week navigator */}
            <div className="flex items-center rounded-lg border-[1.5px] border-[#0F172A] bg-white p-0.5 shadow-[2px_2px_0px_0px_#0F172A]">
              <Button
                variant="ghost"
                size="icon"
                data-testid="calendar-prev"
                className="size-8 cursor-pointer hover:bg-[#FAF7F2] text-[#0F172A]"
                onClick={() => handleNavigateWeek(initialData.prevWeekKey)}
                aria-label="Previous week"
                title="Previous week"
              >
                <ChevronLeft className="size-4" />
              </Button>

              <span className="px-2 text-xs font-bold text-[#0F172A] min-w-[120px] text-center">
                {initialData.weekLabel}
              </span>

              <Button
                variant="ghost"
                size="icon"
                data-testid="calendar-next"
                className="size-8 cursor-pointer hover:bg-[#FAF7F2] text-[#0F172A]"
                onClick={() => handleNavigateWeek(initialData.nextWeekKey)}
                aria-label="Next week"
                title="Next week"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {/* Today button */}
            <Button
              variant="outline"
              size="sm"
              data-testid="calendar-today"
              onClick={() => handleNavigateWeek(todayDateKey)}
              className="text-xs font-bold h-9 px-3 cursor-pointer bg-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#FAF7F2]"
            >
              Today
            </Button>

            {/* Primary Assign task button (Ink style, NOT green) */}
            <Button
              size="sm"
              data-testid="calendar-assign"
              onClick={handleOpenGeneralAssign}
              className="gap-2 cursor-pointer bg-[#0F172A] text-white hover:bg-slate-800 border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] font-bold h-9 px-4 text-xs"
            >
              <Plus className="size-4" />
              <span>Assign task</span>
            </Button>
          </div>
        }
      />

      {/* STATUS STRIP */}
      <div className="rounded-xl border-[1.5px] border-[#0F172A] bg-white p-3 shadow-[2px_2px_0px_0px_#0F172A] flex flex-wrap items-center justify-between gap-3">
        {/* Left: determineStudentLiveStatus chip */}
        <div className="flex items-center gap-2">
          {initialData.studentLiveStatus?.state === "AVAILABLE" ? (
            <span
              data-testid="client-student-status"
              data-status="AVAILABLE"
              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#16A34A] bg-[#F0FDF4] px-2.5 py-0.5 text-xs font-bold text-[#166534] shadow-[1.5px_1.5px_0px_0px_#16A34A]"
            >
              <span className="size-2 rounded-full bg-[#16A34A]" aria-hidden="true" />
              <span>{`Available now until ${initialData.studentLiveStatus.untilTime || "9:00 PM"}`}</span>
            </span>
          ) : initialData.studentLiveStatus?.state === "IN_CLASS" ? (
            <span
              data-testid="client-student-status"
              data-status="IN_CLASS"
              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-bold text-[#1E40AF] shadow-[1.5px_1.5px_0px_0px_#2563EB]"
            >
              <span className="size-2 rounded-full bg-[#2563EB]" aria-hidden="true" />
              <span>{`In class until ${initialData.studentLiveStatus.untilTime || "2:30 PM"}`}</span>
            </span>
          ) : (
            <span
              data-testid="client-student-status"
              data-status="OFF"
              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#0F172A] bg-[#FAF7F2] px-2.5 py-0.5 text-xs font-bold text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]"
            >
              <span className="size-2 rounded-full bg-slate-400" aria-hidden="true" />
              <span>Not available</span>
            </span>
          )}
        </div>

        {/* Right: Next free window prompt */}
        {initialData.nextFreeWindow && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-700">
            <span>
              Next free:{" "}
              <strong className="font-bold text-[#0F172A]">
                {initialData.nextFreeWindow.formatted}
              </strong>
            </span>
            <Button
              size="xs"
              variant="outline"
              onClick={() =>
                handleOpenAssignWithSlot(
                  initialData.nextFreeWindow!.dateKey,
                  initialData.nextFreeWindow!.startTime,
                  initialData.nextFreeWindow!.endTime
                )
              }
              className="font-bold text-xs h-7 px-2.5 bg-white border-[1.5px] border-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] cursor-pointer hover:bg-[#FAF7F2]"
            >
              Assign then
            </Button>
          </div>
        )}
      </div>

      {/* VIEW TOGGLE (Week | List) */}
      <div className="flex items-center justify-between">
        <div
          data-testid="calendar-view-toggle"
          className="inline-flex rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-0.5 shadow-[2px_2px_0px_0px_#0F172A]"
        >
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
              viewMode === "week"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-slate-600 hover:text-[#0F172A]"
            )}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
              viewMode === "list"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-slate-600 hover:text-[#0F172A]"
            )}
          >
            List
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          Times shown in Asia/Manila (UTC+8)
        </span>
      </div>

      {/* NO FREE WINDOWS STATE WARNING (if entire week has 0 open slots or hasAnyFreeTime is false) */}
      {(totalWeekOpenSlots === 0 || initialData.hasAnyFreeTime === false) && (
        <div className="rounded-xl border-[1.5px] border-[#D97706] bg-[#FFFBEB] p-4 shadow-[2px_2px_0px_0px_#D97706] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <p className="text-amber-900 font-medium">
            {`${studentFirstName} hasn't added free time yet. You can still assign a task and they will see a warning.`}
          </p>
          <Button
            size="xs"
            onClick={handleOpenGeneralAssign}
            className="shrink-0 bg-[#0F172A] text-white font-bold h-7 px-3 cursor-pointer hover:bg-slate-800"
          >
            Assign task
          </Button>
        </div>
      )}

      {/* 1. WEEK VIEW (Desktop Grid) */}
      {viewMode === "week" && (
        <div className="space-y-3">
          <div
            data-testid="calendar-week-grid"
            className="w-full rounded-2xl border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] overflow-hidden"
          >
            {/* Header row: Time label + 7 days */}
            <div
              className="grid bg-[#FAF7F2] border-b-[1.5px] border-[#0F172A]"
              style={{
                gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))",
              }}
            >
              {/* Top-left corner */}
              <div className="p-3 flex items-center justify-center text-slate-400 border-r border-[#E5DFD5]">
                <Clock className="size-4" />
              </div>

              {/* Day headers */}
              {initialData.days.map((day) => {
                return (
                  <div
                    key={day.dateKey}
                    data-testid="schedule-day-column"
                    className={cn(
                      "p-2.5 text-center border-l border-[#E5DFD5] first:border-l-0 transition-colors",
                      day.isToday ? "bg-white font-bold" : "",
                      day.isPast ? "opacity-60" : ""
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="font-display text-xs lg:text-sm font-bold text-[#0F172A]">
                        {day.shortDayName}
                      </span>
                      {day.isToday && (
                        <span className="rounded-full bg-[#0F172A] text-white px-1.5 py-0.2 text-[10px] font-bold">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="text-[11px] text-slate-600 font-medium">
                        {day.formattedDate}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 font-medium">
                        · {day.freeHoursFormatted}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grid Body */}
            <div
              className="grid relative overflow-hidden"
              style={{
                gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))",
                height: `${hourRows.length * HOUR_HEIGHT}px`,
              }}
            >
              {/* Left Column: Time Row Labels */}
              <div className="relative border-r border-[#E5DFD5] bg-[#FAF7F2]/50 select-none">
                {hourRows.map((h) => (
                  <div
                    key={h}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="border-b border-[#E5DFD5] text-[11px] font-mono text-slate-500 pr-2 pt-1.5 text-right font-medium"
                  >
                    {formatHourLabel(h)}
                  </div>
                ))}
              </div>

              {/* 7 Day Columns */}
              {initialData.days.map((day) => {
                // If day is blocked: show muted hatched background and "Not available"
                if (day.isBlocked) {
                  return (
                    <div
                      key={day.dateKey}
                      data-testid="calendar-blocked-day"
                      className="relative border-l border-[#E5DFD5] bg-[repeating-linear-gradient(45deg,#F8FAFC,#F8FAFC_10px,#E2E8F0_10px,#E2E8F0_20px)] flex flex-col items-center justify-center p-2 text-center select-none"
                    >
                      <div className="rounded-md border-[1.5px] border-slate-300 bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-600 shadow-xs">
                        Not available
                      </div>
                    </div>
                  );
                }

                // Check if Manila now line should be drawn in this column
                const isNowWithinHours =
                  initialData.currentMinutes >= minHour * 60 &&
                  initialData.currentMinutes <= maxHour * 60;
                const nowTopPx =
                  ((initialData.currentMinutes - minHour * 60) / 60) *
                  HOUR_HEIGHT;

                return (
                  <div
                    key={day.dateKey}
                    className={cn(
                      "relative border-l border-[#E5DFD5]",
                      day.isToday ? "bg-[#FAF7F2]/40" : "bg-white",
                      day.isPast ? "opacity-75" : ""
                    )}
                  >
                    {/* Background Hour Rows */}
                    {hourRows.map((h) => (
                      <div
                        key={h}
                        style={{ height: `${HOUR_HEIGHT}px` }}
                        className="border-b border-[#E5DFD5] relative"
                      />
                    ))}

                    {/* "Now" Marker Line across Today's Column */}
                    {day.isToday && isNowWithinHours && (
                      <div
                        style={{ top: `${nowTopPx}px` }}
                        className="absolute left-0 right-0 z-30 pointer-events-none flex items-center -translate-y-1/2"
                        aria-label="Current time"
                      >
                        <div className="size-2 rounded-full bg-[#DC2626] -ml-1 ring-2 ring-white" />
                        <div className="h-[2px] w-full bg-[#DC2626]" />
                      </div>
                    )}

                    {/* Class Blocks (Blue, strictly "In class", tooltip, not clickable) */}
                    {day.classes.map((cls) => {
                      const topPx =
                        ((cls.startMinutes - minHour * 60) / 60) * HOUR_HEIGHT;
                      const heightPx = Math.max(
                        36,
                        ((cls.endMinutes - cls.startMinutes) / 60) *
                        HOUR_HEIGHT -
                        4
                      );

                      return (
                        <Tooltip key={cls.id}>
                          <TooltipTrigger asChild>
                            <div
                              tabIndex={0}
                              data-testid="calendar-class-block"
                              title="In class. Tasks can't be assigned during class."
                              style={{
                                top: `${topPx + 2}px`,
                                height: `${heightPx}px`,
                              }}
                              className={cn(
                                "absolute left-1 right-1 rounded-lg border-[1.5px] border-[#0F172A] border-l-4 border-l-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] p-1.5 shadow-[2px_2px_0px_0px_#0F172A] text-left overflow-hidden z-10 select-none cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]",
                                cls.isPast ? "opacity-60" : ""
                              )}
                              aria-label={`In class ${cls.startTimeFormatted} to ${cls.endTimeFormatted}`}
                            >
                              <span className="font-bold text-xs truncate block leading-tight text-[#0F172A]">
                                In class
                              </span>
                              <span className="text-[10px] sm:text-[11px] font-semibold text-blue-800 truncate block leading-tight mt-0.5">
                                {`${cls.startTimeFormatted} – ${cls.endTimeFormatted}`}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            In class. Tasks can&apos;t be assigned during class.
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}

                    {/* Free Window Blocks (Dashed green outline, clickable button opening Assign dialog) */}
                    {day.openSlots.map((slot) => {
                      const topPx =
                        ((slot.startMinutes - minHour * 60) / 60) * HOUR_HEIGHT;
                      const heightPx = Math.max(
                        38,
                        ((slot.endMinutes - slot.startMinutes) / 60) *
                        HOUR_HEIGHT -
                        4
                      );
                      const durationStr = formatHours(
                        (slot.minutes ?? 0) / 60
                      );

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          data-testid="calendar-open-slot"
                          data-day={day.dayOfWeek}
                          data-start={slot.startTimeFormatted}
                          onClick={() =>
                            handleOpenAssignWithSlot(
                              day.dateKey,
                              minutesToTimeString(slot.startMinutes, true),
                              minutesToTimeString(slot.endMinutes, true)
                            )
                          }
                          style={{
                            top: `${topPx + 2}px`,
                            height: `${heightPx}px`,
                          }}
                          className={cn(
                            "absolute left-1 right-1 rounded-lg border-2 border-dashed border-[#16A34A] bg-[#F0FDF4]/90 text-[#166534] p-1.5 shadow-none hover:bg-[#DCFCE7] hover:border-[#15803D] hover:shadow-[2px_2px_0px_0px_#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] transition-all cursor-pointer text-left overflow-hidden z-10 group",
                            slot.isPast ? "opacity-50 hover:opacity-100" : ""
                          )}
                          aria-label={`Free window ${day.dayName} ${slot.startTimeFormatted} to ${slot.endTimeFormatted}, assign a task`}
                        >
                          <div data-testid="calendar-free-window" className="contents">
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-xs truncate block leading-tight text-[#166534]">
                                {slot.startTimeFormatted} – {slot.endTimeFormatted}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#166534] opacity-0 group-hover:opacity-100 transition-opacity">
                                + Assign
                              </span>
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-semibold text-green-800 truncate block leading-tight mt-0.5">
                              {durationStr}
                            </span>
                          </div>
                        </button>
                      );
                    })}

                    {/* Task Blocks (Solid green, links to /client/tasks) */}
                    {day.tasks.map((task) => {
                      const topPx =
                        ((task.startMinutes - minHour * 60) / 60) * HOUR_HEIGHT;
                      const heightPx = Math.max(
                        38,
                        ((task.endMinutes - task.startMinutes) / 60) *
                        HOUR_HEIGHT -
                        4
                      );

                      return (
                        <Link
                          key={task.id}
                          href="/client/tasks"
                          data-testid="calendar-task-block"
                          style={{
                            top: `${topPx + 2}px`,
                            height: `${heightPx}px`,
                          }}
                          className={cn(
                            "absolute left-1 right-1 rounded-lg border-[1.5px] border-[#0F172A] border-l-4 border-l-[#16A34A] bg-[#F0FDF4] text-[#166534] p-1.5 shadow-[2px_2px_0px_0px_#0F172A] hover:shadow-[3px_3px_0px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer text-left overflow-hidden z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]",
                            task.isPast ? "opacity-60 hover:opacity-100" : ""
                          )}
                          aria-label={`Task ${task.title}, status ${task.taskStatus}, click to view in tasks`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold text-xs truncate block leading-tight text-[#0F172A]">
                              {task.title}
                            </span>
                            {task.taskStatus && (
                              <StatusBadge status={task.taskStatus} />
                            )}
                          </div>
                          <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 truncate block leading-tight mt-0.5">
                            {`${task.startTimeFormatted} – ${task.endTimeFormatted}`}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend below grid */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="size-3 rounded-sm border-[1.5px] border-[#0F172A] bg-[#EFF6FF]" />
                <span>Class</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="size-3 rounded-sm border-2 border-dashed border-[#16A34A] bg-[#F0FDF4]" />
                <span>Free window</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="size-3 rounded-sm border-[1.5px] border-[#0F172A] bg-[#F0FDF4]" />
                <span>Task</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="size-3 rounded-sm border border-slate-300 bg-[repeating-linear-gradient(45deg,#F1F5F9,#F1F5F9_3px,#CBD5E1_3px,#CBD5E1_6px)]" />
                <span>Not available</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium italic">
              Class details are private. You only see when the student is in class.
            </p>
          </div>
        </div>
      )}

      {/* 2. LIST VIEW (Mobile Friendly) */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {/* Day chips (Mon to Sun) with today selected and a dot on days that have free time */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {initialData.days.map((day, idx) => {
              const isSelected = selectedDayIndex === idx;
              const hasFree = day.openSlots.length > 0;

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => setSelectedDayIndex(idx)}
                  className={cn(
                    "relative py-2 px-1 rounded-xl text-center border-[1.5px] transition-all cursor-pointer flex flex-col items-center justify-center min-h-[58px]",
                    isSelected
                      ? "bg-[#0F172A] text-white border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]"
                      : "bg-white text-slate-700 border-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] hover:bg-[#FAF7F2]"
                  )}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block">
                    {day.shortDayName}
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono block mt-0.5">
                    {day.formattedDate.split(" ")[1]}
                  </span>
                  {hasFree && (
                    <span
                      className={cn(
                        "size-1.5 rounded-full mt-1",
                        isSelected
                          ? "bg-[#16A34A] ring-1 ring-white"
                          : "bg-[#16A34A]"
                      )}
                      aria-label="Has free time"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Day Content */}
          <div className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-5 shadow-[3px_3px_0px_0px_#0F172A] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5DFD5] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-bold text-base text-[#0F172A]">
                    {selectedDay.dayName}, {selectedDay.formattedDate}
                  </h2>
                  {selectedDay.isToday && (
                    <span className="rounded-full bg-[#0F172A] text-white px-2 py-0.5 text-[10px] font-bold">
                      Today
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  {selectedDay.freeHoursFormatted} · {selectedDay.classes.length} classes · {selectedDay.tasks.length} tasks
                </p>
              </div>

              {selectedDay.openSlots.length > 0 && (
                <Button
                  size="sm"
                  onClick={() =>
                    handleOpenAssignWithSlot(
                      selectedDay.dateKey,
                      minutesToTimeString(selectedDay.openSlots[0].startMinutes, true),
                      minutesToTimeString(selectedDay.openSlots[0].endMinutes, true)
                    )
                  }
                  className="bg-[#0F172A] text-white font-bold text-xs h-8 px-3 cursor-pointer hover:bg-slate-800"
                >
                  <Plus className="size-3.5 mr-1" />
                  <span>Assign</span>
                </Button>
              )}
            </div>

            {/* If Day is Blocked */}
            {selectedDay.isBlocked && (
              <div
                data-testid="calendar-blocked-day"
                className="rounded-xl border-[1.5px] border-slate-300 bg-[repeating-linear-gradient(45deg,#F8FAFC,#F8FAFC_8px,#E2E8F0_8px,#E2E8F0_16px)] p-4 text-center"
              >
                <span className="font-bold text-xs text-slate-600">
                  Not available
                </span>
              </div>
            )}

            {/* Chronological List of Events */}
            {!selectedDay.isBlocked && (
              <div className="space-y-2.5">
                {(() => {
                  // Merge classes, tasks, and openSlots and sort by startMinutes
                  type ListItem =
                    | { kind: "CLASS"; item: CalendarEventItem }
                    | { kind: "TASK"; item: CalendarEventItem }
                    | { kind: "SLOT"; item: CalendarEventItem };

                  const items: ListItem[] = [
                    ...selectedDay.classes.map((c) => ({ kind: "CLASS" as const, item: c })),
                    ...selectedDay.tasks.map((t) => ({ kind: "TASK" as const, item: t })),
                    ...selectedDay.openSlots.map((s) => ({ kind: "SLOT" as const, item: s })),
                  ].sort((a, b) => a.item.startMinutes - b.item.startMinutes);

                  if (items.length === 0) {
                    return (
                      <div className="py-8 text-center text-slate-500 font-medium text-xs">
                        Not available
                      </div>
                    );
                  }

                  return items.map(({ kind, item }) => {
                    if (kind === "CLASS") {
                      return (
                        <div
                          key={`list-${item.id}`}
                          data-testid="calendar-class-block"
                          title="In class. Tasks can't be assigned during class."
                          className="flex items-center justify-between rounded-xl border-[1.5px] border-[#0F172A] border-l-4 border-l-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] p-3 shadow-[2px_2px_0px_0px_#0F172A]"
                        >
                          <div>
                            <span className="font-bold text-xs block text-[#0F172A]">
                              In class
                            </span>
                            <span className="text-[11px] font-semibold text-blue-800">
                              Class schedule (Private)
                            </span>
                          </div>
                          <span className="font-mono text-xs font-semibold text-blue-900">
                            {item.startTimeFormatted} – {item.endTimeFormatted}
                          </span>
                        </div>
                      );
                    }

                    if (kind === "TASK") {
                      return (
                        <Link
                          key={`list-${item.id}`}
                          href="/client/tasks"
                          data-testid="calendar-task-block"
                          className="flex items-center justify-between rounded-xl border-[1.5px] border-[#0F172A] border-l-4 border-l-[#16A34A] bg-[#F0FDF4] text-[#166534] p-3 shadow-[2px_2px_0px_0px_#0F172A] hover:bg-green-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="size-4 text-[#16A34A]" />
                            <div>
                              <span className="font-bold text-xs block text-[#0F172A]">
                                {item.title}
                              </span>
                              <span className="text-[11px] font-mono text-slate-600">
                                {item.startTimeFormatted} – {item.endTimeFormatted} ({formatHours(item.estHours || 1)})
                              </span>
                            </div>
                          </div>
                          {item.taskStatus && <StatusBadge status={item.taskStatus} />}
                        </Link>
                      );
                    }

                    // Free window (SLOT)
                    return (
                      <div
                        key={`list-${item.id}`}
                        data-testid="calendar-open-slot"
                        data-day={selectedDay.dayOfWeek}
                        data-start={item.startTimeFormatted}
                        className="flex items-center justify-between rounded-xl border-2 border-dashed border-[#16A34A] bg-[#F0FDF4] text-[#166534] p-3 hover:bg-[#DCFCE7] transition-colors"
                      >
                        <div data-testid="calendar-free-window" className="contents flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Clock className="size-4 text-[#16A34A]" />
                            <div>
                              <span className="font-bold text-xs block text-[#166534]">
                                Free window ({formatHours((item.minutes ?? 0) / 60)})
                              </span>
                              <span className="text-[11px] font-mono text-green-800 font-semibold">
                                {item.startTimeFormatted} – {item.endTimeFormatted}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="xs"
                            onClick={() =>
                              handleOpenAssignWithSlot(
                                selectedDay.dateKey,
                                minutesToTimeString(item.startMinutes, true),
                                minutesToTimeString(item.endMinutes, true)
                              )
                            }
                            className="bg-[#0F172A] text-white font-bold text-xs h-7 px-3 cursor-pointer hover:bg-slate-800"
                          >
                            Assign
                          </Button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating "Assign task" button above bottom tab bar on mobile */}
      <div className="fixed bottom-20 right-4 lg:hidden z-30">
        <Button
          onClick={handleOpenGeneralAssign}
          className="rounded-full bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[3px_3px_0px_0px_#0F172A] hover:bg-slate-800 gap-2 px-5 py-3 font-bold h-12 text-sm cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <Plus className="size-5" />
          <span>Assign task</span>
        </Button>
      </div>

      {/* Assign Task Dialog */}
      <AssignTaskDialog
        isOpen={isAssignDialogOpen}
        onClose={() => setIsAssignDialogOpen(false)}
        onSuccess={() => {
          setIsAssignDialogOpen(false);
          router.refresh();
        }}
        linkedStudentName={initialData.student?.name}
        defaults={dialogDefaults}
      />
    </PageContainer>
  );
}
