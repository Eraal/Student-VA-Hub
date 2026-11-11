import * as React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckSquare } from "lucide-react";

export default function StudentTasksPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Tasks
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          Tingnan ang iyong to-do, in progress, at completed tasks.
        </p>
      </div>

      <EmptyState
        icon={CheckSquare}
        title="Wala pang tasks"
        description="Wala pang tasks. Lalabas dito kapag may nag-assign sa'yo."
      />
    </div>
  );
}
