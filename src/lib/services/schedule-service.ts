import { prisma } from "../prisma";
import {
  minutesToTimeString,
  minutesToDurationString,
  timeStringToMinutes,
  intervalsOverlap,
} from "../schedule-utils";
import type {
  ClassScheduleInput,
  ClassScheduleUpdateInput,
  AvailabilityInput,
  BlockedDateInput,
} from "../validations/schedule";
import { TaskStatus } from "@prisma/client";

export interface FormattedClass {
  id: string;
  studentId: string;
  subject: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  startTime: string;
  endTime: string;
  duration: string;
}

export interface FormattedAvailability {
  id: string;
  studentId: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  startTime: string;
  endTime: string;
  duration: string;
}

export interface FormattedBlockedDate {
  id: string;
  studentId: string;
  dateStart: Date;
  dateEnd: Date;
  reason: string | null;
}

export interface StudentScheduleData {
  classes: FormattedClass[];
  availabilities: FormattedAvailability[];
  maxHoursPerDay: number;
  blockedDates: FormattedBlockedDate[];
}

/**
 * Converts a UTC DateTime to Manila local day of week (0-6) and minutes from midnight (0-1439).
 */
export function utcToManilaDayAndMinutes(utcDate: Date): { dayOfWeek: number; minutes: number } {
  // Asia/Manila is UTC+8
  const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
  const manilaDate = new Date(utcDate.getTime() + MANILA_OFFSET_MS);

  const dayOfWeek = manilaDate.getUTCDay();
  const minutes = manilaDate.getUTCHours() * 60 + manilaDate.getUTCMinutes();

  return { dayOfWeek, minutes };
}

/**
 * Checks if a class schedule item overlaps any existing active tasks for the student (Two-way check).
 */
export async function checkClassOverlapsActiveTasks(
  studentId: string,
  dayOfWeek: number,
  startMinutes: number,
  endMinutes: number
): Promise<string | null> {
  const activeTasks = await prisma.task.findMany({
    where: {
      studentId,
      status: { in: [TaskStatus.TODO, TaskStatus.DOING] },
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      dueAt: true,
    },
  });

  for (const task of activeTasks) {
    const taskStart = utcToManilaDayAndMinutes(task.startAt);
    const taskDue = utcToManilaDayAndMinutes(task.dueAt);

    // If task starts on the same dayOfWeek
    if (taskStart.dayOfWeek === dayOfWeek) {
      if (intervalsOverlap(startMinutes, endMinutes, taskStart.minutes, taskDue.minutes)) {
        return `Overlaps existing task "${task.title}".`;
      }
    }
  }

  return null;
}

/**
 * Retrieves the complete schedule, availability, and capacity for a student.
 */
export async function getStudentSchedule(studentId: string): Promise<StudentScheduleData> {
  const [classesRaw, availRaw, profile, blockedRaw] = await Promise.all([
    prisma.classSchedule.findMany({
      where: { studentId },
      orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
    }),
    prisma.availability.findMany({
      where: { studentId },
      orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
    }),
    prisma.studentProfile.findUnique({
      where: { userId: studentId },
      select: { maxHoursPerDay: true },
    }),
    prisma.blockedDate.findMany({
      where: { studentId },
      orderBy: { dateStart: "asc" },
    }),
  ]);

  const classes: FormattedClass[] = classesRaw.map((c) => ({
    id: c.id,
    studentId: c.studentId,
    subject: c.subject,
    dayOfWeek: c.dayOfWeek,
    startMinutes: c.startMinutes,
    endMinutes: c.endMinutes,
    startTime: minutesToTimeString(c.startMinutes),
    endTime: minutesToTimeString(c.endMinutes),
    duration: minutesToDurationString(c.endMinutes - c.startMinutes),
  }));

  const availabilities: FormattedAvailability[] = availRaw.map((a) => ({
    id: a.id,
    studentId: a.studentId,
    dayOfWeek: a.dayOfWeek,
    startMinutes: a.startMinutes,
    endMinutes: a.endMinutes,
    startTime: minutesToTimeString(a.startMinutes),
    endTime: minutesToTimeString(a.endMinutes),
    duration: minutesToDurationString(a.endMinutes - a.startMinutes),
  }));

  const blockedDates: FormattedBlockedDate[] = blockedRaw.map((b) => ({
    id: b.id,
    studentId: b.studentId,
    dateStart: b.dateStart,
    dateEnd: b.dateEnd,
    reason: b.reason,
  }));

  return {
    classes,
    availabilities,
    maxHoursPerDay: profile?.maxHoursPerDay ?? 4.0,
    blockedDates,
  };
}

/**
 * Adds a new class schedule item.
 */
export async function addClassSchedule(studentId: string, input: ClassScheduleInput) {
  const startMinutes = timeStringToMinutes(input.startTime);
  const endMinutes = timeStringToMinutes(input.endTime);

  const overlapWarning = await checkClassOverlapsActiveTasks(
    studentId,
    input.dayOfWeek,
    startMinutes,
    endMinutes
  );

  const created = await prisma.classSchedule.create({
    data: {
      studentId,
      subject: input.subject.trim(),
      dayOfWeek: input.dayOfWeek,
      startMinutes,
      endMinutes,
    },
  });

  return {
    classItem: created,
    warning: overlapWarning,
  };
}

/**
 * Updates an existing class schedule item.
 */
export async function updateClassSchedule(studentId: string, input: ClassScheduleUpdateInput) {
  const existing = await prisma.classSchedule.findUnique({
    where: { id: input.id },
  });

  if (!existing || existing.studentId !== studentId) {
    throw new Error("Class schedule item not found or unauthorized.");
  }

  const startMinutes = timeStringToMinutes(input.startTime);
  const endMinutes = timeStringToMinutes(input.endTime);

  const overlapWarning = await checkClassOverlapsActiveTasks(
    studentId,
    input.dayOfWeek,
    startMinutes,
    endMinutes
  );

  const updated = await prisma.classSchedule.update({
    where: { id: input.id },
    data: {
      subject: input.subject.trim(),
      dayOfWeek: input.dayOfWeek,
      startMinutes,
      endMinutes,
    },
  });

  return {
    classItem: updated,
    warning: overlapWarning,
  };
}

/**
 * Deletes a class schedule item.
 */
export async function deleteClassSchedule(studentId: string, classId: string) {
  const existing = await prisma.classSchedule.findUnique({
    where: { id: classId },
  });

  if (!existing || existing.studentId !== studentId) {
    throw new Error("Class schedule item not found or unauthorized.");
  }

  await prisma.classSchedule.delete({
    where: { id: classId },
  });

  return { success: true };
}

/**
 * Adds a recurring availability window.
 */
export async function addAvailability(studentId: string, input: AvailabilityInput) {
  const startMinutes = timeStringToMinutes(input.startTime);
  const endMinutes = timeStringToMinutes(input.endTime);

  const created = await prisma.availability.create({
    data: {
      studentId,
      dayOfWeek: input.dayOfWeek,
      startMinutes,
      endMinutes,
    },
  });

  return created;
}

/**
 * Deletes an availability window.
 */
export async function deleteAvailability(studentId: string, availabilityId: string) {
  const existing = await prisma.availability.findUnique({
    where: { id: availabilityId },
  });

  if (!existing || existing.studentId !== studentId) {
    throw new Error("Availability item not found or unauthorized.");
  }

  await prisma.availability.delete({
    where: { id: availabilityId },
  });

  return { success: true };
}

/**
 * Updates student maximum hours per day.
 */
export async function updateMaxHours(studentId: string, maxHours: number) {
  const updated = await prisma.studentProfile.upsert({
    where: { userId: studentId },
    update: { maxHoursPerDay: maxHours },
    create: {
      userId: studentId,
      school: "Not set",
      course: "Not set",
      year: 1,
      maxHoursPerDay: maxHours,
    },
  });

  return updated;
}

/**
 * Adds a blocked date range.
 */
export async function addBlockedDate(studentId: string, input: BlockedDateInput) {
  const dateStart = new Date(input.dateStart);
  const dateEnd = new Date(input.dateEnd);

  const created = await prisma.blockedDate.create({
    data: {
      studentId,
      dateStart,
      dateEnd,
      reason: input.reason?.trim() ? input.reason.trim() : null,
    },
  });

  return created;
}

/**
 * Deletes a blocked date.
 */
export async function deleteBlockedDate(studentId: string, blockedDateId: string) {
  const existing = await prisma.blockedDate.findUnique({
    where: { id: blockedDateId },
  });

  if (!existing || existing.studentId !== studentId) {
    throw new Error("Blocked date not found or unauthorized.");
  }

  await prisma.blockedDate.delete({
    where: { id: blockedDateId },
  });

  return { success: true };
}
