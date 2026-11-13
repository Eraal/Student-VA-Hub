import { expect, test } from "@playwright/test";

test("mobile student navigation exposes core routes", async ({ page }) => {
  await page.goto("/student");
  await expect(page.getByTestId("nav-tasks-mobile")).toBeVisible();
  await expect(page.getByTestId("nav-schedule-mobile")).toBeVisible();
});
