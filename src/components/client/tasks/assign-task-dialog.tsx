"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTaskAction, checkTaskConflictAction } from "@/lib/actions/task";
import type { ConflictCheckResult } from "@/lib/conflict";
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  PlusCircle,
  Clock,
} from "lucide-react";

interface AssignTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  linkedStudentName?: string;
}

export function AssignTaskDialog({
  isOpen,
  onClose,
  onSuccess,
  linkedStudentName,
}: AssignTaskDialogProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dateStr, setDateStr] = React.useState(() => {
    // Default to today or tomorrow
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [startTimeStr, setStartTimeStr] = React.useState("18:00");
  const [endTimeStr, setEndTimeStr] = React.useState("20:00");
  const [estHours, setEstHours] = React.useState<number>(2.0);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCheckingConflict, setIsCheckingConflict] = React.useState(false);
  const [conflictResult, setConflictResult] = React.useState<ConflictCheckResult | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // Reset when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      const today = new Date().toISOString().split("T")[0];
      setDateStr(today);
      setStartTimeStr("18:00");
      setEndTimeStr("20:00");
      setEstHours(2.0);
      setServerError(null);
      setFieldErrors({});
      setConflictResult(null);
    }
  }, [isOpen]);

  // Compute ISO timestamps from date and times
  const computeIsoTimestamps = React.useCallback(() => {
    try {
      if (!dateStr || !startTimeStr || !endTimeStr) return null;
      // Build ISO in Manila local time (+08:00)
      const startIso = `${dateStr}T${startTimeStr}:00+08:00`;
      const endIso = `${dateStr}T${endTimeStr}:00+08:00`;

      const startUtc = new Date(startIso).toISOString();
      const endUtc = new Date(endIso).toISOString();
      return { startUtc, endUtc };
    } catch {
      return null;
    }
  }, [dateStr, startTimeStr, endTimeStr]);

  // Live conflict check with debouncing
  React.useEffect(() => {
    if (!isOpen) return;

    const timestamps = computeIsoTimestamps();
    if (!timestamps) return;

    const timer = setTimeout(async () => {
      setIsCheckingConflict(true);
      try {
        const res = await checkTaskConflictAction({
          startAt: timestamps.startUtc,
          dueAt: timestamps.endUtc,
          estHours: Number(estHours) || 1,
        });

        if (res.success && res.data) {
          setConflictResult(res.data);
        } else {
          setConflictResult(null);
        }
      } catch (err) {
        console.error("Live conflict check error:", err);
      } finally {
        setIsCheckingConflict(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, dateStr, startTimeStr, endTimeStr, estHours, computeIsoTimestamps]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const timestamps = computeIsoTimestamps();
    if (!timestamps) {
      setServerError("Please specify a valid date, start time, and end time.");
      return;
    }

    // Client-side guard against hard conflict
    if (conflictResult && !conflictResult.ok) {
      const blockMsg = conflictResult.conflicts.find((c) => c.severity === "BLOCK")?.message;
      setServerError(blockMsg ?? "Cannot assign task due to a class overlap.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createTaskAction({
        title: title.trim(),
        description: description.trim() || undefined,
        startAt: timestamps.startUtc,
        dueAt: timestamps.endUtc,
        estHours: Number(estHours),
      });

      if (!res.success) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setServerError(res.error ?? "Failed to assign task.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setServerError("An unexpected error occurred while assigning task.");
      setIsSubmitting(false);
    }
  };

  const hasHardConflict = conflictResult ? !conflictResult.ok : false;
  const hardConflict = conflictResult?.conflicts.find((c) => c.severity === "BLOCK");
  const warnings = conflictResult?.conflicts.filter((c) => c.severity === "WARN") ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150 overflow-y-auto"
    >
      <div className="w-full max-w-lg rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
              <PlusCircle className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Assign Task to {linkedStudentName ?? "Student VA"}
              </h2>
              <p className="text-[11px] text-[var(--color-muted)]">
                Real-time conflict check against class schedules & availability.
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

          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="task-title" className="text-xs font-medium text-[var(--color-text)]">
              Task Title
            </Label>
            <Input
              id="task-title"
              placeholder="e.g. Prepare weekly research report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              className="bg-[var(--color-bg)] text-xs h-8"
              required
            />
            {fieldErrors.title && (
              <p className="text-[11px] text-[var(--color-conflict)]">{fieldErrors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="task-desc" className="text-xs font-medium text-[var(--color-text)]">
              Description & Instructions (Optional)
            </Label>
            <textarea
              id="task-desc"
              rows={3}
              placeholder="Include requirements, reference links, and guidelines..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] outline-none"
              maxLength={1000}
            />
          </div>

          {/* Date and Time Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="task-date" className="text-xs font-medium text-[var(--color-text)]">
                Date (Asia/Manila)
              </Label>
              <Input
                id="task-date"
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                disabled={isSubmitting}
                className="bg-[var(--color-bg)] text-xs h-8"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="task-start" className="text-xs font-medium text-[var(--color-text)]">
                Start Time
              </Label>
              <Input
                id="task-start"
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                disabled={isSubmitting}
                className="bg-[var(--color-bg)] text-xs h-8"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="task-end" className="text-xs font-medium text-[var(--color-text)]">
                Due / End Time
              </Label>
              <Input
                id="task-end"
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                disabled={isSubmitting}
                className="bg-[var(--color-bg)] text-xs h-8"
                required
              />
            </div>
          </div>

          {/* Estimated Hours */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="task-hours" className="text-xs font-medium text-[var(--color-text)]">
                Estimated Hours (Billed Time Cap)
              </Label>
              <span className="text-[11px] text-[var(--color-muted)]">
                {estHours} {estHours === 1 ? "hour" : "hours"}
              </span>
            </div>
            <Input
              id="task-hours"
              type="number"
              step="0.5"
              min="0.25"
              max="24"
              value={estHours}
              onChange={(e) => setEstHours(parseFloat(e.target.value) || 0)}
              disabled={isSubmitting}
              className="bg-[var(--color-bg)] text-xs h-8"
              required
            />
          </div>

          {/* ================================================================= */}
          {/* REFERENCE SCREEN: Live Conflict Check Below The Form              */}
          {/* ================================================================= */}
          <div className="pt-2 border-t border-[var(--color-border)] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide">
              <span>Live Conflict Verification</span>
              {isCheckingConflict && (
                <span className="flex items-center gap-1 text-[10px] lowercase text-[var(--color-muted)]">
                  <Loader2 className="size-3 animate-spin" />
                  <span>checking...</span>
                </span>
              )}
            </div>

            {/* Hard Block Red Alert */}
            {hasHardConflict && hardConflict && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-md border border-[var(--color-conflict)] bg-[var(--color-conflict-bg)] p-3 text-xs text-[var(--color-conflict)]"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-semibold">{hardConflict.message}</div>
                  <div className="text-[11px] opacity-90">
                    Submission is blocked. Please select an alternate time slot when the student is not in class.
                  </div>
                </div>
              </div>
            )}

            {/* Soft Warnings (Amber / Muted Alerts) */}
            {!hasHardConflict && warnings.length > 0 && (
              <div className="space-y-1.5">
                {warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800"
                  >
                    <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                    <span>{w.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Green Clean Badge */}
            {!hasHardConflict && conflictResult && warnings.length === 0 && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-md border border-green-200 bg-[var(--color-work-bg)] p-2.5 text-xs text-[var(--color-work)]"
              >
                <CheckCircle2 className="size-4 shrink-0" />
                <span className="font-medium">No conflict — ready to assign</span>
              </div>
            )}
          </div>

          {/* Form Actions */}
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
              disabled={isSubmitting || hasHardConflict}
              className={`text-xs cursor-pointer h-8 ${
                hasHardConflict
                  ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                  : "bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)]"
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Assigning...</span>
                </span>
              ) : (
                "Assign Task"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
