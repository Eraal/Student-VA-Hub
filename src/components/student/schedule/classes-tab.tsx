"use client";

import * as React from "react";
import { FormattedClass } from "@/lib/services/schedule-service";
import {
  DAYS_ORDER_ACADEMIC,
  getDayName,
  minutesToTimeString,
} from "@/lib/schedule-utils";
import { formatHours } from "@/lib/format";
import { deleteClassAction, addClassAction } from "@/lib/actions/schedule";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { toUserErrorMessage } from "@/lib/errors";
import { ClassFormDialog } from "./class-form-dialog";
import { ClassDetailsDialog } from "./class-details-dialog";
import { DeleteClassDialog } from "./delete-class-dialog";
import { WeekTimetableGrid } from "./week-timetable-grid";
import { toZonedTime } from "date-fns-tz";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Calendar,
  LayoutGrid,
  List as ListIcon,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface ClassesTabProps {
  initialClasses: FormattedClass[];
  onRefresh?: () => void;
  isAddClassOpen?: boolean;
  setIsAddClassOpen?: (open: boolean) => void;
  prefillAdd?: { dayOfWeek?: number; startTime?: string };
  setPrefillAdd?: (
    prefill: { dayOfWeek?: number; startTime?: string } | undefined
  ) => void;
}

const MANILA_TZ = "Asia/Manila";
const HOUR_HEIGHT = 56; // 56px per hour row

export function ClassesTab({
  initialClasses,
  onRefresh,
  isAddClassOpen: controlledAddOpen,
  setIsAddClassOpen: controlledSetAddOpen,
  prefillAdd: controlledPrefill,
  setPrefillAdd: controlledSetPrefill,
}: ClassesTabProps) {
  const [classes, setClasses] = React.useState<FormattedClass[]>(initialClasses);
  const [viewMode, setViewMode] = React.useState<"week" | "list">("week");

  // Local fallback dialog state if not controlled
  const [uncontrolledAddOpen, setUncontrolledAddOpen] = React.useState(false);
  const [uncontrolledPrefill, setUncontrolledPrefill] = React.useState<
    { dayOfWeek?: number; startTime?: string } | undefined
  >(undefined);

  const isAddOpen = controlledAddOpen ?? uncontrolledAddOpen;
  const setIsAddOpen = controlledSetAddOpen ?? setUncontrolledAddOpen;
  const prefill = controlledPrefill ?? uncontrolledPrefill;
  const setPrefill = controlledSetPrefill ?? setUncontrolledPrefill;

  // Selected class for details & editing
  const [selectedClassForDetails, setSelectedClassForDetails] =
    React.useState<FormattedClass | null>(null);
  const [editingClass, setEditingClass] = React.useState<FormattedClass | null>(
    null
  );

  // Deletion state
  const [classToDelete, setClassToDelete] = React.useState<FormattedClass | null>(
    null
  );
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [errorState, setErrorState] = React.useState<string | null>(null);

  // Weekend toggle: on automatically if any class is on Sat (6) or Sun (0)
  const hasWeekendClass = classes.some(
    (c) => c.dayOfWeek === 0 || c.dayOfWeek === 6
  );
  const [showWeekend, setShowWeekend] = React.useState<boolean>(hasWeekendClass);

  React.useEffect(() => {
    if (hasWeekendClass) {
      setShowWeekend(true);
    }
  }, [hasWeekendClass]);

  React.useEffect(() => {
    setClasses(initialClasses);
  }, [initialClasses]);

  // Current Asia/Manila time
  const [nowZoned, setNowZoned] = React.useState<Date>(() =>
    toZonedTime(new Date(), MANILA_TZ)
  );

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNowZoned(toZonedTime(new Date(), MANILA_TZ));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const todayDayOfWeek = nowZoned.getDay(); // 0 is Sunday, 1 is Monday...
  const currentMinutes = nowZoned.getHours() * 60 + nowZoned.getMinutes();

  // Mobile selected day in Agenda view (defaults to today)
  const [selectedMobileDay, setSelectedMobileDay] =
    React.useState<number>(todayDayOfWeek);

  // Handlers for Add Class
  const handleOpenAdd = (dayOfWeek = 1, startTime?: string) => {
    setEditingClass(null);
    setPrefill({ dayOfWeek, startTime });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (cls: FormattedClass) => {
    setSelectedClassForDetails(null);
    setEditingClass(cls);
    setIsAddOpen(true);
  };

  // Handlers for Delete Class
  const handleConfirmDelete = (cls: FormattedClass) => {
    setSelectedClassForDetails(null);
    setClassToDelete(cls);
  };

  const executeDelete = async () => {
    if (!classToDelete) return;
    setIsDeleting(true);
    const targetClass = classToDelete;

    try {
      const res = await deleteClassAction(targetClass.id);
      if (res.success) {
        setClasses((prev) => prev.filter((c) => c.id !== targetClass.id));
        setClassToDelete(null);

        // Toast with Undo action using existing addClassAction
        toast.success("Class schedule removed.", {
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                const addRes = await addClassAction({
                  subject: targetClass.subject,
                  dayOfWeek: targetClass.dayOfWeek,
                  startTime: minutesToTimeString(targetClass.startMinutes, true),
                  endTime: minutesToTimeString(targetClass.endMinutes, true),
                });
                if (addRes.success) {
                  toast.success("Class schedule restored.");
                  onRefresh?.();
                } else {
                  toast.error(toUserErrorMessage(addRes.error));
                }
              } catch (err) {
                toast.error(toUserErrorMessage(err));
              }
            },
          },
        });

        onRefresh?.();
      } else {
        toast.error(toUserErrorMessage(res.error ?? "Failed to delete class."));
      }
    } catch (err) {
      console.error(err);
      toast.error(toUserErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute Summary Statistics
  const totalWeeklyMinutes = classes.reduce(
    (acc, c) => acc + (c.endMinutes - c.startMinutes),
    0
  );
  const totalWeeklyHours = totalWeeklyMinutes / 60;

  // Compute Next Class
  const nextClassInfo = React.useMemo(() => {
    if (classes.length === 0) return null;

    const sorted = classes
      .map((cls) => {
        const dayDiff = (cls.dayOfWeek - todayDayOfWeek + 7) % 7;
        let diffMinutes = 0;
        let isToday = false;
        let isTomorrow = false;

        if (dayDiff === 0) {
          if (cls.startMinutes >= currentMinutes) {
            diffMinutes = cls.startMinutes - currentMinutes;
            isToday = true;
          } else {
            // Passed today, occurs in 7 days
            diffMinutes = 7 * 24 * 60 + (cls.startMinutes - currentMinutes);
          }
        } else {
          isTomorrow = dayDiff === 1;
          diffMinutes = dayDiff * 24 * 60 + (cls.startMinutes - currentMinutes);
        }

        return { cls, diffMinutes, isToday, isTomorrow };
      })
      .sort((a, b) => a.diffMinutes - b.diffMinutes);

    const next = sorted[0];
    if (!next) return null;

    let dayLabel = "";
    if (next.isToday) {
      dayLabel = "Today";
    } else if (next.isTomorrow) {
      dayLabel = "Tomorrow";
    } else {
      dayLabel = getDayName(next.cls.dayOfWeek, true);
    }

    return {
      dayLabel,
      time: next.cls.startTime,
      subject: next.cls.subject,
    };
  }, [classes, todayDayOfWeek, currentMinutes]);

  // Compute Grid Range: 7 AM (420) to 10 PM (1320) default, expanded if needed
  const { minHour, maxHour } = React.useMemo(() => {
    let minH = 7;
    let maxH = 22; // 10 PM
    classes.forEach((c) => {
      const sH = Math.floor(c.startMinutes / 60);
      const eH = Math.ceil(c.endMinutes / 60);
      if (sH < minH) minH = Math.max(0, sH);
      if (eH > maxH) maxH = Math.min(24, eH);
    });
    return { minHour: minH, maxHour: maxH };
  }, [classes]);

  const hourRows: number[] = [];
  for (let h = minHour; h < maxHour; h++) {
    hourRows.push(h);
  }

  const formatHourLabel = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH} ${period}`;
  };

  // Columns for the week grid: Mon-Fri by default, or Mon-Sun if showWeekend
  const gridColumns = showWeekend
    ? DAYS_ORDER_ACADEMIC
    : DAYS_ORDER_ACADEMIC.filter((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);

  // Grouped classes for list view
  const daysWithClasses = DAYS_ORDER_ACADEMIC.filter((d) =>
    classes.some((c) => c.dayOfWeek === d.dayOfWeek)
  );
  const emptyDaysNames = DAYS_ORDER_ACADEMIC.filter(
    (d) => !classes.some((c) => c.dayOfWeek === d.dayOfWeek)
  ).map((d) => d.shortName);

  return (
    <div className="w-full space-y-6">
      {/* Error state if any */}
      {errorState && (
        <div className="rounded-2xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-5 shadow-[3px_3px_0px_0px_#DC2626] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-[#DC2626] shrink-0" />
            <p className="text-xs sm:text-sm font-semibold text-[#991B1B]">
              {errorState}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setErrorState(null);
              onRefresh?.();
            }}
            className="bg-[#DC2626] text-white border-[1.5px] border-[#DC2626] font-bold text-xs gap-1.5 cursor-pointer shrink-0"
          >
            <RefreshCw className="size-3.5" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {/* SUMMARY STRIP (3 compact stat tiles, display-font numbers) */}
      <div className="flex md:grid md:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2 md:pb-0 scrollbar-none">
        {/* Tile 1: Classes this week */}
        <div className="min-w-[240px] sm:min-w-0 snap-start rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-4 sm:p-5 shadow-[3px_3px_0px_0px_#0F172A] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Classes this week
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#EFF6FF] text-[#2563EB] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
                <BookOpen className="size-3.5" />
              </div>
            </div>
            <div>
              <span className="font-display text-3xl sm:text-4xl font-black tracking-tight text-[#0F172A]">
                {classes.length}
              </span>
              <p className="text-xs text-slate-600 font-medium mt-1">
                {classes.length === 1
                  ? "1 class scheduled"
                  : `${classes.length} classes scheduled`}
              </p>
            </div>
          </div>
        </div>

        {/* Tile 2: Time in class */}
        <div className="min-w-[240px] sm:min-w-0 snap-start rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-4 sm:p-5 shadow-[3px_3px_0px_0px_#0F172A] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Time in class
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
                <Clock className="size-3.5" />
              </div>
            </div>
            <div>
              <span className="font-display text-3xl sm:text-4xl font-black tracking-tight text-[#0F172A]">
                {formatHours(totalWeeklyHours)}
              </span>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Weekly study commitment
              </p>
            </div>
          </div>
        </div>

        {/* Tile 3: Next class */}
        <div className="min-w-[240px] sm:min-w-0 snap-start rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-4 sm:p-5 shadow-[3px_3px_0px_0px_#0F172A] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Next class
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
                <Calendar className="size-3.5" />
              </div>
            </div>
            <div>
              {nextClassInfo ? (
                <div>
                  <span className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A] block truncate">
                    {nextClassInfo.dayLabel}, {nextClassInfo.time}
                  </span>
                  <p className="text-xs text-slate-600 font-bold truncate mt-1">
                    {nextClassInfo.subject}
                  </p>
                </div>
              ) : (
                <div>
                  <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#0F172A] block">
                    No upcoming classes
                  </span>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    All clear for now
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EMPTY STATE (no classes at all) */}
      {classes.length === 0 ? (
        <div className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-8 sm:p-12 text-center space-y-4 shadow-[3px_3px_0px_0px_#0F172A]">
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="font-display text-lg sm:text-xl font-bold text-[#0F172A]">
              No classes yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              No classes yet. Add your classes so clients can&apos;t book over them.
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              data-testid="schedule-add-class"
              onClick={() => handleOpenAdd(1)}
              className="bg-[#0F172A] text-white font-bold border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none min-h-[40px] px-5 rounded-lg text-xs gap-2 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Add class</span>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Controls Bar: View Toggle & Weekend Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#0F172A]">
                Weekly Timetable
              </h2>
              <p className="text-xs text-slate-500">
                Click any open hour to block off a class.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Show weekend toggle (only in week view) */}
              {viewMode === "week" && (
                <button
                  type="button"
                  onClick={() => setShowWeekend(!showWeekend)}
                  className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-[#0F172A] px-3 py-1.5 text-xs font-bold transition-all shadow-[1.5px_1.5px_0px_0px_#0F172A] cursor-pointer ${
                    showWeekend
                      ? "bg-[#0F172A] text-white"
                      : "bg-white text-slate-700 hover:bg-[#FAF7F2]"
                  }`}
                >
                  <span>Show weekend</span>
                </button>
              )}

              {/* View Toggle: Week | List */}
              <div
                data-testid="schedule-view-toggle"
                className="flex items-center gap-1 rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-1 shadow-[2px_2px_0px_0px_#0F172A]"
              >
                <button
                  type="button"
                  onClick={() => setViewMode("week")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "week"
                      ? "bg-[#0F172A] text-white shadow-xs"
                      : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
                  }`}
                >
                  <LayoutGrid className="size-3.5" />
                  <span>Week</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-[#0F172A] text-white shadow-xs"
                      : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
                  }`}
                >
                  <ListIcon className="size-3.5" />
                  <span>List</span>
                </button>
              </div>
            </div>
          </div>

          {/* MOBILE AGENDA VIEW (< 768px when week view is active) */}
          <div className="block md:hidden">
            {viewMode === "week" ? (
              <div className="space-y-4">
                {/* Day Chips (Mon to Sun) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                  {DAYS_ORDER_ACADEMIC.map((day) => {
                    const isSelected = selectedMobileDay === day.dayOfWeek;
                    const isToday = todayDayOfWeek === day.dayOfWeek;
                    const dayHasClasses = classes.some(
                      (c) => c.dayOfWeek === day.dayOfWeek
                    );

                    return (
                      <button
                        key={day.dayOfWeek}
                        type="button"
                        onClick={() => setSelectedMobileDay(day.dayOfWeek)}
                        className={`flex flex-col items-center justify-center min-h-[48px] px-3.5 py-1.5 rounded-xl border-[1.5px] border-[#0F172A] transition-all cursor-pointer shrink-0 snap-start ${
                          isSelected
                            ? "bg-[#0F172A] text-white shadow-[2px_2px_0px_0px_#0F172A]"
                            : "bg-white text-slate-700 shadow-[1.5px_1.5px_0px_0px_#0F172A] hover:bg-[#FAF7F2]"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold">
                            {day.shortName}
                          </span>
                          {dayHasClasses && (
                            <span
                              className={`size-1.5 rounded-full ${
                                isSelected ? "bg-white" : "bg-[#2563EB]"
                              }`}
                            />
                          )}
                        </div>
                        {isToday && (
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                              isSelected ? "text-slate-200" : "text-blue-600"
                            }`}
                          >
                            Today
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Classes */}
                {(() => {
                  const dayClasses = classes.filter(
                    (c) => c.dayOfWeek === selectedMobileDay
                  );
                  const dayInfo = DAYS_ORDER_ACADEMIC.find(
                    (d) => d.dayOfWeek === selectedMobileDay
                  )!;
                  const isToday = todayDayOfWeek === selectedMobileDay;

                  return (
                    <div className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[3px_3px_0px_0px_#0F172A] space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#E5DFD5]">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-sm font-bold text-[#0F172A]">
                            {dayInfo.name}
                          </h3>
                          {isToday && (
                            <span className="rounded-full bg-[#0F172A] text-white px-2 py-0.5 text-[10px] font-bold">
                              Today
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          {dayClasses.length}{" "}
                          {dayClasses.length === 1 ? "class" : "classes"}
                        </span>
                      </div>

                      {dayClasses.length === 0 ? (
                        <div className="py-6 text-center space-y-2">
                          <p className="text-xs text-slate-500">
                            No classes scheduled for {dayInfo.name}.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAdd(selectedMobileDay)}
                            className="border-[1.5px] border-[#0F172A] text-xs font-bold text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] gap-1 cursor-pointer"
                          >
                            <Plus className="size-3.5" />
                            <span>Add class for {dayInfo.name}</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {dayClasses.map((cls) => (
                            <div
                              key={cls.id}
                              className="flex items-center justify-between gap-2 p-3 rounded-xl border-[1.5px] border-[#0F172A] border-l-4 border-l-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] shadow-[1.5px_1.5px_0px_0px_#0F172A]"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-sm text-[#0F172A] truncate block leading-snug">
                                  {cls.subject}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 mt-0.5">
                                  <Clock className="size-3 shrink-0" />
                                  <span>
                                    {cls.startTime} – {cls.endTime}
                                  </span>
                                  <span className="text-slate-400">&bull;</span>
                                  <span>
                                    {formatHours(
                                      (cls.endMinutes - cls.startMinutes) / 60
                                    )}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  data-testid="schedule-class-edit"
                                  aria-label={`Edit ${cls.subject}`}
                                  onClick={() => handleOpenEdit(cls)}
                                  className="size-10 rounded-lg border-[1.5px] border-[#0F172A] bg-white text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] hover:bg-[#FAF7F2] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  data-testid="schedule-class-delete"
                                  aria-label={`Delete ${cls.subject}`}
                                  onClick={() => handleConfirmDelete(cls)}
                                  className="size-10 rounded-lg border-[1.5px] border-[#0F172A] bg-white text-slate-400 hover:text-[#DC2626] hover:border-[#DC2626] shadow-[1.5px_1.5px_0px_0px_#0F172A] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Mobile Floating Add Class Button */}
                <Button
                  type="button"
                  data-testid="schedule-add-class"
                  onClick={() => handleOpenAdd(selectedMobileDay)}
                  aria-label="Add class"
                  className="fixed bottom-20 right-4 z-40 md:hidden flex items-center gap-2 rounded-full border-[1.5px] border-[#0F172A] bg-[#0F172A] text-white px-4 py-3 font-bold text-xs shadow-[3px_3px_0px_0px_#0F172A] hover:bg-slate-800 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>Add class</span>
                </Button>
              </div>
            ) : null}
          </div>

          {/* DESKTOP WEEK GRID (Default on desktop: md:block) */}
          {viewMode === "week" && (
            <div className="hidden md:block">
              <WeekTimetableGrid
                mode="classes"
                classes={classes}
                showWeekend={showWeekend}
                minHour={minHour}
                maxHour={maxHour}
                hourRows={hourRows}
                gridColumns={gridColumns}
                todayDayOfWeek={todayDayOfWeek}
                currentMinutes={currentMinutes}
                onEmptyCellClick={(dayOfWeek, slotStartTime) =>
                  handleOpenAdd(dayOfWeek, slotStartTime)
                }
                onSelectClass={(cls) => setSelectedClassForDetails(cls)}
              />
            </div>
          )}

          {/* LIST VIEW (when viewMode is "list", visible on desktop and mobile) */}
          {viewMode === "list" && (
            <div className="space-y-4">
              {daysWithClasses.map((day) => {
                const dayClasses = classes.filter(
                  (c) => c.dayOfWeek === day.dayOfWeek
                );
                const isToday = todayDayOfWeek === day.dayOfWeek;

                return (
                  <div
                    key={day.dayOfWeek}
                    className={`rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-4 sm:p-5 shadow-[3px_3px_0px_0px_#0F172A] space-y-3 ${
                      isToday ? "ring-2 ring-[#0F172A]/20 bg-[#FAF7F2]/40" : ""
                    }`}
                  >
                    {/* Day Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#E5DFD5]">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base font-bold text-[#0F172A]">
                          {day.name}
                        </h3>
                        {isToday && (
                          <span className="rounded-full bg-[#0F172A] text-white px-2 py-0.5 text-[10px] font-bold">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-500">
                        {dayClasses.length}{" "}
                        {dayClasses.length === 1 ? "class" : "classes"}
                      </span>
                    </div>

                    {/* Class Rows */}
                    <div className="space-y-2.5">
                      {dayClasses.map((cls) => (
                        <div
                          key={cls.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border-[1.5px] border-[#0F172A] border-l-4 border-l-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] shadow-[1.5px_1.5px_0px_0px_#0F172A]"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-sm text-[#0F172A] block leading-snug">
                              {cls.subject}
                            </span>
                            <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 mt-1">
                              <Clock className="size-3.5 shrink-0" />
                              <span>
                                {cls.startTime} – {cls.endTime}
                              </span>
                              <span className="text-slate-400">&bull;</span>
                              <span>
                                {formatHours(
                                  (cls.endMinutes - cls.startMinutes) / 60
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              data-testid="schedule-class-edit"
                              aria-label={`Edit ${cls.subject}`}
                              onClick={() => handleOpenEdit(cls)}
                              className="size-10 rounded-lg border-[1.5px] border-[#0F172A] bg-white text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] hover:bg-[#FAF7F2] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              data-testid="schedule-class-delete"
                              aria-label={`Delete ${cls.subject}`}
                              onClick={() => handleConfirmDelete(cls)}
                              className="size-10 rounded-lg border-[1.5px] border-[#0F172A] bg-white text-slate-400 hover:text-[#DC2626] hover:border-[#DC2626] shadow-[1.5px_1.5px_0px_0px_#0F172A] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Collapsed single line for days without classes */}
              {emptyDaysNames.length > 0 && emptyDaysNames.length < 7 && (
                <div className="rounded-xl border border-dashed border-[#E5DFD5] bg-[#FAF7F2]/60 px-4 py-3 text-xs text-slate-500 font-medium text-center sm:text-left">
                  No classes on {emptyDaysNames.join(", ")}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Class Form Dialog */}
      <ClassFormDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => {
          onRefresh?.();
        }}
        initialClass={editingClass}
        defaultDayOfWeek={prefill?.dayOfWeek ?? 1}
        defaultStartTime={prefill?.startTime}
      />

      {/* Class Details Popover/Dialog (when clicking block on week grid) */}
      <ClassDetailsDialog
        isOpen={Boolean(selectedClassForDetails)}
        onClose={() => setSelectedClassForDetails(null)}
        classItem={selectedClassForDetails}
        onEdit={handleOpenEdit}
        onDelete={handleConfirmDelete}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteClassDialog
        isOpen={Boolean(classToDelete)}
        onClose={() => setClassToDelete(null)}
        onConfirm={executeDelete}
        classItem={classToDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
