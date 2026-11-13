/**
 * Dev-only script to seed 25 notifications for testing pagination / "Load more".
 * Refuses to run if NODE_ENV is "production".
 *
 * Usage:
 *   npx tsx scripts/seed-many-notifications.ts <user-email>
 *
 * Examples:
 *   npx tsx scripts/seed-many-notifications.ts juan@example.com
 *   npx tsx scripts/seed-many-notifications.ts maria@example.com
 */

import { PrismaClient, Role } from "@prisma/client";
import { createNotification, NotificationType } from "../src/lib/notifications";
import { formatHours, formatPeso } from "../src/lib/format";

function assertSeedAllowed(scriptName: string = "scripts/seed-many-notifications.ts") {
  if (process.env.ALLOW_SEED === "1") {
    return;
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      `❌ [Seed Safety Guard]: ${scriptName} refused to run because NODE_ENV is 'production'.\n` +
      "To deliberately override this safety check, set ALLOW_SEED=1."
    );
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(
      `❌ [Seed Safety Guard]: ${scriptName} refused to run because DATABASE_URL is not set.\n` +
      "To deliberately override this safety check, set ALLOW_SEED=1."
    );
    process.exit(1);
  }

  let host = "";
  try {
    const parsed = new URL(dbUrl);
    host = parsed.hostname;
  } catch {
    const match = dbUrl.match(/@([^:/]+)/);
    if (match) {
      host = match[1];
    }
  }

  const allowedHosts = ["localhost", "127.0.0.1"];
  if (process.env.ALLOW_SEED_HOSTS) {
    const extraHosts = process.env.ALLOW_SEED_HOSTS.split(",").map((h) => h.trim()).filter(Boolean);
    allowedHosts.push(...extraHosts);
  }

  if (!host || !allowedHosts.includes(host)) {
    console.error(
      `❌ [Seed Safety Guard]: ${scriptName} refused to run because DATABASE_URL host '${host || "unknown"}' is not local.\n` +
      `Allowed hosts: ${allowedHosts.join(", ")}.\n` +
      "To deliberately override this safety check, set ALLOW_SEED=1."
    );
    process.exit(1);
  }
}

assertSeedAllowed("scripts/seed-many-notifications.ts");

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || "juan@example.com";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`❌ User not found with email: ${email}`);
    process.exit(1);
  }

  // Find or determine actor with the opposite role
  const actorRole = user.role === Role.STUDENT ? Role.CLIENT : Role.STUDENT;
  let actor = await prisma.user.findFirst({ where: { role: actorRole } });
  if (!actor) {
    // Fallback: any other user in database
    actor = await prisma.user.findFirst({ where: { id: { not: user.id } } });
  }

  if (!actor) {
    console.error("❌ No actor user found to attribute notifications.");
    process.exit(1);
  }

  console.log(`Adding 25 notifications for ${user.name} (${user.email}) from actor ${actor.name} (${actor.email})...`);

  // Role-specific templates
  const studentTemplates: Array<{
    type: NotificationType;
    getMsg: (idx: number) => string;
  }> = [
    {
      type: "TASK_ASSIGNED",
      getMsg: (i) => `${actor!.name} assigned you a task: Research Module #${i + 1}`,
    },
    {
      type: "HOURS_APPROVED",
      getMsg: (i) => `${actor!.name} approved ${formatHours(2)} for Task #${i + 1}. Invoice total: ${formatPeso(300)}`,
    },
    {
      type: "INVOICE_PAID",
      getMsg: (i) => `${actor!.name} marked your ${formatPeso(300 + (i % 5) * 50)} invoice as paid`,
    },
    {
      type: "HOURS_DISPUTED",
      getMsg: (i) => `${actor!.name} disputed 1 hr on Task #${i + 1}. Reason: Time tracking discrepancy.`,
    },
    {
      type: "CORRECTION_APPROVED",
      getMsg: (i) => `${actor!.name} approved your time correction on Task #${i + 1}. New total: 2 hrs`,
    },
    {
      type: "CORRECTION_REJECTED",
      getMsg: (i) => `${actor!.name} declined your time correction on Task #${i + 1}`,
    },
  ];

  const clientTemplates: Array<{
    type: NotificationType;
    getMsg: (idx: number) => string;
  }> = [
    {
      type: "TASK_ACCEPTED",
      getMsg: (i) => `${actor!.name} accepted: Research Module #${i + 1}`,
    },
    {
      type: "RESCHEDULE_REQUESTED",
      getMsg: (i) => `${actor!.name} asked to reschedule Task #${i + 1}. Reason: Scheduling conflict with class.`,
    },
    {
      type: "HOURS_SUBMITTED",
      getMsg: (i) => `${actor!.name} logged ${formatHours(1.5)} on Task #${i + 1}`,
    },
    {
      type: "CORRECTION_REQUESTED",
      getMsg: (i) => `${actor!.name} requested a time correction on Task #${i + 1}`,
    },
  ];

  const templates = user.role === Role.STUDENT ? studentTemplates : clientTemplates;
  const now = Date.now();

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < 25; i++) {
      const template = templates[i % templates.length];
      const created = await createNotification(tx, {
        type: template.type,
        recipientId: user.id,
        actorId: actor!.id,
        message: template.getMsg(i),
      });

      // Spread creation timestamps backwards (e.g., 20 mins apart)
      const createdAt = new Date(now - (i * 20 * 60 * 1000));
      // First 5 unread, remaining 20 read
      const isRead = i >= 5;

      await tx.notification.update({
        where: { id: created.id },
        data: {
          createdAt,
          readAt: isRead ? createdAt : null,
        },
      });
    }
  });

  console.log(`✅ Successfully created 25 notifications for ${user.email} through createNotification in a transaction!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

