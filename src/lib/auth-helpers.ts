import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { evaluateRoleAccess, getDefaultRolePath } from "@/lib/role-guard";

export { evaluateRoleAccess, getDefaultRolePath };

export type AuthResult<T = unknown> =
  | {
      ok: true;
      user: {
        id: string;
        name?: string | null;
        email?: string | null;
        role: Role;
      };
      data?: T;
    }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Returns the current authenticated user from the session, or null if not logged in.
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Page-level guard: ensures the user is logged in.
 * Redirects to /login if not authenticated.
 */
export async function requireAuthPage(callbackUrl?: string) {
  const user = await getCurrentUser();
  if (!user) {
    const url = callbackUrl
      ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/login";
    redirect(url);
  }
  return user;
}

/**
 * Page-level guard: ensures the user has the expected role.
 * Redirects to /login if unauthenticated, or to the opposite dashboard if wrong role.
 */
export async function requireRolePage(expectedRole: Role) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const access = evaluateRoleAccess(user.role, expectedRole);
  if (!access.allowed) {
    if (access.reason === "UNAUTHENTICATED") {
      redirect("/login");
    } else {
      // Forbidden: redirect to their own role dashboard
      redirect(getDefaultRolePath(user.role));
    }
  }

  return user;
}

/**
 * API route / server action guard: checks authentication and role.
 * Returns an AuthResult object without throwing or redirecting.
 */
export async function verifyApiRole(expectedRole: Role): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized: Please log in" };
  }
  const access = evaluateRoleAccess(user.role, expectedRole);
  if (!access.allowed) {
    return {
      ok: false,
      status: 403,
      error: `Forbidden: This resource requires the ${expectedRole} role`,
    };
  }
  return { ok: true, user };
}
