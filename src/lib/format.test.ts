import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatTime,
  formatTimeRange,
  formatDateTime,
  formatDateRange,
  formatRelative,
  formatHours,
  formatPeso,
  formatDuration,
  FALLBACK_DASH,
} from "./format";

describe("Central Format Layer (format.ts)", () => {
  // Known reference: 2026-11-11T05:00:00.000Z in UTC is 2026-11-11 13:00:00 (1:00 PM) in Asia/Manila (+08:00)
  const KNOWN_UTC = "2026-11-11T05:00:00.000Z";

  describe("formatDate", () => {
    it("formats known UTC input in Asia/Manila time", () => {
      expect(formatDate(KNOWN_UTC)).toBe("Wed, Nov 11");
    });

    it("handles null, undefined, empty string and invalid dates with an em dash", () => {
      expect(formatDate(null)).toBe(FALLBACK_DASH);
      expect(formatDate(undefined)).toBe(FALLBACK_DASH);
      expect(formatDate("")).toBe(FALLBACK_DASH);
      expect(formatDate("invalid-date-string")).toBe(FALLBACK_DASH);
    });
  });

  describe("formatTime", () => {
    it("converts UTC time to Asia/Manila local time correctly", () => {
      expect(formatTime(KNOWN_UTC)).toBe("1:00 PM");
    });

    it("handles null, undefined and invalid dates with an em dash", () => {
      expect(formatTime(null)).toBe(FALLBACK_DASH);
      expect(formatTime(undefined)).toBe(FALLBACK_DASH);
      expect(formatTime("bad-time")).toBe(FALLBACK_DASH);
    });
  });

  describe("formatTimeRange", () => {
    it("formats start and end times in Asia/Manila", () => {
      const start = "2026-11-11T05:00:00.000Z"; // 1:00 PM Manila
      const end = "2026-11-11T06:30:00.000Z";   // 2:30 PM Manila
      expect(formatTimeRange(start, end)).toBe("1:00 PM – 2:30 PM");
    });

    it("handles missing values gracefully", () => {
      expect(formatTimeRange(null, null)).toBe(FALLBACK_DASH);
      expect(formatTimeRange(KNOWN_UTC, null)).toBe("1:00 PM");
    });
  });

  describe("formatDateTime", () => {
    it("formats combined date and time in Asia/Manila", () => {
      expect(formatDateTime(KNOWN_UTC)).toBe("Wed, Nov 11, 1:00 PM");
    });

    it("handles null and invalid values", () => {
      expect(formatDateTime(null)).toBe(FALLBACK_DASH);
    });
  });

  describe("formatDateRange", () => {
    it("formats multi-day ranges cleanly", () => {
      const start = "2026-11-11T00:00:00.000Z";
      const end = "2026-11-15T00:00:00.000Z";
      expect(formatDateRange(start, end)).toBe("Nov 11 – Nov 15, 2026");
    });

    it("formats same-day ranges as single date", () => {
      const start = "2026-11-11T01:00:00.000Z";
      const end = "2026-11-11T08:00:00.000Z";
      expect(formatDateRange(start, end)).toBe("Nov 11, 2026");
    });

    it("handles null values", () => {
      expect(formatDateRange(null, null)).toBe(FALLBACK_DASH);
    });
  });

  describe("formatRelative", () => {
    const baseNow = new Date("2026-11-11T05:00:00.000Z"); // 1:00 PM Manila

    it("formats past times in natural English", () => {
      const past45m = new Date(baseNow.getTime() - 45 * 60 * 1000);
      expect(formatRelative(past45m, baseNow)).toBe("45 min ago");

      const yesterday = new Date(baseNow.getTime() - 26 * 60 * 60 * 1000);
      expect(formatRelative(yesterday, baseNow)).toBe("yesterday");
    });

    it("formats future times in natural English", () => {
      const future45m = new Date(baseNow.getTime() + 45 * 60 * 1000);
      expect(formatRelative(future45m, baseNow)).toBe("in 45 min");

      const tomorrow = new Date(baseNow.getTime() + 26 * 60 * 60 * 1000);
      expect(formatRelative(tomorrow, baseNow)).toBe("tomorrow");
    });

    it("handles null gracefully", () => {
      expect(formatRelative(null)).toBe(FALLBACK_DASH);
    });
  });

  describe("formatHours", () => {
    it("formats fractional hours to readable English h/m format", () => {
      expect(formatHours(1.5)).toBe("1h 30m");
      expect(formatHours(2)).toBe("2h");
      expect(formatHours(0.5)).toBe("30m");
      expect(formatHours(0)).toBe("0h");
      expect(formatHours(2.5000000001)).toBe("2h 30m");
    });

    it("handles null, undefined and NaN without throwing", () => {
      expect(formatHours(null)).toBe(FALLBACK_DASH);
      expect(formatHours(undefined)).toBe(FALLBACK_DASH);
      expect(formatHours(NaN)).toBe(FALLBACK_DASH);
    });
  });

  describe("formatPeso", () => {
    it("formats currency to Philippine Peso standard", () => {
      expect(formatPeso(1250)).toBe("₱1,250.00");
      expect(formatPeso(150)).toBe("₱150.00");
      expect(formatPeso(0)).toBe("₱0.00");
    });

    it("handles null, undefined and NaN without throwing", () => {
      expect(formatPeso(null)).toBe(FALLBACK_DASH);
      expect(formatPeso(undefined)).toBe(FALLBACK_DASH);
      expect(formatPeso(NaN)).toBe(FALLBACK_DASH);
    });
  });

  describe("formatDuration", () => {
    it("formats seconds into HH:MM:SS", () => {
      expect(formatDuration(0)).toBe("00:00:00");
      expect(formatDuration(45)).toBe("00:00:45");
      expect(formatDuration(90)).toBe("00:01:30");
      expect(formatDuration(3665)).toBe("01:01:05");
    });

    it("handles null, undefined and negative numbers gracefully", () => {
      expect(formatDuration(null)).toBe("00:00:00");
      expect(formatDuration(undefined)).toBe("00:00:00");
      expect(formatDuration(-10)).toBe("00:00:00");
    });
  });
});

