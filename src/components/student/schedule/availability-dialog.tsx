"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DAYS_ORDER_ACADEMIC,
  minutesToTimeString,
  timeStringToMinutes,
} from "@/lib/schedule-utils";
import { formatHours } from "@/lib/format";
import {
  addAvailabilityAction,
  deleteAvailabilityAction,
} from "@/lib/actions/schedule";
import { FormattedAvailability } from "@/lib/services/schedule-service";
import { toUserErrorMessage } from "@/lib/errors";
import { X, Loader2, AlertCircle, Briefcase } from "lucide-react";

interface AvailabilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialAvailability?: FormattedAvailability | null;
  defaultDayOfWeek?: number;
  defaultStartTime?: string;
}

export function AvailabilityDialog({
  isOpen,
  onClose,
  onSuccess,
  initialAvailability,
  defaultDayOfWeek = 1,
  defaultStartTime,
}: AvailabilityDialogProps) {
  const isEditing = Boolean(initialAvailability);

  const [dayOfWeek, setDayOfWeek] = React.useState<number>(
    initialAvailability?.dayOfWeek ?? defaultDayOfWeek
  );

  const computeDefaultTimes = (defStart?: string) => {
    const start = defStart ?? "18:00";
    try {
      const sMins = timeStringToMinutes(start);
      const eMins = Math.min(1439, sMins + 180); // +3 hours default
      return {
        start,
        end: minutesToTimeString(eMins, true),
      };
    } catch {
      return { start: "18:00", end: "21:00" };
    }
  };

  const initialTimes = computeDefaultTimes(defaultStartTime);
  const [startTime, setStartTime] = React.useState(
    initialAvailability
      ? minutesToTimeString(initialAvailability.startMinutes, true)
      : initialTimes.start
  );
  const [endTime, setEndTime] = React.useState(
    initialAvailability
      ? minutesToTimeString(initialAvailability.endMinutes, true)
      : initialTimes.end
  );

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      setDayOfWeek(initialAvailability?.dayOfWeek ?? defaultDayOfWeek);
      if (initialAvailability) {
        setStartTime(
          minutesToTimeString(initialAvailability.startMinutes, true)
        );
        setEndTime(minutesToTimeString(initialAvailability.endMinutes, true));
      } else {
        const times = computeDefaultTimes(defaultStartTime);
        setStartTime(times.start);
        setEndTime(times.end);
      }
      setServerError(null);
      setFieldErrors({});
    }
  }, [isOpen, initialAvailability, defaultDayOfWeek, defaultStartTime]);

  if (!isOpen) return null;

  let durationPreview = "";
  try {
    const s = timeStringToMinutes(startTime);
    const e = timeStringToMinutes(endTime);
    if (e > s) {
      durationPreview = formatHours((e - s) / 60);
    }
  } catch {
    durationPreview = "";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const payload = {
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
    };

    try {
      if (isEditing && initialAvailability) {
        // Replace previous window
        await deleteAvailabilityAction(initialAvailability.id);
      }

      const res = await addAvailabilityAction(payload);
      if (!res.success) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setServerError(
          toUserErrorMessage(res.error ?? "Failed to save availability window.")
        );
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setServerError(toUserErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-6 shadow-[4px_4px_0px_0px_#0F172A] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5DFD5]">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#F0FDF4] text-[#16A34A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
              <Briefcase className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-[#0F172A]">
                {isEditing ? "Edit Free Window" : "Add Free Window"}
              </h2>
              <p className="text-xs text-slate-500">
                Times are in Philippine time.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex size-8 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] hover:bg-white active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="flex items-start gap-2 rounded-xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Day of Week */}
          <div className="space-y-1.5">
            <Label
              htmlFor="avail-day"
              className="text-xs font-bold text-[#0F172A]"
            >
              Day of Week
            </Label>
            <select
              id="avail-day"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              disabled={isSubmitting}
              className="w-full rounded-lg border-[1.5px] border-[#0F172A] bg-white px-3 py-2 text-sm text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
            >
              {DAYS_ORDER_ACADEMIC.map((day) => (
                <option key={day.dayOfWeek} value={day.dayOfWeek}>
                  {day.name}
                </option>
              ))}
            </select>
            {fieldErrors.dayOfWeek && (
              <p className="text-xs font-semibold text-[#DC2626]">
                {fieldErrors.dayOfWeek}
              </p>
            )}
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="avail-start"
                className="text-xs font-bold text-[#0F172A]"
              >
                Start Time
              </Label>
              <Input
                id="avail-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isSubmitting}
                className="border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] rounded-lg h-10 px-3 text-sm"
                required
              />
              {fieldErrors.startTime && (
                <p className="text-xs font-semibold text-[#DC2626]">
                  {fieldErrors.startTime}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="avail-end"
                className="text-xs font-bold text-[#0F172A]"
              >
                End Time
              </Label>
              <Input
                id="avail-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isSubmitting}
                className="border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] rounded-lg h-10 px-3 text-sm"
                required
              />
              {fieldErrors.endTime && (
                <p className="text-xs font-semibold text-[#DC2626]">
                  {fieldErrors.endTime}
                </p>
              )}
            </div>
          </div>

          {durationPreview && (
            <div className="flex items-center justify-between rounded-lg border-[1.5px] border-[#0F172A] bg-[#F0FDF4] px-3 py-2 text-xs text-[#166534] font-bold shadow-[1.5px_1.5px_0px_0px_#0F172A]">
              <span>Window Duration</span>
              <span>{durationPreview}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5DFD5]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-[1.5px] border-[#0F172A] bg-white text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#FAF7F2] font-bold min-h-[40px] px-4 rounded-lg cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 font-bold min-h-[40px] px-4 rounded-lg cursor-pointer text-xs"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : isEditing ? (
                "Update window"
              ) : (
                "Add window"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
