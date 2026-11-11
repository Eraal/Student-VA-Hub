import * as React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar } from "lucide-react";

export default function ClientCalendarPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Student Calendar
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          Read-only view ng availability at class schedule ng student.
        </p>
      </div>

      <EmptyState
        icon={Calendar}
        title="Walang schedule na maipakita"
        description="I-link muna ang iyong student VA gamit ang kanilang invite code para makita ang kanilang class schedule at available work hours."
      />
    </div>
  );
}

