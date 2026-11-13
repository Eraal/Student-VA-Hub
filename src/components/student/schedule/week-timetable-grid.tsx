"use client";

import * as React from "react";
import { FormattedClass, FormattedAvailability } from "@/lib/services/schedule-service";
import { DAYS_ORDER_ACADEMIC } from "@/lib/schedule-utils";
import { formatHours } from "@/lib/format";
import { Clock, Plus, AlertTriangle } from "lucide-react";

export type TimetableMode = "classes" | "availability";

export interface WeekTimetableGridProps {
  mode: TimetableMode;
  classes: FormattedClass[];
  availabilities?: FormattedAvailability[];
  showWeekend: boolean;
  minHour: number;
  maxHour: number;
  hourRows: number[];
  gridColumns: typeof DAYS_ORDER_ACADEMIC;
  todayDayOfWeek: number;
  currentMinutes: number;
  onEmptyCellClick: (dayOfWeek: number, startTime: string) => void;
  onSelectClass?: (cls: FormattedClass) => void;
  onSelectAvailability?: (win: FormattedAvailability) => void;
}

const HOUR_HEIGHT = 56; // 56px per hour row

export function WeekTimetableGrid({
  mode,
  classes,
  availabilities = [],
  minHour,
  maxHour,
  hourRows,
  gridColumns,
  todayDayOfWeek,
  currentMinutes,
  onEmptyCellClick,
  onSelectClass,
  onSelectAvailability,
}: WeekTimetableGridProps) {
  const formatHourLabel = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH} ${period}`;
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] overflow-hidden">
        {/* Column Headers */}
        <div
          className="grid bg-[#FAF7F2] border-b-[1.5px] border-[#0F172A]"
          style={{
            gridTemplateColumns: `64px repeat(${gridColumns.length}, minmax(0, 1fr))`,
          }}
        >
          {/* Top-left corner time icon */}
          <div className="p-3 flex items-center justify-center text-slate-400 border-r border-[#E5DFD5]">
            <Clock className="size-4" />
          </div>

          {/* Day column headers */}
          {gridColumns.map((day) => {
            const isToday = todayDayOfWeek === day.dayOfWeek;

            return (
              <div
                key={day.dayOfWeek}
                data-testid="schedule-day-column"
                className={`p-3 text-center border-l border-[#E5DFD5] first:border-l-0 ${
                  isToday ? "bg-white shadow-xs font-bold" : ""
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className="font-display text-xs lg:text-sm font-bold text-[#0F172A]">
                    {day.name}
                  </span>
                  {isToday && (
                    <span className="rounded-full bg-[#0F172A] text-white px-2 py-0.5 text-[10px] font-bold">
                      Today
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grid Body */}
        <div
          className="grid relative overflow-hidden"
          style={{
            gridTemplateColumns: `64px repeat(${gridColumns.length}, minmax(0, 1fr))`,
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

          {/* Day Columns */}
          {gridColumns.map((day) => {
            const isToday = todayDayOfWeek === day.dayOfWeek;
            const dayClasses = classes.filter(
              (c) => c.dayOfWeek === day.dayOfWeek
            );
            const dayWindows = availabilities.filter(
              (a) => a.dayOfWeek === day.dayOfWeek
            );

            // Check if Manila now line should be drawn in this column
            const isNowWithinHours =
              currentMinutes >= minHour * 60 && currentMinutes <= maxHour * 60;
            const nowTopPx =
              ((currentMinutes - minHour * 60) / 60) * HOUR_HEIGHT;

            return (
              <div
                key={day.dayOfWeek}
                className={`relative border-l border-[#E5DFD5] ${
                  isToday ? "bg-[#FAF7F2]/40" : "bg-white"
                }`}
              >
                {/* Background Hour Rows with Clickable Empty Cells */}
                {hourRows.map((h) => {
                  const slotStartTime = `${String(h).padStart(2, "0")}:00`;

                  return (
                    <div
                      key={h}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      className="border-b border-[#E5DFD5] relative group"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onEmptyCellClick(day.dayOfWeek, slotStartTime)
                        }
                        aria-label={`Add slot on ${day.name} at ${formatHourLabel(h)}`}
                        className="w-full h-full flex items-center justify-center text-transparent hover:text-slate-400 focus-visible:text-[#0F172A] focus-visible:bg-[#EFF6FF]/60 transition-colors cursor-pointer outline-none"
                      >
                        <Plus className="size-3.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  );
                })}

                {/* "Now" Marker Line across Today's Column */}
                {isToday && isNowWithinHours && (
                  <div
                    style={{ top: `${nowTopPx}px` }}
                    className="absolute left-0 right-0 z-20 pointer-events-none flex items-center -translate-y-1/2"
                    aria-label="Current time line"
                  >
                    <div className="size-2 rounded-full bg-[#DC2626] -ml-1 ring-2 ring-white" />
                    <div className="h-[2px] w-full bg-[#DC2626]" />
                  </div>
                )}

                {/* 1. Classes mode: Interactive Class Blocks */}
                {mode === "classes" &&
                  dayClasses.map((cls) => {
                    const topPx =
                      ((cls.startMinutes - minHour * 60) / 60) * HOUR_HEIGHT;
                    const heightPx = Math.max(
                      40,
                      ((cls.endMinutes - cls.startMinutes) / 60) * HOUR_HEIGHT -
                        4
                    );
                    const isPast = isToday && cls.endMinutes <= currentMinutes;

                    return (
                      <button
                        key={cls.id}
                        type="button"
                        data-testid="schedule-class-block"
                        data-day={cls.dayOfWeek}
                        data-start={cls.startTime}
                        onClick={() => onSelectClass?.(cls)}
                        style={{
                          top: `${topPx + 2}px`,
                          height: `${heightPx}px`,
                        }}
                        className={`absolute left-1 right-1 rounded-lg border-[1.5px] border-[#0F172A] border-l-4 border-l-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] p-1.5 shadow-[2px_2px_0px_0px_#0F172A] hover:shadow-[3px_3px_0px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer text-left overflow-hidden z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] ${
                          isPast ? "opacity-60 hover:opacity-100" : ""
                        }`}
                      >
                        <span className="font-bold text-xs text-[#0F172A] truncate block leading-tight">
                          {cls.subject}
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-blue-800 truncate block leading-tight mt-0.5">
                          {cls.startTime} – {cls.endTime}
                        </span>
                      </button>
                    );
                  })}

                {/* 2. Availability mode: Faint Read-Only Class Blocks */}
                {mode === "availability" &&
                  dayClasses.map((cls) => {
                    const topPx =
                      ((cls.startMinutes - minHour * 60) / 60) * HOUR_HEIGHT;
                    const heightPx = Math.max(
                      36,
                      ((cls.endMinutes - cls.startMinutes) / 60) * HOUR_HEIGHT -
                        4
                    );

                    return (
                      <div
                        key={`bg-class-${cls.id}`}
                        style={{
                          top: `${topPx + 2}px`,
                          height: `${heightPx}px`,
                        }}
                        className="absolute left-1 right-1 rounded-lg border border-[#2563EB]/40 border-l-4 border-l-[#2563EB]/60 bg-[#EFF6FF] p-1.5 opacity-40 pointer-events-none text-left overflow-hidden z-0"
                      >
                        <span className="font-bold text-xs text-[#1E40AF] truncate block leading-tight">
                          Class
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-blue-700 truncate block leading-tight mt-0.5">
                          {cls.startTime} – {cls.endTime}
                        </span>
                      </div>
                    );
                  })}

                {/* 3. Availability mode: Interactive Free Window Blocks */}
                {mode === "availability" &&
                  dayWindows.map((win) => {
                    const topPx =
                      ((win.startMinutes - minHour * 60) / 60) * HOUR_HEIGHT;
                    const heightPx = Math.max(
                      40,
                      ((win.endMinutes - win.startMinutes) / 60) * HOUR_HEIGHT -
                        4
                    );
                    const durationStr = formatHours(
                      (win.endMinutes - win.startMinutes) / 60
                    );

                    // Check if window overlaps any scheduled class on this day
                    const hasClassOverlap = dayClasses.some(
                      (c) =>
                        Math.max(c.startMinutes, win.startMinutes) <
                        Math.min(c.endMinutes, win.endMinutes)
                    );

                    return (
                      <button
                        key={win.id}
                        type="button"
                        data-testid="availability-window-block"
                        data-day={win.dayOfWeek}
                        data-start={win.startTime}
                        onClick={() => onSelectAvailability?.(win)}
                        style={{
                          top: `${topPx + 2}px`,
                          height: `${heightPx}px`,
                        }}
                        className="absolute left-1 right-1 rounded-lg border-[1.5px] border-[#0F172A] border-l-4 border-l-[#16A34A] bg-[#F0FDF4] text-[#166534] p-1.5 shadow-[2px_2px_0px_0px_#0F172A] hover:shadow-[3px_3px_0px_0px_#0F172A] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer text-left overflow-hidden z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-xs text-[#0F172A] truncate block leading-tight">
                            {win.startTime} – {win.endTime}
                          </span>
                          {hasClassOverlap && (
                            <span
                              title="Overlaps scheduled class"
                              className="text-[#D97706] shrink-0"
                            >
                              <AlertTriangle className="size-3" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-green-800 truncate block leading-tight mt-0.5">
                          {durationStr}
                        </span>
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & Philippine Time Caption below grid */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          {mode === "classes" ? (
            <>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="size-3 rounded-sm border border-[#2563EB] bg-[#EFF6FF]" />
                <span>Class</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="size-3 rounded-sm border border-[#16A34A] bg-[#F0FDF4]" />
                <span>Free window</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="size-3 rounded-sm border border-[#DC2626] bg-[#FEF2F2]" />
                <span>Conflict</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="size-3 rounded-sm border border-[#16A34A] bg-[#F0FDF4]" />
                <span>Free window</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="size-3 rounded-sm border border-[#2563EB] bg-[#EFF6FF]" />
                <span>Class</span>
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Times shown in Philippine time
        </p>
      </div>
    </div>
  );
}

