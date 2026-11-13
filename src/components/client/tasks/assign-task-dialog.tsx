"use client";

import * as React from "react";
import { format, isBefore, startOfToday, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { createTaskAction, checkTaskConflictAction } from "@/lib/actions/task";
import type { ConflictCheckResult } from "@/lib/conflict";
import { toManilaTimeComponents } from "@/lib/conflict";
import { suggestSlots, getDayCapacity, type OpenSlot } from "@/lib/open-slots";
import { minutesToTimeString } from "@/lib/schedule-utils";
import { formatHours } from "@/lib/format";
import { toUserErrorMessage } from "@/lib/errors";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Calendar as CalendarIcon,
  Minus,
  Plus,
  RefreshCw,
  Clock,
} from "lucide-react";

export interface AssignTaskScheduleContext {
  classes: Array<{
    id?: string;
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
    subject?: string;
  }>;
  availability: Array<{
    id?: string;
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
  }>;
  blockedDates: Array<{
    id?: string;
    dateStart: Date | string;
    dateEnd: Date | string;
    reason?: string | null;
  }>;
  existingTasks: Array<{
    id?: string;
    startAt: Date | string;
    dueAt: Date | string;
    estHours: number;
    status?: string;
  }>;
  maxHoursPerDay: number;
  studentName?: string;
}

export interface AssignTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  linkedStudentName?: string;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  defaults?: {
    date?: string;
    start?: string;
    end?: string;
  };
  scheduleContext?: AssignTaskScheduleContext;
  initialConflictResult?: ConflictCheckResult;
}

export function AssignTaskDialog({
  isOpen,
  onClose,
  onSuccess,
  linkedStudentName,
  initialDate,
  initialStartTime,
  initialEndTime,
  defaults,
  scheduleContext: externalScheduleContext,
  initialConflictResult,
}: AssignTaskDialogProps) {
  const effectiveDate = defaults?.date || initialDate;
  const effectiveStart = defaults?.start || initialStartTime;
  const effectiveEnd = defaults?.end || initialEndTime;

  // Form states
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dateStr, setDateStr] = React.useState(() => {
    return effectiveDate || new Date().toISOString().split("T")[0];
  });
  const [startTimeStr, setStartTimeStr] = React.useState(effectiveStart || "18:00");
  const [endTimeStr, setEndTimeStr] = React.useState(effectiveEnd || "20:00");
  const [estHours, setEstHours] = React.useState<number>(2.0);
  const [isHoursManuallyEdited, setIsHoursManuallyEdited] = React.useState(false);

  // Popover state for date picker
  const [isDateOpen, setIsDateOpen] = React.useState(false);

  // Submission & Conflict Check state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCheckingConflict, setIsCheckingConflict] = React.useState(false);
  const [checkError, setCheckError] = React.useState<string | null>(null);
  const [conflictResult, setConflictResult] = React.useState<ConflictCheckResult | null>(
    initialConflictResult || null
  );
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // Schedule context state (either passed or fetched)
  const [fetchedScheduleContext, setFetchedScheduleContext] =
    React.useState<AssignTaskScheduleContext | null>(null);

  const scheduleContext = externalScheduleContext || fetchedScheduleContext;

  const studentName = linkedStudentName || scheduleContext?.studentName || "Student";
  const studentFirstName = studentName.trim().split(/\s+/)[0] || "Student";

  // Calculate window length in hours
  const calculateWindowHours = React.useCallback(
    (start: string, end: string): number => {
      try {
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        const diffMins = eh * 60 + em - (sh * 60 + sm);
        if (diffMins > 0) {
          return Math.round((diffMins / 60) * 10) / 10;
        }
      } catch {
        // Fallback
      }
      return 2.0;
    },
    []
  );

  // Reset / initialize state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      const date = defaults?.date || initialDate || new Date().toISOString().split("T")[0];
      const start = defaults?.start || initialStartTime || "18:00";
      const end = defaults?.end || initialEndTime || "20:00";
      setDateStr(date);
      setStartTimeStr(start);
      setEndTimeStr(end);

      const winHours = calculateWindowHours(start, end);
      setEstHours(winHours);
      setIsHoursManuallyEdited(false);

      setServerError(null);
      setFieldErrors({});
      setCheckError(null);
      setConflictResult(initialConflictResult || null);

      // Fetch schedule context if not provided
      if (!externalScheduleContext) {
        fetch("/api/client/schedule-context")
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.success) {
              setFetchedScheduleContext(data);
            }
          })
          .catch(() => { });
      }
    }
  }, [
    isOpen,
    initialDate,
    initialStartTime,
    initialEndTime,
    defaults,
    externalScheduleContext,
    calculateWindowHours,
  ]);

  // Auto-fill estHours from time window until edited manually
  const handleStartTimeChange = (newStart: string) => {
    setStartTimeStr(newStart);
    if (!isHoursManuallyEdited) {
      const winHours = calculateWindowHours(newStart, endTimeStr);
      setEstHours(winHours);
    }
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTimeStr(newEnd);
    if (!isHoursManuallyEdited) {
      const winHours = calculateWindowHours(startTimeStr, newEnd);
      setEstHours(winHours);
    }
  };

  const handleMatchWindow = () => {
    const winHours = calculateWindowHours(startTimeStr, endTimeStr);
    setEstHours(winHours);
    setIsHoursManuallyEdited(false);
  };

  const handleStepHours = (delta: number) => {
    setEstHours((prev) => {
      const next = Math.max(0.5, Math.min(24, Math.round((prev + delta) * 10) / 10));
      return next;
    });
    setIsHoursManuallyEdited(true);
  };

  // Convert current dateStr and times to UTC ISO strings
  const computeIsoTimestamps = React.useCallback(() => {
    try {
      if (!dateStr || !startTimeStr || !endTimeStr) return null;
      // Manila is UTC+8
      const startIso = `${dateStr}T${startTimeStr}:00+08:00`;
      const endIso = `${dateStr}T${endTimeStr}:00+08:00`;

      const startUtc = new Date(startIso).toISOString();
      const endUtc = new Date(endIso).toISOString();
      return { startUtc, endUtc };
    } catch {
      return null;
    }
  }, [dateStr, startTimeStr, endTimeStr]);

  // Debounced live conflict check
  const runConflictCheck = React.useCallback(async () => {
    const timestamps = computeIsoTimestamps();
    if (!timestamps) return;

    setIsCheckingConflict(true);
    setCheckError(null);

    try {
      const res = await checkTaskConflictAction({
        startAt: timestamps.startUtc,
        dueAt: timestamps.endUtc,
        estHours: Number(estHours) || 1,
      });

      if (res.success && res.data) {
        setConflictResult(res.data);
      } else {
        setCheckError(res.error || "Couldn't check right now.");
      }
    } catch {
      setCheckError("Couldn't check right now.");
    } finally {
      setIsCheckingConflict(false);
    }
  }, [computeIsoTimestamps, estHours]);

  React.useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      runConflictCheck();
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, dateStr, startTimeStr, endTimeStr, estHours, runConflictCheck]);

  // Capacity calculations for selected date
  const dayCapacity = React.useMemo(() => {
    const maxHours = scheduleContext?.maxHoursPerDay ?? 4;
    if (!scheduleContext) {
      return { maxHours, assignedHours: 0, remainingHours: maxHours };
    }
    return getDayCapacity({
      day: dateStr,
      maxHoursPerDay: maxHours,
      existingTasks: scheduleContext.existingTasks,
    });
  }, [scheduleContext, dateStr]);

  // 14-day slot suggestions from suggestSlots
  const suggestions: OpenSlot[] = React.useMemo(() => {
    if (!scheduleContext) return [];
    try {
      const now = new Date();
      const to = addDays(now, 14);
      return suggestSlots({
        from: now,
        to,
        classes: scheduleContext.classes || [],
        availability: scheduleContext.availability || [],
        blockedDates: scheduleContext.blockedDates || [],
        existingTasks: scheduleContext.existingTasks || [],
        now,
        estHours: Number(estHours) || 2,
        count: 4,
        maxPerDay: 2,
        maxHoursPerDay: scheduleContext.maxHoursPerDay || 4,
        studentName: studentFirstName,
      });
    } catch {
      return [];
    }
  }, [scheduleContext, estHours, studentFirstName]);

  // Check if selected date is blocked
  const isDateBlocked = React.useMemo(() => {
    if (!scheduleContext?.blockedDates) return false;
    try {
      const dateStartMs = new Date(`${dateStr}T00:00:00+08:00`).getTime();
      const dateEndMs = dateStartMs + 24 * 60 * 60 * 1000 - 1;
      return scheduleContext.blockedDates.some((b) => {
        const bStartMs = new Date(b.dateStart).getTime();
        const bEndMs = new Date(b.dateEnd).getTime();
        return dateStartMs <= bEndMs && dateEndMs >= bStartMs;
      });
    } catch {
      return false;
    }
  }, [scheduleContext?.blockedDates, dateStr]);

  // Classes & free windows on the selected date for day preview
  const daySchedule = React.useMemo(() => {
    if (!scheduleContext) {
      return { classes: [], availability: [], dayOfWeek: 1 };
    }
    try {
      const comp = toManilaTimeComponents(new Date(`${dateStr}T00:00:00+08:00`));
      const dow = comp.dayOfWeek;
      const classesOnDay = (scheduleContext.classes || []).filter(
        (c) => c.dayOfWeek === dow
      );
      const availOnDay = (scheduleContext.availability || []).filter(
        (a) => a.dayOfWeek === dow
      );
      return { classes: classesOnDay, availability: availOnDay, dayOfWeek: dow };
    } catch {
      return { classes: [], availability: [], dayOfWeek: 1 };
    }
  }, [scheduleContext, dateStr]);

  // Proposed task window minutes on day preview
  const proposedTaskMinutes = React.useMemo(() => {
    try {
      const [sh, sm] = startTimeStr.split(":").map(Number);
      const [eh, em] = endTimeStr.split(":").map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      return { startMins, endMins };
    } catch {
      return { startMins: 18 * 60, endMins: 20 * 60 };
    }
  }, [startTimeStr, endTimeStr]);

  // Handle suggestion chip click
  const handleApplySuggestion = (slot: OpenSlot) => {
    const compStart = toManilaTimeComponents(slot.start);
    const compEnd = toManilaTimeComponents(slot.end);

    const targetDateKey = compStart.dateKey;
    const targetStart24 = minutesToTimeString(compStart.minutesFromMidnight, true);
    const targetEnd24 = minutesToTimeString(compEnd.minutesFromMidnight, true);

    setDateStr(targetDateKey);
    setStartTimeStr(targetStart24);
    setEndTimeStr(targetEnd24);

    if (!isHoursManuallyEdited) {
      const durationHours = Math.round((slot.minutes / 60) * 10) / 10;
      setEstHours(durationHours);
    }
  };

  // Conflict state classification
  const isBlock = conflictResult ? !conflictResult.ok : false;
  const isWarn = conflictResult ? conflictResult.ok && conflictResult.hasWarnings : false;
  const isOk = conflictResult ? conflictResult.ok && !conflictResult.hasWarnings : false;

  let checkState: "ok" | "warn" | "block" | "checking" | "error" = "checking";
  if (isCheckingConflict) {
    checkState = "checking";
  } else if (checkError) {
    checkState = "error";
  } else if (isBlock) {
    checkState = "block";
  } else if (isWarn) {
    checkState = "warn";
  } else if (isOk) {
    checkState = "ok";
  }

  const isFormValid =
    title.trim().length > 0 &&
    dateStr.length > 0 &&
    startTimeStr.length > 0 &&
    endTimeStr.length > 0 &&
    estHours > 0;

  const isSubmitDisabled =
    isSubmitting ||
    isCheckingConflict ||
    !!checkError ||
    isBlock ||
    !isFormValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isBlock || !isFormValid) return;

    setServerError(null);
    setFieldErrors({});

    const timestamps = computeIsoTimestamps();
    if (!timestamps) {
      setServerError("Please specify a valid date, start time, and end time.");
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
        setServerError(toUserErrorMessage(res.error ?? "Failed to assign task."));
        setIsSubmitting(false);
        return;
      }

      toast.success(`Task assigned to ${studentFirstName}`);
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setServerError(toUserErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  // Keyboard Escape listener
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

  if (!isOpen) return null;

  // Selected date object for Calendar
  const selectedDateObj = new Date(`${dateStr}T00:00:00`);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-dialog-title"
      data-testid="assign-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
    >
      <div className="w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[90vh] sm:rounded-2xl border-[1.5px] border-[#0F172A] bg-white text-[#0F172A] shadow-[4px_4px_0px_0px_#0F172A] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b-[1.5px] border-[#0F172A] bg-[#FAF7F2] shrink-0">
          <div>
            <h2
              id="assign-dialog-title"
              className="font-display text-lg sm:text-xl font-black tracking-tight text-[#0F172A]"
            >
              {`Assign a task to ${studentFirstName}`}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {`We check ${studentFirstName}'s classes and free time as you type.`}
            </p>
          </div>
          <button
            type="button"
            data-testid="assign-cancel"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:text-[#0F172A] hover:bg-white border border-transparent hover:border-[#0F172A] cursor-pointer transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Dialog Body (Desktop 2-column, Mobile stacked) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* LEFT COLUMN: The Form */}
          <form
            id="assign-task-form"
            onSubmit={handleSubmit}
            className="md:col-span-7 space-y-4"
          >
            {serverError && (
              <div className="flex items-start gap-2.5 rounded-xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-3 text-xs text-[#991B1B] font-medium shadow-[2px_2px_0px_0px_#DC2626]">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Task Title */}
            <div className="space-y-1.5">
              <Label
                htmlFor="assign-title"
                className="text-xs font-bold text-[#0F172A] flex items-center justify-between"
              >
                <span>Task title</span>
                <span className="text-[10px] text-slate-500 font-normal">Required</span>
              </Label>
              <Input
                id="assign-title"
                data-testid="assign-title"
                placeholder="e.g. Prepare research summary"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                className="h-10 text-xs sm:text-sm bg-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] focus-visible:ring-0"
                required
              />
              {fieldErrors.title && (
                <p className="text-[11px] font-semibold text-[#DC2626]">
                  {fieldErrors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label
                htmlFor="assign-desc"
                className="text-xs font-bold text-[#0F172A] flex items-center justify-between"
              >
                <span>Description</span>
                <span className="text-[10px] text-slate-500 font-normal">Optional</span>
              </Label>
              <textarea
                id="assign-desc"
                data-testid="assign-description"
                rows={3}
                placeholder="Add requirements, links or guidelines"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border-[1.5px] border-[#0F172A] bg-white p-2.5 text-xs sm:text-sm text-[#0F172A] placeholder:text-slate-400 shadow-[2px_2px_0px_0px_#0F172A] focus:outline-none focus:ring-0 resize-y"
                maxLength={1000}
              />
              {fieldErrors.description && (
                <p className="text-[11px] font-semibold text-[#DC2626]">
                  {fieldErrors.description}
                </p>
              )}
            </div>

            {/* Date Picker (shadcn Popover + Calendar) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="assign-date-trigger"
                className="text-xs font-bold text-[#0F172A]"
              >
                Date
              </Label>
              <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="assign-date-trigger"
                    type="button"
                    variant="outline"
                    data-testid="assign-date"
                    disabled={isSubmitting}
                    className="w-full justify-start text-left font-bold text-xs sm:text-sm h-10 px-3 bg-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]"
                  >
                    <CalendarIcon className="size-4 mr-2 text-slate-600" />
                    <span>{format(selectedDateObj, "EEE, MMM d, yyyy")}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    selected={selectedDateObj}
                    onSelect={(d) => {
                      const newDateKey = format(d, "yyyy-MM-dd");
                      setDateStr(newDateKey);
                      setIsDateOpen(false);
                    }}
                    disabled={(d) => isBefore(d, startOfToday())}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-[11px] text-slate-500 font-medium">Philippine time</p>
              {fieldErrors.startAt && (
                <p className="text-[11px] font-semibold text-[#DC2626]">
                  {fieldErrors.startAt}
                </p>
              )}
            </div>

            {/* Start and Due / End Times */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="assign-start"
                  className="text-xs font-bold text-[#0F172A]"
                >
                  Start time
                </Label>
                <Input
                  id="assign-start"
                  data-testid="assign-start"
                  type="time"
                  step="900"
                  value={startTimeStr}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  disabled={isSubmitting}
                  className="h-10 text-xs sm:text-sm bg-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="assign-end"
                  className="text-xs font-bold text-[#0F172A]"
                >
                  End time
                </Label>
                <Input
                  id="assign-end"
                  data-testid="assign-end"
                  type="time"
                  step="900"
                  value={endTimeStr}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  disabled={isSubmitting}
                  className="h-10 text-xs sm:text-sm bg-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]"
                  required
                />
              </div>
            </div>
            {fieldErrors.dueAt && (
              <p className="text-[11px] font-semibold text-[#DC2626]">
                {fieldErrors.dueAt}
              </p>
            )}

            {/* Estimated Hours Stepper */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="assign-hours"
                  className="text-xs font-bold text-[#0F172A]"
                >
                  Estimated hours
                </Label>
                {isHoursManuallyEdited && (
                  <button
                    type="button"
                    onClick={handleMatchWindow}
                    className="text-[11px] text-[#2563EB] hover:underline font-semibold cursor-pointer"
                  >
                    Match window
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => handleStepHours(-0.5)}
                  disabled={isSubmitting || estHours <= 0.5}
                  className="size-10 shrink-0 cursor-pointer bg-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]"
                  aria-label="Decrease estimated hours by 0.5"
                >
                  <Minus className="size-4" />
                </Button>

                <div className="relative flex-1">
                  <Input
                    id="assign-hours"
                    data-testid="assign-hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={estHours}
                    onChange={(e) => {
                      setEstHours(parseFloat(e.target.value) || 0);
                      setIsHoursManuallyEdited(true);
                    }}
                    disabled={isSubmitting}
                    className="h-10 text-center font-bold text-xs sm:text-sm bg-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 pointer-events-none">
                    ({formatHours(estHours)})
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => handleStepHours(0.5)}
                  disabled={isSubmitting || estHours >= 24}
                  className="size-10 shrink-0 cursor-pointer bg-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]"
                  aria-label="Increase estimated hours by 0.5"
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <p className="text-[11px] text-slate-500 font-medium">
                How long you expect this to take.
              </p>
              {fieldErrors.estHours && (
                <p className="text-[11px] font-semibold text-[#DC2626]">
                  {fieldErrors.estHours}
                </p>
              )}
            </div>
          </form>

          {/* RIGHT COLUMN: Availability Check Panel (Sticky on Desktop) */}
          <div className="md:col-span-5 md:sticky md:top-0 space-y-4">
            <div className="rounded-xl border-[1.5px] border-[#0F172A] bg-slate-50 p-3.5 sm:p-4 shadow-[2px_2px_0px_0px_#0F172A] space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-[#0F172A]">
                  Availability check
                </span>
                <span className="text-[11px] font-semibold text-slate-600">
                  {format(selectedDateObj, "EEE, MMM d")}
                </span>
              </div>

              {/* 1. Day Preview: Horizontal Bar 7 AM to 10 PM */}
              <div className="space-y-1.5">
                <div
                  data-testid="assign-day-preview"
                  className="relative h-9 rounded-lg border-[1.5px] border-[#0F172A] bg-white overflow-hidden shadow-inner flex items-center select-none"
                >
                  {isDateBlocked ? (
                    <div className="w-full h-full bg-[repeating-linear-gradient(45deg,#F1F5F9,#F1F5F9_5px,#CBD5E1_5px,#CBD5E1_10px)] flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-700 bg-white/90 px-2 py-0.5 rounded border border-slate-300">
                        Not available
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Availability Windows (Dashed green) */}
                      {daySchedule.availability.map((w, idx) => {
                        const leftPct = Math.max(
                          0,
                          Math.min(100, ((w.startMinutes - 7 * 60) / 900) * 100)
                        );
                        const widthPct = Math.max(
                          1,
                          Math.min(
                            100 - leftPct,
                            ((w.endMinutes - w.startMinutes) / 900) * 100
                          )
                        );
                        return (
                          <div
                            key={`avail-${idx}`}
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                            }}
                            className="absolute top-1 bottom-1 rounded border border-dashed border-[#16A34A] bg-[#F0FDF4] opacity-80"
                            title="Free window"
                          />
                        );
                      })}

                      {/* Classes (Solid Blue, No subject name) */}
                      {daySchedule.classes.map((c, idx) => {
                        const leftPct = Math.max(
                          0,
                          Math.min(100, ((c.startMinutes - 7 * 60) / 900) * 100)
                        );
                        const widthPct = Math.max(
                          1,
                          Math.min(
                            100 - leftPct,
                            ((c.endMinutes - c.startMinutes) / 900) * 100
                          )
                        );
                        return (
                          <div
                            key={`class-${idx}`}
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                            }}
                            className="absolute top-1 bottom-1 rounded border border-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] text-[9px] font-bold flex items-center justify-center overflow-hidden z-10"
                            title="In class. Tasks can't be assigned during class."
                          >
                            <span className="truncate px-0.5">In class</span>
                          </div>
                        );
                      })}

                      {/* Proposed Task Window (Ink Outline) */}
                      {proposedTaskMinutes.endMins > proposedTaskMinutes.startMins && (
                        (() => {
                          const leftPct = Math.max(
                            0,
                            Math.min(
                              100,
                              ((proposedTaskMinutes.startMins - 7 * 60) / 900) * 100
                            )
                          );
                          const widthPct = Math.max(
                            1,
                            Math.min(
                              100 - leftPct,
                              ((proposedTaskMinutes.endMins -
                                proposedTaskMinutes.startMins) /
                                900) *
                              100
                            )
                          );
                          return (
                            <div
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                              }}
                              className="absolute top-0.5 bottom-0.5 rounded border-2 border-[#0F172A] bg-[#0F172A]/15 text-[#0F172A] text-[9px] font-black flex items-center justify-center overflow-hidden z-20 shadow-xs"
                              title="Proposed task window"
                            >
                              <span className="truncate px-0.5">Task</span>
                            </div>
                          );
                        })()
                      )}
                    </>
                  )}
                </div>

                {/* Time markers: 7 AM, 12 PM, 5 PM, 10 PM */}
                <div className="flex justify-between text-[9px] font-bold text-slate-500 px-0.5">
                  <span>7 AM</span>
                  <span>12 PM</span>
                  <span>5 PM</span>
                  <span>10 PM</span>
                </div>

                {/* Day summary line */}
                <p className="text-[11px] text-slate-600 font-medium">
                  {`Daily limit ${dayCapacity.maxHours}h · ${dayCapacity.assignedHours}h already assigned · ${dayCapacity.remainingHours}h left`}
                </p>
              </div>

              {/* 2. Result Card */}
              <div
                data-testid="assign-check"
                data-state={checkState}
                role="status"
                aria-live="polite"
                className="space-y-2"
              >
                {checkState === "checking" && (
                  <div className="rounded-xl border-[1.5px] border-slate-300 bg-white p-3 space-y-2 shadow-[2px_2px_0px_0px_#94A3B8]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Loader2 className="size-3.5 animate-spin text-[#0F172A]" />
                      <span>Checking availability...</span>
                    </div>
                    <div className="h-2 w-3/4 rounded bg-slate-200 animate-pulse" />
                  </div>
                )}

                {checkState === "error" && (
                  <div className="rounded-xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-3 text-xs text-[#991B1B] shadow-[2px_2px_0px_0px_#DC2626] flex items-center justify-between gap-2">
                    <span className="font-semibold">Couldn&apos;t check right now.</span>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={runConflictCheck}
                      className="gap-1 cursor-pointer bg-white border-[#DC2626] text-[#991B1B] hover:bg-red-100"
                    >
                      <RefreshCw className="size-3" />
                      <span>Retry</span>
                    </Button>
                  </div>
                )}

                {checkState === "block" && conflictResult && (
                  <div className="rounded-xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-3 text-xs text-[#991B1B] shadow-[2px_2px_0px_0px_#DC2626] space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>This time isn&apos;t available.</span>
                    </div>
                    <ul className="space-y-1 pl-6 list-disc text-[11px] font-medium">
                      {conflictResult.conflicts
                        .filter((c) => c.severity === "BLOCK")
                        .map((c, idx) => (
                          <li
                            key={`block-${idx}`}
                            data-testid="assign-conflict-item"
                            data-type={c.type}
                          >
                            {c.message}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {checkState === "warn" && conflictResult && (
                  <div className="rounded-xl border-[1.5px] border-[#D97706] bg-[#FFFBEB] p-3 text-xs text-[#92400E] shadow-[2px_2px_0px_0px_#D97706] space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="size-4 shrink-0 text-[#D97706]" />
                      <span>
                        {`Heads up. You can still send this. ${studentFirstName} will see the warning and decide.`}
                      </span>
                    </div>
                    <ul className="space-y-1 pl-6 list-disc text-[11px] font-medium">
                      {conflictResult.conflicts
                        .filter((c) => c.severity === "WARN")
                        .map((c, idx) => (
                          <li
                            key={`warn-${idx}`}
                            data-testid="assign-conflict-item"
                            data-type={c.type}
                          >
                            {c.message}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {checkState === "ok" && (
                  <div className="rounded-xl border-[1.5px] border-[#16A34A] bg-[#F0FDF4] p-3 text-xs text-[#166534] shadow-[2px_2px_0px_0px_#16A34A] flex items-center gap-2 font-bold">
                    <CheckCircle2 className="size-4 shrink-0 text-[#16A34A]" />
                    <span>{`No conflicts. This time works for ${studentFirstName}.`}</span>
                  </div>
                )}
              </div>

              {/* 3. Suggestions */}
              <div className="space-y-2 pt-1 border-t border-slate-200">
                <span className="font-bold text-xs text-[#0F172A] block">
                  {checkState === "block" || checkState === "warn"
                    ? "Try one of these instead"
                    : `Free times that fit ${formatHours(estHours)}`}
                </span>

                {suggestions.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">
                    No free time fits {formatHours(estHours)} in the next 14 days.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {suggestions.map((slot, idx) => {
                      const compStart = toManilaTimeComponents(slot.start);
                      const compEnd = toManilaTimeComponents(slot.end);
                      const targetDateKey = compStart.dateKey;
                      const targetStart24 = minutesToTimeString(
                        compStart.minutesFromMidnight,
                        true
                      );
                      const targetEnd24 = minutesToTimeString(
                        compEnd.minutesFromMidnight,
                        true
                      );
                      const startFmt = minutesToTimeString(
                        compStart.minutesFromMidnight
                      );
                      const endFmt = minutesToTimeString(compEnd.minutesFromMidnight);
                      const dateFmt = format(compStart.manilaDate, "EEE, MMM d");
                      const label = `${dateFmt} · ${startFmt} - ${endFmt}`;

                      const isSelected =
                        dateStr === targetDateKey &&
                        startTimeStr === targetStart24 &&
                        endTimeStr === targetEnd24;

                      return (
                        <button
                          key={`sugg-${idx}`}
                          type="button"
                          data-testid="assign-suggestion"
                          data-start={startFmt}
                          onClick={() => handleApplySuggestion(slot)}
                          aria-label={`Select suggested slot ${label}`}
                          className={cn(
                            "flex items-center justify-between text-left text-xs rounded-lg p-2 transition-all cursor-pointer border-[1.5px]",
                            isSelected
                              ? "border-[#0F172A] bg-[#0F172A] text-white shadow-[2px_2px_0px_0px_#0F172A]"
                              : "border-slate-300 bg-white text-[#0F172A] hover:bg-[#FAF7F2] hover:border-[#0F172A]"
                          )}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            <Clock className={cn("size-3.5", isSelected ? "text-white" : "text-[#16A34A]")} />
                            <span>{label}</span>
                          </div>
                          <span
                            className={cn(
                              "text-[10px] font-semibold",
                              isSelected ? "text-slate-200" : "text-slate-500"
                            )}
                          >
                            {formatHours(slot.minutes / 60)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER (Sticky with buttons, double-submit protection) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 border-t-[1.5px] border-[#0F172A] bg-[#FAF7F2] shrink-0">
          <div className="text-xs text-slate-600 font-medium order-2 sm:order-1 text-center sm:text-left">
            {checkState === "block" && (
              <span className="text-[#DC2626] font-bold">
                Pick a different time to continue.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end order-1 sm:order-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              data-testid="assign-cancel"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial h-10 px-4 font-bold text-xs sm:text-sm cursor-pointer bg-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#FAF7F2]"
            >
              Cancel
            </Button>
            <Button
              form="assign-task-form"
              type="submit"
              data-testid="assign-submit"
              disabled={isSubmitDisabled}
              className={cn(
                "flex-1 sm:flex-initial h-10 px-5 font-bold text-xs sm:text-sm cursor-pointer border-[1.5px] transition-all",
                checkState === "warn"
                  ? "bg-[#D97706] text-white border-[#D97706] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#B45309]"
                  : "bg-[#0F172A] text-white border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800"
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Assigning...</span>
                </span>
              ) : checkState === "warn" ? (
                "Assign anyway"
              ) : (
                "Assign task"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
