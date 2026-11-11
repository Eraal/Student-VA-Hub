import * as React from "react";
import { AppTopbar } from "@/components/layout/app-topbar";
import { StudentNav } from "@/components/layout/student-nav";
import { getCurrentUser } from "@/lib/auth-helpers";

async function StudentTopbar() {
  const user = await getCurrentUser();
  if (!user) return null;
  return <AppTopbar user={user} />;
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Top Bar inside Suspense so layout shell can partially prerender */}
      <React.Suspense
        fallback={
          <div className="h-14 w-full border-b border-[var(--color-border)] bg-[var(--color-bg)] animate-pulse" />
        }
      >
        <StudentTopbar />
      </React.Suspense>

      <div className="flex flex-1 w-full">
        {/* Desktop Sidebar + Mobile Bottom Tab Bar */}
        <StudentNav />

        {/* Main Content Area */}
        <main className="flex-1 w-full px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8 max-w-screen-md mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
