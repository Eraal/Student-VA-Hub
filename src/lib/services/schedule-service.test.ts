import { describe, it, expect, beforeEach } from "vitest";
import {
  getStudentSchedule,
  addClassSchedule,
  updateClassSchedule,
  deleteClassSchedule,
  addAvailability,
  deleteAvailability,
  updateMaxHours,
  addBlockedDate,
  deleteBlockedDate,
  utcToManilaDayAndMinutes,
} from "./schedule-service";
import { prisma } from "../prisma";
import { TaskStatus } from "@prisma/client";

describe("schedule-service", () => {
  let studentId: string;
  let clientId: string;

  beforeEach(async () => {
    const student = await prisma.user.findUnique({
      where: { email: "juan@example.com" },
    });
    if (!student) throw new Error("Seed student juan@example.com not found");
    studentId = student.id;

    const client = await prisma.user.findUnique({
      where: { email: "maria@example.com" },
    });
    if (!client) throw new Error("Seed client maria@example.com not found");
    clientId = client.id;
  });

  describe("utcToManilaDayAndMinutes", () => {
    it("converts UTC date to Manila UTC+8 day and minutes correctly", () => {
      // 2026-11-16 01:00 UTC (Monday 01:00 UTC) -> Manila 09:00 AM (Monday) = 540 mins
      const utc1 = new Date(Date.UTC(2026, 10, 16, 1, 0, 0));
      const res1 = utcToManilaDayAndMinutes(utc1);
      expect(res1.dayOfWeek).toBe(1); // Monday
      expect(res1.minutes).toBe(540);

      // 2026-11-15 23:00 UTC (Sunday 23:00 UTC) -> Manila Monday 07:00 AM = 420 mins
      const utc2 = new Date(Date.UTC(2026, 10, 15, 23, 0, 0));
      const res2 = utcToManilaDayAndMinutes(utc2);
      expect(res2.dayOfWeek).toBe(1); // Crossed midnight into Monday
      expect(res2.minutes).toBe(420);
    });
  });

  describe("getStudentSchedule", () => {
    it("fetches formatted classes, availability, maxHours, and blockedDates", async () => {
      const schedule = await getStudentSchedule(studentId);
      expect(schedule).toBeDefined();
      expect(Array.isArray(schedule.classes)).toBe(true);
      expect(Array.isArray(schedule.availabilities)).toBe(true);
      expect(typeof schedule.maxHoursPerDay).toBe("number");
      expect(Array.isArray(schedule.blockedDates)).toBe(true);

      // Verify formatting on classes
      if (schedule.classes.length > 0) {
        const first = schedule.classes[0];
        expect(first.startTime).toMatch(/(AM|PM)/);
        expect(first.endTime).toMatch(/(AM|PM)/);
        expect(first.duration).toBeDefined();
      }
    });
  });

  describe("addClassSchedule and CRUD", () => {
    it("successfully creates, updates, and deletes a class schedule item", async () => {
      // 1. Add
      const addRes = await addClassSchedule(studentId, {
        subject: "Special Lab 401",
        dayOfWeek: 4, // Thursday
        startTime: "14:00",
        endTime: "16:00",
      });

      expect(addRes.classItem).toBeDefined();
      expect(addRes.classItem.subject).toBe("Special Lab 401");
      expect(addRes.classItem.startMinutes).toBe(840);
      expect(addRes.classItem.endMinutes).toBe(960);
      const classId = addRes.classItem.id;

      // 2. Update
      const updateRes = await updateClassSchedule(studentId, {
        id: classId,
        subject: "Special Lab 401 (Advanced)",
        dayOfWeek: 4,
        startTime: "14:30",
        endTime: "16:30",
      });

      expect(updateRes.classItem.subject).toBe("Special Lab 401 (Advanced)");
      expect(updateRes.classItem.startMinutes).toBe(870);

      // 3. Delete
      const deleteRes = await deleteClassSchedule(studentId, classId);
      expect(deleteRes.success).toBe(true);

      // Verify deletion in DB
      const found = await prisma.classSchedule.findUnique({ where: { id: classId } });
      expect(found).toBeNull();
    });

    it("detects two-way overlap warning when adding a class overlapping an active task", async () => {
      // Create a test task on Monday 15:00-16:00 Manila (07:00-08:00 UTC)
      // 2026-11-16 is a Monday
      const startAtUtc = new Date(Date.UTC(2026, 10, 16, 7, 0, 0));
      const dueAtUtc = new Date(Date.UTC(2026, 10, 16, 8, 0, 0));

      const task = await prisma.task.create({
        data: {
          clientId,
          studentId,
          title: "Overlapping VA Research Task",
          startAt: startAtUtc,
          dueAt: dueAtUtc,
          estHours: 1,
          status: TaskStatus.TODO,
        },
      });

      try {
        // Add class on Monday 15:30 - 16:30 Manila (overlaps the task)
        const res = await addClassSchedule(studentId, {
          subject: "Overlapping Seminar",
          dayOfWeek: 1, // Monday
          startTime: "15:30",
          endTime: "16:30",
        });

        expect(res.warning).toContain("Overlaps existing task");
        expect(res.warning).toContain("Overlapping VA Research Task");

        // Clean up class
        await prisma.classSchedule.delete({ where: { id: res.classItem.id } });
      } finally {
        await prisma.task.delete({ where: { id: task.id } });
      }
    });
  });

  describe("availability CRUD", () => {
    it("adds and deletes availability window", async () => {
      const created = await addAvailability(studentId, {
        dayOfWeek: 2, // Tuesday
        startTime: "19:00",
        endTime: "21:00",
      });

      expect(created.id).toBeDefined();
      expect(created.startMinutes).toBe(1140);
      expect(created.endMinutes).toBe(1260);

      const del = await deleteAvailability(studentId, created.id);
      expect(del.success).toBe(true);
    });
  });

  describe("updateMaxHours", () => {
    it("updates student profile max hours per day", async () => {
      const res = await updateMaxHours(studentId, 5.5);
      expect(res.maxHoursPerDay).toBe(5.5);

      const profile = await prisma.studentProfile.findUnique({
        where: { userId: studentId },
      });
      expect(profile?.maxHoursPerDay).toBe(5.5);

      // Reset back to 4
      await updateMaxHours(studentId, 4.0);
    });
  });

  describe("blockedDate CRUD", () => {
    it("adds and deletes a blocked date range", async () => {
      const start = new Date("2026-12-01T00:00:00.000Z").toISOString();
      const end = new Date("2026-12-05T00:00:00.000Z").toISOString();

      const created = await addBlockedDate(studentId, {
        dateStart: start,
        dateEnd: end,
        reason: "Christmas Break Early",
      });

      expect(created.id).toBeDefined();
      expect(created.reason).toBe("Christmas Break Early");

      const del = await deleteBlockedDate(studentId, created.id);
      expect(del.success).toBe(true);
    });
  });
});

