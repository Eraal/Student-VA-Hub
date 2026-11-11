import { describe, it, expect } from "vitest";
import { linkStudentSchema, updateHourlyRateSchema } from "./link";

describe("Link validation schemas", () => {
  describe("linkStudentSchema", () => {
    it("accepts valid 8-character invite code and positive rate", () => {
      const res = linkStudentSchema.safeParse({
        code: "EDMAXNXY",
        hourlyRate: 150,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.code).toBe("EDMAXNXY");
        expect(res.data.hourlyRate).toBe(150);
      }
    });

    it("uppercases lowercase invite codes", () => {
      const res = linkStudentSchema.safeParse({
        code: "edmaxnxy",
        hourlyRate: 200,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.code).toBe("EDMAXNXY");
      }
    });

    it("rejects codes that are not 8 characters", () => {
      const short = linkStudentSchema.safeParse({
        code: "SHORT",
        hourlyRate: 150,
      });
      expect(short.success).toBe(false);

      const long = linkStudentSchema.safeParse({
        code: "TOOLONGCODE",
        hourlyRate: 150,
      });
      expect(long.success).toBe(false);
    });

    it("rejects zero or negative hourly rate", () => {
      const zero = linkStudentSchema.safeParse({
        code: "EDMAXNXY",
        hourlyRate: 0,
      });
      expect(zero.success).toBe(false);

      const negative = linkStudentSchema.safeParse({
        code: "EDMAXNXY",
        hourlyRate: -50,
      });
      expect(negative.success).toBe(false);
    });
  });

  describe("updateHourlyRateSchema", () => {
    it("accepts positive rate", () => {
      const res = updateHourlyRateSchema.safeParse({
        hourlyRate: "250.50",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.hourlyRate).toBe(250.5);
      }
    });

    it("rejects non-positive rate", () => {
      const res = updateHourlyRateSchema.safeParse({
        hourlyRate: 0,
      });
      expect(res.success).toBe(false);
    });
  });
});
