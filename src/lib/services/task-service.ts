import { prisma } from "../prisma";
import { TaskStatus, StudentResponse } from "@prisma/client";
import { checkConflict, ConflictCheckResult } from "../conflict";
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

  const created = await prisma.task.create({
    data: {
      clientId,
      studentId,
      title: input.title.trim(),
      description: input.description?.trim() ? input.description.trim() : null,
      startAt: new Date(input.startAt),
      dueAt: new Date(input.dueAt),
      estHours: input.estHours,
      status: TaskStatus.TODO,
    },
  });

  // Create notification for student
  await prisma.notification.create({
    data: {
      userId: studentId,
      type: "TASK_ASSIGNED",
      message: `New task assigned: "${created.title}"`,
    },
  });

  return {
    task: created,
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
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.studentId !== studentId) {
    throw new Error("Task not found or unauthorized.");
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      studentResponse: response,
      rescheduleReason: response === "RESCHEDULE_REQUESTED" ? rescheduleReason?.trim() : null,
    },
  });

  if (response === "RESCHEDULE_REQUESTED") {
    await prisma.notification.create({
      data: {
        userId: task.clientId,
        type: "RESCHEDULE_REQUESTED",
        message: `Student requested reschedule for "${task.title}": ${rescheduleReason ?? ""}`,
      },
    });
  }

  return updated;
}

