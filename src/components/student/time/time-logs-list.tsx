"use client";

import * as React from "react";
import { FormattedTimeLog } from "@/lib/services/time-service";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CorrectionDialog } from "./correction-dialog";
import { StatusBadge } from "@/lib/labels";
import { formatDate, formatTimeRange, formatHours, formatPeso } from "@/lib/format";
import { calculateLogAmount } from "@/lib/money";
import { toZonedTime, format as formatZoned } from "date-fns-tz";
import { TimeLogStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  Clock,
  History,
  FileEdit,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const TIMEZONE_MANILA = "Asia/Manila";

export interface EnrichedTimeLog extends FormattedTimeLog {
  clientName?: string;
}

interface TimeLogsListProps {
  logs: EnrichedTimeLog[];
  hourlyRate?: number;
  onRefresh?: () => void;
}

type FilterTab = "ALL" | "AWAITING_APPROVAL" | "APPROVED";

interface DayGroup {
  dateKey: string;
  date: Date;
  isToday: boolean;
  isYesterday: boolean;
  totalHours: number;
  logs: EnrichedTimeLog[];
}

export function TimeLogsList({ logs, hourlyRate = 150, onRefresh }: TimeLogsListProps) {
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>("ALL");
  const [selectedLogForCorrection, setSelectedLogForCorrection] =
    React.useState<FormattedTimeLog | null>(null);
  const [expandedNoteIds, setExpandedNoteIds] = React.useState<Set<string>>(
    new Set()
  );
  const [visibleCount, setVisibleCount] = React.useState<number>(15);

  const toggleNote = (id: string) => {
    setExpandedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter calculations
  const countAll = logs.length;
  const countAwaiting = logs.filter((l) => l.status === TimeLogStatus.CLOSED).length;
  const countApproved = logs.filter((l) => l.status === TimeLogStatus.APPROVED).length;

  const filteredLogs = React.useMemo(() => {
    if (activeFilter === "AWAITING_APPROVAL") {
      return logs.filter((l) => l.status === TimeLogStatus.CLOSED);
    }
    if (activeFilter === "APPROVED") {
      return logs.filter((l) => l.status === TimeLogStatus.APPROVED);
    }
    return logs;
  }, [logs, activeFilter]);

  // Paginated visible slice
  const displayedLogs = React.useMemo(
    () => filteredLogs.slice(0, visibleCount),
    [filteredLogs, visibleCount]
  );

  // Group displayed logs by Philippine day
  const dayGroups = React.useMemo(() => {
    const nowZoned = toZonedTime(new Date(), TIMEZONE_MANILA);
    const todayKey = formatZoned(nowZoned, "yyyy-MM-dd");
    const yesterdayDate = new Date(nowZoned.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayKey = formatZoned(yesterdayDate, "yyyy-MM-dd");

    const map = new Map<string, DayGroup>();

    for (const log of displayedLogs) {
      const logZoned = toZonedTime(new Date(log.timeIn), TIMEZONE_MANILA);
      const dateKey = formatZoned(logZoned, "yyyy-MM-dd");

      if (!map.has(dateKey)) {
        map.set(dateKey, {
          dateKey,
          date: new Date(log.timeIn),
          isToday: dateKey === todayKey,
          isYesterday: dateKey === yesterdayKey,
          totalHours: 0,
          logs: [],
        });
      }

      const group = map.get(dateKey)!;
      group.logs.push(log);
      if (log.totalHours && log.totalHours > 0) {
        group.totalHours += log.totalHours;
      }
    }

    return Array.from(map.values());
  }, [displayedLogs]);

  return (
    <div className="space-y-5">
      {/* SECTION HEADER & FILTER ROW */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-black tracking-tight text-[#0F172A]">
              Time log
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Review your recorded sessions and submission status.
            </p>
          </div>

          {/* Filter Pills */}
          <div
            data-testid="time-filter"
            data-filter={
              activeFilter === "ALL"
                ? "all"
                : activeFilter === "AWAITING_APPROVAL"
                  ? "awaiting_approval"
                  : "approved"
            }
            className="flex items-center gap-1 rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-1 shadow-[2px_2px_0px_0px_#0F172A] self-start sm:self-auto overflow-x-auto max-w-full"
          >
            <button
              type="button"
              onClick={() => {
                setActiveFilter("ALL");
                setVisibleCount(15);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]",
                activeFilter === "ALL"
                  ? "bg-[#0F172A] text-white shadow-[1px_1px_0px_0px_#0F172A]"
                  : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
              )}
            >
              <span>All</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  activeFilter === "ALL"
                    ? "bg-white/20 text-white"
                    : "bg-white border border-[#0F172A]/20 text-slate-700"
                )}
              >
                {countAll}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveFilter("AWAITING_APPROVAL");
                setVisibleCount(15);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]",
                activeFilter === "AWAITING_APPROVAL"
                  ? "bg-[#0F172A] text-white shadow-[1px_1px_0px_0px_#0F172A]"
                  : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
              )}
            >
              <span>Awaiting approval</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  activeFilter === "AWAITING_APPROVAL"
                    ? "bg-white/20 text-white"
                    : "bg-white border border-[#0F172A]/20 text-slate-700"
                )}
              >
                {countAwaiting}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveFilter("APPROVED");
                setVisibleCount(15);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]",
                activeFilter === "APPROVED"
                  ? "bg-[#0F172A] text-white shadow-[1px_1px_0px_0px_#0F172A]"
                  : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
              )}
            >
              <span>Approved</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  activeFilter === "APPROVED"
                    ? "bg-white/20 text-white"
                    : "bg-white border border-[#0F172A]/20 text-slate-700"
                )}
              >
                {countApproved}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT LIST */}
      {logs.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No time logged yet."
          description="Pick a task and press Time in to start your first session."
        />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No logs match this filter."
          description="Try choosing a different filter above to view your recorded time logs."
        />
      ) : (
        <div className="space-y-6">
          {dayGroups.map((group) => (
            <div key={group.dateKey} className="space-y-2.5">
              {/* Day Header Row */}
              <div className="flex items-center justify-between pb-1.5 border-b border-[#E5DFD5]">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm text-[#0F172A]">
                    {formatDate(group.date)}
                  </span>
                  {group.isToday && (
                    <span className="rounded-full border-[1.5px] border-[#16A34A] bg-[#F0FDF4] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#166534] shadow-[1px_1px_0px_0px_#16A34A]">
                      Today
                    </span>
                  )}
                  {group.isYesterday && (
                    <span className="rounded-full border-[1.5px] border-[#0F172A] bg-[#FAF7F2] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0F172A] shadow-[1px_1px_0px_0px_#0F172A]">
                      Yesterday
                    </span>
                  )}
                </div>
                <div className="font-display font-extrabold text-xs sm:text-sm text-[#0F172A]">
                  {formatHours(group.totalHours)}
                </div>
              </div>

              {/* Log Rows for this Day */}
              <div className="space-y-2">
                {group.logs.map((log) => {
                  const isNoteExpanded = expandedNoteIds.has(log.id);
                  const isUnderOneMin =
                    log.totalHours !== null &&
                    log.totalHours > 0 &&
                    (log.totalHours * 60 < 1 || log.totalHours < 0.02);

                  // Correction allowed rule: only closed logs without a pending request, and not approved logs
                  const canRequestCorrection =
                    log.status === TimeLogStatus.CLOSED &&
                    log.correctionStatus !== "PENDING";

                  return (
                    <div
                      key={log.id}
                      data-testid="time-log-row"
                      data-status={log.status}
                      className="rounded-xl border-[1.5px] border-[#0F172A] bg-white p-3.5 sm:p-4 shadow-[2px_2px_0px_0px_#0F172A] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] space-y-2.5"
                    >
                      {/* Responsive row structure: stacks on mobile, horizontal on desktop */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        {/* Task title, client, time range & mobile badge/duration */}
                        <div className="space-y-1 min-w-0 flex-1">
                          {/* Line 1 on mobile: Title + Badge */}
                          <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0 truncate">
                              <span className="font-bold text-sm text-[#0F172A] truncate">
                                {log.taskTitle}
                              </span>
                              {log.clientName && (
                                <span className="text-xs text-slate-500 font-medium shrink-0">
                                  &bull; {log.clientName}
                                </span>
                              )}
                            </div>
                            {/* Mobile-only StatusBadge */}
                            <div className="sm:hidden shrink-0">
                              <StatusBadge status={log.status} />
                            </div>
                          </div>

                          {/* Line 2 on mobile: Time range + Duration */}
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span>{formatTimeRange(log.timeIn, log.timeOut)}</span>
                            <span className="sm:hidden font-display font-black text-sm text-[#0F172A] tabular-nums">
                              {isUnderOneMin
                                ? "<1m"
                                : log.totalHours !== null
                                  ? formatHours(log.totalHours)
                                  : "In progress"}
                            </span>
                          </div>
                        </div>

                        {/* Desktop: Duration + StatusBadge + Action Button / Chip */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5DFD5]">
                          <div className="hidden sm:flex items-center gap-3">
                            <span className="font-display font-black text-base text-[#0F172A] tabular-nums">
                              {isUnderOneMin
                                ? "<1m"
                                : log.totalHours !== null
                                  ? formatHours(log.totalHours)
                                  : "In progress"}
                            </span>
                            {log.totalHours !== null && log.totalHours > 0 && (
                              <span className="font-display font-black text-base text-[#0F172A] tabular-nums">
                                {formatPeso(calculateLogAmount(log.totalHours, hourlyRate))}
                              </span>
                            )}
                            <StatusBadge status={log.status} />
                          </div>

                          {/* Correction Status Chip */}
                          {log.correctionStatus === "PENDING" && (
                            <span className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-[#D97706] bg-[#FFFBEB] px-2.5 py-0.5 text-[11px] font-bold text-[#92400E] shadow-[1px_1px_0px_0px_#D97706]">
                              <AlertCircle className="size-3 text-[#D97706]" />
                              <span>Correction pending</span>
                            </span>
                          )}
                          {log.correctionStatus === "APPROVED" && (
                            <span className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-[#16A34A] bg-[#F0FDF4] px-2.5 py-0.5 text-[11px] font-bold text-[#166534] shadow-[1px_1px_0px_0px_#16A34A]">
                              <Check className="size-3 text-[#16A34A]" />
                              <span>Correction approved</span>
                            </span>
                          )}
                          {log.correctionStatus === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-[#DC2626] bg-[#FEF2F2] px-2.5 py-0.5 text-[11px] font-bold text-[#991B1B] shadow-[1px_1px_0px_0px_#DC2626]">
                              <AlertCircle className="size-3 text-[#DC2626]" />
                              <span>Correction rejected</span>
                            </span>
                          )}

                          {/* Request Correction Ghost Button */}
                          {canRequestCorrection && (
                            <Button
                              type="button"
                              variant="ghost"
                              data-testid="time-request-correction"
                              onClick={() => setSelectedLogForCorrection(log)}
                              className="h-10 px-3 text-xs font-bold text-slate-700 hover:text-[#0F172A] hover:bg-[#FAF7F2] rounded-lg border border-transparent hover:border-[#0F172A]/20 transition-all cursor-pointer gap-1.5"
                            >
                              <FileEdit className="size-3.5 text-slate-500" />
                              <span>Request correction</span>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Muted single-line note (expandable on click, no nested bordered box) */}
                      {log.correctionNote && (
                        <div
                          onClick={() => toggleNote(log.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleNote(log.id);
                            }
                          }}
                          className="group flex items-start gap-1.5 text-xs text-slate-600 hover:text-[#0F172A] cursor-pointer pt-1 transition-colors select-none"
                          title="Click to expand/collapse note"
                        >
                          <span className="font-semibold text-slate-700 shrink-0">Note:</span>
                          <span
                            className={cn(
                              "flex-1 leading-relaxed",
                              !isNoteExpanded && "line-clamp-1"
                            )}
                          >
                            {log.correctionNote}
                          </span>
                          <span className="text-slate-400 group-hover:text-slate-700 shrink-0 mt-0.5">
                            {isNoteExpanded ? (
                              <ChevronUp className="size-3.5" />
                            ) : (
                              <ChevronDown className="size-3.5" />
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Show More Pagination Button */}
          {filteredLogs.length > visibleCount && (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVisibleCount((prev) => prev + 15)}
                className="h-10 px-6 text-xs font-bold border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                + Show 15 more ({filteredLogs.length - visibleCount} remaining)
              </Button>
            </div>
          )}

          {/* Timezone caption under history */}
          <p className="text-[11px] text-slate-500 font-medium text-center sm:text-left pt-2">
            Times shown in Philippine time
          </p>
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
