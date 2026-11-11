"use server";

import { verifyApiRole } from "@/lib/auth-helpers";
import { auth } from "@/lib/auth";
import { Role, TaskStatus, StudentResponse } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  createTaskSchema,
  checkTaskConflictInputSchema,
  updateTaskStatusSchema,
  studentTaskResponseSchema,
} from "@/lib/validations/task";
import {
  checkTaskConflictForClient,
  createTask,
  updateTaskStatus,
  respondToTask,
} from "@/lib/services/task-service";
import type { ActionResult } from "./profile";
import type { ConflictCheckResult } from "../conflict";

/**
 * Server action to run live conflict check for a client.
 */
export async function checkTaskConflictAction(
  rawData: unknown
): Promise<
  ActionResult<
    ConflictCheckResult & {
      student: { id: string; name: string } | null;
    }
  >
> {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const parsed = checkTaskConflictInputSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: "Invalid conflict check parameters." };
  }

  try {
    const res = await checkTaskConflictForClient(authCheck.user.id, parsed.data);
    return { success: true, data: res };
  } catch (err) {
    console.error("checkTaskConflictAction error:", err);
    return { success: false, error: "Failed to evaluate schedule conflict." };
  }
}

/**
 * Server action for a client to assign a new task to their linked student.
 * Enforces hard conflict block (e.g. class overlap) on the server.
 */
export async function createTaskAction(
  rawData: unknown
): Promise<ActionResult<{ id: string; hasWarnings: boolean }>> {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const parsed = createTaskSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field && typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { success: false, error: "Please fix the task errors.", fieldErrors };
  }

  try {
    const res = await createTask(authCheck.user.id, parsed.data);

    revalidatePath("/client/tasks");
    revalidatePath("/client");
    revalidatePath("/student/tasks");
    revalidatePath("/student");

    return {
      success: true,
      data: { id: res.task.id, hasWarnings: res.hasWarnings },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to assign task.";
    return { success: false, error: message };
  }
}

/**
 * Server action to update task status (TODO -> DOING -> DONE).
 * Can be called by either Client or Student.
 */
export async function updateTaskStatusAction(
  rawData: unknown
): Promise<ActionResult<{ id: string; status: TaskStatus }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = updateTaskStatusSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: "Invalid status update data." };
  }

  try {
    const updated = await updateTaskStatus(
      parsed.data.taskId,
      session.user.id,
      parsed.data.status as TaskStatus
    );

    revalidatePath("/client/tasks");
    revalidatePath("/student/tasks");

    return { success: true, data: { id: updated.id, status: updated.status } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update status.";
    return { success: false, error: message };
  }
}

/**
 * Server action for a student to accept or request reschedule for a task.
 */
export async function respondToTaskAction(
  rawData: unknown
): Promise<ActionResult<{ id: string; response: StudentResponse }>> {
  const authCheck = await verifyApiRole(Role.STUDENT);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  const parsed = studentTaskResponseSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field && typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { success: false, error: "Please fix response errors.", fieldErrors };
  }

  try {
    const updated = await respondToTask(
      parsed.data.taskId,
      authCheck.user.id,
      parsed.data.response as StudentResponse,
      parsed.data.rescheduleReason
    );

    revalidatePath("/student/tasks");
    revalidatePath("/client/tasks");

    return {
      success: true,
      data: { id: updated.id, response: updated.studentResponse! },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to respond to task.";
    return { success: false, error: message };
  }
}
