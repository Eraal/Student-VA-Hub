import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("login UI accepts credentials and redirects by role", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("login-email").fill("juan@example.com");
  await page.getByTestId("login-password").fill("demo1234");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/student$/);
});
