"use server";

import { verifyApiRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  approveTimeLogSchema,
  disputeTimeLogSchema,
  respondCorrectionSchema,
  markInvoicePaidSchema,
} from "@/lib/validations/invoice";
import {
  approveTimeLog,
  disputeTimeLog,
  respondToCorrection,
  markInvoicePaid,
} from "@/lib/services/invoice-service";
import type { ActionResult } from "./profile";

/**
 * Server action for a client to approve a student's logged hours.
 * Automatically updates/creates an approved invoice.
 */
export async function approveTimeLogAction(
  rawData: unknown
): Promise<ActionResult<{ invoiceId: string; amount: number }>> {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const parsed = approveTimeLogSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: "Invalid time log ID." };
  }

  try {
    const res = await approveTimeLog(authCheck.user.id, parsed.data.timeLogId);

    revalidatePath("/client/timesheets");
    revalidatePath("/client");
    revalidatePath("/student/earnings");
    revalidatePath("/student/time");
    revalidatePath("/student");

    return {
      success: true,
      data: { invoiceId: res.invoice.id, amount: res.invoice.amount },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to approve hours.";
    return { success: false, error: message };
  }
}

/**
 * Server action for a client to dispute logged hours with a reason.
 */
export async function disputeTimeLogAction(
  rawData: unknown
): Promise<ActionResult> {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const parsed = disputeTimeLogSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid dispute details.",
    };
  }

  try {
    await disputeTimeLog(
      authCheck.user.id,
      parsed.data.timeLogId,
      parsed.data.disputeReason
    );

    revalidatePath("/client/timesheets");
    revalidatePath("/student/time");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to dispute hours.";
    return { success: false, error: message };
  }
}

/**
 * Server action for a client to accept or reject a student's requested time correction.
 */
export async function respondCorrectionAction(
  rawData: unknown
): Promise<ActionResult> {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const parsed = respondCorrectionSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: "Invalid correction response." };
  }

  try {
    await respondToCorrection(
      authCheck.user.id,
      parsed.data.timeLogId,
      parsed.data.decision
    );

    revalidatePath("/client/timesheets");
    revalidatePath("/student/time");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to respond to correction.";
    return { success: false, error: message };
  }
}

/**
 * Server action for a client to mark an approved invoice as PAID.
 */
export async function markInvoicePaidAction(
  rawData: unknown
): Promise<ActionResult<{ invoiceId: string }>> {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const parsed = markInvoicePaidSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: "Invalid invoice ID." };
  }

  try {
    const updated = await markInvoicePaid(authCheck.user.id, parsed.data.invoiceId);

    revalidatePath("/client/timesheets");
    revalidatePath("/student/earnings");
    revalidatePath("/student");
    revalidatePath("/client");

    return { success: true, data: { invoiceId: updated.id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to mark invoice as paid.";
    return { success: false, error: message };
  }
}
