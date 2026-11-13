"use server";

import { verifyApiRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  timeInSchema,
  timeOutSchema,
  correctionRequestSchema,
} from "@/lib/validations/time";
import {
  timeIn,
  timeOut,
  requestCorrection,
} from "@/lib/services/time-service";
import { toUserErrorMessage, formatZodFieldErrors } from "@/lib/errors";
import type { ActionResult } from "./profile";

/**
 * Server action to Time In for a task.
 * Enforces single-open-log rule and student authorization.
 */
export async function timeInAction(
  rawData: unknown
): Promise<ActionResult<{ id: string }>> {
  const authCheck = await verifyApiRole(Role.STUDENT);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const parsed = timeInSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please select a task to time in.",
    };
  }

  try {
    const created = await timeIn(authCheck.user.id, parsed.data.taskId);

    revalidatePath("/student/time");
    revalidatePath("/student/tasks");
    revalidatePath("/student");

    return { success: true, data: { id: created.id } };
  } catch (err: unknown) {
    return { success: false, error: toUserErrorMessage(err) };
  }
}

/**
 * Server action to Time Out and compute logged hours.
 */
export async function timeOutAction(
  rawData: unknown
): Promise<ActionResult<{ id: string; totalHours: number }>> {
  const authCheck = await verifyApiRole(Role.STUDENT);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const parsed = timeOutSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid time out request.",
    };
  }

  try {
    const updated = await timeOut(
      authCheck.user.id,
      parsed.data.timeLogId,
      parsed.data.notes
    );

    revalidatePath("/student/time");
    revalidatePath("/student/tasks");
    revalidatePath("/student");
    revalidatePath("/student/earnings");

    return {
      success: true,
      data: { id: updated.id, totalHours: updated.totalHours ?? 0 },
    };
  } catch (err: unknown) {
    return { success: false, error: toUserErrorMessage(err) };
  }
}

/**
 * Server action to request a time out correction for a closed log.
 */
export async function requestCorrectionAction(
  rawData: unknown
): Promise<ActionResult<{ id: string }>> {
  const authCheck = await verifyApiRole(Role.STUDENT);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const parsed = correctionRequestSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix correction errors.",
      fieldErrors: formatZodFieldErrors(parsed.error),
    };
  }

  try {
    const updated = await requestCorrection(authCheck.user.id, parsed.data);

    revalidatePath("/student/time");

    return { success: true, data: { id: updated.id } };
  } catch (err: unknown) {
    return { success: false, error: toUserErrorMessage(err) };
  }
}

