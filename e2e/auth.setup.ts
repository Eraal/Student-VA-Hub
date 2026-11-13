import { test as setup } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { credentials } from "./support/fixture";

setup("login as student and client", async ({ browser }) => {
  await mkdir("e2e/.auth", { recursive: true });
  for (const role of ["student", "client"] as const) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const account = credentials[role];
    await page.goto("/login");
    await page.getByTestId("login-email").fill(account.email);
    await page.getByTestId("login-password").fill(account.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL(new RegExp(`/${role}$`));
    await context.storageState({ path: `e2e/.auth/${role}.json` });
    await context.close();
  }
});
