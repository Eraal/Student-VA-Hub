import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ClientDashboardView } from "./client-dashboard-view";
import type { ClientDashboardData } from "@/lib/services/dashboard-service";
import { TaskStatus, StudentResponse } from "@prisma/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/actions/task", () => ({
  createTaskAction: vi.fn(),
  checkTaskConflictAction: vi.fn(),
}));

const mockLinkedData: ClientDashboardData = {
  linked: true,
  student: {
    id: "student-1",
    name: "Juan Dela Cruz",
    email: "juan@example.com",
    school: "UP Diliman", // Should NOT be rendered in student status card
    course: "BS Computer Science",
    year: 3,
    hourlyRate: 150,
    maxHoursPerDay: 4,
  },
  studentStatus: {
    state: "AVAILABLE",
    label: "Available now",
    description: "until 9:00 PM",
    untilTime: "9:00 PM",
  },
  tasksSummary: {
    todoCount: 1,
    doingCount: 2,
    doneCount: 5,
    rescheduleRequestCount: 1,
    activeTasks: [
      {
        id: "task-1",
        title: "Design landing page wireframes",
        dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        estHours: 4,
        status: TaskStatus.DOING,
        studentResponse: StudentResponse.ACCEPTED,
        loggedHours: 4.5,
      },
      {
        id: "task-2",
        title: "Competitor analysis spreadsheet",
        dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        estHours: 3,
        status: TaskStatus.TODO,
        studentResponse: StudentResponse.RESCHEDULE_REQUESTED,
        loggedHours: 1.0,
      },
      {
        id: "task-3",
        title: "Draft weekly social post",
        dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        estHours: 2,
        status: TaskStatus.TODO,
        studentResponse: null,
        loggedHours: 0,
      },
    ],
  },
  pendingApproval: {
    logCount: 2,
    correctionCount: 1,
    totalHours: 2.5,
    totalAmount: 375,
  },
  attention: {
    rescheduleRequestsCount: 1,
    correctionRequestsCount: 1,
  },
  recentNotifications: [
    {
      id: "notif-1",
      type: "HOURS_SUBMITTED",
      message: "Juan submitted 2.5 hours for Design landing page wireframes",
      readAt: null,
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    },
    {
      id: "notif-2",
      type: "TASK_ACCEPTED",
      message: "Juan accepted task Design landing page wireframes",
      readAt: new Date(),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  ],
};

describe("ClientDashboardView Redesign", () => {
  it("renders time-aware greeting in Asia/Manila without exclamation mark or subtitle jargon", () => {
    const html = renderToString(
      <ClientDashboardView data={mockLinkedData} clientName="Maria Santos" />
    );

    expect(html).toContain('data-testid="client-home-greeting"');
    // Salutation is morning, afternoon, or evening
    expect(html).toMatch(/Good (morning|afternoon|evening), Maria/);
    expect(html).not.toContain("Welcome, Maria Santos!");
    expect(html).not.toContain("Student VA Management &amp; Schedule Overview");
    expect(html).not.toContain("Student VA Management & Schedule Overview");
  });

  it("renders ink primary Assign task button (not green) and secondary View calendar button", () => {
    const html = renderToString(
      <ClientDashboardView data={mockLinkedData} clientName="Maria Santos" />
    );

    expect(html).toContain('data-testid="client-home-assign"');
    expect(html).toContain("Assign task");
    expect(html).toContain("View calendar");
    // Ensure button element with data-testid="client-home-assign" does not use green button classes
    const assignBtn = html.match(/<button[^>]*data-testid="client-home-assign"[^>]*>/)?.[0] ||
      html.match(/<button[^>]*class="[^"]*"[^>]*data-testid="client-home-assign"[^>]*>/)?.[0];
    expect(assignBtn).toBeTruthy();
    expect(assignBtn).not.toContain("bg-[var(--color-work)]");
    expect(assignBtn).not.toContain("bg-[#16A34A]");
  });

  it("renders student status card with initials, name, rate pill, and status chip without school name or duplicate buttons", () => {
    const html = renderToString(
      <ClientDashboardView data={mockLinkedData} clientName="Maria Santos" />
    );

    expect(html).toContain("JC"); // initials for Juan Dela Cruz
    expect(html).toContain("Juan Dela Cruz");
    expect(html).toContain("₱150.00/hr");
    expect(html).toContain('data-testid="client-student-status"');
    expect(html).toContain('data-status="AVAILABLE"');
    expect(html).toContain("Available now");
    expect(html).toContain("Available now until 9:00 PM");
    // School name must be removed
    expect(html).not.toContain("UP Diliman");

    // Only 1 "Assign task" in header button, not duplicated inside the student card
    const assignButtons = (html.match(/Assign task/g) || []).length;
    expect(assignButtons).toBe(1);
  });

  it("renders in class status chip without subject names and neutral chip for not available with muted captions", () => {
    const inClassData: ClientDashboardData = {
      ...mockLinkedData,
      studentStatus: {
        state: "IN_CLASS",
        label: "Currently in class",
        description: "until 2:30 PM",
        untilTime: "2:30 PM",
      },
    };

    const inClassHtml = renderToString(
      <ClientDashboardView data={inClassData} clientName="Maria Santos" />
    );
    expect(inClassHtml).toContain('data-status="IN_CLASS"');
    expect(inClassHtml).toContain("In class");
    expect(inClassHtml).toContain("In class until 2:30 PM");

    const offData: ClientDashboardData = {
      ...mockLinkedData,
      studentStatus: {
        state: "OFF",
        label: "Off schedule",
        description: "No more availability slots today",
        untilTime: null,
      },
    };

    const offHtml = renderToString(
      <ClientDashboardView data={offData} clientName="Maria Santos" />
    );
    expect(offHtml).toContain('data-status="OFF"');
    expect(offHtml).toContain("Not available");
    expect(offHtml).toContain("Not available right now");
    expect(offHtml).not.toContain("No more availability slots today");
    expect(offHtml).not.toContain("Off schedule");
  });

  it("renders unlinked empty state with friendly copy and Go to settings button", () => {
    const unlinkedData: ClientDashboardData = {
      linked: false,
      studentStatus: {
        state: "OFF",
        label: "Not available",
        description: "",
        untilTime: null,
      },
      tasksSummary: {
        todoCount: 0,
        doingCount: 0,
        doneCount: 0,
        rescheduleRequestCount: 0,
        activeTasks: [],
      },
      pendingApproval: {
        logCount: 0,
        correctionCount: 0,
        totalHours: 0,
        totalAmount: 0,
      },
      attention: {
        rescheduleRequestsCount: 0,
        correctionRequestsCount: 0,
      },
      recentNotifications: [],
    };

    const html = renderToString(
      <ClientDashboardView data={unlinkedData} clientName="Maria Santos" />
    );

    expect(html).toMatch(/No student linked yet.*Enter your student/);
    expect(html).toContain("Go to settings");
  });

  it("renders Needs your attention strip when items exist and hides when 0", () => {
    const htmlWithAttention = renderToString(
      <ClientDashboardView data={mockLinkedData} clientName="Maria Santos" />
    );

    expect(htmlWithAttention).toContain('data-testid="client-attention"');
    expect(htmlWithAttention).toContain('data-kind="reschedule-requests"');
    expect(htmlWithAttention).toContain("1 reschedule request");
    expect(htmlWithAttention).toContain('data-kind="correction-requests"');
    expect(htmlWithAttention).toContain("1 correction request");

    const zeroAttentionData: ClientDashboardData = {
      ...mockLinkedData,
      attention: {
        rescheduleRequestsCount: 0,
        correctionRequestsCount: 0,
      },
    };

    const htmlZero = renderToString(
      <ClientDashboardView data={zeroAttentionData} clientName="Maria Santos" />
    );
    expect(htmlZero).not.toContain('data-testid="client-attention"');
  });

  it("renders compact summary tiles with formatHours and formatPeso, and quiet zero states", () => {
    const html = renderToString(
      <ClientDashboardView data={mockLinkedData} clientName="Maria Santos" />
    );

    expect(html).toContain('data-testid="client-tile"');
    expect(html).toContain('data-kind="in-progress"');
    expect(html).toContain('data-kind="waiting-approval"');
    expect(html).toContain('data-kind="completed-tasks"');
    expect(html).toContain("2h 30m"); // 2.5h formatted via formatHours
    expect(html).toContain("₱375.00"); // formatted via formatPeso
    expect(html).toContain("2 time logs to review");
    expect(html).toContain("Review hours");

    // Zero completed tasks caption test
    const zeroCompletedData: ClientDashboardData = {
      ...mockLinkedData,
      tasksSummary: {
        ...mockLinkedData.tasksSummary,
        doneCount: 0,
      },
    };
    const zeroHtml = renderToString(
      <ClientDashboardView data={zeroCompletedData} clientName="Maria Santos" />
    );
    expect(zeroHtml).toContain("Nothing completed yet");
  });

  it("renders active tasks with StatusBadge, role-aware response chips, due dates, and overrun indicators", () => {
    const html = renderToString(
      <ClientDashboardView data={mockLinkedData} clientName="Maria Santos" />
    );

    expect(html).toContain('data-testid="client-task-row"');
    expect(html).toContain("Design landing page wireframes");
    expect(html).toContain("In progress");
    // Accepted chip is hidden on client rows to reduce noise
    expect(html).not.toContain(">Accepted<");
    expect(html).toContain("4h 30m of 4h");
    expect(html).toContain("30m over estimate"); // 4.5h vs 4h = 30m overrun

    // Reschedule requested shows "Wants to reschedule" on client rows
    expect(html).toContain("Competitor analysis spreadsheet");
    expect(html).toContain("Wants to reschedule");

    // Unaccepted task shows "Not accepted yet" on client rows
    expect(html).toContain("Draft weekly social post");
    expect(html).toContain("Not accepted yet");

    // Relative due date is shown without repeating date
    expect(html).toMatch(/Due (in \d+ days|today|tomorrow)/);
  });

  it("renders recent activity with notification icons, relative timestamps, and unread ink dot", () => {
    const html = renderToString(
      <ClientDashboardView data={mockLinkedData} clientName="Maria Santos" />
    );

    expect(html).toContain('data-testid="client-activity-row"');
    expect(html).toContain('data-type="HOURS_SUBMITTED"');
    expect(html).toContain("Juan submitted 2.5 hours for Design landing page wireframes");
    expect(html).toContain('aria-label="Unread notification"');
    expect(html).not.toContain("Agreement &amp; Rate");
    expect(html).not.toContain("Agreement & Rate");
    expect(html).not.toContain("agreement");
  });
});
