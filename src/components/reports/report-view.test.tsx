import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ReportView } from "./report-view";
import { TaskStatus, TimeLogStatus, InvoiceStatus } from "@prisma/client";
import type { ReportPayload } from "@/lib/services/report-service";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/student/reports",
  useSearchParams: () => new URLSearchParams(),
}));

describe("ReportView Component", () => {
  const sampleStudentData: ReportPayload = {
    role: "STUDENT",
    clientName: "Alice Hirer",
    hourlyRate: 150,
    linked: true,
    logs: [
      {
        id: "l1",
        taskId: "t1",
        taskTitle: "Database Migration",
        taskStatus: TaskStatus.DONE,
        timeIn: "2026-11-10T08:00:00Z",
        timeOut: "2026-11-10T11:00:00Z",
        totalHours: 3, // 3h * 150 = 450
        status: TimeLogStatus.APPROVED,
      },
      {
        id: "l2",
        taskId: "t2",
        taskTitle: "Bug Fixes",
        taskStatus: TaskStatus.DOING,
        timeIn: "2026-11-11T08:00:00Z",
        timeOut: "2026-11-11T09:30:00Z",
        totalHours: 1.5, // 1.5h * 150 = 225
        status: TimeLogStatus.CLOSED, // waiting approval
      },
    ],
    invoices: [
      {
        id: "inv1",
        totalHours: 3,
        rate: 150,
        amount: 450,
        status: InvoiceStatus.PAID,
        createdAt: "2026-11-11T12:00:00Z",
      },
    ],
  };

  const sampleClientData: ReportPayload = {
    role: "CLIENT",
    studentName: "Juan Dela Cruz",
    hourlyRate: 200,
    linked: true,
    logs: [
      {
        id: "l1",
        taskId: "t1",
        taskTitle: "Landing Page Copy",
        taskStatus: TaskStatus.DONE,
        timeIn: "2026-11-10T08:00:00Z",
        timeOut: "2026-11-10T12:00:00Z",
        totalHours: 4, // 4h * 200 = 800
        status: TimeLogStatus.APPROVED,
      },
    ],
    invoices: [
      {
        id: "inv1",
        totalHours: 4,
        rate: 200,
        amount: 800,
        status: InvoiceStatus.APPROVED, // awaiting payment
        createdAt: "2026-11-11T12:00:00Z",
      },
    ],
  };

  it("renders all 8 required data-testid elements in Student view", () => {
    const html = renderToString(<ReportView initialData={sampleStudentData} />);

    expect(html).toContain('data-testid="report-range"');
    expect(html).toContain('data-testid="report-tile-hours"');
    expect(html).toContain('data-testid="report-tile-amount"');
    expect(html).toContain('data-testid="report-tile-pending"');
    expect(html).toContain('data-testid="report-tile-paid"');
    expect(html).toContain('data-testid="report-table"');
    expect(html).toContain('data-testid="report-print"');
    expect(html).toContain('data-testid="report-export"');
  });

  it("renders Student-specific tile labels and table heading", () => {
    const html = renderToString(<ReportView initialData={sampleStudentData} />);

    expect(html).toContain("Hours worked (approved)");
    expect(html).toContain("Total earned");
    expect(html).toContain("Waiting for approval");
    expect(html).toContain("Paid vs unpaid");
    expect(html).toContain("Task breakdown");
  });

  it("renders Client-specific tile labels and student-attributed table heading", () => {
    const html = renderToString(<ReportView initialData={sampleClientData} />);

    expect(html).toContain("Hours approved");
    expect(html).toContain("Total amount");
    expect(html).toContain("Waiting for my approval");
    expect(html).toContain("Paid vs unpaid");
    expect(html).toContain("Report for Juan Dela Cruz");
  });

  it("renders print header with VAwise branding and role identification", () => {
    const studentHtml = renderToString(<ReportView initialData={sampleStudentData} />);
    expect(studentHtml).toContain("VAwise");
    expect(studentHtml).toContain("Student VA Report");

    const clientHtml = renderToString(<ReportView initialData={sampleClientData} />);
    expect(clientHtml).toContain("VAwise");
    expect(clientHtml).toContain("Client Work Report");
    expect(clientHtml).toContain("Juan Dela Cruz");
  });

  it("shows friendly empty state and disables export CSV button when range has no data", () => {
    const emptyData: ReportPayload = {
      role: "STUDENT",
      hourlyRate: 150,
      linked: true,
      logs: [],
      invoices: [],
    };

    const html = renderToString(<ReportView initialData={emptyData} />);

    expect(html).toContain("No activity in this period");
    expect(html).toContain('data-testid="report-export"');
    expect(html).toContain("disabled");
  });

  it("shows unlinked notice when client has no linked student", () => {
    const unlinkedClient: ReportPayload = {
      role: "CLIENT",
      hourlyRate: 150,
      linked: false,
      logs: [],
      invoices: [],
    };

    const html = renderToString(<ReportView initialData={unlinkedClient} />);

    expect(html).toContain("No linked student yet");
  });
});

