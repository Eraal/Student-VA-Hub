"use server";

import { verifyApiRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  classScheduleInputSchema,
  classScheduleUpdateSchema,
  availabilityInputSchema,
  maxHoursInputSchema,
  blockedDateInputSchema,
} from "@/lib/validations/schedule";
import {
  addClassSchedule,
  updateClassSchedule,
  deleteClassSchedule,
  addAvailability,
  deleteAvailability,
  updateMaxHours,
  addBlockedDate,
  deleteBlockedDate,
} from "@/lib/services/schedule-service";
import { toUserErrorMessage, formatZodFieldErrors } from "@/lib/errors";
import type { ActionResult } from "./profile";

/**
 * Server action to add a class schedule item.
 */
export async function addClassAction(
  rawData: unknown
): Promise<ActionResult<{ id: string; warning: string | null }>> {
  const auth = await verifyApiRole(Role.STUDENT);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = classScheduleInputSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the schedule errors.",
      fieldErrors: formatZodFieldErrors(parsed.error),
    };
  }

  try {
    const res = await addClassSchedule(auth.user.id, parsed.data);
    revalidatePath("/student/schedule");
    revalidatePath("/student");
    return {
      success: true,
      data: { id: res.classItem.id, warning: res.warning },
    };
  } catch (err) {
    return { success: false, error: toUserErrorMessage(err) };
  }
}

/**
 * Server action to update a class schedule item.
 */
export async function updateClassAction(
  rawData: unknown
): Promise<ActionResult<{ id: string; warning: string | null }>> {
  const auth = await verifyApiRole(Role.STUDENT);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = classScheduleUpdateSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the schedule errors.",
      fieldErrors: formatZodFieldErrors(parsed.error),
    };
  }

  try {
    const res = await updateClassSchedule(auth.user.id, parsed.data);
    revalidatePath("/student/schedule");
    revalidatePath("/student");
    return {
      success: true,
      data: { id: res.classItem.id, warning: res.warning },
    };
  } catch (err) {
    return { success: false, error: toUserErrorMessage(err) };
  }
}

/**
 * Server action to delete a class schedule item.
 */
export async function deleteClassAction(classId: string): Promise<ActionResult> {
  const auth = await verifyApiRole(Role.STUDENT);
  if (!auth.ok) return { success: false, error: auth.error };

  if (!classId) return { success: false, error: "Missing class ID." };

  try {
    await deleteClassSchedule(auth.user.id, classId);
    revalidatePath("/student/schedule");
    revalidatePath("/student");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserErrorMessage(err) };
  }
}

/**
 * Server action to add an availability window.
 */
export async function addAvailabilityAction(
  rawData: unknown
): Promise<ActionResult<{ id: string }>> {
  const auth = await verifyApiRole(Role.STUDENT);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = availabilityInputSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix availability errors.",
      fieldErrors: formatZodFieldErrors(parsed.error),
    };
  }

  try {
    const created = await addAvailability(auth.user.id, parsed.data);
    revalidatePath("/student/schedule");
    revalidatePath("/student");
    return { success: true, data: { id: created.id } };
  } catch (err) {
    return { success: false, error: toUserErrorMessage(err) };
  }
}

/**
 * Server action to delete an availability window.
 */
export async function deleteAvailabilityAction(availabilityId: string): Promise<ActionResult> {
  const auth = await verifyApiRole(Role.STUDENT);
  if (!auth.ok) return { success: false, error: auth.error };

  if (!availabilityId) return { success: false, error: "Missing availability ID." };

  try {
    await deleteAvailability(auth.user.id, availabilityId);
    revalidatePath("/student/schedule");
    revalidatePath("/student");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserErrorMessage(err) };
  }
}

/**
 * Server action to update maximum daily hours.
 */
export async function updateMaxHoursAction(
  rawData: unknown
): Promise<ActionResult<{ maxHoursPerDay: number }>> {
  const auth = await verifyApiRole(Role.STUDENT);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = maxHoursInputSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid max hours." };
  }

  try {
    const updated = await updateMaxHours(auth.user.id, parsed.data.maxHoursPerDay);
    revalidatePath("/student/schedule");
    revalidatePath("/student");
    return { success: true, data: { maxHoursPerDay: updated.maxHoursPerDay } };
  } catch (err) {
    return { success: false, error: toUserErrorMessage(err) };
  }
}

/**
 * Server action to add a blocked date range.
 */
export async function addBlockedDateAction(
  rawData: unknown
): Promise<ActionResult<{ id: string }>> {
  const auth = await verifyApiRole(Role.STUDENT);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = blockedDateInputSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix blocked date errors.",
      fieldErrors: formatZodFieldErrors(parsed.error),
    };
  }

  try {
    const created = await addBlockedDate(auth.user.id, parsed.data);
    revalidatePath("/student/schedule");
    revalidatePath("/student");
    return { success: true, data: { id: created.id } };
  } catch (err) {
    return { success: false, error: toUserErrorMessage(err) };
  }
}

/**
 * Server action to delete a blocked date range.
 */
export async function deleteBlockedDateAction(blockedDateId: string): Promise<ActionResult> {
  const auth = await verifyApiRole(Role.STUDENT);
  if (!auth.ok) return { success: false, error: auth.error };

  if (!blockedDateId) return { success: false, error: "Missing blocked date ID." };

  try {
    await deleteBlockedDate(auth.user.id, blockedDateId);
    revalidatePath("/student/schedule");
    revalidatePath("/student");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserErrorMessage(err) };
  }
}

