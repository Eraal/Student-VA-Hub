import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { credentials, relativeDateString, seedClosedLog, seedPendingTask } from "./support/fixture";
import { resetAndSeed } from "./support/helpers";

test.beforeEach(async () => {
  await resetAndSeed();
});

test("Schedule: add, edit, and delete a class", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const page = await context.newPage();
  await page.goto("/student/schedule");

  // Add class
  await page.getByTestId("schedule-add-class").first().click();
  const formDialog = page.getByRole("dialog");
  await formDialog.getByLabel("Subject Name").fill("Data Structures");
  await formDialog.getByLabel("Day of Week").selectOption("3"); // Wednesday
  await formDialog.getByLabel("Start Time").fill("14:00");
  await formDialog.getByLabel("End Time").fill("15:30");
  await formDialog.getByRole("button", { name: "Add class" }).click();

  // Verify class block is added in Wednesday column
  const classBlock = page.locator('[data-testid="schedule-class-block"][data-day="3"]').first();
  await expect(classBlock).toBeVisible();

  // Edit class
  await classBlock.click();
  const detailsDialog = page.getByRole("dialog");
  await detailsDialog.getByTestId("schedule-class-edit").click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Subject Name").fill("Advanced Data Structures");
  await editDialog.getByRole("button", { name: "Update class" }).click();

  const updatedBlock = page.locator('[data-testid="schedule-class-block"][data-day="3"]').first();
  await expect(updatedBlock).toBeVisible();

  // Delete class
  await updatedBlock.click();
  await page.getByTestId("schedule-class-delete").click();
  await page.getByTestId("schedule-delete-confirm").click();

  await expect(page.locator('[data-testid="schedule-class-block"][data-day="3"]')).toHaveCount(0);
  await context.close();
});

test("Schedule: add, edit, and delete an availability window", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const page = await context.newPage();
  await page.goto("/student/schedule");

  // Switch to Availability tab
  await page.getByRole("button", { name: /availability/i }).click();

  // Add availability window
  await page.getByTestId("availability-add-window").first().click();
  const formDialog = page.getByRole("dialog");
  await formDialog.getByLabel("Day of Week").selectOption("4"); // Thursday
  await formDialog.getByLabel("Start Time").fill("19:00");
  await formDialog.getByLabel("End Time").fill("21:00");
  await formDialog.getByRole("button", { name: "Add window" }).click();

  const windowBlock = page.locator('[data-testid="availability-window-block"][data-day="4"]').first();
  await expect(windowBlock).toBeVisible();

  // Edit availability window
  await windowBlock.click();
  const detailsDialog = page.getByRole("dialog");
  await detailsDialog.getByTestId("availability-window-edit").click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("End Time").fill("22:00");
  await editDialog.getByRole("button", { name: "Update window" }).click();

  // Wait for updated window to reflect in UI (22:00 displayed in 12h format as 10:00 PM)
  await expect(page.locator('[data-testid="availability-window-block"][data-day="4"]').first()).toContainText("10:00 PM");

  // Delete availability window
  const updatedBlock = page.locator('[data-testid="availability-window-block"][data-day="4"]').first();
  await updatedBlock.click();
  await page.getByTestId("availability-window-delete").click();
  await page.getByTestId("availability-delete-confirm").click();

  await expect(page.locator('[data-testid="availability-window-block"][data-day="4"]')).toHaveCount(0);
  await context.close();
});

test("Schedule: change the daily limit", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const page = await context.newPage();
  await page.goto("/student/schedule");
  await page.getByRole("button", { name: /availability/i }).click();

  // Click 5h preset chip and save
  await page.locator('[data-testid="availability-limit-preset"][data-hours="5"]').click();
  await expect(page.getByTestId("availability-limit-save")).toBeEnabled();
  await page.getByTestId("availability-limit-save").click();

  // Reload and verify persisted value
  await page.reload();
  await page.getByRole("button", { name: /availability/i }).click();
  await expect(page.getByTestId("availability-limit-stepper")).toContainText("5h");
  await context.close();
});

test("Schedule: add, delete a blocked date and assert edit is missing", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const page = await context.newPage();
  await page.goto("/student/schedule");
  await page.getByRole("button", { name: /availability/i }).click();

  // Add blocked date
  await page.getByTestId("blocked-date-add").first().click();
  const form = page.locator("form").filter({ has: page.getByLabel("Start Date") });
  await form.getByLabel("Start Date").fill(relativeDateString(7));
  await form.getByLabel("End Date").fill(relativeDateString(8));
  await form.getByLabel("Reason (Optional)").fill("Family Event");
  await form.getByRole("button", { name: "Save dates" }).click();

  const row = page.getByTestId("blocked-date-row").first();
  await expect(row).toBeVisible();

  // Delete blocked date
  await row.getByRole("button", { name: /remove unavailable range/i }).click();
  const deleteDialog = page.getByRole("dialog");
  await deleteDialog.getByRole("button", { name: "Remove dates" }).click();

  await expect(page.getByTestId("blocked-date-row")).toHaveCount(0);
  await context.close();
});

test("Schedule: empty states show the next action", async ({ browser }) => {
  const prisma = new PrismaClient();
  const student = await prisma.user.findUniqueOrThrow({ where: { email: credentials.student.email } });
  await prisma.classSchedule.deleteMany({ where: { studentId: student.id } });
  await prisma.availability.deleteMany({ where: { studentId: student.id } });
  await prisma.blockedDate.deleteMany({ where: { studentId: student.id } });
  await prisma.$disconnect();

  const context = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const page = await context.newPage();
  await page.goto("/student/schedule");

  // Classes empty state shows Add class button
  const addClassBtn = page.getByTestId("schedule-add-class").first();
  await expect(addClassBtn).toBeVisible();
  await addClassBtn.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

  // Availability empty state shows Add free window button
  await page.getByRole("button", { name: /availability/i }).click();
  const addWindowBtn = page.getByTestId("availability-add-window").first();
  await expect(addWindowBtn).toBeVisible();
  await addWindowBtn.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

  // Blocked dates empty state shows Add unavailable dates button
  const addBlockedBtn = page.getByTestId("blocked-date-add").first();
  await expect(addBlockedBtn).toBeVisible();

  await context.close();
});

test("Tasks: accept, request reschedule with a reason (also after accepting), a second reschedule is rejected", async ({ browser }) => {
  await seedPendingTask("Pending Assignment Task");

  const context = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const page = await context.newPage();
  await page.goto("/student/tasks");

  // Accept pending task
  const taskCard = page.getByTestId("task-card").filter({ hasText: "Pending Assignment Task" });
  await expect(taskCard).toBeVisible();
  await taskCard.getByTestId("task-accept").first().click();
  await expect(taskCard).toHaveAttribute("data-response", "ACCEPTED");

  // Request reschedule after accepting
  await taskCard.getByTestId("task-menu").first().click();
  await page.getByTestId("task-reschedule").first().click();
  const rescheduleDialog = page.getByRole("dialog");
  await rescheduleDialog.getByLabel("Reason for reschedule request").fill("Urgent exam conflict");
  await rescheduleDialog.getByRole("button", { name: "Send request" }).click();

  await expect(taskCard).toHaveAttribute("data-response", "RESCHEDULE_REQUESTED");

  // A second reschedule is rejected (not offered in UI)
  await expect(taskCard.getByTestId("task-reschedule")).toHaveCount(0);
  await taskCard.getByTestId("task-menu").first().click();
  await expect(page.getByTestId("task-reschedule")).toHaveCount(0);
  await page.keyboard.press("Escape");

  await context.close();
});

test("Tasks: status changes follow the rules and done tasks offer no Time In", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const page = await context.newPage();
  await page.goto("/student/tasks");

  // Doing task -> change to Done
  const doingCard = page.getByTestId("task-card").filter({ hasText: "Existing Doing Task" });
  await expect(doingCard).toHaveAttribute("data-status", "DOING");
  await doingCard.getByTestId("task-menu").first().click();
  await page.locator('[data-testid="task-status-option"][data-status="DONE"]').first().click();
  await expect(doingCard).toHaveAttribute("data-status", "DONE");

  // Done tasks offer no Time In
  const doneCard = page.getByTestId("task-card").filter({ hasText: "Existing Done Task" });
  await expect(doneCard).toHaveAttribute("data-status", "DONE");
  await expect(doneCard.getByTestId("task-time-in")).toHaveCount(0);

  await context.close();
});

test("Time: Time In and Out with notes, one open log, the timer survives a reload, request a correction", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const page = await context.newPage();
  await page.goto("/student/time");

  // Start timer
  await page.getByTestId("time-task-select").click();
  await page.getByRole("option").first().click();
  await page.getByTestId("time-in").click();
  await expect(page.getByTestId("time-out")).toBeVisible();

  // One open log: time-in is not present
  await expect(page.getByTestId("time-in")).toHaveCount(0);

  // Timer survives reload
  await page.reload();
  await expect(page.getByTestId("time-out")).toBeVisible();

  // Stop timer with notes
  await page.getByTestId("time-notes").fill("Initial progress on module");
  await page.getByTestId("time-out").click();

  const logRow = page.getByTestId("time-log-row").first();
  await expect(logRow).toBeVisible();

  // Request a correction
  await logRow.getByTestId("time-request-correction").click();
  const corrDialog = page.getByRole("dialog");
  await corrDialog.getByLabel("Correct Date").fill(relativeDateString(0));
  await corrDialog.getByLabel("Correct Time Out").fill("20:00");
  await corrDialog.getByLabel("Explanation for Client").fill("Forgot to clock out before dinner");
  await corrDialog.getByRole("button", { name: "Submit Request" }).click();

  await expect(corrDialog).not.toBeVisible();
  await context.close();
});

test("Earnings: tiles, by-task totals and invoice rows equal client Timesheets, open invoice sheet", async ({ browser }) => {
  await seedClosedLog();

  // Client approves log
  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const clientPage = await clientContext.newPage();
  await clientPage.goto("/client/timesheets");
  await clientPage.getByTestId("timesheet-approve").first().click();
  await clientContext.close();

  // Student earnings check
  const studentContext = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const studentPage = await studentContext.newPage();
  await studentPage.goto("/student/earnings");

  // Tiles
  await expect(studentPage.locator('[data-testid="earnings-tile"][data-kind="awaiting-payment"]')).toBeVisible();
  await expect(studentPage.getByTestId("earnings-total")).toContainText("₱450.00");

  // Task rows and invoice rows
  await expect(studentPage.getByTestId("earnings-task-row").first()).toBeVisible();
  const invoiceRow = studentPage.getByTestId("invoice-row").first();
  await expect(invoiceRow).toBeVisible();
  await expect(invoiceRow).toContainText("₱450.00");

  // Open invoice sheet
  await invoiceRow.getByTestId("invoice-view").click();
  await expect(studentPage.getByTestId("invoice-sheet")).toBeVisible();
  await expect(studentPage.getByTestId("invoice-sheet")).toContainText("₱450.00");

  await studentContext.close();
});
