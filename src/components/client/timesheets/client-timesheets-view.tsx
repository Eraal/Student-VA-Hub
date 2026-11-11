"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClientTimesheetData } from "@/lib/services/invoice-service";
import {
  approveTimeLogAction,
  respondCorrectionAction,
  markInvoicePaidAction,
} from "@/lib/actions/invoice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DisputeDialog } from "./dispute-dialog";
import {
  FileText,
  Clock,
  Calendar,
  Check,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  DollarSign,
  Receipt,
  User,
} from "lucide-react";

interface ClientTimesheetsViewProps {
  initialData: ClientTimesheetData;
}

export function ClientTimesheetsView({ initialData }: ClientTimesheetsViewProps) {
  const router = useRouter();
  const [data, setData] = React.useState<ClientTimesheetData>(initialData);
  const [activeTab, setActiveTab] = React.useState<"PENDING" | "APPROVED" | "INVOICES">("PENDING");
  const [processingLogId, setProcessingLogId] = React.useState<string | null>(null);
  const [processingInvoiceId, setProcessingInvoiceId] = React.useState<string | null>(null);

  // Dispute state
  const [disputeLog, setDisputeLog] = React.useState<{ id: string; title: string } | null>(null);

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleApprove = async (logId: string) => {
    setProcessingLogId(logId);
    try {
      const res = await approveTimeLogAction({ timeLogId: logId });
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error ?? "Failed to approve hours.");
      }
    } catch (err) {
      console.error(err);
      alert("Error approving hours.");
    } finally {
      setProcessingLogId(null);
    }
  };

  const handleCorrectionResponse = async (logId: string, decision: "APPROVE" | "REJECT") => {
    setProcessingLogId(logId);
    try {
      const res = await respondCorrectionAction({ timeLogId: logId, decision });
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error ?? "Failed to respond to correction.");
      }
    } catch (err) {
      console.error(err);
      alert("Error responding to correction.");
    } finally {
      setProcessingLogId(null);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    setProcessingInvoiceId(invoiceId);
    try {
      const res = await markInvoicePaidAction({ invoiceId });
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error ?? "Failed to mark invoice as paid.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating invoice.");
    } finally {
      setProcessingInvoiceId(null);
    }
  };

  const formatManilaDate = (d: Date) => {
    return new Date(d).toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatManilaTime = (d: Date | null) => {
    if (!d) return "--:--";
    return new Date(d).toLocaleTimeString("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          Timesheets & Invoices
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          {data.linkedStudent
            ? `Review and approve logged hours for ${data.linkedStudent.name}.`
            : "No active student linked."}
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide block">
              Waiting for Approval
            </span>
            <div className="text-lg font-bold text-[var(--color-text)]">
              {data.pendingHours.toFixed(2)} hrs
            </div>
            <div className="text-[11px] text-[var(--color-muted)]">
              ₱{data.pendingAmount.toLocaleString()} @ ₱{data.hourlyRate}/hr
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide block">
              Approved Hours
            </span>
            <div className="text-lg font-bold text-[var(--color-work)]">
              {data.approvedHours.toFixed(2)} hrs
            </div>
            <div className="text-[11px] text-[var(--color-muted)]">
              ₱{data.approvedAmount.toLocaleString()} ready for invoice
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1 border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide block">
              Hourly Rate
            </span>
            <div className="text-lg font-bold text-[var(--color-text)]">
              ₱{data.hourlyRate}/hr
            </div>
            <div className="text-[11px] text-[var(--color-muted)]">
              Student: {data.linkedStudent?.name ?? "None"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[var(--color-border)]">
        <div className="flex items-center gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={`flex items-center gap-1.5 pb-2.5 transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === "PENDING"
                ? "border-[var(--color-accent)] text-[var(--color-text)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <span>Pending Approval</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "PENDING"
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                  : "bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]"
              }`}
            >
              {data.pendingLogs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("APPROVED")}
            className={`flex items-center gap-1.5 pb-2.5 transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === "APPROVED"
                ? "border-[var(--color-accent)] text-[var(--color-text)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <span>Approved Hours</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "APPROVED"
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                  : "bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]"
              }`}
            >
              {data.approvedLogs.length}
            </span>
          </button>

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
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "PENDING" && (
        <div className="space-y-3">
          {data.pendingLogs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No pending timesheets"
              description="No submitted hours waiting for approval. When your student VA clocks out, their completed sessions will appear here for review."
            />
          ) : (
            data.pendingLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--color-text)]">
                        {log.taskTitle}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        {log.totalHours.toFixed(2)} hrs (₱{(log.totalHours * data.hourlyRate).toFixed(2)})
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[var(--color-muted)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        <span>{formatManilaDate(log.timeIn)}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        <span>
                          {formatManilaTime(log.timeIn)} – {formatManilaTime(log.timeOut)}
                        </span>
                      </span>
                    </div>

                    {log.correctionNote && (
                      <p className="text-xs text-[var(--color-text)] bg-[var(--color-bg)] rounded border border-[var(--color-border)] p-2 mt-1">
                        <span className="font-medium text-[var(--color-muted)]">Student Notes: </span>
                        {log.correctionNote}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    <Button
                      type="button"
                      size="xs"
                      onClick={() => handleApprove(log.id)}
                      disabled={processingLogId === log.id}
                      className="gap-1 bg-[var(--color-work)] text-white hover:bg-[var(--color-work)]/90 text-xs h-7 cursor-pointer"
                    >
                      {processingLogId === log.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Check className="size-3" />
                      )}
                      <span>Approve</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => setDisputeLog({ id: log.id, title: log.taskTitle })}
                      disabled={processingLogId === log.id}
                      className="text-xs h-7 cursor-pointer"
                    >
                      <span>Dispute</span>
                    </Button>
                  </div>
                </div>

                {/* Correction Request Banner */}
                {log.correctionStatus === "PENDING" && log.requestedTimeOut && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="size-3.5 text-amber-700" />
                        <span>Student requested a time adjustment</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCorrectionResponse(log.id, "APPROVE")}
                          className="rounded bg-amber-800 text-white px-2 py-0.5 text-[11px] font-medium hover:bg-amber-900 cursor-pointer"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCorrectionResponse(log.id, "REJECT")}
                          className="rounded border border-amber-800 text-amber-900 px-2 py-0.5 text-[11px] font-medium hover:bg-amber-100 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                    <div className="text-[11px] text-amber-800">
                      Requested Time Out: {formatManilaTime(log.requestedTimeOut)}
                    </div>
                  </div>
                )}

                {/* Dispute reason if already disputed */}
                {log.disputeReason && (
                  <div className="text-[11px] text-[var(--color-conflict)] bg-[var(--color-conflict-bg)] p-2 rounded border border-[var(--color-conflict)]">
                    <span className="font-semibold">Dispute recorded: </span>
                    <span>{log.disputeReason}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "APPROVED" && (
        <div className="space-y-3">
          {data.approvedLogs.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No approved hours yet"
              description="Approved work sessions will be archived here and bundled into invoices."
            />
          ) : (
            data.approvedLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-[var(--color-text)]">
                    {log.taskTitle}
                  </div>
                  <div className="text-[11px] text-[var(--color-muted)]">
                    {formatManilaDate(log.timeIn)} • {formatManilaTime(log.timeIn)} – {formatManilaTime(log.timeOut)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-[var(--color-work)]">
                    {log.totalHours.toFixed(2)} hrs
                  </span>
                  <div className="text-[10px] text-[var(--color-muted)]">
                    ₱{(log.totalHours * data.hourlyRate).toFixed(2)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "INVOICES" && (
        <div className="space-y-3">
          {data.invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices generated yet"
              description="When you approve logged hours from the pending list, an invoice is automatically created with the computed total."
            />
          ) : (
            data.invoices.map((inv) => (
              <div
                key={inv.id}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                        Invoice #{inv.id.slice(-6).toUpperCase()}
                      </span>
                      {inv.status === "PAID" ? (
                        <span className="rounded bg-[var(--color-work-bg)] text-[var(--color-work)] border border-green-200 px-2 py-0.5 text-[10px] font-semibold">
                          PAID
                        </span>
                      ) : (
                        <span className="rounded bg-[var(--color-class-bg)] text-[var(--color-class)] border border-blue-200 px-2 py-0.5 text-[10px] font-semibold">
                          APPROVED (WAITING PAYMENT)
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-[var(--color-text)]">
                      ₱{inv.amount.toLocaleString()} ({inv.totalHours} hours @ ₱{inv.rate}/hr)
                    </div>
                    <div className="text-[11px] text-[var(--color-muted)]">
                      Student: {inv.studentName} • Created {formatManilaDate(inv.createdAt)}
                    </div>
                  </div>

                  {inv.status === "APPROVED" && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleMarkPaid(inv.id)}
                      disabled={processingInvoiceId === inv.id}
                      className="bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-xs h-8 cursor-pointer shrink-0"
                    >
                      {processingInvoiceId === inv.id ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Updating...</span>
                        </span>
                      ) : (
                        <span>Mark as Paid</span>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Dispute Modal */}
      <DisputeDialog
        isOpen={Boolean(disputeLog)}
        onClose={() => setDisputeLog(null)}
        onSuccess={() => router.refresh()}
        timeLogId={disputeLog?.id ?? null}
        taskTitle={disputeLog?.title ?? null}
      />
    </div>
  );
}

