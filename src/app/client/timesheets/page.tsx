import * as React from "react";
import { requireRolePage } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { getClientTimesheetData } from "@/lib/services/invoice-service";
import { ClientTimesheetsView } from "@/components/client/timesheets/client-timesheets-view";

async function ClientTimesheetsContent() {
  const user = await requireRolePage(Role.CLIENT);
  const data = await getClientTimesheetData(user.id);

  return <ClientTimesheetsView initialData={data} />;
}

export default function ClientTimesheetsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-[var(--color-border)]" />
            <div className="h-4 w-72 rounded bg-[var(--color-border)]" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="h-20 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
            <div className="h-20 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
            <div className="h-20 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
          </div>
          <div className="h-44 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]" />
        </div>
      }
    >
      <ClientTimesheetsContent />
    </React.Suspense>
  );
}
