/**
 * Prisma seed script.
 * Run with: npx tsx prisma/seed.ts
 *
 * Creates:
 *  - 1 Student: Juan Dela Cruz (juan@example.com / demo1234)
 *  - 1 Client:  Maria Santos   (maria@example.com / demo1234)
 *  - ClientStudentLink (ACTIVE, PHP 150/hr)
 *  - InviteCode (already used by Maria)
 *  - StudentProfile for Juan
 *  - Weekly ClassSchedule for Juan
 *  - Weekly Availability for Juan
 *
 * Password note: "demo1234" is ONLY for local development seeding.
 * Never use demo passwords in production.
 */

import { PrismaClient, Role, LinkStatus, TaskStatus, StudentResponse, TimeLogStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateInviteCode } from "../src/lib/invite-code";
import { calculateLoggedHours } from "../src/lib/money";
import { approveTimeLog, markInvoicePaid, disputeTimeLog } from "../src/lib/services/invoice-service";
import { requestCorrection } from "../src/lib/services/time-service";
import { createNotification, NotificationType } from "../src/lib/notifications";
import { formatHours, formatPeso } from "../src/lib/format";

function assertSeedAllowed(scriptName: string = "prisma/seed.ts") {
  if (process.env.ALLOW_SEED === "1") {
    return;
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      `❌ [Seed Safety Guard]: ${scriptName} refused to run because NODE_ENV is 'production'.\n` +
      "To deliberately override this safety check, set ALLOW_SEED=1."
    );
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(
      `❌ [Seed Safety Guard]: ${scriptName} refused to run because DATABASE_URL is not set.\n` +
      "To deliberately override this safety check, set ALLOW_SEED=1."
    );
    process.exit(1);
  }

  let host = "";
  try {
    const parsed = new URL(dbUrl);
    host = parsed.hostname;
  } catch {
    const match = dbUrl.match(/@([^:/]+)/);
    if (match) {
      host = match[1];
    }
  }

  const allowedHosts = ["localhost", "127.0.0.1"];
  if (process.env.ALLOW_SEED_HOSTS) {
    const extraHosts = process.env.ALLOW_SEED_HOSTS.split(",").map((h) => h.trim()).filter(Boolean);
    allowedHosts.push(...extraHosts);
  }

  if (!host || !allowedHosts.includes(host)) {
    console.error(
      `❌ [Seed Safety Guard]: ${scriptName} refused to run because DATABASE_URL host '${host || "unknown"}' is not local.\n` +
      `Allowed hosts: ${allowedHosts.join(", ")}.\n` +
      "To deliberately override this safety check, set ALLOW_SEED=1."
    );
    process.exit(1);
  }
}

assertSeedAllowed("prisma/seed.ts");

const prisma = new PrismaClient();

// dayOfWeek: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
// minutes: e.g. 9*60 = 540 (9:00 AM Manila), 13*60 = 780 (1:00 PM Manila)

async function main() {
  console.log("🌱  Seeding database...");

  const DEMO_PASSWORD = "demo1234";
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // -------------------------------------------------------------------------
  // 1. Users
  // -------------------------------------------------------------------------
  const student = await prisma.user.upsert({
    where: { email: "juan@example.com" },
    update: { passwordHash, role: Role.STUDENT, name: "Juan Dela Cruz" },
    create: {
      name: "Juan Dela Cruz",
      email: "juan@example.com",
      passwordHash,
      role: Role.STUDENT,
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "maria@example.com" },
    update: { passwordHash, role: Role.CLIENT, name: "Maria Santos" },
    create: {
      name: "Maria Santos",
      email: "maria@example.com",
      passwordHash,
      role: Role.CLIENT,
    },
  });

  console.log(`  ✓ Student: ${student.email}`);
  console.log(`  ✓ Client:  ${client.email}`);

  // -------------------------------------------------------------------------
  // 2. Student Profile
  // -------------------------------------------------------------------------
  await prisma.studentProfile.upsert({
    where: { userId: student.id },
    update: {},
    create: {
      userId: student.id,
      school: "UP Diliman",
      course: "BSCS",
      year: 3,
      maxHoursPerDay: 4,
    },
  });

  console.log("  ✓ StudentProfile created");

  // -------------------------------------------------------------------------
  // 3. InviteCode (already used by Maria)
  // -------------------------------------------------------------------------
  const existingCode = await prisma.inviteCode.findFirst({
    where: { studentId: student.id },
  });

  const code = existingCode?.code ?? generateInviteCode();

  await prisma.inviteCode.upsert({
    where: { code },
    update: { usedByClientId: client.id },
    create: {
      studentId: student.id,
      code,
      usedByClientId: client.id,
    },
  });

  console.log(`  ✓ InviteCode: ${code} (used by Maria)`);

  // -------------------------------------------------------------------------
  // 4. ClientStudentLink
  // -------------------------------------------------------------------------
  await prisma.clientStudentLink.upsert({
    where: { studentId: student.id },
    update: { status: LinkStatus.ACTIVE, hourlyRate: 150 },
    create: {
      clientId: client.id,
      studentId: student.id,
      hourlyRate: 150,
      status: LinkStatus.ACTIVE,
    },
  });

  console.log("  ✓ ClientStudentLink: Juan ↔ Maria @ PHP 150/hr");

  // -------------------------------------------------------------------------
  // 5. Class Schedule (Manila local time as minutes from midnight)
  //
  //   Mon (1): Math 101   09:00-10:00  (540-600)
  //   Mon (1): CS 201     13:00-14:00  (780-840)
  //   Wed (3): Math 101   09:00-10:00  (540-600)
  //   Wed (3): CS 201     13:00-14:00  (780-840)
  //   Fri (5): Physics 101 09:00-11:00 (540-660)
  // -------------------------------------------------------------------------
  // Clear existing schedules for idempotency
  await prisma.classSchedule.deleteMany({ where: { studentId: student.id } });

  await prisma.classSchedule.createMany({
    data: [
      { studentId: student.id, subject: "Math 101", dayOfWeek: 1, startMinutes: 540, endMinutes: 600 },
      { studentId: student.id, subject: "CS 201", dayOfWeek: 1, startMinutes: 780, endMinutes: 840 },
      { studentId: student.id, subject: "Math 101", dayOfWeek: 3, startMinutes: 540, endMinutes: 600 },
      { studentId: student.id, subject: "CS 201", dayOfWeek: 3, startMinutes: 780, endMinutes: 840 },
      { studentId: student.id, subject: "Physics 101", dayOfWeek: 5, startMinutes: 540, endMinutes: 660 },
    ],
  });

  console.log("  ✓ ClassSchedule: 5 classes seeded");

  // -------------------------------------------------------------------------
  // 6. Availability (Manila local time as minutes from midnight)
  //
  //   Mon (1): 18:00-21:00 (1080-1260)
  //   Wed (3): 18:00-21:00 (1080-1260)
  //   Fri (5): 14:00-18:00 (840-1080)
  //   Sat (6): 08:00-12:00 (480-720)
  // -------------------------------------------------------------------------
  await prisma.availability.deleteMany({ where: { studentId: student.id } });

  await prisma.availability.createMany({
    data: [
      { studentId: student.id, dayOfWeek: 1, startMinutes: 1080, endMinutes: 1260 },
      { studentId: student.id, dayOfWeek: 3, startMinutes: 1080, endMinutes: 1260 },
      { studentId: student.id, dayOfWeek: 5, startMinutes: 840, endMinutes: 1080 },
      { studentId: student.id, dayOfWeek: 6, startMinutes: 480, endMinutes: 720 },
    ],
  });

  console.log("  ✓ Availability: 4 windows seeded");

  // -------------------------------------------------------------------------
  // 7. Tasks, Whole-Minute Time Logs & Invoices (computed through money.ts)
  // -------------------------------------------------------------------------
  // Clean previous demo notifications, tasks, logs, and invoices for idempotency
  await prisma.notification.deleteMany({
    where: { userId: { in: [student.id, client.id] } },
  });
  await prisma.invoice.deleteMany({ where: { studentId: student.id, clientId: client.id } });
  await prisma.timeLog.deleteMany({ where: { studentId: student.id } });
  await prisma.task.deleteMany({ where: { studentId: student.id, clientId: client.id } });

  // Task 1: "Design landing page wireframes"
  // estHours: 3.0 (Logged hours will total 5.5 hours, exceeding the estimate)
  const task1 = await prisma.task.create({
    data: {
      clientId: client.id,
      studentId: student.id,
      title: "Design landing page wireframes",
      description: "Mobile and desktop wireframes in Figma.",
      startAt: new Date("2026-11-16T10:00:00.000Z"),
      dueAt: new Date("2026-11-20T10:00:00.000Z"),
      estHours: 3,
      status: TaskStatus.DOING,
      studentResponse: StudentResponse.ACCEPTED,
    },
  });

  // Task 2: "Competitor analysis spreadsheet"
  // estHours: 3.0
  const task2 = await prisma.task.create({
    data: {
      clientId: client.id,
      studentId: student.id,
      title: "Competitor analysis spreadsheet",
      description: "Gather pricing and feature matrix.",
      startAt: new Date("2026-11-18T10:00:00.000Z"),
      dueAt: new Date("2026-11-22T10:00:00.000Z"),
      estHours: 3,
      status: TaskStatus.DOING,
      studentResponse: StudentResponse.ACCEPTED,
    },
  });

  // Log 1 (on Task 1): 3 hours = 180 whole minutes -> APPROVED -> PAID invoice
  const timeIn1 = new Date("2026-11-09T10:00:00.000Z");
  const timeOut1 = new Date("2026-11-09T13:00:00.000Z");
  const hours1 = calculateLoggedHours(timeIn1, timeOut1);
  const log1 = await prisma.timeLog.create({
    data: {
      studentId: student.id,
      taskId: task1.id,
      timeIn: timeIn1,
      timeOut: timeOut1,
      totalHours: hours1,
      status: TimeLogStatus.CLOSED,
    },
  });
  const { invoice: invoice1 } = await approveTimeLog(client.id, log1.id);
  await markInvoicePaid(client.id, invoice1.id);

  // Log 2 (on Task 1): 1 hour 30 min = 90 whole minutes -> APPROVED -> open (APPROVED) invoice
  const timeIn2 = new Date("2026-11-11T06:00:00.000Z");
  const timeOut2 = new Date("2026-11-11T07:30:00.000Z");
  const hours2 = calculateLoggedHours(timeIn2, timeOut2);
  const log2 = await prisma.timeLog.create({
    data: {
      studentId: student.id,
      taskId: task1.id,
      timeIn: timeIn2,
      timeOut: timeOut2,
      totalHours: hours2,
      status: TimeLogStatus.CLOSED,
    },
  });
  await approveTimeLog(client.id, log2.id);

  // Log 3 (on Task 1): 1 hour = 60 whole minutes -> CLOSED (pending) -> Disputed with reason
  const timeIn3 = new Date("2026-11-12T01:00:00.000Z");
  const timeOut3 = new Date("2026-11-12T02:00:00.000Z");
  const hours3 = calculateLoggedHours(timeIn3, timeOut3);
  const log3 = await prisma.timeLog.create({
    data: {
      studentId: student.id,
      taskId: task1.id,
      timeIn: timeIn3,
      timeOut: timeOut3,
      totalHours: hours3,
      status: TimeLogStatus.CLOSED,
    },
  });
  await disputeTimeLog(
    client.id,
    log3.id,
    "Logged 1 hour but git commits show only 15 minutes of activity."
  );

  // Log 4 (on Task 2): 1 hour = 60 whole minutes -> CLOSED (pending) with student note
  const timeIn4 = new Date("2026-11-12T03:00:00.000Z");
  const timeOut4 = new Date("2026-11-12T04:00:00.000Z");
  const hours4 = calculateLoggedHours(timeIn4, timeOut4);
  await prisma.timeLog.create({
    data: {
      studentId: student.id,
      taskId: task2.id,
      timeIn: timeIn4,
      timeOut: timeOut4,
      totalHours: hours4,
      status: TimeLogStatus.CLOSED,
      correctionNote: "Completed competitive pricing matrix for top 5 competitors.",
      correctionStatus: null,
    },
  });

  // Log 5 (on Task 2): 1.5 hours = 90 whole minutes -> CLOSED (pending) -> Correction requested
  const timeIn5 = new Date("2026-11-12T05:00:00.000Z");
  const timeOut5 = new Date("2026-11-12T06:30:00.000Z");
  const hours5 = calculateLoggedHours(timeIn5, timeOut5);
  const log5 = await prisma.timeLog.create({
    data: {
      studentId: student.id,
      taskId: task2.id,
      timeIn: timeIn5,
      timeOut: timeOut5,
      totalHours: hours5,
      status: TimeLogStatus.CLOSED,
    },
  });
  await requestCorrection(student.id, {
    timeLogId: log5.id,
    requestedTimeOut: "2026-11-12T06:00:00.000Z",
    correctionNote: "Power outage at 2:00 PM; forgot to clock out on time.",
  });

  // -------------------------------------------------------------------------
  // 8. Notifications for Both Roles (via createNotification in a transaction)
  // -------------------------------------------------------------------------
  // Clear any notifications generated by service setup above for idempotency
  await prisma.notification.deleteMany({
    where: { userId: { in: [student.id, client.id] } },
  });

  const now = new Date();
  const ONE_HOUR = 60 * 60 * 1000;
  const ONE_DAY = 24 * 60 * 60 * 1000;

  // Day references: today, yesterday, and 3 to 6 days ago
  const today1 = new Date(now.getTime() - 2 * ONE_HOUR);
  const today2 = new Date(now.getTime() - 4 * ONE_HOUR);
  const yesterday1 = new Date(now.getTime() - 26 * ONE_HOUR);
  const threeDaysAgo = new Date(now.getTime() - 3 * ONE_DAY);
  const fourDaysAgo = new Date(now.getTime() - 4 * ONE_DAY);
  const fiveDaysAgo = new Date(now.getTime() - 5 * ONE_DAY);
  const sixDaysAgo = new Date(now.getTime() - 6 * ONE_DAY);

  // Client notifications:
  // TASK_ACCEPTED, RESCHEDULE_REQUESTED (with a reason),
  // HOURS_SUBMITTED (two, matching the pending logs), CORRECTION_REQUESTED.
  // 3 unread, the rest read.
  const clientNotifications: Array<{
    type: NotificationType;
    message: string;
    createdAt: Date;
    isRead: boolean;
  }> = [
    {
      type: "TASK_ACCEPTED",
      message: `${student.name} accepted: ${task1.title}`,
      createdAt: fiveDaysAgo,
      isRead: true,
    },
    {
      type: "RESCHEDULE_REQUESTED",
      message: `${student.name} asked to reschedule ${task2.title}. Reason: Midterm exams this week; request to move deadline by 2 days.`,
      createdAt: fourDaysAgo,
      isRead: true,
    },
    {
      type: "HOURS_SUBMITTED",
      message: `${student.name} logged ${formatHours(hours4)} on ${task2.title}`,
      createdAt: yesterday1,
      isRead: false, // unread 1
    },
    {
      type: "HOURS_SUBMITTED",
      message: `${student.name} logged ${formatHours(hours5)} on ${task2.title}`,
      createdAt: today2,
      isRead: false, // unread 2
    },
    {
      type: "CORRECTION_REQUESTED",
      message: `${student.name} requested a time correction on ${task2.title}`,
      createdAt: today1,
      isRead: false, // unread 3
    },
  ];

  // Student notifications:
  // TASK_ASSIGNED, HOURS_APPROVED, INVOICE_PAID, HOURS_DISPUTED,
  // CORRECTION_APPROVED, CORRECTION_REJECTED.
  // 3 unread, the rest read.
  const studentNotifications: Array<{
    type: NotificationType;
    message: string;
    createdAt: Date;
    isRead: boolean;
  }> = [
    {
      type: "TASK_ASSIGNED",
      message: `${client.name} assigned you a task: ${task1.title}`,
      createdAt: sixDaysAgo,
      isRead: true,
    },
    {
      type: "HOURS_APPROVED",
      message: `${client.name} approved ${formatHours(hours2)} for ${task1.title}. Invoice total: ${formatPeso(225)}`,
      createdAt: fiveDaysAgo,
      isRead: true,
    },
    {
      type: "INVOICE_PAID",
      message: `${client.name} marked your ${formatPeso(450)} invoice as paid`,
      createdAt: threeDaysAgo,
      isRead: true,
    },
    {
      type: "HOURS_DISPUTED",
      message: `${client.name} disputed ${formatHours(hours3)} on ${task1.title}. Reason: Logged 1 hour but git commits show only 15 minutes of activity.`,
      createdAt: yesterday1,
      isRead: false, // unread 1
    },
    {
      type: "CORRECTION_APPROVED",
      message: `${client.name} approved your time correction on ${task1.title}. New total: ${formatHours(2)}`,
      createdAt: today2,
      isRead: false, // unread 2
    },
    {
      type: "CORRECTION_REJECTED",
      message: `${client.name} declined your time correction on ${task2.title}`,
      createdAt: today1,
      isRead: false, // unread 3
    },
  ];

  await prisma.$transaction(async (tx) => {
    for (const item of clientNotifications) {
      const created = await createNotification(tx, {
        type: item.type,
        recipientId: client.id,
        actorId: student.id,
        message: item.message,
      });

      await tx.notification.update({
        where: { id: created.id },
        data: {
          createdAt: item.createdAt,
          readAt: item.isRead ? item.createdAt : null,
        },
      });
    }

    for (const item of studentNotifications) {
      const created = await createNotification(tx, {
        type: item.type,
        recipientId: student.id,
        actorId: client.id,
        message: item.message,
      });

      await tx.notification.update({
        where: { id: created.id },
        data: {
          createdAt: item.createdAt,
          readAt: item.isRead ? item.createdAt : null,
        },
      });
    }
  });

  console.log(`  ✓ Seeded Tasks, Whole-Minute TimeLogs, Invoices & Notifications for both roles`);
  console.log("\n✅  Seed complete.");
  console.log("\nDemo credentials (local only):");
  console.log("  Student — juan@example.com  / demo1234");
  console.log("  Client  — maria@example.com / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
