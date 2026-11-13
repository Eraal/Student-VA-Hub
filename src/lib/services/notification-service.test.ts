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

  it("marks a single notification as read and updates unread count", async () => {
    const targetId = createdNotifIds[0];
    const success = await markNotificationAsRead(userId, targetId);
    expect(success).toBe(true);

    const { unreadCount } = await getUserNotifications(userId);
    expect(unreadCount).toBe(1);
  });

  it("marks all notifications as read and resets unread count to 0", async () => {
    const count = await markAllNotificationsAsRead(userId);
    expect(count).toBeGreaterThanOrEqual(1);

    const { unreadCount, notifications } = await getUserNotifications(userId);
    expect(unreadCount).toBe(0);
    // Every notification for this user is now read
    for (const notif of notifications) {
      expect(notif.readAt).not.toBeNull();
    }
  });

  it("paginates notifications: returns 20 and then the rest", async () => {
    const pageUser = await prisma.user.create({
      data: {
        name: "Page User",
        email: `page-user-${Date.now()}@example.com`,
        passwordHash: "hash",
        role: Role.STUDENT,
      },
    });

    const pageNotifIds: string[] = [];
    const now = Date.now();
    for (let i = 0; i < 25; i++) {
      const n = await prisma.notification.create({
        data: {
          userId: pageUser.id,
          message: `Pagination item #${i + 1}`,
          type: "TASK_ASSIGNED",
          createdAt: new Date(now - i * 60000),
        },
      });
      pageNotifIds.push(n.id);
    }

    try {
      // First page of 20
      const page1 = await getUserNotifications(pageUser.id, { take: 20, skip: 0 });
      expect(page1.notifications.length).toBe(20);

      // Remaining notifications ("and then the rest")
      const page2 = await getUserNotifications(pageUser.id, { take: 20, skip: 20 });
      expect(page2.notifications.length).toBe(5);

      // Verify no overlap and all 25 accounted for
      const page1Ids = new Set(page1.notifications.map((n) => n.id));
      const page2Ids = new Set(page2.notifications.map((n) => n.id));
      for (const id of page2Ids) {
        expect(page1Ids.has(id)).toBe(false);
      }
      expect(page1.notifications.length + page2.notifications.length).toBe(25);
    } finally {
      await prisma.notification.deleteMany({ where: { userId: pageUser.id } });
      await prisma.user.delete({ where: { id: pageUser.id } });
    }
  });

  it("ensures the two roles never see each other's notifications", async () => {
    const timestamp = Date.now();
    const studentUser = await prisma.user.create({
      data: {
        name: "Role Student",
        email: `role-student-${timestamp}@example.com`,
        passwordHash: "hash",
        role: Role.STUDENT,
      },
    });

    const clientUser = await prisma.user.create({
      data: {
        name: "Role Client",
        email: `role-client-${timestamp}@example.com`,
        passwordHash: "hash",
        role: Role.CLIENT,
      },
    });

    try {
      const studentNotif = await prisma.notification.create({
        data: {
          userId: studentUser.id,
          type: "TASK_ASSIGNED",
          message: "Student confidential update",
        },
      });

      const clientNotif = await prisma.notification.create({
        data: {
          userId: clientUser.id,
          type: "TASK_ACCEPTED",
          message: "Client confidential update",
        },
      });

      // Student only sees student notifications
      const studentResult = await getUserNotifications(studentUser.id);
      expect(studentResult.notifications.some((n) => n.id === studentNotif.id)).toBe(true);
      expect(studentResult.notifications.some((n) => n.id === clientNotif.id)).toBe(false);
      expect(studentResult.notifications.every((n) => n.userId === studentUser.id)).toBe(true);

      // Client only sees client notifications
      const clientResult = await getUserNotifications(clientUser.id);
      expect(clientResult.notifications.some((n) => n.id === clientNotif.id)).toBe(true);
      expect(clientResult.notifications.some((n) => n.id === studentNotif.id)).toBe(false);
      expect(clientResult.notifications.every((n) => n.userId === clientUser.id)).toBe(true);

      // Student cannot mark client's notification as read
      const markCrossAttempt = await markNotificationAsRead(studentUser.id, clientNotif.id);
      expect(markCrossAttempt).toBe(false);

      const unchangedClientNotif = await prisma.notification.findUnique({
        where: { id: clientNotif.id },
      });
      expect(unchangedClientNotif?.readAt).toBeNull();
    } finally {
      await prisma.notification.deleteMany({
        where: { userId: { in: [studentUser.id, clientUser.id] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [studentUser.id, clientUser.id] } },
      });
    }
  });
});
