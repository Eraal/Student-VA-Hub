"use server";

import { verifyApiRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { linkStudentSchema, updateHourlyRateSchema } from "@/lib/validations/link";
import {
  linkStudentToClient,
  getClientLinkedStudent,
  updateClientHourlyRate,
} from "@/lib/services/invite-service";
import { ActionResult } from "@/lib/actions/profile";

/**
 * Server action for a client to link a student by invite code and set hourly rate.
 * Enforces CLIENT role check and Zod validation.
 */
export async function linkStudentAction(
  rawData: unknown,
): Promise<ActionResult<{ studentName: string; hourlyRate: number }>> {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error };
  }

  const parsed = linkStudentSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field && typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return {
      success: false,
      error: "Please enter a valid 8-character code and positive hourly rate.",
      fieldErrors,
    };
  }

  const res = await linkStudentToClient(
    authCheck.user.id,
    parsed.data.code,
    parsed.data.hourlyRate,
  );

  if (!res.success) {
    return { success: false, error: res.error };
  }

  return { success: true, data: res.data };
}

/**
 * Server action to update the hourly rate for the linked student.
 * Enforces CLIENT role check and Zod validation.
 */
export async function updateHourlyRateAction(
  rawData: unknown,
): Promise<ActionResult<{ hourlyRate: number }>> {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error };
  }

  const parsed = updateHourlyRateSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Hourly rate must be a positive number.",
    };
  }

  const res = await updateClientHourlyRate(
    authCheck.user.id,
    parsed.data.hourlyRate,
  );

  if (!res.success) {
    return { success: false, error: res.error };
  }

  return { success: true, data: res.data };
}

/**
 * Server action to fetch the linked student for the authenticated client.
 * Enforces CLIENT role check.
 */
export async function getClientLinkAction() {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error };
  }

  const link = await getClientLinkedStudent(authCheck.user.id);
  return {
    success: true,
    data: link,
  };
}

