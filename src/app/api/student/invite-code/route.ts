import { NextResponse } from "next/server";
import { verifyApiRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import {
  getStudentInviteDetails,
  generateNewInviteCode,
} from "@/lib/services/invite-service";

export async function GET() {
  const authCheck = await verifyApiRole(Role.STUDENT);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  const details = await getStudentInviteDetails(authCheck.user.id);
  return NextResponse.json(details);
}

export async function POST() {
  const authCheck = await verifyApiRole(Role.STUDENT);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  try {
    const record = await generateNewInviteCode(authCheck.user.id);
    return NextResponse.json({ success: true, code: record.code });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate invite code" },
      { status: 500 },
    );
  }
}

