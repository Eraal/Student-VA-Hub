import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { StudentTasksView } from "./student-tasks-view";
import { TaskWithDetails } from "@/lib/services/task-service";
import { TaskStatus, StudentResponse } from "@prisma/client";

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

// Mock server actions
vi.mock("@/lib/actions/task", () => ({
  updateTaskStatusAction: vi.fn(),
  respondToTaskAction: vi.fn(),
}));

describe("StudentTasksView Redesign", () => {
  const sampleTasks: TaskWithDetails[] = [
    {
      id: "task-1",
      clientId: "client-1",
      clientName: "Alice Guo",
      studentId: "student-1",
      title: "Write weekly progress summary",
      description: "Summarize tickets completed and prepare next sprint items.",
      startAt: new Date("2026-11-16T10:00:00.000Z"),
      dueAt: new Date("2026-11-20T12:00:00.000Z"),
      estHours: 3,
      status: TaskStatus.TODO,
      studentResponse: null, // Pending response
      rescheduleReason: null,
      createdAt: new Date("2026-11-11T00:00:00.000Z"),
      updatedAt: new Date("2026-11-11T00:00:00.000Z"),
      loggedHours: 0,
    },
    {
      id: "task-2",
      clientId: "client-1",
      clientName: "Bob Ong",
      studentId: "student-1",
      title: "Fix responsive CSS bug",
      description: "Ensure layout fits on 375px mobile viewport.",
      startAt: new Date("2026-11-15T08:00:00.000Z"),
      dueAt: new Date("2026-11-18T10:00:00.000Z"),
      estHours: 2,
      status: TaskStatus.DOING,
      studentResponse: StudentResponse.ACCEPTED,
      rescheduleReason: null,
      createdAt: new Date("2026-11-10T00:00:00.000Z"),
      updatedAt: new Date("2026-11-11T00:00:00.000Z"),
      loggedHours: 1,
    },
    {
      id: "task-3",
      clientId: "client-1",
      clientName: "Charlie Santos",
      studentId: "student-1",
      title: "Prepare presentation slides",
      description: "Deck for the upcoming client review.",
      startAt: new Date("2026-11-17T09:00:00.000Z"),
      dueAt: new Date("2026-11-22T08:00:00.000Z"),
      estHours: 4,
      status: TaskStatus.TODO,
      studentResponse: StudentResponse.ACCEPTED,
      rescheduleReason: null,
      createdAt: new Date("2026-11-09T00:00:00.000Z"),
      updatedAt: new Date("2026-11-11T00:00:00.000Z"),
      loggedHours: 0,
    },
    {
      id: "task-4",
      clientId: "client-1",
      clientName: "Diane Ramos",
      studentId: "student-1",
      title: "Archive previous month timesheets",
      description: "Export CSV files and store in Google Drive folder.",
      startAt: new Date("2026-11-01T08:00:00.000Z"),
      dueAt: new Date("2026-11-05T10:00:00.000Z"),
      estHours: 2,
      status: TaskStatus.DONE,
      studentResponse: StudentResponse.ACCEPTED,
      rescheduleReason: null,
      createdAt: new Date("2026-11-01T00:00:00.000Z"),
      updatedAt: new Date("2026-11-05T00:00:00.000Z"),
      loggedHours: 2,
    },
  ];

  it("renders the redesign header with correct title and subtitle", () => {
    const html = renderToString(React.createElement(StudentTasksView, { initialTasks: sampleTasks }));

    expect(html).toContain("My tasks");
    expect(html).toContain(
      "Tasks from your client. Accept them, track your time, or ask to reschedule."
    );
    // Students cannot create tasks: no "+ Assign Task" or primary action button in header
    expect(html).not.toContain("Assign Task");
    expect(html).not.toContain("New task");
  });

  it("renders segmented tabs with correct counts and data-testid attributes", () => {
    const html = renderToString(React.createElement(StudentTasksView, { initialTasks: sampleTasks }));

    expect(html).toContain('data-testid="task-tab"');
    expect(html).toContain('data-tab="all"');
    expect(html).toContain('data-tab="todo"');
    expect(html).toContain('data-tab="in_progress"');
    expect(html).toContain('data-tab="done"');

    // Counts: All = 4, To do = 2, In progress = 1, Done = 1
    expect(html).toContain("All");
    expect(html).toContain("To do");
    expect(html).toContain("In progress");
    expect(html).toContain("Done");
  });

  it("renders group section labels in All view when groups have tasks", () => {
    const html = renderToString(React.createElement(StudentTasksView, { initialTasks: sampleTasks }));

    expect(html).toContain("Needs your response");
    expect(html).toContain("In progress");
    expect(html).toContain("Up next");
    expect(html).toContain("Done");
  });

  it("does not render empty group labels when a group has no tasks", () => {
    // Only pending tasks
    const onlyPending: TaskWithDetails[] = [sampleTasks[0]];
    const html = renderToString(React.createElement(StudentTasksView, { initialTasks: onlyPending }));

    expect(html).toContain("Needs your response");
    // Other group section headers should not be rendered
    expect(html).not.toContain(">Up next</h2>");
    expect(html).not.toContain(">Done</h2>");
    expect(html).not.toContain(">In progress</h2>");
  });

  it("renders task card with test IDs, status, and response attributes", () => {
    const html = renderToString(React.createElement(StudentTasksView, { initialTasks: sampleTasks }));

    expect(html).toContain('data-testid="task-card"');
    expect(html).toContain('data-status="TODO"');
    expect(html).toContain('data-status="DOING"');
    expect(html).toContain('data-status="DONE"');
    expect(html).toContain('data-response="PENDING"');
    expect(html).toContain('data-response="ACCEPTED"');
  });

  it("shows ONE status badge per card and does not show separate Accepted badge or Status: box", () => {
    const html = renderToString(React.createElement(StudentTasksView, { initialTasks: sampleTasks }));

    // Task 1 is pending response -> shows "Needs your response"
    expect(html).toContain("Needs your response");

    // The legacy "Status:" box and duplicate dropdowns must be gone
    expect(html).not.toContain("Status:</span>");
    expect(html).not.toContain("<select");
  });

  it("renders Accept and Ask to Reschedule on pending task", () => {
    const html = renderToString(React.createElement(StudentTasksView, { initialTasks: sampleTasks }));

    expect(html).toContain('data-testid="task-accept"');
    expect(html).toContain('data-testid="task-reschedule"');
  });

  it("renders Time In and overflow menu on accepted not-done task", () => {
    const html = renderToString(React.createElement(StudentTasksView, { initialTasks: sampleTasks }));

    expect(html).toContain('data-testid="task-time-in"');
    expect(html).toContain('data-testid="task-menu"');
    expect(html).toContain("/student/time?taskId=task-2");
  });

  it("does not render Time In or Ask to Reschedule on Done tasks", () => {
    const onlyDone: TaskWithDetails[] = [sampleTasks[3]]; // task-4 is DONE
    const html = renderToString(React.createElement(StudentTasksView, { initialTasks: onlyDone }));

    expect(html).not.toContain('data-testid="task-time-in"');
    expect(html).not.toContain('data-testid="task-accept"');
    expect(html).toContain("2h logged");
  });

  it("renders reschedule requested indicator when waiting for client reply", () => {
    const rescheduleTask: TaskWithDetails[] = [
      {
        ...sampleTasks[0],
        studentResponse: StudentResponse.RESCHEDULE_REQUESTED,
        rescheduleReason: "Midterm exam on the same afternoon.",
      },
    ];
    const html = renderToString(React.createElement(StudentTasksView, { initialTasks: rescheduleTask }));

    expect(html).toContain("Waiting for your client to reply");
    expect(html).toContain("Reschedule requested");
    expect(html).not.toContain('data-testid="task-accept"');
    expect(html).not.toContain('data-testid="task-time-in"');
  });

  it("renders natural empty state copy for empty tab", () => {
    const html = renderToString(React.createElement(StudentTasksView, { initialTasks: [] }));

    expect(html).toContain("No tasks yet.");
    expect(html).toContain("When your client assigns one, it will show up here.");
  });
});
