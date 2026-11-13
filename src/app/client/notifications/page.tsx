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
        <div className="w-full space-y-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-lg bg-slate-200" />
            <div className="h-4 w-72 rounded bg-slate-200" />
          </div>
          <div className="h-10 w-44 rounded-xl border-[1.5px] border-slate-300 bg-[#FAF7F2]" />
          <div className="space-y-2">
            <div className="h-3 w-16 rounded bg-slate-200" />
            <div className="rounded-2xl border-[1.5px] border-slate-300 bg-white overflow-hidden divide-y divide-slate-100 shadow-[3px_3px_0px_0px_#CBD5E1]">
              <div className="h-[72px] p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-slate-200 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-1/3 rounded bg-slate-100" />
                </div>
              </div>
              <div className="h-[72px] p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-slate-200 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-2/3 rounded bg-slate-200" />
                  <div className="h-3 w-1/4 rounded bg-slate-100" />
                </div>
              </div>
              <div className="h-[72px] p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-slate-200 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/2 rounded bg-slate-200" />
                  <div className="h-3 w-1/4 rounded bg-slate-100" />
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <ClientNotificationsContent />
    </React.Suspense>
  );
}
