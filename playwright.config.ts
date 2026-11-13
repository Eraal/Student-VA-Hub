import { defineConfig, devices } from "@playwright/test";

if (!process.env.TEST_DATABASE_URL) {
  process.env.TEST_DATABASE_URL = "postgresql://postgres:admin@127.0.0.1:5432/student_va_hub_test";
}

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    viewport: { width: 1280, height: 800 },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "chromium", dependencies: ["setup"], testIgnore: /smoke\.spec\.ts/, use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/student.json" } },
    { name: "mobile", dependencies: ["setup"], testMatch: /smoke\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, storageState: "e2e/.auth/student.json" } },
  ],
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      AUTH_URL: baseURL,
    },
  },
});
