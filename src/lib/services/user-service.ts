import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validations/auth";
import { Role } from "@prisma/client";

export type ServiceResult<T = unknown> = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
};

/**
 * Register a new User and create associated StudentProfile (if role is STUDENT).
 * - Hashes password using bcryptjs.
 * - Enforces unique email check with clear human-readable error.
 * - Performs atomic transaction.
 */
export async function registerUser(
  rawData: unknown,
): Promise<ServiceResult<{ id: string; email: string; role: Role; name: string }>> {
  const parsed = registerSchema.safeParse(rawData);

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
      error: "Please correct the errors in the form.",
      fieldErrors,
    };
  }

  const data = parsed.data;
  const normalizedEmail = data.email.toLowerCase().trim();

  // Check for duplicate email
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    return {
      success: false,
      error: "An account with this email address already exists. Please log in instead.",
      fieldErrors: {
        email: "An account with this email address already exists.",
      },
    };
  }

  // Hash password with bcryptjs
  const passwordHash = await bcrypt.hash(data.password, 10);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: data.name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: data.role,
        },
      });

      if (data.role === Role.STUDENT) {
        await tx.studentProfile.create({
          data: {
            userId: newUser.id,
            school: data.school.trim(),
            course: data.course.trim(),
            year: data.year,
            maxHoursPerDay: 4,
          },
        });
      }

      return newUser;
    });

    return {
      success: true,
      data: {
        id: created.id,
        email: created.email,
        name: created.name,
        role: created.role,
      },
    };
  } catch (err) {
    console.error("Error creating user in registerUser:", err);
    return {
      success: false,
      error: "Failed to create account. Please try again later.",
    };
  }
}

/**
 * Validates credentials against Prisma and bcrypt.
 */
export async function validateCredentials(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return null;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

