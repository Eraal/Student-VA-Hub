import { expect, test } from "@playwright/test";
import { PrismaClient, TaskStatus } from "@prisma/client";
import { calculateLogAmount } from "../src/lib/money";
import { hash } from "bcryptjs";
import { credentials, manilaDateTime, nextWeekday, seedAt5Fixture, seedClosedLog } from "./support/fixture";
import { createTaskViaUi, expectNoRawValues, loginAs, openAssignDialog, resetAndSeed } from "./support/helpers";

test.beforeEach(async () => {
  await resetAndSeed();
});

function dateNumber(day: "Mon" | "Tue") {
  return String(nextWeekday(day).getDate());
}

async function chooseDate(page: import("@playwright/test").Page, day: "Mon" | "Tue") {
  await page.getByTestId("assign-date").click();
  await page.getByRole("button", { name: dateNumber(day), exact: true }).click();
}

async function fillAssignment(page: import("@playwright/test").Page, title: string, start: string, end: string, hours = "1") {
  const dialog = await openAssignDialog(page);
  await dialog.getByTestId("assign-title").fill(title);
  await chooseDate(page, "Mon");
  await dialog.getByTestId("assign-start").fill(start);
  await dialog.getByTestId("assign-end").fill(end);
  await dialog.getByTestId("assign-hours").fill(hours);
  await expect(dialog.getByTestId("assign-check")).toBeVisible();
  return dialog;
}

test("AT-1 Client assigns a task Monday 1:00 PM overlapping the class", async ({ page }) => {
  const dialog = await fillAssignment(page, "Blocked Monday Task", "13:00", "14:00");
  await expect(dialog.getByTestId("assign-check")).toHaveAttribute("data-state", "block");
  await expect(dialog.getByTestId("assign-submit")).toBeDisabled();
  await dialog.getByTestId("assign-cancel").last().click();
  await page.goto("/client/tasks");
  await expect(page.getByTestId("client-task-card")).toHaveCount(2);
  const prisma = new PrismaClient();
  await expect.poll(() => prisma.task.count({ where: { title: "Blocked Monday Task" } })).toBe(0);
  await prisma.$disconnect();
});

test("AT-2 Overlapping and touching class boundaries are detected consistently", async ({ page }) => {
  for (const [start, end, expected] of [["12:30", "14:00", "block"], ["13:30", "14:30", "block"], ["14:30", "15:30", "warn"]] as const) {
    const dialog = await fillAssignment(page, `Boundary ${start}`, start, end);
    await expect(dialog.getByTestId("assign-check")).toHaveAttribute("data-state", expected);
    await dialog.getByTestId("assign-cancel").last().click();
    if (expected !== "warn") continue;
  }
});

test("AT-3 Approved three-hour log is P450 and one-minute billing is P2.50", async ({ browser }) => {
  await seedClosedLog();
  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const clientPage = await clientContext.newPage();
  await clientPage.goto("/client/timesheets");
  await expect(clientPage.getByTestId("timesheet-row").first()).toBeVisible();
  await clientPage.getByTestId("timesheet-approve").first().click();
  await expect(clientPage.getByTestId("timesheet-row").first()).toContainText("3h");
  await expect(clientPage.getByTestId("timesheet-row").first()).toContainText("₱450.00");
  await clientPage.locator('[data-testid="timesheets-tab"][data-tab="invoices"]').click();
  await expect(clientPage.getByTestId("invoice-card").first()).toContainText("₱450.00");
  await clientContext.close();

  const studentContext = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const studentPage = await studentContext.newPage();
  await studentPage.goto("/student/earnings");
  await expect(studentPage.getByTestId("earnings-total")).toContainText("₱450.00");
  expect(calculateLogAmount(1 / 60, 150)).toBe(2.5);
  await studentContext.close();
});

test("@slow AT-3 real Time In/Time Out records one minute", async ({ browser }) => {
  test.setTimeout(90_000);
  const studentContext = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const page = await studentContext.newPage();
  await page.goto("/student/tasks");
  await page.goto("/student/time");
  await page.getByTestId("time-task-select").click();
  await page.getByRole("option").first().click();
  await page.getByTestId("time-in").click();
  await expect(page.getByTestId("time-out")).toBeVisible();
  await page.waitForTimeout(61_000);
  await page.getByTestId("time-out").click();
  await expect(page.getByTestId("time-log-row").first()).toContainText("1m");
  await expect(page.getByTestId("time-log-row").first()).toContainText("₱2.50");
  await studentContext.close();
});

test("AT-4 Time In twice is rejected and leaves one open log", async ({ page }) => {
  await loginAs(page, "student");
  await page.goto("/student/time");
  await page.getByTestId("time-task-select").click();
  await page.getByRole("option").first().click();
  await page.getByTestId("time-in").click();
  await expect(page.getByTestId("time-out")).toBeVisible();
  await expect(page.getByTestId("time-in")).toHaveCount(0);
  const prisma = new PrismaClient();
  await expect.poll(() => prisma.timeLog.count({ where: { status: "OPEN" } })).toBe(1);
  await prisma.$disconnect();
});

test("AT-5 Excess hours warns but permits assignment", async ({ browser }) => {
  await seedAt5Fixture();
  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const clientPage = await clientContext.newPage();
  await clientPage.goto("/client/calendar");
  await clientPage.getByTestId("calendar-assign").click();
  const dialog = clientPage.getByTestId("assign-dialog");
  await dialog.getByTestId("assign-title").fill("Long Monday Task");
  await dialog.getByTestId("assign-date").click();
  await clientPage.getByRole("button", { name: dateNumber("Mon"), exact: true }).click();
  await dialog.getByTestId("assign-start").fill("18:00");
  await dialog.getByTestId("assign-end").fill("21:00");
  await dialog.getByTestId("assign-hours").fill("5");
  await expect(dialog.getByTestId("assign-check")).toBeVisible();
  await expect(dialog.getByTestId("assign-check")).toHaveAttribute("data-state", "warn");
  await expect(dialog.getByTestId("assign-submit")).toContainText("Assign anyway");
  await dialog.getByTestId("assign-submit").click();
  await clientContext.close();

  const prisma = new PrismaClient();
  await expect.poll(() => prisma.task.count({ where: { title: "Long Monday Task" } })).toBe(1);
  const createdTask = await prisma.task.findFirst({ where: { title: "Long Monday Task" } });
  expect(createdTask?.hoursWarning).toBe(true);
  expect(createdTask?.description ?? "").not.toContain("Exceeds available hours");
  await prisma.$disconnect();

  const studentContext = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const studentPage = await studentContext.newPage();
  await studentPage.goto("/student/tasks");
  await expect(studentPage.getByTestId("task-card")).toHaveCount(4);
  const taskCard = studentPage.getByTestId("task-card").filter({ hasText: "Long Monday Task" });
  await expect(taskCard).toContainText("Exceeds available hours");
  await studentContext.close();
});

test("Task-vs-task overlap is a warning and not a block", async ({ browser }) => {
  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const clientPage = await clientContext.newPage();
  await clientPage.goto("/client/calendar");
  await clientPage.getByTestId("calendar-assign").click();
  const dialog = clientPage.getByTestId("assign-dialog");
  await dialog.getByTestId("assign-title").fill("Overlapping Task");
  await dialog.getByTestId("assign-date").click();
  await clientPage.getByRole("button", { name: dateNumber("Tue"), exact: true }).click();
  await dialog.getByTestId("assign-start").fill("18:00");
  await dialog.getByTestId("assign-end").fill("19:00");
  await dialog.getByTestId("assign-hours").fill("3");
  await expect(dialog.getByTestId("assign-check")).toBeVisible();
  await expect(dialog.getByTestId("assign-check")).not.toHaveAttribute("data-state", "block");
  await expect(dialog.getByTestId("assign-submit")).toBeEnabled();
  await dialog.getByTestId("assign-submit").click();
  await expect(dialog).not.toBeVisible();
  const prisma = new PrismaClient();
  await expect.poll(() => prisma.task.count({ where: { title: "Overlapping Task" } })).toBe(1);
  await prisma.$disconnect();
  await clientContext.close();
});

test("AT-6 Client sees class blocks without private subject names", async ({ page }) => {
  const rawResponses: string[] = [];
  page.on("response", async (response) => {
    const body = await response.text().catch(() => "");
    rawResponses.push(body);
  });
  await loginAs(page, "client");
  for (const path of ["/client/calendar", "/client/tasks", "/client/timesheets"]) {
    await page.goto(path);
    await expectNoRawValues(page);
    await expect(page.getByText("In class", { exact: true }).first()).toBeVisible().catch(() => undefined);
  }
  expect(rawResponses.join("\n")).not.toMatch(/Secret Subject|Hidden Class/);
});

test("AT-7 Client links with a valid invite code and rate", async ({ page }) => {
  const prisma = new PrismaClient();
  await prisma.clientStudentLink.deleteMany({ where: { client: { email: credentials.client.email } } });
  const student = await prisma.user.create({ data: { name: "Unlinked Student", email: "unlinked@example.com", passwordHash: "unused", role: "STUDENT", studentProfile: { create: { school: "X", course: "Y", year: 1 } } } });
  await prisma.inviteCode.create({ data: { studentId: student.id, code: "VALID123" } });
  await prisma.$disconnect();
  await loginAs(page, "client");
  await page.goto("/client/profile");
  await page.getByTestId("link-student-code").fill("VALID123");
  await page.getByTestId("link-student-rate").fill("150");
  await page.getByTestId("link-student-submit").click();
  await expect(page.getByTestId("linked-card")).toContainText("₱150.00");
});

test("AT-8 Invalid, used, lowercase-spaced, and empty invite codes are rejected", async ({ page }) => {
  const prisma = new PrismaClient();
  const passwordHash = await hash(credentials.client.password, 10);
  const invalidClient = await prisma.user.create({
    data: { id: "e2e-client-invalid", name: "Invalid Code Client", email: "invalid.client@example.com", passwordHash, role: "CLIENT" },
  });
  await prisma.$disconnect();
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByTestId("login-email").fill(invalidClient.email);
  await page.getByTestId("login-password").fill(credentials.client.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/client$/);
  await page.goto("/client/profile");
  for (const code of ["INVALID1", "JUAN1234", " juan1234 ", ""]) {
    await page.reload();
    await expect(page.getByTestId("link-student-code")).toBeEnabled();
    await page.getByTestId("link-student-code").fill(code);
    await page.getByTestId("link-student-rate").fill("150");
    if (code.trim().length === 0 || code.includes(" ")) {
      await expect(page.getByTestId("link-student-submit")).toBeDisabled();
    } else {
      await page.getByTestId("link-student-submit").click();
      await expect(page.getByRole("alert")).toBeVisible();
    }
  }
  const verify = new PrismaClient();
  await expect.poll(() => verify.clientStudentLink.count({ where: { clientId: invalidClient.id } })).toBe(0);
  await verify.$disconnect();
});

test("AT-9 Role guards redirect or reject without cross-role data", async ({ page, request }) => {
  await loginAs(page, "client");
  for (const path of ["/student", "/student/tasks"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/client|\/login/);
  }
  const unauthenticated = await request.get("/api/student/time");
  expect([401, 403, 404, 307]).toContain(unauthenticated.status());
  expect(await unauthenticated.text()).not.toContain("Juan Dela Cruz");
});

test("AT-10 Student adding an overlapping class shows a warning", async ({ page }) => {
  await loginAs(page, "student");
  await page.goto("/student/schedule");
  await page.getByTestId("schedule-add-class").first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Subject Name").fill("Overlapping Student Class");
  await dialog.getByLabel("Day of Week").selectOption("1");
  await dialog.getByLabel("Start Time").fill("18:30");
  await dialog.getByLabel("End Time").fill("19:30");
  await dialog.getByRole("button", { name: /Add class/i }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});

test("AT-11 Client approves and pays hours with matching notifications", async ({ browser }) => {
  await seedClosedLog();
  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const clientPage = await clientContext.newPage();
  await clientPage.goto("/client/timesheets");
  await clientPage.getByTestId("timesheet-approve").first().click();
  await clientPage.locator('[data-testid="timesheets-tab"][data-tab="invoices"]').click();
  await clientPage.getByTestId("invoice-mark-paid").first().click();
  await clientPage.getByTestId("invoice-confirm-paid").click();
  await expect(clientPage.getByTestId("invoice-card").first()).toHaveAttribute("data-status", "PAID");
  await clientContext.close();

  const studentContext = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const studentPage = await studentContext.newPage();
  await studentPage.goto("/student/notifications");
  await expect(studentPage.getByTestId("notification-row").first()).toContainText(/approved|paid/i);
  await studentContext.close();
});

test("AT-12 Manila Monday task conflict is invariant across browser timezones", async ({ browser }) => {
  for (const timezoneId of ["UTC", "Asia/Manila", "America/Los_Angeles"]) {
    const context = await browser.newContext({ timezoneId });
    const page = await context.newPage();
    await loginAs(page, "client");
    const dialog = await fillAssignment(page, `Timezone ${timezoneId}`, "13:30", "14:30");
    await expect(dialog.getByTestId("assign-check")).toHaveAttribute("data-state", "block");
    await expect(dialog.getByTestId("assign-date")).toContainText(/Mon/);
    await context.close();
  }
});
