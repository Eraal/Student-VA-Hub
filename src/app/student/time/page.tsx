import * as React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Clock } from "lucide-react";

export default function StudentTimePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Time Tracking
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          Mag-Time In at Time Out habang gumagawa ng tasks.
        </p>
      </div>

      <EmptyState
        icon={Clock}
        title="Walang active timer o logs"
        description="Wala pang naka-log na oras. Piliin ang task at mag-Time In kapag ready ka nang magsimula ng trabaho."
      />
    </div>
  );
}
