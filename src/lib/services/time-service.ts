import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";
import { TimeLogStatus, CorrectionStatus, TaskStatus, StudentResponse } from "@prisma/client";
import { canStudentTimeIn } from "../conflict";
import type { CorrectionRequestInput } from "../validations/time";
import { createNotification } from "../notifications";
import { formatHours } from "../format";

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
  disputeReason?: string | null;
  disputeResponse?: string | null;
  createdAt: Date;
}

export interface StudentTimeTrackingData {
  activeLog: FormattedTimeLog | null;
  logs: FormattedTimeLog[];
  availableTasks: { id: string; title: string; status: TaskStatus }[];
  hourlyRate: number;
  hoursToday: number;
  hoursThisWeek: number;
}

export { calculateLoggedHours, calculateLoggedMinutes } from "@/lib/money";
import { calculateLoggedHours } from "@/lib/money";

/**
 * Retrieves student's active timer, historical logs, task picker options, and stats.
 */
export async function getStudentTimeData(studentId: string): Promise<StudentTimeTrackingData> {
  const [activeRaw, logsRaw, availableTasks, link] = await Promise.all([
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
        studentResponse: StudentResponse.ACCEPTED,
      },
      select: { id: true, title: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.clientStudentLink.findFirst({
      where: { studentId, status: "ACTIVE" },
      select: { hourlyRate: true },
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
      disputeReason: activeRaw.disputeReason,
      disputeResponse: activeRaw.disputeResponse,
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
    disputeReason: l.disputeReason,
    disputeResponse: l.disputeResponse,
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
    hourlyRate: link?.hourlyRate ?? 150,
    hoursToday: Math.round(hoursToday * 100) / 100,
    hoursThisWeek: Math.round(hoursThisWeek * 100) / 100,
  };
}

/**
 * Time In (Rule 4: Single open log enforced).
 */
export async function timeIn(studentId: string, taskId: string) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const openCount = await tx.timeLog.count({
          where: { studentId, status: TimeLogStatus.OPEN },
        });

        const ruleCheck = canStudentTimeIn(openCount);
        if (!ruleCheck.allowed) {
          throw new Error(ruleCheck.message ?? "A time log is already open.");
        }

        const task = await tx.task.findUnique({ where: { id: taskId } });
        if (!task || task.studentId !== studentId) {
          throw new Error("Task not found or unauthorized.");
        }

        if (task.status === TaskStatus.DONE) {
          throw new Error("Cannot track time on a completed task.");
        }

        if (task.studentResponse !== StudentResponse.ACCEPTED) {
          throw new Error("Accept this task before you start the timer.");
        }

        if (task.status === TaskStatus.TODO) {
          await tx.task.update({
            where: { id: taskId },
            data: { status: TaskStatus.DOING },
          });
        }

        return tx.timeLog.create({
          data: {
            studentId,
            taskId,
            timeIn: new Date(),
            status: TimeLogStatus.OPEN,
          },
          include: { task: { select: { title: true } } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      throw new Error("Another time log was started at the same time. Please try again.");
    }
    throw err;
  }
}

/**
 * Time Out: calculates totalHours, closes the log, and notifies client in one transaction.
 */
export async function timeOut(
  studentId: string,
  timeLogId: string,
  notes?: string
) {
  return await prisma.$transaction(async (tx) => {
    const activeLog = await tx.timeLog.findUnique({
      where: { id: timeLogId },
      include: {
        task: {
          include: {
            student: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!activeLog || activeLog.studentId !== studentId) {
      throw new Error("Active time log not found or unauthorized.");
    }

    if (activeLog.status !== TimeLogStatus.OPEN) {
      throw new Error("This was already done.");
    }

    const now = new Date();
    const totalHours = calculateLoggedHours(activeLog.timeIn, now);

    const updateResult = await tx.timeLog.updateMany({
      where: { id: timeLogId, studentId, status: TimeLogStatus.OPEN },
      data: {
        timeOut: now,
        totalHours,
        status: TimeLogStatus.CLOSED,
        correctionNote: notes?.trim() ? notes.trim() : null,
      },
    });

    if (updateResult.count !== 1) {
      throw new Error("This was already done.");
    }

    const studentName = activeLog.task.student.name || "Student";
    const formattedH = formatHours(totalHours);

    await createNotification(tx, {
      recipientId: activeLog.task.clientId,
      actorId: studentId,
      type: "HOURS_SUBMITTED",
      message: `${studentName} logged ${formattedH} on ${activeLog.task.title}`,
    });

    return await tx.timeLog.findUniqueOrThrow({
      where: { id: timeLogId },
      include: { task: { select: { title: true } } },
    });
  });
}

/**
 * Request correction for a forgotten Time Out or incorrect entry in one transaction.
 */
export async function requestCorrection(
  studentId: string,
  input: CorrectionRequestInput
) {
  return await prisma.$transaction(async (tx) => {
    const log = await tx.timeLog.findUnique({
      where: { id: input.timeLogId },
      include: {
        task: {
          include: {
            student: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!log || log.studentId !== studentId) {
      throw new Error("Time log not found or unauthorized.");
    }

    if (log.status !== TimeLogStatus.CLOSED) {
      throw new Error("Only a closed time log can be corrected.");
    }

    if (log.correctionStatus === CorrectionStatus.PENDING) {
      throw new Error("This was already done.");
    }

    const requestedTime = new Date(input.requestedTimeOut);
    if (requestedTime <= log.timeIn) {
      throw new Error("Requested time out must be after time in.");
    }

    const updateRes = await tx.timeLog.updateMany({
      where: {
        id: input.timeLogId,
        studentId,
        status: TimeLogStatus.CLOSED,
        correctionStatus: log.correctionStatus,
      },
      data: {
        requestedTimeOut: requestedTime,
        correctionNote: input.correctionNote.trim(),
        correctionStatus: CorrectionStatus.PENDING,
      },
    });

    if (updateRes.count !== 1) {
      throw new Error("This was already done.");
    }

    const studentName = log.task.student.name || "Student";

    await createNotification(tx, {
      recipientId: log.task.clientId,
      actorId: studentId,
      type: "CORRECTION_REQUESTED",
      message: `${studentName} requested a time correction on ${log.task.title}`,
    });

    return await tx.timeLog.findUniqueOrThrow({ where: { id: input.timeLogId } });
  });
}
