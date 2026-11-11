import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  approveTimeLog,
  disputeTimeLog,
  respondToCorrection,
  markInvoicePaid,
  getClientTimesheetData,
  getStudentEarningsData,
} from "./invoice-service";
import { prisma } from "../prisma";
import { TimeLogStatus, InvoiceStatus, TaskStatus } from "@prisma/client";

describe("invoice-service (Acceptance Test §10 Scenario 11)", () => {
  let studentId: string;
  let clientId: string;
  let testTaskId: string;
  let testLogId: string;
  const createdInvoiceIds: string[] = [];

  beforeEach(async () => {
    const student = await prisma.user.findUnique({
      where: { email: "juan@example.com" },
    });
    const client = await prisma.user.findUnique({
      where: { email: "maria@example.com" },
    });

    if (!student || !client) throw new Error("Seed users not found");
    studentId = student.id;
    clientId = client.id;

    // Create a task
    const task = await prisma.task.create({
      data: {
        clientId,
        studentId,
        title: "Invoice Test Task",
        startAt: new Date("2026-11-16T10:00:00.000Z"),
        dueAt: new Date("2026-11-16T13:00:00.000Z"),
        estHours: 3,
        status: TaskStatus.DOING,
      },
    });
    testTaskId = task.id;

    // Create a completed 3-hour time log (6:00 PM to 9:00 PM Manila)
    const log = await prisma.timeLog.create({
      data: {
        studentId,
        taskId: testTaskId,
        timeIn: new Date("2026-11-16T10:00:00.000Z"),
        timeOut: new Date("2026-11-16T13:00:00.000Z"),
        totalHours: 3.0,
        status: TimeLogStatus.CLOSED,
        correctionNote: "Completed project presentation deck.",
      },
    });
    testLogId = log.id;
  });

  afterEach(async () => {
    if (createdInvoiceIds.length > 0) {
      await prisma.invoice.deleteMany({
        where: { id: { in: createdInvoiceIds } },
      });
      createdInvoiceIds.length = 0;
    }
    await prisma.notification.deleteMany({
      where: { message: { contains: "Invoice Test Task" } },
    });
    await prisma.timeLog.deleteMany({
      where: { id: testLogId },
    });
    await prisma.task.deleteMany({
      where: { id: testTaskId },
    });
  });

  describe("Acceptance Test 11: Approval and Invoicing flow", () => {
    it("approves logged hours, creates APPROVED invoice, and marks it PAID", async () => {
      // 1. Client approves logged hours
      const { approvedLog, invoice } = await approveTimeLog(clientId, testLogId);

      expect(approvedLog.status).toBe(TimeLogStatus.APPROVED);
      expect(invoice).toBeDefined();
      expect(invoice.status).toBe(InvoiceStatus.APPROVED);
      expect(invoice.totalHours).toBe(3.0);
      // At rate P150: 3 * 150 = P450
      expect(invoice.amount).toBe(450);
      createdInvoiceIds.push(invoice.id);

      // Verify notification for student
      const notifApproved = await prisma.notification.findFirst({
        where: { userId: studentId, type: "HOURS_APPROVED" },
        orderBy: { createdAt: "desc" },
      });
      expect(notifApproved).not.toBeNull();
      expect(notifApproved?.message).toContain("approved 3h");

      // 2. Client marks invoice as PAID
      const paidInvoice = await markInvoicePaid(clientId, invoice.id);
      expect(paidInvoice.status).toBe(InvoiceStatus.PAID);

      // Verify notification for student
      const notifPaid = await prisma.notification.findFirst({
        where: { userId: studentId, type: "INVOICE_PAID" },
        orderBy: { createdAt: "desc" },
      });
      expect(notifPaid).not.toBeNull();
      expect(notifPaid?.message).toContain("PAID");
    });
  });

  describe("Dispute flow", () => {
    it("records dispute reason on time log and notifies student", async () => {
      const disputed = await disputeTimeLog(
        clientId,
        testLogId,
        "Meeting was only 1 hour instead of 3 hours recorded."
      );

      expect(disputed.disputeReason).toBe(
        "Meeting was only 1 hour instead of 3 hours recorded."
      );

      const notif = await prisma.notification.findFirst({
        where: { userId: studentId, type: "HOURS_DISPUTED" },
        orderBy: { createdAt: "desc" },
      });
      expect(notif).not.toBeNull();
      expect(notif?.message).toContain("disputed");
    });
  });

  describe("Time correction response flow", () => {
    it("approves time correction and updates hours", async () => {
      // Set requestedTimeOut on the log
      const requested = new Date("2026-11-16T12:00:00.000Z"); // 2 hours instead of 3
      await prisma.timeLog.update({
        where: { id: testLogId },
        data: {
          requestedTimeOut: requested,
          correctionNote: "Correction to 2 hours.",
          correctionStatus: "PENDING",
        },
      });

      const updated = await respondToCorrection(clientId, testLogId, "APPROVE");
      expect(updated.correctionStatus).toBe("APPROVED");
      expect(updated.totalHours).toBe(2.0);
    });

    it("rejects time correction", async () => {
      await prisma.timeLog.update({
        where: { id: testLogId },
        data: {
          requestedTimeOut: new Date("2026-11-16T12:00:00.000Z"),
          correctionStatus: "PENDING",
        },
      });

      const updated = await respondToCorrection(clientId, testLogId, "REJECT");
      expect(updated.correctionStatus).toBe("REJECTED");
    });
  });

  describe("Data fetching summaries", () => {
    it("returns correct client timesheet statistics", async () => {
      const data = await getClientTimesheetData(clientId);
      expect(data.linkedStudent?.name).toBe("Juan Dela Cruz");
      expect(data.pendingLogs.length).toBeGreaterThanOrEqual(1);
      expect(data.pendingHours).toBeGreaterThanOrEqual(3.0);
    });

    it("returns correct student earnings statistics", async () => {
      const data = await getStudentEarningsData(studentId);
      expect(data.linkedClient?.name).toBe("Maria Santos");
      expect(data.hourlyRate).toBe(150);
      expect(Array.isArray(data.taskBreakdown)).toBe(true);
    });
  });
});
