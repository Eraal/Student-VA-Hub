"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DAYS_ORDER_ACADEMIC, minutesToTimeString, timeStringToMinutes, minutesToDurationString } from "@/lib/schedule-utils";
import { addClassAction, updateClassAction } from "@/lib/actions/schedule";
import { FormattedClass } from "@/lib/services/schedule-service";
import { X, Loader2, AlertCircle, AlertTriangle, BookOpen } from "lucide-react";

interface ClassFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialClass?: FormattedClass | null;
  defaultDayOfWeek?: number;
}

export function ClassFormDialog({
  isOpen,
  onClose,
  onSuccess,
  initialClass,
  defaultDayOfWeek = 1,
}: ClassFormDialogProps) {
  const isEditing = Boolean(initialClass);

  const [subject, setSubject] = React.useState(initialClass?.subject ?? "");
  const [dayOfWeek, setDayOfWeek] = React.useState<number>(
    initialClass?.dayOfWeek ?? defaultDayOfWeek
  );
  const [startTime, setStartTime] = React.useState(
    initialClass ? minutesToTimeString(initialClass.startMinutes, true) : "09:00"
  );
  const [endTime, setEndTime] = React.useState(
    initialClass ? minutesToTimeString(initialClass.endMinutes, true) : "10:30"
  );

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [warning, setWarning] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // Reset state when dialog opens with or without initialClass
  React.useEffect(() => {
    if (isOpen) {
      setSubject(initialClass?.subject ?? "");
      setDayOfWeek(initialClass?.dayOfWeek ?? defaultDayOfWeek);
      setStartTime(
        initialClass ? minutesToTimeString(initialClass.startMinutes, true) : "09:00"
      );
      setEndTime(
        initialClass ? minutesToTimeString(initialClass.endMinutes, true) : "10:30"
      );
      setServerError(null);
      setWarning(null);
      setFieldErrors({});
    }
  }, [isOpen, initialClass, defaultDayOfWeek]);

  if (!isOpen) return null;

  // Compute duration preview
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
    setWarning(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const payload = {
      subject: subject.trim(),
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
    };

    try {
      const res = isEditing
        ? await updateClassAction({ ...payload, id: initialClass!.id })
        : await addClassAction(payload);

      if (!res.success) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setServerError(res.error ?? "Failed to save class schedule.");
        setIsSubmitting(false);
        return;
      }

      if (res.data?.warning) {
        // If there is an overlap warning with an existing task
        setWarning(res.data.warning);
        setIsSubmitting(false);
        // Delay close slightly so user sees the warning, or call onSuccess
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setIsSubmitting(false);
        onSuccess();
        onClose();
      }
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
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-class-bg)] text-[var(--color-class)]">
              <BookOpen className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                {isEditing ? "Edit Class Schedule" : "Add Class Schedule"}
              </h2>
              <p className="text-[11px] text-[var(--color-muted)]">
                Times are in Asia/Manila (UTC+8).
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

          {warning && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>{warning}</span>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1">
            <Label htmlFor="class-subject" className="text-xs font-medium text-[var(--color-text)]">
              Subject Name
            </Label>
            <Input
              id="class-subject"
              placeholder="e.g. Math 101, CS 201"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSubmitting}
              className="bg-[var(--color-bg)] text-xs h-8"
              required
            />
            {fieldErrors.subject && (
              <p className="text-[11px] text-[var(--color-conflict)]">{fieldErrors.subject}</p>
            )}
          </div>

          {/* Day of Week */}
          <div className="space-y-1">
            <Label htmlFor="class-day" className="text-xs font-medium text-[var(--color-text)]">
              Day of Week
            </Label>
            <select
              id="class-day"
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
              <Label htmlFor="class-start" className="text-xs font-medium text-[var(--color-text)]">
                Start Time
              </Label>
              <Input
                id="class-start"
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
              <Label htmlFor="class-end" className="text-xs font-medium text-[var(--color-text)]">
                End Time
              </Label>
              <Input
                id="class-end"
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
              <span>Duration:</span>
              <span className="font-medium text-[var(--color-class)]">{durationPreview}</span>
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
              ) : isEditing ? (
                "Update Class"
              ) : (
                "Add Class"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

