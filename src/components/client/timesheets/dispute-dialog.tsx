"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { disputeTimeLogAction } from "@/lib/actions/invoice";
import { X, Loader2, AlertCircle, AlertTriangle } from "lucide-react";

interface DisputeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  timeLogId: string | null;
  taskTitle: string | null;
}

export function DisputeDialog({
  isOpen,
  onClose,
  onSuccess,
  timeLogId,
  taskTitle,
}: DisputeDialogProps) {
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !timeLogId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await disputeTimeLogAction({
        timeLogId,
        disputeReason: reason.trim(),
      });

      if (!res.success) {
        setError(res.error ?? "Failed to dispute hours.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
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
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-conflict-bg)] text-[var(--color-conflict)]">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Dispute Logged Hours
              </h2>
              <p className="text-[11px] text-[var(--color-muted)]">
                {taskTitle ?? "Task"}
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
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-[var(--color-conflict)] bg-[var(--color-conflict-bg)] p-2.5 text-xs text-[var(--color-conflict)]">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="dispute-reason" className="text-xs font-medium text-[var(--color-text)]">
              Reason for Dispute
            </Label>
            <textarea
              id="dispute-reason"
              rows={3}
              placeholder="Explain why these hours are being disputed (e.g. Session was interrupted or incorrect time recorded)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
              disabled={isSubmitting || !reason.trim()}
              className="bg-[var(--color-conflict)] text-white hover:bg-[var(--color-conflict)]/90 text-xs cursor-pointer h-8"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Submitting...</span>
                </span>
              ) : (
                "Submit Dispute"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
