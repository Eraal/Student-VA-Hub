"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/services/notification-service";
import { toUserErrorMessage } from "@/lib/errors";

export async function markNotificationReadAction(notificationId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const success = await markNotificationAsRead(session.user.id, notificationId);
    if (!success) {
      return { success: false, error: "Notification not found" };
    }

    revalidatePath("/student/notifications");
    revalidatePath("/client/notifications");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserErrorMessage(err) };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    await markAllNotificationsAsRead(session.user.id);

    revalidatePath("/student/notifications");
    revalidatePath("/client/notifications");
    return { success: true };
  } catch (err) {
    return { success: false, error: toUserErrorMessage(err) };
  }
}

/**
 * Retrieves the single latest notification for the currently authenticated user.
 * Used by LiveUpdates to display a toast when a new notification arrives.
 */
export async function getLatestNotificationAction() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.notification.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      message: true,
      type: true,
      createdAt: true,
      readAt: true,
    },
  });
}
