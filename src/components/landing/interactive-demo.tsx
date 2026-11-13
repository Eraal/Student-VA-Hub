"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Clock,
  RotateCcw,
  Calendar,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri";

interface TimeSlot {
  id: string;
  timeLabel: string;
  type: "class" | "available" | "outside" | "busy";
  title: string;
  hours: number;
}

const SCHEDULE_DATA: Record<DayKey, TimeSlot[]> = {
  Mon: [
    { id: "mon-1", timeLabel: "8:00 AM – 10:00 AM", type: "outside", title: "Outside free hours", hours: 2 },
    { id: "mon-2", timeLabel: "10:00 AM – 12:00 PM", type: "class", title: "In class", hours: 2 },
    { id: "mon-3", timeLabel: "1:00 PM – 2:30 PM", type: "class", title: "In class", hours: 1.5 },
    { id: "mon-5", timeLabel: "6:00 PM – 9:00 PM", type: "available", title: "Free window", hours: 3 },
  ],
  Tue: [
    { id: "tue-1", timeLabel: "8:30 AM – 11:30 AM", type: "class", title: "In class", hours: 3 },
    { id: "tue-2", timeLabel: "1:00 PM – 4:00 PM", type: "available", title: "Free window", hours: 3 },
    { id: "tue-3", timeLabel: "4:00 PM – 6:00 PM", type: "available", title: "Free window", hours: 2 },
    { id: "tue-4", timeLabel: "6:00 PM – 8:00 PM", type: "available", title: "Free window", hours: 2 },
  ],
  Wed: [
    { id: "wed-1", timeLabel: "9:00 AM – 11:00 AM", type: "available", title: "Free window", hours: 2 },
    { id: "wed-2", timeLabel: "1:00 PM – 2:30 PM", type: "class", title: "In class", hours: 1.5 },
    { id: "wed-3", timeLabel: "3:00 PM – 5:30 PM", type: "class", title: "In class", hours: 2.5 },
    { id: "wed-4", timeLabel: "6:00 PM – 9:00 PM", type: "available", title: "Free window", hours: 3 },
  ],
  Thu: [
    { id: "thu-1", timeLabel: "8:00 AM – 12:00 PM", type: "busy", title: "Booked task (3h 30m)", hours: 3.5 },
    { id: "thu-2", timeLabel: "1:00 PM – 3:00 PM", type: "available", title: "Free window", hours: 2 },
    { id: "thu-3", timeLabel: "4:00 PM – 7:00 PM", type: "available", title: "Free window", hours: 3 },
  ],
  Fri: [
    { id: "fri-1", timeLabel: "8:00 AM – 11:00 AM", type: "class", title: "In class", hours: 3 },
    { id: "fri-2", timeLabel: "1:00 PM – 5:00 PM", type: "available", title: "Free window", hours: 4 },
    { id: "fri-3", timeLabel: "6:00 PM – 8:00 PM", type: "available", title: "Free window", hours: 2 },
  ],
};

interface DemoResult {
  status: "idle" | "conflict" | "warning" | "approved";
  day: DayKey;
  timeSlot: string;
  headline: string;
  detail: string;
  badgeText: string;
}

export function InteractiveDemo() {
  const [selectedDay, setSelectedDay] = React.useState<DayKey>("Mon");
  const [activeSlotId, setActiveSlotId] = React.useState<string | null>(null);
  const [demoResult, setDemoResult] = React.useState<DemoResult>({
    status: "conflict",
    day: "Mon",
    timeSlot: "1:00 PM – 2:30 PM",
    headline: "Conflict! Juan has class 1:00 PM – 2:30 PM",
    detail: "The Conflict Detector blocks tasks during class time. Subject names are never shown to clients.",
    badgeText: "This task can't be submitted",
  });

  // Evaluate conflict logic client-side
  const evaluateSlot = (day: DayKey, slot: TimeSlot) => {
    setActiveSlotId(slot.id);
    setSelectedDay(day);

    if (slot.type === "class") {
      setDemoResult({
        status: "conflict",
        day,
        timeSlot: slot.timeLabel,
        headline: `Conflict! Juan has class ${slot.timeLabel}`,
        detail: "The Conflict Detector blocks tasks during class time. Subject names are never shown to clients.",
        badgeText: "This task can't be submitted",
      });
    } else if (slot.type === "outside") {
      setDemoResult({
        status: "warning",
        day,
        timeSlot: slot.timeLabel,
        headline: "Warning: Outside free hours",
        detail: "This time is outside Juan's free hours. You can still send it and he decides.",
        badgeText: "Outside free hours",
      });
    } else if (day === "Thu" || slot.type === "busy") {
      setDemoResult({
        status: "warning",
        day,
        timeSlot: slot.timeLabel,
        headline: "Warning: Exceeds daily limit (5h 30m vs 4h limit)",
        detail: "This task exceeds Juan's 4h daily limit. You can still send it and he decides.",
        badgeText: "Exceeds daily limit",
      });
    } else {
      setDemoResult({
        status: "approved",
        day,
        timeSlot: slot.timeLabel,
        headline: "Available slot approved",
        detail: "No class conflicts and within the daily hour limit. Safe to schedule tasks.",
        badgeText: "No conflict",
      });
    }
  };

  const resetSimulation = () => {
    setActiveSlotId(null);
    setDemoResult({
      status: "idle",
      day: "Mon",
      timeSlot: "Select a slot on the schedule",
      headline: "Tap a time slot to try assigning a task.",
      detail: "Tap a time slot to try assigning a task.",
      badgeText: "Demo standby",
    });
  };

  return (
    <div
      className="relative rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-4 sm:p-6 shadow-[4px_4px_0px_0px_#0F172A] transition-all"
      aria-label="Interactive schedule conflict detector demo"
    >
      {/* Header bar / window styling */}
      <div className="flex items-center justify-between border-b border-[#E5DFD5] pb-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-3 rounded-full border border-[#0F172A] bg-[#DC2626]" />
            <span className="size-3 rounded-full border border-[#0F172A] bg-[#D97706]" />
            <span className="size-3 rounded-full border border-[#0F172A] bg-[#16A34A]" />
          </div>
          <span className="ml-2 text-xs font-bold tracking-tight text-[#0F172A]">
            Client view · Demo
          </span>
        </div>

        <button
          type="button"
          onClick={resetSimulation}
          className="flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-[#0F172A] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0F172A] rounded px-1.5 py-0.5"
          title="Reset simulator"
        >
          <RotateCcw className="size-3" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Preset Action Chips: One-tap testing */}
      <div className="pt-4">
        <p className="text-xs font-semibold tracking-wider text-slate-700 mb-2">
          Try a scenario:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() =>
              evaluateSlot("Mon", {
                id: "mon-3",
                timeLabel: "1:00 PM – 2:30 PM",
                type: "class",
                title: "In class",
                hours: 1.5,
              })
            }
            className={`flex items-center gap-2 rounded-lg border-[1.5px] p-2.5 text-left text-xs font-medium transition-all cursor-pointer ${
              demoResult.status === "conflict"
                ? "border-[#DC2626] bg-[#FEF2F2] text-[#991B1B] shadow-[2px_2px_0px_0px_#DC2626]"
                : "border-[#0F172A]/20 bg-[#FAF7F2] text-[#0F172A] hover:border-[#DC2626] hover:bg-[#FEF2F2]/50"
            }`}
          >
            <div className="size-2 rounded-full bg-[#DC2626] shrink-0" />
            <div>
              <span className="block font-bold">Task during class</span>
              <span className="text-xs text-slate-600">Mon 1:00 PM</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              evaluateSlot("Thu", {
                id: "thu-3",
                timeLabel: "4:00 PM – 7:00 PM",
                type: "available",
                title: "Free window",
                hours: 3,
              })
            }
            className={`flex items-center gap-2 rounded-lg border-[1.5px] p-2.5 text-left text-xs font-medium transition-all cursor-pointer ${
              demoResult.status === "warning"
                ? "border-[#D97706] bg-[#FFFBEB] text-[#92400E] shadow-[2px_2px_0px_0px_#D97706]"
                : "border-[#0F172A]/20 bg-[#FAF7F2] text-[#0F172A] hover:border-[#D97706] hover:bg-[#FFFBEB]/50"
            }`}
          >
            <div className="size-2 rounded-full bg-[#D97706] shrink-0" />
            <div>
              <span className="block font-bold">Task over the daily limit</span>
              <span className="text-xs text-slate-600">Thu 3h 30m + 2h</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              evaluateSlot("Mon", {
                id: "mon-5",
                timeLabel: "6:00 PM – 9:00 PM",
                type: "available",
                title: "Free window",
                hours: 3,
              })
            }
            className={`flex items-center gap-2 rounded-lg border-[1.5px] p-2.5 text-left text-xs font-medium transition-all cursor-pointer ${
              demoResult.status === "approved"
                ? "border-[#16A34A] bg-[#F0FDF4] text-[#166534] shadow-[2px_2px_0px_0px_#16A34A]"
                : "border-[#0F172A]/20 bg-[#FAF7F2] text-[#0F172A] hover:border-[#16A34A] hover:bg-[#F0FDF4]/50"
            }`}
          >
            <div className="size-2 rounded-full bg-[#16A34A] shrink-0" />
            <div>
              <span className="block font-bold">Task in a free window</span>
              <span className="text-xs text-slate-600">Mon 6:00 PM</span>
            </div>
          </button>
        </div>
      </div>

      {/* Dynamic Feedback Banner */}
      <div className="mt-4">
        {demoResult.status === "conflict" && (
          <div
            className="rounded-xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-4 text-[#991B1B] shadow-[2px_2px_0px_0px_#DC2626] animate-in fade-in zoom-in-95 duration-200"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-7 items-center justify-center rounded-md bg-[#DC2626] text-white shrink-0 mt-0.5">
                <AlertCircle className="size-4" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-sm text-[#991B1B]">
                    {demoResult.headline}
                  </span>
                  <Badge className="bg-[#DC2626] text-white hover:bg-[#B91C1C] text-xs font-bold">
                    {demoResult.badgeText}
                  </Badge>
                </div>
                <p className="text-sm text-red-900 leading-relaxed font-normal">
                  {demoResult.detail}
                </p>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-red-800 pt-1">
                  <Lock className="size-3.5" />
                  <span>Subject names are never shown to clients.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {demoResult.status === "warning" && (
          <div
            className="rounded-xl border-[1.5px] border-[#D97706] bg-[#FFFBEB] p-4 text-[#92400E] shadow-[2px_2px_0px_0px_#D97706] animate-in fade-in zoom-in-95 duration-200"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-7 items-center justify-center rounded-md bg-[#D97706] text-white shrink-0 mt-0.5">
                <AlertTriangle className="size-4" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-sm text-[#92400E]">
                    {demoResult.headline}
                  </span>
                  <Badge className="bg-[#D97706] text-white hover:bg-[#B45309] text-xs font-bold">
                    {demoResult.badgeText}
                  </Badge>
                </div>
                <p className="text-sm text-amber-900 leading-relaxed font-normal">
                  {demoResult.detail}
                </p>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 pt-1">
                  <ShieldCheck className="size-3.5" />
                  <span>Warns when outside hours or exceeding daily limits.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {demoResult.status === "approved" && (
          <div
            className="rounded-xl border-[1.5px] border-[#16A34A] bg-[#F0FDF4] p-4 text-[#166534] shadow-[2px_2px_0px_0px_#16A34A] animate-in fade-in zoom-in-95 duration-200"
            role="status"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-7 items-center justify-center rounded-md bg-[#16A34A] text-white shrink-0 mt-0.5">
                <CheckCircle2 className="size-4" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-sm text-[#166534]">
                    {demoResult.headline}
                  </span>
                  <Badge className="bg-[#16A34A] text-white hover:bg-[#15803D] text-xs font-bold">
                    {demoResult.badgeText}
                  </Badge>
                </div>
                <p className="text-sm text-green-900 leading-relaxed font-normal">
                  {demoResult.detail}
                </p>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-800 pt-1">
                  <Clock className="size-3.5" />
                  <span>Time: {demoResult.timeSlot} &bull; Within student&apos;s free window.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {demoResult.status === "idle" && (
          <div className="rounded-xl border border-dashed border-[#0F172A]/30 bg-[#FAF7F2] p-3.5 text-center text-xs font-medium text-slate-700">
            Tap a time slot to try assigning a task.
          </div>
        )}
      </div>

      {/* Mini Weekly Schedule Grid (Centerpiece Mon-Fri 8 AM – 9 PM) */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-slate-700" />
            <span className="text-xs font-bold text-[#0F172A]">
              Juan&apos;s week (Mon–Fri, 8 AM – 9 PM)
            </span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded bg-[#2563EB]" />
              Class
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded bg-[#16A34A]" />
              Work
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded bg-[#DC2626]" />
              Conflict
            </span>
          </div>
        </div>

        {/* Day Selector Tabs */}
        <div className="flex rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-1 shadow-[2px_2px_0px_0px_#0F172A]">
          {(["Mon", "Tue", "Wed", "Thu", "Fri"] as DayKey[]).map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedDay === day
                  ? "bg-[#0F172A] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Schedule Slots for Selected Day */}
        <div className="space-y-2 pt-1">
          {SCHEDULE_DATA[selectedDay].map((slot) => {
            const isSelected = activeSlotId === slot.id;
            const isClass = slot.type === "class";
            const isAvailable = slot.type === "available";
            const isOutside = slot.type === "outside";
            const isBusy = slot.type === "busy";

            let itemColorClasses =
              "border-[#E5DFD5] bg-white text-slate-700 hover:border-[#0F172A]/40";
            if (isClass) {
              itemColorClasses =
                "border-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] font-semibold";
            } else if (isAvailable) {
              itemColorClasses =
                "border-[#16A34A] bg-[#F0FDF4] text-[#166534] font-semibold";
            } else if (isBusy) {
              itemColorClasses =
                "border-[#D97706] bg-[#FFFBEB] text-[#92400E] font-semibold";
            } else if (isOutside) {
              itemColorClasses =
                "border-[#E5DFD5] bg-white text-slate-700 hover:border-[#0F172A]/40";
            }

            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => evaluateSlot(selectedDay, slot)}
                className={`w-full flex items-center justify-between rounded-xl border-[1.5px] p-3 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] ${itemColorClasses} ${
                  isSelected
                    ? "ring-2 ring-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]"
                    : "hover:translate-x-0.5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-8 items-center justify-center rounded-lg text-white shrink-0 ${
                      isClass
                        ? "bg-[#2563EB]"
                        : isAvailable
                          ? "bg-[#16A34A]"
                          : isBusy
                            ? "bg-[#D97706]"
                            : "bg-slate-400"
                    }`}
                  >
                    {isClass ? (
                      <Lock className="size-4" />
                    ) : isAvailable ? (
                      <CheckCircle2 className="size-4" />
                    ) : isBusy ? (
                      <AlertTriangle className="size-4" />
                    ) : (
                      <Clock className="size-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{slot.timeLabel}</span>
                      {isAvailable && (
                        <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-bold text-green-800">
                          Free window
                        </span>
                      )}
                      {isOutside && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-700">
                          Outside free hours
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${isClass ? "text-[#1E40AF] font-medium" : "text-slate-600"}`}>
                      {slot.title}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                    Assign here <ChevronRight className="size-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
