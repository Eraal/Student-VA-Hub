import * as React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarDays } from "lucide-react";

export default function StudentSchedulePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Class Schedule & Availability
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          Pamahalaan ang iyong schedule para maiwasan ang conflict sa VA tasks.
        </p>
      </div>

      <EmptyState
        icon={CalendarDays}
        title="Walang naka-set na schedule"
        description="Wala ka pang nailalagay na class schedule o availability windows. Ilalagay dito ang oras ng pasok mo para maiwasan ang conflict sa VA work."
      />
    </div>
  );
}
