import { describe, it, expect } from "vitest";
import {
  getOpenSlots,
  getDayCapacity,
  suggestSlots,
  getNextFreeWindow,
} from "./open-slots";
import {
  checkConflict,
  ClassScheduleItem,
  AvailabilityWindow,
  ExistingTaskItem,
  BlockedDateItem,
} from "./conflict";

describe("open-slots engine (SPEC §6 & Acceptance Tests §10)", () => {
  // Reference Dates: Monday, Nov 16, 2026 (Asia/Manila is UTC+8)
  // Monday 00:00 Manila = Sunday 16:00 UTC (2026-11-15T16:00:00.000Z)
  // Monday 12:00 PM Manila = Monday 04:00 UTC (2026-11-16T04:00:00.000Z)
  // Monday 1:00 PM Manila = Monday 05:00 UTC (2026-11-16T05:00:00.000Z) - 780 mins
  // Monday 2:00 PM Manila = Monday 06:00 UTC (2026-11-16T06:00:00.000Z) - 840 mins
  // Monday 3:00 PM Manila = Monday 07:00 UTC (2026-11-16T07:00:00.000Z) - 900 mins
  // Monday 6:00 PM Manila = Monday 10:00 UTC (2026-11-16T10:00:00.000Z) - 1080 mins
  // Monday 6:30 PM Manila = Monday 10:30 UTC (2026-11-16T10:30:00.000Z) - 1110 mins
  // Monday 7:00 PM Manila = Monday 11:00 UTC (2026-11-16T11:00:00.000Z) - 1140 mins
  // Monday 7:30 PM Manila = Monday 11:30 UTC (2026-11-16T11:30:00.000Z) - 1170 mins
  // Monday 8:00 PM Manila = Monday 12:00 UTC (2026-11-16T12:00:00.000Z) - 1200 mins
  // Monday 9:00 PM Manila = Monday 13:00 UTC (2026-11-16T13:00:00.000Z) - 1260 mins
  // Monday 10:00 PM Manila = Monday 14:00 UTC (2026-11-16T14:00:00.000Z) - 1320 mins
  // Monday 24:00 Manila (Tuesday 00:00) = Monday 16:00 UTC (2026-11-16T16:00:00.000Z)
  // Tuesday 2:00 AM Manila = Monday 18:00 UTC (2026-11-16T18:00:00.000Z) - 120 mins

  const MONDAY_START_UTC = new Date("2026-11-15T16:00:00.000Z"); // Mon 00:00 Manila
  const MONDAY_END_UTC = new Date("2026-11-16T16:00:00.000Z");   // Mon 24:00 Manila
  const MONDAY_6PM_UTC = new Date("2026-11-16T10:00:00.000Z");   // Mon 18:00 Manila
  const MONDAY_7PM_UTC = new Date("2026-11-16T11:00:00.000Z");   // Mon 19:00 Manila
  const MONDAY_8PM_UTC = new Date("2026-11-16T12:00:00.000Z");   // Mon 20:00 Manila
  const MONDAY_9PM_UTC = new Date("2026-11-16T13:00:00.000Z");   // Mon 21:00 Manila

  // 1. No availability returns []
  describe("no availability returns []", () => {
    it("returns empty array when availability list is empty", () => {
      const slots = getOpenSlots({
        from: MONDAY_START_UTC,
        to: MONDAY_END_UTC,
        classes: [],
        availability: [],
        now: MONDAY_START_UTC,
      });

      expect(slots).toEqual([]);
    });

    it("returns empty array when no availability matches the day in range", () => {
      const slots = getOpenSlots({
        from: MONDAY_START_UTC,
        to: MONDAY_END_UTC,
        classes: [],
        availability: [
          // Availability only on Sunday (0) and Wednesday (3)
          { dayOfWeek: 0, startMinutes: 600, endMinutes: 720 },
          { dayOfWeek: 3, startMinutes: 600, endMinutes: 720 },
        ],
        now: MONDAY_START_UTC,
      });

      expect(slots).toEqual([]);
    });
  });

  // 2. A class in the middle splits a window in two
  describe("a class in the middle splits a window in two", () => {
    it("splits an availability window into two open slots around a class", () => {
      // Availability: Monday 18:00 to 21:00 (1080 to 1260 mins, 3 hours)
      const availability: AvailabilityWindow[] = [
        { dayOfWeek: 1, startMinutes: 1080, endMinutes: 1260 },
      ];

      // Class in middle: Monday 19:00 to 20:00 (1140 to 1200 mins, 1 hour)
      const classes: ClassScheduleItem[] = [
        { dayOfWeek: 1, startMinutes: 1140, endMinutes: 1200, subject: "Math" },
      ];

      const slots = getOpenSlots({
        from: MONDAY_START_UTC,
        to: MONDAY_END_UTC,
        classes,
        availability,
        now: MONDAY_START_UTC,
      });

      expect(slots).toHaveLength(2);

      // Slot 1: 18:00 - 19:00 Manila (10:00 - 11:00 UTC) = 60 mins
      expect(slots[0].start.toISOString()).toBe("2026-11-16T10:00:00.000Z");
      expect(slots[0].end.toISOString()).toBe("2026-11-16T11:00:00.000Z");
      expect(slots[0].minutes).toBe(60);

      // Slot 2: 20:00 - 21:00 Manila (12:00 - 13:00 UTC) = 60 mins
      expect(slots[1].start.toISOString()).toBe("2026-11-16T12:00:00.000Z");
      expect(slots[1].end.toISOString()).toBe("2026-11-16T13:00:00.000Z");
      expect(slots[1].minutes).toBe(60);
    });
  });

  // 3. A class exactly at the window edge leaves no sliver
  describe("a class exactly at the window edge leaves no sliver", () => {
    const availability: AvailabilityWindow[] = [
      { dayOfWeek: 1, startMinutes: 1080, endMinutes: 1260 }, // 18:00 - 21:00 (3h)
    ];

    it("leaves no sliver when class is at the start edge (18:00 - 19:00)", () => {
      const classes: ClassScheduleItem[] = [
        { dayOfWeek: 1, startMinutes: 1080, endMinutes: 1140 }, // 18:00 - 19:00
      ];

      const slots = getOpenSlots({
        from: MONDAY_START_UTC,
        to: MONDAY_END_UTC,
        classes,
        availability,
        now: MONDAY_START_UTC,
      });

      expect(slots).toHaveLength(1);
      expect(slots[0].start.toISOString()).toBe("2026-11-16T11:00:00.000Z"); // 19:00 Manila
      expect(slots[0].end.toISOString()).toBe("2026-11-16T13:00:00.000Z");   // 21:00 Manila
      expect(slots[0].minutes).toBe(120);
    });

    it("leaves no sliver when class is at the end edge (20:00 - 21:00)", () => {
      const classes: ClassScheduleItem[] = [
        { dayOfWeek: 1, startMinutes: 1200, endMinutes: 1260 }, // 20:00 - 21:00
      ];

      const slots = getOpenSlots({
        from: MONDAY_START_UTC,
        to: MONDAY_END_UTC,
        classes,
        availability,
        now: MONDAY_START_UTC,
      });

      expect(slots).toHaveLength(1);
      expect(slots[0].start.toISOString()).toBe("2026-11-16T10:00:00.000Z"); // 18:00 Manila
      expect(slots[0].end.toISOString()).toBe("2026-11-16T12:00:00.000Z");   // 20:00 Manila
      expect(slots[0].minutes).toBe(120);
    });

    it("does not overlap and leaves window untouched when class touches left edge (17:00 - 18:00)", () => {
      const classes: ClassScheduleItem[] = [
        { dayOfWeek: 1, startMinutes: 1020, endMinutes: 1080 }, // 17:00 - 18:00
      ];

      const slots = getOpenSlots({
        from: MONDAY_START_UTC,
        to: MONDAY_END_UTC,
        classes,
        availability,
        now: MONDAY_START_UTC,
      });

      expect(slots).toHaveLength(1);
      expect(slots[0].start.toISOString()).toBe("2026-11-16T10:00:00.000Z"); // 18:00 Manila
      expect(slots[0].end.toISOString()).toBe("2026-11-16T13:00:00.000Z");   // 21:00 Manila
      expect(slots[0].minutes).toBe(180);
    });

    it("does not overlap and leaves window untouched when class touches right edge (21:00 - 22:00)", () => {
      const classes: ClassScheduleItem[] = [
        { dayOfWeek: 1, startMinutes: 1260, endMinutes: 1320 }, // 21:00 - 22:00
      ];

      const slots = getOpenSlots({
        from: MONDAY_START_UTC,
        to: MONDAY_END_UTC,
        classes,
        availability,
        now: MONDAY_START_UTC,
      });

      expect(slots).toHaveLength(1);
      expect(slots[0].start.toISOString()).toBe("2026-11-16T10:00:00.000Z"); // 18:00 Manila
      expect(slots[0].end.toISOString()).toBe("2026-11-16T13:00:00.000Z");   // 21:00 Manila
      expect(slots[0].minutes).toBe(180);
    });
  });

  // 4. A blocked date removes the whole day
  describe("a blocked date removes the whole day", () => {
    it("completely removes all slots for a blocked date", () => {
      // Wednesday, Nov 18, 2026 (dayOfWeek: 3)
      const WEDNESDAY_START_UTC = new Date("2026-11-17T16:00:00.000Z"); // Wed 00:00 Manila
      const WEDNESDAY_END_UTC = new Date("2026-11-18T16:00:00.000Z");   // Wed 24:00 Manila

      const availability: AvailabilityWindow[] = [
        { dayOfWeek: 3, startMinutes: 1080, endMinutes: 1260 }, // Wed 18:00 - 21:00
      ];

      const blockedDates: BlockedDateItem[] = [
        {
          dateStart: new Date("2026-11-18T00:00:00.000Z"),
          dateEnd: new Date("2026-11-18T23:59:59.000Z"),
          reason: "University Holiday",
        },
      ];

      const slots = getOpenSlots({
        from: WEDNESDAY_START_UTC,
        to: WEDNESDAY_END_UTC,
        classes: [],
        availability,
        blockedDates,
        now: WEDNESDAY_START_UTC,
      });

      // The whole day is removed!
      expect(slots).toEqual([]);
    });
  });

  // 5. An existing task removes its time
  describe("an existing task removes its time", () => {
    it("subtracts an active task from availability window", () => {
      const availability: AvailabilityWindow[] = [
        { dayOfWeek: 1, startMinutes: 1080, endMinutes: 1260 }, // Mon 18:00 - 21:00
      ];

      // Active task from 18:30 to 19:30 Manila (10:30 to 11:30 UTC)
      const existingTasks: ExistingTaskItem[] = [
        {
          id: "task-1",
          startAt: new Date("2026-11-16T10:30:00.000Z"),
          dueAt: new Date("2026-11-16T11:30:00.000Z"),
          estHours: 1,
          status: "TODO",
        },
      ];

      const slots = getOpenSlots({
        from: MONDAY_START_UTC,
        to: MONDAY_END_UTC,
        classes: [],
        availability,
        existingTasks,
        now: MONDAY_START_UTC,
      });

      expect(slots).toHaveLength(2);
      // Slot 1: 18:00 - 18:30 (30 mins)
      expect(slots[0].start.toISOString()).toBe("2026-11-16T10:00:00.000Z");
      expect(slots[0].end.toISOString()).toBe("2026-11-16T10:30:00.000Z");
      expect(slots[0].minutes).toBe(30);

      // Slot 2: 19:30 - 21:00 (90 mins)
      expect(slots[1].start.toISOString()).toBe("2026-11-16T11:30:00.000Z");
      expect(slots[1].end.toISOString()).toBe("2026-11-16T13:00:00.000Z");
      expect(slots[1].minutes).toBe(90);
    });

    it("ignores completed tasks (status === DONE)", () => {
      const availability: AvailabilityWindow[] = [
        { dayOfWeek: 1, startMinutes: 1080, endMinutes: 1260 },
      ];

      const existingTasks: ExistingTaskItem[] = [
        {
          id: "task-done",
          startAt: new Date("2026-11-16T10:30:00.000Z"),
          dueAt: new Date("2026-11-16T11:30:00.000Z"),
          estHours: 1,
          status: "DONE",
        },
      ];

      const slots = getOpenSlots({
        from: MONDAY_START_UTC,
        to: MONDAY_END_UTC,
        classes: [],
        availability,
        existingTasks,
        now: MONDAY_START_UTC,
      });

      expect(slots).toHaveLength(1);
      expect(slots[0].minutes).toBe(180);
    });
  });

  // 6. Remaining capacity (4h max with 3h assigned leaves 1h and a 2h suggestion is not offered that day)
  describe("remaining capacity (4h max with 3h assigned leaves 1h and a 2h suggestion is not offered that day)", () => {
    it("correctly calculates day capacity", () => {
      const task3h: ExistingTaskItem = {
        id: "task-3h",
        startAt: new Date("2026-11-16T06:00:00.000Z"), // 14:00 Manila
        dueAt: new Date("2026-11-16T09:00:00.000Z"),   // 17:00 Manila
        estHours: 3,
        status: "TODO",
      };

      const capacity = getDayCapacity({
        day: new Date("2026-11-16T06:00:00.000Z"),
        maxHoursPerDay: 4,
        existingTasks: [task3h],
      });

      expect(capacity.maxHours).toBe(4);
      expect(capacity.assignedHours).toBe(3);
      expect(capacity.remainingHours).toBe(1);
    });

    it("does not offer a 2h suggestion when remaining capacity is only 1h", () => {
      // 5h window (17:00 - 22:00) so window hours (5) >= maxHoursPerDay (4)
      const availability: AvailabilityWindow[] = [
        { dayOfWeek: 1, startMinutes: 1020, endMinutes: 1320 }, // 17:00 - 22:00
      ];

      const task3h: ExistingTaskItem = {
        id: "task-3h",
        startAt: new Date("2026-11-16T06:00:00.000Z"), // 14:00 Manila (earlier in day)
        dueAt: new Date("2026-11-16T09:00:00.000Z"),   // 17:00 Manila
        estHours: 3,
        status: "TODO",
      };

      // 2h suggestion requested: remaining capacity is 1h, so 2h is NOT offered
      const suggestions2h = suggestSlots({
        from: MONDAY_START_UTC,
        to: MONDAY_END_UTC,
        classes: [],
        availability,
        existingTasks: [task3h],
        now: MONDAY_START_UTC,
        estHours: 2,
        maxHoursPerDay: 4,
      });

      expect(suggestions2h).toEqual([]);

      // 1h suggestion requested: remaining capacity is 1h >= 1h, so it IS offered
      const suggestions1h = suggestSlots({
        from: MONDAY_START_UTC,
        to: MONDAY_END_UTC,
        classes: [],
        availability,
        existingTasks: [task3h],
        now: MONDAY_START_UTC,
        estHours: 1,
        maxHoursPerDay: 4,
      });

      expect(suggestions1h.length).toBeGreaterThan(0);
      expect(suggestions1h[0].minutes).toBe(60);
    });
  });

  // 7. Past slots are dropped
  describe("past slots are dropped", () => {
    it("cuts off any slot portions before now", () => {
      const availability: AvailabilityWindow[] = [
        { dayOfWeek: 1, startMinutes: 1080, endMinutes: 1260 }, // Mon 18:00 - 21:00
      ];

      // now is Monday 19:15 Manila (11:15 UTC)
      const now1915 = new Date("2026-11-16T11:15:00.000Z");

      const slots = getOpenSlots({
        from: MONDAY_START_UTC,
        to: MONDAY_END_UTC,
        classes: [],
        availability,
        now: now1915,
      });

      expect(slots).toHaveLength(1);
      // Cut off at 19:15, ends at 21:00 (105 minutes)
      expect(slots[0].start.toISOString()).toBe("2026-11-16T11:15:00.000Z");
      expect(slots[0].end.toISOString()).toBe("2026-11-16T13:00:00.000Z");
      expect(slots[0].minutes).toBe(105);
    });

    it("drops entire window if it ended before now", () => {
      const availability: AvailabilityWindow[] = [
        { dayOfWeek: 1, startMinutes: 1080, endMinutes: 1260 }, // Mon 18:00 - 21:00
      ];

      // now is Monday 21:30 Manila (13:30 UTC)
      const now2130 = new Date("2026-11-16T13:30:00.000Z");

      const slots = getOpenSlots({
        from: MONDAY_START_UTC,
        to: MONDAY_END_UTC,
        classes: [],
        availability,
        now: now2130,
      });

      expect(slots).toEqual([]);
    });
  });

  // 8. A window crossing midnight is split
  describe("a window crossing midnight is split", () => {
    it("splits a window crossing midnight into two slots at Asia/Manila midnight", () => {
      // Monday 22:00 to Tuesday 02:00 (1320 mins to 120 mins)
      const availability: AvailabilityWindow[] = [
        { dayOfWeek: 1, startMinutes: 1320, endMinutes: 120 },
      ];

      const fromRange = new Date("2026-11-16T12:00:00.000Z"); // Mon 20:00 Manila
      const toRange = new Date("2026-11-16T20:00:00.000Z");   // Tue 04:00 Manila

      const slots = getOpenSlots({
        from: fromRange,
        to: toRange,
        classes: [],
        availability,
        now: fromRange,
      });

      expect(slots).toHaveLength(2);

      // Slot 1: Monday 22:00 - 24:00 Manila (14:00 - 16:00 UTC) = 120 mins
      expect(slots[0].start.toISOString()).toBe("2026-11-16T14:00:00.000Z");
      expect(slots[0].end.toISOString()).toBe("2026-11-16T16:00:00.000Z");
      expect(slots[0].minutes).toBe(120);

      // Slot 2: Tuesday 00:00 - 02:00 Manila (16:00 - 18:00 UTC) = 120 mins
      expect(slots[1].start.toISOString()).toBe("2026-11-16T16:00:00.000Z");
      expect(slots[1].end.toISOString()).toBe("2026-11-16T18:00:00.000Z");
      expect(slots[1].minutes).toBe(120);
    });

    it("splits a window with endMinutes > 1440 at midnight", () => {
      // Monday 22:00 to 26:00 (1320 to 1560 mins)
      const availability: AvailabilityWindow[] = [
        { dayOfWeek: 1, startMinutes: 1320, endMinutes: 1560 },
      ];

      const fromRange = new Date("2026-11-16T12:00:00.000Z");
      const toRange = new Date("2026-11-16T20:00:00.000Z");

      const slots = getOpenSlots({
        from: fromRange,
        to: toRange,
        classes: [],
        availability,
        now: fromRange,
      });

      expect(slots).toHaveLength(2);
      expect(slots[0].start.toISOString()).toBe("2026-11-16T14:00:00.000Z");
      expect(slots[0].end.toISOString()).toBe("2026-11-16T16:00:00.000Z");
      expect(slots[1].start.toISOString()).toBe("2026-11-16T16:00:00.000Z");
      expect(slots[1].end.toISOString()).toBe("2026-11-16T18:00:00.000Z");
    });
  });

  // 9. Asia/Manila vs UTC inputs give the same result (acceptance test 12)
  describe("Asia/Manila vs UTC inputs give the same result (acceptance test 12)", () => {
    it("yields identical slot arrays regardless of timezone notation in string/date inputs", () => {
      const availability: AvailabilityWindow[] = [
        { dayOfWeek: 1, startMinutes: 1080, endMinutes: 1260 }, // 18:00 - 21:00
      ];

      // Input using Asia/Manila offset (+08:00)
      const resManila = getOpenSlots({
        from: "2026-11-16T18:00:00+08:00",
        to: "2026-11-16T21:00:00+08:00",
        classes: [],
        availability,
        now: "2026-11-16T17:00:00+08:00",
      });

      // Input using UTC representation (Z)
      const resUtc = getOpenSlots({
        from: "2026-11-16T10:00:00.000Z",
        to: "2026-11-16T13:00:00.000Z",
        classes: [],
        availability,
        now: "2026-11-16T09:00:00.000Z",
      });

      // Input using Date objects
      const resDate = getOpenSlots({
        from: new Date("2026-11-16T10:00:00.000Z"),
        to: new Date("2026-11-16T13:00:00.000Z"),
        classes: [],
        availability,
        now: new Date("2026-11-16T09:00:00.000Z"),
      });

      expect(resManila.length).toBe(resUtc.length);
      expect(resManila.length).toBe(resDate.length);

      expect(resManila[0].start.getTime()).toBe(resUtc[0].start.getTime());
      expect(resManila[0].end.getTime()).toBe(resUtc[0].end.getTime());
      expect(resManila[0].minutes).toBe(resUtc[0].minutes);

      expect(resDate[0].start.getTime()).toBe(resUtc[0].start.getTime());
      expect(resDate[0].end.getTime()).toBe(resUtc[0].end.getTime());
      expect(resDate[0].minutes).toBe(resUtc[0].minutes);
    });
  });

  // 10. Every suggestion passes checkConflict
  describe("every suggestion passes checkConflict", () => {
    it("guarantees every suggested slot passes checkConflict with ok === true and no warnings", () => {
      const juanClasses: ClassScheduleItem[] = [
        { dayOfWeek: 1, startMinutes: 780, endMinutes: 840, subject: "Algorithms" }, // Mon 13:00-14:00
      ];

      const juanAvailability: AvailabilityWindow[] = [
        { dayOfWeek: 1, startMinutes: 1080, endMinutes: 1260 }, // Mon 18:00-21:00
        { dayOfWeek: 2, startMinutes: 1080, endMinutes: 1260 }, // Tue 18:00-21:00
      ];

      const blockedDates: BlockedDateItem[] = [
        {
          dateStart: new Date("2026-11-18T00:00:00.000Z"),
          dateEnd: new Date("2026-11-18T23:59:59.000Z"),
          reason: "Exams",
        },
      ];

      const existingTasks: ExistingTaskItem[] = [
        {
          id: "task-prev",
          startAt: new Date("2026-11-16T10:00:00.000Z"), // Mon 18:00 - 18:30 Manila
          dueAt: new Date("2026-11-16T10:30:00.000Z"),
          estHours: 0.5,
          status: "TODO",
        },
      ];

      const from = new Date("2026-11-15T16:00:00.000Z"); // Mon 00:00 Manila
      const to = new Date("2026-11-18T16:00:00.000Z");   // Wed 24:00 Manila
      const now = new Date("2026-11-15T16:00:00.000Z");

      const suggestions = suggestSlots({
        from,
        to,
        classes: juanClasses,
        availability: juanAvailability,
        blockedDates,
        existingTasks,
        now,
        estHours: 1.5,
        count: 4,
        maxPerDay: 2,
        maxHoursPerDay: 4,
        studentName: "Juan",
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(4);

      // Verify every single suggestion through real checkConflict
      for (const s of suggestions) {
        const conflictCheck = checkConflict(
          {
            startAt: s.start,
            dueAt: s.end,
            estHours: s.minutes / 60,
          },
          juanClasses,
          juanAvailability,
          existingTasks,
          4,
          {
            studentName: "Juan",
            blockedDates,
          }
        );

        expect(conflictCheck.ok).toBe(true);
        expect(conflictCheck.hasWarnings).toBe(false);
        expect(conflictCheck.conflicts).toHaveLength(0);
      }
    });
  });

  // 11. A slot overlapping Monday 1:00-2:00 PM class never appears in slots or suggestions (acceptance tests 1 and 2)
  describe("a slot overlapping Monday 1:00-2:00 PM class never appears in slots or suggestions (acceptance tests 1 and 2)", () => {
    const mondayClass1to2PM: ClassScheduleItem[] = [
      {
        dayOfWeek: 1,
        startMinutes: 780, // 1:00 PM (13:00)
        endMinutes: 840,   // 2:00 PM (14:00)
        subject: "Confidential Subject",
      },
    ];

    // Wide availability window enclosing the class: 12:00 PM to 3:00 PM (720 to 900 mins)
    const wideAvailability: AvailabilityWindow[] = [
      { dayOfWeek: 1, startMinutes: 720, endMinutes: 900 },
    ];

    it("never includes the 1:00-2:00 PM interval in getOpenSlots", () => {
      const slots = getOpenSlots({
        from: MONDAY_START_UTC,
        to: MONDAY_END_UTC,
        classes: mondayClass1to2PM,
        availability: wideAvailability,
        now: MONDAY_START_UTC,
      });

      expect(slots).toHaveLength(2);

      // Slot 1: 12:00 PM to 1:00 PM Manila (04:00 to 05:00 UTC)
      expect(slots[0].start.toISOString()).toBe("2026-11-16T04:00:00.000Z");
      expect(slots[0].end.toISOString()).toBe("2026-11-16T05:00:00.000Z");
      expect(slots[0].minutes).toBe(60);

      // Slot 2: 2:00 PM to 3:00 PM Manila (06:00 to 07:00 UTC)
      expect(slots[1].start.toISOString()).toBe("2026-11-16T06:00:00.000Z");
      expect(slots[1].end.toISOString()).toBe("2026-11-16T07:00:00.000Z");
      expect(slots[1].minutes).toBe(60);

      // Class interval: 05:00 to 06:00 UTC
      const classStartMs = new Date("2026-11-16T05:00:00.000Z").getTime();
      const classEndMs = new Date("2026-11-16T06:00:00.000Z").getTime();

      for (const slot of slots) {
        const overlaps =
          slot.start.getTime() < classEndMs && slot.end.getTime() > classStartMs;
        expect(overlaps).toBe(false);
      }
    });

    it("never suggests any slot overlapping Monday 1:00-2:00 PM", () => {
      const suggestions = suggestSlots({
        from: MONDAY_START_UTC,
        to: MONDAY_END_UTC,
        classes: mondayClass1to2PM,
        availability: wideAvailability,
        now: MONDAY_START_UTC,
        estHours: 1,
        count: 4,
        maxPerDay: 2,
        maxHoursPerDay: 4,
      });

      const classStartMs = new Date("2026-11-16T05:00:00.000Z").getTime();
      const classEndMs = new Date("2026-11-16T06:00:00.000Z").getTime();

      expect(suggestions.length).toBeGreaterThan(0);

      for (const suggestion of suggestions) {
        const overlaps =
          suggestion.start.getTime() < classEndMs &&
          suggestion.end.getTime() > classStartMs;
        expect(overlaps).toBe(false);
      }
    });
  });

  // 12. getNextFreeWindow
  describe("getNextFreeWindow", () => {
    it("returns the first open slot from now", () => {
      const availability: AvailabilityWindow[] = [
        { dayOfWeek: 1, startMinutes: 1080, endMinutes: 1260 }, // Mon 18:00 - 21:00
      ];

      const nextWindow = getNextFreeWindow({
        classes: [],
        availability,
        now: "2026-11-16T10:15:00.000Z", // Mon 18:15 Manila
      });

      expect(nextWindow).not.toBeNull();
      expect(nextWindow?.start.toISOString()).toBe("2026-11-16T10:15:00.000Z");
      expect(nextWindow?.end.toISOString()).toBe("2026-11-16T13:00:00.000Z");
      expect(nextWindow?.minutes).toBe(165);
    });

    it("returns null when there are no open slots", () => {
      const nextWindow = getNextFreeWindow({
        classes: [],
        availability: [],
        now: MONDAY_START_UTC,
      });

      expect(nextWindow).toBeNull();
    });
  });
});
