"use server";

import { verifyApiRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import {
  generateNewInviteCode,
  getStudentInviteDetails,
} from "@/lib/services/invite-service";
import { ActionResult } from "@/lib/actions/profile";

/**
 * Server action to generate a fresh invite code for the authenticated student.
 * Enforces STUDENT role check.
 */
export async function generateStudentInviteCodeAction(): Promise<
  ActionResult<{ code: string }>
> {
  const authCheck = await verifyApiRole(Role.STUDENT);
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error };
  }

  try {
    const newRecord = await generateNewInviteCode(authCheck.user.id);
    return {
      success: true,
      data: { code: newRecord.code },
    };
  } catch (err) {
    console.error("Error generating invite code:", err);
    return {
      success: false,
      error: "Failed to generate a new invite code. Please try again.",
    };
  }
}

/**
 * Server action to fetch current invite code details and linked client for student.
 * Enforces STUDENT role check.
 */
export async function getStudentInviteDetailsAction() {
  const authCheck = await verifyApiRole(Role.STUDENT);
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error };
  }

  const details = await getStudentInviteDetails(authCheck.user.id);
  return {
    success: true,
    data: details,
  };
}
