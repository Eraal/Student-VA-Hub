"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormattedTimeLog } from "@/lib/services/time-service";
import { requestCorrectionAction } from "@/lib/actions/time";
import { toUserErrorMessage } from "@/lib/errors";
import { toast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";
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
        const errorMsg = toUserErrorMessage(res.error ?? "Failed to request correction.");
        setServerError(errorMsg);
        toast.error(errorMsg);
        setIsSubmitting(false);
        return;
      }

      toast.success("Correction request sent to client.");
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err) {
      const errorMsg = toUserErrorMessage(err);
      setServerError(errorMsg);
      toast.error(errorMsg);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="correction-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-6 shadow-[3px_3px_0px_0px_#0F172A] space-y-5 text-[#0F172A]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5DFD5]">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
              <Clock className="size-4" />
            </div>
            <div>
              <h2 id="correction-dialog-title" className="font-display text-base font-bold text-[#0F172A]">
                Request Time Correction
              </h2>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[240px]">
                {log.taskTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-500 hover:text-[#0F172A] hover:bg-[#FAF7F2] border border-transparent hover:border-[#0F172A]/20 transition-all cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-3 text-xs text-[#991B1B] shadow-[2px_2px_0px_0px_#DC2626]">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-[#DC2626]" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="rounded-xl border-[1.5px] border-[#0F172A]/30 bg-[#FAF7F2] p-3 text-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Original Time In
            </span>
            <span className="font-bold text-[#0F172A] text-sm">
              {formatDateTime(log.timeIn)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="corr-date" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Correct Date
              </Label>
              <Input
                id="corr-date"
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                disabled={isSubmitting}
                className="h-10 text-xs bg-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="corr-time" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Correct Time Out
              </Label>
              <Input
                id="corr-time"
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                disabled={isSubmitting}
                className="h-10 text-xs bg-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="corr-note" className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Explanation for Client
            </Label>
            <textarea
              id="corr-note"
              rows={3}
              placeholder="e.g. Forgot to press Time Out before brownout or internet disruption..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border-[1.5px] border-[#0F172A] bg-white p-3 text-xs text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] transition-all resize-none"
              maxLength={300}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5DFD5]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs cursor-pointer h-9 px-4 font-bold border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !note.trim()}
              className="bg-[#0F172A] hover:bg-slate-800 text-white text-xs cursor-pointer h-9 px-5 font-bold border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
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
