import { z } from "zod";

export const updateStudentProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    school: z
      .string()
      .trim()
      .min(2, "School name must be at least 2 characters")
      .max(120, "School name is too long"),
    course: z
      .string()
      .trim()
      .min(2, "Course must be at least 2 characters")
      .max(120, "Course name is too long"),
    year: z.coerce
      .number()
      .int("Year level must be a whole number")
      .min(1, "Year level must be between 1 and 6")
      .max(6, "Year level must be between 1 and 6"),
    maxHoursPerDay: z.coerce
      .number()
      .min(1, "Max hours per day must be at least 1 hour")
      .max(12, "Max hours per day cannot exceed 12 hours"),
    currentPassword: z.string().optional().or(z.literal("")),
    newPassword: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      // If new password is provided, current password is required
      if (data.newPassword && data.newPassword.length > 0) {
        return !!data.currentPassword && data.currentPassword.length > 0;
      }
      return true;
    },
    {
      message: "Current password is required to set a new password",
      path: ["currentPassword"],
    },
  )
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword.length > 0) {
        return data.newPassword.length >= 8;
      }
      return true;
    },
    {
      message: "New password must be at least 8 characters",
      path: ["newPassword"],
    },
  )
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword.length > 0) {
        return data.newPassword === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    },
  );

export type UpdateStudentProfileInput = z.infer<typeof updateStudentProfileSchema>;

export const updateClientProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    currentPassword: z.string().optional().or(z.literal("")),
    newPassword: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword.length > 0) {
        return !!data.currentPassword && data.currentPassword.length > 0;
      }
      return true;
    },
    {
      message: "Current password is required to set a new password",
      path: ["currentPassword"],
    },
  )
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword.length > 0) {
        return data.newPassword.length >= 8;
      }
      return true;
    },
    {
      message: "New password must be at least 8 characters",
      path: ["newPassword"],
    },
  )
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword.length > 0) {
        return data.newPassword === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    },
  );

export type UpdateClientProfileInput = z.infer<typeof updateClientProfileSchema>;

