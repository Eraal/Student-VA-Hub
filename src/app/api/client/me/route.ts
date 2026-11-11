import { NextResponse } from "next/server";
import { verifyApiRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";

export async function GET() {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  return NextResponse.json({
    user: authCheck.user,
  });
}
