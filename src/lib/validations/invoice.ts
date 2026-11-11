import { z } from "zod";

/**
 * Schema for approving a student's logged hours.
 */
export const approveTimeLogSchema = z.object({
  timeLogId: z.string().min(1, "Time log ID is required."),
});

export type ApproveTimeLogInput = z.infer<typeof approveTimeLogSchema>;

/**
 * Schema for disputing a student's logged hours.
 */
export const disputeTimeLogSchema = z.object({
  timeLogId: z.string().min(1, "Time log ID is required."),
  disputeReason: z
    .string()
    .trim()
    .min(5, "Dispute reason must be at least 5 characters.")
    .max(300, "Dispute reason cannot exceed 300 characters."),
});

export type DisputeTimeLogInput = z.infer<typeof disputeTimeLogSchema>;

/**
 * Schema for client responding to a student's time correction request.
 */
export const respondCorrectionSchema = z.object({
  timeLogId: z.string().min(1, "Time log ID is required."),
  decision: z.enum(["APPROVE", "REJECT"]),
});

export type RespondCorrectionInput = z.infer<typeof respondCorrectionSchema>;

/**
 * Schema for marking an invoice as PAID.
 */
export const markInvoicePaidSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required."),
});

export type MarkInvoicePaidInput = z.infer<typeof markInvoicePaidSchema>;

