import { describe, it, expect } from "vitest";
import {
  createTaskSchema,
  updateTaskStatusSchema,
  studentTaskResponseSchema,
} from "./task";

describe("task validation schemas", () => {
  describe("createTaskSchema", () => {
    it("accepts valid task data", () => {
      const valid = {
        title: "Build landing page wireframe",
        description: "Follow Linear-style minimal guidelines.",
        startAt: "2026-11-16T09:00:00.000Z",
        dueAt: "2026-11-16T12:00:00.000Z",
        estHours: 3,
      };

      const res = createTaskSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("rejects title shorter than 2 characters", () => {
      const invalid = {
        title: "A",
        startAt: "2026-11-16T09:00:00.000Z",
        dueAt: "2026-11-16T12:00:00.000Z",
        estHours: 3,
      };

      const res = createTaskSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });

    it("rejects dueAt before or equal to startAt", () => {
      const invalid = {
        title: "Valid title",
        startAt: "2026-11-16T12:00:00.000Z",
        dueAt: "2026-11-16T09:00:00.000Z",
        estHours: 2,
      };

      const res = createTaskSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("must be after start time");
      }
    });

    it("rejects invalid estHours (< 0.25 or > 24)", () => {
      expect(
        createTaskSchema.safeParse({
          title: "Test",
          startAt: "2026-11-16T09:00:00.000Z",
          dueAt: "2026-11-16T10:00:00.000Z",
          estHours: 0,
        }).success
      ).toBe(false);

      expect(
        createTaskSchema.safeParse({
          title: "Test",
          startAt: "2026-11-16T09:00:00.000Z",
          dueAt: "2026-11-16T10:00:00.000Z",
          estHours: 25,
        }).success
      ).toBe(false);
    });
  });

  describe("updateTaskStatusSchema", () => {
    it("accepts TODO, DOING, and DONE", () => {
      expect(
        updateTaskStatusSchema.safeParse({ taskId: "t-1", status: "TODO" }).success
      ).toBe(true);
      expect(
        updateTaskStatusSchema.safeParse({ taskId: "t-1", status: "DOING" }).success
      ).toBe(true);
      expect(
        updateTaskStatusSchema.safeParse({ taskId: "t-1", status: "DONE" }).success
      ).toBe(true);
    });

    it("rejects unknown statuses", () => {
      expect(
        updateTaskStatusSchema.safeParse({ taskId: "t-1", status: "CANCELLED" }).success
      ).toBe(false);
    });
  });

  describe("studentTaskResponseSchema", () => {
    it("accepts ACCEPTED without reason", () => {
      const res = studentTaskResponseSchema.safeParse({
        taskId: "t-1",
        response: "ACCEPTED",
      });
      expect(res.success).toBe(true);
    });

    it("accepts RESCHEDULE_REQUESTED with a valid reason", () => {
      const res = studentTaskResponseSchema.safeParse({
        taskId: "t-1",
        response: "RESCHEDULE_REQUESTED",
        rescheduleReason: "I have an unscheduled laboratory exam at this time.",
      });
      expect(res.success).toBe(true);
    });

    it("rejects RESCHEDULE_REQUESTED if reason is missing", () => {
      const res = studentTaskResponseSchema.safeParse({
        taskId: "t-1",
        response: "RESCHEDULE_REQUESTED",
        rescheduleReason: "",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("reason is required");
      }
    });
  });
});

