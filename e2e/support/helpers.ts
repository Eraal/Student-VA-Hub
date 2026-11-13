import { expect, type Page } from "@playwright/test";
import { credentials, resetDb, seedFixture } from "./fixture";

export async function loginAs(page: Page, role: "student" | "client") {
  const account = credentials[role];
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByTestId("login-email").fill(account.email);
  await page.getByTestId("login-password").fill(account.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(new RegExp(`/${role}$`));
}

export async function resetAndSeed() {
  await resetDb();
  await seedFixture();
}

export async function createTaskViaUi(page: Page, input: { title: string; date: string; start: string; end: string; hours: string }) {
  await page.getByTestId("calendar-assign").click();
  const dialog = page.getByTestId("assign-dialog");
  await dialog.getByTestId("assign-title").fill(input.title);
  await dialog.getByTestId("assign-date").click();
  await page.getByRole("dialog").getByRole("button", { name: new RegExp(input.date) }).click();
  await dialog.getByTestId("assign-start").fill(input.start);
  await dialog.getByTestId("assign-end").fill(input.end);
  await dialog.getByTestId("assign-hours").fill(input.hours);
  await expect(dialog.getByTestId("assign-check")).toBeVisible();
  return dialog;
}

export async function openAssignDialog(page: Page) {
  await loginAs(page, "client");
  await page.goto("/client/calendar");
  await page.getByTestId("calendar-assign").click();
  return page.getByTestId("assign-dialog");
}

export async function expectNoRawValues(page: Page) {
  const html = await page.locator("html").innerHTML();
  for (const value of ["Secret Subject", "Hidden Class"]) expect(html).not.toContain(value);
}
