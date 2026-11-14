import { prisma } from "../prisma";
import { TimeLogStatus } from "@prisma/client";
import type { ReportLogItem, FormattedInvoiceSummary } from "../reports";
import { calculateLogAmount, sumMoney } from "../money";

export interface ReportPayload {
  role: "STUDENT" | "CLIENT";
  studentName?: string;
  clientName?: string;
  hourlyRate: number;
  linked: boolean;
  logs: ReportLogItem[];
  invoices: FormattedInvoiceSummary[];
}

/**
 * Retrieves report data for the Student role.
 * Security: fetches only the student's own logs and invoices.
 * Never includes class subjects, emails, internal notes or other users' data.
 */
export async function getStudentReportData(studentId: string): Promise<ReportPayload> {
  const [link, logsRaw, invoicesRaw] = await Promise.all([
    prisma.clientStudentLink.findFirst({
      where: { studentId, status: "ACTIVE" },
      include: { client: { select: { name: true } } },
    }),
    prisma.timeLog.findMany({
      where: {
        studentId,
        status: { in: [TimeLogStatus.CLOSED, TimeLogStatus.APPROVED] },
      },
      select: {
        id: true,
        taskId: true,
        timeIn: true,
        timeOut: true,
        totalHours: true,
        status: true,
        task: {
          select: {
            title: true,
            status: true,
          },
        },
      },
      orderBy: { timeIn: "desc" },
    }),
    prisma.invoice.findMany({
      where: { studentId },
      select: {
        id: true,
        totalHours: true,
        rate: true,
        amount: true,
        status: true,
        createdAt: true,
        timeLogs: {
          select: { totalHours: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const hourlyRate = link?.hourlyRate ?? 150;

  const logs: ReportLogItem[] = logsRaw.map((l) => ({
    id: l.id,
    taskId: l.taskId,
    taskTitle: l.task.title,
    taskStatus: l.task.status,
    timeIn: l.timeIn,
    timeOut: l.timeOut,
    totalHours: l.totalHours,
    status: l.status,
  }));

  const invoices: FormattedInvoiceSummary[] = invoicesRaw.map((i) => {
    const amount = i.timeLogs?.length
      ? sumMoney(i.timeLogs.map((l) => calculateLogAmount(l.totalHours, i.rate)))
      : i.amount;

    return {
      id: i.id,
      totalHours: i.totalHours,
      rate: i.rate,
      amount,
      status: i.status,
      createdAt: i.createdAt,
    };
  });

  return {
    role: "STUDENT",
    clientName: link?.client?.name,
    hourlyRate,
    linked: Boolean(link),
    logs,
    invoices,
  };
}

/**
 * Retrieves report data for the Client role.
 * Security: fetches only logs associated with the linked student and this client's tasks.
 * Never includes class subjects, emails, internal notes or other users' data.
 */
export async function getClientReportData(clientId: string): Promise<ReportPayload> {
  const link = await prisma.clientStudentLink.findFirst({
    where: { clientId, status: "ACTIVE" },
    include: { student: { select: { id: true, name: true } } },
  });

  const hourlyRate = link?.hourlyRate ?? 150;
  const student = link?.student ?? null;

  if (!student) {
    return {
      role: "CLIENT",
      studentName: undefined,
      hourlyRate,
      linked: false,
      logs: [],
      invoices: [],
    };
  }

  const [logsRaw, invoicesRaw] = await Promise.all([
    prisma.timeLog.findMany({
      where: {
        studentId: student.id,
        task: { clientId },
        status: { in: [TimeLogStatus.CLOSED, TimeLogStatus.APPROVED] },
      },
      select: {
        id: true,
        taskId: true,
        timeIn: true,
        timeOut: true,
        totalHours: true,
        status: true,
        task: {
          select: {
            title: true,
            status: true,
          },
        },
      },
      orderBy: { timeIn: "desc" },
    }),
    prisma.invoice.findMany({
      where: {
        clientId,
        studentId: student.id,
      },
      select: {
        id: true,
        totalHours: true,
        rate: true,
        amount: true,
        status: true,
        createdAt: true,
        timeLogs: {
          select: { totalHours: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const logs: ReportLogItem[] = logsRaw.map((l) => ({
    id: l.id,
    taskId: l.taskId,
    taskTitle: l.task.title,
    taskStatus: l.task.status,
    timeIn: l.timeIn,
    timeOut: l.timeOut,
    totalHours: l.totalHours,
    status: l.status,
  }));

  const invoices: FormattedInvoiceSummary[] = invoicesRaw.map((i) => {
    const amount = i.timeLogs?.length
      ? sumMoney(i.timeLogs.map((l) => calculateLogAmount(l.totalHours, i.rate)))
      : i.amount;

    return {
      id: i.id,
      totalHours: i.totalHours,
      rate: i.rate,
      amount,
      status: i.status,
      createdAt: i.createdAt,
    };
  });

  return {
    role: "CLIENT",
    studentName: student.name,
    hourlyRate,
    linked: true,
    logs,
    invoices,
  };
}

