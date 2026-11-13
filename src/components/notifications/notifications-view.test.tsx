import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { NotificationsView } from "./notifications-view";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Role } from "@prisma/client";
import type { NotificationItem } from "@/lib/services/notification-service";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  usePathname: () => "/student/notifications",
}));

vi.mock("@/lib/actions/auth", () => ({
  logoutAction: vi.fn(),
}));

vi.mock("@/lib/actions/notification", () => ({
  markNotificationReadAction: vi.fn().mockResolvedValue({ success: true }),
  markAllNotificationsReadAction: vi.fn().mockResolvedValue({ success: true }),
}));

describe("NotificationsView Component", () => {
  const sampleNotifications: NotificationItem[] = [
    {
      id: "notif-1",
      userId: "user-1",
      type: "TASK_ASSIGNED",
      message: "Client assigned you a task: Research competitors",
      readAt: null,
      createdAt: new Date(),
    },
    {
      id: "notif-2",
      userId: "user-1",
      type: "HOURS_APPROVED",
      message: "Client approved 3.5 hrs for Research competitors",
      readAt: new Date(Date.now() - 3600000),
      createdAt: new Date(Date.now() - 7200000),
    },
    {
      id: "notif-3",
      userId: "user-1",
      type: "HOURS_DISPUTED",
      message: "Client disputed 2.0 hrs on Research competitors",
      readAt: null,
      createdAt: new Date(Date.now() - 86400000), // Yesterday
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header with title, subtitle, and unread badge with aria-live", () => {
    const html = renderToString(
      <NotificationsView
        initialNotifications={sampleNotifications}
        initialUnreadCount={2}
        role={Role.STUDENT}
      />
    );

    expect(html).toContain("Notifications");
    expect(html).toContain("Updates about your tasks, hours and invoices.");
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("2 unread");
  });

  it("renders Mark all as read button with correct data-testid, enabled when unread > 0", () => {
    const html = renderToString(
      <NotificationsView
        initialNotifications={sampleNotifications}
        initialUnreadCount={2}
        role={Role.STUDENT}
      />
    );

    expect(html).toContain('data-testid="notifications-mark-all"');
    // Button element itself should not have disabled attribute
    expect(html).not.toMatch(/data-testid="notifications-mark-all"[^>]*disabled=""/);
  });

  it("renders Mark all as read button as disabled when unread count is 0", () => {
    const readNotifications = sampleNotifications.map((n) => ({
      ...n,
      readAt: new Date(),
    }));

    const html = renderToString(
      <NotificationsView
        initialNotifications={readNotifications}
        initialUnreadCount={0}
        role={Role.STUDENT}
      />
    );

    expect(html).toContain('data-testid="notifications-mark-all"');
    expect(html).toMatch(/data-testid="notifications-mark-all"[^>]*disabled=""/);
  });

  it("renders segmented filter tabs with data-testid and counts", () => {
    const html = renderToString(
      <NotificationsView
        initialNotifications={sampleNotifications}
        initialUnreadCount={2}
        role={Role.STUDENT}
      />
    );

    expect(html).toContain('data-testid="notifications-filter"');
    expect(html).toContain('data-filter="all"');
    expect(html).toContain('data-filter="unread"');
    expect(html).toContain("All");
    expect(html).toContain("Unread");
  });

  it("renders notification rows with data-testid, data-type, and data-read", () => {
    const html = renderToString(
      <NotificationsView
        initialNotifications={sampleNotifications}
        initialUnreadCount={2}
        role={Role.STUDENT}
      />
    );

    expect(html).toContain('data-testid="notification-row"');
    expect(html).toContain('data-type="TASK_ASSIGNED"');
    expect(html).toContain('data-read="false"');
    expect(html).toContain('data-type="HOURS_APPROVED"');
    expect(html).toContain('data-read="true"');
  });

  it("renders mark as read ghost button only on unread rows", () => {
    const html = renderToString(
      <NotificationsView
        initialNotifications={sampleNotifications}
        initialUnreadCount={2}
        role={Role.STUDENT}
      />
    );

    expect(html).toContain('data-testid="notification-mark-read"');
    expect(html).toContain("Mark as read");
  });

  it("renders with universal PageContainer wrapper matching tasks and timesheets", () => {
    const html = renderToString(
      <NotificationsView
        initialNotifications={sampleNotifications}
        initialUnreadCount={2}
        role={Role.STUDENT}
      />
    );

    expect(html).toContain('data-testid="page-container"');
    expect(html).toContain("w-full space-y-6");
  });

  it("renders compact centered empty state when there are no notifications at all", () => {
    const html = renderToString(
      <NotificationsView
        initialNotifications={[]}
        initialUnreadCount={0}
        role={Role.STUDENT}
      />
    );

    expect(html).toContain("No notifications yet");
    expect(html).toContain(
      "Updates about tasks, hours and invoices will show up here."
    );
    expect(html).toContain("min-h-[160px]");
    expect(html).toContain("text-center");
  });

  it("groups notifications by day with Today or Yesterday labels", () => {
    const html = renderToString(
      <NotificationsView
        initialNotifications={sampleNotifications}
        initialUnreadCount={2}
        role={Role.STUDENT}
      />
    );

    expect(html).toContain("Today");
  });

  it("renders Load more button when total notifications exceed 20", () => {
    const manyNotifications: NotificationItem[] = Array.from(
      { length: 25 },
      (_, i) => ({
        id: `notif-${i}`,
        userId: "user-1",
        type: "TASK_ASSIGNED",
        message: `Task ${i}`,
        readAt: null,
        createdAt: new Date(),
      })
    );

    const html = renderToString(
      <NotificationsView
        initialNotifications={manyNotifications}
        initialUnreadCount={25}
        role={Role.STUDENT}
      />
    );

    expect(html).toContain('data-testid="notifications-load-more"');
    expect(html).toContain("Load more");
  });
});

describe("Topbar Bell Ink Badge", () => {
  it("renders ink unread count badge with data-testid='bell-badge' when unreadCount > 0", () => {
    const html = renderToString(
      <AppTopbar
        user={{
          id: "u-1",
          name: "Student User",
          email: "student@example.com",
          role: Role.STUDENT,
        }}
        unreadCount={3}
      />
    );

    expect(html).toContain('data-testid="bell-badge"');
    expect(html).toContain("3");
    expect(html).toContain('aria-label="Notifications, 3 unread"');
  });

  it("renders '9+' when unread count exceeds 9", () => {
    const html = renderToString(
      <AppTopbar
        user={{
          id: "u-1",
          name: "Student User",
          email: "student@example.com",
          role: Role.STUDENT,
        }}
        unreadCount={14}
      />
    );

    expect(html).toContain('data-testid="bell-badge"');
    expect(html).toContain("9+");
    expect(html).toContain('aria-label="Notifications, 14 unread"');
  });

  it("hides bell badge when unreadCount is 0", () => {
    const html = renderToString(
      <AppTopbar
        user={{
          id: "u-1",
          name: "Student User",
          email: "student@example.com",
          role: Role.STUDENT,
        }}
        unreadCount={0}
      />
    );

    expect(html).not.toContain('data-testid="bell-badge"');
    expect(html).toContain('aria-label="Notifications"');
  });
});
