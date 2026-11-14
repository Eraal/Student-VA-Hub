"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { parseISO } from "date-fns";
import { format as formatZoned } from "date-fns-tz";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/lib/labels";
import { formatHours, formatPeso, formatDate, formatDateRange } from "@/lib/format";
import {
  getReportDateRange,
  isLogInRange,
  calculateReportTotals,
  groupLogsByTask,
  downloadReportCsv,
  type ReportRangePreset,
  type ReportTaskGroup,
} from "@/lib/reports";
import type { ReportPayload } from "@/lib/services/report-service";
import {
  Printer,
  Download,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  UserX,
  Clock,
  Wallet,
} from "lucide-react";

interface ReportViewProps {
  initialData: ReportPayload;
  initialPreset?: ReportRangePreset;
  initialFrom?: string;
  initialTo?: string;
}

export function ReportView({
  initialData,
  initialPreset = "this-month",
  initialFrom,
  initialTo,
}: ReportViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = React.useState<ReportPayload>(initialData);

  // Sync state if server passes updated data via live updates
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Read range parameters from URL search params or fallback to props
  const rawRange = searchParams.get("range");
  const urlPreset: ReportRangePreset =
    rawRange === "this-week" || rawRange === "this-month" || rawRange === "custom"
      ? rawRange
      : initialPreset;

  const urlFrom = searchParams.get("from") ?? initialFrom ?? null;
  const urlTo = searchParams.get("to") ?? initialTo ?? null;

  const dateRange = React.useMemo(() => {
    return getReportDateRange(urlPreset, urlFrom, urlTo);
  }, [urlPreset, urlFrom, urlTo]);

  // Update URL search params whenever preset or custom dates change
  const updateRangeInUrl = (
    nextPreset: ReportRangePreset,
    nextFrom?: string,
    nextTo?: string
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", nextPreset);

    if (nextPreset === "custom" && nextFrom && nextTo) {
      params.set("from", nextFrom);
      params.set("to", nextTo);
    } else {
      params.delete("from");
      params.delete("to");
    }

    const query = params.toString();
    const targetUrl = query ? `${pathname}?${query}` : pathname;
    router.replace(targetUrl, { scroll: false });
  };

  // Filter logs falling within the Manila date range
  const filteredLogs = React.useMemo(() => {
    return data.logs.filter((log) =>
      isLogInRange(log.timeIn, dateRange.from, dateRange.to)
    );
  }, [data.logs, dateRange.from, dateRange.to]);

  // Summary totals calculated via single source of truth in lib/reports.ts
  const totals = React.useMemo(() => {
    return calculateReportTotals(filteredLogs, data.hourlyRate, data.invoices);
  }, [filteredLogs, data.hourlyRate, data.invoices]);

  // Table rows grouped by task
  const taskGroups: ReportTaskGroup[] = React.useMemo(() => {
    return groupLogsByTask(filteredLogs, data.hourlyRate);
  }, [filteredLogs, data.hourlyRate]);

  // Popover controls for custom calendar date pickers
  const [isFromOpen, setIsFromOpen] = React.useState(false);
  const [isToOpen, setIsToOpen] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (taskGroups.length === 0) return;
    downloadReportCsv(taskGroups, dateRange.from, dateRange.to);
  };

  // Human-readable period string (e.g. "Nov 1 – Nov 30, 2026")
  const periodDisplay = React.useMemo(() => {
    const fromDate = parseISO(dateRange.from);
    const toDate = parseISO(dateRange.to);
    return formatDateRange(fromDate, toDate);
  }, [dateRange.from, dateRange.to]);

  // If client is not linked to any student
  if (data.role === "CLIENT" && !data.linked) {
    return (
      <PageContainer>
        <PageHeader
          title="Reports"
          subtitle="Generate clean summary reports of your student's work and billing."
        />
        <EmptyState
          icon={UserX}
          title="No linked student yet"
          description="Link a student using their 8-character invite code to review their hours, billing, and task reports."
        />
      </PageContainer>
    );
  }

  const isStudent = data.role === "STUDENT";

  return (
    <PageContainer>
      {/* =========================================================================
          PRINT HEADER: Visible only on A4 printout, hides nav and actions
          ========================================================================= */}
      <div className="hidden print:block mb-6 border-b-2 border-[#0F172A] pb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight text-[#0F172A]">
              VAwise
            </h1>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {isStudent ? "Student VA Report" : "Client Work Report"}
            </p>
          </div>
          <div className="text-right text-xs text-slate-600 space-y-0.5">
            <div>Generated: {formatDate(new Date(), "MMMM d, yyyy")}</div>
            <div>Timezone: Asia/Manila (UTC+8)</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 text-xs border-t border-[#E5DFD5]">
          <div>
            {isStudent ? (
              <span>Client: <strong>{data.clientName || "—"}</strong></span>
            ) : (
              <span>Student: <strong>{data.studentName || "—"}</strong></span>
            )}
            <span className="mx-2">&middot;</span>
            <span>Rate: <strong>{formatPeso(data.hourlyRate)}/hr</strong></span>
          </div>
          <div>
            Period: <strong>{periodDisplay}</strong>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SCREEN HEADER & TOP ACTIONS (Hidden on print)
          ========================================================================= */}
      <div className="print:hidden space-y-4">
        <PageHeader
          title="Reports"
          subtitle={
            isStudent
              ? "Your approved hours, earnings, and task summary for any date range."
              : "Review your student's approved hours, billable amounts, and task summary."
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="report-print"
                onClick={handlePrint}
                className="h-9 px-3 text-xs font-bold bg-white text-[#0F172A] border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#FAF7F2] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                <Printer className="size-3.5 mr-1.5" />
                <span>Print</span>
              </Button>
              <Button
                type="button"
                size="sm"
                data-testid="report-export"
                onClick={handleExportCsv}
                disabled={taskGroups.length === 0}
                className="h-9 px-3 text-xs font-bold bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Download className="size-3.5 mr-1.5" />
                <span>Export CSV</span>
              </Button>
            </div>
          }
        />

        {/* =======================================================================
            DATE FILTER CONTROLS (Requirement 2 & data-testid="report-range")
            ======================================================================= */}
        <div
          data-testid="report-range"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border-[1.5px] border-[#0F172A] bg-white shadow-[2px_2px_0px_0px_#0F172A]"
        >
          {/* Segmented Preset Toggle */}
          <div
            role="radiogroup"
            aria-label="Filter report range"
            className="inline-flex max-w-full overflow-x-auto rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-1 shadow-[1.5px_1.5px_0px_0px_#0F172A] scrollbar-none"
          >
            <button
              type="button"
              role="radio"
              aria-checked={dateRange.preset === "this-week"}
              onClick={() => updateRangeInUrl("this-week")}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] ${
                dateRange.preset === "this-week"
                  ? "bg-[#0F172A] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
              }`}
            >
              This week
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={dateRange.preset === "this-month"}
              onClick={() => updateRangeInUrl("this-month")}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] ${
                dateRange.preset === "this-month"
                  ? "bg-[#0F172A] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
              }`}
            >
              This month
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={dateRange.preset === "custom"}
              onClick={() => {
                if (dateRange.preset !== "custom") {
                  updateRangeInUrl("custom", dateRange.from, dateRange.to);
                }
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] ${
                dateRange.preset === "custom"
                  ? "bg-[#0F172A] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
              }`}
            >
              Custom range
            </button>
          </div>

          {/* Custom Date Pickers via Calendar Component */}
          {dateRange.preset === "custom" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs font-bold bg-white text-[#0F172A] border-[1.5px] border-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] hover:bg-[#FAF7F2] cursor-pointer"
                  >
                    <CalendarIcon className="size-3.5 mr-1 text-slate-500" />
                    <span>From: {formatDate(parseISO(dateRange.from), "MMM d, yyyy")}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0 border-[1.5px] border-[#0F172A] shadow-[3px_3px_0px_0px_#0F172A] bg-white">
                  <Calendar
                    selected={parseISO(dateRange.from)}
                    onSelect={(d) => {
                      const newFrom = formatZoned(d, "yyyy-MM-dd");
                      updateRangeInUrl("custom", newFrom, dateRange.to);
                      setIsFromOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>

              <span className="text-xs font-bold text-slate-500">–</span>

              <Popover open={isToOpen} onOpenChange={setIsToOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs font-bold bg-white text-[#0F172A] border-[1.5px] border-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] hover:bg-[#FAF7F2] cursor-pointer"
                  >
                    <CalendarIcon className="size-3.5 mr-1 text-slate-500" />
                    <span>To: {formatDate(parseISO(dateRange.to), "MMM d, yyyy")}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0 border-[1.5px] border-[#0F172A] shadow-[3px_3px_0px_0px_#0F172A] bg-white">
                  <Calendar
                    selected={parseISO(dateRange.to)}
                    onSelect={(d) => {
                      const newTo = formatZoned(d, "yyyy-MM-dd");
                      updateRangeInUrl("custom", dateRange.from, newTo);
                      setIsToOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 self-center">
              <CalendarIcon className="size-3.5 text-slate-500" />
              <span>{periodDisplay}</span>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          FOUR SUMMARY TILES (Requirement 3)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tile 1: Hours worked (approved) / Hours approved */}
        <Card
          data-testid="report-tile-hours"
          className="rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[3px_3px_0px_0px_#0F172A] print:shadow-none print:border-slate-800 break-inside-avoid"
        >
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isStudent ? "Hours worked (approved)" : "Hours approved"}
            </span>
            <div className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
              {formatHours(totals.approvedHours)}
            </div>
            <p className="text-xs font-medium text-slate-600">
              Approved billable hours
            </p>
          </CardContent>
        </Card>

        {/* Tile 2: Total earned / Total amount */}
        <Card
          data-testid="report-tile-amount"
          className="rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[3px_3px_0px_0px_#0F172A] print:shadow-none print:border-slate-800 break-inside-avoid"
        >
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isStudent ? "Total earned" : "Total amount"}
            </span>
            <div className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
              {formatPeso(totals.approvedAmount)}
            </div>
            <p className="text-xs font-medium text-slate-600">
              At {formatPeso(data.hourlyRate)}/hr
            </p>
          </CardContent>
        </Card>

        {/* Tile 3: Waiting for approval / Waiting for my approval */}
        <Card
          data-testid="report-tile-pending"
          className="rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[3px_3px_0px_0px_#0F172A] print:shadow-none print:border-slate-800 break-inside-avoid"
        >
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isStudent ? "Waiting for approval" : "Waiting for my approval"}
            </span>
            <div className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
              {formatHours(totals.pendingHours)}
            </div>
            <p className="text-xs font-medium text-slate-600">
              About {formatPeso(totals.pendingAmount)}
            </p>
          </CardContent>
        </Card>

        {/* Tile 4: Paid vs unpaid (amounts) */}
        <Card
          data-testid="report-tile-paid"
          className="rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[3px_3px_0px_0px_#0F172A] print:shadow-none print:border-slate-800 break-inside-avoid"
        >
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Paid vs unpaid
            </span>
            <div className="font-display text-lg sm:text-xl font-black tracking-tight text-[#0F172A] truncate">
              {formatPeso(totals.paidAmount)} / {formatPeso(totals.unpaidAmount)}
            </div>
            <p className="text-xs font-medium text-slate-600 truncate">
              {formatPeso(totals.paidAmount)} paid &middot; {formatPeso(totals.unpaidAmount)} unpaid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* =========================================================================
          TABLE GROUPED BY TASK (Requirement 4 & data-testid="report-table")
          ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              {!isStudent && data.studentName
                ? `Report for ${data.studentName}`
                : "Task breakdown"}
            </h2>
            <span className="rounded-full border-[1.5px] border-[#0F172A] bg-[#FAF7F2] px-2 py-0.5 text-xs font-bold text-[#0F172A] shadow-[1px_1px_0px_0px_#0F172A]">
              {taskGroups.length}
            </span>
          </div>

          <div className="text-xs font-semibold text-slate-600 print:hidden">
            {periodDisplay}
          </div>
        </div>

        {taskGroups.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="No activity in this period"
            description="No logged work was recorded during this date range. Try switching to 'This month' or picking a different range."
          />
        ) : (
          <div
            data-testid="report-table"
            className="rounded-xl border-[1.5px] border-[#0F172A] bg-white overflow-hidden shadow-[3px_3px_0px_0px_#0F172A] print:shadow-none print:border-slate-800"
          >
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] border-b border-[#E5DFD5] text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Task</th>
                  <th className="p-3.5 text-right">Hours</th>
                  <th className="p-3.5 text-right">Amount</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DFD5]">
                {taskGroups.map((group) => (
                  <tr
                    key={group.taskId}
                    className="hover:bg-[#FAF7F2] transition-colors"
                  >
                    <td className="p-3.5 font-semibold text-[#0F172A]">
                      {group.taskTitle}
                    </td>
                    <td className="p-3.5 text-right font-medium text-[#0F172A]">
                      {formatHours(group.hours)}
                    </td>
                    <td className="p-3.5 text-right font-bold text-[#0F172A]">
                      {formatPeso(group.amount)}
                    </td>
                    <td className="p-3.5 text-center">
                      <StatusBadge status={group.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#FAF7F2] border-t-2 border-[#0F172A] font-bold text-[#0F172A]">
                <tr>
                  <td className="p-3.5 uppercase tracking-wider text-[11px]">
                    Total
                  </td>
                  <td className="p-3.5 text-right">
                    {formatHours(totals.totalHours)}
                  </td>
                  <td className="p-3.5 text-right">
                    {formatPeso(totals.totalAmount)}
                  </td>
                  <td className="p-3.5 text-center text-slate-400">
                    —
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </PageContainer>
  );
}

