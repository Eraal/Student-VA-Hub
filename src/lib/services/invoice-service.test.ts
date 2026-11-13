import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import {
  approveTimeLog,
  disputeTimeLog,
  respondToCorrection,
  markInvoicePaid,
  getClientTimesheetData,
  getStudentEarningsData,
} from "./invoice-service";
import { prisma } from "../prisma";
import { TimeLogStatus, InvoiceStatus, TaskStatus, Role, LinkStatus } from "@prisma/client";
import { calculateLogAmount, sumMoney } from "../money";

describe("invoice-service", () => {
  let seedStudentId: string;
  let seedClientId: string;

  let testStudentId: string;
  let testClientId: string;
  let otherClientId: string;

  let testTaskId: string;
  let testLogId: string;
  const createdInvoiceIds: string[] = [];

  beforeAll(async () => {
    // 1. Resolve demo/seed accounts for read-only summary tests
    const seedStudent = await prisma.user.findUnique({
      where: { email: "juan@example.com" },
    });
    const seedClient = await prisma.user.findUnique({
      where: { email: "maria@example.com" },
    });

    if (!seedStudent || !seedClient) throw new Error("Seed users not found");
    seedStudentId = seedStudent.id;
    seedClientId = seedClient.id;

    // 2. Create isolated test users to prevent destructive test cleanup from mutating dev seed data
    const testStudent = await prisma.user.upsert({
      where: { email: "test-inv-student@example.com" },
      update: {},
      create: {
        name: "Test Student Inv",
        email: "test-inv-student@example.com",
        passwordHash: "dummyhash",
        role: Role.STUDENT,
      },
    });
    testStudentId = testStudent.id;

    const testClient = await prisma.user.upsert({
      where: { email: "test-inv-client@example.com" },
      update: {},
      create: {
        name: "Test Client Inv",
        email: "test-inv-client@example.com",
        passwordHash: "dummyhash",
        role: Role.CLIENT,
      },
    });
    testClientId = testClient.id;

    const otherClient = await prisma.user.upsert({
      where: { email: "test-other-client-inv@example.com" },
      update: {},
      create: {
        name: "Other Client Inv",
        email: "test-other-client-inv@example.com",
        passwordHash: "dummyhash",
        role: Role.CLIENT,
      },
    });
    otherClientId = otherClient.id;

    await prisma.clientStudentLink.upsert({
      where: { studentId: testStudentId },
      update: { clientId: testClientId, hourlyRate: 150, status: LinkStatus.ACTIVE },
      create: {
        clientId: testClientId,
        studentId: testStudentId,
        hourlyRate: 150,
        status: LinkStatus.ACTIVE,
      },
    });
  });

  afterAll(async () => {
    // Clean up isolated test users and their relationships
    await prisma.notification.deleteMany({
      where: { userId: { in: [testStudentId, testClientId, otherClientId] } },
    });
    await prisma.invoice.deleteMany({ where: { studentId: testStudentId } });
    await prisma.timeLog.deleteMany({ where: { studentId: testStudentId } });
    await prisma.task.deleteMany({ where: { studentId: testStudentId } });
    await prisma.clientStudentLink.deleteMany({ where: { studentId: testStudentId } });
    await prisma.user.deleteMany({
      where: { id: { in: [testStudentId, testClientId, otherClientId] } },
    });
  });

  beforeEach(async () => {
    // Clean up only test records
    await prisma.invoice.deleteMany({
      where: { studentId: testStudentId },
    });
    await prisma.timeLog.deleteMany({
      where: { studentId: testStudentId },
    });
    await prisma.task.deleteMany({
      where: { studentId: testStudentId },
    });

    // Create a fresh test task for testStudent and testClient
    const task = await prisma.task.create({
      data: {
        clientId: testClientId,
        studentId: testStudentId,
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
        studentId: testStudentId,
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
      where: {
        OR: [
          { message: { contains: "Invoice Test Task" } },
          { userId: { in: [testStudentId, testClientId, otherClientId] } },
        ],
      },
    });
    await prisma.timeLog.deleteMany({
      where: { taskId: testTaskId },
    });
    await prisma.task.deleteMany({
      where: { id: testTaskId },
    });
  });

  describe("Acceptance Test 11: Approval and Invoicing flow", () => {
    it("approves logged hours, creates APPROVED invoice, and marks it PAID", async () => {
      // 1. Client approves logged hours
      const { approvedLog, invoice } = await approveTimeLog(testClientId, testLogId);

      expect(approvedLog.status).toBe(TimeLogStatus.APPROVED);
      expect(invoice).toBeDefined();
      expect(invoice.status).toBe(InvoiceStatus.APPROVED);
      expect(invoice.totalHours).toBe(3.0);
      // At rate P150: 3 * 150 = P450
      expect(invoice.amount).toBe(450);
      createdInvoiceIds.push(invoice.id);

      // Verify notification for student
      const notifApproved = await prisma.notification.findFirst({
        where: { userId: testStudentId, type: "HOURS_APPROVED" },
        orderBy: { createdAt: "desc" },
      });
      expect(notifApproved).not.toBeNull();
      expect(notifApproved?.message).toContain("approved 3h");

      // 2. Client marks invoice as PAID
      const paidInvoice = await markInvoicePaid(testClientId, invoice.id);
      expect(paidInvoice.status).toBe(InvoiceStatus.PAID);

      // Verify notification for student
      const notifPaid = await prisma.notification.findFirst({
        where: { userId: testStudentId, type: "INVOICE_PAID" },
        orderBy: { createdAt: "desc" },
      });
      expect(notifPaid).not.toBeNull();
      expect(notifPaid?.message).toContain("paid");
    });

    it("rejects approving a time log that is already approved", async () => {
      await approveTimeLog(testClientId, testLogId);

      await expect(approveTimeLog(testClientId, testLogId)).rejects.toThrow(
        "Only a closed time log can be approved",
      );
    });

    it("rejects paying an invoice that is not approved", async () => {
      const invoice = await prisma.invoice.create({
        data: {
          studentId: testStudentId,
          clientId: testClientId,
          totalHours: 1,
          rate: 150,
          amount: 150,
          status: InvoiceStatus.PENDING,
        },
      });
      createdInvoiceIds.push(invoice.id);

      await expect(markInvoicePaid(testClientId, invoice.id)).rejects.toThrow(
        "Only an approved invoice can be marked as paid",
      );
    });
  });

  describe("Dispute flow", () => {
    it("records dispute reason on time log and notifies student", async () => {
      const disputed = await disputeTimeLog(
        testClientId,
        testLogId,
        "Meeting was only 1 hour instead of 3 hours recorded."
      );

      expect(disputed.disputeReason).toBe(
        "Meeting was only 1 hour instead of 3 hours recorded."
      );

      const notif = await prisma.notification.findFirst({
        where: { userId: testStudentId, type: "HOURS_DISPUTED" },
        orderBy: { createdAt: "desc" },
      });
      expect(notif).not.toBeNull();
      expect(notif?.message).toContain("disputed");
    });
  });

  describe("Time correction response flow", () => {
    it("approves time correction and updates hours", async () => {
      const requested = new Date("2026-11-16T12:00:00.000Z"); // 2 hours instead of 3
      await prisma.timeLog.update({
        where: { id: testLogId },
        data: {
          requestedTimeOut: requested,
          correctionNote: "Correction to 2 hours.",
          correctionStatus: "PENDING",
        },
      });

      const updated = await respondToCorrection(testClientId, testLogId, "APPROVE");
      expect(updated.correctionStatus).toBe("APPROVED");
      expect(updated.totalHours).toBe(2.0);
    });

    it("rejects responding when no correction is pending", async () => {
      await expect(
        respondToCorrection(testClientId, testLogId, "APPROVE"),
      ).rejects.toThrow("no pending correction request");
    });

    it("rejects time correction", async () => {
      await prisma.timeLog.update({
        where: { id: testLogId },
        data: {
          requestedTimeOut: new Date("2026-11-16T12:00:00.000Z"),
          correctionStatus: "PENDING",
        },
      });

      const updated = await respondToCorrection(testClientId, testLogId, "REJECT");
      expect(updated.correctionStatus).toBe("REJECTED");
    });
  });

  describe("Data fetching summaries", () => {
    it("returns correct client timesheet statistics", async () => {
      const data = await getClientTimesheetData(seedClientId);
      expect(data.linkedStudent?.name).toBe("Juan Dela Cruz");
      expect(data.pendingLogs.length).toBeGreaterThanOrEqual(1);
      expect(data.pendingHours).toBeGreaterThanOrEqual(3.0);
    });

    it("returns correct student earnings statistics", async () => {
      const data = await getStudentEarningsData(seedStudentId);
      expect(data.linkedClient?.name).toBe("Maria Santos");
      expect(data.hourlyRate).toBe(150);
      expect(Array.isArray(data.taskBreakdown)).toBe(true);
    });
  });

  describe("Invariants (§10 Timesheet & Invoice Invariants)", () => {
    it("invariant: the sum of approved log amounts equals the sum of invoice amounts for the student (seed check)", async () => {
      const approvedLogs = await prisma.timeLog.findMany({
        where: { studentId: seedStudentId, status: TimeLogStatus.APPROVED },
      });
      const invoices = await prisma.invoice.findMany({
        where: { studentId: seedStudentId },
      });

      const totalApprovedLogAmount = sumMoney(
        approvedLogs.map((l) => calculateLogAmount(l.totalHours ?? 0, 150))
      );
      const totalInvoiceAmount = sumMoney(invoices.map((i) => i.amount));

      expect(totalApprovedLogAmount).toBe(totalInvoiceAmount);
      expect(totalInvoiceAmount).toBe(675.0);
    });

    it("invariant: the sum of approved log amounts equals the sum of invoice amounts across multi-invoice lifecycle", async () => {
      // Create additional logs for test student
      const logA = await prisma.timeLog.create({
        data: {
          studentId: testStudentId,
          taskId: testTaskId,
          timeIn: new Date("2026-11-17T01:00:00.000Z"),
          timeOut: new Date("2026-11-17T03:00:00.000Z"),
          totalHours: 2.0,
          status: TimeLogStatus.CLOSED,
        },
      });
      const logB = await prisma.timeLog.create({
        data: {
          studentId: testStudentId,
          taskId: testTaskId,
          timeIn: new Date("2026-11-17T04:00:00.000Z"),
          timeOut: new Date("2026-11-17T05:30:00.000Z"),
          totalHours: 1.5,
          status: TimeLogStatus.CLOSED,
        },
      });
      // logC remains CLOSED (pending)
      await prisma.timeLog.create({
        data: {
          studentId: testStudentId,
          taskId: testTaskId,
          timeIn: new Date("2026-11-17T06:00:00.000Z"),
          timeOut: new Date("2026-11-17T07:00:00.000Z"),
          totalHours: 1.0,
          status: TimeLogStatus.CLOSED,
        },
      });

      // 1. Approve logA -> creates first invoice, then mark it paid
      const { invoice: inv1 } = await approveTimeLog(testClientId, logA.id);
      await markInvoicePaid(testClientId, inv1.id);

      // 2. Approve logB -> creates second invoice (APPROVED, open)
      await approveTimeLog(testClientId, logB.id);

      // Verify invariant: sum(approved logs) == sum(all invoices)
      const approvedLogs = await prisma.timeLog.findMany({
        where: { studentId: testStudentId, status: TimeLogStatus.APPROVED },
      });
      const studentInvoices = await prisma.invoice.findMany({
        where: { studentId: testStudentId },
      });

      const totalApprovedLogAmount = sumMoney(
        approvedLogs.map((l) => calculateLogAmount(l.totalHours ?? 0, 150))
      );
      const totalInvoiceAmount = sumMoney(studentInvoices.map((i) => i.amount));

      expect(totalApprovedLogAmount).toBe(totalInvoiceAmount);
      // logA (2h * 150 = 300) + logB (1.5h * 150 = 225) = 525
      expect(totalInvoiceAmount).toBe(525.0);
    });

    it("invariant: an approval adds exactly the log's calculateLogAmount to the open invoice", async () => {
      // Create log 1: 1.5 hours
      const log1 = await prisma.timeLog.create({
        data: {
          studentId: testStudentId,
          taskId: testTaskId,
          timeIn: new Date("2026-11-18T01:00:00.000Z"),
          timeOut: new Date("2026-11-18T02:30:00.000Z"),
          totalHours: 1.5,
          status: TimeLogStatus.CLOSED,
        },
      });
      const { invoice: openInvoice } = await approveTimeLog(testClientId, log1.id);
      expect(openInvoice.status).toBe(InvoiceStatus.APPROVED);
      const initialAmount = openInvoice.amount;
      const initialHours = openInvoice.totalHours;

      // Create log 2: 2.0 hours
      const log2 = await prisma.timeLog.create({
        data: {
          studentId: testStudentId,
          taskId: testTaskId,
          timeIn: new Date("2026-11-18T03:00:00.000Z"),
          timeOut: new Date("2026-11-18T05:00:00.000Z"),
          totalHours: 2.0,
          status: TimeLogStatus.CLOSED,
        },
      });
      const expectedLog2Amount = calculateLogAmount(2.0, 150);

      // Approve log 2 into the open invoice
      const { invoice: updatedInvoice } = await approveTimeLog(testClientId, log2.id);

      expect(updatedInvoice.id).toBe(openInvoice.id);
      expect(updatedInvoice.amount).toBe(sumMoney([initialAmount, expectedLog2Amount]));
      expect(updatedInvoice.totalHours).toBe(Math.round((initialHours + 2.0) * 60) / 60);
    });

    it("invariant: approving the same log twice fails", async () => {
      await approveTimeLog(testClientId, testLogId);

      await expect(approveTimeLog(testClientId, testLogId)).rejects.toThrow(
        "Only a closed time log can be approved."
      );
    });

    it("invariant: approving a log of another client's student fails", async () => {
      await expect(approveTimeLog(otherClientId, testLogId)).rejects.toThrow(
        "Time log not found or unauthorized."
      );
    });

    it("invariant: marking an invoice paid twice fails", async () => {
      const { invoice } = await approveTimeLog(testClientId, testLogId);
      const paidInvoice = await markInvoicePaid(testClientId, invoice.id);
      expect(paidInvoice.status).toBe(InvoiceStatus.PAID);

      await expect(markInvoicePaid(testClientId, invoice.id)).rejects.toThrow(
        "Only an approved invoice can be marked as paid."
      );
    });

    it("invariant: another client cannot mark my invoice paid", async () => {
      const { invoice } = await approveTimeLog(testClientId, testLogId);

      await expect(markInvoicePaid(otherClientId, invoice.id)).rejects.toThrow(
        "Invoice not found or unauthorized."
      );
    });

    it("behavior: next approval after an invoice is PAID creates a new open invoice", async () => {
      // 1. Approve log 1 and mark its invoice as PAID
      const { invoice: firstInvoice } = await approveTimeLog(testClientId, testLogId);
      await markInvoicePaid(testClientId, firstInvoice.id);

      // 2. Create another closed log
      const logNext = await prisma.timeLog.create({
        data: {
          studentId: testStudentId,
          taskId: testTaskId,
          timeIn: new Date("2026-11-19T01:00:00.000Z"),
          timeOut: new Date("2026-11-19T03:00:00.000Z"),
          totalHours: 2.0,
          status: TimeLogStatus.CLOSED,
        },
      });

      // 3. Approve logNext: should cleanly create a new open invoice without error
      const { invoice: newInvoice } = await approveTimeLog(testClientId, logNext.id);

      expect(newInvoice.id).not.toBe(firstInvoice.id);
      expect(newInvoice.status).toBe(InvoiceStatus.APPROVED);
      expect(newInvoice.totalHours).toBe(2.0);
      expect(newInvoice.amount).toBe(300.0);
    });
  });
});
