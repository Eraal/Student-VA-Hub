import { describe, it, expect } from "vitest";
import { timeInSchema, timeOutSchema, correctionRequestSchema } from "./time";

describe("time validation schemas", () => {
  describe("timeInSchema", () => {
    it("accepts valid taskId", () => {
      expect(timeInSchema.safeParse({ taskId: "task-123" }).success).toBe(true);
    });

    it("rejects empty taskId", () => {
      expect(timeInSchema.safeParse({ taskId: "" }).success).toBe(false);
    });
  });

  describe("timeOutSchema", () => {
    it("accepts valid timeLogId with optional notes", () => {
      expect(
        timeOutSchema.safeParse({
          timeLogId: "log-1",
          notes: "Finished creating wireframe slides.",
        }).success
      ).toBe(true);

      expect(timeOutSchema.safeParse({ timeLogId: "log-1" }).success).toBe(true);
    });

    it("rejects missing timeLogId", () => {
      expect(timeOutSchema.safeParse({ timeLogId: "" }).success).toBe(false);
    });
  });

  describe("correctionRequestSchema", () => {
    it("accepts valid correction request", () => {
      expect(
        correctionRequestSchema.safeParse({
          timeLogId: "log-1",
          requestedTimeOut: "2026-11-16T13:00:00.000Z",
          correctionNote: "I forgot to press Time Out before going to dinner.",
        }).success
      ).toBe(true);
    });

    it("rejects explanation shorter than 5 chars", () => {
      expect(
        correctionRequestSchema.safeParse({
          timeLogId: "log-1",
          requestedTimeOut: "2026-11-16T13:00:00.000Z",
          correctionNote: "oops",
        }).success
      ).toBe(false);
    });
  });
});
