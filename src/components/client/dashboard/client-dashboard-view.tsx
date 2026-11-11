"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AssignTaskDialog } from "../tasks/assign-task-dialog";
import type { ClientDashboardData } from "@/lib/services/dashboard-service";
import {
  Briefcase,
  Calendar,
  CheckSquare,
  FileText,
  ArrowRight,
  Plus,
  Clock,
  School,
  GraduationCap,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface ClientDashboardViewProps {
  data: ClientDashboardData;
  clientName: string;
}

export function ClientDashboardView({ data, clientName }: ClientDashboardViewProps) {
  const router = useRouter();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);

  const { linked, student, studentStatus, tasksSummary, pendingApproval } = data;

  if (!linked || !student) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Kumusta, {clientName}!
          </h1>
          <p className="text-xs text-[var(--color-muted)]">
            Maligayang pagdating sa iyong Client Portal.
          </p>
        </div>

        <EmptyState
          icon={Briefcase}
          title="Wala pang naka-link na Student VA"
          description="I-link ang iyong student assistant gamit ang kanilang 8-character invite code upang makita ang kanilang schedule, mag-assign ng tasks, at mag-approve ng timesheets."
          action={
            <Link href="/client/profile">
              <Button size="sm" className="gap-1.5 cursor-pointer">
                <span>Mag-link ng Student VA</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const getStatusBadgeVariant = () => {
    switch (studentStatus.state) {
      case "IN_CLASS":
        return "border-[var(--color-class)]/40 bg-[var(--color-class-bg)] text-[var(--color-class)]";
      case "AVAILABLE":
        return "border-[var(--color-work)]/40 bg-[var(--color-work-bg)] text-[var(--color-work)]";
      case "OFF":
      default:
        return "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-muted)]";
    }
  };

  const getStatusDotColor = () => {
    switch (studentStatus.state) {
      case "IN_CLASS":
        return "bg-[var(--color-class)]";
      case "AVAILABLE":
        return "bg-[var(--color-work)]";
      case "OFF":
      default:
        return "bg-[var(--color-muted)]";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Kumusta, {clientName}!
          </h1>
          <p className="text-xs text-[var(--color-muted)]">
            Student VA Management &amp; Schedule Overview
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/client/calendar">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs cursor-pointer">
              <Calendar className="size-3.5" />
              <span>Calendar</span>
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={() => setIsAssignDialogOpen(true)}
            className="gap-1.5 cursor-pointer bg-[var(--color-work)] hover:opacity-90 text-white shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>Assign Task</span>
          </Button>
        </div>
      </div>

      {/* Student Live Status Banner */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
                <GraduationCap className="size-5" />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[var(--color-text)]">
                    {student.name}
                  </span>
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeVariant()}`}
                  >
                    <span className={`size-1.5 rounded-full ${getStatusDotColor()}`} />
                    <span>{studentStatus.label}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                  <span>{studentStatus.description}</span>
                  <span>&bull;</span>
                  <span>{student.school}</span>
                  <span>&bull;</span>
                  <span className="font-semibold text-[var(--color-text)]">
                    ₱{student.hourlyRate}/hr
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Link href="/client/calendar">
                <Button size="xs" variant="outline" className="text-xs gap-1 cursor-pointer">
                  <span>Tingnan ang schedule</span>
                  <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Active Tasks in Progress */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                In Progress
              </span>
              <CheckSquare className="size-4 text-[var(--color-work)]" />
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[var(--color-text)]">
                  {tasksSummary.doingCount}
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  active ({tasksSummary.todoCount} todo)
                </span>
              </div>

              <Link
                href="/client/tasks"
                className="text-[11px] font-medium text-[var(--color-accent)] hover:underline inline-flex items-center gap-1 pt-1"
              >
                <span>Tingnan ang lahat ng tasks</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Timesheets Pending Approval */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                For Approval
              </span>
              <Clock className="size-4 text-[var(--color-muted)]" />
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[var(--color-text)]">
                  {pendingApproval.totalHours}h
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  (₱{pendingApproval.totalAmount.toLocaleString()})
                </span>
              </div>

              <div className="text-[11px] text-[var(--color-muted)]">
                {pendingApproval.logCount > 0
                  ? `${pendingApproval.logCount} logged hours waiting for approval`
                  : "Walang pending timesheets"}
              </div>

              <Link
                href="/client/timesheets"
                className="text-[11px] font-medium text-[var(--color-accent)] hover:underline inline-flex items-center gap-1 pt-1"
              >
                <span>I-review ang timesheets</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Total Tasks Completed */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                Completed Tasks
              </span>
              <FileText className="size-4 text-[var(--color-muted)]" />
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[var(--color-text)]">
                  {tasksSummary.doneCount}
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  tasks finished
                </span>
              </div>

              <div className="text-[11px] text-[var(--color-muted)]">
                {tasksSummary.todoCount + tasksSummary.doingCount + tasksSummary.doneCount} total tasks assigned
              </div>

              <button
                onClick={() => setIsAssignDialogOpen(true)}
                className="text-[11px] font-medium text-[var(--color-work)] hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
              >
                <span>+ Mag-assign ng bago</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Tasks & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Tasks List (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-[var(--color-text)]">
                    Active Tasks
                  </CardTitle>
                  <CardDescription className="text-xs text-[var(--color-muted)]">
                    Kasalukuyang ginagawa o nakabinbing gawain ng student
                  </CardDescription>
                </div>

                <Link href="/client/tasks">
                  <Button variant="ghost" size="xs" className="text-xs gap-1 cursor-pointer">
                    <span>View all</span>
                    <ArrowRight className="size-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent className="space-y-2 pt-1">
              {tasksSummary.activeTasks.length > 0 ? (
                tasksSummary.activeTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-semibold text-[var(--color-text)] block">
                        {t.title}
                      </span>
                      <span className="text-[11px] text-[var(--color-muted)]">
                        Est: {t.estHours}h &bull; Logged: {t.loggedHours}h
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={t.status === "DOING" ? "default" : "secondary"}
                        className="text-[10px] uppercase font-semibold"
                      >
                        {t.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-6 text-center text-xs text-[var(--color-muted)]">
                  <CheckSquare className="size-6 mx-auto mb-1.5 opacity-40" />
                  <p className="font-medium text-[var(--color-text)]">
                    Walang active tasks sa kasalukuyan
                  </p>
                  <Button
                    size="xs"
                    onClick={() => setIsAssignDialogOpen(true)}
                    className="mt-3 text-xs bg-[var(--color-work)] text-white hover:opacity-90 cursor-pointer"
                  >
                    + Assign Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Navigation Sidecard */}
        <div className="space-y-4">
          <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Quick Shortcuts
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-2">
              <Link href="/client/calendar" className="block">
                <div className="flex items-center justify-between p-2.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-accent)] transition-colors">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-[var(--color-class)]" />
                    <div>
                      <span className="text-xs font-medium text-[var(--color-text)] block">
                        Student Calendar
                      </span>
                      <span className="text-[10px] text-[var(--color-muted)]">
                        Tingnan ang weekly schedule
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="size-3.5 text-[var(--color-muted)]" />
                </div>
              </Link>

              <Link href="/client/timesheets" className="block">
                <div className="flex items-center justify-between p-2.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-accent)] transition-colors">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-[var(--color-work)]" />
                    <div>
                      <span className="text-xs font-medium text-[var(--color-text)] block">
                        Timesheets &amp; Invoices
                      </span>
                      <span className="text-[10px] text-[var(--color-muted)]">
                        Mag-approve ng logged hours
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="size-3.5 text-[var(--color-muted)]" />
                </div>
              </Link>

              <Link href="/client/profile" className="block">
                <div className="flex items-center justify-between p-2.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-accent)] transition-colors">
                  <div className="flex items-center gap-2">
                    <Briefcase className="size-4 text-[var(--color-accent)]" />
                    <div>
                      <span className="text-xs font-medium text-[var(--color-text)] block">
                        Agreement &amp; Rate
                      </span>
                      <span className="text-[10px] text-[var(--color-muted)]">
                        ₱{student.hourlyRate}/hr &bull; Settings
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="size-3.5 text-[var(--color-muted)]" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Task Dialog */}
      <AssignTaskDialog
        isOpen={isAssignDialogOpen}
        onClose={() => setIsAssignDialogOpen(false)}
        onSuccess={() => {
          setIsAssignDialogOpen(false);
          router.refresh();
        }}
        linkedStudentName={student.name}
      />
    </div>
  );
}

