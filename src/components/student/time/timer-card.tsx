"use client";

import * as React from "react";
import Link from "next/link";
import { FormattedTimeLog } from "@/lib/services/time-service";
import { timeInAction, timeOutAction } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDuration, formatTime, formatHours, formatDate } from "@/lib/format";
import { toUserErrorMessage } from "@/lib/errors";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Play, Square, Loader2, AlertTriangle, AlertCircle, RotateCcw } from "lucide-react";
import { TaskStatus } from "@prisma/client";

export interface StudentTimeTaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  dueAt: Date;
  clientName: string;
}

export interface EnrichedTimeLog extends FormattedTimeLog {
  clientName?: string;
}

interface TimerCardProps {
  activeLog: EnrichedTimeLog | null;
  availableTasks: StudentTimeTaskItem[];
  preselectedTaskId?: string;
  maxHoursPerDay?: number;
  hoursToday?: number;
  onSuccess: () => void;
}

export function TimerCard({
  activeLog,
  availableTasks,
  preselectedTaskId,
  maxHoursPerDay = 4,
  hoursToday = 0,
  onSuccess,
}: TimerCardProps) {
  // Resolve preselected task or default to first available
  const defaultTaskId = React.useMemo(() => {
    if (preselectedTaskId && availableTasks.some((t) => t.id === preselectedTaskId)) {
      return preselectedTaskId;
    }
    return availableTasks[0]?.id || "";
  }, [preselectedTaskId, availableTasks]);

  const [selectedTaskId, setSelectedTaskId] = React.useState<string>(defaultTaskId);
  const [workNotes, setWorkNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = React.useState<string>("");

  // Update selectedTaskId if defaultTaskId changes and no manual selection made
  React.useEffect(() => {
    if (defaultTaskId && !selectedTaskId) {
      setSelectedTaskId(defaultTaskId);
    }
  }, [defaultTaskId, selectedTaskId]);

  // Live ticking counter calculated from activeLog.timeIn (survives tab switch & refresh)
  const [elapsedSeconds, setElapsedSeconds] = React.useState<number>(() => {
    if (!activeLog?.timeIn) return 0;
    const startMs = new Date(activeLog.timeIn).getTime();
    return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  });

  React.useEffect(() => {
    if (!activeLog?.timeIn) {
      setElapsedSeconds(0);
      return;
    }

    const startTimeMs = new Date(activeLog.timeIn).getTime();
    const update = () => {
      const diffSecs = Math.max(0, Math.floor((Date.now() - startTimeMs) / 1000));
      setElapsedSeconds(diffSecs);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeLog]);

  // Group tasks into "In progress" and "To do"
  const doingTasks = React.useMemo(
    () => availableTasks.filter((t) => t.status === TaskStatus.DOING),
    [availableTasks]
  );
  const todoTasks = React.useMemo(
    () => availableTasks.filter((t) => t.status === TaskStatus.TODO),
    [availableTasks]
  );

  const selectedTask = React.useMemo(
    () => availableTasks.find((t) => t.id === selectedTaskId),
    [availableTasks, selectedTaskId]
  );

  const isTimerRunning = Boolean(activeLog);

  // Time In handler
  const handleTimeIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId) {
      toast.error("Please select a task to start the timer.");
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await timeInAction({ taskId: selectedTaskId });
      if (!res.success) {
        const errorMsg = toUserErrorMessage(res.error ?? "Failed to Time In.");
        setServerError(errorMsg);
        toast.error(errorMsg);
        setIsSubmitting(false);
        return;
      }

      const taskName = selectedTask?.title ?? "your task";
      setLiveAnnouncement(`Timer started for ${taskName}`);
      toast.success("Timer started");
      setIsSubmitting(false);
      onSuccess();
    } catch (err) {
      const errorMsg = toUserErrorMessage(err);
      setServerError(errorMsg);
      toast.error(errorMsg);
      setIsSubmitting(false);
    }
  };

  // Time Out handler
  const handleTimeOut = async () => {
    if (!activeLog) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await timeOutAction({
        timeLogId: activeLog.id,
        notes: workNotes.trim() || undefined,
      });

      if (!res.success) {
        const errorMsg = toUserErrorMessage(res.error ?? "Failed to Time Out.");
        setServerError(errorMsg);
        toast.error(errorMsg);
        setIsSubmitting(false);
        return;
      }

      const loggedHoursFormatted = formatHours(res.data?.totalHours ?? 0);
      setLiveAnnouncement(`Timer stopped. ${loggedHoursFormatted} logged.`);
      toast.success(`Timer stopped. ${loggedHoursFormatted} logged`);
      setWorkNotes("");
      setIsSubmitting(false);
      onSuccess();
    } catch (err) {
      const errorMsg = toUserErrorMessage(err);
      setServerError(errorMsg);
      toast.error(errorMsg);
      setIsSubmitting(false);
    }
  };

  // Daily meter calculations
  const maxSegments = Math.max(1, Math.round(maxHoursPerDay));
  const isOverLimit = hoursToday > maxHoursPerDay;

  return (
    <div className="w-full rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-6 sm:p-8 shadow-[3px_3px_0px_0px_#0F172A] space-y-6">
      {/* Screen-reader polite announcement on start/stop only */}
      <div className="sr-only" role="status" aria-live="polite">
        {liveAnnouncement}
      </div>

      {/* Error / Conflict Banner (Single Open Log block state) */}
      {serverError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-3.5 text-xs text-[#991B1B] shadow-[2px_2px_0px_0px_#DC2626]">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-[#DC2626]" />
            <div className="space-y-0.5">
              <span className="font-bold block">
                {serverError.includes("already")
                  ? "You already have a running timer"
                  : "Unable to update timer"}
              </span>
              <span>{serverError}</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => {
              setServerError(null);
              onSuccess();
            }}
            className="shrink-0 gap-1 text-[11px] border-[#DC2626] text-[#991B1B] hover:bg-red-100"
          >
            <RotateCcw className="size-3" />
            <span>Refresh</span>
          </Button>
        </div>
      )}

      {/* CLOCK READOUT (Focal Element) */}
      <div className="flex flex-col items-center justify-center space-y-3 py-2 text-center">
        <div
          data-testid="time-timer"
          aria-live="off"
          className={cn(
            "font-display text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight select-none tabular-nums transition-colors",
            isTimerRunning ? "text-[#0F172A]" : "text-slate-300"
          )}
        >
          {isTimerRunning ? formatDuration(elapsedSeconds) : "00:00:00"}
        </div>

        {/* Running state status line */}
        {isTimerRunning && activeLog ? (
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-[#0F172A]">
            <span className="size-2.5 rounded-full bg-[#16A34A] animate-pulse shrink-0" />
            <span>
              Working on <strong className="font-bold">{activeLog.taskTitle}</strong>
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-slate-500 font-medium">
              Started {formatTime(activeLog.timeIn)}
            </span>
          </div>
        ) : null}
      </div>

      {/* FORM CONTROLS: IDLE vs RUNNING */}
      {isTimerRunning && activeLog ? (
        /* ========================================================= */
        /* RUNNING STATE                                             */
        /* ========================================================= */
        <div className="space-y-5">
          {/* Read-only chip replacing task picker */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] px-4 py-2 text-xs sm:text-sm font-bold text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
              <span className="size-2 rounded-full bg-[#16A34A]" />
              <span className="truncate max-w-[280px] sm:max-w-md">{activeLog.taskTitle}</span>
              {activeLog.clientName && (
                <span className="text-slate-500 font-medium text-xs">
                  &bull; {activeLog.clientName}
                </span>
              )}
            </div>
          </div>

          {/* Session Notes Textarea */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="time-notes-input"
              className="text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Session notes
            </label>
            <textarea
              id="time-notes-input"
              data-testid="time-notes"
              rows={2}
              placeholder="Add a note (optional)"
              value={workNotes}
              onChange={(e) => setWorkNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border-[1.5px] border-[#0F172A] bg-white p-3 text-xs sm:text-sm text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] transition-all resize-none"
              maxLength={500}
            />
          </div>

          {/* Large Time Out Button (Student Home style) */}
          <Button
            type="button"
            data-testid="time-out"
            onClick={handleTimeOut}
            disabled={isSubmitting}
            className="w-full h-14 sm:h-[52px] text-base font-bold bg-[#DC2626] hover:bg-red-700 text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer gap-2.5 rounded-lg"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-5 animate-spin" />
                <span>Stopping timer...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Square className="size-5 fill-white" />
                <span>Time out</span>
              </span>
            )}
          </Button>
        </div>
      ) : (
        /* ========================================================= */
        /* IDLE STATE                                                */
        /* ========================================================= */
        <form onSubmit={handleTimeIn} className="space-y-5">
          {/* Task Picker with shadcn Select */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="task-select-trigger"
              className="text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Task
            </label>

            {availableTasks.length === 0 ? (
              <div className="rounded-lg border-[1.5px] border-[#0F172A]/40 bg-[#FAF7F2] p-3 text-xs text-slate-600 font-medium flex items-center justify-between gap-2">
                <span>Accept a task first to start the timer</span>
                <Link
                  href="/student/tasks"
                  className="font-bold text-[#0F172A] underline underline-offset-2 hover:text-[#0F172A]/80 shrink-0"
                >
                  Tasks
                </Link>
              </div>
            ) : (
              <Select
                value={selectedTaskId}
                onValueChange={(val) => {
                  setSelectedTaskId(val);
                  setServerError(null);
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id="task-select-trigger"
                  data-testid="time-task-select"
                  className="h-12 w-full"
                >
                  <SelectValue placeholder="Select a task to work on">
                    {selectedTask ? (
                      <span className="flex items-center gap-2 truncate">
                        <span className="font-bold text-[#0F172A] truncate">
                          {selectedTask.title}
                        </span>
                        <span className="text-xs text-slate-500 font-medium shrink-0">
                          &bull; {selectedTask.clientName}
                        </span>
                      </span>
                    ) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72 w-[var(--radix-select-trigger-width)]">
                  {doingTasks.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>In progress</SelectLabel>
                      {doingTasks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-1 pr-2">
                            <span className="font-bold text-[#0F172A] truncate">
                              {t.title}
                            </span>
                            <span className="text-xs text-slate-500 font-medium shrink-0">
                              {t.clientName} &bull; Due {formatDate(t.dueAt)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {doingTasks.length > 0 && todoTasks.length > 0 && <SelectSeparator />}

                  {todoTasks.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>To do</SelectLabel>
                      {todoTasks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-1 pr-2">
                            <span className="font-bold text-[#0F172A] truncate">
                              {t.title}
                            </span>
                            <span className="text-xs text-slate-500 font-medium shrink-0">
                              {t.clientName} &bull; Due {formatDate(t.dueAt)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Large Time In Button (Student Home style) */}
          <Button
            type="submit"
            data-testid="time-in"
            disabled={isSubmitting || availableTasks.length === 0}
            className="w-full h-14 sm:h-[52px] text-base font-bold bg-[#16A34A] hover:bg-green-700 text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer gap-2.5 rounded-lg"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-5 animate-spin" />
                <span>Starting timer...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="size-5 fill-white" />
                <span>Time in</span>
              </span>
            )}
          </Button>
        </form>
      )}

      {/* DAILY METER (Under the button) */}
      <div data-testid="time-daily-meter" className="space-y-2 pt-3 border-t border-[#E5DFD5]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-600">
            Today: <span className="text-[#0F172A] font-extrabold">{formatHours(hoursToday)}</span> of{" "}
            {formatHours(maxHoursPerDay)}
          </span>
          {isOverLimit ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#D97706]">
              <AlertTriangle className="size-3.5 text-[#D97706]" />
              <span>Over your daily limit</span>
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-slate-500">
              {formatHours(Math.max(0, maxHoursPerDay - hoursToday))} remaining
            </span>
          )}
        </div>

        {/* Segmented bar matching Student Home */}
        <div className="flex items-center gap-1.5 pt-0.5">
          {Array.from({ length: maxSegments }).map((_, i) => {
            const isFilled = hoursToday >= i + 1;
            const isPartial = !isFilled && hoursToday > i;
            return (
              <div
                key={i}
                className={cn(
                  "h-3 flex-1 rounded-md border-[1.5px] border-[#0F172A] transition-all overflow-hidden",
                  isFilled
                    ? "bg-[#16A34A]"
                    : isPartial
                      ? "bg-[#16A34A]/50"
                      : "bg-[#FAF7F2]"
                )}
                title={`Hour ${i + 1}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
