"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  StatusBadge,
  getResponseLabel,
  TONE_STYLES,
} from "@/lib/labels";
import {
  formatHours,
  formatPeso,
  formatDate,
  formatRelative,
  parseSafeDate,
  TIMEZONE_MANILA,
} from "@/lib/format";
import { toZonedTime } from "date-fns-tz";
import { AssignTaskDialog } from "../tasks/assign-task-dialog";
import type { ClientDashboardData } from "@/lib/services/dashboard-service";
import {
  StudentResponse,
  Role,
} from "@prisma/client";
import {
  getNotificationMeta,
  getNotificationIcon,
} from "@/lib/notifications";
import { getNotificationRoute } from "@/lib/notification-routes";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  AlertTriangle,
  Bell,
  CheckCircle2,
} from "lucide-react";

interface ClientDashboardViewProps {
  data: ClientDashboardData;
  clientName: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "VA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getManilaGreeting(clientName: string, now: Date = new Date()): string {
  const firstName = clientName.trim().split(/\s+/)[0] || "Client";
  const zoned = toZonedTime(now, TIMEZONE_MANILA);
  const hour = zoned.getHours();

  let salutation = "Good morning";
  if (hour >= 12 && hour < 18) {
    salutation = "Good afternoon";
  } else if (hour >= 18) {
    salutation = "Good evening";
  }

  return `${salutation}, ${firstName}`;
}

/**
 * Task row due date formatter:
 * Relative first ("Due in 8 days", "Due today" in amber, "Overdue" in red),
 * followed by the absolute date once as secondary text ("Fri, Nov 20, 8:00 PM").
 */
function DueDateDisplay({
  dueAt,
  now = new Date(),
}: {
  dueAt: Date | string;
  now?: Date;
}) {
  const dueDate = parseSafeDate(dueAt);
  if (!dueDate) {
    return <span className="text-xs text-slate-600 font-medium">—</span>;
  }

  const isOverdue = dueDate.getTime() < now.getTime();
  const dueZoned = toZonedTime(dueDate, TIMEZONE_MANILA);
  const nowZoned = toZonedTime(now, TIMEZONE_MANILA);
  const isToday =
    dueZoned.getFullYear() === nowZoned.getFullYear() &&
    dueZoned.getMonth() === nowZoned.getMonth() &&
    dueZoned.getDate() === nowZoned.getDate();

  let relativeElement: React.ReactNode;
  if (isOverdue) {
    relativeElement = (
      <span className="font-bold text-[#DC2626]">Overdue</span>
    );
  } else if (isToday) {
    relativeElement = (
      <span className="font-bold text-[#92400E]">Due today</span>
    );
  } else {
    const rel = formatRelative(dueDate, now);
    const label =
      rel === "tomorrow"
        ? "Due tomorrow"
        : rel.startsWith("in ")
        ? `Due ${rel}`
        : `Due in ${rel}`;
    relativeElement = (
      <span className="font-bold text-[#0F172A]">{label}</span>
    );
  }

  return (
    <div className="text-xs space-y-0.5">
      <div>{relativeElement}</div>
      <span className="text-slate-600 block text-[11px] font-medium">
        {formatDate(dueDate, "EEE, MMM d, h:mm a")}
      </span>
    </div>
  );
}

export function ClientDashboardView({
  data,
  clientName,
}: ClientDashboardViewProps) {
  const router = useRouter();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [now] = React.useState<Date>(() => new Date());

  const {
    linked,
    student,
    studentStatus,
    tasksSummary,
    pendingApproval,
    attention,
    recentNotifications = [],
  } = data;

  const greetingText = getManilaGreeting(clientName, now);
  const todayFormatted = formatDate(now, "EEEE, MMMM d");

  const rescheduleCount = attention?.rescheduleRequestsCount ?? 0;
  const correctionCount = attention?.correctionRequestsCount ?? 0;
  const hasAttentionItems = rescheduleCount > 0 || correctionCount > 0;

  return (
    <PageContainer>
      {/* HEADER */}
      <PageHeader
        title={<span data-testid="client-home-greeting">{greetingText}</span>}
        subtitle={todayFormatted}
        actions={
          <>
            <Link href="/client/calendar">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 font-bold cursor-pointer"
              >
                <Calendar className="size-4" />
                <span>View calendar</span>
              </Button>
            </Link>

            <Button
              data-testid="client-home-assign"
              variant="default"
              size="sm"
              onClick={() => setIsAssignDialogOpen(true)}
              className="gap-2 font-bold cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Assign task</span>
            </Button>
          </>
        }
      />

      {/* STUDENT STATUS CARD (full width, one focal element) */}
      {!linked || !student ? (
        <Card className="border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] rounded-2xl py-6">
          <CardContent className="px-6 py-4">
            <EmptyState
              icon={Briefcase}
              title="No student linked yet"
              description="No student linked yet. Enter your student's invite code in Settings to get started."
              action={
                <Link href="/client/profile">
                  <Button size="sm" className="gap-2 cursor-pointer font-bold">
                    <span>Go to settings</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[1.5px] border-[#0F172A] bg-white shadow-[3px_3px_0px_0px_#0F172A] rounded-2xl py-0">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] font-display font-bold text-base shadow-[1.5px_1.5px_0px_0px_#0F172A]"
              >
                {getInitials(student.name)}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-display font-bold text-lg text-[#0F172A] leading-none">
                    {student.name}
                  </span>
                  <span className="rounded-full border-[1.5px] border-[#0F172A] bg-[#FAF7F2] px-2.5 py-0.5 text-xs font-bold text-[#0F172A] tabular-nums shadow-[1.5px_1.5px_0px_0px_#0F172A]">
                    {`${formatPeso(student.hourlyRate)}/hr`}
                  </span>
                </div>

                <div className="space-y-0.5 pt-0.5">
                  {studentStatus.state === "AVAILABLE" ? (
                    <div>
                      <span
                        data-testid="client-student-status"
                        data-status="AVAILABLE"
                        className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#16A34A] bg-[#F0FDF4] px-2.5 py-0.5 text-xs font-bold text-[#166534] shadow-[1.5px_1.5px_0px_0px_#16A34A]"
                      >
                        <span
                          className="size-2 rounded-full bg-[#16A34A]"
                          aria-hidden="true"
                        />
                        <span>Available now</span>
                      </span>
                      <p className="text-xs text-slate-600 font-medium mt-1">
                        {`Available now until ${
                          studentStatus.untilTime || "9:00 PM"
                        }`}
                      </p>
                    </div>
                  ) : studentStatus.state === "IN_CLASS" ? (
                    <div>
                      <span
                        data-testid="client-student-status"
                        data-status="IN_CLASS"
                        className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-bold text-[#1E40AF] shadow-[1.5px_1.5px_0px_0px_#2563EB]"
                      >
                        <span
                          className="size-2 rounded-full bg-[#2563EB]"
                          aria-hidden="true"
                        />
                        <span>In class</span>
                      </span>
                      <p className="text-xs text-slate-600 font-medium mt-1">
                        {`In class until ${
                          studentStatus.untilTime || "2:30 PM"
                        }`}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span
                        data-testid="client-student-status"
                        data-status="OFF"
                        className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#0F172A] bg-[#FAF7F2] px-2.5 py-0.5 text-xs font-bold text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]"
                      >
                        <span
                          className="size-2 rounded-full bg-slate-400"
                          aria-hidden="true"
                        />
                        <span>Not available</span>
                      </span>
                      <p className="text-xs text-slate-600 font-medium mt-1">
                        Not available right now
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {data.nextFreeWindow && (
              <div className="mt-3 pt-3 border-t border-[#E5DFD5] flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-600 font-medium">
                  Next free:{" "}
                  <strong className="text-[#0F172A]">
                    {data.nextFreeWindow.formatted}
                  </strong>
                </span>
                <Link
                  href={`/client/tasks?assign=1&date=${data.nextFreeWindow.dateKey}&start=${data.nextFreeWindow.startTime}&end=${data.nextFreeWindow.endTime}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0F172A] hover:underline cursor-pointer"
                >
                  <span>Assign in next free window</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* NEEDS YOUR ATTENTION (slim strip rendered only if there is something) */}
      {hasAttentionItems && (
        <section
          aria-live="polite"
          aria-label="Needs your attention"
          className="rounded-xl border-[1.5px] border-[#D97706] bg-[#FFFBEB] p-3 shadow-[2px_2px_0px_0px_#D97706] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-[#92400E]">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Needs your attention
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {rescheduleCount > 0 && (
              <Link
                href="/client/tasks"
                data-testid="client-attention"
                data-kind="reschedule-requests"
                className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#D97706] bg-white px-3 py-1 text-xs font-bold text-[#92400E] shadow-[1px_1px_0px_0px_#D97706] hover:bg-[#FFFBEB] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
              >
                <span>
                  {`${rescheduleCount} reschedule ${
                    rescheduleCount === 1 ? "request" : "requests"
                  }`}
                </span>
                <ArrowRight className="size-3" />
              </Link>
            )}

            {correctionCount > 0 && (
              <Link
                href="/client/timesheets"
                data-testid="client-attention"
                data-kind="correction-requests"
                className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#D97706] bg-white px-3 py-1 text-xs font-bold text-[#92400E] shadow-[1px_1px_0px_0px_#D97706] hover:bg-[#FFFBEB] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
              >
                <span>
                  {`${correctionCount} correction ${
                    correctionCount === 1 ? "request" : "requests"
                  }`}
                </span>
                <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        </section>
      )}

      {/* SUMMARY TILES (compact, display-font numbers, no tall empty space) */}
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3">
        {/* Tile 1: In Progress */}
        <Card
          data-testid="client-tile"
          data-kind="in-progress"
          className="shrink-0 w-[240px] sm:w-auto snap-start border-[1.5px] border-[#0F172A] bg-white rounded-2xl shadow-[3px_3px_0px_0px_#0F172A] py-0"
        >
          <CardContent className="p-4 sm:p-5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              In progress
            </span>

            <div className="space-y-1">
              <div className="font-display font-black text-2xl sm:text-3xl text-[#0F172A] tabular-nums leading-tight">
                {tasksSummary.doingCount}
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {tasksSummary.todoCount > 0
                  ? `${tasksSummary.todoCount} waiting to start`
                  : "Nothing waiting"}
              </p>
            </div>

            <div className="pt-1 border-t border-[#E5DFD5]">
              <Link
                href="/client/tasks"
                className="text-xs font-bold text-[#0F172A] hover:underline inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] rounded"
              >
                <span>View tasks</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Tile 2: Waiting for approval */}
        <Card
          data-testid="client-tile"
          data-kind="waiting-approval"
          className={cn(
            "shrink-0 w-[240px] sm:w-auto snap-start border-[1.5px] rounded-2xl shadow-[3px_3px_0px_0px_#0F172A] py-0",
            pendingApproval.logCount > 0
              ? "border-[#D97706] bg-[#FFFBEB]/40"
              : "border-[#0F172A] bg-white"
          )}
        >
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Waiting for approval
              </span>
              {pendingApproval.logCount > 0 && (
                <Clock className="size-3.5 text-[#92400E]" />
              )}
            </div>

            <div className="space-y-1">
              {pendingApproval.logCount > 0 ? (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-display font-black text-2xl sm:text-3xl text-[#0F172A] tabular-nums leading-tight">
                    {formatHours(pendingApproval.totalHours)}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#92400E] tabular-nums">
                    {formatPeso(pendingApproval.totalAmount)}
                  </span>
                </div>
              ) : (
                <div className="font-display font-black text-2xl sm:text-3xl text-[#0F172A] tabular-nums leading-tight">
                  0h
                </div>
              )}
              <p className="text-xs text-slate-600 font-medium">
                {pendingApproval.logCount > 0
                  ? `${pendingApproval.logCount} time ${
                      pendingApproval.logCount === 1 ? "log" : "logs"
                    } to review`
                  : "Nothing waiting"}
              </p>
            </div>

            <div className="pt-1 border-t border-[#E5DFD5]">
              <Link
                href="/client/timesheets"
                className={cn(
                  "text-xs font-bold hover:underline inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] rounded",
                  pendingApproval.logCount > 0
                    ? "text-[#0F172A]"
                    : "text-slate-500"
                )}
              >
                <span>Review hours</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Tile 3: Completed tasks */}
        <Card
          data-testid="client-tile"
          data-kind="completed-tasks"
          className="shrink-0 w-[240px] sm:w-auto snap-start border-[1.5px] border-[#0F172A] bg-white rounded-2xl shadow-[3px_3px_0px_0px_#0F172A] py-0"
        >
          <CardContent className="p-4 sm:p-5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Completed tasks
            </span>

            <div className="space-y-1">
              <div className="font-display font-black text-2xl sm:text-3xl text-[#0F172A] tabular-nums leading-tight">
                {tasksSummary.doneCount}
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {tasksSummary.doneCount > 0
                  ? `${tasksSummary.doneCount} ${
                      tasksSummary.doneCount === 1 ? "task" : "tasks"
                    } finished`
                  : "Nothing completed yet"}
              </p>
            </div>

            <div className="pt-1 border-t border-[#E5DFD5]">
              <Link
                href="/client/tasks"
                className="text-xs font-bold text-[#0F172A] hover:underline inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] rounded"
              >
                <span>View completed</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2-COLUMN MAIN SECTION: ACTIVE TASKS (8 cols) + RECENT ACTIVITY (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ACTIVE TASKS (left, 8 columns) */}
        <section
          aria-label="Active tasks"
          className="lg:col-span-8 flex flex-col"
        >
          <Card className="border-[1.5px] border-[#0F172A] bg-white rounded-2xl shadow-[3px_3px_0px_0px_#0F172A] py-0 overflow-hidden flex-1 flex flex-col gap-0">
            <CardHeader className="px-5 sm:px-6 pt-4 pb-4 border-b border-[#E5DFD5] flex flex-row items-center justify-between [.border-b]:pb-4">
              <CardTitle className="font-display text-base sm:text-lg font-bold text-[#0F172A]">
                Active tasks
              </CardTitle>
              <Link
                href="/client/tasks"
                className="text-xs font-bold text-[#0F172A] hover:underline inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] rounded"
              >
                <span>View all</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col">
              {tasksSummary.activeTasks.length > 0 ? (
                <div className="divide-y divide-[#E5DFD5]">
                  {tasksSummary.activeTasks.map((t) => {
                    const isOverrun = t.loggedHours > t.estHours;
                    const overrunHours =
                      Math.round((t.loggedHours - t.estHours) * 100) / 100;
                    const percent =
                      t.estHours > 0
                        ? Math.min(
                            100,
                            Math.round((t.loggedHours / t.estHours) * 100)
                          )
                        : 100;
                    const showProgress =
                      t.loggedHours > 0 || t.status === "DOING";
                    const responseMeta = getResponseLabel(
                      t.studentResponse,
                      Role.CLIENT
                    );

                    return (
                      <Link
                        key={t.id}
                        href="/client/tasks"
                        data-testid="client-task-row"
                        data-status={t.status}
                        data-response={t.studentResponse || "NEEDS_RESPONSE"}
                        className="block p-4 sm:p-5 hover:bg-[#FAF7F2] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-inset space-y-2.5"
                      >
                        {/* Top line: Title & Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h2 className="font-bold text-sm sm:text-base text-[#0F172A] truncate">
                            {t.title}
                          </h2>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <StatusBadge status={t.status} />
                            {!responseMeta.hideOnClientRows && (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-bold",
                                  TONE_STYLES[responseMeta.tone]
                                )}
                              >
                                {responseMeta.label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle line: Due date (Relative first, absolute secondary, never repeat) */}
                        <DueDateDisplay dueAt={t.dueAt} now={now} />

                        {/* Progress Bar (rendered only if logged > 0 or DOING) */}
                        {showProgress && (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-slate-600 font-medium tabular-nums">
                                {`${formatHours(t.loggedHours)} of ${formatHours(
                                  t.estHours
                                )}`}
                              </span>
                              {isOverrun ? (
                                <span className="text-[11px] font-bold text-[#92400E] bg-[#FFFBEB] px-2 py-0.5 rounded border border-[#D97706] tabular-nums">
                                  {`${formatHours(overrunHours)} over estimate`}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-500 font-medium tabular-nums">
                                  {percent}%
                                </span>
                              )}
                            </div>

                            <div
                              className={cn(
                                "h-2 w-full rounded-full overflow-hidden border",
                                isOverrun
                                  ? "bg-amber-100 border-amber-300"
                                  : "bg-slate-100 border-slate-300"
                              )}
                              role="progressbar"
                              aria-valuenow={Math.min(100, percent)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  isOverrun ? "bg-[#D97706]" : "bg-[#16A34A]"
                                )}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    isOverrun ? 100 : percent
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center space-y-3 my-auto">
                  <CheckCircle2 className="size-8 mx-auto text-slate-400" />
                  <p className="font-bold text-sm text-[#0F172A]">
                    No active tasks. Assign a task to get started.
                  </p>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setIsAssignDialogOpen(true)}
                    className="font-bold gap-1.5 cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Assign task</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* RECENT ACTIVITY (right, 4 columns, replaces Quick shortcuts) */}
        <section
          aria-label="Recent activity"
          className="lg:col-span-4 flex flex-col"
        >
          <Card className="border-[1.5px] border-[#0F172A] bg-white rounded-2xl shadow-[3px_3px_0px_0px_#0F172A] py-0 overflow-hidden flex-1 flex flex-col gap-0">
            <CardHeader className="px-5 sm:px-6 pt-4 pb-4 border-b border-[#E5DFD5] flex flex-row items-center justify-between [.border-b]:pb-4">
              <CardTitle className="font-display text-base sm:text-lg font-bold text-[#0F172A]">
                Recent activity
              </CardTitle>
              <Link
                href="/client/notifications"
                className="text-xs font-bold text-[#0F172A] hover:underline inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] rounded"
              >
                <span>View all</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col">
              {recentNotifications.length > 0 ? (
                <div className="divide-y divide-[#E5DFD5]">
                  {recentNotifications.map((n) => {
                    const route = getNotificationRoute(Role.CLIENT, n.type);
                    const meta = getNotificationMeta(n.type);
                    const toneStyle =
                      TONE_STYLES[meta.tone] || TONE_STYLES.gray;

                    return (
                      <Link
                        key={n.id}
                        href={route}
                        data-testid="client-activity-row"
                        data-type={n.type}
                        className="flex items-start gap-3 p-3.5 sm:p-4 hover:bg-[#FAF7F2] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-inset"
                      >
                        <div
                          className={cn(
                            "size-8 shrink-0 flex items-center justify-center rounded-lg border-[1.5px]",
                            toneStyle
                          )}
                          aria-hidden="true"
                        >
                          {getNotificationIcon(n.type, "size-4")}
                        </div>

                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p className="text-xs font-semibold text-[#0F172A] line-clamp-1">
                            {n.message}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {formatRelative(n.createdAt, now)}
                          </p>
                        </div>

                        {!n.readAt && (
                          <span
                            className="size-2 rounded-full bg-[#0F172A] shrink-0 mt-1.5"
                            title="Unread"
                            aria-label="Unread notification"
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 space-y-1 my-auto">
                  <Bell className="size-6 mx-auto mb-2 text-slate-400" />
                  <p className="font-bold text-[#0F172A]">No activity yet</p>
                  <p>Updates about tasks and hours will show up here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Assign Task Dialog */}
      <AssignTaskDialog
        isOpen={isAssignDialogOpen}
        onClose={() => setIsAssignDialogOpen(false)}
        onSuccess={() => {
          setIsAssignDialogOpen(false);
          router.refresh();
        }}
        linkedStudentName={student?.name}
      />
    </PageContainer>
  );
}
