"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  formatDate,
  formatRelative,
  parseSafeDate,
  TIMEZONE_MANILA,
} from "@/lib/format";
import { toZonedTime } from "date-fns-tz";
import {
  getNotificationMeta,
  getNotificationIcon,
  type Tone,
} from "@/lib/notifications";
import { getNotificationRoute } from "@/lib/notification-routes";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/lib/actions/notification";
import type { NotificationItem } from "@/lib/services/notification-service";
import { toUserErrorMessage } from "@/lib/errors";
import { toast } from "@/components/ui/toast";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Loader2,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

interface NotificationsViewProps {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
  role: Role | "STUDENT" | "CLIENT";
}

type FilterType = "all" | "unread";

interface DayGroup {
  label: string;
  items: NotificationItem[];
}

const TILE_STYLES: Record<string, string> = {
  blue: "bg-[#EFF6FF] text-[#2563EB]",
  green: "bg-[#F0FDF4] text-[#16A34A]",
  amber: "bg-[#FFFBEB] text-[#D97706]",
  red: "bg-[#FEF2F2] text-[#DC2626]",
  gray: "bg-[#FAF7F2] text-[#0F172A]",
};

function groupNotificationsByDay(items: NotificationItem[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const map = new Map<string, DayGroup>();

  const now = new Date();
  const nowZoned = toZonedTime(now, TIMEZONE_MANILA);
  const nYear = nowZoned.getFullYear();
  const nMonth = nowZoned.getMonth();
  const nDate = nowZoned.getDate();
  const nMidnight = new Date(nYear, nMonth, nDate).getTime();

  for (const item of items) {
    const itemDate = parseSafeDate(item.createdAt) ?? new Date();
    const itemZoned = toZonedTime(itemDate, TIMEZONE_MANILA);
    const iYear = itemZoned.getFullYear();
    const iMonth = itemZoned.getMonth();
    const iDate = itemZoned.getDate();
    const iMidnight = new Date(iYear, iMonth, iDate).getTime();

    const diffDays = Math.round((nMidnight - iMidnight) / (24 * 60 * 60 * 1000));
    let label: string;
    if (diffDays === 0) {
      label = "Today";
    } else if (diffDays === 1) {
      label = "Yesterday";
    } else {
      label = formatDate(itemDate);
    }

    let group = map.get(label);
    if (!group) {
      group = { label, items: [] };
      map.set(label, group);
      groups.push(group);
    }
    group.items.push(item);
  }

  return groups;
}

export function NotificationsView({
  initialNotifications,
  initialUnreadCount,
  role,
}: NotificationsViewProps) {
  const router = useRouter();
  const [notifications, setNotifications] =
    React.useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] =
    React.useState<number>(initialUnreadCount);
  const [filter, setFilter] = React.useState<FilterType>("all");
  const [visibleCount, setVisibleCount] = React.useState<number>(20);
  const [isMarkingAll, setIsMarkingAll] = React.useState(false);
  const [markingId, setMarkingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Sync state when props change
  React.useEffect(() => {
    setNotifications(initialNotifications);
    setUnreadCount(initialUnreadCount);
  }, [initialNotifications, initialUnreadCount]);

  // Window focus & 60-second periodic refresh while page is visible
  React.useEffect(() => {
    const handleFocus = () => {
      router.refresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 60000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [router]);

  // Mark single notification as read
  const handleMarkAsRead = async (id: string) => {
    setMarkingId(id);
    const prevNotifications = [...notifications];
    const prevUnreadCount = unreadCount;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await markNotificationReadAction(id);
      if (res.success) {
        toast.success("Notification marked as read.");
        router.refresh();
      } else {
        setNotifications(prevNotifications);
        setUnreadCount(prevUnreadCount);
        toast.error(toUserErrorMessage(res.error ?? "Failed to mark as read."));
      }
    } catch (err) {
      setNotifications(prevNotifications);
      setUnreadCount(prevUnreadCount);
      toast.error(toUserErrorMessage(err));
    } finally {
      setMarkingId(null);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    const prevNotifications = [...notifications];
    const prevUnreadCount = unreadCount;

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() }))
    );
    setUnreadCount(0);

    try {
      const res = await markAllNotificationsReadAction();
      if (res.success) {
        toast.success("All notifications marked as read.");
        router.refresh();
      } else {
        setNotifications(prevNotifications);
        setUnreadCount(prevUnreadCount);
        toast.error(
          toUserErrorMessage(res.error ?? "Failed to mark all as read.")
        );
      }
    } catch (err) {
      setNotifications(prevNotifications);
      setUnreadCount(prevUnreadCount);
      toast.error(toUserErrorMessage(err));
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Clicking a row marks it read and navigates to its destination
  const handleRowClick = async (n: NotificationItem) => {
    const destination = getNotificationRoute(role, n.type);
    if (!n.readAt) {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, readAt: new Date() } : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      markNotificationReadAction(n.id).catch(() => { });
    }
    router.push(destination);
  };

  // Filtered and paginated list
  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.readAt)
      : notifications;

  const visibleNotifications = filteredNotifications.slice(0, visibleCount);
  const hasMore = visibleNotifications.length < filteredNotifications.length;
  const dayGroups = groupNotificationsByDay(visibleNotifications);

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Notifications"
        badge={
          unreadCount > 0 ? (
            <span
              className="rounded-full border-[1.5px] border-[#0F172A] bg-[#0F172A] text-white px-2.5 py-0.5 text-xs font-bold font-mono shadow-[1.5px_1.5px_0px_0px_#0F172A]"
              aria-live="polite"
            >
              {`${unreadCount} unread`}
            </span>
          ) : undefined
        }
        subtitle="Updates about your tasks, hours and invoices."
        actions={
          <Button
            type="button"
            variant="outline"
            data-testid="notifications-mark-all"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMarkingAll}
            className="shrink-0 cursor-pointer h-9 px-2.5 sm:px-3 text-xs"
            aria-label="Mark all as read"
            title="Mark all as read"
          >
            {isMarkingAll ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCheck className="size-4" />
            )}
            <span className="hidden sm:inline font-bold">Mark all as read</span>
          </Button>
        }
      />

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-4 sm:p-5 shadow-[3px_3px_0px_0px_#DC2626] space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-[#DC2626] bg-white text-[#DC2626] shadow-[1.5px_1.5px_0px_0px_#DC2626]">
              <AlertCircle className="size-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-[#0F172A]">
                Something went wrong
              </h3>
              <p className="text-xs text-slate-600">{error}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null);
              router.refresh();
            }}
            className="gap-1.5 text-xs font-bold cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {/* Segmented Filter Tabs */}
      <div className="flex rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-1 shadow-[2px_2px_0px_0px_#0F172A] gap-1 w-fit">
        <button
          type="button"
          data-testid="notifications-filter"
          data-filter="all"
          onClick={() => {
            setFilter("all");
            setVisibleCount(20);
          }}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]",
            filter === "all"
              ? "bg-[#0F172A] text-white shadow-[1px_1px_0px_0px_#0F172A]"
              : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
          )}
        >
          <span>All</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold font-mono",
              filter === "all"
                ? "bg-white/20 text-white"
                : "bg-white border border-[#0F172A]/20 text-slate-700"
            )}
          >
            {notifications.length}
          </span>
        </button>

        <button
          type="button"
          data-testid="notifications-filter"
          data-filter="unread"
          onClick={() => {
            setFilter("unread");
            setVisibleCount(20);
          }}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]",
            filter === "unread"
              ? "bg-[#0F172A] text-white shadow-[1px_1px_0px_0px_#0F172A]"
              : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
          )}
        >
          <span>Unread</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold font-mono",
              filter === "unread"
                ? "bg-white/20 text-white"
                : "bg-white border border-[#0F172A]/20 text-slate-700"
            )}
          >
            {unreadCount}
          </span>
        </button>
      </div>

      {/* Notifications List or Empty States */}
      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Updates about tasks, hours and invoices will show up here."
          compact
        />
      ) : filter === "unread" && filteredNotifications.length === 0 ? (
        <EmptyState
          icon={CheckCheck}
          title="You're all caught up."
          description="Updates about tasks, hours and invoices will show up here."
          compact
        />
      ) : (
        <div className="space-y-6">
          {dayGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                {group.label}
              </h2>
              <div className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] overflow-hidden divide-y divide-[#E5DFD5]">
                {group.items.map((n) => {
                  const isUnread = !n.readAt;
                  const meta = getNotificationMeta(n.type);

                  return (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      data-testid="notification-row"
                      data-type={n.type}
                      data-read={n.readAt ? "true" : "false"}
                      onClick={() => handleRowClick(n)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRowClick(n);
                        }
                      }}
                      className={cn(
                        "group relative flex min-h-[56px] sm:min-h-[72px] items-center justify-between gap-3 p-3.5 sm:px-4 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-inset",
                        isUnread
                          ? "bg-[#FAF7F2]/70 hover:bg-[#FAF7F2]"
                          : "bg-white hover:bg-[#FAF7F2]/40"
                      )}
                    >
                      {/* Left: 4px ink bar on unread */}
                      {isUnread && (
                        <span
                          className="absolute inset-y-0 left-0 w-1 bg-[#0F172A]"
                          aria-hidden="true"
                        />
                      )}

                      {/* Left: 40px icon tile */}
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]",
                          TILE_STYLES[meta.tone] ?? TILE_STYLES.gray
                        )}
                      >
                        {getNotificationIcon(n.type, "size-5")}
                      </div>

                      {/* Middle: message and details */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start gap-2">
                          {isUnread && (
                            <span
                              className="size-2 rounded-full bg-[#0F172A] shrink-0 mt-1.5"
                              aria-hidden="true"
                            />
                          )}
                          <p
                            className={cn(
                              "text-sm sm:text-[15px] leading-snug line-clamp-2 sm:line-clamp-1 transition-colors",
                              isUnread
                                ? "font-semibold text-[#0F172A]"
                                : "font-normal text-slate-600"
                            )}
                          >
                            {n.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-medium text-slate-600">
                            {meta.label}
                          </span>
                          <span aria-hidden="true">&bull;</span>
                          <span>{formatRelative(n.createdAt)}</span>
                        </div>
                      </div>

                      {/* Right: Mark read button & Chevron */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isUnread && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            data-testid="notification-mark-read"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(n.id);
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                            }}
                            disabled={markingId === n.id}
                            className="h-8 px-2.5 text-xs font-semibold text-slate-600 hover:text-[#0F172A] hover:bg-white/80 cursor-pointer shrink-0 border border-transparent hover:border-[#0F172A]/20"
                            aria-label="Mark notification as read"
                          >
                            {markingId === n.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <span>Mark as read</span>
                            )}
                          </Button>
                        )}
                        <ChevronRight
                          className="size-4 text-slate-400 group-hover:text-[#0F172A] group-focus-visible:text-[#0F172A] opacity-40 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all shrink-0"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pagination: Load More */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                data-testid="notifications-load-more"
                onClick={() => setVisibleCount((prev) => prev + 20)}
                className="gap-2 cursor-pointer font-bold"
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
