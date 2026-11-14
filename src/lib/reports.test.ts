import { describe, it, expect } from "vitest";
import { TaskStatus, TimeLogStatus, InvoiceStatus } from "@prisma/client";
import {
  getReportDateRange,
  isLogInRange,
  calculateReportTotals,
  groupLogsByTask,
  buildReportCsv,
  escapeCsvField,
  getReportFileName,
  type ReportLogItem,
  type FormattedInvoiceSummary,
} from "./reports";

describe("reports - range logic & Manila boundaries", () => {
  // Reference date: Wednesday, Nov 11, 2026 12:00:00 UTC (8:00 PM Manila)
  const refDate = new Date("2026-11-11T12:00:00Z");

  it("calculates 'this-week' correctly starting on Monday in Asia/Manila", () => {
    const range = getReportDateRange("this-week", null, null, refDate);
    expect(range.preset).toBe("this-week");
    expect(range.from).toBe("2026-11-09"); // Monday
    expect(range.to).toBe("2026-11-15");   // Sunday
  });

  it("calculates 'this-month' correctly across month boundaries in Asia/Manila", () => {
    const range = getReportDateRange("this-month", null, null, refDate);
    expect(range.preset).toBe("this-month");
    expect(range.from).toBe("2026-11-01");
    expect(range.to).toBe("2026-11-30");
  });

  it("handles 'custom' range with valid ISO date strings", () => {
    const range = getReportDateRange("custom", "2026-11-05", "2026-11-20", refDate);
    expect(range.preset).toBe("custom");
    expect(range.from).toBe("2026-11-05");
    expect(range.to).toBe("2026-11-20");
  });

  it("auto-swaps inverted custom date ranges so from <= to", () => {
    const range = getReportDateRange("custom", "2026-11-25", "2026-11-05", refDate);
    expect(range.preset).toBe("custom");
    expect(range.from).toBe("2026-11-05");
    expect(range.to).toBe("2026-11-25");
  });

  it("falls back to current month boundaries if custom dates are invalid", () => {
    const range = getReportDateRange("custom", "invalid-date", null, refDate);
    expect(range.preset).toBe("custom");
    expect(range.from).toBe("2026-11-01");
    expect(range.to).toBe("2026-11-30");
  });

  it("respects Asia/Manila boundaries for UTC time logs (UTC+8)", () => {
    // 2026-11-08 15:59:59 UTC = 2026-11-08 23:59:59 Manila (Sunday, outside Nov 9-15 week)
    const justBeforeWeek = new Date("2026-11-08T15:59:59Z");
    expect(isLogInRange(justBeforeWeek, "2026-11-09", "2026-11-15")).toBe(false);

    // 2026-11-08 16:00:00 UTC = 2026-11-09 00:00:00 Manila (Monday midnight, INSIDE week)
    const exactWeekStart = new Date("2026-11-08T16:00:00Z");
    expect(isLogInRange(exactWeekStart, "2026-11-09", "2026-11-15")).toBe(true);

    // 2026-11-15 15:59:59 UTC = 2026-11-15 23:59:59 Manila (Sunday end of day, INSIDE week)
    const exactWeekEnd = new Date("2026-11-15T15:59:59Z");
    expect(isLogInRange(exactWeekEnd, "2026-11-09", "2026-11-15")).toBe(true);

    // 2026-11-15 16:00:00 UTC = 2026-11-16 00:00:00 Manila (Next Monday, OUTSIDE week)
    const justAfterWeek = new Date("2026-11-15T16:00:00Z");
    expect(isLogInRange(justAfterWeek, "2026-11-09", "2026-11-15")).toBe(false);
  });
});

describe("reports - totals and task grouping", () => {
  const rate = 150; // ₱150/hr

  const sampleLogs: ReportLogItem[] = [
    {
      id: "log-1",
      taskId: "task-a",
      taskTitle: "Research Competitors",
      taskStatus: TaskStatus.DONE,
      timeIn: "2026-11-09T08:00:00Z",
      timeOut: "2026-11-09T10:00:00Z",
      totalHours: 2, // 2h * 150 = 300
      status: TimeLogStatus.APPROVED,
    },
    {
      id: "log-2",
      taskId: "task-a",
      taskTitle: "Research Competitors",
      taskStatus: TaskStatus.DONE,
      timeIn: "2026-11-10T08:00:00Z",
      timeOut: "2026-11-10T09:30:00Z",
      totalHours: 1.5, // 1.5h * 150 = 225
      status: TimeLogStatus.APPROVED,
    },
    {
      id: "log-3",
      taskId: "task-b",
      taskTitle: "Social Media Graphics",
      taskStatus: TaskStatus.DOING,
      timeIn: "2026-11-11T08:00:00Z",
      timeOut: "2026-11-11T10:00:00Z",
      totalHours: 2, // 2h * 150 = 300
      status: TimeLogStatus.CLOSED, // pending approval
    },
  ];

  it("groups logs by task and computes aggregated hours and centavo-accurate amounts", () => {
    const groups = groupLogsByTask(sampleLogs, rate);
    expect(groups).toHaveLength(2);

    // First task (task-a has 3.5h total)
    const taskA = groups.find((g) => g.taskId === "task-a");
    expect(taskA).toBeDefined();
    expect(taskA?.taskTitle).toBe("Research Competitors");
    expect(taskA?.hours).toBe(3.5);
    expect(taskA?.amount).toBe(525); // 300 + 225 = 525.00
    expect(taskA?.status).toBe(TaskStatus.DONE);

    // Second task (task-b has 2h)
    const taskB = groups.find((g) => g.taskId === "task-b");
    expect(taskB).toBeDefined();
    expect(taskB?.hours).toBe(2);
    expect(taskB?.amount).toBe(300);
    expect(taskB?.status).toBe(TaskStatus.DOING);
  });

  it("calculates report totals separating approved and waiting hours and amounts", () => {
    const totals = calculateReportTotals(sampleLogs, rate, []);

    // Approved: log-1 (2h) + log-2 (1.5h) = 3.5h, ₱525.00
    expect(totals.approvedHours).toBe(3.5);
    expect(totals.approvedAmount).toBe(525);

    // Pending: log-3 (2h) = 2h, ₱300.00
    expect(totals.pendingHours).toBe(2);
    expect(totals.pendingAmount).toBe(300);

    // Overall
    expect(totals.totalHours).toBe(5.5);
    expect(totals.totalAmount).toBe(825);
  });

  it("accurately splits approved amount into paid vs unpaid amounts based on invoices", () => {
    // 1 approved invoice of 2 hours (₱300.00) awaiting payment
    const invoices: FormattedInvoiceSummary[] = [
      {
        id: "inv-1",
        totalHours: 2,
        rate: 150,
        amount: 300,
        status: InvoiceStatus.APPROVED, // awaiting payment
        createdAt: "2026-11-10T12:00:00Z",
      },
    ];

    const totals = calculateReportTotals(sampleLogs, rate, invoices);

    // Out of 3.5 approved hours:
    // 2h is in approved invoice awaiting payment (unpaid) -> ₱300.00
    // Remaining 1.5h is paid -> ₱225.00
    expect(totals.unpaidAmount).toBe(300);
    expect(totals.paidAmount).toBe(225);
    expect(totals.paidAmount + totals.unpaidAmount).toBe(totals.approvedAmount);
  });

  it("marks all approved hours as paid when invoice status is PAID", () => {
    const invoices: FormattedInvoiceSummary[] = [
      {
        id: "inv-1",
        totalHours: 3.5,
        rate: 150,
        amount: 525,
        status: InvoiceStatus.PAID,
        createdAt: "2026-11-10T12:00:00Z",
      },
    ];

    const totals = calculateReportTotals(sampleLogs, rate, invoices);
    expect(totals.paidAmount).toBe(525);
    expect(totals.unpaidAmount).toBe(0);
  });
});

describe("reports - CSV builder & escaping", () => {
  it("escapes quotes and commas in fields according to RFC 4180", () => {
    expect(escapeCsvField("Simple Title")).toBe("Simple Title");
    expect(escapeCsvField("Title, with comma")).toBe('"Title, with comma"');
    expect(escapeCsvField('Title with "quotes"')).toBe('"Title with ""quotes"""');
    expect(escapeCsvField("Title with\nnewline")).toBe('"Title with\nnewline"');
  });

  it("formats decimal columns to 2 places and excludes currency symbols", () => {
    const groups = [
      {
        taskId: "t1",
        taskTitle: "Design, Social Media Banner",
        hours: 4.5,
        amount: 675,
        status: TaskStatus.DONE,
      },
      {
        taskId: "t2",
        taskTitle: 'Review "Product" Roadmap',
        hours: 1.25,
        amount: 187.5,
        status: TaskStatus.DOING,
      },
    ];

    const csv = buildReportCsv(groups);
    const lines = csv.split("\r\n");

    // Header row
    expect(lines[0]).toBe("Task,Hours,Amount,Status");

    // Row 1 (comma in title escaped, hours & amount formatted to 2 decimals)
    expect(lines[1]).toBe('"Design, Social Media Banner",4.50,675.00,Done');

    // Row 2 (quotes in title escaped, status In progress)
    expect(lines[2]).toBe('"Review ""Product"" Roadmap",1.25,187.50,In progress');

    // Final Total row
    // Hours total: 4.5 + 1.25 = 5.75
    // Amount total: 675 + 187.5 = 862.50
    expect(lines[3]).toBe("Total,5.75,862.50,");
  });

  it("generates clean standard report file name", () => {
    expect(getReportFileName("2026-11-01", "2026-11-30")).toBe(
      "vawise-report-2026-11-01-to-2026-11-30.csv"
    );
  });
});

