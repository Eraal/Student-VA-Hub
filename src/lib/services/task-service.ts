import { prisma } from "../prisma";
import { TaskStatus, StudentResponse } from "@prisma/client";
import { checkConflict, ConflictCheckResult } from "../conflict";
import { createNotification } from "../notifications";
import type {
  CreateTaskInput,
  CheckTaskConflictInput,
} from "../validations/task";

export interface TaskWithDetails {
  id: string;
  clientId: string;
  studentId: string;
  title: string;
  description: string | null;
  startAt: Date;
  dueAt: Date;
  estHours: number;
  hoursWarning?: boolean;
  status: TaskStatus;
  studentResponse: StudentResponse | null;
  rescheduleReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  clientName?: string;
  studentName?: string;
  loggedHours: number;
}

/**
 * Finds the active linked student for a client.
 */
export async function getLinkedStudentForClient(clientId: string) {
  const link = await prisma.clientStudentLink.findFirst({
    where: { clientId, status: "ACTIVE" },
    include: {
      student: {
        include: {
          studentProfile: true,
        },
      },
    },
  });

  if (!link || !link.student) {
    return null;
  }

  return {
    linkId: link.id,
    hourlyRate: link.hourlyRate,
    student: link.student,
    profile: link.student.studentProfile,
  };
}

/**
 * Evaluates live conflict check for a proposed task without saving to database.
 */
export async function checkTaskConflictForClient(
  clientId: string,
  input: CheckTaskConflictInput
): Promise<
  ConflictCheckResult & {
    student: { id: string; name: string } | null;
  }
> {
  const linked = await getLinkedStudentForClient(clientId);
  if (!linked) {
    return {
      ok: false,
      hasWarnings: false,
      conflicts: [
        {
          type: "OUTSIDE_AVAILABILITY",
          severity: "BLOCK",
          message: "No active linked student found. Please link a student using their invite code first.",
        },
      ],
      student: null,
    };
  }

  const studentId = linked.student.id;
  const studentName = linked.student.name;

  const [classes, availability, existingTasks, blockedDates] = await Promise.all([
    prisma.classSchedule.findMany({
      where: { studentId },
      select: { dayOfWeek: true, startMinutes: true, endMinutes: true, subject: true },
    }),
    prisma.availability.findMany({
      where: { studentId },
      select: { dayOfWeek: true, startMinutes: true, endMinutes: true },
    }),
    prisma.task.findMany({
      where: {
        studentId,
        status: { in: [TaskStatus.TODO, TaskStatus.DOING] },
      },
      select: { id: true, startAt: true, dueAt: true, estHours: true, status: true },
    }),
    prisma.blockedDate.findMany({
      where: { studentId },
      select: { dateStart: true, dateEnd: true, reason: true },
    }),
  ]);

  const maxHours = linked.profile?.maxHoursPerDay ?? 4.0;

  const result = checkConflict(
    {
      startAt: input.startAt,
      dueAt: input.dueAt,
      estHours: input.estHours,
    },
    classes,
    availability,
    existingTasks,
    maxHours,
    {
      studentName,
      blockedDates,
    }
  );

  return {
    ...result,
    student: { id: studentId, name: studentName },
  };
}

/**
 * Creates a new task. Hard conflicts (e.g. class overlap) strictly block creation.
 */
export async function createTask(clientId: string, input: CreateTaskInput) {
  const linked = await getLinkedStudentForClient(clientId);
  if (!linked) {
    throw new Error("No active student linked. Cannot assign task.");
  }

  const studentId = linked.student.id;

  // Run server-side conflict check before creating
  const conflictCheck = await checkTaskConflictForClient(clientId, {
    startAt: input.startAt,
    dueAt: input.dueAt,
    estHours: input.estHours,
  });

  if (!conflictCheck.ok) {
    const blockReason =
      conflictCheck.conflicts.find((c) => c.severity === "BLOCK")?.message ??
      "Cannot assign task due to a scheduling conflict with student's classes.";
    throw new Error(blockReason);
  }

  const result = await prisma.$transaction(async (tx) => {
    // Duplicate guard: reject if an identical task was created in the last 15 seconds
    const fifteenSecondsAgo = new Date(Date.now() - 15000);
    const duplicate = await tx.task.findFirst({
      where: {
        clientId,
        studentId,
        title: input.title.trim(),
        startAt: new Date(input.startAt),
        createdAt: { gte: fifteenSecondsAgo },
      },
    });
    if (duplicate) {
      throw new Error("This task was just created.");
    }

    const clientUser = await tx.user.findUnique({
      where: { id: clientId },
      select: { name: true },
    });
    const clientName = clientUser?.name || "Client";

    let warningSuffix = "";
    if (conflictCheck.conflicts.some((c) => c.type === "EXCEEDS_AVAILABLE_HOURS")) {
      warningSuffix = " Warning: Exceeds available hours.";
    } else if (conflictCheck.conflicts.some((c) => c.type === "OUTSIDE_AVAILABILITY")) {
      warningSuffix = " Warning: Outside regular hours.";
    }

    const created = await tx.task.create({
      data: {
        clientId,
        studentId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        startAt: new Date(input.startAt),
        dueAt: new Date(input.dueAt),
        estHours: input.estHours,
        hoursWarning: conflictCheck.conflicts.some(
          (conflict) => conflict.type === "EXCEEDS_AVAILABLE_HOURS"
        ),
        status: TaskStatus.TODO,
      },
    });

    const message = warningSuffix
      ? `${clientName} assigned you a task: ${created.title}.${warningSuffix}`
      : `${clientName} assigned you a task: ${created.title}`;

    await createNotification(tx, {
      recipientId: studentId,
      actorId: clientId,
      type: "TASK_ASSIGNED",
      message,
    });

    return created;
  });

  return {
    task: result,
    hasWarnings: conflictCheck.hasWarnings,
    warnings: conflictCheck.conflicts.filter((c) => c.severity === "WARN"),
  };
}

/**
 * Retrieves tasks for a client, optionally filtered by status.
 */
export async function getClientTasks(
  clientId: string,
  statusFilter?: TaskStatus
): Promise<TaskWithDetails[]> {
  const tasks = await prisma.task.findMany({
    where: {
      clientId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: {
      student: { select: { name: true } },
      timeLogs: { select: { totalHours: true } },
    },
    orderBy: { startAt: "asc" },
  });

  return tasks.map((t) => {
    const loggedHours = t.timeLogs.reduce((acc, log) => acc + (log.totalHours ?? 0), 0);
    return {
      id: t.id,
      clientId: t.clientId,
      studentId: t.studentId,
      title: t.title,
      description: t.description,
      startAt: t.startAt,
      dueAt: t.dueAt,
      estHours: t.estHours,
      hoursWarning: t.hoursWarning,
      status: t.status,
      studentResponse: t.studentResponse,
      rescheduleReason: t.rescheduleReason,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      studentName: t.student.name,
      loggedHours,
    };
  });
}

/**
 * Retrieves tasks for a student, optionally filtered by status.
 */
export async function getStudentTasks(
  studentId: string,
  statusFilter?: TaskStatus
): Promise<TaskWithDetails[]> {
  const tasks = await prisma.task.findMany({
    where: {
      studentId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: {
      client: { select: { name: true } },
      timeLogs: { select: { totalHours: true } },
    },
    orderBy: { startAt: "asc" },
  });

  return tasks.map((t) => {
    const loggedHours = t.timeLogs.reduce((acc, log) => acc + (log.totalHours ?? 0), 0);
    return {
      id: t.id,
      clientId: t.clientId,
      studentId: t.studentId,
      title: t.title,
      description: t.description,
      startAt: t.startAt,
      dueAt: t.dueAt,
      estHours: t.estHours,
      hoursWarning: t.hoursWarning,
      status: t.status,
      studentResponse: t.studentResponse,
      rescheduleReason: t.rescheduleReason,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      clientName: t.client.name,
      loggedHours,
    };
  });
}

/**
 * Retrieves a single task by ID with authorization check.
 */
export async function getTaskById(taskId: string, userId: string): Promise<TaskWithDetails | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      client: { select: { name: true } },
      student: { select: { name: true } },
      timeLogs: { select: { totalHours: true } },
    },
  });

  if (!task || (task.clientId !== userId && task.studentId !== userId)) {
    return null;
  }

  const loggedHours = task.timeLogs.reduce((acc, log) => acc + (log.totalHours ?? 0), 0);

  return {
    id: task.id,
    clientId: task.clientId,
    studentId: task.studentId,
    title: task.title,
    description: task.description,
    startAt: task.startAt,
    dueAt: task.dueAt,
    estHours: task.estHours,
    hoursWarning: task.hoursWarning,
    status: task.status,
    studentResponse: task.studentResponse,
    rescheduleReason: task.rescheduleReason,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    clientName: task.client.name,
    studentName: task.student.name,
    loggedHours,
  };
}

/**
 * Updates a task's status (TODO -> DOING -> DONE).
 */
export async function updateTaskStatus(
  taskId: string,
  userId: string,
  newStatus: TaskStatus
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || (task.clientId !== userId && task.studentId !== userId)) {
    throw new Error("Task not found or unauthorized.");
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: newStatus },
  });

  return updated;
}

/**
 * Allows student to accept or request reschedule for a task.
 */
export async function respondToTask(
  taskId: string,
  studentId: string,
  response: StudentResponse,
  rescheduleReason?: string
) {
  return await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: {
        student: { select: { id: true, name: true } },
      },
    });

    if (!task || task.studentId !== studentId) {
      throw new Error("Task not found or unauthorized.");
    }

    // Atomic conditional update:
    // When accepting: only if studentResponse is currently null (not already accepted, not reschedule-requested)
    // When requesting reschedule: allow if currently null OR ACCEPTED, but reject if already RESCHEDULE_REQUESTED (no duplicate)
    // In both cases: task status must not be DONE
    const updatedResult = await tx.task.updateMany({
      where: {
        id: taskId,
        studentId,
        status: { not: TaskStatus.DONE },
        ...(response === "RESCHEDULE_REQUESTED"
          ? {
              OR: [
                { studentResponse: null },
                { studentResponse: StudentResponse.ACCEPTED },
              ],
            }
          : {
              studentResponse: null,
            }),
      },
      data: {
        studentResponse: response,
        rescheduleReason:
          response === "RESCHEDULE_REQUESTED" && rescheduleReason?.trim()
            ? rescheduleReason.trim().slice(0, 140)
            : null,
      },
    });

    if (updatedResult.count !== 1) {
      throw new Error("This was already done.");
    }

    const studentName = task.student.name || "Student";
    const truncatedReason = rescheduleReason?.trim()
      ? rescheduleReason.trim().slice(0, 140)
      : "";

    if (response === "ACCEPTED") {
      await createNotification(tx, {
        recipientId: task.clientId,
        actorId: studentId,
        type: "TASK_ACCEPTED",
        message: `${studentName} accepted: ${task.title}`,
      });
    } else if (response === "RESCHEDULE_REQUESTED") {
      const reasonPart = truncatedReason ? `. Reason: ${truncatedReason}` : "";
      await createNotification(tx, {
        recipientId: task.clientId,
        actorId: studentId,
        type: "RESCHEDULE_REQUESTED",
        message: `${studentName} asked to reschedule ${task.title}${reasonPart}`,
      });
    }

    return await tx.task.findUniqueOrThrow({ where: { id: taskId } });
  });
}

