"use client";

import * as React from "react";
import { StudentEarningsData } from "@/lib/services/invoice-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Wallet,
  Receipt,
  Clock,
  Calendar,
  CheckCircle2,
  Briefcase,
  DollarSign,
} from "lucide-react";

interface StudentEarningsViewProps {
  initialData: StudentEarningsData;
}

export function StudentEarningsView({ initialData }: StudentEarningsViewProps) {
  const [data, setData] = React.useState<StudentEarningsData>(initialData);
  const [activeTab, setActiveTab] = React.useState<"INVOICES" | "TASKS">("INVOICES");

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const formatManilaDate = (d: Date) => {
    return new Date(d).toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Earnings & Invoices
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          Track verified hours, approved payments, and invoices from {data.linkedClient?.name ?? "your client"}.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide block">
              Total Paid
            </span>
            <div className="text-lg font-bold text-[var(--color-work)]">
              ₱{data.totalEarnedPaid.toLocaleString()}
            </div>
            <div className="text-[10px] text-[var(--color-muted)]">
              Cleared payments
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide block">
              Approved (Pending Pay)
            </span>
            <div className="text-lg font-bold text-[var(--color-text)]">
              ₱{data.totalEarnedApproved.toLocaleString()}
            </div>
            <div className="text-[10px] text-[var(--color-muted)]">
              Awaiting client payout
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide block">
              Pending Hours
            </span>
            <div className="text-lg font-bold text-[var(--color-text)]">
              {data.totalPendingHours.toFixed(2)} hrs
            </div>
            <div className="text-[10px] text-[var(--color-muted)]">
              Waiting client approval
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide block">
              Agreed Rate
            </span>
            <div className="text-lg font-bold text-[var(--color-text)]">
              ₱{data.hourlyRate}/hr
            </div>
            <div className="text-[10px] text-[var(--color-muted)]">
              Client: {data.linkedClient?.name ?? "None"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)]">
        <div className="flex items-center gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("INVOICES")}
            className={`flex items-center gap-1.5 pb-2.5 transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === "INVOICES"
                ? "border-[var(--color-accent)] text-[var(--color-text)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Receipt className="size-3.5" />
            <span>Invoices</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "INVOICES"
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                  : "bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]"
              }`}
            >
              {data.invoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TASKS")}
            className={`flex items-center gap-1.5 pb-2.5 transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === "TASKS"
                ? "border-[var(--color-accent)] text-[var(--color-text)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Briefcase className="size-3.5" />
            <span>Earnings by Task</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "TASKS"
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                  : "bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]"
              }`}
            >
              {data.taskBreakdown.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "INVOICES" && (
        <div className="space-y-3">
          {data.invoices.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No invoices generated yet"
              description="When your client approves your submitted hours, an invoice is automatically created with your agreed rate and total payout."
            />
          ) : (
            data.invoices.map((inv) => (
              <div
                key={inv.id}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-2 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                        Invoice #{inv.id.slice(-6).toUpperCase()}
                      </span>
                      {inv.status === "PAID" && (
                        <span className="rounded bg-[var(--color-work-bg)] text-[var(--color-work)] border border-green-200 px-2 py-0.5 text-[10px] font-semibold">
                          PAID
                        </span>
                      )}
                      {inv.status === "APPROVED" && (
                        <span className="rounded bg-[var(--color-class-bg)] text-[var(--color-class)] border border-blue-200 px-2 py-0.5 text-[10px] font-semibold">
                          APPROVED (WAITING PAYMENT)
                        </span>
                      )}
                      {inv.status === "PENDING" && (
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                          PENDING
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--color-muted)]">
                      Client: {inv.clientName} • Issued {formatManilaDate(inv.createdAt)}
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-sm font-bold text-[var(--color-text)]">
                      ₱{inv.amount.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-[var(--color-muted)]">
                      {inv.totalHours} hrs @ ₱{inv.rate}/hr
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "TASKS" && (
        <div className="space-y-3">
          {data.taskBreakdown.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No task earnings breakdown"
              description="Complete and log work on client tasks to view breakdown of hours and earnings."
            />
          ) : (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--color-bg)] border-b border-[var(--color-border)] text-[11px] text-[var(--color-muted)] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Task Title</th>
                    <th className="p-3 text-center">Sessions</th>
                    <th className="p-3 text-right">Hours</th>
                    <th className="p-3 text-right">Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {data.taskBreakdown.map((item) => (
                    <tr key={item.taskId} className="hover:bg-[var(--color-bg)]/50 transition-colors">
                      <td className="p-3 font-medium text-[var(--color-text)]">
                        {item.taskTitle}
                      </td>
                      <td className="p-3 text-center text-[var(--color-muted)]">
                        {item.sessionsCount}
                      </td>
                      <td className="p-3 text-right font-medium text-[var(--color-text)]">
                        {item.totalHours.toFixed(2)}h
                      </td>
                      <td className="p-3 text-right font-bold text-[var(--color-work)]">
                        ₱{item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

