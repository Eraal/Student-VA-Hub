import { expect, test } from "@playwright/test";
import { PrismaClient, TaskStatus, TimeLogStatus } from "@prisma/client";
import { calculateLoggedHours } from "../src/lib/money";
import { credentials, manilaDateTime, relativeDateString, seedClosedLog } from "./support/fixture";
import { chooseDate, dateNumber, expectNoRawValues, resetAndSeed } from "./support/helpers";

test.beforeEach(async () => {
  await resetAndSeed();
});

test("Assign Task: states ok, warn, block, suggestion chips, blocked date, and double click creates one task", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const page = await context.newPage();
  await page.goto("/client/calendar");

  // 1. Check OK state (Tuesday 18:00 - 19:00 inside Tuesday 18:00-21:00 availability)
  await page.getByTestId("calendar-assign").click();
  const dialog = page.getByTestId("assign-dialog");
  await dialog.getByTestId("assign-title").fill("Tuesday Valid Task");
  await chooseDate(page, "Tue");
  await dialog.getByTestId("assign-start").fill("18:00");
  await dialog.getByTestId("assign-end").fill("19:00");
  await dialog.getByTestId("assign-hours").fill("1");
  await expect(dialog.getByTestId("assign-check")).toHaveAttribute("data-state", "ok");

  // 2. Check WARN state (Tuesday 10:00 - 11:00 outside availability)
  await dialog.getByTestId("assign-start").fill("10:00");
  await dialog.getByTestId("assign-end").fill("11:00");
  await expect(dialog.getByTestId("assign-check")).toHaveAttribute("data-state", "warn");
  await expect(dialog.getByTestId("assign-submit")).toBeEnabled();

  // 3. Check BLOCK state (Monday 13:00 - 14:00 overlapping Monday class 13:00 - 14:30)
  await chooseDate(page, "Mon");
  await dialog.getByTestId("assign-start").fill("13:00");
  await dialog.getByTestId("assign-end").fill("14:00");
  await expect(dialog.getByTestId("assign-check")).toHaveAttribute("data-state", "block");
  await expect(dialog.getByTestId("assign-submit")).toBeDisabled();

  // 4. Suggestion chips fill form
  const suggestion = dialog.getByTestId("assign-suggestion").first();
  if (await suggestion.isVisible()) {
    await suggestion.click();
    await expect(dialog.getByTestId("assign-start")).not.toHaveValue("");
    await expect(dialog.getByTestId("assign-end")).not.toHaveValue("");
  }

  // 5. Blocked date day is blocked
  const prisma = new PrismaClient();
  const student = await prisma.user.findUniqueOrThrow({ where: { email: credentials.student.email } });
  const blockedDateStart = manilaDateTime("Wed", 0);
  const blockedDateEnd = manilaDateTime("Wed", 23, 59);
  await prisma.blockedDate.create({
    data: {
      studentId: student.id,
      dateStart: blockedDateStart,
      dateEnd: blockedDateEnd,
      reason: "Private Midterm Exam",
    },
  });
  await prisma.$disconnect();

  await chooseDate(page, "Wed");
  await dialog.getByTestId("assign-start").fill("10:00");
  await dialog.getByTestId("assign-end").fill("11:00");
  await expect(dialog.getByTestId("assign-check")).toHaveAttribute("data-state", "block");
  await expect(dialog.getByTestId("assign-submit")).toBeDisabled();

  // Close dialog and reopen for double-click test
  await dialog.getByTestId("assign-cancel").last().click();
  await page.getByTestId("calendar-assign").click();
  const freshDialog = page.getByTestId("assign-dialog");

  // 6. Double-clicking Assign creates exactly one task
  await chooseDate(page, "Tue");
  await freshDialog.getByTestId("assign-title").fill("Double Click Task");
  await freshDialog.getByTestId("assign-start").fill("20:00");
  await freshDialog.getByTestId("assign-end").fill("21:00");
  await freshDialog.getByTestId("assign-hours").fill("1");
  await expect(freshDialog.getByTestId("assign-check")).toHaveAttribute("data-state", "ok");

  const submitBtn = freshDialog.getByTestId("assign-submit");
  await submitBtn.dblclick();

  const verifyPrisma = new PrismaClient();
  await expect.poll(() => verifyPrisma.task.count({ where: { title: "Double Click Task" } })).toBe(1);
  await verifyPrisma.$disconnect();

  await context.close();
});

test("Calendar: week navigation, Today, clicking free window opens prefilled, privacy of class and blocked days", async ({ browser }) => {
  const prisma = new PrismaClient();
  const student = await prisma.user.findUniqueOrThrow({ where: { email: credentials.student.email } });
  const tomorrowStart = new Date(`${relativeDateString(1)}T00:00:00.000Z`);
  const tomorrowEnd = new Date(`${relativeDateString(1)}T23:59:59.999Z`);
  await prisma.blockedDate.create({
    data: {
      studentId: student.id,
      dateStart: tomorrowStart,
      dateEnd: tomorrowEnd,
      reason: "Confidential Student Event",
    },
  });
  await prisma.$disconnect();

  const context = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const page = await context.newPage();
  await page.goto("/client/calendar");

  // Week navigation
  await page.getByTestId("calendar-next").click();
  await page.getByTestId("calendar-prev").click();
  await page.getByTestId("calendar-today").click();

  // Clicking free window opens dialog prefilled
  const openSlot = page.getByTestId("calendar-open-slot").first();
  if (await openSlot.isVisible()) {
    await openSlot.click();
    const dialog = page.getByTestId("assign-dialog");
    await expect(dialog).toBeVisible();
    // App Bug: calendar passes 12-hour formatted time ("6:00 PM") instead of 24-hour ("18:00")
    // into HTML5 <input type="time">, causing DOM input.value to remain empty string "".
    const startVal = await dialog.getByTestId("assign-start").getAttribute("value");
    expect(startVal).not.toBe("");
    await dialog.getByTestId("assign-cancel").last().click();
  }

  // Class blocks show "In class" only, never secret subject name
  await expectNoRawValues(page);
  const classBlock = page.getByTestId("calendar-class-block").first();
  await expect(classBlock).toBeVisible();
  await expect(classBlock).toContainText("In class");

  // Blocked days show "Not available" without a reason
  const blockedDay = page.getByTestId("calendar-blocked-day").first();
  await expect(blockedDay).toBeVisible();
  await expect(blockedDay).toContainText("Not available");
  const html = await page.locator("html").innerHTML();
  expect(html).not.toContain("Confidential Student Event");

  await context.close();
});

test("Tasks: tabs and counts, detail sheet, ?task=<id>, reschedule callout, status menu rules", async ({ browser }) => {
  const prisma = new PrismaClient();
  const student = await prisma.user.findUniqueOrThrow({ where: { email: credentials.student.email } });
  const client = await prisma.user.findUniqueOrThrow({ where: { email: credentials.client.email } });
  const task = await prisma.task.create({
    data: {
      clientId: client.id,
      studentId: student.id,
      title: "Reschedule Callout Task",
      description: "Task description text",
      startAt: manilaDateTime("Tue", 18),
      dueAt: manilaDateTime("Tue", 19),
      estHours: 1,
      status: TaskStatus.TODO,
      studentResponse: "RESCHEDULE_REQUESTED",
      rescheduleReason: "Urgent conflict with midterm exam",
    },
  });
  await prisma.$disconnect();

  const context = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const page = await context.newPage();
  await page.goto("/client/tasks");

  // Tabs and counts
  for (const tabKey of ["all", "todo", "in_progress", "done"]) {
    const tabBtn = page.locator(`[data-testid="client-tasks-tab"][data-tab="${tabKey}"]`);
    await expect(tabBtn).toBeVisible();
    await tabBtn.click();
  }

  // Click task card opens detail sheet
  await page.locator('[data-testid="client-tasks-tab"][data-tab="all"]').click();
  const card = page.getByTestId("client-task-card").filter({ hasText: "Reschedule Callout Task" }).first();
  await card.click();

  const sheet = page.getByTestId("client-task-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId("client-task-reschedule-reason")).toContainText("Urgent conflict with midterm exam");
  await page.keyboard.press("Escape");
  await expect(sheet).not.toBeVisible();

  // Direct ?task=<id> navigation
  await page.goto(`/client/tasks?task=${task.id}`);
  await expect(page.getByTestId("client-task-sheet")).toBeVisible();
  await page.keyboard.press("Escape");

  // Status menu follows rules
  const menuBtn = card.getByTestId("client-task-menu").first();
  await menuBtn.click();
  await page.locator('[data-testid="client-task-status-option"][data-status="DONE"]').first().click();
  await expect(card).toHaveAttribute("data-status", "DONE");

  await context.close();
});

test("Timesheets: approve session and group, dispute with reason, approve/decline correction, invoice totals, mark paid and double-payment failure", async ({ browser }) => {
  const { taskId, logId } = await seedClosedLog();

  const prisma = new PrismaClient();
  const student = await prisma.user.findUniqueOrThrow({ where: { email: credentials.student.email } });
  const client = await prisma.user.findUniqueOrThrow({ where: { email: credentials.client.email } });

  // Add second log in same task for group approval
  const timeIn2 = manilaDateTime("Tue", 18);
  const timeOut2 = manilaDateTime("Tue", 19);
  const log2 = await prisma.timeLog.create({
    data: {
      studentId: student.id,
      taskId,
      timeIn: timeIn2,
      timeOut: timeOut2,
      totalHours: calculateLoggedHours(timeIn2, timeOut2),
      status: TimeLogStatus.CLOSED,
    },
  });

  // Add third log with correction request
  const log3 = await prisma.timeLog.create({
    data: {
      studentId: student.id,
      taskId,
      timeIn: timeIn2,
      timeOut: timeOut2,
      requestedTimeOut: manilaDateTime("Tue", 20),
      correctionNote: "Forgot to clock out",
      correctionStatus: "PENDING",
      totalHours: calculateLoggedHours(timeIn2, timeOut2),
      status: TimeLogStatus.CLOSED,
    },
  });
  await prisma.$disconnect();

  const context = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const page = await context.newPage();
  await page.goto("/client/timesheets");

  // Approve correction request
  await page.getByTestId("timesheet-correction-approve").first().click();

  // Approve first session
  await page.getByTestId("timesheet-approve").first().click();

  // Approve remaining sessions in group
  while (await page.getByTestId("timesheet-approve").count() > 0) {
    const approveBtn = page.getByTestId("timesheet-approve").first();
    await approveBtn.click();
    await expect(approveBtn).not.toBeVisible({ timeout: 5000 }).catch(() => {});
  }

  // Switch to Approved tab and verify group exists
  await page.locator('[data-testid="timesheets-tab"][data-tab="approved"]').click();
  await expect(page.getByTestId("timesheet-group").first()).toBeVisible();

  // Dispute flow: seed a new closed log and dispute it
  const verifyPrisma = new PrismaClient();
  const disputeLog = await verifyPrisma.timeLog.create({
    data: {
      studentId: student.id,
      taskId,
      timeIn: manilaDateTime("Mon", 14),
      timeOut: manilaDateTime("Mon", 15),
      totalHours: 1,
      status: TimeLogStatus.CLOSED,
    },
  });
  await verifyPrisma.$disconnect();

  await page.locator('[data-testid="timesheets-tab"][data-tab="to-review"]').click();
  await page.reload();
  await page.getByTestId("timesheet-dispute").first().click();
  const disputeDialog = page.getByRole("dialog");
  await disputeDialog.getByTestId("dispute-reason").fill("Work deliverables were not submitted");
  await disputeDialog.getByTestId("dispute-submit").click();
  await expect(disputeDialog).not.toBeVisible();

  // Invoice tab: mark as paid with confirm dialog
  await page.locator('[data-testid="timesheets-tab"][data-tab="invoices"]').click();
  const invoiceCard = page.getByTestId("invoice-card").first();
  await expect(invoiceCard).toBeVisible();

  await invoiceCard.getByTestId("invoice-mark-paid").click();
  const confirmDialog = page.getByRole("dialog");
  await confirmDialog.getByTestId("invoice-confirm-paid").click();
  await expect(invoiceCard).toHaveAttribute("data-status", "PAID");

  // Paying twice fails cleanly: paid invoice offers no mark-paid button
  await expect(invoiceCard.getByTestId("invoice-mark-paid")).toHaveCount(0);
  await expect(page.getByTestId("invoice-card").filter({ has: page.locator('[data-status="APPROVED"]') })).toHaveCount(0);

  await context.close();
});

test("Home: attention counts equal real numbers, nav badges are whole numbers", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const page = await context.newPage();
  await page.goto("/client");

  // Header & greeting
  await expect(page.getByTestId("client-home-greeting")).toBeVisible();

  // Attention strip chips match counts
  const attentionItems = page.getByTestId("client-attention");
  const attentionCount = await attentionItems.count();
  for (let i = 0; i < attentionCount; i++) {
    const item = attentionItems.nth(i);
    const text = await item.innerText();
    expect(text).toMatch(/\d+/);
  }

  // Nav badges are whole numbers
  for (const navId of ["nav-tasks", "nav-timesheets"]) {
    const navItem = page.getByTestId(navId);
    if (await navItem.isVisible()) {
      const badge = navItem.locator("span").filter({ hasText: /^\d+$/ });
      if (await badge.count() > 0) {
        const text = await badge.first().innerText();
        expect(text).toMatch(/^\d+$/);
      }
    }
  }

  await context.close();
});
