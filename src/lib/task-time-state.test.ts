import { describe, it, expect } from "vitest";
import { TaskStatus, StudentResponse } from "@prisma/client";
import {
  getTaskTimeActionState,
  formatElapsedDuration,
  formatTaskLoggedHours,
} from "./task-time-state";

describe("task-time-state — button state and time tracking logic", () => {
  const baseTask = {
    id: "task-101",
    status: TaskStatus.DOING,
    studentResponse: StudentResponse.ACCEPTED,
  };

  describe("getTaskTimeActionState", () => {
    it("returns NONE when task is DONE regardless of active log", () => {
      const doneTask = {
        id: "task-done",
        status: TaskStatus.DONE,
        studentResponse: StudentResponse.ACCEPTED,
      };

      const resultWithoutLog = getTaskTimeActionState(doneTask, null);
      expect(resultWithoutLog).toEqual({ type: "NONE" });

      const resultWithLog = getTaskTimeActionState(doneTask, {
        id: "log-1",
        taskId: "task-done",
        timeIn: new Date(),
      });
      expect(resultWithLog).toEqual({ type: "NONE" });
    });

    it("returns NONE when task response is pending (null)", () => {
      const pendingTask = {
        id: "task-pending",
        status: TaskStatus.TODO,
        studentResponse: null,
      };

      const result = getTaskTimeActionState(pendingTask, null);
      expect(result).toEqual({ type: "NONE" });
    });

    it("returns NONE when task response is RESCHEDULE_REQUESTED", () => {
      const rescheduleTask = {
        id: "task-resched",
        status: TaskStatus.TODO,
        studentResponse: StudentResponse.RESCHEDULE_REQUESTED,
      };

      const result = getTaskTimeActionState(rescheduleTask, null);
      expect(result).toEqual({ type: "NONE" });
    });

    it("returns CAN_TIME_IN when accepted and no active session exists", () => {
      const result = getTaskTimeActionState(baseTask, null);
      expect(result).toEqual({
        type: "CAN_TIME_IN",
        href: "/student/time?taskId=task-101",
      });
    });

    it("returns RUNNING for the task that owns the active time log", () => {
      const timeIn = new Date("2026-11-13T10:00:00Z");
      const now = new Date("2026-11-13T10:25:00Z"); // 25 minutes elapsed

      const activeLog = {
        id: "log-active-1",
        taskId: "task-101",
        timeIn,
      };

      const result = getTaskTimeActionState(baseTask, activeLog, now);
      expect(result).toEqual({
        type: "RUNNING",
        elapsedFormatted: "25m",
        activeLogId: "log-active-1",
      });
    });

    it("returns BLOCKED_BY_OTHER_SESSION with explanation for every other task while a session is open", () => {
      const activeLogForOther = {
        id: "log-other",
        taskId: "task-999", // running on a different task
        timeIn: new Date(),
      };

      const result = getTaskTimeActionState(baseTask, activeLogForOther);
      expect(result).toEqual({
        type: "BLOCKED_BY_OTHER_SESSION",
        reason: "Finish your current session first",
      });
    });
  });

  describe("formatElapsedDuration", () => {
    it("formats seconds when elapsed is under 1 minute", () => {
      const timeIn = new Date("2026-11-13T12:00:00Z");
      const now = new Date("2026-11-13T12:00:45Z");
      expect(formatElapsedDuration(timeIn, now)).toBe("45s");
    });

    it("formats minutes when elapsed is between 1 minute and 1 hour", () => {
      const timeIn = new Date("2026-11-13T12:00:00Z");
      const now = new Date("2026-11-13T12:18:30Z");
      expect(formatElapsedDuration(timeIn, now)).toBe("18m");
    });

    it("formats hours and minutes when elapsed is 1 hour or more", () => {
      const timeIn = new Date("2026-11-13T10:00:00Z");
      const now = new Date("2026-11-13T12:35:00Z");
      expect(formatElapsedDuration(timeIn, now)).toBe("2h 35m");
    });
  });

  describe("formatTaskLoggedHours", () => {
    it("appends '(running)' when session is active on the task", () => {
      const formatted = formatTaskLoggedHours(1, 3, true);
      expect(formatted.text).toBe("1h of 3h logged (running)");
      expect(formatted.isRunning).toBe(true);
    });

    it("shows clean logged hours without '(running)' when no session is active on the task", () => {
      const formatted = formatTaskLoggedHours(1, 3, false);
      expect(formatted.text).toBe("1h of 3h logged");
      expect(formatted.isRunning).toBe(false);
    });

    it("handles decimal hours correctly", () => {
      const formatted = formatTaskLoggedHours(1.5, 4, true);
      expect(formatted.text).toBe("1h 30m of 4h logged (running)");
    });
  });
});

