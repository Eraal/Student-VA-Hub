import * as React from "react";
import { cookies } from "next/headers";
import { AppTopbar } from "@/components/layout/app-topbar";
import { ClientNav } from "@/components/layout/client-nav";
import { LiveUpdates } from "@/components/layout/live-updates";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getClientDashboardData } from "@/lib/services/dashboard-service";

async function ClientTopbar() {
  const user = await getCurrentUser();
  if (!user) return null;
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });
  return <AppTopbar user={user} unreadCount={unreadCount} />;
}

async function ClientNavSection() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get("sidebar_collapsed")?.value === "true";

  let tasksAttentionCount = 0;
  let pendingApprovalCount = 0;

  if (user) {
    try {
      const data = await getClientDashboardData(user.id);
      tasksAttentionCount = data.attention?.rescheduleRequestsCount ?? 0;
      pendingApprovalCount = data.pendingApproval?.logCount ?? 0;
    } catch {
      // safe fallback
    }
  }

  return (
    <ClientNav
      tasksAttentionCount={tasksAttentionCount}
      pendingApprovalCount={pendingApprovalCount}
      defaultCollapsed={defaultCollapsed}
    />
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen min-h-dvh bg-[var(--color-bg)] flex flex-col">
      <LiveUpdates />
      {/* Top Bar inside Suspense so layout shell can partially prerender */}
      <React.Suspense
        fallback={
          <div
            style={{ height: "var(--header-h)" }}
            className="h-[var(--header-h)] w-full border-b border-[#E5DFD5] bg-[#FAF7F2] animate-pulse"
          />
        }
      >
        <ClientTopbar />
      </React.Suspense>

      <div className="flex flex-row flex-1 w-full min-w-0">
        {/* Desktop/Tablet Sidebar + Mobile Bottom Tab Bar */}
        <React.Suspense
          fallback={
            <div
              style={{
                top: "var(--header-h)",
                height: "calc(100dvh - var(--header-h))",
              }}
              className="sticky hidden md:flex shrink-0 self-start w-[72px] lg:w-[264px] border-r border-[#E5DFD5] bg-white animate-pulse"
            />
          }
        >
          <ClientNavSection />
        </React.Suspense>

        {/* Main Content Area — flex-1 min-w-0, centered max-w-7xl */}
        <main className="flex-1 min-w-0 w-full px-4 py-6 md:px-6 xl:px-8 xl:py-8 pb-24 md:pb-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
