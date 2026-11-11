import { describe, it, expect, beforeEach } from "vitest";
import { registerUser, validateCredentials } from "./user-service";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

describe("user-service", () => {
  const testStudentEmail = "test.student@example.com";
  const testClientEmail = "test.client@example.com";

  beforeEach(async () => {
    // Clean up test records
    await prisma.studentProfile.deleteMany({
      where: { user: { email: { in: [testStudentEmail, testClientEmail] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testStudentEmail, testClientEmail] } },
    });
  });

  describe("registerUser", () => {
    it("successfully registers a student with profile and hashed password", async () => {
      const res = await registerUser({
        role: Role.STUDENT,
        name: "Test Student",
        email: testStudentEmail,
        password: "password123",
        school: "UP Diliman",
        course: "BS Computer Science",
        year: 2,
      });

      expect(res.success).toBe(true);
      expect(res.data?.email).toBe(testStudentEmail);
      expect(res.data?.role).toBe(Role.STUDENT);

      // Verify in database
      const user = await prisma.user.findUnique({
        where: { email: testStudentEmail },
        include: { studentProfile: true },
      });

      expect(user).not.toBeNull();
      expect(user?.role).toBe(Role.STUDENT);
      expect(user?.studentProfile).not.toBeNull();
      expect(user?.studentProfile?.school).toBe("UP Diliman");
      expect(user?.studentProfile?.course).toBe("BS Computer Science");
      expect(user?.studentProfile?.year).toBe(2);

      // Verify password was hashed with bcrypt
      const isMatch = await bcrypt.compare("password123", user!.passwordHash);
      expect(isMatch).toBe(true);
      expect(user!.passwordHash).not.toBe("password123");
    });

    it("successfully registers a client without student profile", async () => {
      const res = await registerUser({
        role: Role.CLIENT,
        name: "Test Client",
        email: testClientEmail,
        password: "password123",
      });

      expect(res.success).toBe(true);
      expect(res.data?.email).toBe(testClientEmail);
      expect(res.data?.role).toBe(Role.CLIENT);

      // Verify in database
      const user = await prisma.user.findUnique({
        where: { email: testClientEmail },
        include: { studentProfile: true },
      });

      expect(user).not.toBeNull();
      expect(user?.role).toBe(Role.CLIENT);
      expect(user?.studentProfile).toBeNull();
    });

    it("rejects duplicate email with a clear error message", async () => {
      // First registration
      const first = await registerUser({
        role: Role.STUDENT,
        name: "First Student",
        email: testStudentEmail,
        password: "password123",
        school: "Ateneo",
        course: "BS MIS",
        year: 3,
      });
      expect(first.success).toBe(true);

      // Second registration with duplicate email
      const second = await registerUser({
        role: Role.CLIENT,
        name: "Second User",
        email: testStudentEmail,
        password: "password123",
      });

      expect(second.success).toBe(false);
      expect(second.error).toContain("already exists");
      expect(second.fieldErrors?.email).toContain("already exists");
    });

    it("rejects invalid input data via Zod validation", async () => {
      const res = await registerUser({
        role: Role.STUDENT,
        name: "A",
        email: "not-an-email",
        password: "short",
        school: "",
        course: "",
        year: 10,
      });

      expect(res.success).toBe(false);
      expect(res.fieldErrors).toBeDefined();
      expect(res.fieldErrors?.email).toBeDefined();
      expect(res.fieldErrors?.password).toBeDefined();
      expect(res.fieldErrors?.year).toBeDefined();
    });
  });

  describe("validateCredentials", () => {
    it("validates seeded demo student credentials correctly", async () => {
      const user = await validateCredentials("juan@example.com", "demo1234");
      expect(user).not.toBeNull();
      expect(user?.email).toBe("juan@example.com");
      expect(user?.role).toBe(Role.STUDENT);
    });

    it("validates seeded demo client credentials correctly", async () => {
      const user = await validateCredentials("maria@example.com", "demo1234");
      expect(user).not.toBeNull();
      expect(user?.email).toBe("maria@example.com");
      expect(user?.role).toBe(Role.CLIENT);
    });

    it("rejects incorrect password", async () => {
      const user = await validateCredentials("juan@example.com", "wrongpassword");
      expect(user).toBeNull();
    });

    it("rejects non-existent email", async () => {
      const user = await validateCredentials("nonexistent@example.com", "demo1234");
      expect(user).toBeNull();
    });
  });
});

