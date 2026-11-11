import * as React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckSquare } from "lucide-react";

export default function ClientTasksPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Tasks
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          Tingnan ang status ng mga gawaing na-assign sa student.
        </p>
      </div>

      <EmptyState
        icon={CheckSquare}
        title="Wala pang na-assign na tasks"
        description="Wala ka pang naipapadalang task sa student VA. Dito mo makikita ang progress at deadlines ng bawat project."
      />
    </div>
  );
}
