import { prisma } from "../prisma";
import { InvoiceStatus, TimeLogStatus, CorrectionStatus } from "@prisma/client";
import { calculateLoggedHours } from "./time-service";

export interface FormattedInvoice {
  id: string;
  studentId: string;
  clientId: string;
  studentName?: string;
  clientName?: string;
  totalHours: number;
  rate: number;
  amount: number;
  status: InvoiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientTimesheetData {
  linkedStudent: { id: string; name: string } | null;
  hourlyRate: number;
  pendingLogs: {
    id: string;
    taskId: string;
    taskTitle: string;
    timeIn: Date;
    timeOut: Date | null;
    totalHours: number;
    status: TimeLogStatus;
    correctionNote: string | null;
    requestedTimeOut: Date | null;
    correctionStatus: CorrectionStatus | null;
    disputeReason: string | null;
  }[];
  approvedLogs: {
    id: string;
    taskId: string;
    taskTitle: string;
    timeIn: Date;
    timeOut: Date | null;
    totalHours: number;
    status: TimeLogStatus;
  }[];
  invoices: FormattedInvoice[];
  pendingHours: number;
  approvedHours: number;
  pendingAmount: number;
  approvedAmount: number;
}

export interface StudentEarningsData {
  linkedClient: { id: string; name: string } | null;
  hourlyRate: number;
  totalApprovedHours: number;
  totalPendingHours: number;
  totalEarnedPaid: number;
  totalEarnedApproved: number;
  invoices: FormattedInvoice[];
  taskBreakdown: {
    taskId: string;
    taskTitle: string;
    totalHours: number;
    amount: number;
    sessionsCount: number;
  }[];
}

/**
 * Retrieves client timesheets and invoices data.
 */
export async function getClientTimesheetData(clientId: string): Promise<ClientTimesheetData> {
  const link = await prisma.clientStudentLink.findFirst({
    where: { clientId, status: "ACTIVE" },
    include: { student: { select: { id: true, name: true } } },
  });

  const hourlyRate = link?.hourlyRate ?? 150;
  const student = link?.student ?? null;

  if (!student) {
    return {
      linkedStudent: null,
      hourlyRate,
      pendingLogs: [],
      approvedLogs: [],
      invoices: [],
      pendingHours: 0,
      approvedHours: 0,
      pendingAmount: 0,
      approvedAmount: 0,
    };
  }

  const [logsRaw, invoicesRaw] = await Promise.all([
    prisma.timeLog.findMany({
      where: {
        studentId: student.id,
        task: { clientId },
        status: { in: [TimeLogStatus.CLOSED, TimeLogStatus.APPROVED] },
      },
      include: { task: { select: { title: true } } },
      orderBy: { timeIn: "desc" },
    }),
    prisma.invoice.findMany({
      where: { clientId, studentId: student.id },
      include: {
        student: { select: { name: true } },
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const pendingLogs = logsRaw
    .filter((l) => l.status === TimeLogStatus.CLOSED)
    .map((l) => ({
      id: l.id,
      taskId: l.taskId,
      taskTitle: l.task.title,
      timeIn: l.timeIn,
      timeOut: l.timeOut,
      totalHours: l.totalHours ?? 0,
      status: l.status,
      correctionNote: l.correctionNote,
      requestedTimeOut: l.requestedTimeOut,
      correctionStatus: l.correctionStatus,
      disputeReason: l.disputeReason,
    }));

  const approvedLogs = logsRaw
    .filter((l) => l.status === TimeLogStatus.APPROVED)
    .map((l) => ({
      id: l.id,
      taskId: l.taskId,
      taskTitle: l.task.title,
      timeIn: l.timeIn,
      timeOut: l.timeOut,
      totalHours: l.totalHours ?? 0,
      status: l.status,
    }));

  const invoices: FormattedInvoice[] = invoicesRaw.map((inv) => ({
    id: inv.id,
    studentId: inv.studentId,
    clientId: inv.clientId,
    studentName: inv.student.name,
    clientName: inv.client.name,
    totalHours: inv.totalHours,
    rate: inv.rate,
    amount: inv.amount,
    status: inv.status,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  }));

  const pendingHours = pendingLogs.reduce((acc, l) => acc + l.totalHours, 0);
  const approvedHours = approvedLogs.reduce((acc, l) => acc + l.totalHours, 0);

  return {
    linkedStudent: student,
    hourlyRate,
    pendingLogs,
    approvedLogs,
    invoices,
    pendingHours: Math.round(pendingHours * 100) / 100,
    approvedHours: Math.round(approvedHours * 100) / 100,
    pendingAmount: Math.round(pendingHours * hourlyRate * 100) / 100,
    approvedAmount: Math.round(approvedHours * hourlyRate * 100) / 100,
  };
}

/**
 * Approves a time log, updates/creates an approved invoice, and notifies the student.
 * (Acceptance Test Scenario 11)
 */
export async function approveTimeLog(clientId: string, timeLogId: string) {
  const log = await prisma.timeLog.findUnique({
    where: { id: timeLogId },
    include: { task: true },
  });

  if (!log || log.task.clientId !== clientId) {
    throw new Error("Time log not found or unauthorized.");
  }

  const studentId = log.studentId;
  const link = await prisma.clientStudentLink.findFirst({
    where: { clientId, studentId, status: "ACTIVE" },
  });
  const rate = link?.hourlyRate ?? 150;

  // 1. Mark log as APPROVED
  const approvedLog = await prisma.timeLog.update({
    where: { id: timeLogId },
    data: { status: TimeLogStatus.APPROVED },
  });

  const logHours = approvedLog.totalHours ?? 0;

  // 2. Find or create an invoice with status APPROVED
  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      clientId,
      studentId,
      status: { in: [InvoiceStatus.PENDING, InvoiceStatus.APPROVED] },
    },
    orderBy: { createdAt: "desc" },
  });

  let invoice;
  if (existingInvoice) {
    const newTotalHours = Math.round((existingInvoice.totalHours + logHours) * 100) / 100;
    const newAmount = Math.round(newTotalHours * rate * 100) / 100;

    invoice = await prisma.invoice.update({
      where: { id: existingInvoice.id },
      data: {
        totalHours: newTotalHours,
        amount: newAmount,
        status: InvoiceStatus.APPROVED,
      },
    });
  } else {
    const amount = Math.round(logHours * rate * 100) / 100;
    invoice = await prisma.invoice.create({
      data: {
        clientId,
        studentId,
        totalHours: logHours,
        rate,
        amount,
        status: InvoiceStatus.APPROVED,
      },
    });
  }

  // 3. Notify student
  await prisma.notification.create({
    data: {
      userId: studentId,
      type: "HOURS_APPROVED",
      message: `Your client approved ${logHours}h for "${log.task.title}". Invoice amount: ₱${invoice.amount}.`,
    },
  });

  return { approvedLog, invoice };
}

/**
 * Disputes a time log with a reason.
 */
export async function disputeTimeLog(clientId: string, timeLogId: string, disputeReason: string) {
  const log = await prisma.timeLog.findUnique({
    where: { id: timeLogId },
    include: { task: true },
  });

  if (!log || log.task.clientId !== clientId) {
    throw new Error("Time log not found or unauthorized.");
  }

  const updated = await prisma.timeLog.update({
    where: { id: timeLogId },
    data: { disputeReason: disputeReason.trim() },
  });

  await prisma.notification.create({
    data: {
      userId: log.studentId,
      type: "HOURS_DISPUTED",
      message: `Your logged hours for "${log.task.title}" were disputed: ${disputeReason.trim()}`,
    },
  });

  return updated;
}

/**
 * Approves or rejects a student's requested time correction.
 */
export async function respondToCorrection(
  clientId: string,
  timeLogId: string,
  decision: "APPROVE" | "REJECT"
) {
  const log = await prisma.timeLog.findUnique({
    where: { id: timeLogId },
    include: { task: true },
  });

  if (!log || log.task.clientId !== clientId) {
    throw new Error("Time log not found or unauthorized.");
  }

  if (decision === "APPROVE") {
    if (!log.requestedTimeOut) {
      throw new Error("No requested time out recorded on this log.");
    }
    const newHours = calculateLoggedHours(log.timeIn, log.requestedTimeOut);

    const updated = await prisma.timeLog.update({
      where: { id: timeLogId },
      data: {
        timeOut: log.requestedTimeOut,
        totalHours: newHours,
        correctionStatus: CorrectionStatus.APPROVED,
      },
    });

    await prisma.notification.create({
      data: {
        userId: log.studentId,
        type: "CORRECTION_APPROVED",
        message: `Your time correction for "${log.task.title}" was approved (${newHours}h).`,
      },
    });

    return updated;
  } else {
    const updated = await prisma.timeLog.update({
      where: { id: timeLogId },
      data: { correctionStatus: CorrectionStatus.REJECTED },
    });

    await prisma.notification.create({
      data: {
        userId: log.studentId,
        type: "CORRECTION_REJECTED",
        message: `Your time correction for "${log.task.title}" was rejected.`,
      },
    });

    return updated;
  }
}

/**
 * Marks an invoice as PAID (Acceptance Test Scenario 11).
 */
export async function markInvoicePaid(clientId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice || invoice.clientId !== clientId) {
    throw new Error("Invoice not found or unauthorized.");
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: InvoiceStatus.PAID },
  });

  await prisma.notification.create({
    data: {
      userId: invoice.studentId,
      type: "INVOICE_PAID",
      message: `Invoice for ₱${invoice.amount} has been marked as PAID by your client!`,
    },
  });

  return updated;
}

/**
 * Retrieves student earnings, invoices, and task breakdown.
 */
export async function getStudentEarningsData(studentId: string): Promise<StudentEarningsData> {
  const link = await prisma.clientStudentLink.findFirst({
    where: { studentId, status: "ACTIVE" },
    include: { client: { select: { id: true, name: true } } },
  });

  const hourlyRate = link?.hourlyRate ?? 150;
  const client = link?.client ?? null;

  const [logsRaw, invoicesRaw] = await Promise.all([
    prisma.timeLog.findMany({
      where: { studentId },
      include: { task: { select: { id: true, title: true } } },
    }),
    prisma.invoice.findMany({
      where: { studentId },
      include: {
        student: { select: { name: true } },
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const invoices: FormattedInvoice[] = invoicesRaw.map((inv) => ({
    id: inv.id,
    studentId: inv.studentId,
    clientId: inv.clientId,
    studentName: inv.student.name,
    clientName: inv.client.name,
    totalHours: inv.totalHours,
    rate: inv.rate,
    amount: inv.amount,
    status: inv.status,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  }));

  let totalApprovedHours = 0;
  let totalPendingHours = 0;

  const taskMap: Record<
    string,
    { taskId: string; taskTitle: string; totalHours: number; amount: number; sessionsCount: number }
  > = {};

  for (const log of logsRaw) {
    const h = log.totalHours ?? 0;
    if (log.status === TimeLogStatus.APPROVED) {
      totalApprovedHours += h;
    } else if (log.status === TimeLogStatus.CLOSED) {
      totalPendingHours += h;
    }

    if (h > 0) {
      if (!taskMap[log.taskId]) {
        taskMap[log.taskId] = {
          taskId: log.taskId,
          taskTitle: log.task.title,
          totalHours: 0,
          amount: 0,
          sessionsCount: 0,
        };
      }
      taskMap[log.taskId].totalHours += h;
      taskMap[log.taskId].amount += h * hourlyRate;
      taskMap[log.taskId].sessionsCount += 1;
    }
  }

  const taskBreakdown = Object.values(taskMap).map((item) => ({
    ...item,
    totalHours: Math.round(item.totalHours * 100) / 100,
    amount: Math.round(item.amount * 100) / 100,
  }));

  const totalEarnedPaid = invoices
    .filter((inv) => inv.status === InvoiceStatus.PAID)
    .reduce((acc, inv) => acc + inv.amount, 0);

  const totalEarnedApproved = invoices
    .filter((inv) => inv.status === InvoiceStatus.APPROVED)
    .reduce((acc, inv) => acc + inv.amount, 0);

  return {
    linkedClient: client,
    hourlyRate,
    totalApprovedHours: Math.round(totalApprovedHours * 100) / 100,
    totalPendingHours: Math.round(totalPendingHours * 100) / 100,
    totalEarnedPaid: Math.round(totalEarnedPaid * 100) / 100,
    totalEarnedApproved: Math.round(totalEarnedApproved * 100) / 100,
    invoices,
    taskBreakdown,
  };
}
