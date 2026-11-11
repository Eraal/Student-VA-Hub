import * as React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Wallet } from "lucide-react";

export default function StudentEarningsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Earnings & Invoices
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          Tingnan ang iyong kinita base sa logged hours at hourly rate.
        </p>
      </div>

      <EmptyState
        icon={Wallet}
        title="Wala pang earnings records"
        description="Wala pang na-aprubahang oras o invoice ngayong linggo. Awtomatikong makakalkula ang kita base sa iyong hourly rate kapag na-approve ng client ang timesheet."
      />
    </div>
  );
}
