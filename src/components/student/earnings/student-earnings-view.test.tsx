import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { StudentEarningsView } from "./student-earnings-view";
import { StudentEarningsData } from "@/lib/services/invoice-service";
import { InvoiceStatus, TimeLogStatus } from "@prisma/client";

describe("StudentEarningsView Redesign", () => {
  const sampleData: StudentEarningsData = {
    linkedClient: { id: "client-1", name: "Maria Santos" },
    hourlyRate: 150,
    totalApprovedHours: 4.5,
    totalPendingHours: 2.0,
    totalEarnedPaid: 450,
    totalEarnedApproved: 225,
    invoices: [
      {
        id: "inv-1",
        studentId: "student-1",
        clientId: "client-1",
        clientName: "Maria Santos",
        totalHours: 3.0,
        rate: 150,
        amount: 450,
        status: InvoiceStatus.PAID,
        createdAt: new Date("2026-11-05T08:00:00.000Z"),
        updatedAt: new Date("2026-11-06T08:00:00.000Z"),
      },
      {
        id: "inv-2",
        studentId: "student-1",
        clientId: "client-1",
        clientName: "Maria Santos",
        totalHours: 1.5,
        rate: 150,
        amount: 225,
        status: InvoiceStatus.APPROVED,
        createdAt: new Date("2026-11-10T08:00:00.000Z"),
        updatedAt: new Date("2026-11-10T08:00:00.000Z"),
      },
    ],
    taskBreakdown: [
      {
        taskId: "task-1",
        taskTitle: "Research Competitor Pricing Analysis",
        totalHours: 4.0,
        amount: 600,
        sessionsCount: 3,
      },
      {
        taskId: "task-2",
        taskTitle: "Lead List Cleanup",
        totalHours: 2.5,
        amount: 375,
        sessionsCount: 2,
      },
    ],
  };

  const sampleLogs = [
    {
      id: "log-1",
      timeIn: new Date("2026-11-10T02:00:00.000Z"),
      totalHours: 2.0,
      status: TimeLogStatus.CLOSED,
    },
    {
      id: "log-2",
      timeIn: new Date("2026-11-09T04:00:00.000Z"),
      totalHours: 1.5,
      status: TimeLogStatus.APPROVED,
    },
    {
      id: "log-3",
      timeIn: new Date("2026-11-04T05:00:00.000Z"),
      totalHours: 3.0,
      status: TimeLogStatus.APPROVED,
    },
  ];

  it("renders header with Earnings title, subtitle, and client pill with initials & rate", () => {
    const html = renderToString(
      <StudentEarningsView initialData={sampleData} loggedHours={sampleLogs} />
    );

    expect(html).toContain("Earnings");
    expect(html).toContain("Your logged hours, invoices and payments.");
    expect(html).toContain("Maria Santos");
    expect(html).toContain("MS");
    expect(html).toContain("₱150.00/hr");
    // Ensure "Agreed rate" tile is removed
    expect(html).not.toContain("Agreed rate");
  });

  it("renders Hero Card with segmented period toggle, display-font total, and breakdown", () => {
    const html = renderToString(
      <StudentEarningsView initialData={sampleData} loggedHours={sampleLogs} />
    );

    expect(html).toContain('data-testid="earnings-period-toggle"');
    expect(html).toContain("This week");
    expect(html).toContain("This month");
    expect(html).toContain("All time");
    expect(html).toContain('data-testid="earnings-total"');
    expect(html).toContain('data-testid="earnings-breakdown"');
    expect(html).toContain("Logged this month");

    // Must not use blue for segmented bar or breakdown (blue is reserved for class schedule)
    const breakdownIndex = html.indexOf('data-testid="earnings-breakdown"');
    const breakdownSection = html.slice(breakdownIndex, breakdownIndex + 2000);
    expect(breakdownSection).not.toContain("bg-[#2563EB]");
    expect(breakdownSection).not.toContain("bg-blue-");
  });

  it("renders three compact tiles with data-kind attributes and formatted values", () => {
    const html = renderToString(
      <StudentEarningsView initialData={sampleData} loggedHours={sampleLogs} />
    );

    expect(html).toContain('data-testid="earnings-tile" data-kind="paid"');
    expect(html).toContain("₱450.00");
    expect(html).toContain("1 invoice paid");

    expect(html).toContain('data-testid="earnings-tile" data-kind="awaiting-payment"');
    expect(html).toContain("₱225.00");
    expect(html).toContain("Approved by your client");

    expect(html).toContain('data-testid="earnings-tile" data-kind="waiting-approval"');
    expect(html).toContain("2h");
    expect(html).toContain("About ₱300.00 at ₱150.00/hr");
  });

  it("renders Invoices section with table rows, newest first, StatusBadge, and View buttons", () => {
    const html = renderToString(
      <StudentEarningsView initialData={sampleData} loggedHours={sampleLogs} />
    );

    expect(html).toContain("Invoices");
    expect(html).toContain('data-testid="invoice-row" data-status="approved"');
    expect(html).toContain('data-testid="invoice-row" data-status="paid"');
    expect(html).toContain('data-testid="invoice-view"');
    // Ensure "Invoice #id" text is removed
    expect(html).not.toContain("Invoice #");
    expect(html).not.toContain("inv-1");
  });

  it("renders invoice Sheet with 3-step status indicator and Approved status note", () => {
    const approvedInvoice = sampleData.invoices[1];
    const html = renderToString(
      <StudentEarningsView
        initialData={sampleData}
        loggedHours={sampleLogs}
        initialSelectedInvoice={approvedInvoice}
        initialSheetOpen={true}
      />
    );

    expect(html).toContain('data-testid="invoice-sheet"');
    expect(html).toContain("Pending");
    expect(html).toContain("Approved");
    expect(html).toContain("Paid");
    expect(html).toContain("Total approved hours");
    expect(html).toContain("Payment is arranged directly with your client. They will mark this invoice as paid.");
    // No payment button for student
    expect(html).not.toContain("Pay Now");
    expect(html).not.toContain("Make Payment");
  });

  it("renders By Task section with task titles, sessions in normal ink, hours, Value (not Earned), and total footer", () => {
    const html = renderToString(
      <StudentEarningsView initialData={sampleData} loggedHours={sampleLogs} />
    );

    expect(html).toContain("By task");
    expect(html).toContain('data-testid="earnings-task-row"');
    expect(html).toContain("Research Competitor Pricing Analysis");
    expect(html).toContain("Lead List Cleanup");
    // Sessions count in normal ink
    expect(html).toContain("3");
    expect(html).toContain("2");
    // Column title should be "Value", not "Earned"
    expect(html).toContain("Value");
    // Total footer row
    expect(html).toContain("Total");
    expect(html).toContain("6h 30m");
    expect(html).toContain("₱975.00");
  });

  it("renders compact empty states when there are no invoices or tasks", () => {
    const emptyData: StudentEarningsData = {
      linkedClient: null,
      hourlyRate: 150,
      totalApprovedHours: 0,
      totalPendingHours: 0,
      totalEarnedPaid: 0,
      totalEarnedApproved: 0,
      invoices: [],
      taskBreakdown: [],
    };

    const html = renderToString(
      <StudentEarningsView initialData={emptyData} loggedHours={[]} />
    );

    expect(html).toContain("No invoices yet. When your client approves your hours, an invoice shows up here.");
    expect(html).toContain("No hours logged yet. Time in on a task to start earning.");
    expect(html).toContain("Nothing logged in this period yet.");
    expect(html).toContain("0 invoices paid");
  });

  it("conforms to copy rules: avoids payout, cleared payments, and awaiting client payout", () => {
    const html = renderToString(
      <StudentEarningsView initialData={sampleData} loggedHours={sampleLogs} />
    );

    expect(html).not.toContain("payout");
    expect(html).not.toContain("Payout");
    expect(html).not.toContain("Cleared payments");
    expect(html).not.toContain("Awaiting client payout");
  });
});
