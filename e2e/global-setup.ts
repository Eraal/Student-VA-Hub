import type { FullConfig } from "@playwright/test";
import { resetDb, seedFixture, migrateTestDb } from "./support/fixture";

export default async function globalSetup(_config: FullConfig) {
  migrateTestDb();
  await resetDb();
  await seedFixture();
}
