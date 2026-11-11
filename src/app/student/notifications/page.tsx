import * as React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Bell } from "lucide-react";

export default function StudentNotificationsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Notifications
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          Mga alert at updates sa iyong tasks, schedule, at hours.
        </p>
      </div>

      <EmptyState
        icon={Bell}
        title="Walang bagong notification"
        description="Updated ka sa lahat! Dito lalabas ang mga update kapag may bagong assigned task, schedule conflicts, o na-approve na timesheet."
      />
    </div>
  );
}
