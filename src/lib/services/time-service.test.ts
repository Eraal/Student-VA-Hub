import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  calculateLoggedHours,
  timeIn,
  timeOut,
  requestCorrection,
  getStudentTimeData,
} from "./time-service";
import { calculateLogAmount } from "../money";
import { prisma } from "../prisma";
import { TimeLogStatus, TaskStatus, StudentResponse } from "@prisma/client";

describe("time-service", () => {
  let studentId: string;
  let clientId: string;
  let testTaskId: string;
  const createdLogIds: string[] = [];

  beforeEach(async () => {
    const student = await prisma.user.findUnique({
      where: { email: "juan@example.com" },
    });
    const client = await prisma.user.findUnique({
      where: { email: "maria@example.com" },
    });

    if (!student || !client) throw new Error("Seed users not found");
    studentId = student.id;
    clientId = client.id;

    if (testTaskId) {
      await prisma.timeLog.deleteMany({
        where: { taskId: testTaskId },
      });
    }

    // Create a temporary task to track time against
    const task = await prisma.task.create({
      data: {
        clientId,
        studentId,
        title: "Test Task for Timing",
        startAt: new Date(),
        dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        estHours: 2,
        status: TaskStatus.TODO,
        studentResponse: StudentResponse.ACCEPTED,
      },
    });
    testTaskId = task.id;
  });

  afterEach(async () => {
    await prisma.notification.deleteMany({
      where: { message: { contains: "Test Task for Timing" } },
    });
    if (createdLogIds.length > 0) {
      await prisma.timeLog.deleteMany({
        where: { id: { in: createdLogIds } },
      });
    }
    await prisma.timeLog.deleteMany({
      where: { taskId: testTaskId },
    });
    await prisma.task.deleteMany({
      where: { id: testTaskId },
    });
    createdLogIds.length = 0;
  });

  describe("calculateLoggedHours (Acceptance Test §10 Scenario 3)", () => {
    it("computes exactly 3 hours between 6:00 PM and 9:00 PM", () => {
      // 6:00 PM to 9:00 PM = 3 hours
      const tIn = new Date("2026-11-16T10:00:00.000Z"); // 6:00 PM Manila
      const tOut = new Date("2026-11-16T13:00:00.000Z"); // 9:00 PM Manila

      const hours = calculateLoggedHours(tIn, tOut);
      expect(hours).toBe(3.0);

      // At P150/hr: 3 hours @ 150 = 450
      const rate = 150;
      expect(calculateLogAmount(hours, rate)).toBe(450);
    });

    it("computes fractional hours correctly (e.g. 1.5h, 0.75h)", () => {
      const tIn = new Date(1000000);
      const t1h30 = new Date(1000000 + 90 * 60 * 1000);
      expect(calculateLoggedHours(tIn, t1h30)).toBe(1.5);

      const t45m = new Date(1000000 + 45 * 60 * 1000);
      expect(calculateLoggedHours(tIn, t45m)).toBe(0.75);
    });
  });

  describe("Single Open Log Rule (Acceptance Test §10 Scenario 4)", () => {
    it("allows first Time In, but rejects a second Time In while first is OPEN", async () => {
      // 1. First Time In succeeds
      const log1 = await timeIn(studentId, testTaskId);
      expect(log1.id).toBeDefined();
      expect(log1.status).toBe(TimeLogStatus.OPEN);
      createdLogIds.push(log1.id);

      // 2. Second Time In immediately attempts while log1 is still OPEN
      await expect(timeIn(studentId, testTaskId)).rejects.toThrow(
        /A time log is already open/
      );

      // 3. Time Out on first log
      const closed1 = await timeOut(studentId, log1.id, "Finished first session.");
      expect(closed1.status).toBe(TimeLogStatus.CLOSED);
      expect(closed1.totalHours).toBeGreaterThanOrEqual(0.01);

      // 4. Now a new Time In is permitted again!
      const log2 = await timeIn(studentId, testTaskId);
      expect(log2.status).toBe(TimeLogStatus.OPEN);
      createdLogIds.push(log2.id);

      // Clean up log2
      await timeOut(studentId, log2.id);
    });
  });

  describe("requestCorrection", () => {
    it("submits a requested time out correction with reason and notifies client", async () => {
      const log = await timeIn(studentId, testTaskId);
      await timeOut(studentId, log.id);

      const correctionTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const res = await requestCorrection(studentId, {
        timeLogId: log.id,
        requestedTimeOut: correctionTime,
        correctionNote: "Forgot to press Time Out before brownout.",
      });

      expect(res.correctionStatus).toBe("PENDING");
      expect(res.correctionNote).toBe("Forgot to press Time Out before brownout.");

      // Check client notification
      const notif = await prisma.notification.findFirst({
        where: { userId: clientId, type: "CORRECTION_REQUESTED" },
        orderBy: { createdAt: "desc" },
      });
      expect(notif).not.toBeNull();
      expect(notif?.message).toContain("requested a time correction");
    });

    it("rejects correction requests for an open log", async () => {
      const log = await timeIn(studentId, testTaskId);
      createdLogIds.push(log.id);

      await expect(
        requestCorrection(studentId, {
          timeLogId: log.id,
          requestedTimeOut: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          correctionNote: "This request should not be accepted yet.",
        }),
      ).rejects.toThrow("Only a closed time log can be corrected");

      await timeOut(studentId, log.id);
    });
  });

  describe("Acceptance requirement before Time In (Business Rule)", () => {
    it("rejects Time In on a task with null studentResponse", async () => {
      const nullTask = await prisma.task.create({
        data: {
          clientId,
          studentId,
          title: "Unaccepted Task",
          startAt: new Date(),
          dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
          estHours: 1,
          status: TaskStatus.TODO,
          studentResponse: null,
        },
      });

      await expect(timeIn(studentId, nullTask.id)).rejects.toThrow(
        "Accept this task before you start the timer."
      );

      await prisma.task.delete({ where: { id: nullTask.id } });
    });

    it("rejects Time In on a task with RESCHEDULE_REQUESTED", async () => {
      const rescheduleTask = await prisma.task.create({
        data: {
          clientId,
          studentId,
          title: "Reschedule Task",
          startAt: new Date(),
          dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
          estHours: 1,
          status: TaskStatus.TODO,
          studentResponse: StudentResponse.RESCHEDULE_REQUESTED,
          rescheduleReason: "Doctor appointment",
        },
      });

      await expect(timeIn(studentId, rescheduleTask.id)).rejects.toThrow(
        "Accept this task before you start the timer."
      );

      await prisma.task.delete({ where: { id: rescheduleTask.id } });
    });

    it("rejects Time In on a completed task (status === DONE)", async () => {
      const doneTask = await prisma.task.create({
        data: {
          clientId,
          studentId,
          title: "Completed Task",
          startAt: new Date(),
          dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
          estHours: 1,
          status: TaskStatus.DONE,
          studentResponse: StudentResponse.ACCEPTED,
        },
      });

      await expect(timeIn(studentId, doneTask.id)).rejects.toThrow(
        "Cannot track time on a completed task."
      );

      await prisma.task.delete({ where: { id: doneTask.id } });
    });

    it("allows Time In on an ACCEPTED task and transitions status from TODO to DOING", async () => {
      const acceptedTask = await prisma.task.create({
        data: {
          clientId,
          studentId,
          title: "Accepted Task",
          startAt: new Date(),
          dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
          estHours: 1,
          status: TaskStatus.TODO,
          studentResponse: StudentResponse.ACCEPTED,
        },
      });

      const log = await timeIn(studentId, acceptedTask.id);
      expect(log.status).toBe(TimeLogStatus.OPEN);
      createdLogIds.push(log.id);

      const updatedTask = await prisma.task.findUnique({ where: { id: acceptedTask.id } });
      expect(updatedTask?.status).toBe(TaskStatus.DOING);

      await timeOut(studentId, log.id);
      await prisma.timeLog.deleteMany({ where: { taskId: acceptedTask.id } });
      await prisma.task.delete({ where: { id: acceptedTask.id } });
    });

    it("only returns ACCEPTED and not-done tasks in availableTasks", async () => {
      const nullTask = await prisma.task.create({
        data: {
          clientId,
          studentId,
          title: "Unaccepted Helper Task",
          startAt: new Date(),
          dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
          estHours: 1,
          status: TaskStatus.TODO,
          studentResponse: null,
        },
      });

      const data = await getStudentTimeData(studentId);
      const ids = data.availableTasks.map((t) => t.id);
      expect(ids).toContain(testTaskId);
      expect(ids).not.toContain(nullTask.id);

      await prisma.task.delete({ where: { id: nullTask.id } });
    });
  });

  describe("getStudentTimeData", () => {
    it("retrieves active log and historical stats correctly", async () => {
      const log = await timeIn(studentId, testTaskId);

      const data = await getStudentTimeData(studentId);
      expect(data.activeLog).not.toBeNull();
      expect(data.activeLog?.id).toBe(log.id);
      expect(data.activeLog?.taskTitle).toBe("Test Task for Timing");
      expect(data.availableTasks.length).toBeGreaterThan(0);

      await timeOut(studentId, log.id);

      const afterData = await getStudentTimeData(studentId);
      expect(afterData.activeLog).toBeNull();
      expect(afterData.logs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
