import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getUserNotifications } from "@/lib/services/notification-service";
import { NotificationsView } from "@/components/notifications/notifications-view";

async function ClientNotificationsContent() {
  const user = await requireRolePage(Role.CLIENT);
  const { notifications, unreadCount } = await getUserNotifications(user.id);

  return (
    <NotificationsView
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
      role="CLIENT"
    />
  );
}

export default function ClientNotificationsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-4 animate-pulse max-w-3xl">
          <div className="h-6 w-48 rounded bg-[var(--color-border)]" />
          <div className="h-44 rounded-md bg-[var(--color-surface)]" />
        </div>
      }
    >
      <ClientNotificationsContent />
    </React.Suspense>
  );
}
