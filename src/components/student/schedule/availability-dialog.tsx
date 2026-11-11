"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DAYS_ORDER_ACADEMIC, timeStringToMinutes, minutesToDurationString } from "@/lib/schedule-utils";
import { addAvailabilityAction } from "@/lib/actions/schedule";
import { X, Loader2, AlertCircle, Briefcase } from "lucide-react";

interface AvailabilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDayOfWeek?: number;
}

export function AvailabilityDialog({
  isOpen,
  onClose,
  onSuccess,
  defaultDayOfWeek = 1,
}: AvailabilityDialogProps) {
  const [dayOfWeek, setDayOfWeek] = React.useState<number>(defaultDayOfWeek);
  const [startTime, setStartTime] = React.useState("18:00");
  const [endTime, setEndTime] = React.useState("21:00");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      setDayOfWeek(defaultDayOfWeek);
      setStartTime("18:00");
      setEndTime("21:00");
      setServerError(null);
      setFieldErrors({});
    }
  }, [isOpen, defaultDayOfWeek]);

  if (!isOpen) return null;

  let durationPreview = "";
  try {
    const s = timeStringToMinutes(startTime);
    const e = timeStringToMinutes(endTime);
    if (e > s) {
      durationPreview = minutesToDurationString(e - s);
    }
  } catch {
    durationPreview = "";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const res = await addAvailabilityAction({
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
      });

      if (!res.success) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setServerError(res.error ?? "Failed to save availability window.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setServerError("An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-work-bg)] text-[var(--color-work)]">
              <Briefcase className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Add Availability Window
              </h2>
              <p className="text-[11px] text-[var(--color-muted)]">
                Recurring free-time slots when you can accept VA tasks.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-text)] cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {serverError && (
            <div className="flex items-start gap-2 rounded-md border border-[var(--color-conflict)] bg-[var(--color-conflict-bg)] p-2.5 text-xs text-[var(--color-conflict)]">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Day of Week */}
          <div className="space-y-1">
            <Label htmlFor="avail-day" className="text-xs font-medium text-[var(--color-text)]">
              Day of Week
            </Label>
            <select
              id="avail-day"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              disabled={isSubmitting}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
            >
              {DAYS_ORDER_ACADEMIC.map((day) => (
                <option key={day.dayOfWeek} value={day.dayOfWeek}>
                  {day.name}
                </option>
              ))}
            </select>
            {fieldErrors.dayOfWeek && (
              <p className="text-[11px] text-[var(--color-conflict)]">{fieldErrors.dayOfWeek}</p>
            )}
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="avail-start" className="text-xs font-medium text-[var(--color-text)]">
                Start Time
              </Label>
              <Input
                id="avail-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isSubmitting}
                className="bg-[var(--color-bg)] text-xs h-8"
                required
              />
              {fieldErrors.startTime && (
                <p className="text-[11px] text-[var(--color-conflict)]">{fieldErrors.startTime}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="avail-end" className="text-xs font-medium text-[var(--color-text)]">
                End Time
              </Label>
              <Input
                id="avail-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isSubmitting}
                className="bg-[var(--color-bg)] text-xs h-8"
                required
              />
              {fieldErrors.endTime && (
                <p className="text-[11px] text-[var(--color-conflict)]">{fieldErrors.endTime}</p>
              )}
            </div>
          </div>

          {durationPreview && (
            <div className="flex items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] text-[var(--color-muted)]">
              <span>Slot Duration:</span>
              <span className="font-medium text-[var(--color-work)]">{durationPreview}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs cursor-pointer h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-xs cursor-pointer h-8"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : (
                "Add Window"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

