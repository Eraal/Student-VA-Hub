import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL("/student/profile", request.url);
  return NextResponse.redirect(url);
}

