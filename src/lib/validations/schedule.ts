import { z } from "zod";
import { timeStringToMinutes } from "../schedule-utils";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Zod schema for adding a class schedule item.
 */
export const classScheduleInputSchema = z
  .object({
    subject: z
      .string()
      .trim()
      .min(1, "Subject name is required.")
      .max(100, "Subject name cannot exceed 100 characters."),
    dayOfWeek: z.coerce
      .number()
      .int()
      .min(0, "Day must be between 0 (Sunday) and 6 (Saturday).")
      .max(6, "Day must be between 0 (Sunday) and 6 (Saturday)."),
    startTime: z
      .string()
      .regex(TIME_REGEX, "Start time must be in HH:mm 24-hour format (e.g. 09:00)."),
    endTime: z
      .string()
      .regex(TIME_REGEX, "End time must be in HH:mm 24-hour format (e.g. 10:00)."),
  })
  .refine(
    (data) => {
      try {
        const start = timeStringToMinutes(data.startTime);
        const end = timeStringToMinutes(data.endTime);
        return end > start;
      } catch {
        return false;
      }
    },
    {
      message: "End time must be later than start time.",
      path: ["endTime"],
    }
  );

export type ClassScheduleInput = z.infer<typeof classScheduleInputSchema>;

/**
 * Zod schema for updating an existing class schedule item.
 */
export const classScheduleUpdateSchema = classScheduleInputSchema.and(
  z.object({
    id: z.string().min(1, "Class ID is required."),
  })
);

export type ClassScheduleUpdateInput = z.infer<typeof classScheduleUpdateSchema>;

/**
 * Zod schema for adding an availability window.
 */
export const availabilityInputSchema = z
  .object({
    dayOfWeek: z.coerce
      .number()
      .int()
      .min(0, "Day must be between 0 and 6.")
      .max(6, "Day must be between 0 and 6."),
    startTime: z
      .string()
      .regex(TIME_REGEX, "Start time must be in HH:mm format (e.g. 18:00)."),
    endTime: z
      .string()
      .regex(TIME_REGEX, "End time must be in HH:mm format (e.g. 21:00)."),
  })
  .refine(
    (data) => {
      try {
        const start = timeStringToMinutes(data.startTime);
        const end = timeStringToMinutes(data.endTime);
        return end > start;
      } catch {
        return false;
      }
    },
    {
      message: "End time must be later than start time.",
      path: ["endTime"],
    }
  );

export type AvailabilityInput = z.infer<typeof availabilityInputSchema>;

/**
 * Zod schema for setting daily maximum hours.
 */
export const maxHoursInputSchema = z.object({
  maxHoursPerDay: z.coerce
    .number()
    .min(0.5, "Minimum capacity is 0.5 hours per day.")
    .max(16, "Maximum capacity cannot exceed 16 hours per day."),
});

export type MaxHoursInput = z.infer<typeof maxHoursInputSchema>;

/**
 * Zod schema for adding a blocked date range.
 */
export const blockedDateInputSchema = z
  .object({
    dateStart: z.string().min(1, "Start date is required."),
    dateEnd: z.string().min(1, "End date is required."),
    reason: z
      .string()
      .trim()
      .max(200, "Reason cannot exceed 200 characters.")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      const start = new Date(data.dateStart).getTime();
      const end = new Date(data.dateEnd).getTime();
      if (isNaN(start) || isNaN(end)) return false;
      return end >= start;
    },
    {
      message: "End date must be on or after start date.",
      path: ["dateEnd"],
    }
  );

export type BlockedDateInput = z.infer<typeof blockedDateInputSchema>;
