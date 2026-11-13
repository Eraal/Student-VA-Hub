"use server";

import { auth } from "@/lib/auth";
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

