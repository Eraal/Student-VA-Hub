"use client";

import * as React from "react";
import { FormattedTimeLog } from "@/lib/services/time-service";
import { timeInAction, timeOutAction } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, Square, Loader2, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { TaskStatus } from "@prisma/client";

interface TimerCardProps {
  activeLog: FormattedTimeLog | null;
  availableTasks: { id: string; title: string; status: TaskStatus }[];
  preselectedTaskId?: string;
  onSuccess: () => void;
}

export function TimerCard({
  activeLog,
  availableTasks,
  preselectedTaskId,
  onSuccess,
}: TimerCardProps) {
  const [selectedTaskId, setSelectedTaskId] = React.useState<string>(
    preselectedTaskId ?? (availableTasks[0]?.id || "")
  );
  const [workNotes, setWorkNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Live ticking counter
  const [elapsedSeconds, setElapsedSeconds] = React.useState<number>(0);

  React.useEffect(() => {
    if (!activeLog) {
      setElapsedSeconds(0);
      return;
    }

    const startTimeMs = new Date(activeLog.timeIn).getTime();

    const updateTimer = () => {
      const nowMs = Date.now();
      const diffSecs = Math.max(0, Math.floor((nowMs - startTimeMs) / 1000));
      setElapsedSeconds(diffSecs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeLog]);

  const formatElapsedTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTimeIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId) {
      setServerError("Please select a task to track time for.");
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await timeInAction({ taskId: selectedTaskId });
      if (!res.success) {
        setServerError(res.error ?? "Failed to Time In.");
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      onSuccess();
    } catch (err) {
      console.error(err);
      setServerError("An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

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
        setServerError(res.error ?? "Failed to Time Out.");
        setIsSubmitting(false);
        return;
      }

      setWorkNotes("");
      setIsSubmitting(false);
      onSuccess();
    } catch (err) {
      console.error(err);
      setServerError("An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  const isTimerRunning = Boolean(activeLog);

  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`flex size-7 items-center justify-center rounded-md ${
                isTimerRunning
                  ? "bg-[var(--color-work-bg)] text-[var(--color-work)]"
                  : "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
              }`}
            >
              <Clock className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-[var(--color-text)]">
                {isTimerRunning ? "Active Work Session" : "Track Virtual Assistant Hours"}
              </CardTitle>
              <CardDescription className="text-xs text-[var(--color-muted)]">
                Single open log enforced. All logged times are converted into approved invoices.
              </CardDescription>
            </div>
          </div>

          {isTimerRunning && (
            <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-work-bg)] border border-green-200 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-work)]">
              <span className="size-2 rounded-full bg-[var(--color-work)] animate-pulse" />
              <span>TIMER RUNNING</span>
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {serverError && (
          <div className="flex items-start gap-2 rounded-md border border-[var(--color-conflict)] bg-[var(--color-conflict-bg)] p-2.5 text-xs text-[var(--color-conflict)]">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {isTimerRunning && activeLog ? (
          /* ========================================================= */
          /* ACTIVE TIMER STATE                                        */
          /* ========================================================= */
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] py-6 px-4 space-y-2 text-center">
              <div className="text-4xl sm:text-5xl font-mono font-bold tracking-wider text-[var(--color-text)]">
                {formatElapsedTime(elapsedSeconds)}
              </div>
              <div className="text-xs font-semibold text-[var(--color-text)]">
                Working on: {activeLog.taskTitle}
              </div>
              <div className="text-[11px] text-[var(--color-muted)]">
                Started at{" "}
                {new Date(activeLog.timeIn).toLocaleTimeString("en-US", {
                  timeZone: "Asia/Manila",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}{" "}
                (Asia/Manila)
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="timer-notes"
                className="text-xs font-medium text-[var(--color-text)]"
              >
                Work Summary & Notes (Optional)
              </label>
              <textarea
                id="timer-notes"
                rows={2}
                placeholder="What did you work on during this session? e.g. Researched lead contacts and formatted spreadsheet."
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
                maxLength={500}
              />
            </div>

            {/* BIG TIME OUT BUTTON */}
            <Button
              type="button"
              onClick={handleTimeOut}
              disabled={isSubmitting}
              className="w-full bg-[var(--color-conflict)] text-white hover:bg-[var(--color-conflict)]/90 h-11 text-sm font-semibold rounded-md flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Computing hours...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Square className="size-4 fill-white" />
                  <span>Time Out (Stop Timer)</span>
                </span>
              )}
            </Button>
          </div>
        ) : (
          /* ========================================================= */
          /* READY TO TIME IN STATE                                    */
          /* ========================================================= */
          <form onSubmit={handleTimeIn} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="select-task"
                className="text-xs font-medium text-[var(--color-text)]"
              >
                Select Task
              </label>

              {availableTasks.length === 0 ? (
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs text-[var(--color-muted)]">
                  No active tasks available. Your client must assign a task first.
                </div>
              ) : (
                <select
                  id="select-task"
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text)] focus:border-[var(--color-accent)] outline-none"
                  required
                >
                  {availableTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status === "DOING" ? "In Progress" : "To Do"})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* BIG TIME IN BUTTON */}
            <Button
              type="submit"
              disabled={isSubmitting || availableTasks.length === 0}
              className="w-full bg-[var(--color-work)] text-white hover:bg-[var(--color-work)]/90 h-11 text-sm font-semibold rounded-md flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Starting timer...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="size-4 fill-white" />
                  <span>Time In (Start Work)</span>
                </span>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

