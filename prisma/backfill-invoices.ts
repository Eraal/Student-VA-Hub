import { prisma } from "../src/lib/prisma";
import { TimeLogStatus } from "@prisma/client";

/**
 * Safe backfill script to link existing approved TimeLogs without an invoiceId
 * to their corresponding Invoices.
 *
 * Safety rules:
 * - Only operates on TimeLogs where invoiceId is null.
 * - Only links if student and client match.
 * - Validates hours match to avoid misattribution.
 * - Safe to run multiple times (idempotent).
 */
export async function backfillInvoices(): Promise<{ linkedCount: number }> {
  console.log("Starting safe invoice backfill...");

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "asc" },
  });

  let linkedCount = 0;

  for (const invoice of invoices) {
    // Find unlinked approved logs for this student and client
    const unlinkedLogs = await prisma.timeLog.findMany({
      where: {
        studentId: invoice.studentId,
        invoiceId: null,
        status: TimeLogStatus.APPROVED,
        task: { clientId: invoice.clientId },
      },
      orderBy: { createdAt: "asc" },
    });

    if (unlinkedLogs.length === 0) continue;

    // 1. Check if a single unlinked log matches the invoice totalHours exactly
    const exactMatch = unlinkedLogs.find(
      (l) => Math.abs((l.totalHours ?? 0) - invoice.totalHours) < 0.001
    );

    if (exactMatch) {
      await prisma.timeLog.update({
        where: { id: exactMatch.id },
        data: { invoiceId: invoice.id },
      });
      console.log(
        `✓ Linked log ${exactMatch.id} (${exactMatch.totalHours}h) to invoice ${invoice.id}`
      );
      linkedCount++;
      continue;
    }

    // 2. Check if a group of unlinked logs up to invoice creation time sum to invoice totalHours
    const priorLogs = unlinkedLogs.filter(
      (l) => l.createdAt.getTime() <= invoice.createdAt.getTime() + 5000
    );
    const sumHours = priorLogs.reduce((acc, l) => acc + (l.totalHours ?? 0), 0);
    const roundedSum = Math.round(sumHours * 60) / 60;
    const roundedInv = Math.round(invoice.totalHours * 60) / 60;

    if (priorLogs.length > 0 && Math.abs(roundedSum - roundedInv) < 0.001) {
      await prisma.timeLog.updateMany({
        where: { id: { in: priorLogs.map((l) => l.id) } },
        data: { invoiceId: invoice.id },
      });
      console.log(
        `✓ Linked ${priorLogs.length} logs (${roundedSum}h) to invoice ${invoice.id}`
      );
      linkedCount += priorLogs.length;
    }
  }

  console.log(`Backfill finished. Successfully linked ${linkedCount} log(s).`);
  return { linkedCount };
}

if (process.argv[1]?.endsWith("backfill-invoices.ts")) {
  backfillInvoices()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error("Backfill failed:", e);
      await prisma.$disconnect();
      process.exit(1);
    });
}

