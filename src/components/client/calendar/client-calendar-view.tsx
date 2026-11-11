"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AssignTaskDialog } from "../tasks/assign-task-dialog";
import type { ClientCalendarData, CalendarDayData, CalendarEventItem } from "@/lib/services/calendar-service";
import { minutesToTimeString } from "@/lib/schedule-utils";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface ClientCalendarViewProps {
  initialData: ClientCalendarData;
  initialAnchorDate?: string;
}

export function ClientCalendarView({
  initialData,
  initialAnchorDate,
}: ClientCalendarViewProps) {
  const router = useRouter();

  // Navigation state
  const [currentAnchor, setCurrentAnchor] = React.useState<string>(
    initialAnchorDate || initialData.weekStartKey || new Date().toISOString().split("T")[0]
  );

  // Mobile selected day index (0 to 6)
  const [selectedDayIndex, setSelectedDayIndex] = React.useState<number>(() => {
    const todayIdx = initialData.days.findIndex((d) => d.isToday);
    return todayIdx >= 0 ? todayIdx : 0;
  });

  // Assign task dialog state
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [dialogPrefill, setDialogPrefill] = React.useState<{
    date?: string;
    startTime?: string;
    endTime?: string;
  }>({});

  const handleNavigateWeek = (targetDateKey: string) => {
    setCurrentAnchor(targetDateKey);
    router.push(`/client/calendar?date=${targetDateKey}`);
  };

  const handleOpenAssignWithSlot = (
    dateKey: string,
    startMinutes?: number,
    endMinutes?: number
  ) => {
    const startTime = startMinutes !== undefined ? minutesToTimeString(startMinutes, true) : "18:00";
    const endTime = endMinutes !== undefined ? minutesToTimeString(endMinutes, true) : "20:00";

    setDialogPrefill({
      date: dateKey,
      startTime,
      endTime,
    });
    setIsAssignDialogOpen(true);
  };

  const handleOpenGeneralAssign = () => {
    setDialogPrefill({
      date: initialData.days[selectedDayIndex]?.dateKey || new Date().toISOString().split("T")[0],
      startTime: "18:00",
      endTime: "20:00",
    });
    setIsAssignDialogOpen(true);
  };

  if (!initialData.linked) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Student Calendar
          </h1>
          <p className="text-xs text-[var(--color-muted)]">
            Read-only view ng availability at class schedule ng student.
          </p>
        </div>

        <EmptyState
          icon={CalendarIcon}
          title="Walang schedule na maipakita"
          description="I-link muna ang iyong student VA gamit ang kanilang invite code para makita ang kanilang class schedule at available work hours."
          action={
            <Link href="/client/profile">
              <Button size="sm" className="gap-1.5 cursor-pointer">
                <span>Pumunta sa Profile para mag-link</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const selectedDay = initialData.days[selectedDayIndex] || initialData.days[0];

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
              Student Schedule
            </h1>
            {initialData.student && (
              <Badge variant="outline" className="text-xs font-normal">
                {initialData.student.name}
              </Badge>
            )}
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Read-only weekly schedule. Ligtas at beripikadong class at work hours.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Week pagination */}
          <div className="flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 cursor-pointer hover:bg-[var(--color-bg)]"
              onClick={() => handleNavigateWeek(initialData.prevWeekKey)}
              title="Previous Week"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <span className="px-2 text-xs font-medium text-[var(--color-text)] min-w-[130px] text-center">
              {initialData.weekLabel}
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="size-7 cursor-pointer hover:bg-[var(--color-bg)]"
              onClick={() => handleNavigateWeek(initialData.nextWeekKey)}
              title="Next Week"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <Button
            size="sm"
            onClick={handleOpenGeneralAssign}
            className="gap-1.5 cursor-pointer bg-[var(--color-work)] hover:opacity-90 text-white"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Assign Task</span>
            <span className="sm:hidden">Task</span>
          </Button>
        </div>
      </div>

      {/* Legend & Privacy Notice */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm bg-[var(--color-class)]" />
            <span className="text-[11px] text-[var(--color-muted)]">
              Class schedule (<strong className="font-medium text-[var(--color-text)]">In class</strong>)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm bg-[var(--color-work)]" />
            <span className="text-[11px] text-[var(--color-muted)]">
              Available for VA work
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm border border-[var(--color-work)] bg-[var(--color-work-bg)]" />
            <span className="text-[11px] text-[var(--color-muted)]">
              Scheduled tasks
            </span>
          </div>
        </div>

        <div className="text-[11px] text-[var(--color-muted)] italic">
          * Para sa student privacy, &quot;In class&quot; lamang ang nakikita at nakatago ang subject names.
        </div>
      </div>

      {/* Desktop Weekly Grid (hidden on small screens) */}
      <div className="hidden lg:grid grid-cols-7 gap-2">
        {initialData.days.map((day) => {
          const hasEvents = day.classes.length > 0 || day.availabilities.length > 0 || day.tasks.length > 0;

          return (
            <div
              key={day.dateKey}
              className={`rounded-md border p-2.5 flex flex-col min-h-[420px] transition-colors ${
                day.isToday
                  ? "border-[var(--color-accent)] bg-[var(--color-surface)] shadow-xs ring-1 ring-[var(--color-accent)]/20"
                  : "border-[var(--color-border)] bg-[var(--color-surface)]"
              }`}
            >
              {/* Day header */}
              <div className="pb-2 border-b border-[var(--color-border)] mb-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[var(--color-text)] block">
                    {day.shortDayName}
                  </span>
                  <span className="text-[11px] text-[var(--color-muted)]">
                    {day.formattedDate}
                  </span>
                </div>
                {day.isToday && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                    Today
                  </Badge>
                )}
                {day.isBlocked && (
                  <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                    Blocked
                  </Badge>
                )}
              </div>

              {/* Day content */}
              <div className="space-y-1.5 flex-1 overflow-y-auto text-xs">
                {day.isBlocked && (
                  <div className="rounded border border-[var(--color-conflict)]/40 bg-[var(--color-conflict-bg)] p-1.5 text-[11px] text-[var(--color-conflict)] mb-2 flex items-center gap-1">
                    <ShieldAlert className="size-3 shrink-0" />
                    <span className="truncate">{day.blockedReason || "Blocked date"}</span>
                  </div>
                )}

                {/* Class Blocks (Strictly "In class" per SPEC §10 Scenario 6) */}
                {day.classes.map((c) => (
                  <div
                    key={c.id}
                    className="rounded border border-[var(--color-class)]/30 bg-[var(--color-class-bg)] p-1.5 text-[var(--color-class)] shadow-xs"
                    title={`In class (${c.startTimeFormatted} – ${c.endTimeFormatted})`}
                  >
                    <div className="flex items-center gap-1 font-semibold text-[11px]">
                      <GraduationCap className="size-3 shrink-0" />
                      <span className="truncate">{c.title}</span>
                    </div>
                    <div className="text-[10px] opacity-90 mt-0.5 flex items-center gap-1">
                      <Clock className="size-2.5" />
                      <span>{c.startTimeFormatted} – {c.endTimeFormatted}</span>
                    </div>
                  </div>
                ))}

                {/* Availability Blocks */}
                {day.availabilities.map((a) => (
                  <div
                    key={a.id}
                    className="group relative rounded border border-[var(--color-work)]/40 bg-[var(--color-work-bg)] p-1.5 text-[var(--color-work)] shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 font-semibold text-[11px]">
                        <Briefcase className="size-3 shrink-0" />
                        <span className="truncate">Available</span>
                      </div>
                      <button
                        onClick={() => handleOpenAssignWithSlot(day.dateKey, a.startMinutes, a.endMinutes)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-[var(--color-work)] text-white px-1 py-0.5 rounded cursor-pointer hover:opacity-90"
                        title="Assign task during this slot"
                      >
                        + Assign
                      </button>
                    </div>
                    <div className="text-[10px] opacity-90 mt-0.5 flex items-center gap-1">
                      <Clock className="size-2.5" />
                      <span>{a.startTimeFormatted} – {a.endTimeFormatted}</span>
                    </div>
                  </div>
                ))}

                {/* Tasks scheduled on this day */}
                {day.tasks.map((t) => (
                  <div
                    key={t.id}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5 shadow-xs text-[var(--color-text)]"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-[11px] truncate" title={t.title}>
                        {t.title}
                      </span>
                      <span className="text-[9px] uppercase font-semibold text-[var(--color-muted)]">
                        {t.taskStatus}
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--color-muted)] mt-0.5 flex items-center justify-between">
                      <span>{t.startTimeFormatted}</span>
                      <span>{t.estHours}h</span>
                    </div>
                  </div>
                ))}

                {!hasEvents && !day.isBlocked && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8 text-[var(--color-muted)]">
                    <p className="text-[11px]">Walang schedule</p>
                    <button
                      onClick={() => handleOpenAssignWithSlot(day.dateKey)}
                      className="mt-2 text-[10px] text-[var(--color-accent)] hover:underline cursor-pointer"
                    >
                      + Mag-assign dito
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom quick assign slot */}
              <div className="pt-2 border-t border-[var(--color-border)] mt-2">
                <Button
                  variant="ghost"
                  size="xs"
                  className="w-full text-[10px] h-6 cursor-pointer hover:bg-[var(--color-bg)] text-[var(--color-muted)]"
                  onClick={() => handleOpenAssignWithSlot(day.dateKey)}
                >
                  + Add task
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile & Tablet Day Selector + Focused Day Agenda */}
      <div className="lg:hidden space-y-3">
        {/* Horizontal Day Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {initialData.days.map((day, idx) => (
            <button
              key={day.dateKey}
              onClick={() => setSelectedDayIndex(idx)}
              className={`flex-1 min-w-[50px] py-2 px-1 rounded-md text-center border transition-colors cursor-pointer ${
                selectedDayIndex === idx
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)] font-semibold shadow-xs"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)]"
              }`}
            >
              <span className="text-[10px] block uppercase">{day.shortDayName}</span>
              <span className="text-xs font-bold block">{day.formattedDate.split(" ")[1]}</span>
            </button>
          ))}
        </div>

        {/* Selected Day Agenda Card */}
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[var(--color-text)]">
                  {selectedDay.dayName}, {selectedDay.formattedDate}
                </h2>
                {selectedDay.isToday && (
                  <Badge variant="secondary" className="text-[10px]">
                    Today
                  </Badge>
                )}
                {selectedDay.isBlocked && (
                  <Badge variant="destructive" className="text-[10px]">
                    Blocked
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                {selectedDay.classes.length} class &bull; {selectedDay.availabilities.length} available slots &bull; {selectedDay.tasks.length} tasks
              </p>
            </div>

            <Button
              size="xs"
              variant="outline"
              onClick={() => handleOpenAssignWithSlot(selectedDay.dateKey)}
              className="gap-1 text-xs cursor-pointer"
            >
              <Plus className="size-3" />
              <span>Assign</span>
            </Button>
          </div>

          {/* Agenda Items */}
          <div className="space-y-2">
            {selectedDay.isBlocked && (
              <div className="rounded-md border border-[var(--color-conflict)]/40 bg-[var(--color-conflict-bg)] p-3 text-xs text-[var(--color-conflict)] flex items-start gap-2">
                <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Blocked Date</span>
                  <span className="text-[11px] opacity-90">{selectedDay.blockedReason || "Student is unavailable on this date."}</span>
                </div>
              </div>
            )}

            {/* Classes (Strictly "In class" per SPEC §10 Scenario 6) */}
            {selectedDay.classes.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md border border-[var(--color-class)]/30 bg-[var(--color-class-bg)] p-3 text-[var(--color-class)]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-class)] text-white">
                    <GraduationCap className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{c.title}</span>
                    <span className="text-[11px] opacity-90">Class period (Student in class)</span>
                  </div>
                </div>
                <div className="text-right text-xs font-medium">
                  {c.startTimeFormatted} – {c.endTimeFormatted}
                </div>
              </div>
            ))}

            {/* Availability */}
            {selectedDay.availabilities.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-md border border-[var(--color-work)]/40 bg-[var(--color-work-bg)] p-3 text-[var(--color-work)]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-work)] text-white">
                    <Briefcase className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Available for VA Work</span>
                    <span className="text-[11px] opacity-90">Open slot for tasks</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {a.startTimeFormatted} – {a.endTimeFormatted}
                  </span>
                  <Button
                    size="xs"
                    onClick={() => handleOpenAssignWithSlot(selectedDay.dateKey, a.startMinutes, a.endMinutes)}
                    className="text-[10px] h-6 px-2 bg-[var(--color-work)] text-white cursor-pointer hover:opacity-90"
                  >
                    Use
                  </Button>
                </div>
              </div>
            ))}

            {/* Tasks */}
            {selectedDay.tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-[var(--color-text)]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <CheckCircle2 className="size-4 text-[var(--color-work)]" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold block">{t.title}</span>
                    <span className="text-[11px] text-[var(--color-muted)]">
                      {t.startTimeFormatted} – {t.endTimeFormatted} ({t.estHours}h)
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                  {t.taskStatus}
                </Badge>
              </div>
            ))}

            {selectedDay.classes.length === 0 &&
              selectedDay.availabilities.length === 0 &&
              selectedDay.tasks.length === 0 &&
              !selectedDay.isBlocked && (
                <div className="text-center py-8 text-[var(--color-muted)]">
                  <Clock className="size-6 mx-auto mb-1.5 opacity-50" />
                  <p className="text-xs">Walang naka-set na schedule sa araw na ito.</p>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleOpenAssignWithSlot(selectedDay.dateKey)}
                    className="mt-3 text-xs cursor-pointer"
                  >
                    + Mag-assign ng task sa araw na ito
                  </Button>
                </div>
              )}
          </div>
        </div>
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
        initialDate={dialogPrefill.date}
        initialStartTime={dialogPrefill.startTime}
        initialEndTime={dialogPrefill.endTime}
      />
    </div>
  );
}
