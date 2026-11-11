/**
 * Prisma seed script.
 * Run with: npx tsx prisma/seed.ts
 *
 * Creates:
 *  - 1 Student: Juan Dela Cruz (juan@example.com / demo1234)
 *  - 1 Client:  Maria Santos   (maria@example.com / demo1234)
 *  - ClientStudentLink (ACTIVE, PHP 150/hr)
 *  - InviteCode (already used by Maria)
 *  - StudentProfile for Juan
 *  - Weekly ClassSchedule for Juan
 *  - Weekly Availability for Juan
 *
 * Password note: "demo1234" is ONLY for local development seeding.
 * Never use demo passwords in production.
 */

import { PrismaClient, Role, LinkStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateInviteCode } from "../src/lib/invite-code";

const prisma = new PrismaClient();

// dayOfWeek: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
// minutes: e.g. 9*60 = 540 (9:00 AM Manila), 13*60 = 780 (1:00 PM Manila)

async function main() {
  console.log("🌱  Seeding database...");

  const DEMO_PASSWORD = "demo1234";
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // -------------------------------------------------------------------------
  // 1. Users
  // -------------------------------------------------------------------------
  const student = await prisma.user.upsert({
    where: { email: "juan@example.com" },
    update: {},
    create: {
      name: "Juan Dela Cruz",
      email: "juan@example.com",
      passwordHash,
      role: Role.STUDENT,
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "maria@example.com" },
    update: {},
    create: {
      name: "Maria Santos",
      email: "maria@example.com",
      passwordHash,
      role: Role.CLIENT,
    },
  });

  console.log(`  ✓ Student: ${student.email}`);
  console.log(`  ✓ Client:  ${client.email}`);

  // -------------------------------------------------------------------------
  // 2. Student Profile
  // -------------------------------------------------------------------------
  await prisma.studentProfile.upsert({
    where: { userId: student.id },
    update: {},
    create: {
      userId: student.id,
      school: "UP Diliman",
      course: "BSCS",
      year: 3,
      maxHoursPerDay: 4,
    },
  });

  console.log("  ✓ StudentProfile created");

  // -------------------------------------------------------------------------
  // 3. InviteCode (already used by Maria)
  // -------------------------------------------------------------------------
  const existingCode = await prisma.inviteCode.findFirst({
    where: { studentId: student.id },
  });

  const code = existingCode?.code ?? generateInviteCode();

  await prisma.inviteCode.upsert({
    where: { code },
    update: { usedByClientId: client.id },
    create: {
      studentId: student.id,
      code,
      usedByClientId: client.id,
    },
  });

  console.log(`  ✓ InviteCode: ${code} (used by Maria)`);

  // -------------------------------------------------------------------------
  // 4. ClientStudentLink
  // -------------------------------------------------------------------------
  await prisma.clientStudentLink.upsert({
    where: { studentId: student.id },
    update: { status: LinkStatus.ACTIVE, hourlyRate: 150 },
    create: {
      clientId: client.id,
      studentId: student.id,
      hourlyRate: 150,
      status: LinkStatus.ACTIVE,
    },
  });

  console.log("  ✓ ClientStudentLink: Juan ↔ Maria @ PHP 150/hr");

  // -------------------------------------------------------------------------
  // 5. Class Schedule (Manila local time as minutes from midnight)
  //
  //   Mon (1): Math 101   09:00-10:00  (540-600)
  //   Mon (1): CS 201     13:00-14:00  (780-840)
  //   Wed (3): Math 101   09:00-10:00  (540-600)
  //   Wed (3): CS 201     13:00-14:00  (780-840)
  //   Fri (5): Physics 101 09:00-11:00 (540-660)
  // -------------------------------------------------------------------------
  // Clear existing schedules for idempotency
  await prisma.classSchedule.deleteMany({ where: { studentId: student.id } });

  await prisma.classSchedule.createMany({
    data: [
      { studentId: student.id, subject: "Math 101",    dayOfWeek: 1, startMinutes: 540,  endMinutes: 600 },
      { studentId: student.id, subject: "CS 201",      dayOfWeek: 1, startMinutes: 780,  endMinutes: 840 },
      { studentId: student.id, subject: "Math 101",    dayOfWeek: 3, startMinutes: 540,  endMinutes: 600 },
      { studentId: student.id, subject: "CS 201",      dayOfWeek: 3, startMinutes: 780,  endMinutes: 840 },
      { studentId: student.id, subject: "Physics 101", dayOfWeek: 5, startMinutes: 540,  endMinutes: 660 },
    ],
  });

  console.log("  ✓ ClassSchedule: 5 classes seeded");

  // -------------------------------------------------------------------------
  // 6. Availability (Manila local time as minutes from midnight)
  //
  //   Mon (1): 18:00-21:00 (1080-1260)
  //   Wed (3): 18:00-21:00 (1080-1260)
  //   Fri (5): 14:00-18:00 (840-1080)
  //   Sat (6): 08:00-12:00 (480-720)
  // -------------------------------------------------------------------------
  await prisma.availability.deleteMany({ where: { studentId: student.id } });

  await prisma.availability.createMany({
    data: [
      { studentId: student.id, dayOfWeek: 1, startMinutes: 1080, endMinutes: 1260 },
      { studentId: student.id, dayOfWeek: 3, startMinutes: 1080, endMinutes: 1260 },
      { studentId: student.id, dayOfWeek: 5, startMinutes: 840,  endMinutes: 1080 },
      { studentId: student.id, dayOfWeek: 6, startMinutes: 480,  endMinutes: 720  },
    ],
  });

  console.log("  ✓ Availability: 4 windows seeded");
  console.log("\n✅  Seed complete.");
  console.log("\nDemo credentials (local only):");
  console.log("  Student — juan@example.com  / demo1234");
  console.log("  Client  — maria@example.com / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

