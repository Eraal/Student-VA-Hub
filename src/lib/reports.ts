import { TimeLogStatus, TaskStatus, InvoiceStatus } from "@prisma/client";
import { toZonedTime, format as formatZoned } from "date-fns-tz";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isValid } from "date-fns";
import { calculateLogAmount, sumMoney } from "./money";
import { TASK_STATUS_LABELS } from "./labels";
import { TIMEZONE_MANILA } from "./format";

export type ReportRangePreset = "this-week" | "this-month" | "custom";

export interface ReportDateRange {
  preset: ReportRangePreset;
  from: string; // YYYY-MM-DD in Asia/Manila
  to: string;   // YYYY-MM-DD in Asia/Manila
}

export interface ReportLogItem {
  id: string;
  taskId: string;
  taskTitle: string;
  taskStatus: TaskStatus;
  timeIn: Date | string;
  timeOut: Date | string | null;
  totalHours: number | null;
  status: TimeLogStatus;
}

export interface FormattedInvoiceSummary {
  id: string;
  totalHours: number;
  rate: number;
  amount: number;
  status: InvoiceStatus;
  createdAt: Date | string;
}

export interface ReportTotals {
  approvedHours: number;
  approvedAmount: number;
  pendingHours: number;
  pendingAmount: number;
  paidHours: number;
  paidAmount: number;
  unpaidAmount: number;
  totalHours: number;
  totalAmount: number;
}

export interface ReportTaskGroup {
  taskId: string;
  taskTitle: string;
  hours: number;
  amount: number;
  status: TaskStatus;
}

/**
 * Returns date range boundaries (YYYY-MM-DD) in Asia/Manila for a given preset or custom interval.
 * Week starts on Monday (weekStartsOn: 1) per Manila business calendar standards.
 */
export function getReportDateRange(
  preset: ReportRangePreset,
  customFrom?: string | null,
  customTo?: string | null,
  referenceDate: Date = new Date()
): ReportDateRange {
  const zonedNow = toZonedTime(referenceDate, TIMEZONE_MANILA);

  if (preset === "this-week") {
    const weekStart = startOfWeek(zonedNow, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(zonedNow, { weekStartsOn: 1 });
    return {
      preset: "this-week",
      from: formatZoned(weekStart, "yyyy-MM-dd"),
      to: formatZoned(weekEnd, "yyyy-MM-dd"),
    };
  }

  if (preset === "this-month") {
    const monthStart = startOfMonth(zonedNow);
    const monthEnd = endOfMonth(zonedNow);
    return {
      preset: "this-month",
      from: formatZoned(monthStart, "yyyy-MM-dd"),
      to: formatZoned(monthEnd, "yyyy-MM-dd"),
    };
  }

  // Custom preset validation
  const isValidDateKey = (val?: string | null): boolean => {
    if (!val || typeof val !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return false;
    }
    const parsed = parseISO(val);
    return isValid(parsed);
  };

  const validFrom = isValidDateKey(customFrom);
  const validTo = isValidDateKey(customTo);

  if (validFrom && validTo) {
    let from = customFrom!;
    let to = customTo!;
    if (from > to) {
      // Swap if out of order
      const temp = from;
      from = to;
      to = temp;
    }
    return {
      preset: "custom",
      from,
      to,
    };
  }

  if (validFrom && !validTo) {
    return {
      preset: "custom",
      from: customFrom!,
      to: customFrom!,
    };
  }

  // Fallback to current month if custom dates are absent or invalid
  const fallbackStart = startOfMonth(zonedNow);
  const fallbackEnd = endOfMonth(zonedNow);
  return {
    preset: "custom",
    from: formatZoned(fallbackStart, "yyyy-MM-dd"),
    to: formatZoned(fallbackEnd, "yyyy-MM-dd"),
  };
}

/**
 * Checks whether a given UTC log timestamp falls within the [from, to] Manila calendar dates (inclusive).
 */
export function isLogInRange(
  timeIn: Date | string,
  from: string,
  to: string
): boolean {
  const dateObj = timeIn instanceof Date ? timeIn : new Date(timeIn);
  if (isNaN(dateObj.getTime())) return false;

  const zonedLog = toZonedTime(dateObj, TIMEZONE_MANILA);
  const logKey = formatZoned(zonedLog, "yyyy-MM-dd");

  return logKey >= from && logKey <= to;
}

/**
 * Groups filtered time logs by task and computes total hours and monetary amount per task.
 * Amount is computed using per-log calculateLogAmount and summed with sumMoney to prevent rounding drift.
 */
export function groupLogsByTask(
  logs: ReportLogItem[],
  hourlyRate: number
): ReportTaskGroup[] {
  const taskMap = new Map<
    string,
    {
      taskId: string;
      taskTitle: string;
      totalHours: number;
      amount: number;
      status: TaskStatus;
    }
  >();

  for (const log of logs) {
    const h = log.totalHours ?? 0;
    if (h <= 0) continue;

    const existing = taskMap.get(log.taskId);
    const logAmount = calculateLogAmount(h, hourlyRate);

    if (existing) {
      existing.totalHours += h;
      existing.amount = sumMoney([existing.amount, logAmount]);
    } else {
      taskMap.set(log.taskId, {
        taskId: log.taskId,
        taskTitle: log.taskTitle,
        totalHours: h,
        amount: logAmount,
        status: log.taskStatus,
      });
    }
  }

  return Array.from(taskMap.values())
    .map((g) => ({
      ...g,
      hours: Math.round(g.totalHours * 100) / 100,
    }))
    .sort((a, b) => b.hours - a.hours || a.taskTitle.localeCompare(b.taskTitle));
}

/**
 * Computes summary totals (hours, amounts, approved vs waiting, paid vs unpaid)
 * for the selected range, exactly consistent with the Earnings and Timesheets pages.
 */
export function calculateReportTotals(
  logs: ReportLogItem[],
  hourlyRate: number,
  invoices: FormattedInvoiceSummary[] = []
): ReportTotals {
  const approvedLogs = logs.filter((l) => l.status === TimeLogStatus.APPROVED);
  const pendingLogs = logs.filter((l) => l.status === TimeLogStatus.CLOSED);

  const approvedHours = Math.round(
    approvedLogs.reduce((sum, l) => sum + (l.totalHours ?? 0), 0) * 100
  ) / 100;

  const pendingHours = Math.round(
    pendingLogs.reduce((sum, l) => sum + (l.totalHours ?? 0), 0) * 100
  ) / 100;

  const approvedAmount = sumMoney(
    approvedLogs.map((l) => calculateLogAmount(l.totalHours, hourlyRate))
  );

  const pendingAmount = sumMoney(
    pendingLogs.map((l) => calculateLogAmount(l.totalHours, hourlyRate))
  );

  const approvedUnpaidInvoicesHours = invoices
    .filter((i) => i.status === InvoiceStatus.APPROVED)
    .reduce((sum, i) => sum + i.totalHours, 0);

  let approvedUnpaidHours = 0;
  let paidHours = 0;
  let unpaidAmount = 0;
  let paidAmount = 0;

  if (approvedUnpaidInvoicesHours > 0) {
    approvedUnpaidHours = Math.min(approvedHours, approvedUnpaidInvoicesHours);
    paidHours = Math.max(0, Math.round((approvedHours - approvedUnpaidHours) * 100) / 100);

    let accumulatedHours = 0;
    const unpaidLogs: ReportLogItem[] = [];
    const paidLogs: ReportLogItem[] = [];

    for (const log of approvedLogs) {
      const h = log.totalHours ?? 0;
      if (accumulatedHours < approvedUnpaidInvoicesHours) {
        unpaidLogs.push(log);
        accumulatedHours += h;
      } else {
        paidLogs.push(log);
      }
    }

    unpaidAmount = sumMoney(unpaidLogs.map((l) => calculateLogAmount(l.totalHours, hourlyRate)));
    paidAmount = sumMoney(paidLogs.map((l) => calculateLogAmount(l.totalHours, hourlyRate)));
  } else {
    // If no approved unpaid invoices: if there are invoices marked PAID or no invoices,
    // all approved work is considered paid; if invoices exist and none paid, unpaid.
    const hasPaidInvoices = invoices.some((i) => i.status === InvoiceStatus.PAID);
    if (hasPaidInvoices || invoices.length === 0) {
      paidHours = approvedHours;
      paidAmount = approvedAmount;
      unpaidAmount = 0;
    } else {
      unpaidAmount = approvedAmount;
      paidAmount = 0;
    }
  }

  const totalHours = Math.round((approvedHours + pendingHours) * 100) / 100;
  const totalAmount = sumMoney([approvedAmount, pendingAmount]);

  return {
    approvedHours,
    approvedAmount,
    pendingHours,
    pendingAmount,
    paidHours,
    paidAmount,
    unpaidAmount,
    totalHours,
    totalAmount,
  };
}

/**
 * Escapes CSV special characters according to RFC 4180:
 * Wraps values with double quotes if they contain commas, quotes, or newlines,
 * and doubles internal double-quotes.
 */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates the CSV string with UTF-8 BOM, header row, data rows, and final Total row.
 * Columns: Task, Hours (decimal with 2 places), Amount (number with 2 decimals, no currency symbol), Status.
 */
export function buildReportCsv(groups: ReportTaskGroup[]): string {
  const header = "Task,Hours,Amount,Status";
  const rows: string[] = [];

  let totalHours = 0;
  const amounts: number[] = [];

  for (const group of groups) {
    totalHours += group.hours;
    amounts.push(group.amount);

    const taskCol = escapeCsvField(group.taskTitle);
    const hoursCol = group.hours.toFixed(2);
    const amountCol = group.amount.toFixed(2);
    const statusCol = escapeCsvField(
      TASK_STATUS_LABELS[group.status]?.label ?? "Done"
    );

    rows.push(`${taskCol},${hoursCol},${amountCol},${statusCol}`);
  }

  const totalAmount = sumMoney(amounts);
  const totalRow = `Total,${totalHours.toFixed(2)},${totalAmount.toFixed(2)},`;

  return [header, ...rows, totalRow].join("\r\n");
}

/**
 * Produces the standard file name for report CSV exports.
 */
export function getReportFileName(from: string, to: string): string {
  return `vawise-report-${from}-to-${to}.csv`;
}

/**
 * Triggers in-browser CSV download for the report table.
 * Prepends UTF-8 BOM so Excel opens it with proper character encoding.
 */
export function downloadReportCsv(groups: ReportTaskGroup[], from: string, to: string): void {
  if (groups.length === 0) return;

  const csvBody = buildReportCsv(groups);
  const blob = new Blob(["\uFEFF" + csvBody], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = getReportFileName(from, to);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

