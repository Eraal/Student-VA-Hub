import { NextRequest, NextResponse } from "next/server";
import { verifyApiRole } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { linkStudentSchema, updateHourlyRateSchema } from "@/lib/validations/link";
import {
  getClientLinkedStudent,
  linkStudentToClient,
  updateClientHourlyRate,
} from "@/lib/services/invite-service";

export async function GET() {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  const link = await getClientLinkedStudent(authCheck.user.id);
  return NextResponse.json({ link });
}

export async function POST(req: NextRequest) {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = linkStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const res = await linkStudentToClient(
    authCheck.user.id,
    parsed.data.code,
    parsed.data.hourlyRate,
  );

  if (!res.success) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }

  return NextResponse.json(res);
}

export async function PATCH(req: NextRequest) {
  const authCheck = await verifyApiRole(Role.CLIENT);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = updateHourlyRateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid hourly rate" },
      { status: 400 },
    );
  }

  const res = await updateClientHourlyRate(
    authCheck.user.id,
    parsed.data.hourlyRate,
  );

  if (!res.success) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }

  return NextResponse.json(res);
}

