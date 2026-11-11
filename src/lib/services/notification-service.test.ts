import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../prisma";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./notification-service";
import { Role } from "@prisma/client";

describe("Notification Service", () => {
  const testEmail = `test-notif-user-${Date.now()}@example.com`;
  let userId = "";
  const createdNotifIds: string[] = [];

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        name: "Notif User",
        email: testEmail,
        passwordHash: "hash",
        role: Role.STUDENT,
      },
    });
    userId = user.id;

    // Create 3 test notifications (2 unread, 1 read)
    const n1 = await prisma.notification.create({
      data: {
        userId,
        message: "You have a new task assigned: Pitch deck review",
        type: "TASK_ASSIGNED",
        readAt: null,
      },
    });
    const n2 = await prisma.notification.create({
      data: {
        userId,
        message: "Your logged hours (3.0h) have been approved",
        type: "HOURS_APPROVED",
        readAt: null,
      },
    });
    const n3 = await prisma.notification.create({
      data: {
        userId,
        message: "Schedule reminder for class today",
        type: "REMINDER",
        readAt: new Date(),
      },
    });

    createdNotifIds.push(n1.id, n2.id, n3.id);
  });

  afterAll(async () => {
    if (createdNotifIds.length > 0) {
      await prisma.notification.deleteMany({
        where: { id: { in: createdNotifIds } },
      });
    }
    if (userId) {
      await prisma.user.deleteMany({
        where: { id: userId },
      });
    }
  });

  it("retrieves notifications and counts unread accurately", async () => {
    const { notifications, unreadCount } = await getUserNotifications(userId);
    expect(notifications.length).toBeGreaterThanOrEqual(3);
    expect(unreadCount).toBe(2);
  });

  it("marks a single notification as read", async () => {
    const targetId = createdNotifIds[0];
    const success = await markNotificationAsRead(userId, targetId);
    expect(success).toBe(true);

    const { unreadCount } = await getUserNotifications(userId);
    expect(unreadCount).toBe(1);
  });

  it("marks all notifications as read", async () => {
    const count = await markAllNotificationsAsRead(userId);
    expect(count).toBeGreaterThanOrEqual(1);

    const { unreadCount } = await getUserNotifications(userId);
    expect(unreadCount).toBe(0);
  });
});
