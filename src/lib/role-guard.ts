import { Role } from "@prisma/client";

export type RoleEvaluationResult = {
  allowed: boolean;
  reason?: "UNAUTHENTICATED" | "FORBIDDEN";
};

/**
 * Pure role evaluation function suitable for unit tests and route guards.
 */
export function evaluateRoleAccess(
  userRole: Role | undefined | null,
  expectedRole: Role,
): RoleEvaluationResult {
  if (!userRole) {
    return { allowed: false, reason: "UNAUTHENTICATED" };
  }
  if (userRole !== expectedRole) {
    return { allowed: false, reason: "FORBIDDEN" };
  }
  return { allowed: true };
}

/**
 * Given a user role, returns the default home path.
 */
export function getDefaultRolePath(userRole: Role | undefined | null): string {
  if (userRole === Role.STUDENT) {
    return "/student";
  }
  if (userRole === Role.CLIENT) {
    return "/client";
  }
  return "/login";
}
