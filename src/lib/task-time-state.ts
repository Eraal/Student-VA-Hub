import { TaskStatus, StudentResponse } from "@prisma/client";
import { formatHours } from "./format";

export interface ActiveTimeLogSummary {
  id: string;
  taskId: string;
  timeIn: Date | string;
}

export type TaskTimeActionState =
  | {
    type: "RUNNING";
    elapsedFormatted: string;
    activeLogId: string;
  }
  | {
    type: "BLOCKED_BY_OTHER_SESSION";
    reason: string;
  }
  | {
    type: "CAN_TIME_IN";
    href: string;
  }
  | {
    type: "NONE";
  };

/**
 * Formats elapsed duration between timeIn and now into a clean human string (e.g. "15m", "1h 12m", "45s").
 */
export function formatElapsedDuration(
  timeIn: Date | string,
  now: Date = new Date()
): string {
  const startMs = new Date(timeIn).getTime();
  const nowMs = now.getTime();
  const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Pure function to determine button state and time actions for a student task.
 * Rule:
 * 1. If task is DONE or not ACCEPTED -> NONE
 * 2. If task has the OPEN time log -> RUNNING with elapsed duration
 * 3. If another task has the OPEN time log -> BLOCKED_BY_OTHER_SESSION ("Finish your current session first")
 * 4. Otherwise -> CAN_TIME_IN
 */
export function getTaskTimeActionState(
  task: {
    id: string;
    status: TaskStatus;
    studentResponse: StudentResponse | null;
  },
  activeLog: ActiveTimeLogSummary | null | undefined,
  now: Date = new Date()
): TaskTimeActionState {
  if (task.status === TaskStatus.DONE) {
    return { type: "NONE" };
  }

  // If this task has the open log, show Running indicator and Time out action
  if (activeLog && activeLog.taskId === task.id) {
    return {
      type: "RUNNING",
      elapsedFormatted: formatElapsedDuration(activeLog.timeIn, now),
      activeLogId: activeLog.id,
    };
  }

  if (task.studentResponse !== StudentResponse.ACCEPTED) {
    return { type: "NONE" };
  }

  if (activeLog && activeLog.taskId !== task.id) {
    return {
      type: "BLOCKED_BY_OTHER_SESSION",
      reason: "Finish your current session first",
    };
  }

  return {
    type: "CAN_TIME_IN",
    href: `/student/time?taskId=${task.id}`,
  };
}

/**
 * Formats the logged hours string with "(running)" indicator when this task has an active session.
 */
export function formatTaskLoggedHours(
  loggedHours: number,
  estHours: number,
  isRunning: boolean
): { text: string; isRunning: boolean } {
  const base = `${formatHours(loggedHours)} of ${formatHours(estHours)} logged`;
  return {
    text: isRunning ? `${base} (running)` : base,
    isRunning,
  };
}

