/**
 * Conflict Detector — Core Engine
 *
 * PURE FUNCTIONS ONLY. No Prisma, no database calls, no network requests.
 * Evaluates tasks against student schedule, classes, availability, and capacity.
 *
 * Rules (evaluated in order per SPEC §6):
 * 1. BLOCK, class overlap: taskStart < classEnd AND taskEnd > classStart (Privacy: Subject names are NEVER exposed).
 * 2. WARN, outside available hours: task window outside recurring availability slots.
 * 3. WARN, exceeds available hours: estHours > remaining capacity for that day.
 * 4. BLOCK, single open log: student cannot Time In if a log is already OPEN.
 * 5. WARN, two-way check: student schedule change overlaps an existing task.
 * 6. BLOCK, blocked dates: task falls within student's blocked date range.
 */

import {
  minutesToTimeString,
  getDayName,
  intervalsOverlap,
} from "./schedule-utils";

export type ConflictSeverity = "BLOCK" | "WARN";

export type ConflictType =
  | "CLASS_OVERLAP"
  | "BLOCKED_DATE"
  | "OUTSIDE_AVAILABILITY"
  | "EXCEEDS_AVAILABLE_HOURS";

export interface ConflictItem {
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
}

export interface ConflictCheckResult {
  ok: boolean;          // false if ANY "BLOCK" conflict exists (client cannot submit)
  hasWarnings: boolean; // true if any "WARN" conflict exists (client can submit with warning)
  conflicts: ConflictItem[];
}

export interface TaskCandidate {
  startAt: Date | string; // UTC
  dueAt: Date | string;   // UTC
  estHours: number;
  title?: string;
}

export interface ClassScheduleItem {
  dayOfWeek: number;    // 0 = Sun, 1 = Mon ... 6 = Sat
  startMinutes: number; // minutes from midnight in Manila (0-1439)
  endMinutes: number;   // minutes from midnight in Manila (0-1439)
  subject?: string;     // MUST NEVER be exposed in client-facing messages
}

export interface AvailabilityWindow {
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
}

export interface ExistingTaskItem {
  id?: string;
  startAt: Date | string;
  dueAt: Date | string;
  estHours: number;
  status?: string; // e.g. "TODO", "DOING"
}

export interface BlockedDateItem {
  dateStart: Date | string;
  dateEnd: Date | string;
  reason?: string | null;
}

export interface ConflictCheckOptions {
  studentName?: string;
  blockedDates?: BlockedDateItem[];
}

const MANILA_TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Converts a UTC Date or ISO string into Asia/Manila local date and time components.
 */
export function toManilaTimeComponents(dateInput: Date | string): {
  manilaDate: Date;
  dayOfWeek: number;
  minutesFromMidnight: number;
  year: number;
  month: number;
  day: number;
  dateKey: string; // YYYY-MM-DD in Manila
} {
  const utcDate = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(utcDate.getTime())) {
    throw new Error(`Invalid date input: ${String(dateInput)}`);
  }

  // Shift UTC by +8 hours to obtain exact Manila local date/time in UTC getters
  const manilaTime = new Date(utcDate.getTime() + MANILA_TIMEZONE_OFFSET_MS);

  const dayOfWeek = manilaTime.getUTCDay();
  const minutesFromMidnight = manilaTime.getUTCHours() * 60 + manilaTime.getUTCMinutes();
  const year = manilaTime.getUTCFullYear();
  const month = manilaTime.getUTCMonth();
  const day = manilaTime.getUTCDate();

  const mFormatted = (month + 1).toString().padStart(2, "0");
  const dFormatted = day.toString().padStart(2, "0");
  const dateKey = `${year}-${mFormatted}-${dFormatted}`;

  return {
    manilaDate: manilaTime,
    dayOfWeek,
    minutesFromMidnight,
    year,
    month,
    day,
    dateKey,
  };
}

/**
 * Core Conflict Detector function.
 * Evaluates whether a proposed task conflicts with a student's class schedule,
 * availability windows, capacity limits, or blocked dates.
 */
export function checkConflict(
  task: TaskCandidate,
  classes: ClassScheduleItem[],
  availability: AvailabilityWindow[],
  existingTasks: ExistingTaskItem[],
  maxHoursPerDay: number,
  options?: ConflictCheckOptions
): ConflictCheckResult {
  const studentName = options?.studentName?.trim() || "Student";
  const conflicts: ConflictItem[] = [];

  const taskStart = toManilaTimeComponents(task.startAt);
  const taskDue = toManilaTimeComponents(task.dueAt);

  // ---------------------------------------------------------------------------
  // Check 0: Blocked Dates (Severity: BLOCK)
  // ---------------------------------------------------------------------------
  if (options?.blockedDates && options.blockedDates.length > 0) {
    const taskStartMs = new Date(task.startAt).getTime();
    const taskDueMs = new Date(task.dueAt).getTime();

    for (const b of options.blockedDates) {
      const bStartMs = new Date(b.dateStart).getTime();
      const bEndMs = new Date(b.dateEnd).getTime();

      // Check date interval overlap
      if (taskStartMs <= bEndMs && taskDueMs >= bStartMs) {
        const reasonStr = b.reason ? ` (${b.reason})` : "";
        conflicts.push({
          type: "BLOCKED_DATE",
          severity: "BLOCK",
          message: `${studentName} is unavailable during this period${reasonStr}.`,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 1: Class Overlap (Severity: BLOCK)
  // Rule: taskStart < classEnd AND taskEnd > classStart on the same dayOfWeek.
  // Privacy Rule: The subject name is NEVER shown to the client.
  // ---------------------------------------------------------------------------
  const sameDayClasses = classes.filter((c) => c.dayOfWeek === taskStart.dayOfWeek);

  for (const c of sameDayClasses) {
    if (intervalsOverlap(taskStart.minutesFromMidnight, taskDue.minutesFromMidnight, c.startMinutes, c.endMinutes)) {
      const dayName = getDayName(taskStart.dayOfWeek);
      const classStartStr = minutesToTimeString(c.startMinutes);
      const classEndStr = minutesToTimeString(c.endMinutes);

      conflicts.push({
        type: "CLASS_OVERLAP",
        severity: "BLOCK",
        // Strict Privacy Rule: Never show subject name!
        message: `Conflict! ${studentName} has class ${dayName} ${classStartStr}–${classEndStr}.`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 2: Outside Available Hours (Severity: WARN)
  // Rule: The task window must be entirely contained within at least one
  // availability window on that day.
  // ---------------------------------------------------------------------------
  const sameDayWindows = availability.filter((a) => a.dayOfWeek === taskStart.dayOfWeek);

  const isWithinAnAvailabilityWindow = sameDayWindows.some(
    (win) =>
      taskStart.minutesFromMidnight >= win.startMinutes &&
      taskDue.minutesFromMidnight <= win.endMinutes
  );

  if (!isWithinAnAvailabilityWindow) {
    conflicts.push({
      type: "OUTSIDE_AVAILABILITY",
      severity: "WARN",
      message: `Task is scheduled outside ${studentName}'s set availability windows.`,
    });
  }

  // ---------------------------------------------------------------------------
  // Check 3: Exceeds Available Hours / Daily Capacity (Severity: WARN)
  // Rule: estHours > remaining available hours for that day or maxHoursPerDay.
  // ---------------------------------------------------------------------------
  // Calculate total window hours for the day if defined
  let dailyWindowHours = 0;
  for (const win of sameDayWindows) {
    dailyWindowHours += (win.endMinutes - win.startMinutes) / 60;
  }

  const effectiveDailyCapacity =
    dailyWindowHours > 0
      ? Math.min(maxHoursPerDay, dailyWindowHours)
      : maxHoursPerDay;

  // Sum hours of existing tasks on the same calendar day
  let existingHoursOnDay = 0;
  for (const existing of existingTasks) {
    // Exclude completed or cancelled tasks if status is present
    if (existing.status && existing.status === "DONE") continue;

    const existingTime = toManilaTimeComponents(existing.startAt);
    if (existingTime.dateKey === taskStart.dateKey) {
      existingHoursOnDay += existing.estHours;
    }
  }

  const remainingHours = Math.max(0, effectiveDailyCapacity - existingHoursOnDay);

  if (task.estHours > remainingHours) {
    conflicts.push({
      type: "EXCEEDS_AVAILABLE_HOURS",
      severity: "WARN",
      message: `Exceeds Available Hours (${task.estHours}h vs ${remainingHours}h remaining).`,
    });
  }

  // Determine overall status
  const hasBlock = conflicts.some((c) => c.severity === "BLOCK");
  const hasWarnings = conflicts.some((c) => c.severity === "WARN");

  return {
    ok: !hasBlock,
    hasWarnings,
    conflicts,
  };
}

/**
 * Check 4: Single Open TimeLog Rule (Rule 4 in SPEC §6).
 * A student cannot Time In if a TimeLog is already OPEN.
 */
export function canStudentTimeIn(openLogsCount: number): {
  allowed: boolean;
  message?: string;
} {
  if (openLogsCount > 0) {
    return {
      allowed: false,
      message: "A time log is already open. You must Time Out before starting a new log.",
    };
  }

  return { allowed: true };
}

/**
 * Check 5: Two-Way Conflict Check for Students (Rule 5 in SPEC §6).
 * When a student adds or edits a class, check if it overlaps any active assigned tasks.
 */
export function checkClassAgainstTasks(
  classItem: {
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
  },
  existingTasks: ExistingTaskItem[]
): {
  hasConflict: boolean;
  conflictingTaskTitle?: string;
  message?: string;
} {
  for (const t of existingTasks) {
    if (t.status === "DONE") continue;

    const taskTime = toManilaTimeComponents(t.startAt);
    const taskDue = toManilaTimeComponents(t.dueAt);

    if (taskTime.dayOfWeek === classItem.dayOfWeek) {
      if (
        intervalsOverlap(
          classItem.startMinutes,
          classItem.endMinutes,
          taskTime.minutesFromMidnight,
          taskDue.minutesFromMidnight
        )
      ) {
        return {
          hasConflict: true,
          conflictingTaskTitle: t.id || "Assigned task",
          message: `Warning: This class schedule overlaps an existing task.`,
        };
      }
    }
  }

  return { hasConflict: false };
}

