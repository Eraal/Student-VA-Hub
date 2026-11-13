import { describe, it, expect } from "vitest";
import {
  minutesToTimeString,
  timeStringToMinutes,
  minutesToDurationString,
  convertTo24Hour,
  intervalsOverlap,
  getDayName,
  DAYS_ORDER_ACADEMIC,
} from "./schedule-utils";

describe("schedule-utils", () => {
  describe("getDayName", () => {
    it("returns correct day name in full and short form", () => {
      expect(getDayName(0)).toBe("Sunday");
      expect(getDayName(0, true)).toBe("Sun");
      expect(getDayName(1)).toBe("Monday");
      expect(getDayName(1, true)).toBe("Mon");
      expect(getDayName(6)).toBe("Saturday");
      expect(getDayName(6, true)).toBe("Sat");
      expect(getDayName(99)).toBe("Unknown");
    });

    it("verifies academic order starts with Monday and ends with Sunday", () => {
      expect(DAYS_ORDER_ACADEMIC[0].name).toBe("Monday");
      expect(DAYS_ORDER_ACADEMIC[6].name).toBe("Sunday");
      expect(DAYS_ORDER_ACADEMIC.length).toBe(7);
    });
  });

  describe("minutesToTimeString", () => {
    it("formats minutes to 12-hour AM/PM string correctly", () => {
      expect(minutesToTimeString(0)).toBe("12:00 AM");
      expect(minutesToTimeString(540)).toBe("9:00 AM");
      expect(minutesToTimeString(600)).toBe("10:00 AM");
      expect(minutesToTimeString(720)).toBe("12:00 PM");
      expect(minutesToTimeString(780)).toBe("1:00 PM");
      expect(minutesToTimeString(810)).toBe("1:30 PM");
      expect(minutesToTimeString(1260)).toBe("9:00 PM");
      expect(minutesToTimeString(1439)).toBe("11:59 PM");
    });

    it("formats minutes to 24-hour HH:mm string when requested", () => {
      expect(minutesToTimeString(0, true)).toBe("00:00");
      expect(minutesToTimeString(540, true)).toBe("09:00");
      expect(minutesToTimeString(780, true)).toBe("13:00");
      expect(minutesToTimeString(810, true)).toBe("13:30");
      expect(minutesToTimeString(1439, true)).toBe("23:59");
    });

    it("clamps out-of-range minutes", () => {
      expect(minutesToTimeString(-10)).toBe("12:00 AM");
      expect(minutesToTimeString(1600)).toBe("11:59 PM");
    });
  });

  describe("timeStringToMinutes", () => {
    it("converts 24-hour HH:mm string to minutes", () => {
      expect(timeStringToMinutes("00:00")).toBe(0);
      expect(timeStringToMinutes("09:00")).toBe(540);
      expect(timeStringToMinutes("13:00")).toBe(780);
      expect(timeStringToMinutes("13:30")).toBe(810);
      expect(timeStringToMinutes("23:59")).toBe(1439);
    });

    it("throws error for invalid format or numbers", () => {
      expect(() => timeStringToMinutes("invalid")).toThrow();
      expect(() => timeStringToMinutes("25:00")).toThrow();
      expect(() => timeStringToMinutes("12:65")).toThrow();
      expect(() => timeStringToMinutes("-01:00")).toThrow();
    });
  });

  describe("convertTo24Hour", () => {
    it("converts 12-hour PM strings to 24-hour HH:mm format", () => {
      expect(convertTo24Hour("6:00 PM")).toBe("18:00");
      expect(convertTo24Hour("06:00 PM")).toBe("18:00");
      expect(convertTo24Hour("1:30 PM")).toBe("13:30");
      expect(convertTo24Hour("11:45 PM")).toBe("23:45");
      expect(convertTo24Hour("12:00 PM")).toBe("12:00");
      expect(convertTo24Hour("12:30 PM")).toBe("12:30");
    });

    it("converts 12-hour AM strings to 24-hour HH:mm format", () => {
      expect(convertTo24Hour("12:00 AM")).toBe("00:00");
      expect(convertTo24Hour("12:15 AM")).toBe("00:15");
      expect(convertTo24Hour("8:00 AM")).toBe("08:00");
      expect(convertTo24Hour("09:30 AM")).toBe("09:30");
      expect(convertTo24Hour("11:59 AM")).toBe("11:59");
    });

    it("leaves 24-hour HH:mm strings untouched or pads single-digit hour", () => {
      expect(convertTo24Hour("18:00")).toBe("18:00");
      expect(convertTo24Hour("09:00")).toBe("09:00");
      expect(convertTo24Hour("9:00")).toBe("09:00");
      expect(convertTo24Hour("00:00")).toBe("00:00");
      expect(convertTo24Hour("23:59")).toBe("23:59");
    });

    it("handles whitespace or empty/invalid inputs gracefully", () => {
      expect(convertTo24Hour("  6:00 PM  ")).toBe("18:00");
      expect(convertTo24Hour("")).toBe("");
      expect(convertTo24Hour("invalid")).toBe("invalid");
    });
  });

  describe("minutesToDurationString", () => {
    it("formats durations into human-readable strings", () => {
      expect(minutesToDurationString(60)).toBe("1 hr");
      expect(minutesToDurationString(120)).toBe("2 hrs");
      expect(minutesToDurationString(90)).toBe("1 hr 30 mins");
      expect(minutesToDurationString(45)).toBe("45 mins");
      expect(minutesToDurationString(0)).toBe("0 mins");
    });
  });

  describe("intervalsOverlap", () => {
    it("detects overlapping intervals correctly", () => {
      // Complete overlap
      expect(intervalsOverlap(540, 600, 540, 600)).toBe(true);
      // Partial overlap (first starts earlier)
      expect(intervalsOverlap(540, 630, 600, 700)).toBe(true);
      // Contained inside
      expect(intervalsOverlap(500, 700, 540, 600)).toBe(true);
      // Adjacent intervals do NOT overlap (e.g. 9-10 and 10-11)
      expect(intervalsOverlap(540, 600, 600, 660)).toBe(false);
      // Completely disjoint
      expect(intervalsOverlap(540, 600, 700, 800)).toBe(false);
    });
  });
});

