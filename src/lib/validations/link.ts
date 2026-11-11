import { z } from "zod";

export const linkStudentSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .length(8, "Invite code must be exactly 8 characters"),
  hourlyRate: z.coerce
    .number()
    .positive("Hourly rate must be greater than 0")
    .max(50000, "Hourly rate is unusually high"),
});

export type LinkStudentInput = z.infer<typeof linkStudentSchema>;

export const updateHourlyRateSchema = z.object({
  hourlyRate: z.coerce
    .number()
    .positive("Hourly rate must be greater than 0")
    .max(50000, "Hourly rate is unusually high"),
});

export type UpdateHourlyRateInput = z.infer<typeof updateHourlyRateSchema>;
