import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getClientDashboardData } from "@/lib/services/dashboard-service";
import { ClientDashboardView } from "@/components/client/dashboard/client-dashboard-view";

async function ClientDashboardContent() {
  const user = await requireRolePage(Role.CLIENT);
  const data = await getClientDashboardData(user.id);

  return <ClientDashboardView data={data} clientName={user.name ?? "Client"} />;
}

export default function ClientPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-48 rounded bg-[var(--color-border)]" />
          <div className="h-24 rounded-md bg-[var(--color-surface)]" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="h-28 rounded-md bg-[var(--color-surface)]" />
            <div className="h-28 rounded-md bg-[var(--color-surface)]" />
            <div className="h-28 rounded-md bg-[var(--color-surface)]" />
          </div>
          <div className="h-64 rounded-md bg-[var(--color-surface)]" />
        </div>
      }
    >
      <ClientDashboardContent />
    </React.Suspense>
  );
}
