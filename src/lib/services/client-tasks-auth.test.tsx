import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { prisma } from "../prisma";
import { Role, TaskStatus, StudentResponse, TimeLogStatus } from "@prisma/client";
import { getClientTasks, updateTaskStatus } from "./task-service";
import { requireRolePage } from "../auth-helpers";
import { ClientTasksView, ClientTaskWithLogs } from "@/components/client/tasks/client-tasks-view";

let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  redirect: (url: string) => {
    const error = new Error(`NEXT_REDIRECT: ${url}`);
    (error as unknown as { digest: string }).digest = `NEXT_REDIRECT;replace;${url};307;;`;
    throw error;
  },
}));

let mockSessionUser: { id: string; name: string; email: string; role: Role } | null = null;
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSessionUser ? { user: mockSessionUser } : null)),
}));

vi.mock("@/lib/actions/task", () => ({
  updateTaskStatusAction: vi.fn(),
  createTaskAction: vi.fn(),
  checkTaskConflictAction: vi.fn(),
}));

describe("Client Tasks Authorization Tests", () => {
  // Test user IDs
  let clientAId: string;
  let clientBId: string;
  let studentAId: string;
  let studentBId: string;

  let taskAId: string;
  let taskBId: string;
  let timeLogAId: string;
  let timeLogBId: string;

  beforeAll(async () => {
    // 1. Create two distinct clients and two distinct students
    const clientA = await prisma.user.create({
      data: {
        name: "Client Alpha",
        email: `client-a-${Date.now()}@example.com`,
        passwordHash: "dummyHash",
        role: Role.CLIENT,
      },
    });
    clientAId = clientA.id;

    const clientB = await prisma.user.create({
      data: {
        name: "Client Beta",
        email: `client-b-${Date.now()}@example.com`,
        passwordHash: "dummyHash",
        role: Role.CLIENT,
      },
    });
    clientBId = clientB.id;

    const studentA = await prisma.user.create({
      data: {
        name: "Student Alpha",
        email: `student-a-${Date.now()}@example.com`,
        passwordHash: "dummyHash",
        role: Role.STUDENT,
      },
    });
    studentAId = studentA.id;

    const studentB = await prisma.user.create({
      data: {
        name: "Student Beta",
        email: `student-b-${Date.now()}@example.com`,
        passwordHash: "dummyHash",
        role: Role.STUDENT,
      },
    });
    studentBId = studentB.id;

    // 2. Link Client A <-> Student A and Client B <-> Student B
    await prisma.clientStudentLink.create({
      data: {
        clientId: clientAId,
        studentId: studentAId,
        hourlyRate: 150,
        status: "ACTIVE",
      },
    });
    await prisma.clientStudentLink.create({
      data: {
        clientId: clientBId,
        studentId: studentBId,
        hourlyRate: 200,
        status: "ACTIVE",
      },
    });

    // 3. Create Task A for Client A and Task B for Client B
    const taskA = await prisma.task.create({
      data: {
        clientId: clientAId,
        studentId: studentAId,
        title: "Confidential Project Alpha",
        description: "Confidential specs for Client Alpha",
        startAt: new Date("2026-11-16T10:00:00.000Z"),
        dueAt: new Date("2026-11-20T12:00:00.000Z"),
        estHours: 4,
        status: TaskStatus.DOING,
        studentResponse: StudentResponse.ACCEPTED,
      },
    });
    taskAId = taskA.id;

    const taskB = await prisma.task.create({
      data: {
        clientId: clientBId,
        studentId: studentBId,
        title: "Secret Project Beta",
        description: "Secret budget details for Client Beta",
        startAt: new Date("2026-11-18T10:00:00.000Z"),
        dueAt: new Date("2026-11-22T12:00:00.000Z"),
        estHours: 5,
        status: TaskStatus.TODO,
        studentResponse: StudentResponse.RESCHEDULE_REQUESTED,
        rescheduleReason: "Beta student personal conflict",
      },
    });
    taskBId = taskB.id;

    // 4. Create TimeLog A for Task A and TimeLog B for Task B
    const timeLogA = await prisma.timeLog.create({
      data: {
        studentId: studentAId,
        taskId: taskAId,
        timeIn: new Date("2026-11-16T10:00:00.000Z"),
        timeOut: new Date("2026-11-16T12:00:00.000Z"),
        totalHours: 2,
        status: TimeLogStatus.APPROVED,
      },
    });
    timeLogAId = timeLogA.id;

    const timeLogB = await prisma.timeLog.create({
      data: {
        studentId: studentBId,
        taskId: taskBId,
        timeIn: new Date("2026-11-18T10:00:00.000Z"),
        timeOut: new Date("2026-11-18T11:00:00.000Z"),
        totalHours: 1,
        status: TimeLogStatus.CLOSED,
      },
    });
    timeLogBId = timeLogB.id;
  });

  afterAll(async () => {
    mockSessionUser = null;
    // Cleanup in order
    await prisma.timeLog.deleteMany({
      where: { id: { in: [timeLogAId, timeLogBId] } },
    });
    await prisma.task.deleteMany({
      where: { id: { in: [taskAId, taskBId] } },
    });
    await prisma.clientStudentLink.deleteMany({
      where: { clientId: { in: [clientAId, clientBId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [clientAId, clientBId, studentAId, studentBId] } },
    });
  });

  // -------------------------------------------------------------------------
  // 1. /client/tasks?task=<id> with another client's task ID
  // -------------------------------------------------------------------------
  it("/client/tasks?task=<id> with another client's task ID never opens the sheet and no data for it reaches the browser", () => {
    // Client A is viewing their tasks page. The browser receives only Client A's tasks.
    const clientATasks: ClientTaskWithLogs[] = [
      {
        id: taskAId,
        clientId: clientAId,
        studentId: studentAId,
        studentName: "Student Alpha",
        title: "Confidential Project Alpha",
        description: "Confidential specs for Client Alpha",
        startAt: new Date("2026-11-16T10:00:00.000Z"),
        dueAt: new Date("2026-11-20T12:00:00.000Z"),
        estHours: 4,
        status: TaskStatus.DOING,
        studentResponse: StudentResponse.ACCEPTED,
        rescheduleReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        loggedHours: 2,
        timeLogs: [],
      },
    ];

    // Attacker crafts URL with another client's task ID: ?task=<taskBId>
    mockSearchParams = new URLSearchParams(`task=${taskBId}`);

    const html = renderToString(
      <ClientTasksView
        initialTasks={clientATasks}
        linkedStudent={{ id: studentAId, name: "Student Alpha" }}
      />
    );

    // The detail sheet must NOT open
    expect(html).not.toContain('data-testid="client-task-sheet"');

    // Confidential details of Client B's task must NEVER leak into the rendered HTML
    expect(html).not.toContain("Secret Project Beta");
    expect(html).not.toContain("Secret budget details for Client Beta");
    expect(html).not.toContain("Beta student personal conflict");
  });

  // -------------------------------------------------------------------------
  // 2. Query scoping for tasks and time logs across multiple clients
  // -------------------------------------------------------------------------
  it("scopes the page's tasks query and time logs query strictly to the current client", async () => {
    // --- Query for Client A ---
    const tasksA = await getClientTasks(clientAId);
    expect(tasksA.some((t) => t.id === taskAId)).toBe(true);
    expect(tasksA.some((t) => t.id === taskBId)).toBe(false);

    // Time logs query for Client A (exact query pattern from page.tsx)
    const taskIdsA = tasksA.map((t) => t.id);
    const timeLogsA = await prisma.timeLog.findMany({
      where: { taskId: { in: taskIdsA } },
      select: {
        id: true,
        taskId: true,
        timeIn: true,
        timeOut: true,
        totalHours: true,
        status: true,
      },
      orderBy: { timeIn: "desc" },
    });

    expect(timeLogsA.some((l) => l.id === timeLogAId)).toBe(true);
    expect(timeLogsA.some((l) => l.id === timeLogBId)).toBe(false);

    // --- Query for Client B ---
    const tasksB = await getClientTasks(clientBId);
    expect(tasksB.some((t) => t.id === taskBId)).toBe(true);
    expect(tasksB.some((t) => t.id === taskAId)).toBe(false);

    // Time logs query for Client B
    const taskIdsB = tasksB.map((t) => t.id);
    const timeLogsB = await prisma.timeLog.findMany({
      where: { taskId: { in: taskIdsB } },
      select: {
        id: true,
        taskId: true,
        timeIn: true,
        timeOut: true,
        totalHours: true,
        status: true,
      },
      orderBy: { timeIn: "desc" },
    });

    expect(timeLogsB.some((l) => l.id === timeLogBId)).toBe(true);
    expect(timeLogsB.some((l) => l.id === timeLogAId)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 3. Student account cannot load /client/tasks data
  // -------------------------------------------------------------------------
  it("prevents a student account from loading /client/tasks data by redirecting to /student", async () => {
    // Mock session as Student Alpha
    mockSessionUser = {
      id: studentAId,
      name: "Student Alpha",
      email: "student-a@example.com",
      role: Role.STUDENT,
    };

    // Attempt to evaluate page guard for /client/tasks (Role.CLIENT)
    await expect(requireRolePage(Role.CLIENT)).rejects.toThrow("NEXT_REDIRECT: /student");
  });

  // -------------------------------------------------------------------------
  // 4. updateTaskStatus rejects unauthorized users
  // -------------------------------------------------------------------------
  it("rejects updateTaskStatus from a user who is neither the task's client nor student", async () => {
    // Client B attempts to update Client A's task
    await expect(
      updateTaskStatus(taskAId, clientBId, TaskStatus.DONE)
    ).rejects.toThrow("Task not found or unauthorized.");

    // Student B attempts to update Client A's task
    await expect(
      updateTaskStatus(taskAId, studentBId, TaskStatus.DONE)
    ).rejects.toThrow("Task not found or unauthorized.");

    // Random non-existent user attempts update
    await expect(
      updateTaskStatus(taskAId, "random-hacker-id", TaskStatus.DONE)
    ).rejects.toThrow("Task not found or unauthorized.");

    // Authorized Client A can update
    const updatedByClientA = await updateTaskStatus(taskAId, clientAId, TaskStatus.DONE);
    expect(updatedByClientA.status).toBe(TaskStatus.DONE);

    // Authorized Student A can update
    const updatedByStudentA = await updateTaskStatus(taskAId, studentAId, TaskStatus.DOING);
    expect(updatedByStudentA.status).toBe(TaskStatus.DOING);
  });
});
