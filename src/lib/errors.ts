import { ZodError } from "zod";

export const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

/**
 * Maps raw technical errors (Zod, Prisma, Auth, HTTP codes) into friendly, plain English messages.
 * Logs technical details on the server only.
 */
export function toUserErrorMessage(err: unknown): string {
  if (!err) {
    return DEFAULT_ERROR_MESSAGE;
  }

  // 1. Zod validation error
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    if (firstIssue) {
      return firstIssue.message || "Invalid input provided.";
    }
    return "Invalid input provided.";
  }

  // 2. Prisma Database Errors
  if (typeof err === "object" && err !== null) {
    const code = (err as { code?: string }).code;
    if (code === "P2002") {
      return "This record already exists. Please use a different value.";
    }
    if (code === "P2025") {
      return "The requested record was not found.";
    }
    if (code === "P2003") {
      return "Unable to complete action due to related records.";
    }
  }

  // 3. Auth and permission errors
  const rawMsg = err instanceof Error ? err.message : String(err);

  if (
    rawMsg.includes("Unauthorized") ||
    rawMsg.includes("401") ||
    rawMsg.includes("Please log in")
  ) {
    return "Please log in to continue.";
  }

  if (
    rawMsg.includes("Forbidden") ||
    rawMsg.includes("403") ||
    rawMsg.includes("requires the")
  ) {
    return "You do not have permission to perform this action.";
  }

  // 4. Known business rule messages from Conflict Detector or SPEC
  if (rawMsg.startsWith("Conflict!") || rawMsg.startsWith("Conflict:")) {
    return rawMsg;
  }
  if (rawMsg.includes("class overlap") || rawMsg.includes("overlap")) {
    return rawMsg;
  }
  if (rawMsg.includes("already open") || rawMsg.includes("time log is already open")) {
    return "A timer is already running. Please stop your active timer first.";
  }
  if (rawMsg.includes("Daily burnout cap") || rawMsg.includes("Exceeds Available Hours")) {
    return rawMsg;
  }
  if (rawMsg.includes("Invalid invite code") || rawMsg.includes("not found")) {
    return rawMsg;
  }
  if (
    rawMsg.includes("Accept this task before you start the timer") ||
    rawMsg.includes("Cannot track time on a completed task")
  ) {
    return rawMsg;
  }

  // 5. Hide technical Prisma / SQL / internal stack messages
  if (
    rawMsg.includes("prisma") ||
    rawMsg.includes("PrismaClient") ||
    rawMsg.includes("SELECT") ||
    rawMsg.includes("INSERT") ||
    rawMsg.includes("UPDATE") ||
    rawMsg.includes("column") ||
    rawMsg.includes("table") ||
    rawMsg.includes("foreign key") ||
    rawMsg.includes("connection")
  ) {
    return DEFAULT_ERROR_MESSAGE;
  }

  // 6. If it's a short, user-safe error message, return it
  if (rawMsg.length > 0 && rawMsg.length < 120 && !rawMsg.includes("Error:") && !rawMsg.includes("at ")) {
    return rawMsg;
  }

  return DEFAULT_ERROR_MESSAGE;
}

/**
 * Extracts friendly field errors from a ZodError.
 */
export function formatZodFieldErrors(err: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const field = issue.path[0];
    if (field && typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

