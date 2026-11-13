import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "./prisma";
import { Role, TaskStatus, TimeLogStatus, InvoiceStatus, StudentResponse } from "@prisma/client";
import { formatPeso } from "./format";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_METADATA,
  getNotificationLabel,
  getNotificationMeta,
  getNotificationIcon,
  createNotification,
} from "./notifications";
import { createTask, respondToTask } from "./services/task-service";
import { timeIn, timeOut, requestCorrection } from "./services/time-service";
import {
  approveTimeLog,
  disputeTimeLog,
  respondToCorrection,
  markInvoicePaid,
} from "./services/invoice-service";

describe("Notification Central Types and Metadata", () => {
  const validTones = ["blue", "green", "red", "amber", "gray"];

  it("ensures every NotificationType has a valid label, tone, icon, and recipientRole", () => {
    for (const type of NOTIFICATION_TYPES) {
      const meta = NOTIFICATION_METADATA[type];
      expect(meta, `Missing metadata for ${type}`).toBeDefined();
      expect(meta.label.trim().length).toBeGreaterThan(0);
      expect(validTones).toContain(meta.tone);
      expect(meta.icon.trim().length).toBeGreaterThan(0);
      expect([Role.STUDENT, Role.CLIENT]).toContain(meta.recipientRole);
    }
  });

  it("falls back to 'Update' with neutral icon for unknown or legacy types", () => {
    expect(getNotificationLabel("LEGACY_TYPE")).toBe("Update");
    expect(getNotificationLabel("UNKNOWN_CUSTOM")).toBe("Update");

    const meta = getNotificationMeta("OLD_MIGRATED_TYPE");
    expect(meta.label).toBe("Update");
    expect(meta.tone).toBe("gray");
    expect(meta.icon).toBe("bell");

    const icon = getNotificationIcon("UNKNOWN_TYPE");
    expect(icon).toBeDefined();
  });

  it("throws when actorId equals recipientId in createNotification", async () => {
    await prisma.$transaction(async (tx) => {
      await expect(
        createNotification(tx, {
          type: "TASK_ASSIGNED",
          recipientId: "same-user",
          actorId: "same-user",
          message: "Self notification",
        })
      ).rejects.toThrow("Recipient and actor cannot be the same user.");
    });
  });

  it("throws when createNotification is called with the global PrismaClient", async () => {
    await expect(
      createNotification(prisma as any, {
        type: "TASK_ASSIGNED",
        recipientId: "user-1",
        actorId: "user-2",
        message: "Outside tx",
      })
    ).rejects.toThrow("createNotification must be called with a transaction client");
  });
});

describe("Notification Creation Points & Transaction Atomicity", () => {
  let studentId = "";
  let clientId = "";
  const createdTaskIds: string[] = [];
  const createdLogIds: string[] = [];
  const createdInvoiceIds: string[] = [];

  beforeAll(async () => {
    const timestamp = Date.now();
    const student = await prisma.user.create({
      data: {
        name: "Test Student",
        email: `student-${timestamp}@example.com`,
        passwordHash: "hash",
        role: Role.STUDENT,
      },
    });
    studentId = student.id;

    const client = await prisma.user.create({
      data: {
        name: "Test Client",
        email: `client-${timestamp}@example.com`,
        passwordHash: "hash",
        role: Role.CLIENT,
      },
    });
    clientId = client.id;

    await prisma.clientStudentLink.create({
      data: {
        studentId,
        clientId,
        hourlyRate: 150,
        status: "ACTIVE",
      },
    });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: [studentId, clientId] } },
    });
    if (createdInvoiceIds.length > 0) {
      await prisma.invoice.deleteMany({ where: { id: { in: createdInvoiceIds } } });
    }
    if (createdLogIds.length > 0) {
      await prisma.timeLog.deleteMany({ where: { id: { in: createdLogIds } } });
    }
    if (createdTaskIds.length > 0) {
      await prisma.task.deleteMany({ where: { id: { in: createdTaskIds } } });
    }
    await prisma.clientStudentLink.deleteMany({ where: { studentId } });
    await prisma.user.deleteMany({ where: { id: { in: [studentId, clientId] } } });
  });

  // 1. createTask -> TASK_ASSIGNED
  it("createTask creates TASK_ASSIGNED notification for student with expected message", async () => {
    const res = await createTask(clientId, {
      title: "Write blog post",
      startAt: "2026-11-20T10:00:00.000Z",
      dueAt: "2026-11-20T12:00:00.000Z",
      estHours: 2,
    });
    createdTaskIds.push(res.task.id);

    const notif = await prisma.notification.findFirst({
      where: { userId: studentId, type: "TASK_ASSIGNED" },
      orderBy: { createdAt: "desc" },
    });
    expect(notif).not.toBeNull();
    expect(notif?.message).toContain("Test Client assigned you a task: Write blog post");
  });

  // 2. respondToTask(ACCEPTED) -> TASK_ACCEPTED
  it("respondToTask(ACCEPTED) creates TASK_ACCEPTED notification for client", async () => {
    const taskRes = await createTask(clientId, {
      title: "Acceptance Test Task",
      startAt: "2026-11-21T10:00:00.000Z",
      dueAt: "2026-11-21T11:00:00.000Z",
      estHours: 1,
    });
    createdTaskIds.push(taskRes.task.id);

    await respondToTask(taskRes.task.id, studentId, StudentResponse.ACCEPTED);

    const notif = await prisma.notification.findFirst({
      where: { userId: clientId, type: "TASK_ACCEPTED" },
      orderBy: { createdAt: "desc" },
    });
    expect(notif).not.toBeNull();
    expect(notif?.message).toBe("Test Student accepted: Acceptance Test Task");
  });

  // 3. respondToTask(RESCHEDULE_REQUESTED) -> RESCHEDULE_REQUESTED
  it("respondToTask(RESCHEDULE_REQUESTED) creates RESCHEDULE_REQUESTED notification with reason", async () => {
    const taskRes = await createTask(clientId, {
      title: "Reschedule Test Task",
      startAt: "2026-11-22T10:00:00.000Z",
      dueAt: "2026-11-22T11:00:00.000Z",
      estHours: 1,
    });
    createdTaskIds.push(taskRes.task.id);

    await respondToTask(
      taskRes.task.id,
      studentId,
      StudentResponse.RESCHEDULE_REQUESTED,
      "Doctor appointment in the morning"
    );

    const notif = await prisma.notification.findFirst({
      where: { userId: clientId, type: "RESCHEDULE_REQUESTED" },
      orderBy: { createdAt: "desc" },
    });
    expect(notif).not.toBeNull();
    expect(notif?.message).toBe(
      "Test Student asked to reschedule Reschedule Test Task. Reason: Doctor appointment in the morning"
    );
  });

  // 4. timeOut -> HOURS_SUBMITTED
  it("timeOut creates HOURS_SUBMITTED notification for client", async () => {
    const taskRes = await createTask(clientId, {
      title: "Timer Log Task",
      startAt: "2026-11-23T10:00:00.000Z",
      dueAt: "2026-11-23T12:00:00.000Z",
      estHours: 2,
    });
    createdTaskIds.push(taskRes.task.id);

    await prisma.task.update({
      where: { id: taskRes.task.id },
      data: { studentResponse: StudentResponse.ACCEPTED },
    });

    const openLog = await timeIn(studentId, taskRes.task.id);
    createdLogIds.push(openLog.id);

    await timeOut(studentId, openLog.id);

    const notif = await prisma.notification.findFirst({
      where: { userId: clientId, type: "HOURS_SUBMITTED" },
      orderBy: { createdAt: "desc" },
    });
    expect(notif).not.toBeNull();
    expect(notif?.message).toContain("Test Student logged");
    expect(notif?.message).toContain("Timer Log Task");
  });

  // 5. requestCorrection -> CORRECTION_REQUESTED
  it("requestCorrection creates CORRECTION_REQUESTED notification for client", async () => {
    const taskRes = await createTask(clientId, {
      title: "Correction Test Task",
      startAt: "2026-11-24T10:00:00.000Z",
      dueAt: "2026-11-24T12:00:00.000Z",
      estHours: 2,
    });
    createdTaskIds.push(taskRes.task.id);

    const log = await prisma.timeLog.create({
      data: {
        studentId,
        taskId: taskRes.task.id,
        timeIn: new Date("2026-11-24T10:00:00.000Z"),
        timeOut: new Date("2026-11-24T11:00:00.000Z"),
        totalHours: 1.0,
        status: TimeLogStatus.CLOSED,
      },
    });
    createdLogIds.push(log.id);

    await requestCorrection(studentId, {
      timeLogId: log.id,
      requestedTimeOut: "2026-11-24T12:00:00.000Z",
      correctionNote: "Worked 2 hours instead of 1 hour.",
    });

    const notif = await prisma.notification.findFirst({
      where: { userId: clientId, type: "CORRECTION_REQUESTED" },
      orderBy: { createdAt: "desc" },
    });
    expect(notif).not.toBeNull();
    expect(notif?.message).toBe("Test Student requested a time correction on Correction Test Task");
  });

  // 6. approveTimeLog -> HOURS_APPROVED
  it("approveTimeLog creates HOURS_APPROVED notification for student with invoice total", async () => {
    const taskRes = await createTask(clientId, {
      title: "Approval Task",
      startAt: "2026-11-25T10:00:00.000Z",
      dueAt: "2026-11-25T12:00:00.000Z",
      estHours: 2,
    });
    createdTaskIds.push(taskRes.task.id);

    const log = await prisma.timeLog.create({
      data: {
        studentId,
        taskId: taskRes.task.id,
        timeIn: new Date("2026-11-25T10:00:00.000Z"),
        timeOut: new Date("2026-11-25T12:00:00.000Z"),
        totalHours: 2.0,
        status: TimeLogStatus.CLOSED,
      },
    });
    createdLogIds.push(log.id);

    const { invoice } = await approveTimeLog(clientId, log.id);
    createdInvoiceIds.push(invoice.id);

    const notif = await prisma.notification.findFirst({
      where: { userId: studentId, type: "HOURS_APPROVED" },
      orderBy: { createdAt: "desc" },
    });
    expect(notif).not.toBeNull();
    expect(notif?.message).toBe(
      `Test Client approved 2h for Approval Task. Invoice total: ${formatPeso(invoice.amount)}`
    );
  });

  // 7. disputeTimeLog -> HOURS_DISPUTED
  it("disputeTimeLog creates HOURS_DISPUTED notification for student with reason", async () => {
    const taskRes = await createTask(clientId, {
      title: "Dispute Task",
      startAt: "2026-11-26T10:00:00.000Z",
      dueAt: "2026-11-26T12:00:00.000Z",
      estHours: 2,
    });
    createdTaskIds.push(taskRes.task.id);

    const log = await prisma.timeLog.create({
      data: {
        studentId,
        taskId: taskRes.task.id,
        timeIn: new Date("2026-11-26T10:00:00.000Z"),
        timeOut: new Date("2026-11-26T12:00:00.000Z"),
        totalHours: 2.0,
        status: TimeLogStatus.CLOSED,
      },
    });
    createdLogIds.push(log.id);

    await disputeTimeLog(clientId, log.id, "Did not attend Zoom call");

    const notif = await prisma.notification.findFirst({
      where: { userId: studentId, type: "HOURS_DISPUTED" },
      orderBy: { createdAt: "desc" },
    });
    expect(notif).not.toBeNull();
    expect(notif?.message).toBe(
      "Test Client disputed 2h on Dispute Task. Reason: Did not attend Zoom call"
    );
  });

  // 8. respondToCorrection(APPROVE) -> CORRECTION_APPROVED
  it("respondToCorrection(APPROVE) creates CORRECTION_APPROVED notification for student", async () => {
    const taskRes = await createTask(clientId, {
      title: "Approve Correction Task",
      startAt: "2026-11-27T10:00:00.000Z",
      dueAt: "2026-11-27T13:00:00.000Z",
      estHours: 3,
    });
    createdTaskIds.push(taskRes.task.id);

    const log = await prisma.timeLog.create({
      data: {
        studentId,
        taskId: taskRes.task.id,
        timeIn: new Date("2026-11-27T10:00:00.000Z"),
        timeOut: new Date("2026-11-27T11:00:00.000Z"),
        requestedTimeOut: new Date("2026-11-27T13:00:00.000Z"),
        totalHours: 1.0,
        correctionStatus: "PENDING",
        status: TimeLogStatus.CLOSED,
      },
    });
    createdLogIds.push(log.id);

    await respondToCorrection(clientId, log.id, "APPROVE");

    const notif = await prisma.notification.findFirst({
      where: { userId: studentId, type: "CORRECTION_APPROVED" },
      orderBy: { createdAt: "desc" },
    });
    expect(notif).not.toBeNull();
    expect(notif?.message).toBe(
      "Test Client approved your time correction on Approve Correction Task. New total: 3h"
    );
  });

  // 9. respondToCorrection(REJECT) -> CORRECTION_REJECTED
  it("respondToCorrection(REJECT) creates CORRECTION_REJECTED notification for student", async () => {
    const taskRes = await createTask(clientId, {
      title: "Reject Correction Task",
      startAt: "2026-11-28T10:00:00.000Z",
      dueAt: "2026-11-28T13:00:00.000Z",
      estHours: 3,
    });
    createdTaskIds.push(taskRes.task.id);

    const log = await prisma.timeLog.create({
      data: {
        studentId,
        taskId: taskRes.task.id,
        timeIn: new Date("2026-11-28T10:00:00.000Z"),
        timeOut: new Date("2026-11-28T11:00:00.000Z"),
        requestedTimeOut: new Date("2026-11-28T13:00:00.000Z"),
        totalHours: 1.0,
        correctionStatus: "PENDING",
        status: TimeLogStatus.CLOSED,
      },
    });
    createdLogIds.push(log.id);

    await respondToCorrection(clientId, log.id, "REJECT");

    const notif = await prisma.notification.findFirst({
      where: { userId: studentId, type: "CORRECTION_REJECTED" },
      orderBy: { createdAt: "desc" },
    });
    expect(notif).not.toBeNull();
    expect(notif?.message).toBe(
      "Test Client declined your time correction on Reject Correction Task"
    );
  });

  // 10. markInvoicePaid -> INVOICE_PAID
  it("markInvoicePaid creates INVOICE_PAID notification for student", async () => {
    const invoice = await prisma.invoice.create({
      data: {
        studentId,
        clientId,
        totalHours: 2,
        rate: 150,
        amount: 300,
        status: InvoiceStatus.APPROVED,
      },
    });
    createdInvoiceIds.push(invoice.id);

    await markInvoicePaid(clientId, invoice.id);

    const notif = await prisma.notification.findFirst({
      where: { userId: studentId, type: "INVOICE_PAID" },
      orderBy: { createdAt: "desc" },
    });
    expect(notif).not.toBeNull();
    expect(notif?.message).toBe(`Test Client marked your ${formatPeso(300)} invoice as paid`);
  });
});

describe("Rollback & Double Submit Safety", () => {
  let studentId = "";
  let clientId = "";
  const createdTaskIds: string[] = [];
  const createdLogIds: string[] = [];
  const createdInvoiceIds: string[] = [];

  beforeAll(async () => {
    const timestamp = Date.now();
    const student = await prisma.user.create({
      data: {
        name: "Student Rollback",
        email: `student-rb-${timestamp}@example.com`,
        passwordHash: "hash",
        role: Role.STUDENT,
      },
    });
    studentId = student.id;

    const client = await prisma.user.create({
      data: {
        name: "Client Rollback",
        email: `client-rb-${timestamp}@example.com`,
        passwordHash: "hash",
        role: Role.CLIENT,
      },
    });
    clientId = client.id;

    await prisma.clientStudentLink.create({
      data: {
        studentId,
        clientId,
        hourlyRate: 150,
        status: "ACTIVE",
      },
    });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: [studentId, clientId] } },
    });
    if (createdInvoiceIds.length > 0) {
      await prisma.invoice.deleteMany({ where: { id: { in: createdInvoiceIds } } });
    }
    if (createdLogIds.length > 0) {
      await prisma.timeLog.deleteMany({ where: { id: { in: createdLogIds } } });
    }
    if (createdTaskIds.length > 0) {
      await prisma.task.deleteMany({ where: { id: { in: createdTaskIds } } });
    }
    await prisma.clientStudentLink.deleteMany({ where: { studentId } });
    await prisma.user.deleteMany({ where: { id: { in: [studentId, clientId] } } });
  });

  it("prevents duplicate task creation within 15 seconds (double submit)", async () => {
    const taskInput = {
      title: "Unique Rapid Task",
      startAt: "2026-11-29T10:00:00.000Z",
      dueAt: "2026-11-29T11:00:00.000Z",
      estHours: 1,
    };

    const first = await createTask(clientId, taskInput);
    createdTaskIds.push(first.task.id);

    // Second call immediately within 15 seconds must throw
    await expect(createTask(clientId, taskInput)).rejects.toThrow("This task was just created.");

    // Exactly 1 notification created
    const notifCount = await prisma.notification.count({
      where: {
        userId: studentId,
        type: "TASK_ASSIGNED",
        message: { contains: "Unique Rapid Task" },
      },
    });
    expect(notifCount).toBe(1);
  });


  it("prevents double submit on respondToTask", async () => {
    const taskRes = await createTask(clientId, {
      title: "Double Respond Task",
      startAt: "2026-11-30T10:00:00.000Z",
      dueAt: "2026-11-30T11:00:00.000Z",
      estHours: 1,
    });
    createdTaskIds.push(taskRes.task.id);

    // First response succeeds
    await respondToTask(taskRes.task.id, studentId, StudentResponse.ACCEPTED);

    // Second response must throw "This was already done."
    await expect(
      respondToTask(taskRes.task.id, studentId, StudentResponse.ACCEPTED)
    ).rejects.toThrow("This was already done.");

    // Exactly 1 notification created
    const notifCount = await prisma.notification.count({
      where: {
        userId: clientId,
        type: "TASK_ACCEPTED",
        message: { contains: "Double Respond Task" },
      },
    });
    expect(notifCount).toBe(1);
  });

  it("allows a task with studentResponse ACCEPTED (not done) to become RESCHEDULE_REQUESTED and creates exactly one notification", async () => {
    const taskRes = await createTask(clientId, {
      title: "Reschedule After Accept Task",
      startAt: "2026-12-04T10:00:00.000Z",
      dueAt: "2026-12-04T12:00:00.000Z",
      estHours: 2,
    });
    createdTaskIds.push(taskRes.task.id);

    // 1. Student accepts the task
    const acceptedTask = await respondToTask(taskRes.task.id, studentId, StudentResponse.ACCEPTED);
    expect(acceptedTask.studentResponse).toBe(StudentResponse.ACCEPTED);

    // 2. Student subsequently requests reschedule on the accepted task
    const rescheduledTask = await respondToTask(
      taskRes.task.id,
      studentId,
      StudentResponse.RESCHEDULE_REQUESTED,
      "Exam moved to this slot"
    );
    expect(rescheduledTask.studentResponse).toBe(StudentResponse.RESCHEDULE_REQUESTED);
    expect(rescheduledTask.rescheduleReason).toBe("Exam moved to this slot");

    // Exactly 1 RESCHEDULE_REQUESTED notification for client
    const reschedNotifCount = await prisma.notification.count({
      where: {
        userId: clientId,
        type: "RESCHEDULE_REQUESTED",
        message: { contains: "Reschedule After Accept Task" },
      },
    });
    expect(reschedNotifCount).toBe(1);

    // 3. Duplicate reschedule request throws "This was already done."
    await expect(
      respondToTask(
        taskRes.task.id,
        studentId,
        StudentResponse.RESCHEDULE_REQUESTED,
        "Another reason"
      )
    ).rejects.toThrow("This was already done.");

    // Still exactly 1 notification
    const reschedNotifCountAfter = await prisma.notification.count({
      where: {
        userId: clientId,
        type: "RESCHEDULE_REQUESTED",
        message: { contains: "Reschedule After Accept Task" },
      },
    });
    expect(reschedNotifCountAfter).toBe(1);
  });

  it("rejects accepting an already accepted task or accepting after reschedule", async () => {
    const taskRes = await createTask(clientId, {
      title: "Already Accepted Guard Task",
      startAt: "2026-12-05T10:00:00.000Z",
      dueAt: "2026-12-05T12:00:00.000Z",
      estHours: 2,
    });
    createdTaskIds.push(taskRes.task.id);

    await respondToTask(taskRes.task.id, studentId, StudentResponse.ACCEPTED);

    // Accepting again throws "This was already done."
    await expect(
      respondToTask(taskRes.task.id, studentId, StudentResponse.ACCEPTED)
    ).rejects.toThrow("This was already done.");
  });

  it("rejects respondToTask on a DONE task", async () => {
    const taskRes = await createTask(clientId, {
      title: "Done Task Guard",
      startAt: "2026-12-06T10:00:00.000Z",
      dueAt: "2026-12-06T12:00:00.000Z",
      estHours: 2,
    });
    createdTaskIds.push(taskRes.task.id);

    await prisma.task.update({
      where: { id: taskRes.task.id },
      data: { status: TaskStatus.DONE },
    });

    await expect(
      respondToTask(taskRes.task.id, studentId, StudentResponse.ACCEPTED)
    ).rejects.toThrow("This was already done.");

    await expect(
      respondToTask(taskRes.task.id, studentId, StudentResponse.RESCHEDULE_REQUESTED, "Reason")
    ).rejects.toThrow("This was already done.");
  });


  it("prevents double dispute on disputeTimeLog", async () => {
    const taskRes = await createTask(clientId, {
      title: "Double Dispute Task",
      startAt: "2026-12-01T10:00:00.000Z",
      dueAt: "2026-12-01T11:00:00.000Z",
      estHours: 1,
    });
    createdTaskIds.push(taskRes.task.id);

    const log = await prisma.timeLog.create({
      data: {
        studentId,
        taskId: taskRes.task.id,
        timeIn: new Date("2026-12-01T10:00:00.000Z"),
        timeOut: new Date("2026-12-01T11:00:00.000Z"),
        totalHours: 1.0,
        status: TimeLogStatus.CLOSED,
      },
    });
    createdLogIds.push(log.id);

    // First dispute succeeds
    await disputeTimeLog(clientId, log.id, "First dispute");

    // Second dispute must throw "This was already done."
    await expect(
      disputeTimeLog(clientId, log.id, "Second dispute")
    ).rejects.toThrow("This was already done.");

    // Exactly 1 notification created
    const notifCount = await prisma.notification.count({
      where: {
        userId: studentId,
        type: "HOURS_DISPUTED",
        message: { contains: "Double Dispute Task" },
      },
    });
    expect(notifCount).toBe(1);
  });


  it("rolls back state if transaction fails during respondToTask", async () => {
    const taskRes = await createTask(clientId, {
      title: "Rollback Respond Task",
      startAt: "2026-12-02T10:00:00.000Z",
      dueAt: "2026-12-02T11:00:00.000Z",
      estHours: 1,
    });
    createdTaskIds.push(taskRes.task.id);

    // Simulate notification failure inside transaction
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.task.update({
          where: { id: taskRes.task.id },
          data: { studentResponse: StudentResponse.ACCEPTED },
        });

        // Trigger failure in createNotification (actor === recipient)
        await createNotification(tx, {
          type: "TASK_ACCEPTED",
          recipientId: clientId,
          actorId: clientId, // Same user will throw!
          message: "Fail",
        });
      })
    ).rejects.toThrow("Recipient and actor cannot be the same user.");

    // Verify task state was NOT updated (rolled back)
    const freshTask = await prisma.task.findUnique({
      where: { id: taskRes.task.id },
    });
    expect(freshTask?.studentResponse).toBeNull();
  });

  it("rolls back state if transaction fails during disputeTimeLog", async () => {
    const taskRes = await createTask(clientId, {
      title: "Rollback Dispute Task",
      startAt: "2026-12-03T10:00:00.000Z",
      dueAt: "2026-12-03T11:00:00.000Z",
      estHours: 1,
    });
    createdTaskIds.push(taskRes.task.id);

    const log = await prisma.timeLog.create({
      data: {
        studentId,
        taskId: taskRes.task.id,
        timeIn: new Date("2026-12-03T10:00:00.000Z"),
        timeOut: new Date("2026-12-03T11:00:00.000Z"),
        totalHours: 1.0,
        status: TimeLogStatus.CLOSED,
      },
    });
    createdLogIds.push(log.id);

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.timeLog.update({
          where: { id: log.id },
          data: { disputeReason: "Should roll back" },
        });

        // Trigger failure
        await createNotification(tx, {
          type: "HOURS_DISPUTED",
          recipientId: studentId,
          actorId: studentId, // Same user throws
          message: "Fail",
        });
      })
    ).rejects.toThrow("Recipient and actor cannot be the same user.");

    const freshLog = await prisma.timeLog.findUnique({ where: { id: log.id } });
    expect(freshLog?.disputeReason).toBeNull();
  });

  it("rolls back state if transaction fails during markInvoicePaid", async () => {
    const invoice = await prisma.invoice.create({
      data: {
        studentId,
        clientId,
        totalHours: 1,
        rate: 150,
        amount: 150,
        status: InvoiceStatus.APPROVED,
      },
    });
    createdInvoiceIds.push(invoice.id);

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.PAID },
        });

        // Trigger failure
        await createNotification(tx, {
          type: "INVOICE_PAID",
          recipientId: studentId,
          actorId: studentId,
          message: "Fail",
        });
      })
    ).rejects.toThrow("Recipient and actor cannot be the same user.");

    const freshInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(freshInvoice?.status).toBe(InvoiceStatus.APPROVED);
  });
});

