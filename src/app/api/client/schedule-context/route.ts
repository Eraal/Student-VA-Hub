import { NextResponse } from "next/server";
import { verifyApiRole } from "@/lib/auth-helpers";
import { Role, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLinkedStudentForClient } from "@/lib/services/task-service";

/**
 * GET /api/client/schedule-context
 * Returns sanitized schedule, availability, blocked dates, and capacity
 * for the client's currently linked student.
 *
 * STRICT PRIVACY: Subject names and blocked reasons are NEVER queried or returned.
 */
export async function GET() {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 });
  }

  try {
    const linked = await getLinkedStudentForClient(authCheck.user.id);
    if (!linked) {
      return NextResponse.json(
        { error: "No linked student found." },
        { status: 404 }
      );
    }

    const studentId = linked.student.id;
    const studentName = linked.student.name;

    const [classesRaw, availabilityRaw, existingTasksRaw, blockedDatesRaw] =
      await Promise.all([
        prisma.classSchedule.findMany({
          where: { studentId },
          select: {
            id: true,
            dayOfWeek: true,
            startMinutes: true,
            endMinutes: true,
            // PRIVACY: subject is intentionally NOT selected
          },
          orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
        }),
        prisma.availability.findMany({
          where: { studentId },
          select: {
            id: true,
            dayOfWeek: true,
            startMinutes: true,
            endMinutes: true,
          },
          orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
        }),
        prisma.task.findMany({
          where: {
            studentId,
            status: { in: [TaskStatus.TODO, TaskStatus.DOING] },
          },
          select: {
            id: true,
            startAt: true,
            dueAt: true,
            estHours: true,
            status: true,
          },
          orderBy: { startAt: "asc" },
        }),
        prisma.blockedDate.findMany({
          where: { studentId },
          select: {
            id: true,
            dateStart: true,
            dateEnd: true,
            // PRIVACY: reason is intentionally NOT selected
          },
          orderBy: { dateStart: "asc" },
        }),
      ]);

    const maxHoursPerDay = linked.profile?.maxHoursPerDay ?? 4.0;

    return NextResponse.json({
      success: true,
      studentName,
      classes: classesRaw,
      availability: availabilityRaw,
      existingTasks: existingTasksRaw,
      blockedDates: blockedDatesRaw,
      maxHoursPerDay,
    });
  } catch (err) {
    console.error("GET /api/client/schedule-context error:", err);
    return NextResponse.json(
      { error: "Failed to load schedule context." },
      { status: 500 }
    );
  }
}

