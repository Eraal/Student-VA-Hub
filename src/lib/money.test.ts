import { describe, it, expect } from "vitest";
import {
  calculateLoggedMinutes,
  calculateLoggedHours,
  hoursToMinutes,
  calculateLogAmount,
  sumMoney,
  calculateTotalAmountFromLogs,
} from "./money";
import fs from "fs";
import path from "path";

describe("lib/money.ts — Single Source of Truth for Time & Money", () => {
  describe("1. Whole-minute duration & rounding", () => {
    it("Acceptance test #3: 6:00 PM to 9:00 PM at ₱150/hr computes 3h, ₱450.00", () => {
      // 6:00 PM to 9:00 PM Manila is 3 hours = 180 minutes
      const tIn = new Date("2026-11-16T10:00:00.000Z"); // 6:00 PM Manila
      const tOut = new Date("2026-11-16T13:00:00.000Z"); // 9:00 PM Manila

      const minutes = calculateLoggedMinutes(tIn, tOut);
      expect(minutes).toBe(180);

      const hours = calculateLoggedHours(tIn, tOut);
      expect(hours).toBe(3.0);

      const amount = calculateLogAmount(hours, 150);
      expect(amount).toBe(450.0);
    });

    it("calculates 1h session plus 1m session at ₱150/hr to equal ₱152.50", () => {
      const h1 = 1.0; // 60 minutes
      const m1 = 1 / 60; // 1 minute

      const amount1h = calculateLogAmount(h1, 150);
      const amount1m = calculateLogAmount(m1, 150);

      expect(amount1h).toBe(150.0);
      expect(amount1m).toBe(2.5); // 1 minute = ₱2.50

      const total = sumMoney([amount1h, amount1m]);
      expect(total).toBe(152.5);
    });

    it("calculates 4h 1m across several logs at ₱150/hr to equal ₱602.50", () => {
      // 4 logs of 1h + 1 log of 1m
      const log1 = 1.0;
      const log2 = 1.0;
      const log3 = 1.0;
      const log4 = 1.0;
      const log5 = 1 / 60;

      const amounts = [
        calculateLogAmount(log1, 150),
        calculateLogAmount(log2, 150),
        calculateLogAmount(log3, 150),
        calculateLogAmount(log4, 150),
        calculateLogAmount(log5, 150),
      ];

      expect(amounts).toEqual([150.0, 150.0, 150.0, 150.0, 2.5]);
      expect(sumMoney(amounts)).toBe(602.5);
    });

    it("calculates a rate with decimals (₱175/hr, 1 minute = ₱2.92) and rows add up to the total", () => {
      // Rate: ₱175/hr. 1 min: Math.round(1 * 17500 / 60) = 292 centavos = ₱2.92
      const amount1m = calculateLogAmount(1 / 60, 175);
      expect(amount1m).toBe(2.92);

      const row1 = calculateLogAmount(1.0, 175); // 60 min -> ₱175.00
      const row2 = calculateLogAmount(0.5, 175); // 30 min -> ₱87.50
      const row3 = calculateLogAmount(1 / 60, 175); // 1 min -> ₱2.92

      const rows = [row1, row2, row3];
      const total = sumMoney(rows);

      expect(rows).toEqual([175.0, 87.5, 2.92]);
      expect(total).toBe(265.42);
      expect(total).toBe(row1 + row2 + row3);
    });

    it("correctly maps legacy stored 2-decimal hours (0.01, 0.02, 1.02)", () => {
      expect(hoursToMinutes(0.01)).toBe(1); // 0.01 * 60 = 0.6 -> 1 min
      expect(hoursToMinutes(0.02)).toBe(1); // 0.02 * 60 = 1.2 -> 1 min
      expect(hoursToMinutes(1.02)).toBe(61); // 1.02 * 60 = 61.2 -> 61 min
      expect(hoursToMinutes(3.0)).toBe(180);

      // Legacy 0.01 at ₱150/hr correctly yields 1 minute (₱2.50)
      expect(calculateLogAmount(0.01, 150)).toBe(2.5);
      // Legacy 1.02 at ₱150/hr yields 61 minutes (₱152.50)
      expect(calculateLogAmount(1.02, 150)).toBe(152.5);
    });

    it("handles sessions crossing midnight in Asia/Manila", () => {
      // Nov 16 11:30 PM Manila (15:30 UTC) to Nov 17 1:00 AM Manila (17:00 UTC) = 90 min (1.5h)
      const tIn = new Date("2026-11-16T15:30:00.000Z");
      const tOut = new Date("2026-11-16T17:00:00.000Z");

      const minutes = calculateLoggedMinutes(tIn, tOut);
      expect(minutes).toBe(90);

      const hours = calculateLoggedHours(tIn, tOut);
      expect(hours).toBe(1.5);

      const amount = calculateLogAmount(hours, 150);
      expect(amount).toBe(225.0);
    });

    it("rejects zero or negative duration", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000);

      expect(() => calculateLoggedMinutes(now, past)).toThrow("Time Out must be after Time In.");
      expect(() => calculateLoggedMinutes(now, now)).toThrow("Time Out must be after Time In.");
      expect(() => calculateLoggedHours(now, past)).toThrow("Time Out must be after Time In.");
    });

    it("bills sub-minute sessions as 1 minute", () => {
      const tIn = new Date("2026-11-16T10:00:00.000Z");
      // 10 seconds later
      const tOut10s = new Date("2026-11-16T10:00:10.000Z");
      expect(calculateLoggedMinutes(tIn, tOut10s)).toBe(1);
      expect(calculateLoggedHours(tIn, tOut10s)).toBe(1 / 60);

      // 45 seconds later
      const tOut45s = new Date("2026-11-16T10:00:45.000Z");
      expect(calculateLoggedMinutes(tIn, tOut45s)).toBe(1);
    });

    it("calculates three 20-minute sessions at ₱150/hr to equal ₱50.00 each and ₱150.00 total", () => {
      // 20 minutes = 20/60 = 0.3333... hours
      const h20m = 20 / 60;
      const rate = 150;

      const session1 = calculateLogAmount(h20m, rate);
      const session2 = calculateLogAmount(h20m, rate);
      const session3 = calculateLogAmount(h20m, rate);

      expect(session1).toBe(50.0);
      expect(session2).toBe(50.0);
      expect(session3).toBe(50.0);

      const total = sumMoney([session1, session2, session3]);
      expect(total).toBe(150.0);

      const totalFromLogs = calculateTotalAmountFromLogs(
        [{ totalHours: h20m }, { totalHours: h20m }, { totalHours: h20m }],
        rate
      );
      expect(totalFromLogs).toBe(150.0);
      expect(totalFromLogs).toBe(total);
    });

    it("calculates 31 minutes at ₱150/hr to give ₱77.50", () => {
      // 31 minutes = 31/60 hours. 31 * 15000 / 60 = 7750 centavos = ₱77.50
      const h31m = 31 / 60;
      const rate = 150;

      const amount = calculateLogAmount(h31m, rate);
      expect(amount).toBe(77.5);
    });

    it("enforces that invoice amount is the sum of rounded line amounts when per-log rounding differs (e.g. 3 x 20m @ ₱160/hr = ₱159.99)", () => {
      // 20 min @ ₱160/hr: Math.round(20 * 16000 / 60) = 5333 centavos = ₱53.33
      const h20m = 20 / 60;
      const rate = 160;

      const line1 = calculateLogAmount(h20m, rate);
      const line2 = calculateLogAmount(h20m, rate);
      const line3 = calculateLogAmount(h20m, rate);

      expect(line1).toBe(53.33);
      expect(line2).toBe(53.33);
      expect(line3).toBe(53.33);

      const lineItemsSum = sumMoney([line1, line2, line3]);
      expect(lineItemsSum).toBe(159.99);

      const invoiceAmount = calculateTotalAmountFromLogs(
        [{ totalHours: h20m }, { totalHours: h20m }, { totalHours: h20m }],
        rate
      );
      // Invoice total must equal the sum of rounded line amounts exactly
      expect(invoiceAmount).toBe(159.99);
      expect(invoiceAmount).toBe(lineItemsSum);
    });
  });

  describe("2. Batch approval & accumulation equality", () => {
    it("two approval batches on the same invoice equal the sum of their logs", () => {
      const rate = 150;
      // Batch 1: log A (2h) + log B (1.5h)
      const logA = calculateLogAmount(2.0, rate); // 300
      const logB = calculateLogAmount(1.5, rate); // 225
      const batch1Amount = sumMoney([logA, logB]); // 525

      // Batch 2: log C (1h) + log D (1m)
      const logC = calculateLogAmount(1.0, rate); // 150
      const logD = calculateLogAmount(1 / 60, rate); // 2.50
      const batch2Amount = sumMoney([logC, logD]); // 152.50

      const invoiceTotal = sumMoney([batch1Amount, batch2Amount]);
      const individualLogsSum = sumMoney([logA, logB, logC, logD]);

      expect(invoiceTotal).toBe(677.5);
      expect(invoiceTotal).toBe(individualLogsSum);
    });

    it("client timesheet row amounts sum to the invoice amount", () => {
      const rate = 150;
      const logs = [
        { totalHours: 1.0 },
        { totalHours: 0.75 }, // 45 min
        { totalHours: 1.5 },
        { totalHours: 1 / 60 }, // 1 min
      ];

      const rowAmounts = logs.map((l) => calculateLogAmount(l.totalHours, rate));
      const timesheetTotal = sumMoney(rowAmounts);
      const invoiceAmount = calculateTotalAmountFromLogs(logs, rate);

      expect(rowAmounts).toEqual([150.0, 112.5, 225.0, 2.5]);
      expect(timesheetTotal).toBe(490.0);
      expect(invoiceAmount).toBe(490.0);
      expect(timesheetTotal).toBe(invoiceAmount);
    });
  });

  describe("3. Architecture Guard Test: Single Source of Truth", () => {
    it("ensures no file outside src/lib/money.ts contains manual rate multiplications on money", () => {
      const srcDir = path.resolve(__dirname, "..");
      const forbiddenPatterns = [
        /\*\s*hourlyRate\b/,
        /\*\s*data\.hourlyRate\b/,
        /\bhourlyRate\s*\*/,
        /\bdata\.hourlyRate\s*\*/,
        /\bnewTotalHours\s*\*\s*rate\b/,
        /\blogHours\s*\*\s*rate\b/,
      ];

      const violations: { file: string; line: number; text: string }[] = [];

      function scanDir(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name !== "node_modules" && entry.name !== ".next") {
              scanDir(fullPath);
            }
          } else if (
            (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
            !entry.name.includes("money.ts") &&
            !entry.name.includes("money.test.ts")
          ) {
            const content = fs.readFileSync(fullPath, "utf-8");
            const lines = content.split("\n");
            lines.forEach((lineText, idx) => {
              // Ignore comments
              const trimmed = lineText.trim();
              if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
                return;
              }
              for (const pattern of forbiddenPatterns) {
                if (pattern.test(lineText)) {
                  violations.push({
                    file: path.relative(srcDir, fullPath),
                    line: idx + 1,
                    text: trimmed,
                  });
                }
              }
            });
          }
        }
      }

      scanDir(srcDir);

      if (violations.length > 0) {
        console.error("Single Source of Truth violations found:", violations);
      }
      expect(violations).toEqual([]);
    });
  });
});

