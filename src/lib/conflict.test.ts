import { describe, it, expect } from "vitest";
import {
  checkConflict,
  canStudentTimeIn,
  checkClassAgainstTasks,
  toManilaTimeComponents,
  ClassScheduleItem,
  AvailabilityWindow,
  ExistingTaskItem,
} from "./conflict";

describe("conflict-detector (SPEC §6 & Acceptance Tests §10)", () => {
  // Sample test date: Monday, Nov 16, 2026
  // In Manila: 1:00 PM is 13:00 (780 mins). In UTC: 05:00 AM (Date.UTC(2026, 10, 16, 5, 0))
  const MONDAY_1PM_MANILA_UTC = new Date(Date.UTC(2026, 10, 16, 5, 0, 0)); // 1:00 PM Manila
  const MONDAY_2PM_MANILA_UTC = new Date(Date.UTC(2026, 10, 16, 6, 0, 0)); // 2:00 PM Manila

  const juanClasses: ClassScheduleItem[] = [
    {
      dayOfWeek: 1, // Monday
      startMinutes: 780, // 1:00 PM (13:00)
      endMinutes: 840,   // 2:00 PM (14:00)
      subject: "Secret Advanced Algorithms CS 301", // Must NEVER be revealed to client
    },
  ];

  const juanAvailability: AvailabilityWindow[] = [
    {
      dayOfWeek: 1, // Monday
      startMinutes: 1080, // 6:00 PM (18:00)
      endMinutes: 1260,   // 9:00 PM (21:00) - 3 hours window
    },
  ];

  describe("Timezone conversion helper (toManilaTimeComponents)", () => {
    it("converts UTC time to exact Manila time (+8h)", () => {
      // 05:00 UTC -> 13:00 Manila (1:00 PM) = 780 minutes
      const res = toManilaTimeComponents(MONDAY_1PM_MANILA_UTC);
      expect(res.dayOfWeek).toBe(1); // Monday
      expect(res.minutesFromMidnight).toBe(780);
      expect(res.dateKey).toBe("2026-11-16");
    });

    it("handles midnight boundary crossing from UTC to Manila", () => {
      // Sunday 11:30 PM UTC -> Monday 7:30 AM Manila
      const sunUtc = new Date(Date.UTC(2026, 10, 15, 23, 30, 0));
      const res = toManilaTimeComponents(sunUtc);
      expect(res.dayOfWeek).toBe(1); // Monday
      expect(res.minutesFromMidnight).toBe(450); // 7:30 AM = 450 mins
      expect(res.dateKey).toBe("2026-11-16");
    });
  });

  describe("Rule 1 & Acceptance Test 1: Task at 1PM, student has class 1PM", () => {
    it("BLOCKS task with exact class overlap", () => {
      const task = {
        startAt: MONDAY_1PM_MANILA_UTC, // 1:00 PM Manila
        dueAt: MONDAY_2PM_MANILA_UTC,   // 2:00 PM Manila
        estHours: 1,
      };

      const result = checkConflict(task, juanClasses, juanAvailability, [], 4, {
        studentName: "Juan",
      });

      expect(result.ok).toBe(false);
      const classOverlap = result.conflicts.find((c) => c.type === "CLASS_OVERLAP");
      expect(classOverlap).toBeDefined();
      expect(classOverlap?.severity).toBe("BLOCK");
      expect(classOverlap?.message).toContain("Conflict! Juan has class Monday");
      expect(classOverlap?.message).toContain("1:00 PM–2:00 PM");
    });
  });

  describe("Rule 1 & Acceptance Test 2: Task 12:30PM-2PM, class 1PM-2PM", () => {
    it("BLOCKS partial overlap starting before class", () => {
      // 12:30 PM Manila is 04:30 UTC
      const taskStart = new Date(Date.UTC(2026, 10, 16, 4, 30, 0));
      // 2:00 PM Manila is 06:00 UTC
      const taskEnd = new Date(Date.UTC(2026, 10, 16, 6, 0, 0));

      const task = {
        startAt: taskStart,
        dueAt: taskEnd,
        estHours: 1.5,
      };

      const result = checkConflict(task, juanClasses, juanAvailability, [], 4, {
        studentName: "Juan",
      });

      expect(result.ok).toBe(false);
      expect(result.conflicts.some((c) => c.type === "CLASS_OVERLAP")).toBe(true);
    });

    it("BLOCKS partial overlap ending after class start (e.g. 1:30 PM - 2:30 PM)", () => {
      // 1:30 PM Manila is 05:30 UTC
      const taskStart = new Date(Date.UTC(2026, 10, 16, 5, 30, 0));
      // 2:30 PM Manila is 06:30 UTC
      const taskEnd = new Date(Date.UTC(2026, 10, 16, 6, 30, 0));

      const task = {
        startAt: taskStart,
        dueAt: taskEnd,
        estHours: 1,
      };

      const result = checkConflict(task, juanClasses, juanAvailability, [], 4);
      expect(result.ok).toBe(false);
      expect(result.conflicts.some((c) => c.type === "CLASS_OVERLAP")).toBe(true);
    });

    it("BLOCKS task that fully encloses class (e.g. 12:00 PM - 3:00 PM)", () => {
      const taskStart = new Date(Date.UTC(2026, 10, 16, 4, 0, 0));
      const taskEnd = new Date(Date.UTC(2026, 10, 16, 7, 0, 0));

      const task = {
        startAt: taskStart,
        dueAt: taskEnd,
        estHours: 3,
      };

      const result = checkConflict(task, juanClasses, juanAvailability, [], 4);
      expect(result.ok).toBe(false);
      expect(result.conflicts.some((c) => c.type === "CLASS_OVERLAP")).toBe(true);
    });

    it("ALLOWS adjacent back-to-back task ending right when class starts", () => {
      // Task: 12:00 PM - 1:00 PM Manila. Class: 1:00 PM - 2:00 PM Manila.
      const taskStart = new Date(Date.UTC(2026, 10, 16, 4, 0, 0));
      const taskEnd = new Date(Date.UTC(2026, 10, 16, 5, 0, 0));

      const task = {
        startAt: taskStart,
        dueAt: taskEnd,
        estHours: 1,
      };

      const result = checkConflict(task, juanClasses, [
        { dayOfWeek: 1, startMinutes: 720, endMinutes: 780 },
      ], [], 4);

      const hasClassOverlap = result.conflicts.some((c) => c.type === "CLASS_OVERLAP");
      expect(hasClassOverlap).toBe(false);
    });
  });

  describe("Rule 1 & Acceptance Test 6: Subject privacy verification", () => {
    it("NEVER reveals subject name in client conflict messages", () => {
      const task = {
        startAt: MONDAY_1PM_MANILA_UTC,
        dueAt: MONDAY_2PM_MANILA_UTC,
        estHours: 1,
      };

      const result = checkConflict(task, juanClasses, juanAvailability, [], 4, {
        studentName: "Juan",
      });

      const message = result.conflicts[0].message;
      expect(message).not.toContain("Secret Advanced Algorithms");
      expect(message).not.toContain("CS 301");
      expect(message).toContain("has class");
    });
  });

  describe("Rule 2: Outside available hours warning", () => {
    it("warns when task is outside student availability windows", () => {
      // Task at 3:00 PM - 4:00 PM Manila (Juan is only available 6:00 PM - 9:00 PM)
      const taskStart = new Date(Date.UTC(2026, 10, 16, 7, 0, 0));
      const taskDue = new Date(Date.UTC(2026, 10, 16, 8, 0, 0));

      const task = {
        startAt: taskStart,
        dueAt: taskDue,
        estHours: 1,
      };

      const result = checkConflict(task, [], juanAvailability, [], 4, {
        studentName: "Juan",
      });

      // No class overlap, so ok is true! (Client can still submit)
      expect(result.ok).toBe(true);
      expect(result.hasWarnings).toBe(true);
      const warn = result.conflicts.find((c) => c.type === "OUTSIDE_AVAILABILITY");
      expect(warn).toBeDefined();
      expect(warn?.severity).toBe("WARN");
      expect(warn?.message).toContain("outside Juan's set availability windows");
    });

    it("has no outside-availability warning when fully inside window", () => {
      // Task: 6:30 PM - 8:30 PM Manila (inside 6:00 PM - 9:00 PM window)
      const taskStart = new Date(Date.UTC(2026, 10, 16, 10, 30, 0));
      const taskDue = new Date(Date.UTC(2026, 10, 16, 12, 30, 0));

      const task = {
        startAt: taskStart,
        dueAt: taskDue,
        estHours: 2,
      };

      const result = checkConflict(task, [], juanAvailability, [], 4);
      expect(result.conflicts.some((c) => c.type === "OUTSIDE_AVAILABILITY")).toBe(false);
    });
  });

  describe("Rule 3 & Acceptance Test 5: 5-hour task, 2 available hours", () => {
    it("triggers 'Exceeds Available Hours' warning but allows submission (ok: true)", () => {
      // Juan has 4 hours max/day, but already has 2 hours assigned today
      const existingTask: ExistingTaskItem = {
        id: "task-1",
        startAt: new Date(Date.UTC(2026, 10, 16, 10, 0, 0)),
        dueAt: new Date(Date.UTC(2026, 10, 16, 12, 0, 0)),
        estHours: 2, // 2 hours used
      };

      // Proposed 5-hour task on the same day
      const task = {
        startAt: new Date(Date.UTC(2026, 10, 16, 10, 0, 0)),
        dueAt: new Date(Date.UTC(2026, 10, 16, 15, 0, 0)),
        estHours: 5,
      };

      // Availability window is 4 hours
      const availability: AvailabilityWindow[] = [
        { dayOfWeek: 1, startMinutes: 600, endMinutes: 840 },
      ];

      const result = checkConflict(task, [], availability, [existingTask], 4);

      // Warning only! Client can still send it.
      expect(result.ok).toBe(true);
      expect(result.hasWarnings).toBe(true);
      const hourWarn = result.conflicts.find((c) => c.type === "EXCEEDS_AVAILABLE_HOURS");
      expect(hourWarn).toBeDefined();
      expect(hourWarn?.severity).toBe("WARN");
      expect(hourWarn?.message).toContain("Exceeds Available Hours");
      expect(hourWarn?.message).toContain("5h vs 2h remaining");
    });
  });

  describe("Rule 4 & Acceptance Test 4: Single open TimeLog check", () => {
    it("rejects Time In if a log is already open", () => {
      const res = canStudentTimeIn(1);
      expect(res.allowed).toBe(false);
      expect(res.message).toContain("already open");
    });

    it("allows Time In if zero logs are open", () => {
      const res = canStudentTimeIn(0);
      expect(res.allowed).toBe(true);
    });
  });

  describe("Rule 5 & Acceptance Test 10: Two-way conflict check on class add", () => {
    it("flags warning when student adds a class that overlaps an existing task", () => {
      // Existing task: Monday 1:00 PM - 2:00 PM Manila (05:00 - 06:00 UTC)
      const existingTask: ExistingTaskItem = {
        id: "task-va-1",
        startAt: MONDAY_1PM_MANILA_UTC,
        dueAt: MONDAY_2PM_MANILA_UTC,
        estHours: 1,
        status: "TODO",
      };

      // Student tries to add a new class Monday 1:15 PM - 2:15 PM (795 - 855 mins)
      const newClass = {
        dayOfWeek: 1,
        startMinutes: 795,
        endMinutes: 855,
      };

      const check = checkClassAgainstTasks(newClass, [existingTask]);
      expect(check.hasConflict).toBe(true);
      expect(check.message).toContain("overlaps an existing task");
    });

    it("does not flag conflict if task is already DONE", () => {
      const doneTask: ExistingTaskItem = {
        id: "task-done",
        startAt: MONDAY_1PM_MANILA_UTC,
        dueAt: MONDAY_2PM_MANILA_UTC,
        estHours: 1,
        status: "DONE",
      };

      const newClass = {
        dayOfWeek: 1,
        startMinutes: 780,
        endMinutes: 840,
      };

      const check = checkClassAgainstTasks(newClass, [doneTask]);
      expect(check.hasConflict).toBe(false);
    });
  });

  describe("Acceptance Test 12: Timezone consistency (UTC vs Manila timestamp)", () => {
    it("yields identical conflict result whether ISO string or Date is passed", () => {
      const taskDate = {
        startAt: MONDAY_1PM_MANILA_UTC,
        dueAt: MONDAY_2PM_MANILA_UTC,
        estHours: 1,
      };

      const taskIso = {
        startAt: "2026-11-16T05:00:00.000Z",
        dueAt: "2026-11-16T06:00:00.000Z",
        estHours: 1,
      };

      const resDate = checkConflict(taskDate, juanClasses, juanAvailability, [], 4);
      const resIso = checkConflict(taskIso, juanClasses, juanAvailability, [], 4);

      expect(resDate.ok).toBe(resIso.ok);
      expect(resDate.conflicts.length).toBe(resIso.conflicts.length);
      expect(resDate.conflicts[0].message).toBe(resIso.conflicts[0].message);
    });
  });

  describe("Rule 6: Blocked Dates check", () => {
    it("BLOCKS task if it falls within a student's blocked date range", () => {
      const task = {
        startAt: new Date("2026-12-15T09:00:00.000Z"),
        dueAt: new Date("2026-12-15T12:00:00.000Z"),
        estHours: 3,
      };

      const blockedDates = [
        {
          dateStart: new Date("2026-12-14T00:00:00.000Z"),
          dateEnd: new Date("2026-12-18T23:59:59.000Z"),
          reason: "Final Exams Week",
        },
      ];

      const result = checkConflict(task, [], [], [], 4, {
        studentName: "Juan",
        blockedDates,
      });

      expect(result.ok).toBe(false);
      const blockedConflict = result.conflicts.find((c) => c.type === "BLOCKED_DATE");
      expect(blockedConflict).toBeDefined();
      expect(blockedConflict?.severity).toBe("BLOCK");
      expect(blockedConflict?.message).toContain("Final Exams Week");
    });
  });

  describe("Multiple simultaneous conflicts", () => {
    it("correctly lists both class overlap and outside availability", () => {
      // 1:00 PM - 2:00 PM has class AND is outside 6:00 PM - 9:00 PM availability
      const task = {
        startAt: MONDAY_1PM_MANILA_UTC,
        dueAt: MONDAY_2PM_MANILA_UTC,
        estHours: 1,
      };

      const result = checkConflict(task, juanClasses, juanAvailability, [], 4);

      expect(result.ok).toBe(false); // Hard blocked
      expect(result.hasWarnings).toBe(true);
      expect(result.conflicts.some((c) => c.type === "CLASS_OVERLAP")).toBe(true);
      expect(result.conflicts.some((c) => c.type === "OUTSIDE_AVAILABILITY")).toBe(true);
    });
  });
});

