import * as React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Bell } from "lucide-react";

export default function ClientNotificationsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Notifications
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          Mga update sa task responses, timesheet submissions, at reschedules.
        </p>
      </div>

      <EmptyState
        icon={Bell}
        title="Walang bagong notification"
        description="Tahimik ang notifications mo. Dito lalabas kapag tinanggap ng student ang task o may nag-submit ng oras para sa iyong approval."
      />
    </div>
  );
}
