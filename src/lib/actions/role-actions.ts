"use server";

import { verifyApiRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getStudentDataAction() {
  const authCheck = await verifyApiRole(Role.STUDENT);
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error, status: authCheck.status };
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: authCheck.user.id },
  });

  return {
    success: true,
    user: authCheck.user,
    profile,
  };
}

export async function getClientDataAction() {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error, status: authCheck.status };
  }

  return {
    success: true,
    user: authCheck.user,
  };
}

