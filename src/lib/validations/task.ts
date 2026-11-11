import { z } from "zod";

/**
 * Zod schema for creating a new task by a client.
 */
export const createTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Task title must be at least 2 characters.")
      .max(120, "Task title cannot exceed 120 characters."),
    description: z
      .string()
      .trim()
      .max(1000, "Description cannot exceed 1000 characters.")
      .optional()
      .or(z.literal("")),
    startAt: z
      .string()
      .min(1, "Start time is required."),
    dueAt: z
      .string()
      .min(1, "Due date/time is required."),
    estHours: z.coerce
      .number()
      .min(0.25, "Estimated hours must be at least 0.25 hours (15 mins).")
      .max(24, "Estimated hours cannot exceed 24 hours per task."),
  })
  .refine(
    (data) => {
      const startMs = new Date(data.startAt).getTime();
      const dueMs = new Date(data.dueAt).getTime();
      if (isNaN(startMs) || isNaN(dueMs)) return false;
      return dueMs > startMs;
    },
    {
      message: "Deadline (due time) must be after start time.",
      path: ["dueAt"],
    }
  );

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/**
 * Zod schema for live conflict checking.
 */
export const checkTaskConflictInputSchema = z.object({
  startAt: z.string().min(1, "Start time is required."),
  dueAt: z.string().min(1, "Due time is required."),
  estHours: z.coerce.number().min(0.1).max(24),
});

export type CheckTaskConflictInput = z.infer<typeof checkTaskConflictInputSchema>;

/**
 * Zod schema for updating a task's status.
 */
export const updateTaskStatusSchema = z.object({
  taskId: z.string().min(1, "Task ID is required."),
  status: z.enum(["TODO", "DOING", "DONE"]),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

/**
 * Zod schema for student response to an assigned task (Accept or Request Reschedule).
 */
export const studentTaskResponseSchema = z
  .object({
    taskId: z.string().min(1, "Task ID is required."),
    response: z.enum(["ACCEPTED", "RESCHEDULE_REQUESTED"]),
    rescheduleReason: z
      .string()
      .trim()
      .max(300, "Reschedule reason cannot exceed 300 characters.")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.response === "RESCHEDULE_REQUESTED") {
        return !!data.rescheduleReason && data.rescheduleReason.trim().length > 0;
      }
      return true;
    },
    {
      message: "A reason is required when requesting a reschedule.",
      path: ["rescheduleReason"],
    }
  );

export type StudentTaskResponseInput = z.infer<typeof studentTaskResponseSchema>;
