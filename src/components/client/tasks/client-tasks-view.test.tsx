import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  ClientTasksView,
  ClientTaskWithLogs,
} from "./client-tasks-view";
import { TaskStatus, StudentResponse, TimeLogStatus } from "@prisma/client";

// Mock next/navigation
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock server actions
vi.mock("@/lib/actions/task", () => ({
  updateTaskStatusAction: vi.fn().mockResolvedValue({ success: true }),
  createTaskAction: vi.fn().mockResolvedValue({ success: true }),
  checkTaskConflictAction: vi.fn().mockResolvedValue({ success: true, data: { ok: true, conflicts: [] } }),
}));

describe("ClientTasksView Redesign", () => {
  const sampleTasks: ClientTaskWithLogs[] = [
    {
      id: "task-attention",
      clientId: "client-1",
      studentId: "student-1",
      studentName: "Juan Dela Cruz",
      title: "Design system audit",
      description: "Review components against specs.",
      startAt: new Date("2026-11-16T10:00:00.000Z"),
      dueAt: new Date("2026-11-20T12:00:00.000Z"),
      estHours: 4,
      status: TaskStatus.TODO,
      studentResponse: StudentResponse.RESCHEDULE_REQUESTED,
      rescheduleReason: "Conflict with departmental exam",
      createdAt: new Date("2026-11-10T00:00:00.000Z"),
      updatedAt: new Date("2026-11-11T00:00:00.000Z"),
      loggedHours: 0,
      awaitingApprovalHours: 0,
      timeLogs: [],
    },
    {
      id: "task-doing",
      clientId: "client-1",
      studentId: "student-1",
      studentName: "Juan Dela Cruz",
      title: "Landing page wireframes",
      description: "Figma wireframes for desktop and mobile.",
      startAt: new Date("2026-11-15T08:00:00.000Z"),
      dueAt: new Date("2026-11-18T10:00:00.000Z"),
      estHours: 4,
      status: TaskStatus.DOING,
      studentResponse: StudentResponse.ACCEPTED,
      rescheduleReason: null,
      createdAt: new Date("2026-11-09T00:00:00.000Z"),
      updatedAt: new Date("2026-11-11T00:00:00.000Z"),
      loggedHours: 4.5,
      awaitingApprovalHours: 0,
      timeLogs: [
        {
          id: "log-1",
          taskId: "task-doing",
          timeIn: new Date("2026-11-15T08:00:00.000Z"),
          timeOut: new Date("2026-11-15T12:30:00.000Z"),
          totalHours: 4.5,
          status: TimeLogStatus.APPROVED,
        },
      ],
    },
    {
      id: "task-todo-overrun",
      clientId: "client-1",
      studentId: "student-1",
      studentName: "Juan Dela Cruz",
      title: "Competitor analysis spreadsheet",
      description: "Gather pricing and feature matrix.",
      startAt: new Date("2026-11-18T10:00:00.000Z"),
      dueAt: new Date("2026-11-22T10:00:00.000Z"),
      estHours: 3,
      status: TaskStatus.TODO,
      studentResponse: null,
      rescheduleReason: null,
      createdAt: new Date("2026-11-08T00:00:00.000Z"),
      updatedAt: new Date("2026-11-11T00:00:00.000Z"),
      loggedHours: 1.016666, // 1h 1m
      awaitingApprovalHours: 1.016666,
      timeLogs: [
        {
          id: "log-2",
          taskId: "task-todo-overrun",
          timeIn: new Date("2026-11-12T01:00:00.000Z"),
          timeOut: new Date("2026-11-12T02:00:00.000Z"),
          totalHours: 1,
          status: TimeLogStatus.CLOSED,
        },
        {
          id: "log-3",
          taskId: "task-todo-overrun",
          timeIn: new Date("2026-11-12T02:00:00.000Z"),
          timeOut: new Date("2026-11-12T02:01:00.000Z"),
          totalHours: 1 / 60,
          status: TimeLogStatus.CLOSED,
        },
      ],
    },
    {
      id: "task-done",
      clientId: "client-1",
      studentId: "student-1",
      studentName: "Juan Dela Cruz",
      title: "Setup client onboarding deck",
      description: "Google Slides pitch template.",
      startAt: new Date("2026-11-05T08:00:00.000Z"),
      dueAt: new Date("2026-11-08T10:00:00.000Z"),
      estHours: 2,
      status: TaskStatus.DONE,
      studentResponse: StudentResponse.ACCEPTED,
      rescheduleReason: null,
      createdAt: new Date("2026-11-01T00:00:00.000Z"),
      updatedAt: new Date("2026-11-08T00:00:00.000Z"),
      loggedHours: 2,
      awaitingApprovalHours: 0,
      timeLogs: [],
    },
  ];

  it("renders Header with title and student's first name in subtitle", () => {
    mockSearchParams = new URLSearchParams();
    const html = renderToString(
      <ClientTasksView
        initialTasks={sampleTasks}
        linkedStudent={{ id: "student-1", name: "Juan Dela Cruz" }}
      />
    );

    expect(html).toContain("Tasks");
    expect(html).toContain("Tasks you&#x27;ve assigned to Juan.");
    expect(html).toContain("Assign task");
  });

  it("renders segmented tabs with correct counts and test IDs", () => {
    mockSearchParams = new URLSearchParams();
    const html = renderToString(
      <ClientTasksView
        initialTasks={sampleTasks}
        linkedStudent={{ id: "student-1", name: "Juan Dela Cruz" }}
      />
    );

    expect(html).toContain('data-testid="client-tasks-tab" data-tab="all"');
    expect(html).toContain('data-testid="client-tasks-tab" data-tab="todo"');
    expect(html).toContain('data-testid="client-tasks-tab" data-tab="in_progress"');
    expect(html).toContain('data-testid="client-tasks-tab" data-tab="done"');

    // Total count: 4
    expect(html).toContain(">4</span>");
    // To do count: 2
    expect(html).toContain(">2</span>");
    // In progress count: 1
    expect(html).toContain(">1</span>");
    // Done count: 1
    expect(html).toContain(">1</span>");
  });

  it("groups tasks in 'All' tab and renders group headers for non-empty groups", () => {
    mockSearchParams = new URLSearchParams();
    const html = renderToString(
      <ClientTasksView
        initialTasks={sampleTasks}
        linkedStudent={{ id: "student-1", name: "Juan Dela Cruz" }}
      />
    );

    expect(html).toContain("Needs your attention");
    expect(html).toContain("In progress");
    expect(html).toContain("Up next");
    expect(html).toContain("Done");
  });

  it("renders task cards with proper metadata, 4px left bar, and removes 'Assigned to:'", () => {
    mockSearchParams = new URLSearchParams();
    const html = renderToString(
      <ClientTasksView
        initialTasks={sampleTasks}
        linkedStudent={{ id: "student-1", name: "Juan Dela Cruz" }}
      />
    );

    // Cards have client-task-card testid
    expect(html).toContain('data-testid="client-task-card"');
    expect(html).toContain('data-status="TODO"');
    expect(html).toContain('data-status="DOING"');
    expect(html).toContain('data-status="DONE"');

    // Student response states shown
    expect(html).toContain("Wants to reschedule");
    expect(html).toContain("Accepted");
    expect(html).toContain("Not accepted yet");

    // "Assigned to: Juan Dela Cruz" must NOT appear on cards
    expect(html).not.toContain("Assigned to: Juan Dela Cruz");

    // "⋯" menu buttons have client-task-menu testid
    expect(html).toContain('data-testid="client-task-menu"');
  });

  it("displays progress bar with overrun indicator when logged > est, and awaiting approval chip", () => {
    mockSearchParams = new URLSearchParams();
    const html = renderToString(
      <ClientTasksView
        initialTasks={sampleTasks}
        linkedStudent={{ id: "student-1", name: "Juan Dela Cruz" }}
      />
    );

    // Task Doing: 4.5h logged of 4h -> "30m over estimate"
    expect(html).toContain("4h 30m of 4h");
    expect(html).toContain("30m over estimate");

    // Task Competitor analysis: awaiting approval chip for 1h 1m
    expect(html).toContain("1h 1m awaiting your approval");
    expect(html).toContain('href="/client/timesheets"');
  });

  it("hides progress bar for tasks with 0h logged and TODO status", () => {
    mockSearchParams = new URLSearchParams();
    // Task Attention is TODO and 0h logged
    const html = renderToString(
      <ClientTasksView
        initialTasks={[sampleTasks[0]]}
        linkedStudent={{ id: "student-1", name: "Juan Dela Cruz" }}
      />
    );

    // Should not render progressbar for task-attention
    expect(html).not.toContain('role="progressbar"');
  });

  it("renders detail sheet with reschedule callout and reason without accept, decline, or edit actions", () => {
    mockSearchParams = new URLSearchParams("task=task-attention");
    const html = renderToString(
      <ClientTasksView
        initialTasks={sampleTasks}
        linkedStudent={{ id: "student-1", name: "Juan Dela Cruz" }}
      />
    );

    expect(html).toContain('data-testid="client-task-sheet"');
    expect(html).toContain('data-testid="client-task-reschedule-reason"');
    expect(html).toContain("Juan asked to reschedule");
    expect(html).toContain("Conflict with departmental exam");

    // Must NOT have accept, decline, or edit actions for reschedule requests
    expect(html).not.toContain("Accept reschedule");
    expect(html).not.toContain("Accept request");
    expect(html).not.toContain("Decline");
    expect(html).not.toContain("Edit reschedule");
    expect(html).not.toContain("Edit schedule");
  });

  it("renders time logged list in detail sheet with log rows and review button", () => {
    mockSearchParams = new URLSearchParams("task=task-todo-overrun");
    const html = renderToString(
      <ClientTasksView
        initialTasks={sampleTasks}
        linkedStudent={{ id: "student-1", name: "Juan Dela Cruz" }}
      />
    );

    expect(html).toContain('data-testid="client-task-sheet"');
    expect(html).toContain('data-testid="client-task-log-row"');
    expect(html).toContain("Review in Timesheets");
  });

  it("ignores unknown ?task=<id> and does not render sheet", () => {
    mockSearchParams = new URLSearchParams("task=non-existent-task-id");
    const html = renderToString(
      <ClientTasksView
        initialTasks={sampleTasks}
        linkedStudent={{ id: "student-1", name: "Juan Dela Cruz" }}
      />
    );

    expect(html).not.toContain('data-testid="client-task-sheet"');
  });

  it("renders empty state when no student is linked", () => {
    mockSearchParams = new URLSearchParams();
    const html = renderToString(
      <ClientTasksView
        initialTasks={[]}
        linkedStudent={null}
      />
    );

    expect(html).toContain("No student linked yet.");
    expect(html).toContain("Go to settings");
  });

  it("renders empty state when student is linked but has no tasks", () => {
    mockSearchParams = new URLSearchParams();
    const html = renderToString(
      <ClientTasksView
        initialTasks={[]}
        linkedStudent={{ id: "student-1", name: "Juan Dela Cruz" }}
      />
    );

    expect(html).toContain("No tasks yet.");
    expect(html).toContain("Assign your first task to Juan.");
  });
});

