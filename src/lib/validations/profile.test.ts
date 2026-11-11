import { describe, it, expect } from "vitest";
import { updateStudentProfileSchema, updateClientProfileSchema } from "./profile";

describe("Profile validation schemas", () => {
  describe("updateStudentProfileSchema", () => {
    it("accepts valid student profile updates without password change", () => {
      const res = updateStudentProfileSchema.safeParse({
        name: "Juan Dela Cruz",
        email: "juan@example.com",
        school: "UP Diliman",
        course: "BS Computer Science",
        year: 3,
        maxHoursPerDay: 4,
      });
      expect(res.success).toBe(true);
    });

    it("accepts valid student profile updates with matching password change", () => {
      const res = updateStudentProfileSchema.safeParse({
        name: "Juan Dela Cruz",
        email: "juan@example.com",
        school: "UP Diliman",
        course: "BS Computer Science",
        year: 3,
        maxHoursPerDay: 5,
        currentPassword: "demo1234",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      });
      expect(res.success).toBe(true);
    });

    it("rejects password change if current password is missing", () => {
      const res = updateStudentProfileSchema.safeParse({
        name: "Juan Dela Cruz",
        email: "juan@example.com",
        school: "UP Diliman",
        course: "BS Computer Science",
        year: 3,
        maxHoursPerDay: 4,
        currentPassword: "",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].path).toContain("currentPassword");
      }
    });

    it("rejects password change if passwords do not match", () => {
      const res = updateStudentProfileSchema.safeParse({
        name: "Juan Dela Cruz",
        email: "juan@example.com",
        school: "UP Diliman",
        course: "BS Computer Science",
        year: 3,
        maxHoursPerDay: 4,
        currentPassword: "demo1234",
        newPassword: "newpassword123",
        confirmPassword: "differentpassword",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].path).toContain("confirmPassword");
      }
    });

    it("rejects new password under 8 characters", () => {
      const res = updateStudentProfileSchema.safeParse({
        name: "Juan Dela Cruz",
        email: "juan@example.com",
        school: "UP Diliman",
        course: "BS Computer Science",
        year: 3,
        maxHoursPerDay: 4,
        currentPassword: "demo1234",
        newPassword: "short",
        confirmPassword: "short",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("updateClientProfileSchema", () => {
    it("accepts valid client profile updates without password change", () => {
      const res = updateClientProfileSchema.safeParse({
        name: "Maria Santos",
        email: "maria@example.com",
      });
      expect(res.success).toBe(true);
    });

    it("accepts valid client profile updates with password change", () => {
      const res = updateClientProfileSchema.safeParse({
        name: "Maria Santos",
        email: "maria@example.com",
        currentPassword: "demo1234",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      });
      expect(res.success).toBe(true);
    });
  });
});

