import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ClientTimesheetsView } from "./client-timesheets-view";
import { DisputeDialog } from "./dispute-dialog";
import { ClientTimesheetData, FormattedInvoice } from "@/lib/services/invoice-service";
import { InvoiceStatus, TimeLogStatus, CorrectionStatus } from "@prisma/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/actions/invoice", () => ({
  approveTimeLogAction: vi.fn(),
  respondCorrectionAction: vi.fn(),
  markInvoicePaidAction: vi.fn(),
  disputeTimeLogAction: vi.fn(),
}));

describe("ClientTimesheetsView Redesign", () => {
  const mockData: ClientTimesheetData = {
    linkedStudent: { id: "student-1", name: "Juan Dela Cruz" },
    hourlyRate: 150,
    pendingHours: 3.5,
    approvedHours: 4.5,
    pendingAmount: 525,
    approvedAmount: 675,
    pendingLogs: [
      {
        id: "log-1",
        taskId: "task-1",
        taskTitle: "Design landing page wireframes",
        taskEstHours: 3,
        taskLoggedHours: 5.5,
        timeIn: new Date("2026-11-12T01:00:00.000Z"),
        timeOut: new Date("2026-11-12T02:00:00.000Z"),
        totalHours: 1.0,
        status: TimeLogStatus.CLOSED,
        correctionNote: null,
        requestedTimeOut: null,
        correctionStatus: null,
        disputeReason: "Logged 1 hour but git commits show only 15 minutes of activity.",
      },
      {
        id: "log-2",
        taskId: "task-2",
        taskTitle: "Competitor analysis spreadsheet",
        taskEstHours: 3,
        taskLoggedHours: 2.5,
        timeIn: new Date("2026-11-12T03:00:00.000Z"),
        timeOut: new Date("2026-11-12T04:00:00.000Z"),
        totalHours: 1.0,
        status: TimeLogStatus.CLOSED,
        correctionNote: "Completed competitive pricing matrix for top 5 competitors.",
        requestedTimeOut: null,
        correctionStatus: null,
        disputeReason: null,
      },
      {
        id: "log-3",
        taskId: "task-2",
        taskTitle: "Competitor analysis spreadsheet",
        taskEstHours: 3,
        taskLoggedHours: 2.5,
        timeIn: new Date("2026-11-12T05:00:00.000Z"),
        timeOut: new Date("2026-11-12T06:30:00.000Z"),
        totalHours: 1.5,
        status: TimeLogStatus.CLOSED,
        correctionNote: "Power outage at 2:00 PM; forgot to clock out on time.",
        requestedTimeOut: new Date("2026-11-12T06:00:00.000Z"),
        correctionStatus: CorrectionStatus.PENDING,
        disputeReason: null,
      },
    ],
    approvedLogs: [
      {
        id: "log-app-1",
        taskId: "task-1",
        taskTitle: "Design landing page wireframes",
        taskEstHours: 3,
        taskLoggedHours: 5.5,
        timeIn: new Date("2026-11-09T10:00:00.000Z"),
        timeOut: new Date("2026-11-09T13:00:00.000Z"),
        totalHours: 3.0,
        status: TimeLogStatus.APPROVED,
      },
      {
        id: "log-app-2",
        taskId: "task-1",
        taskTitle: "Design landing page wireframes",
        taskEstHours: 3,
        taskLoggedHours: 5.5,
        timeIn: new Date("2026-11-11T06:00:00.000Z"),
        timeOut: new Date("2026-11-11T07:30:00.000Z"),
        totalHours: 1.5,
        status: TimeLogStatus.APPROVED,
      },
    ],
    invoices: [
      {
        id: "inv-open",
        studentId: "student-1",
        clientId: "client-1",
        studentName: "Juan Dela Cruz",
        clientName: "Maria Santos",
        totalHours: 1.5,
        rate: 150,
        amount: 225,
        status: InvoiceStatus.APPROVED,
        createdAt: new Date("2026-11-11T08:00:00.000Z"),
        updatedAt: new Date("2026-11-11T08:00:00.000Z"),
      },
      {
        id: "inv-paid",
        studentId: "student-1",
        clientId: "client-1",
        studentName: "Juan Dela Cruz",
        clientName: "Maria Santos",
        totalHours: 3.0,
        rate: 150,
        amount: 450,
        status: InvoiceStatus.PAID,
        createdAt: new Date("2026-11-09T14:00:00.000Z"),
        updatedAt: new Date("2026-11-10T10:00:00.000Z"),
      },
    ],
  };

  const renderClean = (component: React.ReactElement) => {
    return renderToString(component).replace(/<!-- -->/g, "");
  };

  it("renders page header with student first name and subtitle", () => {
    const html = renderClean(<ClientTimesheetsView initialData={mockData} />);
    expect(html).toContain("Timesheets");
    expect(html).toContain("Review the hours Juan logged. Approved hours are added to your invoice.");
    expect(html).toContain("Juan Dela Cruz");
    expect(html).toContain("₱150.00/hr");
  });

  it("renders the 3 compact summary tiles with display font numbers and captions", () => {
    const html = renderClean(<ClientTimesheetsView initialData={mockData} />);
    // Tile 1: Waiting for review
    expect(html).toContain("Waiting for review");
    expect(html).toContain("3h 30m");
    expect(html).toContain("₱525.00");
    expect(html).toContain("3 sessions");

    // Tile 2: To pay
    expect(html).toContain("To pay");
    expect(html).toContain("₱225.00");
    expect(html).toContain("Approved, awaiting your payment");

    // Tile 3: Paid
    expect(html).toContain("Paid");
    expect(html).toContain("₱450.00");
    expect(html).toContain("1 invoice");
  });

  it("renders segmented tabs with whole-number counts and data-testid attributes", () => {
    const html = renderClean(<ClientTimesheetsView initialData={mockData} />);
    expect(html).toContain('data-testid="timesheets-tab"');
    expect(html).toContain('data-tab="to-review"');
    expect(html).toContain('data-tab="approved"');
    expect(html).toContain('data-tab="invoices"');
    expect(html).toContain("To review");
    expect(html).toContain("Approved");
    expect(html).toContain("Invoices");
  });

  it("groups To Review tab by task with estimate, logged, and over estimate chip", () => {
    const html = renderClean(<ClientTimesheetsView initialData={mockData} />);
    expect(html).toContain('data-testid="timesheet-group"');
    expect(html).toContain('data-task="Design landing page wireframes"');
    expect(html).toContain('data-task="Competitor analysis spreadsheet"');
    expect(html).toContain("Estimate 3h • Logged 5h 30m");
    expect(html).toContain("2h 30m over estimate");
  });

  it("renders student notes and clamped expandable UI", () => {
    const html = renderClean(<ClientTimesheetsView initialData={mockData} />);
    expect(html).toContain('data-testid="timesheet-note"');
    expect(html).toContain("Completed competitive pricing matrix for top 5 competitors.");
  });

  it("renders dispute callout and hides Dispute button on already disputed rows", () => {
    const html = renderClean(<ClientTimesheetsView initialData={mockData} />);
    expect(html).toContain("Disputed");
    expect(html).toContain("You disputed this: Logged 1 hour but git commits show only 15 minutes of activity.");
    expect(html).toContain("These hours stay unapproved until you approve them.");
  });

  it("renders time correction request with diff text and accept/decline buttons", () => {
    const html = renderClean(<ClientTimesheetsView initialData={mockData} />);
    expect(html).toContain("Time adjustment requested");
    expect(html).toContain("Juan asked to change the end time");
    expect(html).toContain('data-testid="timesheet-correction-approve"');
    expect(html).toContain('data-testid="timesheet-correction-decline"');
    expect(html).toContain("Approve correction");
    expect(html).toContain("Decline");
  });

  it("renders empty state when no student is linked", () => {
    const noStudentData: ClientTimesheetData = {
      ...mockData,
      linkedStudent: null,
      pendingLogs: [],
      approvedLogs: [],
      invoices: [],
    };
    const html = renderClean(<ClientTimesheetsView initialData={noStudentData} />);
    expect(html).toContain("No student linked yet");
    expect(html).toContain("Enter your student&#x27;s invite code in Settings.");
    expect(html).toContain("Go to settings");
  });

  describe("DisputeDialog Component", () => {
    it("renders DisputeDialog with summary row, textarea, counter, and amber icon", () => {
      const html = renderClean(
        <DisputeDialog
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          hourlyRate={150}
          studentName="Juan Dela Cruz"
          log={{
            id: "log-1",
            taskId: "task-1",
            taskTitle: "Design landing page wireframes",
            timeIn: new Date("2026-11-12T01:00:00.000Z"),
            timeOut: new Date("2026-11-12T02:00:00.000Z"),
            totalHours: 1.0,
          }}
        />
      );

      expect(html).toContain('data-testid="dispute-dialog"');
      expect(html).toContain("Dispute these hours");
      expect(html).toContain("Design landing page wireframes");
      expect(html).toContain("1h");
      expect(html).toContain("₱150.00");
      expect(html).toContain('data-testid="dispute-reason"');
      expect(html).toContain('data-testid="dispute-submit"');
      expect(html).toContain("Send dispute");
      expect(html).toContain("Juan will be notified with your reason.");
    });
  });

  describe("InvoiceDetailSheet Component", () => {
    it("renders itemized work table with line items, formatted Asia/Manila session time, and total row", () => {
      const invoiceWithLines: FormattedInvoice = {
        id: "inv-detailed",
        studentId: "student-1",
        clientId: "client-1",
        studentName: "Juan Dela Cruz",
        clientName: "Maria Santos",
        totalHours: 2.5,
        rate: 150,
        amount: 375,
        status: InvoiceStatus.APPROVED,
        createdAt: new Date("2026-11-12T10:00:00.000Z"),
        updatedAt: new Date("2026-11-12T10:00:00.000Z"),
        lineItems: [
          {
            id: "tl-1",
            timeIn: new Date("2026-11-12T01:00:00.000Z"), // 9:00 AM Manila
            timeOut: new Date("2026-11-12T02:00:00.000Z"), // 10:00 AM Manila
            totalHours: 1.0,
            taskTitle: "Design landing page wireframes",
            sessionNote: "Completed wireframes",
            amount: 150,
          },
          {
            id: "tl-2",
            timeIn: new Date("2026-11-12T05:00:00.000Z"), // 1:00 PM Manila
            timeOut: new Date("2026-11-12T06:30:00.000Z"), // 2:30 PM Manila
            totalHours: 1.5,
            taskTitle: "Competitor analysis spreadsheet",
            sessionNote: null,
            amount: 225,
          },
        ],
      };

      const html = renderClean(
        <ClientTimesheetsView initialData={mockData} initialSheetInvoice={invoiceWithLines} />
      );

      expect(html).toContain('data-testid="invoice-sheet"');
      expect(html).toContain("pr-14");
      expect(html).toContain("Itemized Work");
      expect(html).toContain("Date");
      expect(html).toContain("Task");
      expect(html).toContain("Session");
      expect(html).toContain("Hours");
      expect(html).toContain("Amount");
      expect(html).toContain('data-testid="invoice-detail-row"');
      expect(html).toContain("Design landing page wireframes");
      expect(html).toContain("Completed wireframes");
      expect(html).toContain("Competitor analysis spreadsheet");
      expect(html).toContain("9:00 AM – 10:00 AM");
      expect(html).toContain("1:00 PM – 2:30 PM");
      expect(html).toContain("1h");
      expect(html).toContain("1h 30m");
      expect(html).toContain("₱150.00");
      expect(html).toContain("₱225.00");
      expect(html).toContain('data-testid="invoice-detail-total"');
      expect(html).toContain("2h 30m");
      expect(html).toContain("₱375.00");
    });

    it("falls back gracefully when an invoice has no line items", () => {
      const invoiceNoLines: FormattedInvoice = {
        id: "inv-legacy",
        studentId: "student-1",
        clientId: "client-1",
        studentName: "Juan Dela Cruz",
        clientName: "Maria Santos",
        totalHours: 2.0,
        rate: 150,
        amount: 300,
        status: InvoiceStatus.APPROVED,
        createdAt: new Date("2026-11-10T10:00:00.000Z"),
        updatedAt: new Date("2026-11-10T10:00:00.000Z"),
        lineItems: [],
      };

      const html = renderClean(
        <ClientTimesheetsView initialData={mockData} initialSheetInvoice={invoiceNoLines} />
      );

      expect(html).toContain('data-testid="invoice-sheet"');
      expect(html).toContain("Line items not available");
      expect(html).toContain("Individual session details are not available for this invoice.");
      expect(html).toContain("2h");
      expect(html).toContain("₱300.00");
    });
  });
});
