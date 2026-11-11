import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getLinkedStudentForClient,
  checkTaskConflictForClient,
  createTask,
  getClientTasks,
  getStudentTasks,
  getTaskById,
  updateTaskStatus,
  respondToTask,
} from "./task-service";
import { prisma } from "../prisma";
import { TaskStatus, StudentResponse } from "@prisma/client";

describe("task-service", () => {
  let clientId: string;
  let studentId: string;
  const createdTaskIds: string[] = [];

  beforeEach(async () => {
    const client = await prisma.user.findUnique({
      where: { email: "maria@example.com" },
    });
    const student = await prisma.user.findUnique({
      where: { email: "juan@example.com" },
    });

    if (!client || !student) {
      throw new Error("Seed users not found");
    }

    clientId = client.id;
    studentId = student.id;
  });

  afterEach(async () => {
    // Clean up tasks created during tests
    if (createdTaskIds.length > 0) {
      await prisma.notification.deleteMany({
        where: { userId: { in: [studentId, clientId] } },
      });
      await prisma.task.deleteMany({
        where: { id: { in: createdTaskIds } },
      });
      createdTaskIds.length = 0;
    }
  });

  describe("getLinkedStudentForClient", () => {
    it("returns the linked student for client", async () => {
      const linked = await getLinkedStudentForClient(clientId);
      expect(linked).not.toBeNull();
      expect(linked?.student.email).toBe("juan@example.com");
      expect(linked?.hourlyRate).toBe(150);
    });
  });

  describe("checkTaskConflictForClient", () => {
    it("detects class overlap for linked student and blocks submission", async () => {
      // Juan has CS 201 on Monday 1:00 PM–2:00 PM Manila (05:00–06:00 UTC)
      const res = await checkTaskConflictForClient(clientId, {
        startAt: "2026-11-16T05:00:00.000Z",
        dueAt: "2026-11-16T06:00:00.000Z",
        estHours: 1,
      });

      expect(res.ok).toBe(false);
      expect(res.conflicts.some((c) => c.type === "CLASS_OVERLAP")).toBe(true);
      expect(res.student?.name).toBe("Juan Dela Cruz");
    });

    it("evaluates clean when task is in student's availability window", async () => {
      // Juan is available Monday 6:00 PM–9:00 PM Manila (10:00–13:00 UTC)
      const res = await checkTaskConflictForClient(clientId, {
        startAt: "2026-11-16T10:00:00.000Z",
        dueAt: "2026-11-16T12:00:00.000Z",
        estHours: 2,
      });

      expect(res.ok).toBe(true);
      expect(res.conflicts.some((c) => c.severity === "BLOCK")).toBe(false);
    });
  });

  describe("createTask", () => {
    it("rejects task creation if hard class overlap conflict exists", async () => {
      await expect(
        createTask(clientId, {
          title: "Overlapping task",
          startAt: "2026-11-16T05:00:00.000Z", // 1:00 PM Manila
          dueAt: "2026-11-16T06:00:00.000Z",   // 2:00 PM Manila
          estHours: 1,
        })
      ).rejects.toThrow(/Conflict!/);
    });

    it("successfully creates a task during available hours and notifies student", async () => {
      const res = await createTask(clientId, {
        title: "Create graphic assets for client presentation",
        description: "Figma exported SVG files.",
        startAt: "2026-11-16T10:00:00.000Z", // 6:00 PM Manila
        dueAt: "2026-11-16T12:00:00.000Z",   // 8:00 PM Manila
        estHours: 2,
      });

      expect(res.task).toBeDefined();
      expect(res.task.title).toBe("Create graphic assets for client presentation");
      expect(res.task.status).toBe(TaskStatus.TODO);
      createdTaskIds.push(res.task.id);

      // Verify notification created for student
      const notif = await prisma.notification.findFirst({
        where: {
          userId: studentId,
          type: "TASK_ASSIGNED",
        },
        orderBy: { createdAt: "desc" },
      });

      expect(notif).not.toBeNull();
      expect(notif?.message).toContain("Create graphic assets");
    });
  });

  describe("task status and response updates", () => {
    it("updates task status and handles student response", async () => {
      const taskRes = await createTask(clientId, {
        title: "Documentation task",
        startAt: "2026-11-16T10:00:00.000Z",
        dueAt: "2026-11-16T11:00:00.000Z",
        estHours: 1,
      });
      createdTaskIds.push(taskRes.task.id);

      // 1. Student accepts task
      const accepted = await respondToTask(
        taskRes.task.id,
        studentId,
        StudentResponse.ACCEPTED
      );
      expect(accepted.studentResponse).toBe("ACCEPTED");

      // 2. Student moves to DOING
      const doing = await updateTaskStatus(
        taskRes.task.id,
        studentId,
        TaskStatus.DOING
      );
      expect(doing.status).toBe("DOING");

      // 3. Retrieve task by ID
      const fetched = await getTaskById(taskRes.task.id, studentId);
      expect(fetched?.status).toBe("DOING");
      expect(fetched?.studentResponse).toBe("ACCEPTED");

      // 4. Client tasks list contains this task
      const clientTasks = await getClientTasks(clientId);
      expect(clientTasks.some((t) => t.id === taskRes.task.id)).toBe(true);

      // 5. Student tasks list contains this task
      const studentTasks = await getStudentTasks(studentId);
      expect(studentTasks.some((t) => t.id === taskRes.task.id)).toBe(true);
    });
  });
});
