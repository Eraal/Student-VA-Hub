"use client";

import * as React from "react";
import {
  FormattedAvailability,
  FormattedBlockedDate,
  FormattedClass,
} from "@/lib/services/schedule-service";
import {
  DAYS_ORDER_ACADEMIC,
  getDayName,
  minutesToTimeString,
} from "@/lib/schedule-utils";
import { formatHours } from "@/lib/format";
import {
  deleteAvailabilityAction,
  addAvailabilityAction,
} from "@/lib/actions/schedule";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { toUserErrorMessage } from "@/lib/errors";
import { MaxHoursCard } from "./max-hours-card";
import { AvailabilityDialog } from "./availability-dialog";
import { AvailabilityDetailsDialog } from "./availability-details-dialog";
import { DeleteAvailabilityDialog } from "./delete-availability-dialog";
import { BlockedDatesSection } from "./blocked-dates-section";
import { WeekTimetableGrid } from "./week-timetable-grid";
import { toZonedTime } from "date-fns-tz";
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Calendar,
  LayoutGrid,
  List as ListIcon,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

interface AvailabilityTabProps {
  initialAvailabilities: FormattedAvailability[];
  classes?: FormattedClass[];
  initialMaxHours: number;
  initialBlockedDates: FormattedBlockedDate[];
  onRefresh?: () => void;
  isAddWindowOpen?: boolean;
  setIsAddWindowOpen?: (open: boolean) => void;
  prefillAddWindow?: { dayOfWeek?: number; startTime?: string };
  setPrefillAddWindow?: (
    prefill: { dayOfWeek?: number; startTime?: string } | undefined
  ) => void;
}

const MANILA_TZ = "Asia/Manila";

export function AvailabilityTab({
  initialAvailabilities,
  classes = [],
  initialMaxHours,
  initialBlockedDates,
  onRefresh,
  isAddWindowOpen: controlledAddOpen,
  setIsAddWindowOpen: controlledSetAddOpen,
  prefillAddWindow: controlledPrefill,
  setPrefillAddWindow: controlledSetPrefill,
}: AvailabilityTabProps) {
  const [availabilities, setAvailabilities] =
    React.useState<FormattedAvailability[]>(initialAvailabilities);
  const [maxHours, setMaxHours] = React.useState<number>(initialMaxHours);
  const [viewMode, setViewMode] = React.useState<"week" | "list">("week");

  // Local dialog control fallback
  const [uncontrolledAddOpen, setUncontrolledAddOpen] = React.useState(false);
  const [uncontrolledPrefill, setUncontrolledPrefill] = React.useState<
    { dayOfWeek?: number; startTime?: string } | undefined
  >(undefined);

  const isAddOpen = controlledAddOpen ?? uncontrolledAddOpen;
  const setIsAddOpen = controlledSetAddOpen ?? setUncontrolledAddOpen;
  const prefill = controlledPrefill ?? uncontrolledPrefill;
  const setPrefill = controlledSetPrefill ?? setUncontrolledPrefill;

  // Selected item for details and editing
  const [selectedForDetails, setSelectedForDetails] =
    React.useState<FormattedAvailability | null>(null);
  const [editingWindow, setEditingWindow] =
    React.useState<FormattedAvailability | null>(null);

  // Deletion state
  const [windowToDelete, setWindowToDelete] =
    React.useState<FormattedAvailability | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [errorState, setErrorState] = React.useState<string | null>(null);

  // Weekend toggle: on automatically if any availability or class falls on weekend
  const hasWeekendItems =
    availabilities.some((a) => a.dayOfWeek === 0 || a.dayOfWeek === 6) ||
    classes.some((c) => c.dayOfWeek === 0 || c.dayOfWeek === 6);
  const [showWeekend, setShowWeekend] = React.useState<boolean>(hasWeekendItems);

  React.useEffect(() => {
    if (hasWeekendItems) {
      setShowWeekend(true);
    }
  }, [hasWeekendItems]);

  React.useEffect(() => {
    setAvailabilities(initialAvailabilities);
  }, [initialAvailabilities]);

  React.useEffect(() => {
    setMaxHours(initialMaxHours);
  }, [initialMaxHours]);

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

  const todayDayOfWeek = nowZoned.getDay();
  const currentMinutes = nowZoned.getHours() * 60 + nowZoned.getMinutes();

  // Mobile selected day in Agenda view
  const [selectedMobileDay, setSelectedMobileDay] =
    React.useState<number>(todayDayOfWeek);

  // Handlers for Add Window
  const handleOpenAdd = (dayOfWeek = 1, startTime?: string) => {
    setEditingWindow(null);
    setPrefill({ dayOfWeek, startTime });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (win: FormattedAvailability) => {
    setSelectedForDetails(null);
    setEditingWindow(win);
    setIsAddOpen(true);
  };

  const handleConfirmDelete = (win: FormattedAvailability) => {
    setSelectedForDetails(null);
    setWindowToDelete(win);
  };

  const executeDelete = async () => {
    if (!windowToDelete) return;
    setIsDeleting(true);
    const target = windowToDelete;

    try {
      const res = await deleteAvailabilityAction(target.id);
      if (res.success) {
        setAvailabilities((prev) => prev.filter((a) => a.id !== target.id));
        setWindowToDelete(null);

        toast.success("Availability window removed.", {
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                const addRes = await addAvailabilityAction({
                  dayOfWeek: target.dayOfWeek,
                  startTime: minutesToTimeString(target.startMinutes, true),
                  endTime: minutesToTimeString(target.endMinutes, true),
                });
                if (addRes.success) {
                  toast.success("Availability window restored.");
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
        toast.error(
          toUserErrorMessage(res.error ?? "Failed to delete availability.")
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(toUserErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute Summary Statistics
  const totalWeeklyMinutes = availabilities.reduce(
    (acc, a) => acc + (a.endMinutes - a.startMinutes),
    0
  );
  const totalWeeklyHours = totalWeeklyMinutes / 60;

  // Compute Next Free Window
  const nextWindowInfo = React.useMemo(() => {
    if (availabilities.length === 0) return null;

    const sorted = availabilities
      .map((win) => {
        const dayDiff = (win.dayOfWeek - todayDayOfWeek + 7) % 7;
        let diffMinutes = 0;
        let isToday = false;
        let isTomorrow = false;

        if (dayDiff === 0) {
          if (win.startMinutes >= currentMinutes) {
            diffMinutes = win.startMinutes - currentMinutes;
            isToday = true;
          } else {
            diffMinutes = 7 * 24 * 60 + (win.startMinutes - currentMinutes);
          }
        } else {
          isTomorrow = dayDiff === 1;
          diffMinutes = dayDiff * 24 * 60 + (win.startMinutes - currentMinutes);
        }

        return { win, diffMinutes, isToday, isTomorrow };
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
      dayLabel = getDayName(next.win.dayOfWeek, true);
    }

    return {
      dayLabel,
      time: next.win.startTime,
      win: next.win,
    };
  }, [availabilities, todayDayOfWeek, currentMinutes]);

  // Compute Grid Range: 7 AM to 10 PM default, expanded if needed
  const { minHour, maxHour } = React.useMemo(() => {
    let minH = 7;
    let maxH = 22; // 10 PM
    classes.forEach((c) => {
      const sH = Math.floor(c.startMinutes / 60);
      const eH = Math.ceil(c.endMinutes / 60);
      if (sH < minH) minH = Math.max(0, sH);
      if (eH > maxH) maxH = Math.min(24, eH);
    });
    availabilities.forEach((a) => {
      const sH = Math.floor(a.startMinutes / 60);
      const eH = Math.ceil(a.endMinutes / 60);
      if (sH < minH) minH = Math.max(0, sH);
      if (eH > maxH) maxH = Math.min(24, eH);
    });
    return { minHour: minH, maxHour: maxH };
  }, [classes, availabilities]);

  const hourRows: number[] = [];
  for (let h = minHour; h < maxHour; h++) {
    hourRows.push(h);
  }

  const gridColumns = showWeekend
    ? DAYS_ORDER_ACADEMIC
    : DAYS_ORDER_ACADEMIC.filter((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);

  const daysWithWindows = DAYS_ORDER_ACADEMIC.filter((d) =>
    availabilities.some((a) => a.dayOfWeek === d.dayOfWeek)
  );
  const emptyDaysNames = DAYS_ORDER_ACADEMIC.filter(
    (d) => !availabilities.some((a) => a.dayOfWeek === d.dayOfWeek)
  ).map((d) => d.shortName);

  return (
    <div className="w-full space-y-6">
      {/* Error Banner */}
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

      {/* 2. SUMMARY STRIP (3 compact tiles, display-font numbers) */}
      <div className="flex md:grid md:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2 md:pb-0 scrollbar-none">
        {/* Tile 1: Free hours per week */}
        <div className="min-w-[240px] sm:min-w-0 snap-start rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-4 sm:p-5 shadow-[3px_3px_0px_0px_#0F172A] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Free hours per week
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#F0FDF4] text-[#16A34A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
                <Clock className="size-3.5" />
              </div>
            </div>
            <div>
              <span className="font-display text-3xl sm:text-4xl font-black tracking-tight text-[#0F172A]">
                {formatHours(totalWeeklyHours)}
              </span>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Total weekly availability
              </p>
            </div>
          </div>
        </div>

        {/* Tile 2: Daily hour limit */}
        <div className="min-w-[240px] sm:min-w-0 snap-start rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-4 sm:p-5 shadow-[3px_3px_0px_0px_#0F172A] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Daily hour limit
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
                <ShieldCheck className="size-3.5" />
              </div>
            </div>
            <div>
              <span className="font-display text-3xl sm:text-4xl font-black tracking-tight text-[#0F172A]">
                {maxHours}h
              </span>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Burnout protection cap
              </p>
            </div>
          </div>
        </div>

        {/* Tile 3: Next free window */}
        <div className="min-w-[240px] sm:min-w-0 snap-start rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-4 sm:p-5 shadow-[3px_3px_0px_0px_#0F172A] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Next free window
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
                <Calendar className="size-3.5" />
              </div>
            </div>
            <div>
              {nextWindowInfo ? (
                <div>
                  <span className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A] block truncate">
                    {nextWindowInfo.dayLabel}, {nextWindowInfo.time}
                  </span>
                  <p className="text-xs text-slate-600 font-bold truncate mt-1">
                    {formatHours(
                      (nextWindowInfo.win.endMinutes -
                        nextWindowInfo.win.startMinutes) /
                        60
                    )}{" "}
                    window
                  </p>
                </div>
              ) : (
                <div>
                  <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#0F172A] block">
                    No free windows yet
                  </span>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Add free-time windows below
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. DAILY HOUR LIMIT CARD */}
      <MaxHoursCard
        initialMaxHours={initialMaxHours}
        onUpdated={(h) => {
          setMaxHours(h);
          onRefresh?.();
        }}
      />

      {/* EMPTY STATE (no free windows at all) */}
      {availabilities.length === 0 ? (
        <div className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-8 sm:p-12 text-center space-y-4 shadow-[3px_3px_0px_0px_#0F172A]">
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="font-display text-lg sm:text-xl font-bold text-[#0F172A]">
              No free windows yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              No free windows yet. Add the hours you&apos;re open to take VA tasks.
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              data-testid="availability-add-window"
              onClick={() => handleOpenAdd(1)}
              className="bg-[#0F172A] text-white font-bold border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none min-h-[40px] px-5 rounded-lg text-xs gap-2 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Add free window</span>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Controls Bar: View Toggle & Weekend Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#0F172A]">
                Weekly Availability Windows
              </h2>
              <p className="text-xs text-slate-500">
                Click any open hour to set free-time for client tasks.
              </p>
            </div>

            <div className="flex items-center gap-3">
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
                    const dayHasWindows = availabilities.some(
                      (a) => a.dayOfWeek === day.dayOfWeek
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
                          {dayHasWindows && (
                            <span
                              className={`size-1.5 rounded-full ${
                                isSelected ? "bg-white" : "bg-[#16A34A]"
                              }`}
                            />
                          )}
                        </div>
                        {isToday && (
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                              isSelected ? "text-slate-200" : "text-green-600"
                            }`}
                          >
                            Today
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Free Windows */}
                {(() => {
                  const dayWindows = availabilities.filter(
                    (a) => a.dayOfWeek === selectedMobileDay
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
                          {dayWindows.length}{" "}
                          {dayWindows.length === 1 ? "window" : "windows"}
                        </span>
                      </div>

                      {dayWindows.length === 0 ? (
                        <div className="py-6 text-center space-y-2">
                          <p className="text-xs text-slate-500">
                            No free windows scheduled for {dayInfo.name}.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAdd(selectedMobileDay)}
                            className="border-[1.5px] border-[#0F172A] text-xs font-bold text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] gap-1 cursor-pointer"
                          >
                            <Plus className="size-3.5" />
                            <span>Add window for {dayInfo.name}</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {dayWindows.map((win) => (
                            <div
                              key={win.id}
                              className="flex items-center justify-between gap-2 p-3 rounded-xl border-[1.5px] border-[#0F172A] border-l-4 border-l-[#16A34A] bg-[#F0FDF4] text-[#166534] shadow-[1.5px_1.5px_0px_0px_#0F172A]"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-sm text-[#0F172A] truncate block leading-snug">
                                  {win.startTime} – {win.endTime}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-800 mt-0.5">
                                  <Clock className="size-3 shrink-0" />
                                  <span>
                                    {formatHours(
                                      (win.endMinutes - win.startMinutes) / 60
                                    )}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  data-testid="availability-window-edit"
                                  aria-label={`Edit free window ${win.startTime} to ${win.endTime}`}
                                  onClick={() => handleOpenEdit(win)}
                                  className="size-10 rounded-lg border-[1.5px] border-[#0F172A] bg-white text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] hover:bg-[#FAF7F2] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  data-testid="availability-window-delete"
                                  aria-label={`Delete free window ${win.startTime} to ${win.endTime}`}
                                  onClick={() => handleConfirmDelete(win)}
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

                {/* Mobile Floating Add Window Button */}
                <Button
                  type="button"
                  data-testid="availability-add-window"
                  onClick={() => handleOpenAdd(selectedMobileDay)}
                  aria-label="Add free window"
                  className="fixed bottom-20 right-4 z-40 md:hidden flex items-center gap-2 rounded-full border-[1.5px] border-[#0F172A] bg-[#0F172A] text-white px-4 py-3 font-bold text-xs shadow-[3px_3px_0px_0px_#0F172A] hover:bg-slate-800 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>Add free window</span>
                </Button>
              </div>
            ) : null}
          </div>

          {/* 4. WEEK GRID in availability mode (Desktop default) */}
          {viewMode === "week" && (
            <div className="hidden md:block">
              <WeekTimetableGrid
                mode="availability"
                classes={classes}
                availabilities={availabilities}
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
                onSelectAvailability={(win) => setSelectedForDetails(win)}
              />
            </div>
          )}

          {/* LIST VIEW (when viewMode is "list") */}
          {viewMode === "list" && (
            <div className="space-y-4">
              {daysWithWindows.map((day) => {
                const dayWindows = availabilities.filter(
                  (a) => a.dayOfWeek === day.dayOfWeek
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
                        {dayWindows.length}{" "}
                        {dayWindows.length === 1 ? "window" : "windows"}
                      </span>
                    </div>

                    {/* Window Rows */}
                    <div className="space-y-2.5">
                      {dayWindows.map((win) => (
                        <div
                          key={win.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border-[1.5px] border-[#0F172A] border-l-4 border-l-[#16A34A] bg-[#F0FDF4] text-[#166534] shadow-[1.5px_1.5px_0px_0px_#0F172A]"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-sm text-[#0F172A] block leading-snug">
                              {win.startTime} – {win.endTime}
                            </span>
                            <div className="flex items-center gap-2 text-xs font-semibold text-green-800 mt-1">
                              <Clock className="size-3.5 shrink-0" />
                              <span>
                                {formatHours(
                                  (win.endMinutes - win.startMinutes) / 60
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              data-testid="availability-window-edit"
                              aria-label={`Edit free window ${win.startTime} to ${win.endTime}`}
                              onClick={() => handleOpenEdit(win)}
                              className="size-10 rounded-lg border-[1.5px] border-[#0F172A] bg-white text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] hover:bg-[#FAF7F2] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              data-testid="availability-window-delete"
                              aria-label={`Delete free window ${win.startTime} to ${win.endTime}`}
                              onClick={() => handleConfirmDelete(win)}
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

              {/* Collapsed single line for days without windows */}
              {emptyDaysNames.length > 0 && emptyDaysNames.length < 7 && (
                <div className="rounded-xl border border-dashed border-[#E5DFD5] bg-[#FAF7F2]/60 px-4 py-3 text-xs text-slate-500 font-medium text-center sm:text-left">
                  No free windows on {emptyDaysNames.join(", ")}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 5. BLOCKED DATES SECTION */}
      <BlockedDatesSection
        initialBlockedDates={initialBlockedDates}
        onRefresh={onRefresh}
      />

      {/* Add / Edit Availability Dialog */}
      <AvailabilityDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => {
          onRefresh?.();
        }}
        initialAvailability={editingWindow}
        defaultDayOfWeek={prefill?.dayOfWeek ?? 1}
        defaultStartTime={prefill?.startTime}
      />

      {/* Details Dialog for clicked free window in week grid */}
      <AvailabilityDetailsDialog
        isOpen={Boolean(selectedForDetails)}
        onClose={() => setSelectedForDetails(null)}
        windowItem={selectedForDetails}
        onEdit={handleOpenEdit}
        onDelete={handleConfirmDelete}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteAvailabilityDialog
        isOpen={Boolean(windowToDelete)}
        onClose={() => setWindowToDelete(null)}
        onConfirm={executeDelete}
        windowItem={windowToDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
