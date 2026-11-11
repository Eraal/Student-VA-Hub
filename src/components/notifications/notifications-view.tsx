"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/lib/actions/notification";
import type { NotificationItem } from "@/lib/services/notification-service";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Briefcase,
  Clock,
  Loader2,
} from "lucide-react";

interface NotificationsViewProps {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
  role: "STUDENT" | "CLIENT";
}

export function NotificationsView({
  initialNotifications,
  initialUnreadCount,
  role,
}: NotificationsViewProps) {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = React.useState<number>(initialUnreadCount);
  const [isMarkingAll, setIsMarkingAll] = React.useState(false);
  const [markingId, setMarkingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setNotifications(initialNotifications);
    setUnreadCount(initialUnreadCount);
  }, [initialNotifications, initialUnreadCount]);

  const handleMarkAsRead = async (id: string) => {
    setMarkingId(id);
    try {
      const res = await markNotificationReadAction(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        router.refresh();
      }
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      const res = await markAllNotificationsReadAction();
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: new Date() }))
        );
        setUnreadCount(0);
        router.refresh();
      }
    } finally {
      setIsMarkingAll(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case "HOURS_APPROVED":
      case "INVOICE_PAID":
        return <CheckCircle2 className="size-4 text-[var(--color-work)]" />;
      case "CONFLICT":
      case "CONFLICT_ALERT":
        return <AlertTriangle className="size-4 text-[var(--color-conflict)]" />;
      case "DISPUTE":
      case "CORRECTION_REQUESTED":
      case "RESCHEDULE_REQUESTED":
        return <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />;
      case "TASK_ASSIGNED":
      default:
        return <Briefcase className="size-4 text-[var(--color-accent)]" />;
    }
  };

  const formatRelativeTime = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            {role === "STUDENT"
              ? "Mga updates sa iyong tasks, schedule, at approved hours."
              : "Mga update sa task responses, timesheet submissions, at corrections."}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="xs"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            className="gap-1.5 text-xs cursor-pointer"
          >
            {isMarkingAll ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCheck className="size-3.5" />
            )}
            <span>Mark all as read</span>
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] divide-y divide-[var(--color-border)] shadow-xs">
          {notifications.map((n) => {
            const isUnread = !n.readAt;

            return (
              <div
                key={n.id}
                className={`p-3.5 flex items-start justify-between gap-3 transition-colors ${
                  isUnread
                    ? "bg-[var(--color-bg)]/60"
                    : "hover:bg-[var(--color-bg)]/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="space-y-1">
                    <p className={`text-xs ${isUnread ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-text)]"}`}>
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--color-muted)]">
                      <span>{formatRelativeTime(n.createdAt)}</span>
                      <span>&bull;</span>
                      <span className="uppercase">{n.type.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isUnread ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleMarkAsRead(n.id)}
                      disabled={markingId === n.id}
                      className="text-[10px] h-6 px-2 text-[var(--color-muted)] hover:text-[var(--color-text)] cursor-pointer"
                    >
                      {markingId === n.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        "Mark read"
                      )}
                    </Button>
                  ) : (
                    <span className="text-[10px] text-[var(--color-muted)]">Read</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title="Walang bagong notification"
          description={
            role === "STUDENT"
              ? "Updated ka sa lahat! Dito lalabas ang mga update kapag may bagong assigned task o na-approve na timesheet."
              : "Tahimik ang notifications mo. Dito lalabas kapag tinanggap ng student ang task o nag-submit ng oras para sa approval."
          }
        />
      )}
    </div>
  );
}

