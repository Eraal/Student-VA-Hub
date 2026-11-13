import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "../prisma";
import { Role } from "@prisma/client";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "./notification";

// Mock auth and revalidatePath
const mockSession = {
  user: {
    id: "user-a",
    email: "user-a@example.com",
    role: Role.STUDENT,
  },
};

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Notification Server Actions - User Isolation", () => {
  let userAId = "";
  let userBId = "";
  let notifAId = "";
  let notifBId = "";

  beforeAll(async () => {
    const timestamp = Date.now();
    const userA = await prisma.user.create({
      data: {
        name: "User A",
        email: `usera-${timestamp}@example.com`,
        passwordHash: "hash",
        role: Role.STUDENT,
      },
    });
    userAId = userA.id;
    mockSession.user.id = userAId;

    const userB = await prisma.user.create({
      data: {
        name: "User B",
        email: `userb-${timestamp}@example.com`,
        passwordHash: "hash",
        role: Role.CLIENT,
      },
    });
    userBId = userB.id;

    const notifA = await prisma.notification.create({
      data: {
        userId: userAId,
        type: "TASK_ASSIGNED",
        message: "Task for User A",
        readAt: null,
      },
    });
    notifAId = notifA.id;

    const notifB = await prisma.notification.create({
      data: {
        userId: userBId,
        type: "HOURS_SUBMITTED",
        message: "Hours for User B",
        readAt: null,
      },
    });
    notifBId = notifB.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { id: { in: [notifAId, notifBId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    });
  });

  it("markNotificationReadAction prevents User A from marking User B's notification", async () => {
    // Current user is User A, attempts to mark User B's notification
    const res = await markNotificationReadAction(notifBId);
    expect(res.success).toBe(false);

    // Verify User B's notification remains unread
    const notifB = await prisma.notification.findUnique({
      where: { id: notifBId },
    });
    expect(notifB?.readAt).toBeNull();
  });

  it("markNotificationReadAction allows User A to mark their own notification", async () => {
    const res = await markNotificationReadAction(notifAId);
    expect(res.success).toBe(true);

    const notifA = await prisma.notification.findUnique({
      where: { id: notifAId },
    });
    expect(notifA?.readAt).not.toBeNull();
  });

  it("markAllNotificationsReadAction only marks the current user's notifications", async () => {
    // Create new unread notifications for both User A and User B
    const notifA2 = await prisma.notification.create({
      data: {
        userId: userAId,
        type: "TASK_ASSIGNED",
        message: "Second task for User A",
        readAt: null,
      },
    });

    const res = await markAllNotificationsReadAction();
    expect(res.success).toBe(true);

    // User A's notification is marked as read
    const refreshedA2 = await prisma.notification.findUnique({
      where: { id: notifA2.id },
    });
    expect(refreshedA2?.readAt).not.toBeNull();

    // User B's notification is still unread
    const notifB = await prisma.notification.findUnique({
      where: { id: notifBId },
    });
    expect(notifB?.readAt).toBeNull();

    await prisma.notification.deleteMany({
      where: { id: notifA2.id },
    });
  });
});

