import * as React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";

export default function ClientTimesheetsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Timesheets & Invoices
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          I-review at aprubahan ang logged hours ng student VA.
        </p>
      </div>

      <EmptyState
        icon={FileText}
        title="Walang pending timesheets"
        description="Wala pang submitted hours na naghihintay ng approval. Kapag nag-Time Out ang student, dito mo mare-review at ma-aapprove ang oras."
      />
    </div>
  );
}
