import { prisma } from "../prisma";

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
}

/**
 * Retrieves notifications for a user, sorted newest first, along with unread count.
 */
export async function getUserNotifications(
  userId: string,
  options?: { take?: number; skip?: number }
): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> {
  const take = options?.take ?? 50;
  const skip = options?.skip ?? 0;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
  ]);

  return {
    notifications,
    unreadCount,
  };
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
  const notif = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notif) return false;

  await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });

  return true;
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  return result.count;
}
