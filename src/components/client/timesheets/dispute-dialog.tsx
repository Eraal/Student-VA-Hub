"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { disputeTimeLogAction } from "@/lib/actions/invoice";
import { toUserErrorMessage } from "@/lib/errors";
import { formatDate, formatTimeRange, formatHours, formatPeso } from "@/lib/format";
import { calculateLogAmount } from "@/lib/money";
import { toast } from "@/components/ui/toast";
import { X, Loader2, AlertTriangle } from "lucide-react";

export interface DisputeLogInfo {
  id: string;
  taskId: string;
  taskTitle: string;
  timeIn: Date | string;
  timeOut: Date | string | null;
  totalHours: number;
}

interface DisputeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  log: DisputeLogInfo | null;
  hourlyRate: number;
  studentName?: string;
  timeLogId?: string | null;
  taskTitle?: string | null;
}

export function DisputeDialog({
  isOpen,
  onClose,
  onSuccess,
  log,
  hourlyRate,
  studentName,
  timeLogId,
  taskTitle,
}: DisputeDialogProps) {
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const activeId = log?.id ?? timeLogId;
  const activeTitle = log?.taskTitle ?? taskTitle ?? "Task";
  const studentFirstName = studentName?.trim().split(/\s+/)[0] || "Student";

  React.useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !activeId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await disputeTimeLogAction({
        timeLogId: activeId,
        disputeReason: reason.trim(),
      });

      if (!res.success) {
        setError(toUserErrorMessage(res.error));
        setIsSubmitting(false);
        return;
      }

      toast.success("Dispute recorded and student notified.");
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err) {
      setError(toUserErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  const isReasonValid = reason.trim().length >= 5 && reason.trim().length <= 300;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispute-dialog-title"
      data-testid="dispute-dialog"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-in fade-in duration-150 backdrop-blur-xs"
    >
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-5 sm:p-6 shadow-[4px_4px_0px_0px_#0F172A] space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#E5DFD5]">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-[#D97706] bg-[#FFFBEB] text-[#92400E] shadow-[1.5px_1.5px_0px_0px_#D97706]">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <h2
                id="dispute-dialog-title"
                className="font-display text-base sm:text-lg font-bold text-[#0F172A]"
              >
                Dispute these hours
              </h2>
              <p className="text-xs text-slate-600">
                Provide a reason for contesting this logged session.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-600 hover:text-[#0F172A] hover:bg-[#FAF7F2] border-[1px] border-transparent hover:border-[#0F172A] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Summary row of the hours being disputed */}
        {log && (
          <div className="rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-3 text-xs shadow-[2px_2px_0px_0px_#0F172A] flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <div className="font-bold text-[#0F172A] text-sm">
                {activeTitle}
              </div>
              <div className="text-[11px] text-slate-600">
                {formatDate(log.timeIn)} • {formatTimeRange(log.timeIn, log.timeOut)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display font-black text-sm text-[#0F172A]">
                {formatHours(log.totalHours)}
              </div>
              <div className="text-[11px] font-bold text-slate-600">
                {formatPeso(calculateLogAmount(log.totalHours, hourlyRate))}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-3 text-xs text-[#991B1B] shadow-[2px_2px_0px_0px_#DC2626]">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="dispute-reason"
                className="text-xs font-bold text-[#0F172A]"
              >
                Reason for dispute <span className="text-[#DC2626]">*</span>
              </Label>
              <span className="text-[10px] font-semibold text-slate-500">
                {reason.length}/300
              </span>
            </div>
            <textarea
              id="dispute-reason"
              data-testid="dispute-reason"
              rows={3}
              placeholder="What looks wrong? For example: the session ended earlier than logged."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              maxLength={300}
              required
              className="w-full rounded-lg border-[1.5px] border-[#0F172A] bg-white p-3 text-xs text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] resize-none leading-relaxed"
            />
            {reason.length > 0 && reason.trim().length < 5 && (
              <p className="text-[11px] text-[#D97706] font-medium">
                Please enter at least 5 characters.
              </p>
            )}
          </div>

          {/* Helper */}
          <p className="text-xs text-slate-600 leading-relaxed bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E5DFD5]">
            {studentFirstName} will be notified with your reason. The hours stay unapproved until you approve them.
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5DFD5]">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="font-semibold text-slate-700 hover:text-[#0F172A] hover:bg-[#EFEAE2] min-h-[40px] px-4 cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="dispute-submit"
              disabled={isSubmitting || !isReasonValid}
              className="bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none min-h-[40px] px-5 font-bold text-xs cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Sending...</span>
                </span>
              ) : (
                "Send dispute"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
