#!/usr/bin/env node

/**
 * check-no-demo-creds.mjs
 *
 * Scans the production build output (.next/static) to ensure no demo credentials
 * (emails or seed passwords) are leaked into client JavaScript bundles.
 *
 * Exit code 0 on clean build, 1 if any forbidden string is discovered.
 */

import fs from "node:fs";
import path from "node:path";

const FORBIDDEN_STRINGS = [
  "maria@example.com",
  "juan@example.com",
  "demo1234",
];

const TARGET_DIR = path.resolve(process.cwd(), ".next", "static");

if (!fs.existsSync(TARGET_DIR)) {
  console.error(`[check:no-demo-creds] Error: ${TARGET_DIR} does not exist. Run 'npm run build' first.`);
  process.exit(1);
}

function scanDirectory(dir, forbiddenStrings) {
  const matches = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      matches.push(...scanDirectory(fullPath, forbiddenStrings));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".js") || entry.name.endsWith(".html") || entry.name.endsWith(".json"))
    ) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const str of forbiddenStrings) {
        if (content.includes(str)) {
          matches.push({ file: fullPath, pattern: str });
        }
      }
    }
  }

  return matches;
}

console.log(`[check:no-demo-creds] Scanning ${TARGET_DIR} for demo credentials...`);
const findings = scanDirectory(TARGET_DIR, FORBIDDEN_STRINGS);

if (findings.length > 0) {
  console.error(`[check:no-demo-creds] FAILED: Demo credentials found in production build output:`);
  for (const f of findings) {
    console.error(`  - Found "${f.pattern}" in ${path.relative(process.cwd(), f.file)}`);
  }
  process.exit(1);
}

console.log(`[check:no-demo-creds] SUCCESS: No demo credentials found in production build output (.next/static).`);
process.exit(0);

