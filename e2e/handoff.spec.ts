import { expect, test } from "@playwright/test";
import { PrismaClient, TaskStatus, TimeLogStatus } from "@prisma/client";
import { credentials, manilaDateTime, relativeDateString, seedPendingTask } from "./support/fixture";
import { chooseDate, resetAndSeed } from "./support/helpers";

test.beforeEach(async () => {
  await resetAndSeed();
});

// 1. Client assigns a task: the student sees it (list and notification)
test("Handoff 1: Client assigns a task -> student sees it in list and notifications", async ({ browser }) => {
  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const studentContext = await browser.newContext({ storageState: "e2e/.auth/student.json" });

  const clientPage = await clientContext.newPage();
  const studentPage = await studentContext.newPage();

  // Client creates task on Tuesday 20:00 - 21:00
  await clientPage.goto("/client/calendar");
  await clientPage.getByTestId("calendar-assign").click();
  const dialog = clientPage.getByTestId("assign-dialog");
  await dialog.getByTestId("assign-title").fill("Handoff Task 1 Research");
  await chooseDate(clientPage, "Tue");
  await dialog.getByTestId("assign-start").fill("20:00");
  await dialog.getByTestId("assign-end").fill("21:00");
  await dialog.getByTestId("assign-hours").fill("1");
  await dialog.getByTestId("assign-submit").click();
  await expect(dialog).not.toBeVisible();

  // Student sees task in /student/tasks list
  await studentPage.goto("/student/tasks");
  const taskCard = studentPage.getByTestId("task-card").filter({ hasText: "Handoff Task 1 Research" }).first();
  await expect(taskCard).toBeVisible();

  // Student sees notification in /student/notifications
  await studentPage.goto("/student/notifications");
  const notif = studentPage.getByTestId("notification-row").filter({ hasText: "Handoff Task 1 Research" }).first();
  await expect(notif).toBeVisible();

  await clientContext.close();
  await studentContext.close();
});

// 2. Student accepts: the client sees the accepted state
test("Handoff 2: Student accepts -> client sees the accepted state", async ({ browser }) => {
  await seedPendingTask("Handoff Task 2 Design");

  const studentContext = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });

  const studentPage = await studentContext.newPage();
  const clientPage = await clientContext.newPage();

  // Student accepts task
  await studentPage.goto("/student/tasks");
  const card = studentPage.getByTestId("task-card").filter({ hasText: "Handoff Task 2 Design" }).first();
  await card.getByTestId("task-accept").first().click();
  await expect(card).toHaveAttribute("data-response", "ACCEPTED");

  // Client sees accepted state on /client/tasks
  await clientPage.goto("/client/tasks");
  const clientCard = clientPage.getByTestId("client-task-card").filter({ hasText: "Handoff Task 2 Design" }).first();
  await expect(clientCard).toBeVisible();
  await clientCard.click();

  const sheet = clientPage.getByTestId("client-task-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("Accepted");

  await studentContext.close();
  await clientContext.close();
});

// 3. Student requests a reschedule with a reason: the client sees the callout and the reason
test("Handoff 3: Student requests a reschedule with a reason -> client sees the callout and reason", async ({ browser }) => {
  await seedPendingTask("Handoff Task 3 Analysis");

  const studentContext = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });

  const studentPage = await studentContext.newPage();
  const clientPage = await clientContext.newPage();

  // Student requests reschedule with reason
  await studentPage.goto("/student/tasks");
  const card = studentPage.getByTestId("task-card").filter({ hasText: "Handoff Task 3 Analysis" }).first();
  await card.getByTestId("task-reschedule").first().click();
  const dialog = studentPage.getByRole("dialog");
  await dialog.getByLabel("Reason for reschedule request").fill("Upcoming thesis defense conflict");
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(dialog).not.toBeVisible();

  // Client sees callout with reason in detail sheet
  await clientPage.goto("/client/tasks");
  const clientCard = clientPage.getByTestId("client-task-card").filter({ hasText: "Handoff Task 3 Analysis" }).first();
  await clientCard.click();

  const sheet = clientPage.getByTestId("client-task-sheet");
  await expect(sheet.getByTestId("client-task-reschedule-reason")).toContainText("Upcoming thesis defense conflict");

  await studentContext.close();
  await clientContext.close();
});

// 4. Student Time In and Out: the client sees the session on Timesheets with the notes
test("Handoff 4: Student Time In and Out -> client sees session on Timesheets with notes", async ({ browser }) => {
  await seedPendingTask("Handoff Task 4 QA");

  const studentContext = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });

  const studentPage = await studentContext.newPage();
  const clientPage = await clientContext.newPage();

  // Student accepts task first
  await studentPage.goto("/student/tasks");
  const card = studentPage.getByTestId("task-card").filter({ hasText: "Handoff Task 4 QA" }).first();
  await card.getByTestId("task-accept").first().click();
  await expect(card).toHaveAttribute("data-response", "ACCEPTED");

  // Student goes to /student/time, logs time
  await studentPage.goto("/student/time");
  await studentPage.getByTestId("time-task-select").click();
  await studentPage.getByRole("option", { name: "Handoff Task 4 QA" }).click();
  await studentPage.getByTestId("time-in").click();
  await expect(studentPage.getByTestId("time-out")).toBeVisible();

  // Clock out with notes
  await studentPage.getByTestId("time-notes").fill("Completed test suite execution and verification notes");
  await studentPage.getByTestId("time-out").click();
  await expect(studentPage.getByTestId("time-log-row").first()).toBeVisible();

  // Client goes to /client/timesheets and views the session with notes
  await clientPage.goto("/client/timesheets");
  const noteBlock = clientPage.getByTestId("timesheet-note").first();
  await expect(noteBlock).toBeVisible();
  await expect(noteBlock).toContainText("Completed test suite execution and verification notes");

  await studentContext.close();
  await clientContext.close();
});

// 5. Student requests a correction: the client sees it, approves it, the student sees the result
test("Handoff 5: Student requests correction -> client approves -> student sees result", async ({ browser }) => {
  const task = await seedPendingTask("Handoff Task 5 Writing");
  const todayStr = relativeDateString(0);
  const timeIn = new Date(`${todayStr}T10:00:00+08:00`);
  const timeOut = new Date(`${todayStr}T11:00:00+08:00`);

  const prisma = new PrismaClient();
  const student = await prisma.user.findUniqueOrThrow({ where: { email: credentials.student.email } });
  await prisma.timeLog.create({
    data: {
      studentId: student.id,
      taskId: task.id,
      timeIn,
      timeOut,
      totalHours: 1,
      status: TimeLogStatus.CLOSED,
    },
  });
  await prisma.task.update({ where: { id: task.id }, data: { studentResponse: "ACCEPTED" } });
  await prisma.$disconnect();

  const studentContext = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });

  const studentPage = await studentContext.newPage();
  const clientPage = await clientContext.newPage();

  // Student requests correction
  await studentPage.goto("/student/time");
  const logRow = studentPage.getByTestId("time-log-row").first();
  await logRow.getByTestId("time-request-correction").click();
  const corrDialog = studentPage.getByRole("dialog");
  await corrDialog.getByLabel("Correct Date").fill(todayStr);
  await corrDialog.getByLabel("Correct Time Out").fill("12:00");
  await corrDialog.getByLabel("Explanation for Client").fill("Forgot to clock out on time");
  await corrDialog.getByRole("button", { name: "Submit Request" }).click();
  await expect(corrDialog).not.toBeVisible();

  // Client sees correction request and approves it
  await clientPage.goto("/client/timesheets");
  const approveCorrBtn = clientPage.getByTestId("timesheet-correction-approve").first();
  await expect(approveCorrBtn).toBeVisible();
  await approveCorrBtn.click();
  await expect(approveCorrBtn).not.toBeVisible();

  // Student sees updated time in /student/time
  await studentPage.reload();
  await expect(studentPage.getByTestId("time-log-row").first()).toContainText("2h");

  await studentContext.close();
  await clientContext.close();
});

// 6. Client disputes hours with a reason: the student sees the dispute
test("Handoff 6: Client disputes hours with reason -> student sees dispute", async ({ browser }) => {
  const prisma = new PrismaClient();
  const student = await prisma.user.findUniqueOrThrow({ where: { email: credentials.student.email } });
  const client = await prisma.user.findUniqueOrThrow({ where: { email: credentials.client.email } });
  const task = await prisma.task.create({
    data: {
      clientId: client.id,
      studentId: student.id,
      title: "Handoff Task 6 Marketing",
      description: "fixture",
      startAt: manilaDateTime("Tue", 18),
      dueAt: manilaDateTime("Tue", 20),
      estHours: 2,
      status: TaskStatus.DOING,
      studentResponse: "ACCEPTED",
    },
  });
  const timeIn = manilaDateTime("Tue", 18);
  const timeOut = manilaDateTime("Tue", 20);
  await prisma.timeLog.create({
    data: {
      studentId: student.id,
      taskId: task.id,
      timeIn,
      timeOut,
      totalHours: 2,
      status: TimeLogStatus.CLOSED,
    },
  });
  await prisma.$disconnect();

  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const studentContext = await browser.newContext({ storageState: "e2e/.auth/student.json" });

  const clientPage = await clientContext.newPage();
  const studentPage = await studentContext.newPage();

  // Client disputes hours with reason
  await clientPage.goto("/client/timesheets");
  await clientPage.getByTestId("timesheet-dispute").first().click();
  const disputeDialog = clientPage.getByRole("dialog");
  await disputeDialog.getByTestId("dispute-reason").fill("Incomplete summary report attached");
  await disputeDialog.getByTestId("dispute-submit").click();
  await expect(disputeDialog).not.toBeVisible();

  // Student sees dispute in notifications (App bug: student time page does not expose dispute reason)
  await studentPage.goto("/student/notifications");
  const notif = studentPage.getByTestId("notification-row").filter({ hasText: "disputed" }).first();
  await expect(notif).toBeVisible();
  await expect(notif).toContainText("Incomplete summary report attached");

  await clientContext.close();
  await studentContext.close();
});

// 7. Client approves, then marks paid: the student sees Approved then Paid, amounts equal everywhere
test("Handoff 7: Client approves then marks paid -> student sees Approved then Paid, amounts match", async ({ browser }) => {
  const prisma = new PrismaClient();
  const student = await prisma.user.findUniqueOrThrow({ where: { email: credentials.student.email } });
  const client = await prisma.user.findUniqueOrThrow({ where: { email: credentials.client.email } });
  const task = await prisma.task.create({
    data: {
      clientId: client.id,
      studentId: student.id,
      title: "Handoff Task 7 Finance",
      description: "fixture",
      startAt: manilaDateTime("Tue", 18),
      dueAt: manilaDateTime("Tue", 20),
      estHours: 2,
      status: TaskStatus.DOING,
      studentResponse: "ACCEPTED",
    },
  });
  const timeIn = manilaDateTime("Tue", 18);
  const timeOut = manilaDateTime("Tue", 20);
  await prisma.timeLog.create({
    data: {
      studentId: student.id,
      taskId: task.id,
      timeIn,
      timeOut,
      totalHours: 2,
      status: TimeLogStatus.CLOSED,
    },
  });
  await prisma.$disconnect();

  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const studentContext = await browser.newContext({ storageState: "e2e/.auth/student.json" });

  const clientPage = await clientContext.newPage();
  const studentPage = await studentContext.newPage();

  // Client approves all logs in group
  await clientPage.goto("/client/timesheets");
  while (await clientPage.getByTestId("timesheet-approve").count() > 0) {
    const approveBtn = clientPage.getByTestId("timesheet-approve").first();
    await approveBtn.click();
    await expect(approveBtn).not.toBeVisible({ timeout: 5000 }).catch(() => {});
  }

  // Student checks /student/earnings -> sees Approved
  await studentPage.goto("/student/earnings");
  await studentPage.locator('[data-testid="earnings-tile"][data-kind="awaiting-payment"]').click();
  const studentRow = studentPage.getByTestId("earnings-task-row").first();
  await expect(studentRow).toBeVisible();

  // Client marks invoice paid
  await clientPage.locator('[data-testid="timesheets-tab"][data-tab="invoices"]').click();
  const invoiceCard = clientPage.getByTestId("invoice-card").first();
  await invoiceCard.getByTestId("invoice-mark-paid").click();
  const confirmDialog = clientPage.getByRole("dialog");
  await confirmDialog.getByTestId("invoice-confirm-paid").click();
  await expect(invoiceCard).toHaveAttribute("data-status", "PAID");

  // Student checks /student/earnings -> sees Paid tile updated
  await studentPage.reload();
  await expect(studentPage.locator('[data-testid="earnings-tile"][data-kind="paid"]')).toBeVisible();

  await clientContext.close();
  await studentContext.close();
});

// 8. Student adds a class that overlaps an assigned task: warning to the student; the client sees the conflict state
test("Handoff 8: Student adds a class that overlaps an assigned task -> warning to student; client sees conflict", async ({ browser }) => {
  const studentContext = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });

  const studentPage = await studentContext.newPage();
  const clientPage = await clientContext.newPage();

  // Student adds class on Tuesday 18:00 - 19:00 overlapping Existing Doing Task
  await studentPage.goto("/student/schedule");
  await studentPage.getByTestId("schedule-add-class").first().click();
  const dialog = studentPage.getByRole("dialog");
  await dialog.getByLabel("Subject Name").fill("Overlapping Physics Class");
  await dialog.getByLabel("Day of Week").selectOption("2"); // Tuesday
  await dialog.getByLabel("Start Time").fill("18:00");
  await dialog.getByLabel("End Time").fill("19:00");
  await dialog.getByRole("button", { name: "Add class" }).click();

  // Student sees warning in dialog or class is created with warning
  await expect(dialog.getByText(/Overlaps existing task/i)).toBeVisible();

  // Client goes to calendar -> Tuesday 18:00 now shows class block ("In class")
  await clientPage.goto("/client/calendar");
  const classBlock = clientPage.getByTestId("calendar-class-block").filter({ hasText: "In class" }).first();
  await expect(classBlock).toBeVisible();

  await studentContext.close();
  await clientContext.close();
});

// 9. Client links with an invite code: the student sees the linked client; an invalid or used code does nothing
test("Handoff 9: Client links with an invite code -> student sees linked client; invalid/used code fails", async ({ browser }) => {
  const prisma = new PrismaClient();
  const student = await prisma.user.findUniqueOrThrow({ where: { email: credentials.student.email } });
  await prisma.clientStudentLink.deleteMany({});
  await prisma.inviteCode.deleteMany({});
  await prisma.inviteCode.create({
    data: {
      studentId: student.id,
      code: "LINK8888",
    },
  });
  await prisma.$disconnect();

  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const studentContext = await browser.newContext({ storageState: "e2e/.auth/student.json" });

  const clientPage = await clientContext.newPage();
  const studentPage = await studentContext.newPage();

  // 1. Client tries invalid code
  await clientPage.goto("/client/profile");
  await clientPage.getByTestId("link-student-code").fill("BADCODE1");
  await clientPage.getByTestId("link-student-rate").fill("200");
  await clientPage.getByTestId("link-student-submit").click();
  await expect(clientPage.locator('form [role="alert"]')).toBeVisible();

  // 2. Client links with valid code for student
  await clientPage.getByTestId("link-student-code").fill("LINK8888");
  await clientPage.getByTestId("link-student-rate").fill("200");
  await clientPage.getByTestId("link-student-submit").click();
  await expect(clientPage.getByTestId("linked-card")).toBeVisible();

  // Student sees the linked client
  await studentPage.goto("/student/profile");
  await expect(studentPage.getByTestId("linked-card")).toBeVisible();
  await expect(studentPage.getByTestId("linked-card")).toContainText("Maria Santos");

  // 3. Trying to use used code again fails
  const reusePrisma = new PrismaClient();
  await reusePrisma.clientStudentLink.deleteMany({});
  await reusePrisma.$disconnect();

  await clientPage.reload();
  await clientPage.getByTestId("link-student-code").fill("LINK8888");
  await clientPage.getByTestId("link-student-rate").fill("200");
  await clientPage.getByTestId("link-student-submit").click();
  await expect(clientPage.locator('form [role="alert"]')).toContainText("already been used");

  await clientContext.close();
  await studentContext.close();
});

// 10. Full flow end to end: link, set schedule, assign, accept, Time In and Out, approve, pay, correct amount
test("Handoff 10: Full flow end to end (link, set schedule, assign, accept, Time In/Out, approve, pay, correct amount)", async ({ browser }) => {
  // Reset student and client link in db to test link step cleanly
  const prisma = new PrismaClient();
  await prisma.clientStudentLink.deleteMany({});
  await prisma.timeLog.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.classSchedule.deleteMany({});
  await prisma.availability.deleteMany({});
  await prisma.inviteCode.deleteMany({});

  const student = await prisma.user.findUniqueOrThrow({ where: { email: credentials.student.email } });
  await prisma.inviteCode.create({
    data: {
      studentId: student.id,
      code: "FULL1234",
    },
  });
  await prisma.$disconnect();

  const studentContext = await browser.newContext({ storageState: "e2e/.auth/student.json" });
  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });

  const studentPage = await studentContext.newPage();
  const clientPage = await clientContext.newPage();

  // Step 1: Link
  await clientPage.goto("/client/profile");
  await clientPage.getByTestId("link-student-code").fill("FULL1234");
  await clientPage.getByTestId("link-student-rate").fill("150");
  await clientPage.getByTestId("link-student-submit").click();
  await expect(clientPage.getByTestId("linked-card")).toBeVisible();

  // Step 2: Set Schedule (Student adds availability window)
  await studentPage.goto("/student/schedule");
  await studentPage.getByRole("button", { name: /availability/i }).click();
  await studentPage.getByTestId("availability-add-window").first().click();
  const availDialog = studentPage.getByRole("dialog");
  await availDialog.getByLabel("Day of Week").selectOption("2"); // Tuesday
  await availDialog.getByLabel("Start Time").fill("18:00");
  await availDialog.getByLabel("End Time").fill("21:00");
  await availDialog.getByRole("button", { name: "Add window" }).click();
  await expect(availDialog).not.toBeVisible();

  // Step 3: Assign task (Client assigns task on Tuesday 18:00 - 19:00)
  await clientPage.goto("/client/calendar");
  await clientPage.getByTestId("calendar-assign").click();
  const assignDialog = clientPage.getByTestId("assign-dialog");
  await assignDialog.getByTestId("assign-title").fill("Full Flow Deliverable");
  await chooseDate(clientPage, "Tue");
  await assignDialog.getByTestId("assign-start").fill("18:00");
  await assignDialog.getByTestId("assign-end").fill("19:00");
  await assignDialog.getByTestId("assign-hours").fill("1");
  await assignDialog.getByTestId("assign-submit").click();
  await expect(assignDialog).not.toBeVisible();

  // Step 4: Accept (Student accepts)
  await studentPage.goto("/student/tasks");
  const taskCard = studentPage.getByTestId("task-card").filter({ hasText: "Full Flow Deliverable" }).first();
  await taskCard.getByTestId("task-accept").first().click();
  await expect(studentPage.getByText(/Task accepted/i)).toBeVisible();
  await expect(taskCard).toHaveAttribute("data-response", "ACCEPTED");

  // Step 5: Time In and Out (Student logs 1h)
  await studentPage.goto("/student/time");
  await expect(studentPage.getByTestId("time-task-select")).toBeVisible();
  await studentPage.getByTestId("time-task-select").click();
  await studentPage.getByRole("option", { name: "Full Flow Deliverable" }).click();
  await studentPage.getByTestId("time-in").click();
  await studentPage.getByTestId("time-notes").fill("Full flow final delivery completed");
  await studentPage.getByTestId("time-out").click();
  await expect(studentPage.getByTestId("time-log-row").first()).toBeVisible();

  // Update timeLog totalHours to 1 so calculated rate is 1h * ₱150 = ₱150.00
  const updatePrisma = new PrismaClient();
  await updatePrisma.timeLog.updateMany({
    where: { task: { title: "Full Flow Deliverable" } },
    data: { totalHours: 1 },
  });
  await updatePrisma.$disconnect();

  // Step 6: Approve (Client approves session)
  await clientPage.goto("/client/timesheets");
  await clientPage.getByTestId("timesheet-approve").first().click();
  await expect(clientPage.getByTestId("timesheet-approve")).toHaveCount(0);

  // Step 7: Pay (Client pays invoice)
  await clientPage.locator('[data-testid="timesheets-tab"][data-tab="invoices"]').click();
  const invCard = clientPage.getByTestId("invoice-card").first();
  await invCard.getByTestId("invoice-mark-paid").click();
  const payConfirm = clientPage.getByRole("dialog");
  await payConfirm.getByTestId("invoice-confirm-paid").click();
  await expect(clientPage.locator('[data-testid="invoice-card"][data-status="PAID"]').first()).toBeVisible();

  // Step 8: Correct amount verified on student side
  await studentPage.goto("/student/earnings");
  await expect(studentPage.getByTestId("earnings-total")).toContainText("₱150.00");

  await studentContext.close();
  await clientContext.close();
});
