import { z } from "zod";

/**
 * Zod schema for Student Time In.
 */
export const timeInSchema = z.object({
  taskId: z.string().min(1, "Please select a task to track time for."),
});

export type TimeInInput = z.infer<typeof timeInSchema>;

/**
 * Zod schema for Student Time Out.
 */
export const timeOutSchema = z.object({
  timeLogId: z.string().min(1, "Active time log ID is required."),
  notes: z
    .string()
    .trim()
    .max(500, "Notes cannot exceed 500 characters.")
    .optional()
    .or(z.literal("")),
});

export type TimeOutInput = z.infer<typeof timeOutSchema>;

/**
 * Zod schema for requesting a time log correction.
 */
export const correctionRequestSchema = z.object({
  timeLogId: z.string().min(1, "Time log ID is required."),
  requestedTimeOut: z.string().min(1, "Requested time out is required."),
  correctionNote: z
    .string()
    .trim()
    .min(5, "Please provide an explanation for the correction (at least 5 characters).")
    .max(300, "Explanation cannot exceed 300 characters."),
});

export type CorrectionRequestInput = z.infer<typeof correctionRequestSchema>;

