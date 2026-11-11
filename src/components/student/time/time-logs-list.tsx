"use client";

import * as React from "react";
import { FormattedTimeLog } from "@/lib/services/time-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CorrectionDialog } from "./correction-dialog";
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  History,
} from "lucide-react";

interface TimeLogsListProps {
  logs: FormattedTimeLog[];
  onRefresh?: () => void;
}

export function TimeLogsList({ logs, onRefresh }: TimeLogsListProps) {
  const [selectedLogForCorrection, setSelectedLogForCorrection] =
    React.useState<FormattedTimeLog | null>(null);

  const formatManilaTime = (d: Date | null) => {
    if (!d) return "--:--";
    return new Date(d).toLocaleTimeString("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatManilaDate = (d: Date) => {
    return new Date(d).toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text)]">
            Time Log History
          </h2>
          <p className="text-[11px] text-[var(--color-muted)]">
            Verified work sessions submitted to your client for invoicing.
          </p>
        </div>
        <span className="text-xs text-[var(--color-muted)]">
          {logs.length} {logs.length === 1 ? "session" : "sessions"}
        </span>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No logged hours yet"
          description="Your completed work sessions will be listed here. When you Time Out, total hours are automatically calculated and converted into your earnings."
        />
      ) : (
        <div className="space-y-2.5">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--color-text)]">
                      {log.taskTitle}
                    </span>
                    {log.status === "OPEN" && (
                      <span className="rounded bg-[var(--color-work-bg)] text-[var(--color-work)] border border-green-200 px-1.5 py-0.5 text-[10px] font-semibold animate-pulse">
                        Timer Running
                      </span>
                    )}
                    {log.status === "CLOSED" && (
                      <Badge variant="outline" className="text-[10px] uppercase">
                        Pending Approval
                      </Badge>
                    )}
                    {log.status === "APPROVED" && (
                      <span className="rounded bg-[var(--color-work-bg)] text-[var(--color-work)] border border-green-200 px-1.5 py-0.5 text-[10px] font-semibold">
                        Approved
                      </span>
                    )}
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
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  <div className="text-right">
                    <span className="text-xs font-bold text-[var(--color-text)]">
                      {log.totalHours !== null ? `${log.totalHours.toFixed(2)} hrs` : "In Progress"}
                    </span>
                  </div>

                  {log.status !== "OPEN" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setSelectedLogForCorrection(log)}
                      className="gap-1 text-[11px] h-7 text-[var(--color-muted)] hover:text-[var(--color-text)] cursor-pointer"
                    >
                      <FileEdit className="size-3" />
                      <span>Correct</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Notes */}
              {log.correctionNote && (
                <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-xs text-[var(--color-muted)]">
                  <span className="font-medium text-[var(--color-text)]">Notes: </span>
                  <span>{log.correctionNote}</span>
                </div>
              )}

              {/* Correction status */}
              {log.correctionStatus === "PENDING" && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700">
                  <AlertCircle className="size-3" />
                  <span>Time correction requested (Pending client review)</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Correction Dialog */}
      <CorrectionDialog
        isOpen={Boolean(selectedLogForCorrection)}
        onClose={() => setSelectedLogForCorrection(null)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
        log={selectedLogForCorrection}
      />
    </div>
  );
}
