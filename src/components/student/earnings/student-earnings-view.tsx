"use client";

import * as React from "react";
import { InvoiceStatus, TimeLogStatus } from "@prisma/client";
import { StudentEarningsData, FormattedInvoice } from "@/lib/services/invoice-service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/lib/labels";
import { formatDate, formatHours, formatPeso, TIMEZONE_MANILA } from "@/lib/format";
import { calculateLogAmount, sumMoney } from "@/lib/money";
import { toZonedTime } from "date-fns-tz";
import { startOfWeek, startOfMonth } from "date-fns";
import { Eye, Check, Clock } from "lucide-react";

export type PeriodType = "this-week" | "this-month" | "all-time";

export interface LoggedTimeSummary {
  id: string;
  timeIn: Date | string;
  totalHours: number;
  status: TimeLogStatus;
}

interface StudentEarningsViewProps {
  initialData: StudentEarningsData;
  loggedHours?: LoggedTimeSummary[];
  initialSelectedInvoice?: FormattedInvoice;
  initialSheetOpen?: boolean;
}

function getInitials(name?: string | null): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function StudentEarningsView({
  initialData,
  loggedHours = [],
  initialSelectedInvoice,
  initialSheetOpen = false,
}: StudentEarningsViewProps) {
  const [data, setData] = React.useState<StudentEarningsData>(initialData);
  const [period, setPeriod] = React.useState<PeriodType>("this-month");
  const [selectedInvoice, setSelectedInvoice] = React.useState<FormattedInvoice | null>(
    initialSelectedInvoice ?? null
  );
  const [isSheetOpen, setIsSheetOpen] = React.useState(initialSheetOpen || Boolean(initialSelectedInvoice));

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Compute Period Metrics
  const periodMetrics = React.useMemo(() => {
    const rate = data.hourlyRate;
    const allInvoices = data.invoices;

    const paidInvoicesHours = allInvoices
      .filter((i) => i.status === InvoiceStatus.PAID)
      .reduce((sum, i) => sum + i.totalHours, 0);

    const approvedUnpaidInvoicesHours = allInvoices
      .filter((i) => i.status === InvoiceStatus.APPROVED)
      .reduce((sum, i) => sum + i.totalHours, 0);

    // If "All time", compute from database aggregates
    if (period === "all-time" || loggedHours.length === 0) {
      if (period === "all-time") {
        const paidAmount = data.totalEarnedPaid;
        const paidHours = Math.round(paidInvoicesHours * 60) / 60;

        const approvedAmount = data.totalEarnedApproved;
        const approvedHours = Math.round(approvedUnpaidInvoicesHours * 60) / 60;

        const waitingLogs = loggedHours.filter((l) => l.status === TimeLogStatus.CLOSED);
        const waitingAmount =
          waitingLogs.length > 0
            ? sumMoney(waitingLogs.map((l) => calculateLogAmount(l.totalHours, rate)))
            : calculateLogAmount(data.totalPendingHours, rate);
        const waitingHours = data.totalPendingHours;

        const totalHours = Math.round((paidHours + approvedHours + waitingHours) * 60) / 60;
        const totalAmount = sumMoney([paidAmount, approvedAmount, waitingAmount]);

        return {
          totalAmount,
          totalHours,
          paidAmount,
          paidHours,
          approvedAmount,
          approvedHours,
          waitingAmount,
          waitingHours,
        };
      }
    }

    // Timezone calculations for Asia/Manila
    const nowZoned = toZonedTime(new Date(), TIMEZONE_MANILA);
    const weekStartZoned = startOfWeek(nowZoned, { weekStartsOn: 1 });
    const monthStartZoned = startOfMonth(nowZoned);

    const filteredLogs = loggedHours.filter((log) => {
      const logZoned = toZonedTime(new Date(log.timeIn), TIMEZONE_MANILA);
      if (period === "this-week") {
        return logZoned >= weekStartZoned;
      }
      if (period === "this-month") {
        return logZoned >= monthStartZoned;
      }
      return true;
    });

    const waitingLogs = filteredLogs.filter((l) => l.status === TimeLogStatus.CLOSED);
    const waitingHours = Math.round(
      waitingLogs.reduce((sum, l) => sum + l.totalHours, 0) * 60
    ) / 60;
    const waitingAmount = sumMoney(
      waitingLogs.map((l) => calculateLogAmount(l.totalHours, rate))
    );

    const approvedLogs = filteredLogs.filter((l) => l.status === TimeLogStatus.APPROVED);
    const periodApprovedHours = Math.round(
      approvedLogs.reduce((sum, l) => sum + l.totalHours, 0) * 60
    ) / 60;

    // Distribute approved hours between "Approved, awaiting payment" and "Paid"
    let approvedHours = 0;
    let paidHours = 0;
    let approvedAmount = 0;
    let paidAmount = 0;

    if (approvedUnpaidInvoicesHours > 0) {
      approvedHours = Math.min(periodApprovedHours, approvedUnpaidInvoicesHours);
      paidHours = Math.max(0, Math.round((periodApprovedHours - approvedHours) * 60) / 60);

      let accumulatedHours = 0;
      const awaitingLogs: typeof approvedLogs = [];
      const paidLogs: typeof approvedLogs = [];

      for (const log of approvedLogs) {
        if (accumulatedHours < approvedUnpaidInvoicesHours) {
          awaitingLogs.push(log);
          accumulatedHours += log.totalHours;
        } else {
          paidLogs.push(log);
        }
      }

      approvedAmount = sumMoney(awaitingLogs.map((l) => calculateLogAmount(l.totalHours, rate)));
      paidAmount = sumMoney(paidLogs.map((l) => calculateLogAmount(l.totalHours, rate)));
    } else {
      paidHours = periodApprovedHours;
      paidAmount = sumMoney(approvedLogs.map((l) => calculateLogAmount(l.totalHours, rate)));
    }

    const totalHours = Math.round((waitingHours + approvedHours + paidHours) * 60) / 60;
    const totalAmount = sumMoney([waitingAmount, approvedAmount, paidAmount]);

    return {
      totalAmount,
      totalHours,
      paidAmount,
      paidHours,
      approvedAmount,
      approvedHours,
      waitingAmount,
      waitingHours,
    };
  }, [data, loggedHours, period]);

  // Sorted invoices: newest first
  const sortedInvoices = React.useMemo(() => {
    return [...data.invoices].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [data.invoices]);

  const paidInvoicesCount = React.useMemo(() => {
    return data.invoices.filter((i) => i.status === InvoiceStatus.PAID).length;
  }, [data.invoices]);

  // Tasks summary
  const totalTaskHours = React.useMemo(() => {
    return Math.round(data.taskBreakdown.reduce((sum, t) => sum + t.totalHours, 0) * 60) / 60;
  }, [data.taskBreakdown]);

  const totalTaskAmount = React.useMemo(() => {
    return sumMoney(data.taskBreakdown.map((t) => t.amount));
  }, [data.taskBreakdown]);

  const totalTaskSessions = React.useMemo(() => {
    return data.taskBreakdown.reduce((sum, t) => sum + t.sessionsCount, 0);
  }, [data.taskBreakdown]);

  const openInvoiceSheet = (invoice: FormattedInvoice) => {
    setSelectedInvoice(invoice);
    setIsSheetOpen(true);
  };

  const periodLabel =
    period === "this-week"
      ? "Logged this week"
      : period === "this-month"
        ? "Logged this month"
        : "Logged all time";

  return (
    <PageContainer>
      {/* 1. HEADER */}
      <PageHeader
        title="Earnings"
        subtitle="Your logged hours, invoices and payments."
        actions={
          data.linkedClient ? (
            <div className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#0F172A] bg-white px-3 py-1.5 shadow-[2px_2px_0px_0px_#0F172A] text-xs font-semibold text-[#0F172A] self-start sm:self-auto">
              <div className="flex size-6 items-center justify-center rounded-full bg-[#FAF7F2] border-[1px] border-[#0F172A] text-[10px] font-bold">
                {getInitials(data.linkedClient.name)}
              </div>
              <span>{`${data.linkedClient.name} · ${formatPeso(data.hourlyRate)}/hr`}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#0F172A] bg-white px-3 py-1.5 shadow-[2px_2px_0px_0px_#0F172A] text-xs font-medium text-slate-600 self-start sm:self-auto">
              <span>{`No linked client · ${formatPeso(data.hourlyRate)}/hr`}</span>
            </div>
          )
        }
      />

      {/* 2. HERO CARD (Focal Point) */}
      <Card className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-5 sm:p-6 shadow-[3px_3px_0px_0px_#0F172A]">
        <CardContent className="p-0 space-y-4">
          {/* Top row: Label & Segmented Period Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {periodLabel}
            </span>

            {/* Segmented period toggle */}
            <div
              data-testid="earnings-period-toggle"
              data-period={period}
              role="radiogroup"
              aria-label="Filter earnings by period"
              className="inline-flex max-w-full overflow-x-auto rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-1 shadow-[2px_2px_0px_0px_#0F172A] scrollbar-none"
            >
              <button
                type="button"
                role="radio"
                aria-checked={period === "this-week"}
                data-period="this-week"
                onClick={() => setPeriod("this-week")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] ${period === "this-week"
                    ? "bg-[#0F172A] text-white shadow-xs"
                    : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
                  }`}
              >
                This week
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={period === "this-month"}
                data-period="this-month"
                onClick={() => setPeriod("this-month")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] ${period === "this-month"
                    ? "bg-[#0F172A] text-white shadow-xs"
                    : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
                  }`}
              >
                This month
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={period === "all-time"}
                data-period="all-time"
                onClick={() => setPeriod("all-time")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] ${period === "all-time"
                    ? "bg-[#0F172A] text-white shadow-xs"
                    : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
                  }`}
              >
                All time
              </button>
            </div>
          </div>

          {/* Focal Big Display Number */}
          <div className="space-y-1">
            <div
              data-testid="earnings-total"
              className="font-display text-3xl sm:text-4xl font-black tracking-tight text-[#0F172A]"
            >
              {formatPeso(periodMetrics.totalAmount)}
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-600">
              {formatHours(periodMetrics.totalHours)} logged
            </p>
          </div>

          {/* Stacked Segmented Bar & Legend */}
          <div data-testid="earnings-breakdown" className="pt-2">
            {periodMetrics.totalAmount === 0 && periodMetrics.totalHours === 0 ? (
              <div className="space-y-2">
                <div className="h-4 w-full rounded-md border-[1.5px] border-[#0F172A] bg-[#FAF7F2]" />
                <p className="text-xs text-slate-500 font-medium">
                  Nothing logged in this period yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Segmented Bar Track */}
                <div className="h-4 w-full rounded-md border-[1.5px] border-[#0F172A] bg-[#FAF7F2] flex overflow-hidden shadow-[1px_1px_0px_0px_#0F172A]">
                  {periodMetrics.paidAmount > 0 && (
                    <div
                      style={{
                        width: `${(periodMetrics.paidAmount / periodMetrics.totalAmount) * 100}%`,
                      }}
                      className="bg-[#16A34A] h-full border-r border-[#0F172A] last:border-r-0 transition-all duration-300"
                      title={`Paid: ${formatPeso(periodMetrics.paidAmount)} (${formatHours(periodMetrics.paidHours)})`}
                    />
                  )}
                  {periodMetrics.approvedAmount > 0 && (
                    <div
                      style={{
                        width: `${(periodMetrics.approvedAmount / periodMetrics.totalAmount) * 100}%`,
                      }}
                      className="bg-[#0F172A] h-full border-r border-[#0F172A] last:border-r-0 transition-all duration-300"
                      title={`Approved, awaiting payment: ${formatPeso(periodMetrics.approvedAmount)} (${formatHours(periodMetrics.approvedHours)})`}
                    />
                  )}
                  {periodMetrics.waitingAmount > 0 && (
                    <div
                      style={{
                        width: `${(periodMetrics.waitingAmount / periodMetrics.totalAmount) * 100}%`,
                      }}
                      className="bg-[#D97706] h-full border-r border-[#0F172A] last:border-r-0 transition-all duration-300"
                      title={`Waiting for approval: ${formatPeso(periodMetrics.waitingAmount)} (${formatHours(periodMetrics.waitingHours)})`}
                    />
                  )}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  {periodMetrics.paidAmount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-xs bg-[#16A34A] border border-[#0F172A]" />
                      <span className="font-bold text-[#0F172A]">Paid</span>
                      <span className="text-slate-600">
                        &middot; {formatPeso(periodMetrics.paidAmount)} ({formatHours(periodMetrics.paidHours)})
                      </span>
                    </div>
                  )}
                  {periodMetrics.approvedAmount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-xs bg-[#0F172A] border border-[#0F172A]" />
                      <span className="font-bold text-[#0F172A]">Approved, awaiting payment</span>
                      <span className="text-slate-600">
                        &middot; {formatPeso(periodMetrics.approvedAmount)} ({formatHours(periodMetrics.approvedHours)})
                      </span>
                    </div>
                  )}
                  {periodMetrics.waitingAmount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-xs bg-[#D97706] border border-[#0F172A]" />
                      <span className="font-bold text-[#0F172A]">Waiting for approval</span>
                      <span className="text-slate-600">
                        &middot; {formatPeso(periodMetrics.waitingAmount)} ({formatHours(periodMetrics.waitingHours)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. THREE COMPACT TILES */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto snap-x snap-mandatory pb-2 sm:pb-0 scrollbar-none">
        {/* Tile 1: Paid */}
        <Card
          data-testid="earnings-tile"
          data-kind="paid"
          className="min-w-[240px] sm:min-w-0 snap-start rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[3px_3px_0px_0px_#0F172A]"
        >
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Paid
            </span>
            <div className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
              {formatPeso(data.totalEarnedPaid)}
            </div>
            <p className="text-xs font-medium text-slate-600">
              {paidInvoicesCount === 1 ? "1 invoice paid" : `${paidInvoicesCount} invoices paid`}
            </p>
          </CardContent>
        </Card>

        {/* Tile 2: Awaiting payment */}
        <Card
          data-testid="earnings-tile"
          data-kind="awaiting-payment"
          className="min-w-[240px] sm:min-w-0 snap-start rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[3px_3px_0px_0px_#0F172A]"
        >
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Awaiting payment
            </span>
            <div className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
              {formatPeso(data.totalEarnedApproved)}
            </div>
            <p className="text-xs font-medium text-slate-600">
              Approved by your client
            </p>
          </CardContent>
        </Card>

        {/* Tile 3: Waiting for approval */}
        <Card
          data-testid="earnings-tile"
          data-kind="waiting-approval"
          className="min-w-[240px] sm:min-w-0 snap-start rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[3px_3px_0px_0px_#0F172A]"
        >
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Waiting for approval
            </span>
            <div className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
              {formatHours(data.totalPendingHours)}
            </div>
            <p className="text-xs font-medium text-slate-600">
              {`About ${formatPeso(calculateLogAmount(data.totalPendingHours, data.hourlyRate))} at ${formatPeso(data.hourlyRate)}/hr`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 4. INVOICES SECTION */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-bold text-[#0F172A]">
            Invoices
          </h2>
          <span className="rounded-full border-[1.5px] border-[#0F172A] bg-[#FAF7F2] px-2 py-0.5 text-xs font-bold text-[#0F172A] shadow-[1px_1px_0px_0px_#0F172A]">
            {sortedInvoices.length}
          </span>
        </div>

        {sortedInvoices.length === 0 ? (
          <div className="rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[2px_2px_0px_0px_#0F172A] text-xs text-slate-600">
            No invoices yet. When your client approves your hours, an invoice shows up here.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-xl border-[1.5px] border-[#0F172A] bg-white overflow-hidden shadow-[3px_3px_0px_0px_#0F172A]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] border-b border-[#E5DFD5] text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Issued</th>
                    <th className="p-3.5 text-right">Hours</th>
                    <th className="p-3.5 text-right">Rate</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DFD5]">
                  {sortedInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      data-testid="invoice-row"
                      data-status={inv.status.toLowerCase()}
                      onClick={() => openInvoiceSheet(inv)}
                      className="hover:bg-[#FAF7F2] transition-colors cursor-pointer group"
                    >
                      <td className="p-3.5 font-medium text-[#0F172A]">
                        {formatDate(inv.createdAt)}
                      </td>
                      <td className="p-3.5 text-right font-medium text-[#0F172A]">
                        {formatHours(inv.totalHours)}
                      </td>
                      <td className="p-3.5 text-right text-slate-600 font-medium">
                        {formatPeso(inv.rate)}/hr
                      </td>
                      <td className="p-3.5 text-right font-bold text-[#0F172A]">
                        {formatPeso(inv.amount)}
                      </td>
                      <td className="p-3.5 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          data-testid="invoice-view"
                          onClick={(e) => {
                            e.stopPropagation();
                            openInvoiceSheet(inv);
                          }}
                          className="h-7 text-xs font-semibold gap-1 text-slate-700 hover:text-[#0F172A] hover:bg-[#EFEAE2] cursor-pointer"
                        >
                          <Eye className="size-3.5" />
                          <span>View</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-2.5">
              {sortedInvoices.map((inv) => (
                <div
                  key={inv.id}
                  data-testid="invoice-row"
                  data-status={inv.status.toLowerCase()}
                  onClick={() => openInvoiceSheet(inv)}
                  className="rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[2px_2px_0px_0px_#0F172A] space-y-3 cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#0F172A]">
                      Issued {formatDate(inv.createdAt)}
                    </span>
                    <StatusBadge status={inv.status} />
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-lg font-bold text-[#0F172A]">
                        {formatPeso(inv.amount)}
                      </div>
                      <div className="text-xs text-slate-600">
                        {formatHours(inv.totalHours)} @ {formatPeso(inv.rate)}/hr
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      data-testid="invoice-view"
                      onClick={(e) => {
                        e.stopPropagation();
                        openInvoiceSheet(inv);
                      }}
                      className="h-7 text-xs font-semibold gap-1 text-slate-700 hover:text-[#0F172A] hover:bg-[#EFEAE2] cursor-pointer"
                    >
                      <Eye className="size-3.5" />
                      <span>View</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 5. EARNINGS BY TASK SECTION */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-bold text-[#0F172A]">
            By task
          </h2>
          <span className="rounded-full border-[1.5px] border-[#0F172A] bg-[#FAF7F2] px-2 py-0.5 text-xs font-bold text-[#0F172A] shadow-[1px_1px_0px_0px_#0F172A]">
            {data.taskBreakdown.length}
          </span>
        </div>

        {data.taskBreakdown.length === 0 ? (
          <div className="rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[2px_2px_0px_0px_#0F172A] text-xs text-slate-600">
            No hours logged yet. Time in on a task to start earning.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-xl border-[1.5px] border-[#0F172A] bg-white overflow-hidden shadow-[3px_3px_0px_0px_#0F172A]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] border-b border-[#E5DFD5] text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Task title</th>
                    <th className="p-3.5 text-center">Sessions</th>
                    <th className="p-3.5 text-right">Hours</th>
                    <th className="p-3.5 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DFD5]">
                  {data.taskBreakdown.map((item) => (
                    <tr
                      key={item.taskId}
                      data-testid="earnings-task-row"
                      className="hover:bg-[#FAF7F2] transition-colors"
                    >
                      <td className="p-3.5 font-semibold text-[#0F172A] max-w-[340px] truncate">
                        {item.taskTitle}
                      </td>
                      <td className="p-3.5 text-center text-slate-700 font-medium">
                        {item.sessionsCount}
                      </td>
                      <td className="p-3.5 text-right font-medium text-[#0F172A]">
                        {formatHours(item.totalHours)}
                      </td>
                      <td className="p-3.5 text-right font-bold text-[#0F172A]">
                        {formatPeso(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#FAF7F2] border-t-2 border-[#0F172A] font-bold text-[#0F172A]">
                  <tr>
                    <td className="p-3.5 uppercase tracking-wider text-[11px]">
                      Total
                    </td>
                    <td className="p-3.5 text-center text-slate-700 font-bold">
                      {totalTaskSessions}
                    </td>
                    <td className="p-3.5 text-right">
                      {formatHours(totalTaskHours)}
                    </td>
                    <td className="p-3.5 text-right text-[#0F172A]">
                      {formatPeso(totalTaskAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-2.5">
              {data.taskBreakdown.map((item) => (
                <div
                  key={item.taskId}
                  data-testid="earnings-task-row"
                  className="rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[2px_2px_0px_0px_#0F172A] space-y-2"
                >
                  <div className="font-semibold text-xs text-[#0F172A] truncate">
                    {item.taskTitle}
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E5DFD5]">
                    <span className="text-slate-700 font-medium">
                      {item.sessionsCount} session{item.sessionsCount === 1 ? "" : "s"} &middot; {formatHours(item.totalHours)}
                    </span>
                    <span className="font-bold text-[#0F172A]">
                      {formatPeso(item.amount)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Mobile Total Card */}
              <div className="rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-4 shadow-[2px_2px_0px_0px_#0F172A] flex items-center justify-between text-xs font-bold text-[#0F172A]">
                <span>Total ({formatHours(totalTaskHours)})</span>
                <span className="text-sm font-black">{formatPeso(totalTaskAmount)}</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* 6. INVOICE DETAIL SHEET */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          side="responsive"
          data-testid="invoice-sheet"
          className="w-full sm:max-w-md space-y-6 focus:outline-none"
        >
          {selectedInvoice && (
            <>
              {/* Header */}
              <SheetHeader className="space-y-2 pr-8">
                <div className="flex items-center gap-2">
                  <SheetTitle>Invoice</SheetTitle>
                  <StatusBadge status={selectedInvoice.status} />
                </div>
                <SheetDescription className="text-xs text-slate-600">
                  Issued {formatDate(selectedInvoice.createdAt)} &middot; Client:{" "}
                  {selectedInvoice.clientName ?? "—"}
                </SheetDescription>
              </SheetHeader>

              {/* 3-Step Status Indicator */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Status
                </span>
                <div className="rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-4 shadow-[2px_2px_0px_0px_#0F172A]">
                  <div className="flex items-center justify-between relative">
                    {/* Connecting Bar */}
                    <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-[#E5DFD5] -z-0">
                      <div
                        className="h-full bg-[#0F172A] transition-all duration-300"
                        style={{
                          width:
                            selectedInvoice.status === InvoiceStatus.PAID
                              ? "100%"
                              : selectedInvoice.status === InvoiceStatus.APPROVED
                                ? "50%"
                                : "0%",
                        }}
                      />
                    </div>

                    {/* Step 1: Pending */}
                    <div className="flex flex-col items-center gap-1.5 relative z-10">
                      <div
                        className={`size-7 rounded-full border-[1.5px] border-[#0F172A] flex items-center justify-center text-xs font-bold shadow-[1px_1px_0px_0px_#0F172A] ${selectedInvoice.status === InvoiceStatus.PENDING
                            ? "bg-[#0F172A] text-white"
                            : "bg-[#16A34A] text-white"
                          }`}
                      >
                        {selectedInvoice.status === InvoiceStatus.PENDING ? (
                          <Clock className="size-3.5" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-[#0F172A]">
                        Pending
                      </span>
                    </div>

                    {/* Step 2: Approved */}
                    <div className="flex flex-col items-center gap-1.5 relative z-10">
                      <div
                        className={`size-7 rounded-full border-[1.5px] border-[#0F172A] flex items-center justify-center text-xs font-bold shadow-[1px_1px_0px_0px_#0F172A] ${selectedInvoice.status === InvoiceStatus.PAID
                            ? "bg-[#16A34A] text-white"
                            : selectedInvoice.status === InvoiceStatus.APPROVED
                              ? "bg-[#0F172A] text-white"
                              : "bg-white text-slate-400"
                          }`}
                      >
                        {selectedInvoice.status === InvoiceStatus.PAID ? (
                          <Check className="size-3.5" />
                        ) : (
                          "2"
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold ${selectedInvoice.status !== InvoiceStatus.PENDING
                            ? "text-[#0F172A]"
                            : "text-slate-400"
                          }`}
                      >
                        Approved
                      </span>
                    </div>

                    {/* Step 3: Paid */}
                    <div className="flex flex-col items-center gap-1.5 relative z-10">
                      <div
                        className={`size-7 rounded-full border-[1.5px] border-[#0F172A] flex items-center justify-center text-xs font-bold shadow-[1px_1px_0px_0px_#0F172A] ${selectedInvoice.status === InvoiceStatus.PAID
                            ? "bg-[#16A34A] text-white"
                            : "bg-white text-slate-400"
                          }`}
                      >
                        {selectedInvoice.status === InvoiceStatus.PAID ? (
                          <Check className="size-3.5" />
                        ) : (
                          "3"
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold ${selectedInvoice.status === InvoiceStatus.PAID
                            ? "text-[#0F172A]"
                            : "text-slate-400"
                          }`}
                      >
                        Paid
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Breakdown / Summary */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Summary
                </span>
                <div className="rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[2px_2px_0px_0px_#0F172A] space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E5DFD5]">
                    <span className="text-slate-600 font-medium">Total approved hours</span>
                    <span className="font-bold text-[#0F172A]">
                      {formatHours(selectedInvoice.totalHours)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E5DFD5]">
                    <span className="text-slate-600 font-medium">Hourly rate</span>
                    <span className="font-bold text-[#0F172A]">
                      {formatPeso(selectedInvoice.rate)}/hr
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-1">
                    <span className="font-bold text-[#0F172A]">Total amount</span>
                    <span className="font-display font-black text-lg text-[#0F172A]">
                      {formatPeso(selectedInvoice.amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Note for Approved status */}
              {selectedInvoice.status === InvoiceStatus.APPROVED && (
                <div className="rounded-xl border-[1.5px] border-[#0F172A] bg-[#FFFBEB] p-3.5 shadow-[2px_2px_0px_0px_#0F172A] text-xs text-[#92400E] leading-relaxed">
                  Payment is arranged directly with your client. They will mark this invoice as paid.
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
