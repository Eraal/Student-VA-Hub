import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/invite-code";
import { LinkStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { publishLiveUpdate } from "../live-updates";
import {
  UpdateStudentProfileInput,
  UpdateClientProfileInput,
} from "@/lib/validations/profile";

export type ServiceResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

/**
 * Returns current invite code details and linked client for a student.
 * If the student has no invite code yet, automatically generates their first one.
 */
export async function getStudentInviteDetails(studentId: string) {
  // Find all invite codes for this student, latest first
  let codes = await prisma.inviteCode.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: {
      usedByClient: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // If no codes exist, generate the initial one
  if (codes.length === 0) {
    const initialCode = await generateNewInviteCode(studentId);
    codes = [
      {
        ...initialCode,
        usedByClient: null,
      },
    ];
  }

  // Find linked client if exists
  const activeLink = await prisma.clientStudentLink.findUnique({
    where: { studentId },
    include: {
      client: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return {
    currentCode: codes[0],
    allCodes: codes,
    linkedClient: activeLink?.client ?? null,
    link: activeLink,
  };
}

/**
 * Generates a guaranteed-unique invite code for a student.
 */
export async function generateNewInviteCode(studentId: string) {
  let uniqueCode = "";
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const candidate = generateInviteCode();
    const existing = await prisma.inviteCode.findUnique({
      where: { code: candidate },
    });
    if (!existing) {
      uniqueCode = candidate;
      break;
    }
    attempts++;
  }

  if (!uniqueCode) {
    throw new Error("Failed to generate a unique invite code after maximum attempts");
  }

  return await prisma.inviteCode.create({
    data: {
      studentId,
      code: uniqueCode,
    },
  });
}

/**
 * Validates an invite code and links student to client with an agreed hourly rate.
 */
export async function linkStudentToClient(
  clientId: string,
  rawCode: string,
  hourlyRate: number,
): Promise<ServiceResult<{ studentName: string; hourlyRate: number }>> {
  const code = rawCode.trim().toUpperCase();

  // 1. Verify invite code exists
  const invite = await prisma.inviteCode.findUnique({
    where: { code },
    include: {
      student: {
        include: {
          studentProfile: true,
        },
      },
    },
  });

  if (!invite) {
    return {
      success: false,
      error: "Invalid invite code. Please check the code and try again.",
    };
  }

  // 2. Cannot link to oneself
  if (invite.studentId === clientId) {
    return {
      success: false,
      error: "You cannot link to your own account.",
    };
  }

  // 3. Verify code has not been used yet
  if (invite.usedByClientId) {
    return {
      success: false,
      error: "This invite code has already been used and cannot be reused.",
    };
  }

  // 4. Verify student is not already linked to another client (v1.0 rule: one client per student)
  const existingStudentLink = await prisma.clientStudentLink.findUnique({
    where: { studentId: invite.studentId },
  });

  if (existingStudentLink) {
    return {
      success: false,
      error: "This student is already linked to another client.",
    };
  }

  // 5. Execute transaction: mark invite as used and create link
  try {
    await prisma.$transaction(async (tx) => {
      await tx.inviteCode.update({
        where: { id: invite.id },
        data: { usedByClientId: clientId },
      });

      await tx.clientStudentLink.create({
        data: {
          clientId,
          studentId: invite.studentId,
          hourlyRate,
          status: LinkStatus.ACTIVE,
        },
      });
    });

    publishLiveUpdate([clientId, invite.studentId], "link");

    return {
      success: true,
      data: {
        studentName: invite.student.name,
        hourlyRate,
      },
    };
  } catch (err) {
    console.error("Error creating student-client link:", err);
    return {
      success: false,
      error: "Failed to link student. Please try again later.",
    };
  }
}

/**
 * Serialized representation of a linked student for the Client Profile.
 * Contains ONLY non-sensitive contact and link details (school, course, year omitted).
 */
export interface SerializedClientLinkedStudent {
  id: string;
  hourlyRate: number;
  status: string;
  createdAt: Date | string;
  student: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Strips any university, academic, or sensitive profile fields from a link object.
 * Guarantees that only name, email, hourly rate, link status, and link createdAt reach client components.
 */
export function serializeClientProfileLink(
  rawLink: any
): SerializedClientLinkedStudent | null {
  if (!rawLink || !rawLink.student) return null;
  return {
    id: rawLink.id,
    hourlyRate: rawLink.hourlyRate,
    status: String(rawLink.status),
    createdAt: rawLink.createdAt,
    student: {
      id: rawLink.student.id,
      name: rawLink.student.name ?? "",
      email: rawLink.student.email ?? "",
    },
  };
}

/**
 * Returns linked student and rate for a client.
 * Strictly limits student fields to name and email to protect privacy.
 */
export async function getClientLinkedStudent(clientId: string) {
  const link = await prisma.clientStudentLink.findFirst({
    where: { clientId },
    select: {
      id: true,
      hourlyRate: true,
      status: true,
      createdAt: true,
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return link ? serializeClientProfileLink(link) : null;
}

/**
 * Updates hourly rate on an existing student-client link.
 */
export async function updateClientHourlyRate(
  clientId: string,
  hourlyRate: number,
): Promise<ServiceResult<{ hourlyRate: number }>> {
  const link = await prisma.clientStudentLink.findFirst({
    where: { clientId },
  });

  if (!link) {
    return {
      success: false,
      error: "No linked student found to update.",
    };
  }

  const updated = await prisma.clientStudentLink.update({
    where: { id: link.id },
    data: { hourlyRate },
  });

  publishLiveUpdate([clientId, link.studentId], "link");

  return {
    success: true,
    data: { hourlyRate: updated.hourlyRate },
  };
}

/**
 * Updates user profile and optionally password.
 */
export async function updateUserProfile(
  userId: string,
  role: Role,
  data: UpdateStudentProfileInput | UpdateClientProfileInput,
): Promise<ServiceResult<{ name: string; email: string }>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { success: false, error: "User not found." };
  }

  const normalizedEmail = data.email.toLowerCase().trim();

  // If email is changed, verify uniqueness
  if (normalizedEmail !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing && existing.id !== userId) {
      return {
        success: false,
        error: "An account with this email address already exists.",
      };
    }
  }

  // Handle password change if requested
  let newPasswordHash = user.passwordHash;
  if (data.newPassword && data.newPassword.length > 0) {
    if (!data.currentPassword) {
      return {
        success: false,
        error: "Current password is required to change password.",
      };
    }

    const isValidCurrent = await bcrypt.compare(
      data.currentPassword,
      user.passwordHash,
    );
    if (!isValidCurrent) {
      return {
        success: false,
        error: "Incorrect current password. Please try again.",
      };
    }

    newPasswordHash = await bcrypt.hash(data.newPassword, 10);
  }

  // Update in transaction
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: {
          name: data.name.trim(),
          email: normalizedEmail,
          passwordHash: newPasswordHash,
        },
      });

      if (role === Role.STUDENT && "school" in data) {
        const studentData = data as UpdateStudentProfileInput;
        await tx.studentProfile.upsert({
          where: { userId },
          create: {
            userId,
            school: studentData.school.trim(),
            course: studentData.course.trim(),
            year: studentData.year,
            maxHoursPerDay: studentData.maxHoursPerDay,
          },
          update: {
            school: studentData.school.trim(),
            course: studentData.course.trim(),
            year: studentData.year,
            maxHoursPerDay: studentData.maxHoursPerDay,
          },
        });
      }

      return u;
    });

    return {
      success: true,
      data: {
        name: updated.name,
        email: updated.email,
      },
    };
  } catch (err) {
    console.error("Error updating profile:", err);
    return {
      success: false,
      error: "Failed to update profile. Please try again later.",
    };
  }
}

