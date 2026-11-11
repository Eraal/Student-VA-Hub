"use server";

import { verifyApiRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import {
  updateStudentProfileSchema,
  updateClientProfileSchema,
} from "@/lib/validations/profile";
import { updateUserProfile } from "@/lib/services/invite-service";

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
};

/**
 * Server action to update a student's profile & settings (including password change).
 * Enforces STUDENT role check and Zod validation.
 */
export async function updateStudentProfileAction(
  rawData: unknown,
): Promise<ActionResult<{ name: string; email: string }>> {
  const authCheck = await verifyApiRole(Role.STUDENT);
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error };
  }

  const parsed = updateStudentProfileSchema.safeParse(rawData);
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
      error: "Please correct the form errors.",
      fieldErrors,
    };
  }

  const res = await updateUserProfile(
    authCheck.user.id,
    Role.STUDENT,
    parsed.data,
  );
  if (!res.success) {
    return { success: false, error: res.error };
  }

  return { success: true, data: res.data };
}

/**
 * Server action to update a client's profile & settings (including password change).
 * Enforces CLIENT role check and Zod validation.
 */
export async function updateClientProfileAction(
  rawData: unknown,
): Promise<ActionResult<{ name: string; email: string }>> {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error };
  }

  const parsed = updateClientProfileSchema.safeParse(rawData);
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
      error: "Please correct the form errors.",
      fieldErrors,
    };
  }

  const res = await updateUserProfile(
    authCheck.user.id,
    Role.CLIENT,
    parsed.data,
  );
  if (!res.success) {
    return { success: false, error: res.error };
  }

  return { success: true, data: res.data };
}

