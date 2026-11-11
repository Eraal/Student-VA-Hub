import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../prisma";
import {
  getManilaWeekDates,
  getClientCalendarData,
} from "./calendar-service";
import { Role, LinkStatus } from "@prisma/client";

describe("Calendar Service", () => {
  describe("getManilaWeekDates", () => {
    it("correctly identifies Monday to Sunday for a midweek date in Manila", () => {
      // 2026-11-11 is a Wednesday
      const result = getManilaWeekDates("2026-11-11T04:00:00.000Z"); // 12:00 PM Manila
      expect(result.weekDays).toHaveLength(7);

      // First day must be Monday (dayOfWeek = 1)
      expect(result.weekDays[0].dayOfWeek).toBe(1);
      expect(result.weekStartKey).toBe("2026-11-09"); // Monday

      // Last day must be Sunday (dayOfWeek = 0)
      expect(result.weekDays[6].dayOfWeek).toBe(0);
      expect(result.weekEndKey).toBe("2026-11-15"); // Sunday

      // Next and previous week keys
      expect(result.prevWeekKey).toBe("2026-11-02");
      expect(result.nextWeekKey).toBe("2026-11-16");
    });

    it("correctly handles Sunday as the last day of the academic week", () => {
      // 2026-11-15 is Sunday
      const result = getManilaWeekDates("2026-11-15T04:00:00.000Z");
      expect(result.weekStartKey).toBe("2026-11-09");
      expect(result.weekEndKey).toBe("2026-11-15");
      expect(result.weekDays[6].dayOfWeek).toBe(0);
    });
  });

  describe("getClientCalendarData", () => {
    const testStudentEmail = `test-cal-student-${Date.now()}@example.com`;
    const testClientEmail = `test-cal-client-${Date.now()}@example.com`;
    let studentId = "";
    let clientId = "";
    let createdClassId = "";
    let createdAvailId = "";
    let createdTaskId = "";

    beforeAll(async () => {
      // Create student with profile
      const student = await prisma.user.create({
        data: {
          name: "Cal Student",
          email: testStudentEmail,
          passwordHash: "hash",
          role: Role.STUDENT,
          studentProfile: {
            create: {
              school: "UP Diliman",
              course: "BS CS",
              year: 3,
              maxHoursPerDay: 5,
            },
          },
        },
      });
      studentId = student.id;

      // Create client
      const client = await prisma.user.create({
        data: {
          name: "Cal Client",
          email: testClientEmail,
          passwordHash: "hash",
          role: Role.CLIENT,
        },
      });
      clientId = client.id;

      // Link client and student
      await prisma.clientStudentLink.create({
        data: {
          clientId,
          studentId,
          hourlyRate: 200,
          status: LinkStatus.ACTIVE,
        },
      });

      // Add a class on Wednesday (dayOfWeek 3, 1:00 PM - 2:30 PM -> 780 to 870)
      const cls = await prisma.classSchedule.create({
        data: {
          studentId,
          subject: "TOP SECRET CS 301 ADVANCED ALGORITHMS",
          dayOfWeek: 3,
          startMinutes: 780,
          endMinutes: 870,
        },
      });
      createdClassId = cls.id;

      // Add availability on Wednesday (6:00 PM - 9:00 PM -> 1080 to 1260)
      const avail = await prisma.availability.create({
        data: {
          studentId,
          dayOfWeek: 3,
          startMinutes: 1080,
          endMinutes: 1260,
        },
      });
      createdAvailId = avail.id;

      // Add a task on Wednesday 2026-11-11 7:00 PM - 8:30 PM (11:00 UTC - 12:30 UTC)
      const task = await prisma.task.create({
        data: {
          clientId,
          studentId,
          title: "Prepare Slide Deck",
          startAt: new Date("2026-11-11T11:00:00.000Z"),
          dueAt: new Date("2026-11-11T12:30:00.000Z"),
          estHours: 1.5,
        },
      });
      createdTaskId = task.id;
    });

    afterAll(async () => {
      // Clean up specific test records
      if (createdTaskId) {
        await prisma.task.deleteMany({ where: { id: createdTaskId } });
      }
      if (createdClassId) {
        await prisma.classSchedule.deleteMany({ where: { id: createdClassId } });
      }
      if (createdAvailId) {
        await prisma.availability.deleteMany({ where: { id: createdAvailId } });
      }
      if (clientId && studentId) {
        await prisma.clientStudentLink.deleteMany({ where: { clientId, studentId } });
      }
      if (studentId) {
        await prisma.studentProfile.deleteMany({ where: { userId: studentId } });
        await prisma.user.deleteMany({ where: { id: studentId } });
      }
      if (clientId) {
        await prisma.user.deleteMany({ where: { id: clientId } });
      }
    });

    it("returns linked: false if client has no linked student", async () => {
      const unlinkedClientId = "non-existent-client-id";
      const result = await getClientCalendarData(unlinkedClientId);
      expect(result.linked).toBe(false);
      expect(result.days).toHaveLength(0);
    });

    it("SPEC §10 Scenario 6: client sees 'In class' blocks only with subject names strictly redacted", async () => {
      const result = await getClientCalendarData(clientId, "2026-11-11T04:00:00.000Z");

      expect(result.linked).toBe(true);
      expect(result.student?.name).toBe("Cal Student");
      expect(result.student?.hourlyRate).toBe(200);

      // Wednesday is index 2 (Monday=0, Tuesday=1, Wednesday=2)
      const wednesday = result.days.find((d) => d.dayOfWeek === 3);
      expect(wednesday).toBeDefined();

      // Check class item
      expect(wednesday?.classes).toHaveLength(1);
      const classItem = wednesday!.classes[0];

      // CRITICAL PRIVACY ASSERTION:
      expect(classItem.title).toBe("In class");
      expect((classItem as any).subject).toBeUndefined();
      expect(JSON.stringify(result)).not.toContain("TOP SECRET CS 301 ADVANCED ALGORITHMS");

      expect(classItem.startTimeFormatted).toBe("1:00 PM");
      expect(classItem.endTimeFormatted).toBe("2:30 PM");

      // Check availability item
      expect(wednesday?.availabilities).toHaveLength(1);
      const availItem = wednesday!.availabilities[0];
      expect(availItem.startTimeFormatted).toBe("6:00 PM");
      expect(availItem.endTimeFormatted).toBe("9:00 PM");

      // Check task item
      expect(wednesday?.tasks).toHaveLength(1);
      const taskItem = wednesday!.tasks[0];
      expect(taskItem.title).toBe("Prepare Slide Deck");
      expect(taskItem.estHours).toBe(1.5);
    });
  });
});

