"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { StudentScheduleData } from "@/lib/services/schedule-service";
import { ClassesTab } from "./classes-tab";
import { AvailabilityTab } from "./availability-tab";
import { CalendarDays, Clock, ShieldCheck } from "lucide-react";

interface ScheduleViewProps {
  initialData: StudentScheduleData;
}

export function ScheduleView({ initialData }: ScheduleViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"classes" | "availability">("classes");

  const handleRefresh = () => {
    router.refresh();
  };

  const totalClasses = initialData.classes.length;
  const totalWindows = initialData.availabilities.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Class Schedule & Availability
          </h1>
          <p className="text-xs text-[var(--color-muted)]">
            Your class schedule is the source of truth. Manage classes and free-time windows.
          </p>
        </div>

        {/* Legend / Status badges */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 rounded bg-[var(--color-class-bg)] text-[var(--color-class)] px-2 py-0.5 font-medium border border-blue-200">
            <span className="size-1.5 rounded-full bg-[var(--color-class)]" />
            <span>Class (Hard Block)</span>
          </span>
          <span className="flex items-center gap-1 rounded bg-[var(--color-work-bg)] text-[var(--color-work)] px-2 py-0.5 font-medium border border-green-200">
            <span className="size-1.5 rounded-full bg-[var(--color-work)]" />
            <span>VA Window</span>
          </span>
          <span className="flex items-center gap-1 rounded bg-[var(--color-surface)] text-[var(--color-muted)] px-2 py-0.5 border border-[var(--color-border)]">
            <Clock className="size-3" />
            <span>UTC+8 (Manila)</span>
          </span>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-[var(--color-border)]">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("classes")}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === "classes"
                ? "border-[var(--color-accent)] text-[var(--color-text)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <CalendarDays className="size-3.5" />
            <span>Classes</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "classes"
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                  : "bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]"
              }`}
            >
              {totalClasses}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("availability")}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === "availability"
                ? "border-[var(--color-accent)] text-[var(--color-text)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <ShieldCheck className="size-3.5" />
            <span>Availability & Capacity</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "availability"
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                  : "bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]"
              }`}
            >
              {totalWindows}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "classes" ? (
        <ClassesTab
          initialClasses={initialData.classes}
          onRefresh={handleRefresh}
        />
      ) : (
        <AvailabilityTab
          initialAvailabilities={initialData.availabilities}
          initialMaxHours={initialData.maxHoursPerDay}
          initialBlockedDates={initialData.blockedDates}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}

