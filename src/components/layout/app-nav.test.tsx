import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { StudentNav } from "./student-nav";
import { ClientNav } from "./client-nav";
import { AppTopbar } from "./app-topbar";
import { Role } from "@prisma/client";

let currentPathname = "/student";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/actions/auth", () => ({
  logoutAction: vi.fn(),
}));

describe("AppNav / StudentNav / ClientNav shell redesign", () => {
  it("renders student navigation items with correct data-testid attributes", () => {
    currentPathname = "/student";
    const html = renderToString(
      <StudentNav todoCount={3} hasActiveTimer={true} defaultCollapsed={false} />
    );

    expect(html).toContain('data-testid="nav-home"');
    expect(html).toContain('data-testid="nav-schedule"');
    expect(html).toContain('data-testid="nav-tasks"');
    expect(html).toContain('data-testid="nav-time"');
    expect(html).toContain('data-testid="nav-earnings"');
    expect(html).toContain('data-testid="nav-collapse-toggle"');
  });

  it("renders client navigation items with correct data-testid attributes", () => {
    currentPathname = "/client";
    const html = renderToString(
      <ClientNav tasksAttentionCount={2} pendingApprovalCount={4} defaultCollapsed={false} />
    );

    expect(html).toContain('data-testid="nav-home"');
    expect(html).toContain('data-testid="nav-calendar"');
    expect(html).toContain('data-testid="nav-tasks"');
    expect(html).toContain('data-testid="nav-timesheets"');
    expect(html).toContain('data-testid="nav-collapse-toggle"');
  });

  it("applies full-width row styling and left-aligned layout on desktop nav items", () => {
    currentPathname = "/student/tasks";
    const html = renderToString(<StudentNav todoCount={3} />);

    // Active item must have full-width pill styling on desktop
    expect(html).toContain("lg:w-full");
    expect(html).toContain("lg:justify-start");
    expect(html).toContain("lg:gap-3");
    expect(html).toContain("lg:px-4");

    // Count badge or status dot must be pushed to far right with ml-auto
    expect(html).toContain("ml-auto");
  });

  it("uses 1px subtle divider border without hard shadow on shell edges", () => {
    currentPathname = "/student";
    const html = renderToString(<StudentNav />);

    // Sidebar divider must be 1px border-[#E5DFD5] with shadow-none
    expect(html).toContain("border-[#E5DFD5]");
    expect(html).toContain("shadow-none");
    // Should NOT have 3px-thick shell edge shadow
    expect(html).not.toContain("shadow-[2px_0px_0px_0px_#0F172A]");
    expect(html).not.toContain("shadow-[0_-2px_0_0_#0F172A]");
  });

  it("applies active state and aria-current on active item and nested routes", () => {
    // Nested route under /student/tasks
    currentPathname = "/student/tasks/abc-123";
    const html = renderToString(<StudentNav todoCount={2} />);

    // Tasks should have aria-current="page"
    expect(html).toMatch(/data-testid="nav-tasks"[^>]*aria-current="page"/);
    // Home should NOT have aria-current="page"
    expect(html).not.toMatch(/data-testid="nav-home"[^>]*aria-current="page"/);
  });

  it("renders status badges when counts > 0 and hides them when 0", () => {
    currentPathname = "/student";
    // With badges > 0
    const withBadges = renderToString(
      <StudentNav todoCount={7} hasActiveTimer={true} />
    );
    expect(withBadges).toContain("7");
    expect(withBadges).toContain("bg-[#16A34A]"); // pulsing green dot color

    // With badges = 0
    const withoutBadges = renderToString(
      <StudentNav todoCount={0} hasActiveTimer={false} />
    );
    expect(withoutBadges).not.toContain(">0<");
  });

  it("renders client timesheets badge with whole number count when > 0 and hides when 0", () => {
    currentPathname = "/client";
    const withCount = renderToString(
      <ClientNav tasksAttentionCount={0} pendingApprovalCount={4} />
    );
    expect(withCount).toContain("4");
    expect(withCount).not.toContain("4h");
    expect(withCount).not.toContain(">4h<");

    const zeroCount = renderToString(
      <ClientNav tasksAttentionCount={0} pendingApprovalCount={0} />
    );
    expect(zeroCount).not.toContain(">0<");
  });

  it("renders client tasks badge with attention count when > 0 and hides when 0", () => {
    currentPathname = "/client";
    const withCount = renderToString(
      <ClientNav tasksAttentionCount={2} pendingApprovalCount={0} />
    );
    expect(withCount).toContain("2");

    const zeroCount = renderToString(
      <ClientNav tasksAttentionCount={0} pendingApprovalCount={0} />
    );
    expect(zeroCount).not.toContain(">0<");
  });

  it("renders legend with Class, Work, Conflict ink labels and no color names", () => {
    currentPathname = "/student";
    const html = renderToString(<StudentNav />);

    expect(html).toContain("Class");
    expect(html).toContain("Work");
    expect(html).toContain("Conflict");
    expect(html).not.toContain("Class (Blue)");
    expect(html).not.toContain("Work (Green)");
    expect(html).not.toContain("Conflict (Red)");
  });

  it("renders mobile bottom navigation bar with aria-label and safe area padding", () => {
    currentPathname = "/student";
    const html = renderToString(<StudentNav todoCount={4} />);

    expect(html).toContain('aria-label="Mobile Navigation"');
    expect(html).toContain("env(safe-area-inset-bottom)");
    expect(html).toContain('data-testid="nav-home-mobile"');
    expect(html).toContain('data-testid="nav-tasks-mobile"');
  });

  it("renders collapsed rail state with 72px width when defaultCollapsed is true", () => {
    currentPathname = "/student";
    const html = renderToString(<StudentNav defaultCollapsed={true} />);

    expect(html).toContain("w-[72px]");
  });

  it("renders top bar with shrink-0 right controls to guarantee visibility at 375px", () => {
    const html = renderToString(
      <AppTopbar
        user={{
          id: "u1",
          name: "Juan Dela Cruz",
          email: "juan@example.com",
          role: Role.STUDENT,
        }}
        unreadCount={2}
      />
    );

    expect(html).toContain("VAwise");
    expect(html).toContain("Notifications");
    expect(html).toContain("Juan Dela Cruz");
    expect(html).toContain("shrink-0");
    expect(html).toContain("var(--header-h)");
    expect(html).toContain("sticky");
    expect(html).toContain("top-0");
  });

  it("renders sidebar with sticky positioning, header-h offset, full remaining dvh height, and internal scroll", () => {
    currentPathname = "/student";
    const html = renderToString(<StudentNav />);

    // Sidebar sticky and full remaining dvh height below header
    expect(html).toContain("var(--header-h)");
    expect(html).toContain("calc(100dvh - var(--header-h))");
    expect(html).toContain("self-start");
    expect(html).toContain("sticky");

    // Nav list has 16px top padding and internal scroll
    expect(html).toContain("pt-4");
    expect(html).toContain("overflow-y-auto");

    // Bottom pinned controls use mt-auto
    expect(html).toContain("mt-auto");
  });
});
