import { describe, it, expect } from "vitest";
import {
  classScheduleInputSchema,
  classScheduleUpdateSchema,
  availabilityInputSchema,
  maxHoursInputSchema,
  blockedDateInputSchema,
} from "./schedule";

describe("schedule validation schemas", () => {
  describe("classScheduleInputSchema", () => {
    it("accepts valid class input", () => {
      const valid = {
        subject: "Math 101",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:30",
      };
      const res = classScheduleInputSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("rejects empty subject", () => {
      const invalid = {
        subject: "   ",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
      };
      const res = classScheduleInputSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("Subject name is required");
      }
    });

    it("rejects dayOfWeek out of bounds", () => {
      const res1 = classScheduleInputSchema.safeParse({
        subject: "CS 201",
        dayOfWeek: -1,
        startTime: "09:00",
        endTime: "10:00",
      });
      expect(res1.success).toBe(false);

      const res2 = classScheduleInputSchema.safeParse({
        subject: "CS 201",
        dayOfWeek: 7,
        startTime: "09:00",
        endTime: "10:00",
      });
      expect(res2.success).toBe(false);
    });

    it("rejects invalid time formats", () => {
      const res = classScheduleInputSchema.safeParse({
        subject: "Physics",
        dayOfWeek: 2,
        startTime: "9am",
        endTime: "10:00",
      });
      expect(res.success).toBe(false);
    });

    it("rejects endTime earlier or equal to startTime", () => {
      const resEqual = classScheduleInputSchema.safeParse({
        subject: "Physics",
        dayOfWeek: 2,
        startTime: "10:00",
        endTime: "10:00",
      });
      expect(resEqual.success).toBe(false);

      const resEarlier = classScheduleInputSchema.safeParse({
        subject: "Physics",
        dayOfWeek: 2,
        startTime: "11:00",
        endTime: "10:00",
      });
      expect(resEarlier.success).toBe(false);
      if (!resEarlier.success) {
        expect(resEarlier.error.issues[0].message).toContain("End time must be later");
      }
    });
  });

  describe("classScheduleUpdateSchema", () => {
    it("requires an id along with valid fields", () => {
      const valid = {
        id: "class-123",
        subject: "Math 101",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
      };
      expect(classScheduleUpdateSchema.safeParse(valid).success).toBe(true);

      const missingId = {
        subject: "Math 101",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
      };
      expect(classScheduleUpdateSchema.safeParse(missingId).success).toBe(false);
    });
  });

  describe("availabilityInputSchema", () => {
    it("accepts valid availability window", () => {
      const valid = {
        dayOfWeek: 3,
        startTime: "18:00",
        endTime: "21:00",
      };
      expect(availabilityInputSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects invalid availability time span", () => {
      const invalid = {
        dayOfWeek: 3,
        startTime: "21:00",
        endTime: "18:00",
      };
      expect(availabilityInputSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("maxHoursInputSchema", () => {
    it("accepts valid max hours between 0.5 and 16", () => {
      expect(maxHoursInputSchema.safeParse({ maxHoursPerDay: 4 }).success).toBe(true);
      expect(maxHoursInputSchema.safeParse({ maxHoursPerDay: 0.5 }).success).toBe(true);
      expect(maxHoursInputSchema.safeParse({ maxHoursPerDay: 16 }).success).toBe(true);
    });

    it("rejects below 0.5 or above 16", () => {
      expect(maxHoursInputSchema.safeParse({ maxHoursPerDay: 0 }).success).toBe(false);
      expect(maxHoursInputSchema.safeParse({ maxHoursPerDay: 20 }).success).toBe(false);
    });
  });

  describe("blockedDateInputSchema", () => {
    it("accepts valid blocked date interval", () => {
      const valid = {
        dateStart: "2026-11-15T00:00:00.000Z",
        dateEnd: "2026-11-18T00:00:00.000Z",
        reason: "Midterm examinations",
      };
      expect(blockedDateInputSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects end date before start date", () => {
      const invalid = {
        dateStart: "2026-11-20T00:00:00.000Z",
        dateEnd: "2026-11-18T00:00:00.000Z",
        reason: "Invalid range",
      };
      expect(blockedDateInputSchema.safeParse(invalid).success).toBe(false);
    });
  });
});
