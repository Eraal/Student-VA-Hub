"use client";

import * as React from "react";
import { FormattedAvailability, FormattedBlockedDate } from "@/lib/services/schedule-service";
import { DAYS_ORDER_ACADEMIC } from "@/lib/schedule-utils";
import { deleteAvailabilityAction } from "@/lib/actions/schedule";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MaxHoursCard } from "./max-hours-card";
import { AvailabilityDialog } from "./availability-dialog";
import { BlockedDatesSection } from "./blocked-dates-section";
import {
  Briefcase,
  Plus,
  Trash2,
  Clock,
  Loader2,
  CalendarCheck,
} from "lucide-react";

interface AvailabilityTabProps {
  initialAvailabilities: FormattedAvailability[];
  initialMaxHours: number;
  initialBlockedDates: FormattedBlockedDate[];
  onRefresh?: () => void;
}

export function AvailabilityTab({
  initialAvailabilities,
  initialMaxHours,
  initialBlockedDates,
  onRefresh,
}: AvailabilityTabProps) {
  const [availabilities, setAvailabilities] = React.useState<FormattedAvailability[]>(
    initialAvailabilities
  );
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedDayForAdd, setSelectedDayForAdd] = React.useState<number>(1);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setAvailabilities(initialAvailabilities);
  }, [initialAvailabilities]);

  const handleOpenAdd = (dayOfWeek = 1) => {
    setSelectedDayForAdd(dayOfWeek);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this availability window?")) return;
    setDeletingId(id);
    try {
      const res = await deleteAvailabilityAction(id);
      if (res.success) {
        setAvailabilities((prev) => prev.filter((a) => a.id !== id));
        if (onRefresh) onRefresh();
      } else {
        alert(res.error ?? "Failed to delete availability.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting availability.");
    } finally {
      setDeletingId(null);
    }
  };

  const totalWindowsCount = availabilities.length;

  return (
    <div className="space-y-6">
      {/* 1. Daily Capacity Limit */}
      <MaxHoursCard
        initialMaxHours={initialMaxHours}
        onUpdated={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* 2. Recurring Availability Windows */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text)]">
              Weekly Availability Windows
            </h2>
            <p className="text-[11px] text-[var(--color-muted)]">
              Green blocks mark the hours you are open to take VA tasks. Tasks assigned outside these windows trigger a warning.
            </p>
          </div>
          <Button
            onClick={() => handleOpenAdd(1)}
            size="sm"
            className="gap-1.5 bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-xs cursor-pointer h-8"
          >
            <Plus className="size-3.5" />
            <span>Add Window</span>
          </Button>
        </div>

        {totalWindowsCount === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No availability windows set"
            description="Add the recurring slots when you are free to do virtual assistance work (e.g., evenings or weekends)."
            action={
              <Button
                onClick={() => handleOpenAdd(1)}
                size="sm"
                className="gap-1.5 bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-xs cursor-pointer h-8"
              >
                <Plus className="size-3.5" />
                <span>Add availability window</span>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {DAYS_ORDER_ACADEMIC.map((day) => {
              const dayWindows = availabilities.filter((a) => a.dayOfWeek === day.dayOfWeek);

              return (
                <div
                  key={day.dayOfWeek}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2"
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--color-text)]">
                        {day.name}
                      </span>
                      <span className="rounded bg-[var(--color-bg)] border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)] font-medium">
                        {dayWindows.length} {dayWindows.length === 1 ? "window" : "windows"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenAdd(day.dayOfWeek)}
                      className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
                    >
                      <Plus className="size-3" />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Day Windows */}
                  {dayWindows.length === 0 ? (
                    <p className="text-[11px] text-[var(--color-muted)] italic py-1">
                      Not available on {day.name}.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {dayWindows.map((win) => (
                        <div
                          key={win.id}
                          className="flex items-center justify-between rounded-md border border-green-200 bg-[var(--color-work-bg)] p-2.5 text-xs text-[var(--color-work)]"
                        >
                          <div className="space-y-0.5 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 font-semibold text-[var(--color-text)]">
                              <Briefcase className="size-3.5 shrink-0 text-[var(--color-work)]" />
                              <span>Available for VA Work</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-[var(--color-work)] font-medium">
                              <Clock className="size-3 shrink-0" />
                              <span>
                                {win.startTime} – {win.endTime} ({win.duration})
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDelete(win.id)}
                            disabled={deletingId === win.id}
                            title="Remove window"
                            className="rounded p-1 text-[var(--color-conflict)] hover:bg-white/60 transition-colors cursor-pointer shrink-0"
                          >
                            {deletingId === win.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Blocked Dates */}
      <BlockedDatesSection
        initialBlockedDates={initialBlockedDates}
        onRefresh={onRefresh}
      />

      {/* Dialog */}
      <AvailabilityDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
        defaultDayOfWeek={selectedDayForAdd}
      />
    </div>
  );
}
