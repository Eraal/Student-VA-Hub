import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  calculateLoggedHours,
  timeIn,
  timeOut,
  requestCorrection,
  getStudentTimeData,
} from "./time-service";
import { prisma } from "../prisma";
import { TimeLogStatus, TaskStatus } from "@prisma/client";

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

    // Clean up any open logs for juan before test
    await prisma.timeLog.deleteMany({
      where: { studentId },
    });

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
      },
    });
    testTaskId = task.id;
  });

  afterEach(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: [studentId, clientId] } },
    });
    await prisma.timeLog.deleteMany({
      where: { studentId },
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

      // At P150/hr: 3 hours * 150 = 450
      const rate = 150;
      expect(hours * rate).toBe(450);
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
      expect(notif?.message).toContain("requested time correction");
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
