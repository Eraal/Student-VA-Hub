"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InvoiceStatus, TimeLogStatus, CorrectionStatus } from "@prisma/client";
import { ClientTimesheetData, FormattedInvoice } from "@/lib/services/invoice-service";
import {
  approveTimeLogAction,
  respondCorrectionAction,
  markInvoicePaidAction,
} from "@/lib/actions/invoice";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { StatusBadge } from "@/lib/labels";
import {
  formatDate,
  formatTime,
  formatTimeRange,
  formatHours,
  formatPeso,
} from "@/lib/format";
import { calculateLogAmount, calculateLoggedMinutes, sumMoney } from "@/lib/money";
import { toUserErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { DisputeDialog, DisputeLogInfo } from "./dispute-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  FileText,
  Clock,
  Calendar,
  Check,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Receipt,
  UserX,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ClientTimesheetsViewProps {
  initialData: ClientTimesheetData;
}

type TabType = "to-review" | "approved" | "invoices";

export function ClientTimesheetsView({ initialData }: ClientTimesheetsViewProps) {
  const router = useRouter();
  const [data, setData] = React.useState<ClientTimesheetData>(initialData);
  const [activeTab, setActiveTab] = React.useState<TabType>("to-review");
  const [processingLogId, setProcessingLogId] = React.useState<string | null>(null);
  const [processingInvoiceId, setProcessingInvoiceId] = React.useState<string | null>(null);

  // Expanded notes state (key = log.id)
  const [expandedNotes, setExpandedNotes] = React.useState<Record<string, boolean>>({});

  // Dispute modal state
  const [disputeLog, setDisputeLog] = React.useState<DisputeLogInfo | null>(null);

  // Mark as paid confirmation modal state
  const [confirmPayingInvoice, setConfirmPayingInvoice] = React.useState<FormattedInvoice | null>(
    null
  );

  // Invoice detail sheet state
  const [sheetInvoice, setSheetInvoice] = React.useState<FormattedInvoice | null>(null);

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const studentFirstName =
    data.linkedStudent?.name?.trim().split(/\s+/)[0] || "Student";

  const toggleNote = (logId: string) => {
    setExpandedNotes((prev) => ({ ...prev, [logId]: !prev[logId] }));
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const handleApprove = async (logId: string, totalHours: number, taskTitle: string) => {
    setProcessingLogId(logId);
    try {
      const res = await approveTimeLogAction({ timeLogId: logId });
      if (res.success) {
        const amount = calculateLogAmount(totalHours, data.hourlyRate);
        toast.success(
          `Approved ${formatHours(totalHours)} · ${formatPeso(amount)}. Added to your open invoice.`
        );
        router.refresh();
      } else {
        toast.error(toUserErrorMessage(res.error));
      }
    } catch (err) {
      toast.error(toUserErrorMessage(err));
    } finally {
      setProcessingLogId(null);
    }
  };

  const handleCorrectionResponse = async (
    logId: string,
    decision: "APPROVE" | "REJECT"
  ) => {
    setProcessingLogId(logId);
    try {
      const res = await respondCorrectionAction({ timeLogId: logId, decision });
      if (res.success) {
        toast.success(
          decision === "APPROVE"
            ? "Time correction approved."
            : "Time correction declined."
        );
        router.refresh();
      } else {
        toast.error(toUserErrorMessage(res.error));
      }
    } catch (err) {
      toast.error(toUserErrorMessage(err));
    } finally {
      setProcessingLogId(null);
    }
  };

  const handleConfirmMarkPaid = async () => {
    if (!confirmPayingInvoice) return;
    setProcessingInvoiceId(confirmPayingInvoice.id);
    try {
      const res = await markInvoicePaidAction({ invoiceId: confirmPayingInvoice.id });
      if (res.success) {
        toast.success("Invoice marked as paid");
        setConfirmPayingInvoice(null);
        router.refresh();
      } else {
        toast.error(toUserErrorMessage(res.error));
      }
    } catch (err) {
      toast.error(toUserErrorMessage(err));
    } finally {
      setProcessingInvoiceId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Metrics & Calculations
  // ---------------------------------------------------------------------------
  const unpaidApprovedInvoices = React.useMemo(() => {
    return data.invoices.filter((i) => i.status === InvoiceStatus.APPROVED);
  }, [data.invoices]);

  const toPayAmount = React.useMemo(() => {
    return sumMoney(unpaidApprovedInvoices.map((i) => i.amount));
  }, [unpaidApprovedInvoices]);

  const paidInvoices = React.useMemo(() => {
    return data.invoices.filter((i) => i.status === InvoiceStatus.PAID);
  }, [data.invoices]);

  const paidAmount = React.useMemo(() => {
    return sumMoney(paidInvoices.map((i) => i.amount));
  }, [paidInvoices]);

  const openInvoice = unpaidApprovedInvoices[0] ?? null;

  // ---------------------------------------------------------------------------
  // Task Grouping for "To review" Tab
  // ---------------------------------------------------------------------------
  const pendingGroups = React.useMemo(() => {
    const map: Record<
      string,
      {
        taskId: string;
        taskTitle: string;
        taskEstHours: number;
        taskLoggedHours: number;
        logs: typeof data.pendingLogs;
        totalPendingHours: number;
        totalPendingAmount: number;
      }
    > = {};

    for (const log of data.pendingLogs) {
      if (!map[log.taskId]) {
        map[log.taskId] = {
          taskId: log.taskId,
          taskTitle: log.taskTitle,
          taskEstHours: log.taskEstHours ?? 0,
          taskLoggedHours: log.taskLoggedHours ?? 0,
          logs: [],
          totalPendingHours: 0,
          totalPendingAmount: 0,
        };
      }
      map[log.taskId].logs.push(log);
      map[log.taskId].totalPendingHours += log.totalHours;
      map[log.taskId].totalPendingAmount = sumMoney([
        map[log.taskId].totalPendingAmount,
        calculateLogAmount(log.totalHours, data.hourlyRate),
      ]);
    }

    return Object.values(map);
  }, [data.pendingLogs, data.hourlyRate]);

  // ---------------------------------------------------------------------------
  // Task Grouping for "Approved" Tab
  // ---------------------------------------------------------------------------
  const approvedGroups = React.useMemo(() => {
    const map: Record<
      string,
      {
        taskId: string;
        taskTitle: string;
        taskEstHours: number;
        taskLoggedHours: number;
        logs: typeof data.approvedLogs;
        totalApprovedHours: number;
        totalApprovedAmount: number;
      }
    > = {};

    for (const log of data.approvedLogs) {
      if (!map[log.taskId]) {
        map[log.taskId] = {
          taskId: log.taskId,
          taskTitle: log.taskTitle,
          taskEstHours: log.taskEstHours ?? 0,
          taskLoggedHours: log.taskLoggedHours ?? 0,
          logs: [],
          totalApprovedHours: 0,
          totalApprovedAmount: 0,
        };
      }
      map[log.taskId].logs.push(log);
      map[log.taskId].totalApprovedHours += log.totalHours;
      map[log.taskId].totalApprovedAmount = sumMoney([
        map[log.taskId].totalApprovedAmount,
        calculateLogAmount(log.totalHours, data.hourlyRate),
      ]);
    }

    return Object.values(map);
  }, [data.approvedLogs, data.hourlyRate]);

  // Compute correction diff helper
  const getCorrectionDiff = (
    timeIn: Date | string,
    timeOut: Date | string | null,
    requestedTimeOut: Date | string | null
  ) => {
    if (!requestedTimeOut) return { text: "" };
    try {
      const oldMinutes = timeOut ? calculateLoggedMinutes(timeIn, timeOut) : 0;
      const newMinutes = calculateLoggedMinutes(timeIn, requestedTimeOut);
      const diffMinutes = newMinutes - oldMinutes;
      const oldAmount = calculateLogAmount(oldMinutes / 60, data.hourlyRate);
      const newAmount = calculateLogAmount(newMinutes / 60, data.hourlyRate);
      const diffAmount = newAmount - oldAmount;
      const diffHours = Math.abs(diffMinutes) / 60;
      const verb = diffMinutes >= 0 ? "adds" : "subtracts";
      return {
        text: `${verb} ${formatHours(diffHours)}, ${formatPeso(Math.abs(diffAmount))}`,
      };
    } catch {
      return { text: "" };
    }
  };

  // If no student linked
  if (!data.linkedStudent) {
    return (
      <PageContainer>
        <PageHeader
          title="Timesheets"
          subtitle="Review logged hours. Approved hours are added to your invoice."
        />

        <EmptyState
          icon={UserX}
          title="No student linked yet"
          description="No student linked yet. Enter your student's invite code in Settings."
          action={
            <Button
              asChild
              className="bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 font-bold text-xs cursor-pointer min-h-[40px] px-4"
            >
              <Link href="/client/profile">Go to settings</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* 1. HEADER */}
      <PageHeader
        title="Timesheets"
        subtitle={`Review the hours ${studentFirstName} logged. Approved hours are added to your invoice.`}
        actions={
          <div className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#0F172A] bg-white px-3 py-1.5 shadow-[2px_2px_0px_0px_#0F172A] text-xs font-semibold text-[#0F172A] self-start sm:self-auto">
            <span>{data.linkedStudent.name}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">{formatPeso(data.hourlyRate)}/hr</span>
          </div>
        }
      />

      {/* 2. COMPACT TILES (Display-font numbers, scroll-snap row on mobile) */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 scroll-snap-x snap-mandatory scrollbar-none">
        {/* Tile 1: Waiting for review */}
        <Card
          className={cn(
            "shrink-0 w-[240px] sm:w-auto snap-start border-[1.5px] rounded-2xl shadow-[3px_3px_0px_0px_#0F172A] py-0 transition-all",
            data.pendingHours > 0
              ? "border-[#D97706] bg-[#FFFBEB]/50"
              : "border-[#0F172A] bg-white"
          )}
        >
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Waiting for review
              </span>
              {data.pendingHours > 0 && (
                <Clock className="size-3.5 text-[#D97706]" />
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-display font-black text-2xl sm:text-3xl text-[#0F172A] tabular-nums leading-tight">
                  {formatHours(data.pendingHours)}
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#92400E] tabular-nums">
                  {formatPeso(data.pendingAmount)}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {data.pendingLogs.length} {data.pendingLogs.length === 1 ? "session" : "sessions"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tile 2: To pay */}
        <Card className="shrink-0 w-[240px] sm:w-auto snap-start border-[1.5px] border-[#0F172A] bg-white rounded-2xl shadow-[3px_3px_0px_0px_#0F172A] py-0">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              To pay
            </span>
            <div className="space-y-0.5">
              <div className="font-display font-black text-2xl sm:text-3xl text-[#0F172A] tabular-nums leading-tight">
                {formatPeso(toPayAmount)}
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Approved, awaiting your payment
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tile 3: Paid */}
        <Card className="shrink-0 w-[240px] sm:w-auto snap-start border-[1.5px] border-[#0F172A] bg-white rounded-2xl shadow-[3px_3px_0px_0px_#0F172A] py-0">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Paid
            </span>
            <div className="space-y-0.5">
              <div className="font-display font-black text-2xl sm:text-3xl text-[#0F172A] tabular-nums leading-tight">
                {formatPeso(paidAmount)}
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {paidInvoices.length} {paidInvoices.length === 1 ? "invoice" : "invoices"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. SEGMENTED TABS */}
      <div
        role="tablist"
        aria-label="Timesheets navigation"
        className="inline-flex max-w-full overflow-x-auto rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-1 shadow-[2px_2px_0px_0px_#0F172A] scrollbar-none"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "to-review"}
          data-testid="timesheets-tab"
          data-tab="to-review"
          onClick={() => setActiveTab("to-review")}
          className={cn(
            "rounded-md py-1.5 px-3.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] flex items-center gap-2",
            activeTab === "to-review"
              ? "bg-[#0F172A] text-white shadow-xs"
              : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
          )}
        >
          <span>To review</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
              activeTab === "to-review"
                ? "bg-white/20 text-white"
                : "bg-slate-200 text-slate-700"
            )}
          >
            {data.pendingLogs.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "approved"}
          data-testid="timesheets-tab"
          data-tab="approved"
          onClick={() => setActiveTab("approved")}
          className={cn(
            "rounded-md py-1.5 px-3.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] flex items-center gap-2",
            activeTab === "approved"
              ? "bg-[#0F172A] text-white shadow-xs"
              : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
          )}
        >
          <span>Approved</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
              activeTab === "approved"
                ? "bg-white/20 text-white"
                : "bg-slate-200 text-slate-700"
            )}
          >
            {data.approvedLogs.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "invoices"}
          data-testid="timesheets-tab"
          data-tab="invoices"
          onClick={() => setActiveTab("invoices")}
          className={cn(
            "rounded-md py-1.5 px-3.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] flex items-center gap-2",
            activeTab === "invoices"
              ? "bg-[#0F172A] text-white shadow-xs"
              : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
          )}
        >
          <span>Invoices</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
              activeTab === "invoices"
                ? "bg-white/20 text-white"
                : "bg-slate-200 text-slate-700"
            )}
          >
            {data.invoices.length}
          </span>
        </button>
      </div>

      {/* 4. TAB PANELS */}

      {/* --------------------------------------------------------------------- */}
      {/* TAB A: TO REVIEW */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "to-review" && (
        <div className="space-y-4">
          {pendingGroups.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nothing to review"
              description={`When ${studentFirstName} logs hours, they'll show up here.`}
            />
          ) : (
            pendingGroups.map((group) => {
              const isOverEstimate = group.taskLoggedHours > group.taskEstHours;
              const overHours = isOverEstimate
                ? Math.round((group.taskLoggedHours - group.taskEstHours) * 60) / 60
                : 0;

              return (
                <div
                  key={group.taskId}
                  data-testid="timesheet-group"
                  data-task={group.taskTitle}
                  className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] overflow-hidden"
                >
                  {/* Task Group Header */}
                  <div className="bg-[#FAF7F2] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5DFD5]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-base font-bold text-[#0F172A]">
                          {group.taskTitle}
                        </span>
                        {isOverEstimate && (
                          <span className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-[#D97706] bg-[#FFFBEB] text-[#92400E] px-2.5 py-0.5 text-xs font-bold shadow-[1.5px_1.5px_0px_0px_#D97706]">
                            <AlertTriangle className="size-3 text-[#D97706]" />
                            <span>{formatHours(overHours)} over estimate</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 font-medium">
                        Estimate {formatHours(group.taskEstHours)} • Logged {formatHours(group.taskLoggedHours)}
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Subtotal to review
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[#0F172A]">
                        {formatHours(group.totalPendingHours)} · {formatPeso(group.totalPendingAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Task Group Session Rows */}
                  <div className="divide-y divide-[#E5DFD5]">
                    {group.logs.map((log) => {
                      const diffInfo = getCorrectionDiff(
                        log.timeIn,
                        log.timeOut,
                        log.requestedTimeOut
                      );

                      return (
                        <div
                          key={log.id}
                          data-testid="timesheet-row"
                          data-status={log.status}
                          className="p-4 sm:p-5 space-y-3 transition-colors hover:bg-[#FAF7F2]/40"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            {/* Left: Date, Time range, and Note */}
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-[#0F172A]">
                                  {formatDate(log.timeIn)}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-xs font-semibold text-slate-600">
                                  {formatTimeRange(log.timeIn, log.timeOut)}
                                </span>
                                {log.disputeReason && (
                                  <span className="rounded-full border-[1.5px] border-[#D97706] bg-[#FFFBEB] text-[#92400E] px-2 py-0.5 text-[10px] font-bold shadow-[1px_1px_0px_0px_#D97706]">
                                    Disputed
                                  </span>
                                )}
                              </div>

                              {/* Student Note */}
                              {log.correctionNote && !log.correctionStatus && (
                                <div data-testid="timesheet-note" className="space-y-1 pt-1">
                                  <p
                                    className={cn(
                                      "text-xs text-slate-700 bg-[#FAF7F2] rounded-lg border border-[#E5DFD5] p-2.5 leading-relaxed",
                                      !expandedNotes[log.id] && "line-clamp-2"
                                    )}
                                  >
                                    <span className="font-bold text-[#0F172A]">Note: </span>
                                    {log.correctionNote}
                                  </p>
                                  {log.correctionNote.length > 80 && (
                                    <button
                                      type="button"
                                      onClick={() => toggleNote(log.id)}
                                      className="text-[11px] font-bold text-slate-600 hover:text-[#0F172A] underline cursor-pointer inline-flex items-center gap-1"
                                    >
                                      <span>{expandedNotes[log.id] ? "Show less" : "Show more"}</span>
                                      {expandedNotes[log.id] ? (
                                        <ChevronUp className="size-3" />
                                      ) : (
                                        <ChevronDown className="size-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Right: Duration, Amount & Actions */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E5DFD5]">
                              {/* Duration & Amount */}
                              <div className="text-left sm:text-right">
                                <div className="font-display font-black text-lg sm:text-xl text-[#0F172A] leading-tight">
                                  {formatHours(log.totalHours)}
                                </div>
                                <div className="text-xs font-bold text-slate-600">
                                  {formatPeso(calculateLogAmount(log.totalHours, data.hourlyRate))}
                                </div>
                              </div>

                              {/* Action Buttons: Full width on mobile, auto on desktop */}
                              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                                <Button
                                  type="button"
                                  data-testid="timesheet-approve"
                                  aria-label={`Approve ${log.taskTitle} on ${formatDate(log.timeIn)}`}
                                  disabled={processingLogId === log.id}
                                  onClick={() => handleApprove(log.id, log.totalHours, log.taskTitle)}
                                  className="bg-[#16A34A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#15803D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none min-h-[44px] sm:min-h-[40px] px-4 font-bold text-xs cursor-pointer disabled:opacity-50"
                                >
                                  {processingLogId === log.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <Check className="size-4 mr-1.5" />
                                  )}
                                  <span>Approve</span>
                                </Button>

                                {!log.disputeReason && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    data-testid="timesheet-dispute"
                                    aria-label={`Dispute ${log.taskTitle} on ${formatDate(log.timeIn)}`}
                                    disabled={processingLogId === log.id}
                                    onClick={() =>
                                      setDisputeLog({
                                        id: log.id,
                                        taskId: log.taskId,
                                        taskTitle: log.taskTitle,
                                        timeIn: log.timeIn,
                                        timeOut: log.timeOut,
                                        totalHours: log.totalHours,
                                      })
                                    }
                                    className="text-slate-700 hover:text-[#0F172A] hover:bg-[#EFEAE2] font-semibold min-h-[44px] sm:min-h-[40px] px-3.5 text-xs cursor-pointer border-[1.5px] border-transparent hover:border-[#0F172A]"
                                  >
                                    <span>Dispute</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Dispute Callout */}
                          {log.disputeReason && (
                            <div className="rounded-xl border-[1.5px] border-[#D97706] bg-[#FFFBEB] p-3 text-xs text-[#92400E] shadow-[2px_2px_0px_0px_#D97706] space-y-1">
                              <div className="flex items-center gap-1.5 font-bold">
                                <AlertTriangle className="size-3.5 text-[#D97706]" />
                                <span>Disputed session</span>
                              </div>
                              <p className="leading-relaxed">
                                You disputed this: {log.disputeReason}. {studentFirstName} was notified. These hours stay unapproved until you approve them.
                              </p>
                            </div>
                          )}

                          {/* Correction Request Callout */}
                          {log.correctionStatus === "PENDING" && log.requestedTimeOut && (
                            <div className="rounded-xl border-[1.5px] border-[#D97706] bg-[#FFFBEB] p-3.5 text-xs text-[#92400E] shadow-[2px_2px_0px_0px_#D97706] space-y-2.5">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold">
                                    <AlertTriangle className="size-3.5 text-[#D97706]" />
                                    <span>Time adjustment requested</span>
                                  </div>
                                  <p className="leading-relaxed text-slate-800">
                                    {studentFirstName} asked to change the end time: {formatTime(log.timeOut)} → {formatTime(log.requestedTimeOut)} ({diffInfo.text}).
                                    {log.correctionNote && (
                                      <span className="block mt-0.5 text-slate-600">
                                        <span className="font-bold">Note: </span>
                                        {log.correctionNote}
                                      </span>
                                    )}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                                  <Button
                                    type="button"
                                    size="sm"
                                    data-testid="timesheet-correction-approve"
                                    aria-label={`Approve time correction for ${log.taskTitle}`}
                                    disabled={processingLogId === log.id}
                                    onClick={() => handleCorrectionResponse(log.id, "APPROVE")}
                                    className="bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 text-xs font-bold h-8 px-3 rounded-lg cursor-pointer"
                                  >
                                    Approve correction
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    data-testid="timesheet-correction-decline"
                                    aria-label={`Decline time correction for ${log.taskTitle}`}
                                    disabled={processingLogId === log.id}
                                    onClick={() => handleCorrectionResponse(log.id, "REJECT")}
                                    className="bg-white text-[#0F172A] border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#FAF7F2] text-xs font-bold h-8 px-3 rounded-lg cursor-pointer"
                                  >
                                    Decline
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB B: APPROVED */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "approved" && (
        <div className="space-y-4">
          {approvedGroups.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No approved hours yet"
              description="Approved work sessions will be organized here and bundled into invoices."
            />
          ) : (
            approvedGroups.map((group) => (
              <div
                key={group.taskId}
                data-testid="timesheet-group"
                data-task={group.taskTitle}
                className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] overflow-hidden"
              >
                {/* Task Group Header */}
                <div className="bg-[#FAF7F2] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5DFD5]">
                  <div className="space-y-1">
                    <span className="font-display text-base font-bold text-[#0F172A]">
                      {group.taskTitle}
                    </span>
                    <div className="text-xs text-slate-600 font-medium">
                      Estimate {formatHours(group.taskEstHours)} • Logged {formatHours(group.taskLoggedHours)}
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Approved subtotal
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#166534]">
                      {formatHours(group.totalApprovedHours)} · {formatPeso(group.totalApprovedAmount)}
                    </span>
                  </div>
                </div>

                {/* Task Group Session Rows */}
                <div className="divide-y divide-[#E5DFD5]">
                  {group.logs.map((log) => (
                    <div
                      key={log.id}
                      data-testid="timesheet-row"
                      data-status="APPROVED"
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-[#FAF7F2]/40"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-[#0F172A]">
                            {formatDate(log.timeIn)}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-xs font-semibold text-slate-600">
                            {formatTimeRange(log.timeIn, log.timeOut)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 justify-between sm:justify-end">
                        <div className="text-left sm:text-right">
                          <div className="font-display font-black text-base sm:text-lg text-[#0F172A] leading-tight">
                            {formatHours(log.totalHours)}
                          </div>
                          <div className="text-xs font-bold text-slate-600">
                            {formatPeso(calculateLogAmount(log.totalHours, data.hourlyRate))}
                          </div>
                        </div>

                        <StatusBadge status="APPROVED" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB C: INVOICES */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          {data.invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices yet"
              description="Approved hours are added to an invoice here."
            />
          ) : (
            <>
              {/* Prominent Open Invoice Card */}
              {openInvoice && (
                <div
                  data-testid="invoice-card"
                  data-status="APPROVED"
                  className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-5 sm:p-6 shadow-[3px_3px_0px_0px_#0F172A] space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5DFD5] pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-full border-[1.5px] border-[#0F172A] bg-[#FAF7F2] px-2.5 py-0.5 text-xs font-bold text-[#0F172A]">
                        Open invoice
                      </span>
                      <span className="text-xs text-slate-600">
                        Issued {formatDate(openInvoice.createdAt)}
                      </span>
                      <span className="rounded-full border-[1.5px] border-[#0F172A] bg-white px-2.5 py-0.5 text-xs font-bold text-[#0F172A] shadow-[1px_1px_0px_0px_#0F172A]">
                        {formatPeso(openInvoice.rate)}/hr
                      </span>
                    </div>

                    <StatusBadge status={openInvoice.status} />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-display font-black text-3xl sm:text-4xl text-[#0F172A] tracking-tight">
                        {formatPeso(openInvoice.amount)}
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-600">
                        {formatHours(openInvoice.totalHours)} logged
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSheetInvoice(openInvoice)}
                        className="border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#FAF7F2] min-h-[40px] px-4 font-bold text-xs rounded-lg cursor-pointer"
                      >
                        <Eye className="size-3.5 mr-1.5" />
                        <span>View</span>
                      </Button>

                      <Button
                        type="button"
                        data-testid="invoice-mark-paid"
                        disabled={processingInvoiceId === openInvoice.id}
                        onClick={() => setConfirmPayingInvoice(openInvoice)}
                        className="bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none min-h-[40px] px-4 font-bold text-xs rounded-lg cursor-pointer"
                      >
                        <span>Mark as paid</span>
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-[#FAF7F2] p-3 rounded-xl border border-[#E5DFD5]">
                    Pay {studentFirstName} directly, then mark the invoice as paid here.
                  </p>
                </div>
              )}

              {/* Paid Invoices List */}
              {paidInvoices.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Paid Invoices ({paidInvoices.length})
                  </span>

                  <div className="space-y-2">
                    {paidInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        data-testid="invoice-card"
                        data-status="PAID"
                        className="rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[2px_2px_0px_0px_#0F172A] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-[#FAF7F2]/40 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-[#0F172A]">
                              Issued {formatDate(inv.createdAt)}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-xs text-slate-600 font-medium">
                              {formatHours(inv.totalHours)} @ {formatPeso(inv.rate)}/hr
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 justify-between sm:justify-end">
                          <span className="font-display font-black text-base sm:text-lg text-[#0F172A]">
                            {formatPeso(inv.amount)}
                          </span>

                          <StatusBadge status={inv.status} />

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSheetInvoice(inv)}
                            className="border-[1.5px] border-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] hover:bg-[#FAF7F2] text-xs font-bold h-8 px-3 rounded-lg cursor-pointer"
                          >
                            <Eye className="size-3.5 mr-1" />
                            <span>View</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 5. CONFIRM MARK AS PAID DIALOG */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={Boolean(confirmPayingInvoice)}
        onOpenChange={(open) => !open && setConfirmPayingInvoice(null)}
      >
        <DialogContent
          className="w-full sm:max-w-md rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-5 sm:p-6 shadow-[4px_4px_0px_0px_#0F172A]"
        >
          <DialogHeader className="space-y-2 border-b border-[#E5DFD5] pb-3 text-left">
            <DialogTitle className="font-display text-lg font-bold text-[#0F172A]">
              Mark {confirmPayingInvoice ? formatPeso(confirmPayingInvoice.amount) : ""} as paid?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed">
              {studentFirstName} will be notified. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmPayingInvoice(null)}
              disabled={processingInvoiceId !== null}
              className="font-semibold text-slate-700 hover:text-[#0F172A] min-h-[40px] px-4 cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              data-testid="invoice-confirm-paid"
              disabled={processingInvoiceId !== null}
              onClick={handleConfirmMarkPaid}
              className="bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 min-h-[40px] px-5 font-bold text-xs cursor-pointer"
            >
              {processingInvoiceId !== null ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Marking paid...</span>
                </span>
              ) : (
                "Mark as paid"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* 6. INVOICE DETAIL SHEET */}
      {/* --------------------------------------------------------------------- */}
      <Sheet
        open={Boolean(sheetInvoice)}
        onOpenChange={(open) => !open && setSheetInvoice(null)}
      >
        <SheetContent
          data-testid="invoice-sheet"
          className="w-full sm:max-w-md border-l-[1.5px] border-[#0F172A] bg-white p-6 shadow-[-4px_0px_0px_0px_#0F172A] space-y-6 overflow-y-auto"
        >
          <SheetHeader className="border-b border-[#E5DFD5] pb-4 space-y-1 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Invoice Details
              </span>
              {sheetInvoice && <StatusBadge status={sheetInvoice.status} />}
            </div>
            <SheetTitle className="font-display text-2xl font-bold text-[#0F172A]">
              {sheetInvoice ? formatPeso(sheetInvoice.amount) : ""}
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-600">
              Issued {sheetInvoice ? formatDate(sheetInvoice.createdAt) : ""}
            </SheetDescription>
          </SheetHeader>

          {sheetInvoice && (
            <div className="space-y-4 text-xs">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-3 shadow-[2px_2px_0px_0px_#0F172A]">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Total Hours
                  </span>
                  <span className="font-display font-black text-lg text-[#0F172A]">
                    {formatHours(sheetInvoice.totalHours)}
                  </span>
                </div>
                <div className="rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-3 shadow-[2px_2px_0px_0px_#0F172A]">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Hourly Rate
                  </span>
                  <span className="font-display font-black text-lg text-[#0F172A]">
                    {formatPeso(sheetInvoice.rate)}/hr
                  </span>
                </div>
              </div>

              {/* Parties */}
              <div className="rounded-xl border-[1.5px] border-[#0F172A] bg-white p-4 shadow-[2px_2px_0px_0px_#0F172A] space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Student VA</span>
                  <span className="font-bold text-[#0F172A]">
                    {sheetInvoice.studentName ?? data.linkedStudent.name}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Client</span>
                  <span className="font-bold text-[#0F172A]">
                    {sheetInvoice.clientName ?? "Client"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Payment status</span>
                  <StatusBadge status={sheetInvoice.status} />
                </div>
              </div>

              {/* Task Breakdown notice */}
              <div className="rounded-xl border border-[#E5DFD5] bg-[#FAF7F2] p-3.5 space-y-1.5 text-slate-600">
                <span className="font-bold text-[#0F172A] block text-xs">
                  Billing Breakdown
                </span>
                <p className="text-[11px] leading-relaxed">
                  This invoice bundles all approved work sessions logged by {studentFirstName} up to the issued date. Individual sessions and task breakdowns are recorded in the Approved tab.
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* --------------------------------------------------------------------- */}
      {/* 7. DISPUTE DIALOG */}
      {/* --------------------------------------------------------------------- */}
      <DisputeDialog
        isOpen={Boolean(disputeLog)}
        onClose={() => setDisputeLog(null)}
        onSuccess={() => router.refresh()}
        log={disputeLog}
        hourlyRate={data.hourlyRate}
        studentName={data.linkedStudent?.name}
      />
    </PageContainer>
  );
}
