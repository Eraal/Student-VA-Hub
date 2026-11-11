import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  studentRegisterSchema,
  clientRegisterSchema,
} from "./auth";

describe("Auth Validation Schemas", () => {
  describe("loginSchema", () => {
    it("accepts valid email and password", () => {
      const res = loginSchema.safeParse({
        email: "juan@example.com",
        password: "password123",
      });
      expect(res.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const res = loginSchema.safeParse({
        email: "not-an-email",
        password: "password123",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("valid email");
      }
    });

    it("rejects short password (< 8 chars)", () => {
      const res = loginSchema.safeParse({
        email: "juan@example.com",
        password: "12345",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("at least 8 characters");
      }
    });
  });

  describe("studentRegisterSchema", () => {
    it("accepts valid student data", () => {
      const res = studentRegisterSchema.safeParse({
        role: "STUDENT",
        name: "Juan Dela Cruz",
        email: "juan2@example.com",
        password: "password123",
        school: "UP Diliman",
        course: "BS Computer Science",
        year: 3,
      });
      expect(res.success).toBe(true);
    });

    it("coerces string year to number", () => {
      const res = studentRegisterSchema.safeParse({
        role: "STUDENT",
        name: "Juan Dela Cruz",
        email: "juan2@example.com",
        password: "password123",
        school: "UP Diliman",
        course: "BS Computer Science",
        year: "2",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.year).toBe(2);
      }
    });

    it("rejects year out of range (< 1 or > 6)", () => {
      const resLow = studentRegisterSchema.safeParse({
        role: "STUDENT",
        name: "Juan",
        email: "juan@example.com",
        password: "password123",
        school: "UP",
        course: "BS",
        year: 0,
      });
      expect(resLow.success).toBe(false);

      const resHigh = studentRegisterSchema.safeParse({
        role: "STUDENT",
        name: "Juan",
        email: "juan@example.com",
        password: "password123",
        school: "UP",
        course: "BS",
        year: 7,
      });
      expect(resHigh.success).toBe(false);
    });

    it("rejects missing student fields", () => {
      const res = studentRegisterSchema.safeParse({
        role: "STUDENT",
        name: "Juan",
        email: "juan@example.com",
        password: "password123",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("clientRegisterSchema", () => {
    it("accepts valid client data", () => {
      const res = clientRegisterSchema.safeParse({
        role: "CLIENT",
        name: "Maria Santos",
        email: "maria2@example.com",
        password: "password123",
      });
      expect(res.success).toBe(true);
    });

    it("rejects client data missing name or email", () => {
      const res = clientRegisterSchema.safeParse({
        role: "CLIENT",
        password: "password123",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("registerSchema discriminated union", () => {
    it("correctly parses student branch", () => {
      const res = registerSchema.safeParse({
        role: "STUDENT",
        name: "Pedro",
        email: "pedro@example.com",
        password: "password123",
        school: "Ateneo",
        course: "BS ME",
        year: 4,
      });
      expect(res.success).toBe(true);
    });

    it("correctly parses client branch", () => {
      const res = registerSchema.safeParse({
        role: "CLIENT",
        name: "Mr. Boss",
        email: "boss@example.com",
        password: "password123",
      });
      expect(res.success).toBe(true);
    });

    it("rejects invalid role", () => {
      const res = registerSchema.safeParse({
        role: "TEACHER",
        name: "Mr. Boss",
        email: "boss@example.com",
        password: "password123",
      });
      expect(res.success).toBe(false);
    });
  });
});
