import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

const baseUserFields = {
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
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
};

export const studentRegisterSchema = z.object({
  ...baseUserFields,
  role: z.literal("STUDENT"),
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
});

export type StudentRegisterInput = z.infer<typeof studentRegisterSchema>;

export const clientRegisterSchema = z.object({
  ...baseUserFields,
  role: z.literal("CLIENT"),
});

export type ClientRegisterInput = z.infer<typeof clientRegisterSchema>;

export const registerSchema = z.discriminatedUnion("role", [
  studentRegisterSchema,
  clientRegisterSchema,
]);

export type RegisterInput = z.infer<typeof registerSchema>;
