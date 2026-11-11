import { prisma } from "../prisma";
import { TimeLogStatus, CorrectionStatus, TaskStatus } from "@prisma/client";
import { canStudentTimeIn } from "../conflict";
import type { CorrectionRequestInput } from "../validations/time";

export interface FormattedTimeLog {
  id: string;
  studentId: string;
  taskId: string;
  taskTitle: string;
  timeIn: Date;
  timeOut: Date | null;
  totalHours: number | null;
  status: TimeLogStatus;
  correctionNote: string | null;
  requestedTimeOut: Date | null;
  correctionStatus: CorrectionStatus | null;
  createdAt: Date;
}

export interface StudentTimeTrackingData {
  activeLog: FormattedTimeLog | null;
  logs: FormattedTimeLog[];
  availableTasks: { id: string; title: string; status: TaskStatus }[];
  hoursToday: number;
  hoursThisWeek: number;
}

/**
 * Calculates logged hours rounded to 2 decimal places.
 * e.g. 180 minutes -> 3.00 hours.
 */
export function calculateLoggedHours(timeIn: Date, timeOut: Date): number {
  const diffMs = timeOut.getTime() - timeIn.getTime();
  if (diffMs <= 0) return 0.01;
  const hours = diffMs / (1000 * 60 * 60);
  return Math.max(0.01, Math.round(hours * 100) / 100);
}

/**
 * Retrieves student's active timer, historical logs, task picker options, and stats.
 */
export async function getStudentTimeData(studentId: string): Promise<StudentTimeTrackingData> {
  const [activeRaw, logsRaw, availableTasks] = await Promise.all([
    prisma.timeLog.findFirst({
      where: { studentId, status: TimeLogStatus.OPEN },
      include: { task: { select: { title: true } } },
    }),
    prisma.timeLog.findMany({
      where: { studentId },
      include: { task: { select: { title: true } } },
      orderBy: { timeIn: "desc" },
    }),
    prisma.task.findMany({
      where: {
        studentId,
        status: { in: [TaskStatus.TODO, TaskStatus.DOING] },
      },
      select: { id: true, title: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const activeLog: FormattedTimeLog | null = activeRaw
    ? {
        id: activeRaw.id,
        studentId: activeRaw.studentId,
        taskId: activeRaw.taskId,
        taskTitle: activeRaw.task.title,
        timeIn: activeRaw.timeIn,
        timeOut: activeRaw.timeOut,
        totalHours: activeRaw.totalHours,
        status: activeRaw.status,
        correctionNote: activeRaw.correctionNote,
        requestedTimeOut: activeRaw.requestedTimeOut,
        correctionStatus: activeRaw.correctionStatus,
        createdAt: activeRaw.createdAt,
      }
    : null;

  const logs: FormattedTimeLog[] = logsRaw.map((l) => ({
    id: l.id,
    studentId: l.studentId,
    taskId: l.taskId,
    taskTitle: l.task.title,
    timeIn: l.timeIn,
    timeOut: l.timeOut,
    totalHours: l.totalHours,
    status: l.status,
    correctionNote: l.correctionNote,
    requestedTimeOut: l.requestedTimeOut,
    correctionStatus: l.correctionStatus,
    createdAt: l.createdAt,
  }));

  // Calculate hours today and this week (in Manila local time)
  const now = new Date();
  const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
  const nowManila = new Date(now.getTime() + MANILA_OFFSET_MS);
  const todayKey = `${nowManila.getUTCFullYear()}-${(nowManila.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${nowManila.getUTCDate().toString().padStart(2, "0")}`;

  // Start of week (Sunday or Monday, 7 days back)
  const oneWeekAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  let hoursToday = 0;
  let hoursThisWeek = 0;

  for (const log of logs) {
    if (log.totalHours && log.totalHours > 0) {
      const logManila = new Date(log.timeIn.getTime() + MANILA_OFFSET_MS);
      const logKey = `${logManila.getUTCFullYear()}-${(logManila.getUTCMonth() + 1)
        .toString()
        .padStart(2, "0")}-${logManila.getUTCDate().toString().padStart(2, "0")}`;

      if (logKey === todayKey) {
        hoursToday += log.totalHours;
      }
      if (log.timeIn.getTime() >= oneWeekAgoMs) {
        hoursThisWeek += log.totalHours;
      }
    }
  }

  return {
    activeLog,
    logs,
    availableTasks,
    hoursToday: Math.round(hoursToday * 100) / 100,
    hoursThisWeek: Math.round(hoursThisWeek * 100) / 100,
  };
}

/**
 * Time In (Rule 4: Single open log enforced).
 */
export async function timeIn(studentId: string, taskId: string) {
  // Check if student already has an OPEN time log
  const openCount = await prisma.timeLog.count({
    where: {
      studentId,
      status: TimeLogStatus.OPEN,
    },
  });

  const ruleCheck = canStudentTimeIn(openCount);
  if (!ruleCheck.allowed) {
    throw new Error(ruleCheck.message ?? "A time log is already open.");
  }

  // Verify task belongs to student
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task || task.studentId !== studentId) {
    throw new Error("Task not found or unauthorized.");
  }

  // Auto-move task from TODO to DOING if needed
  if (task.status === TaskStatus.TODO) {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.DOING },
    });
  }

  const newLog = await prisma.timeLog.create({
    data: {
      studentId,
      taskId,
      timeIn: new Date(),
      status: TimeLogStatus.OPEN,
    },
    include: {
      task: { select: { title: true } },
    },
  });

  return newLog;
}

/**
 * Time Out: calculates totalHours and closes the log.
 */
export async function timeOut(
  studentId: string,
  timeLogId: string,
  notes?: string
) {
  const activeLog = await prisma.timeLog.findUnique({
    where: { id: timeLogId },
  });

  if (!activeLog || activeLog.studentId !== studentId) {
    throw new Error("Active time log not found or unauthorized.");
  }

  if (activeLog.status !== TimeLogStatus.OPEN) {
    throw new Error("This time log is already closed.");
  }

  const now = new Date();
  const totalHours = calculateLoggedHours(activeLog.timeIn, now);

  const updated = await prisma.timeLog.update({
    where: { id: timeLogId },
    data: {
      timeOut: now,
      totalHours,
      status: TimeLogStatus.CLOSED,
      correctionNote: notes?.trim() ? notes.trim() : null,
    },
    include: {
      task: { select: { title: true } },
    },
  });

  return updated;
}

/**
 * Request correction for a forgotten Time Out or incorrect entry.
 */
export async function requestCorrection(
  studentId: string,
  input: CorrectionRequestInput
) {
  const log = await prisma.timeLog.findUnique({
    where: { id: input.timeLogId },
    include: { task: true },
  });

  if (!log || log.studentId !== studentId) {
    throw new Error("Time log not found or unauthorized.");
  }

  const requestedTime = new Date(input.requestedTimeOut);
  if (requestedTime <= log.timeIn) {
    throw new Error("Requested time out must be after time in.");
  }

  const updated = await prisma.timeLog.update({
    where: { id: input.timeLogId },
    data: {
      requestedTimeOut: requestedTime,
      correctionNote: input.correctionNote.trim(),
      correctionStatus: CorrectionStatus.PENDING,
    },
  });

  // Notify client
  await prisma.notification.create({
    data: {
      userId: log.task.clientId,
      type: "CORRECTION_REQUESTED",
      message: `Student requested time correction for "${log.task.title}".`,
    },
  });

  return updated;
}
