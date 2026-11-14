import { prisma } from "../prisma";
import { InvoiceStatus, TimeLogStatus, CorrectionStatus } from "@prisma/client";
import { createNotification } from "../notifications";
import { publishLiveUpdate } from "../live-updates";
import {
  calculateLoggedHours,
  calculateLogAmount,
  sumMoney,
  hoursToMinutes,
  calculateTotalAmountFromLogs,
} from "../money";
import { formatHours, formatPeso } from "../format";

export interface InvoiceLineItem {
  id: string;
  timeIn: Date;
  timeOut: Date | null;
  totalHours: number;
  taskTitle: string;
  sessionNote?: string | null;
  amount: number;
}

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
  lineItems?: InvoiceLineItem[];
}

export interface ClientTimesheetData {
  linkedStudent: { id: string; name: string } | null;
  hourlyRate: number;
  pendingLogs: {
    id: string;
    taskId: string;
    taskTitle: string;
    taskEstHours: number;
    taskLoggedHours: number;
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
    taskEstHours: number;
    taskLoggedHours: number;
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
      include: {
        task: {
          select: {
            title: true,
            estHours: true,
            timeLogs: {
              select: { totalHours: true },
            },
          },
        },
      },
      orderBy: { timeIn: "desc" },
    }),
    prisma.invoice.findMany({
      where: { clientId, studentId: student.id },
      include: {
        student: { select: { name: true } },
        client: { select: { name: true } },
        timeLogs: {
          select: {
            id: true,
            timeIn: true,
            timeOut: true,
            totalHours: true,
            correctionNote: true,
            task: {
              select: {
                title: true,
              },
            },
          },
          orderBy: { timeIn: "asc" },
        },
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
      taskEstHours: l.task.estHours ?? 0,
      taskLoggedHours: Math.round(
        (l.task.timeLogs?.reduce((acc, tl) => acc + (tl.totalHours ?? 0), 0) ?? 0) * 60
      ) / 60,
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
      taskEstHours: l.task.estHours ?? 0,
      taskLoggedHours: Math.round(
        (l.task.timeLogs?.reduce((acc, tl) => acc + (tl.totalHours ?? 0), 0) ?? 0) * 60
      ) / 60,
      timeIn: l.timeIn,
      timeOut: l.timeOut,
      totalHours: l.totalHours ?? 0,
      status: l.status,
    }));

  const invoices: FormattedInvoice[] = invoicesRaw.map((inv) => {
    const lineItems: InvoiceLineItem[] = (inv.timeLogs ?? []).map((tl) => ({
      id: tl.id,
      timeIn: tl.timeIn,
      timeOut: tl.timeOut,
      totalHours: tl.totalHours ?? 0,
      taskTitle: tl.task.title,
      sessionNote: tl.correctionNote,
      amount: calculateLogAmount(tl.totalHours, inv.rate),
    }));

    const computedAmount =
      lineItems.length > 0 ? sumMoney(lineItems.map((l) => l.amount)) : inv.amount;

    return {
      id: inv.id,
      studentId: inv.studentId,
      clientId: inv.clientId,
      studentName: inv.student.name,
      clientName: inv.client.name,
      totalHours: inv.totalHours,
      rate: inv.rate,
      amount: computedAmount,
      status: inv.status,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
      lineItems,
    };
  });

  const pendingHours = pendingLogs.reduce((acc, l) => acc + l.totalHours, 0);
  const approvedHours = approvedLogs.reduce((acc, l) => acc + l.totalHours, 0);

  const pendingAmount = sumMoney(
    pendingLogs.map((l) => calculateLogAmount(l.totalHours, hourlyRate))
  );
  const approvedAmount = sumMoney(
    approvedLogs.map((l) => calculateLogAmount(l.totalHours, hourlyRate))
  );

  return {
    linkedStudent: student,
    hourlyRate,
    pendingLogs,
    approvedLogs,
    invoices,
    pendingHours: Math.round(pendingHours * 60) / 60,
    approvedHours: Math.round(approvedHours * 60) / 60,
    pendingAmount,
    approvedAmount,
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

  if (log.status !== TimeLogStatus.CLOSED) {
    throw new Error("Only a closed time log can be approved.");
  }

  const studentId = log.studentId;
  const link = await prisma.clientStudentLink.findFirst({
    where: { clientId, studentId, status: "ACTIVE" },
  });
  const rate = link?.hourlyRate ?? 150;

  const result = await prisma.$transaction(async (tx) => {
    // The conditional transition makes approval idempotent under concurrent requests.
    const transition = await tx.timeLog.updateMany({
      where: { id: timeLogId, status: TimeLogStatus.CLOSED },
      data: { status: TimeLogStatus.APPROVED },
    });

    if (transition.count !== 1) {
      throw new Error("Only a closed time log can be approved.");
    }

    const approvedLog = await tx.timeLog.findUniqueOrThrow({
      where: { id: timeLogId },
    });
    const logHours = approvedLog.totalHours ?? 0;
    const logAmount = calculateLogAmount(logHours, rate);

    const existingInvoice = await tx.invoice.findFirst({
      where: {
        clientId,
        studentId,
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.APPROVED] },
      },
      orderBy: { createdAt: "desc" },
    });

    let invoice;
    if (existingInvoice) {
      const existingLogs = await tx.timeLog.findMany({
        where: { invoiceId: existingInvoice.id },
        select: { totalHours: true },
      });
      let newTotalHours: number;
      let newAmount: number;

      if (existingLogs.length > 0) {
        const allLogs = [...existingLogs, { totalHours: logHours }];
        newTotalHours = Math.round(allLogs.reduce((acc, l) => acc + (l.totalHours ?? 0), 0) * 60) / 60;
        newAmount = calculateTotalAmountFromLogs(allLogs, rate);
      } else {
        newTotalHours = Math.round((existingInvoice.totalHours + logHours) * 60) / 60;
        newAmount = sumMoney([existingInvoice.amount, logAmount]);
      }

      invoice = await tx.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          totalHours: newTotalHours,
          amount: newAmount,
          status: InvoiceStatus.APPROVED,
        },
      });
    } else {
      invoice = await tx.invoice.create({
        data: {
          clientId,
          studentId,
          totalHours: logHours,
          rate,
          amount: logAmount,
          status: InvoiceStatus.APPROVED,
        },
      });
    }

    await tx.timeLog.update({
      where: { id: timeLogId },
      data: { invoiceId: invoice.id },
    });

    const clientUser = await tx.user.findUnique({
      where: { id: clientId },
      select: { name: true },
    });
    const clientName = clientUser?.name || "Client";

    await createNotification(tx, {
      recipientId: studentId,
      actorId: clientId,
      type: "HOURS_APPROVED",
      message: `${clientName} approved ${formatHours(logHours)} for ${log.task.title}. Invoice total: ${formatPeso(invoice.amount)}`,
    });

    return { approvedLog, invoice };
  });

  publishLiveUpdate([clientId, studentId], "timesheets");
  publishLiveUpdate([clientId, studentId], "earnings");

  return result;
}

/**
 * Disputes a time log with a reason in one transaction.
 */
export async function disputeTimeLog(clientId: string, timeLogId: string, disputeReason: string) {
  const result = await prisma.$transaction(async (tx) => {
    const log = await tx.timeLog.findUnique({
      where: { id: timeLogId },
      include: {
        task: {
          include: {
            client: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!log || log.task.clientId !== clientId) {
      throw new Error("Time log not found or unauthorized.");
    }

    if (log.status !== TimeLogStatus.CLOSED) {
      throw new Error("Only a closed time log can be disputed.");
    }

    if (log.disputeReason) {
      throw new Error("This was already done.");
    }

    const truncatedReason = disputeReason.trim().slice(0, 140);

    const updateRes = await tx.timeLog.updateMany({
      where: {
        id: timeLogId,
        status: TimeLogStatus.CLOSED,
        disputeReason: null,
      },
      data: { disputeReason: truncatedReason },
    });

    if (updateRes.count !== 1) {
      throw new Error("This was already done.");
    }

    const clientName = log.task.client.name || "Client";
    const formattedH = formatHours(log.totalHours ?? 0);

    await createNotification(tx, {
      recipientId: log.studentId,
      actorId: clientId,
      type: "HOURS_DISPUTED",
      message: `${clientName} disputed ${formattedH} on ${log.task.title}. Reason: ${truncatedReason}`,
    });

    return await tx.timeLog.findUniqueOrThrow({ where: { id: timeLogId } });
  });

  if (result) {
    // Look up the log to find the counterpart studentId
    const log = await prisma.timeLog.findUnique({
      where: { id: timeLogId },
      select: { studentId: true },
    });
    if (log) {
      publishLiveUpdate([clientId, log.studentId], "timesheets");
      publishLiveUpdate([clientId, log.studentId], "earnings");
    }
  }

  return result;
}

/**
 * Approves or rejects a student's requested time correction in one transaction.
 */
export async function respondToCorrection(
  clientId: string,
  timeLogId: string,
  decision: "APPROVE" | "REJECT"
) {
  const result = await prisma.$transaction(async (tx) => {
    const log = await tx.timeLog.findUnique({
      where: { id: timeLogId },
      include: {
        task: {
          include: {
            client: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!log || log.task.clientId !== clientId) {
      throw new Error("Time log not found or unauthorized.");
    }

    if (log.correctionStatus !== CorrectionStatus.PENDING) {
      throw new Error("This time log has no pending correction request.");
    }

    const clientName = log.task.client.name || "Client";

    if (decision === "APPROVE") {
      if (!log.requestedTimeOut) {
        throw new Error("No requested time out recorded on this log.");
      }
      const newHours = calculateLoggedHours(log.timeIn, log.requestedTimeOut);

      const updateRes = await tx.timeLog.updateMany({
        where: { id: timeLogId, correctionStatus: CorrectionStatus.PENDING },
        data: {
          timeOut: log.requestedTimeOut,
          totalHours: newHours,
          correctionStatus: CorrectionStatus.APPROVED,
        },
      });

      if (updateRes.count !== 1) {
        throw new Error("This was already done.");
      }

      await createNotification(tx, {
        recipientId: log.studentId,
        actorId: clientId,
        type: "CORRECTION_APPROVED",
        message: `${clientName} approved your time correction on ${log.task.title}. New total: ${formatHours(newHours)}`,
      });

      return await tx.timeLog.findUniqueOrThrow({ where: { id: timeLogId } });
    } else {
      const updateRes = await tx.timeLog.updateMany({
        where: { id: timeLogId, correctionStatus: CorrectionStatus.PENDING },
        data: { correctionStatus: CorrectionStatus.REJECTED },
      });

      if (updateRes.count !== 1) {
        throw new Error("This was already done.");
      }

      await createNotification(tx, {
        recipientId: log.studentId,
        actorId: clientId,
        type: "CORRECTION_REJECTED",
        message: `${clientName} declined your time correction on ${log.task.title}`,
      });

      return await tx.timeLog.findUniqueOrThrow({
        where: { id: timeLogId },
        include: { task: { select: { studentId: true } } },
      });
    }
  });

  if (result) {
    const studentId = (result as any).task?.studentId ?? (result as any).studentId;
    if (studentId) {
      publishLiveUpdate([clientId, studentId], "time");
      publishLiveUpdate([clientId, studentId], "timesheets");
    }
  }

  return result;
}

/**
 * Marks an invoice as PAID in one transaction (Acceptance Test Scenario 11).
 */
export async function markInvoicePaid(clientId: string, invoiceId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice || invoice.clientId !== clientId) {
      throw new Error("Invoice not found or unauthorized.");
    }

    if (invoice.status !== InvoiceStatus.APPROVED) {
      throw new Error("Only an approved invoice can be marked as paid.");
    }

    const updateRes = await tx.invoice.updateMany({
      where: { id: invoiceId, clientId, status: InvoiceStatus.APPROVED },
      data: { status: InvoiceStatus.PAID },
    });

    if (updateRes.count !== 1) {
      throw new Error("This was already done.");
    }

    const clientUser = await tx.user.findUnique({
      where: { id: clientId },
      select: { name: true },
    });
    const clientName = clientUser?.name || "Client";

    await createNotification(tx, {
      recipientId: invoice.studentId,
      actorId: clientId,
      type: "INVOICE_PAID",
      message: `${clientName} marked your ${formatPeso(invoice.amount)} invoice as paid`,
    });

    return await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  });

  if (result) {
    publishLiveUpdate([clientId, result.studentId], "timesheets");
    publishLiveUpdate([clientId, result.studentId], "earnings");
  }

  return result;
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
        timeLogs: {
          select: {
            id: true,
            timeIn: true,
            timeOut: true,
            totalHours: true,
            correctionNote: true,
            task: {
              select: {
                title: true,
              },
            },
          },
          orderBy: { timeIn: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const invoices: FormattedInvoice[] = invoicesRaw.map((inv) => {
    const lineItems: InvoiceLineItem[] = (inv.timeLogs ?? []).map((tl) => ({
      id: tl.id,
      timeIn: tl.timeIn,
      timeOut: tl.timeOut,
      totalHours: tl.totalHours ?? 0,
      taskTitle: tl.task.title,
      sessionNote: tl.correctionNote,
      amount: calculateLogAmount(tl.totalHours, inv.rate),
    }));

    const computedAmount =
      lineItems.length > 0 ? sumMoney(lineItems.map((l) => l.amount)) : inv.amount;

    return {
      id: inv.id,
      studentId: inv.studentId,
      clientId: inv.clientId,
      studentName: inv.student.name,
      clientName: inv.client.name,
      totalHours: inv.totalHours,
      rate: inv.rate,
      amount: computedAmount,
      status: inv.status,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
      lineItems,
    };
  });

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
      const logAmount = calculateLogAmount(h, hourlyRate);
      taskMap[log.taskId].totalHours += h;
      taskMap[log.taskId].amount = sumMoney([taskMap[log.taskId].amount, logAmount]);
      taskMap[log.taskId].sessionsCount += 1;
    }
  }

  const taskBreakdown = Object.values(taskMap).map((item) => ({
    ...item,
    totalHours: Math.round(item.totalHours * 60) / 60,
    amount: item.amount,
  }));

  const totalEarnedPaid = sumMoney(
    invoices.filter((inv) => inv.status === InvoiceStatus.PAID).map((inv) => inv.amount)
  );

  const totalEarnedApproved = sumMoney(
    invoices.filter((inv) => inv.status === InvoiceStatus.APPROVED).map((inv) => inv.amount)
  );

  return {
    linkedClient: client,
    hourlyRate,
    totalApprovedHours: Math.round(totalApprovedHours * 60) / 60,
    totalPendingHours: Math.round(totalPendingHours * 60) / 60,
    totalEarnedPaid,
    totalEarnedApproved,
    invoices,
    taskBreakdown,
  };
}
