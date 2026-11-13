import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { StudentTimeView } from "./student-time-view";
import { TimeLogStatus, TaskStatus, CorrectionStatus } from "@prisma/client";

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

// Mock server actions
vi.mock("@/lib/actions/time", () => ({
  timeInAction: vi.fn(),
  timeOutAction: vi.fn(),
  requestCorrectionAction: vi.fn(),
}));

describe("StudentTimeView Redesign", () => {
  const sampleTasks = [
    {
      id: "task-1",
      title: "Write blog outline",
      status: TaskStatus.DOING,
      dueAt: new Date("2026-11-20T10:00:00.000Z"),
      clientName: "Maria Clara",
    },
    {
      id: "task-2",
      title: "Format lead spreadsheet",
      status: TaskStatus.TODO,
      dueAt: new Date("2026-11-21T12:00:00.000Z"),
      clientName: "Juan Dela Cruz",
    },
  ];

  const sampleLogs = [
    {
      id: "log-1",
      studentId: "student-1",
      taskId: "task-1",
      taskTitle: "Write blog outline",
      clientName: "Maria Clara",
      timeIn: new Date("2026-11-11T02:00:00.000Z"), // 10:00 AM Manila
      timeOut: new Date("2026-11-11T05:00:00.000Z"), // 1:00 PM Manila
      totalHours: 3,
      status: TimeLogStatus.CLOSED,
      correctionNote: "Drafted introduction and research links.",
      requestedTimeOut: null,
      correctionStatus: null,
      createdAt: new Date("2026-11-11T02:00:00.000Z"),
    },
    {
      id: "log-2",
      studentId: "student-1",
      taskId: "task-2",
      taskTitle: "Format lead spreadsheet",
      clientName: "Juan Dela Cruz",
      timeIn: new Date("2026-11-10T06:00:00.000Z"), // Yesterday
      timeOut: new Date("2026-11-10T07:30:00.000Z"),
      totalHours: 1.5,
      status: TimeLogStatus.APPROVED,
      correctionNote: null,
      requestedTimeOut: null,
      correctionStatus: null,
      createdAt: new Date("2026-11-10T06:00:00.000Z"),
    },
    {
      id: "log-3",
      studentId: "student-1",
      taskId: "task-1",
      taskTitle: "Quick sync call",
      clientName: "Maria Clara",
      timeIn: new Date("2026-11-09T01:00:00.000Z"),
      timeOut: new Date("2026-11-09T01:00:45.000Z"), // under 1 min
      totalHours: 0.01,
      status: TimeLogStatus.CLOSED,
      correctionNote: null,
      requestedTimeOut: new Date("2026-11-09T02:00:00.000Z"),
      correctionStatus: CorrectionStatus.PENDING,
      createdAt: new Date("2026-11-09T01:00:00.000Z"),
    },
  ];

  const sampleData = {
    activeLog: null,
    logs: sampleLogs,
    availableTasks: sampleTasks,
    hoursToday: 3,
    hoursThisWeek: 4.51,
  };

  it("renders the redesign header with accurate English copy and no UTC+8 jargon", () => {
    const html = renderToString(
      <StudentTimeView
        initialData={sampleData}
        availableTasks={sampleTasks}
        maxHoursPerDay={4}
      />
    );

    expect(html).toContain("Time");
    expect(html).toContain(
      "Start the timer when you begin a task and stop it when you finish. Your client reviews the hours."
    );
    expect(html).not.toContain("UTC+8");
    expect(html).not.toContain("Single open log enforced");
    expect(html).not.toContain("All logged times are converted into approved invoices");
    expect(html).toContain("Times shown in Philippine time");
  });

  it("renders IDLE state timer hero card with 00:00:00 readout, Select, Time in button, and daily meter", () => {
    const html = renderToString(
      <StudentTimeView
        initialData={sampleData}
        availableTasks={sampleTasks}
        maxHoursPerDay={4}
      />
    );

    expect(html).toContain('data-testid="time-timer"');
    expect(html).toContain("00:00:00");
    expect(html).toContain('data-testid="time-task-select"');
    expect(html).toContain('data-testid="time-in"');
    expect(html).toContain("Time in");
    expect(html).toContain('data-testid="time-daily-meter"');
    expect(html).toContain("Today:");
    expect(html).toContain("3h");
    expect(html).toContain("4h");
  });

  it("shows over daily limit warning when hoursToday exceeds maxHoursPerDay", () => {
    const html = renderToString(
      <StudentTimeView
        initialData={{
          ...sampleData,
          hoursToday: 5.5,
        }}
        availableTasks={sampleTasks}
        maxHoursPerDay={4}
      />
    );

    expect(html).toContain("Over your daily limit");
    // Verify it does not disable the Time in button
    expect(html).toContain('data-testid="time-in"');
  });

  it("renders RUNNING state when activeLog is present", () => {
    const activeLog = {
      id: "active-log-1",
      studentId: "student-1",
      taskId: "task-1",
      taskTitle: "Write blog outline",
      clientName: "Maria Clara",
      timeIn: new Date(Date.now() - 3600 * 1000),
      timeOut: null,
      totalHours: null,
      status: TimeLogStatus.OPEN,
      correctionNote: null,
      requestedTimeOut: null,
      correctionStatus: null,
      createdAt: new Date(),
    };

    const html = renderToString(
      <StudentTimeView
        initialData={{
          ...sampleData,
          activeLog,
        }}
        availableTasks={sampleTasks}
        maxHoursPerDay={4}
      />
    );

    expect(html).toContain('data-testid="time-timer"');
    expect(html).toContain("Working on");
    expect(html).toContain("Write blog outline");
    expect(html).toContain("Started");
    expect(html).toContain('data-testid="time-notes"');
    expect(html).toContain('data-testid="time-out"');
    expect(html).toContain("Time out");
  });

  it("renders 3 compact stat tiles with display numbers and removes old Timer state tile", () => {
    const html = renderToString(
      <StudentTimeView
        initialData={sampleData}
        availableTasks={sampleTasks}
        maxHoursPerDay={4}
      />
    );

    expect(html).toContain("Today");
    expect(html).toContain("Last 7 days");
    expect(html).toContain("Waiting for approval");
    // Old tile removed
    expect(html).not.toContain("Ready to start");
    expect(html).not.toContain("Timer state");
  });

  it("renders log history with filter buttons, day groups, <1m duration, and request correction", () => {
    const html = renderToString(
      <StudentTimeView
        initialData={sampleData}
        availableTasks={sampleTasks}
        maxHoursPerDay={4}
      />
    );

    expect(html).toContain('data-testid="time-filter"');
    expect(html).toContain('data-testid="time-log-row"');
    expect(html).toMatch(/(&lt;|<)1m/); // Under 1 minute session
    expect(html).toContain("Correction pending"); // Single chip
    expect(html).toContain('data-testid="time-request-correction"');
  });

  it("renders friendly empty state when there are no logs", () => {
    const html = renderToString(
      <StudentTimeView
        initialData={{
          ...sampleData,
          logs: [],
        }}
        availableTasks={sampleTasks}
        maxHoursPerDay={4}
      />
    );

    expect(html).toContain("No time logged yet.");
    expect(html).toContain("Pick a task and press Time in to start your first session.");
  });

  it("renders helper line and link to Tasks when no tasks qualify", () => {
    const html = renderToString(
      <StudentTimeView
        initialData={{
          ...sampleData,
          availableTasks: [],
        }}
        availableTasks={[]}
        maxHoursPerDay={4}
      />
    );

    expect(html).toContain("Accept a task first to start the timer");
    expect(html).toContain('href="/student/tasks"');
  });
});
