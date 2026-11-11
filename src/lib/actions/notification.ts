"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/services/notification-service";

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
    const message = err instanceof Error ? err.message : "Failed to update notification";
    return { success: false, error: message };
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
    const message = err instanceof Error ? err.message : "Failed to update notifications";
    return { success: false, error: message };
  }
}
