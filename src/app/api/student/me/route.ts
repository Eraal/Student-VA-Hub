import { NextResponse } from "next/server";
import { verifyApiRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authCheck = await verifyApiRole(Role.STUDENT);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: authCheck.user.id },
  });

  return NextResponse.json({
    user: authCheck.user,
    profile,
  });
}
