import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { PrismaClient, Role, TaskStatus, TimeLogStatus, LinkStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { calculateLoggedHours } from "../../src/lib/money";

export const credentials = {
  student: { email: "juan@example.com", password: "demo1234" },
  client: { email: "maria@example.com", password: "demo1234" },
};

export function assertTestDatabase() {
  const testUrl = process.env.TEST_DATABASE_URL;
  const devUrl = process.env.DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL is required for E2E tests.");
  if (devUrl && testUrl === devUrl) throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL.");
  const parsed = new URL(testUrl);
  const databaseName = parsed.pathname.replace(/^\/+/, "").split("?")[0];
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error(`TEST_DATABASE_URL database name must contain "test"; received "${databaseName}".`);
  }
  process.env.DATABASE_URL = testUrl;
}

function prismaForTest() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL was not initialized with the isolated test database.");
  }
  return new PrismaClient();
}

export function nextWeekday(day: "Mon" | "Tue") {
  const now = new Date();
  const manilaNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const target = day === "Mon" ? 1 : 2;
  const delta = (target - manilaNow.getDay() + 7) % 7 || 7;
  manilaNow.setDate(manilaNow.getDate() + delta);
  manilaNow.setHours(0, 0, 0, 0);
  return manilaNow;
}

export function manilaDateTime(day: "Mon" | "Tue", hour: number, minute = 0) {
  const local = nextWeekday(day);
  local.setHours(hour, minute, 0, 0);
  return new Date(local.getTime() - 8 * 60 * 60 * 1000);
}

export async function resetDb() {
  const prisma = prismaForTest();
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "Notification", "Invoice", "TimeLog", "Task", "BlockedDate",
      "Availability", "ClassSchedule", "InviteCode", "ClientStudentLink",
      "StudentProfile", "User" CASCADE
  `);
  await prisma.$disconnect();
}

export async function seedFixture() {
  const prisma = prismaForTest();
  const passwordHash = await hash(credentials.student.password, 10);
  const student = await prisma.user.create({
    data: {
      id: "e2e-student-juan",
      name: "Juan Dela Cruz", email: credentials.student.email, passwordHash, role: Role.STUDENT,
      studentProfile: { create: { school: "Test University", course: "BS Business", year: 3, maxHoursPerDay: 4 } },
    },
  });
  const client = await prisma.user.create({
    data: { id: "e2e-client-maria", name: "Maria Santos", email: credentials.client.email, passwordHash, role: Role.CLIENT },
  });
  const otherStudent = await prisma.user.create({
    data: {
      id: "e2e-student-other",
      name: "Other Student", email: "other.student@example.com", passwordHash, role: Role.STUDENT,
      studentProfile: { create: { school: "Other University", course: "Other Course", year: 1, maxHoursPerDay: 4 } },
    },
  });
  const otherClient = await prisma.user.create({
    data: { id: "e2e-client-other", name: "Other Client", email: "other.client@example.com", passwordHash, role: Role.CLIENT },
  });
  await prisma.clientStudentLink.createMany({
    data: [
      { clientId: client.id, studentId: student.id, hourlyRate: 150, status: LinkStatus.ACTIVE },
      { clientId: otherClient.id, studentId: otherStudent.id, hourlyRate: 200, status: LinkStatus.ACTIVE },
    ],
  });
  await prisma.inviteCode.create({ data: { studentId: student.id, code: "JUAN1234" } });
  await prisma.classSchedule.createMany({
    data: [
      { studentId: student.id, subject: "Secret Subject", dayOfWeek: 1, startMinutes: 540, endMinutes: 600 },
      { studentId: student.id, subject: "Hidden Class", dayOfWeek: 1, startMinutes: 780, endMinutes: 870 },
    ],
  });
  await prisma.availability.createMany({
    data: [
      { studentId: student.id, dayOfWeek: 1, startMinutes: 1080, endMinutes: 1260 },
      { studentId: student.id, dayOfWeek: 2, startMinutes: 1080, endMinutes: 1260 },
    ],
  });
  await prisma.task.createMany({
    data: [
      { clientId: client.id, studentId: student.id, title: "Existing Doing Task", description: "fixture", startAt: manilaDateTime("Tue", 18), dueAt: manilaDateTime("Tue", 19), estHours: 1, status: TaskStatus.DOING, studentResponse: "ACCEPTED" },
      { clientId: client.id, studentId: student.id, title: "Existing Done Task", description: "fixture", startAt: manilaDateTime("Tue", 19), dueAt: manilaDateTime("Tue", 20), estHours: 1, status: TaskStatus.DONE, studentResponse: "ACCEPTED" },
      { clientId: otherClient.id, studentId: otherStudent.id, title: "Other Client Task", description: "isolation", startAt: manilaDateTime("Tue", 18), dueAt: manilaDateTime("Tue", 19), estHours: 1, status: TaskStatus.TODO },
    ],
  });
  await prisma.$disconnect();
}

export async function seedClosedLog() {
  const prisma = prismaForTest();
  const student = await prisma.user.findUniqueOrThrow({ where: { email: credentials.student.email } });
  const client = await prisma.user.findUniqueOrThrow({ where: { email: credentials.client.email } });
  const task = await prisma.task.create({
    data: { clientId: client.id, studentId: student.id, title: "Monday Evening Work", description: "fixture", startAt: manilaDateTime("Mon", 18), dueAt: manilaDateTime("Mon", 21), estHours: 3, status: TaskStatus.DOING, studentResponse: "ACCEPTED" },
  });
  const timeIn = manilaDateTime("Mon", 18);
  const timeOut = manilaDateTime("Mon", 21);
  const log = await prisma.timeLog.create({
    data: { studentId: student.id, taskId: task.id, timeIn, timeOut, totalHours: calculateLoggedHours(timeIn, timeOut), status: TimeLogStatus.CLOSED },
  });
  await prisma.$disconnect();
  return { taskId: task.id, logId: log.id };
}

export async function seedAt5Fixture() {
  const prisma = prismaForTest();
  const student = await prisma.user.findUniqueOrThrow({ where: { email: credentials.student.email } });
  const client = await prisma.user.findUniqueOrThrow({ where: { email: credentials.client.email } });
  await prisma.studentProfile.updateMany({ where: { userId: student.id }, data: { maxHoursPerDay: 2 } });
  const task = await prisma.task.create({
    data: {
      clientId: client.id,
      studentId: student.id,
      title: "Existing Monday Task",
      description: "fixture",
      startAt: manilaDateTime("Mon", 10),
      dueAt: manilaDateTime("Mon", 11),
      estHours: 1,
      status: TaskStatus.DOING,
      studentResponse: "ACCEPTED",
    },
  });
  await prisma.$disconnect();
  return task;
}

export async function dbCounts() {
  const prisma = prismaForTest();
  const counts = { tasks: await prisma.task.count(), openLogs: await prisma.timeLog.count({ where: { status: "OPEN" } }), links: await prisma.clientStudentLink.count({ where: { status: "ACTIVE" } }) };
  await prisma.$disconnect();
  return counts;
}

export function migrateTestDb() {
  assertTestDatabase();
  execFileSync(process.execPath, [resolve("node_modules", "prisma", "build", "index.js"), "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }, stdio: "inherit" });
}
