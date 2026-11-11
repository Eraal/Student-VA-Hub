"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormattedTimeLog } from "@/lib/services/time-service";
import { requestCorrectionAction } from "@/lib/actions/time";
import { X, Loader2, AlertCircle, Clock } from "lucide-react";

interface CorrectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  log: FormattedTimeLog | null;
}

export function CorrectionDialog({
  isOpen,
  onClose,
  onSuccess,
  log,
}: CorrectionDialogProps) {
  const [dateStr, setDateStr] = React.useState("");
  const [timeStr, setTimeStr] = React.useState("18:00");
  const [note, setNote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && log) {
      const d = log.timeOut ? new Date(log.timeOut) : new Date();
      setDateStr(d.toISOString().split("T")[0]);
      const hours = d.getHours().toString().padStart(2, "0");
      const mins = d.getMinutes().toString().padStart(2, "0");
      setTimeStr(`${hours}:${mins}`);
      setNote("");
      setServerError(null);
    }
  }, [isOpen, log]);

  if (!isOpen || !log) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateStr || !timeStr || !note.trim()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const requestedTimeIso = new Date(`${dateStr}T${timeStr}:00+08:00`).toISOString();

      const res = await requestCorrectionAction({
        timeLogId: log.id,
        requestedTimeOut: requestedTimeIso,
        correctionNote: note.trim(),
      });

      if (!res.success) {
        setServerError(res.error ?? "Failed to request correction.");
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
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
              <Clock className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Request Time Correction
              </h2>
              <p className="text-[11px] text-[var(--color-muted)]">
                {log.taskTitle}
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

          <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5 text-xs space-y-1">
            <span className="text-[11px] text-[var(--color-muted)] block">Original Time In:</span>
            <span className="font-medium text-[var(--color-text)]">
              {new Date(log.timeIn).toLocaleString("en-US", {
                timeZone: "Asia/Manila",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="corr-date" className="text-xs font-medium text-[var(--color-text)]">
                Correct Date
              </Label>
              <Input
                id="corr-date"
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                disabled={isSubmitting}
                className="bg-[var(--color-bg)] text-xs h-8"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="corr-time" className="text-xs font-medium text-[var(--color-text)]">
                Correct Time Out
              </Label>
              <Input
                id="corr-time"
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                disabled={isSubmitting}
                className="bg-[var(--color-bg)] text-xs h-8"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="corr-note" className="text-xs font-medium text-[var(--color-text)]">
              Explanation for Client
            </Label>
            <textarea
              id="corr-note"
              rows={3}
              placeholder="e.g. Forgot to press Time Out before brownout or internet disruption..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
              maxLength={300}
              required
            />
          </div>

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
              disabled={isSubmitting || !note.trim()}
              className="bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-xs cursor-pointer h-8"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Submitting...</span>
                </span>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
