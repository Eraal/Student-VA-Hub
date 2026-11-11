"use server";

import { registerUser } from "@/lib/services/user-service";
import { loginSchema } from "@/lib/validations/auth";
import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
};

/**
 * Register a new User (Student or Client).
 * Delegates to registerUser service which performs hashing, validation, and profile creation.
 */
export async function registerAction(
  rawData: unknown,
): Promise<ActionResult<{ email: string; role: Role }>> {
  const result = await registerUser(rawData);
  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    data: {
      email: result.data!.email,
      role: result.data!.role,
    },
  };
}

/**
 * Log in with email and password via Auth.js credentials provider.
 * Validates input with Zod.
 */
export async function loginAction(
  rawData: unknown,
): Promise<ActionResult<{ role: Role; redirectUrl: string }>> {
  const parsed = loginSchema.safeParse(rawData);

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
      error: "Please provide a valid email and password.",
      fieldErrors,
    };
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Find user to determine role and redirect target
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return {
      success: false,
      error: "Invalid email or password. Please try again.",
    };
  }

  const targetUrl = user.role === Role.STUDENT ? "/student" : "/client";

  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirectTo: targetUrl,
    });

    return {
      success: true,
      data: {
        role: user.role,
        redirectUrl: targetUrl,
      },
    };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return {
            success: false,
            error: "Invalid email or password. Please try again.",
          };
        default:
          return {
            success: false,
            error: "Authentication failed. Please try again.",
          };
      }
    }
    // In Next.js App Router, signIn throws NEXT_REDIRECT on success
    throw error;
  }
}

/**
 * Sign out the current user and redirect to /login.
 */
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
