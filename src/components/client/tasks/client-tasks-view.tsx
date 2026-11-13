"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TaskWithDetails } from "@/lib/services/task-service";
import { updateTaskStatusAction } from "@/lib/actions/task";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge, getResponseLabel } from "@/lib/labels";
import {
  formatDate,
  formatTime,
  formatTimeRange,
  formatDateTime,
  formatHours,
  formatRelative,
  parseSafeDate,
} from "@/lib/format";
import { toUserErrorMessage } from "@/lib/errors";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { AssignTaskDialog } from "./assign-task-dialog";
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  AlertTriangle,
  Check,
  MoreHorizontal,
  UserX,
} from "lucide-react";
import { TaskStatus, StudentResponse, TimeLogStatus } from "@prisma/client";

export interface TaskTimeLogItem {
  id: string;
  taskId: string;
  timeIn: Date;
  timeOut: Date | null;
  totalHours: number | null;
  status: TimeLogStatus;
}

export interface ClientTaskWithLogs extends TaskWithDetails {
  timeLogs?: TaskTimeLogItem[];
  awaitingApprovalHours?: number;
}

interface ClientTasksViewProps {
  initialTasks: ClientTaskWithLogs[];
  linkedStudent: { id: string; name: string } | null;
}

type TabKey = "ALL" | "TODO" | "DOING" | "DONE";

export function ClientTasksView({
  initialTasks,
  linkedStudent,
}: ClientTasksViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = React.useState<ClientTaskWithLogs[]>(initialTasks);
  const [activeTab, setActiveTab] = React.useState<TabKey>("ALL");
  const [now, setNow] = React.useState<Date>(() => new Date());

  // Assign Task Dialog
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [dialogDefaults, setDialogDefaults] = React.useState<{
    date?: string;
    start?: string;
    end?: string;
  }>({});

  // Task Detail Sheet (initialize from searchParams if valid)
  const initialTaskParam = searchParams.get("task");
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(() => {
    return initialTasks.some((t) => t.id === initialTaskParam) ? initialTaskParam : null;
  });
  const lastFocusedCardRef = React.useRef<string | null>(null);

  // Sync tasks from props
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Keep now updated periodically for relative deadlines
  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle URL search params: ?assign=1 and ?task=<id>
  React.useEffect(() => {
    // 1. Calendar deeplink: ?assign=1&date=&start=&end=
    if (searchParams.get("assign") === "1") {
      const dateParam = searchParams.get("date");
      const startParam = searchParams.get("start");
      const endParam = searchParams.get("end");

      const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
      const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

      const validDate =
        dateParam && DATE_REGEX.test(dateParam) && !isNaN(new Date(dateParam).getTime())
          ? dateParam
          : undefined;
      const validStart =
        startParam && TIME_REGEX.test(startParam) ? startParam : undefined;
      const validEnd =
        endParam && TIME_REGEX.test(endParam) ? endParam : undefined;

      setDialogDefaults({
        date: validDate,
        start: validStart,
        end: validEnd,
      });
      setIsAssignDialogOpen(true);
    }

    // 2. Task Detail Sheet deeplink: ?task=<id> (validated against loaded tasks)
    const taskParam = searchParams.get("task");
    if (taskParam) {
      const exists = tasks.some((t) => t.id === taskParam);
      if (exists) {
        setSelectedTaskId(taskParam);
      }
    }
  }, [searchParams, tasks]);

  // Open detail sheet and synchronize URL
  const handleOpenSheet = (task: ClientTaskWithLogs) => {
    lastFocusedCardRef.current = task.id;
    setSelectedTaskId(task.id);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("task", task.id);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", newUrl);
    }
  };

  // Close detail sheet and restore focus
  const handleCloseSheet = () => {
    setSelectedTaskId(null);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("task");
      const newSearch = params.toString();
      const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}`;
      window.history.replaceState(null, "", newUrl);
    }
    if (lastFocusedCardRef.current) {
      const id = lastFocusedCardRef.current;
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>(`[data-task-id="${id}"]`);
        el?.focus();
      }, 50);
    }
  };

  // Optimistic Status Change with rollback on error
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const previousTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await updateTaskStatusAction({ taskId, status: newStatus });
      if (res.success) {
        toast.success("Task status updated.");
        router.refresh();
      } else {
        setTasks(previousTasks);
        toast.error(toUserErrorMessage(res.error ?? "Failed to update task status."));
      }
    } catch (err) {
      setTasks(previousTasks);
      toast.error(toUserErrorMessage(err));
    }
  };

  // Sort helper: nearest due date first
  const sortByNearestDueDate = (a: ClientTaskWithLogs, b: ClientTaskWithLogs) => {
    const aTime = parseSafeDate(a.dueAt)?.getTime() ?? 0;
    const bTime = parseSafeDate(b.dueAt)?.getTime() ?? 0;
    return aTime - bTime;
  };

  // Grouping for "All" tab:
  // 1. Needs your attention: reschedule requested and not done
  const needsAttentionGroup = tasks
    .filter(
      (t) =>
        t.studentResponse === StudentResponse.RESCHEDULE_REQUESTED &&
        t.status !== TaskStatus.DONE
    )
    .sort(sortByNearestDueDate);

  // 2. In progress
  const inProgressGroup = tasks
    .filter(
      (t) =>
        t.status === TaskStatus.DOING &&
        t.studentResponse !== StudentResponse.RESCHEDULE_REQUESTED
    )
    .sort(sortByNearestDueDate);

  // 3. Up next: to do, by nearest due date
  const upNextGroup = tasks
    .filter(
      (t) =>
        t.status === TaskStatus.TODO &&
        t.studentResponse !== StudentResponse.RESCHEDULE_REQUESTED
    )
    .sort(sortByNearestDueDate);

  // 4. Done: last and dimmed
  const doneGroup = tasks
    .filter((t) => t.status === TaskStatus.DONE)
    .sort(sortByNearestDueDate);

  // Filtered tasks for individual tabs
  let currentTabTasks: ClientTaskWithLogs[] = [];
  if (activeTab === "TODO") {
    const attentionTodo = tasks
      .filter(
        (t) =>
          t.status === TaskStatus.TODO &&
          t.studentResponse === StudentResponse.RESCHEDULE_REQUESTED
      )
      .sort(sortByNearestDueDate);
    const standardTodo = tasks
      .filter(
        (t) =>
          t.status === TaskStatus.TODO &&
          t.studentResponse !== StudentResponse.RESCHEDULE_REQUESTED
      )
      .sort(sortByNearestDueDate);
    currentTabTasks = [...attentionTodo, ...standardTodo];
  } else if (activeTab === "DOING") {
    const attentionDoing = tasks
      .filter(
        (t) =>
          t.status === TaskStatus.DOING &&
          t.studentResponse === StudentResponse.RESCHEDULE_REQUESTED
      )
      .sort(sortByNearestDueDate);
    const standardDoing = tasks
      .filter(
        (t) =>
          t.status === TaskStatus.DOING &&
          t.studentResponse !== StudentResponse.RESCHEDULE_REQUESTED
      )
      .sort(sortByNearestDueDate);
    currentTabTasks = [...attentionDoing, ...standardDoing];
  } else if (activeTab === "DONE") {
    currentTabTasks = doneGroup;
  }

  // Counts for tabs
  const countAll = tasks.length;
  const countTodo = tasks.filter((t) => t.status === TaskStatus.TODO).length;
  const countDoing = tasks.filter((t) => t.status === TaskStatus.DOING).length;
  const countDone = tasks.filter((t) => t.status === TaskStatus.DONE).length;

  // Linked student first name
  const studentFirstName = linkedStudent?.name
    ? linkedStudent.name.trim().split(" ")[0]
    : "your student";

  // Selected task for Sheet
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  return (
    <PageContainer>
      {/* HEADER */}
      <PageHeader
        title="Tasks"
        subtitle={
          linkedStudent
            ? `Tasks you've assigned to ${studentFirstName}.`
            : "Tasks you've assigned to your student."
        }
        actions={
          <Button
            type="button"
            onClick={() => setIsAssignDialogOpen(true)}
            disabled={!linkedStudent}
            className="items-center gap-1.5 font-bold cursor-pointer text-xs"
          >
            <Plus className="size-4" />
            <span>Assign task</span>
          </Button>
        }
      />

      {/* TABS (Segmented, same as Student Tasks) */}
      <div className="w-full overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-1 shadow-[2px_2px_0px_0px_#0F172A] w-fit min-w-max">
          <button
            type="button"
            data-testid="client-tasks-tab"
            data-tab="all"
            onClick={() => setActiveTab("ALL")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]",
              activeTab === "ALL"
                ? "bg-[#0F172A] text-white shadow-[1px_1px_0px_0px_#0F172A]"
                : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
            )}
          >
            <span>All</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                activeTab === "ALL"
                  ? "bg-white/20 text-white"
                  : "bg-white border border-[#0F172A]/20 text-slate-700"
              )}
            >
              {countAll}
            </span>
          </button>

          <button
            type="button"
            data-testid="client-tasks-tab"
            data-tab="todo"
            onClick={() => setActiveTab("TODO")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]",
              activeTab === "TODO"
                ? "bg-[#0F172A] text-white shadow-[1px_1px_0px_0px_#0F172A]"
                : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
            )}
          >
            <span>To do</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                activeTab === "TODO"
                  ? "bg-white/20 text-white"
                  : "bg-white border border-[#0F172A]/20 text-slate-700"
              )}
            >
              {countTodo}
            </span>
          </button>

          <button
            type="button"
            data-testid="client-tasks-tab"
            data-tab="in_progress"
            onClick={() => setActiveTab("DOING")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]",
              activeTab === "DOING"
                ? "bg-[#0F172A] text-white shadow-[1px_1px_0px_0px_#0F172A]"
                : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
            )}
          >
            <span>In progress</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                activeTab === "DOING"
                  ? "bg-white/20 text-white"
                  : "bg-white border border-[#0F172A]/20 text-slate-700"
              )}
            >
              {countDoing}
            </span>
          </button>

          <button
            type="button"
            data-testid="client-tasks-tab"
            data-tab="done"
            onClick={() => setActiveTab("DONE")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]",
              activeTab === "DONE"
                ? "bg-[#0F172A] text-white shadow-[1px_1px_0px_0px_#0F172A]"
                : "text-slate-600 hover:text-[#0F172A] hover:bg-white/60"
            )}
          >
            <span>Done</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                activeTab === "DONE"
                  ? "bg-white/20 text-white"
                  : "bg-white border border-[#0F172A]/20 text-slate-700"
              )}
            >
              {countDone}
            </span>
          </button>
        </div>
      </div>

      {/* TASK LIST CONTENT */}
      {activeTab === "ALL" ? (
        tasks.length === 0 ? (
          !linkedStudent ? (
            <EmptyState
              icon={UserX}
              title="No student linked yet."
              description="No student linked yet. Enter your student's invite code in Settings."
              action={
                <Link href="/client/profile">
                  <Button
                    type="button"
                    className="gap-2 text-xs font-bold bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
                  >
                    Go to settings
                  </Button>
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={CheckSquare}
              title="No tasks yet."
              description={`No tasks yet. Assign your first task to ${studentFirstName}.`}
              action={
                <Button
                  type="button"
                  onClick={() => setIsAssignDialogOpen(true)}
                  className="gap-2 text-xs font-bold bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>Assign task</span>
                </Button>
              }
            />
          )
        ) : (
          <div className="space-y-6">
            {/* Group 1: Needs your attention */}
            {needsAttentionGroup.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Needs your attention
                  </h2>
                  <span className="rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                    {needsAttentionGroup.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {needsAttentionGroup.map((task) => (
                    <ClientTaskCard
                      key={task.id}
                      task={task}
                      now={now}
                      onOpenSheet={handleOpenSheet}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Group 2: In progress */}
            {inProgressGroup.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    In progress
                  </h2>
                  <span className="rounded-full bg-blue-100 border border-blue-300 px-1.5 py-0.2 text-[10px] font-bold text-blue-800">
                    {inProgressGroup.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {inProgressGroup.map((task) => (
                    <ClientTaskCard
                      key={task.id}
                      task={task}
                      now={now}
                      onOpenSheet={handleOpenSheet}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Group 3: Up next */}
            {upNextGroup.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Up next
                  </h2>
                  <span className="rounded-full bg-slate-200 border border-slate-300 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                    {upNextGroup.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {upNextGroup.map((task) => (
                    <ClientTaskCard
                      key={task.id}
                      task={task}
                      now={now}
                      onOpenSheet={handleOpenSheet}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Group 4: Done */}
            {doneGroup.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Done
                  </h2>
                  <span className="rounded-full bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                    {doneGroup.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {doneGroup.map((task) => (
                    <ClientTaskCard
                      key={task.id}
                      task={task}
                      now={now}
                      onOpenSheet={handleOpenSheet}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )
      ) : (
        /* Tab Views: To do, In progress, Done */
        <div>
          {currentTabTasks.length === 0 ? (
            activeTab === "TODO" ? (
              <EmptyState
                icon={CheckSquare}
                title="Nothing waiting."
                description="Tasks waiting to be started will show up here."
              />
            ) : activeTab === "DOING" ? (
              <EmptyState
                icon={CheckSquare}
                title="No tasks in progress."
                description="When work begins on tasks, they will appear here."
              />
            ) : (
              <EmptyState
                icon={CheckSquare}
                title="Completed tasks will show up here."
                description="When tasks are finished, they will appear here."
              />
            )
          ) : (
            <div className="space-y-2.5">
              {currentTabTasks.map((task) => (
                <ClientTaskCard
                  key={task.id}
                  task={task}
                  now={now}
                  onOpenSheet={handleOpenSheet}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating "Assign task" button on mobile (< 640px) */}
      {linkedStudent && (
        <div className="fixed bottom-20 right-4 z-40 sm:hidden">
          <Button
            type="button"
            onClick={() => setIsAssignDialogOpen(true)}
            className="bg-[#0F172A] text-white font-bold border-[1.5px] border-[#0F172A] shadow-[3px_3px_0px_0px_#0F172A] hover:bg-slate-800 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none h-12 px-5 rounded-full cursor-pointer gap-2"
          >
            <Plus className="size-4" />
            <span>Assign task</span>
          </Button>
        </div>
      )}

      {/* DETAIL SHEET */}
      <ClientTaskDetailSheet
        task={selectedTask}
        studentFirstName={studentFirstName}
        now={now}
        isOpen={Boolean(selectedTask)}
        onClose={handleCloseSheet}
      />

      {/* ASSIGN TASK DIALOG */}
      <AssignTaskDialog
        isOpen={isAssignDialogOpen}
        onClose={() => setIsAssignDialogOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
        linkedStudentName={linkedStudent?.name}
        defaults={dialogDefaults}
      />
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// TASK CARD COMPONENT
// ---------------------------------------------------------------------------

interface ClientTaskCardProps {
  task: ClientTaskWithLogs;
  now: Date;
  onOpenSheet: (task: ClientTaskWithLogs) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
}

function ClientTaskCard({
  task,
  now,
  onOpenSheet,
  onStatusChange,
}: ClientTaskCardProps) {
  const isDone = task.status === TaskStatus.DONE;
  const isRescheduleRequested =
    task.studentResponse === StudentResponse.RESCHEDULE_REQUESTED && !isDone;

  const dueDate = parseSafeDate(task.dueAt);
  const isOverdue = !isDone && Boolean(dueDate && dueDate.getTime() < now.getTime());

  // 4px Left edge bar
  let leftBarClass = "bg-[#0F172A]"; // Neutral ink for to do
  if (isDone) {
    leftBarClass = "bg-[#16A34A]/50"; // Muted green for done
  } else if (isOverdue) {
    leftBarClass = "bg-[#DC2626]"; // Red if overdue and not done
  } else if (isRescheduleRequested) {
    leftBarClass = "bg-[#D97706]"; // Amber if reschedule requested
  } else if (task.status === TaskStatus.DOING) {
    leftBarClass = "bg-[#16A34A]"; // Green for in progress
  }

  // Response chip metadata and styling (English, AA contrast)
  const responseMeta = getResponseLabel(task.studentResponse, "CLIENT");
  let responseBadgeClass = "border-[#0F172A]/20 bg-[#FAF7F2] text-slate-700";
  if (task.studentResponse === StudentResponse.ACCEPTED) {
    responseBadgeClass = "border-[#16A34A] bg-[#F0FDF4] text-[#166534]";
  } else if (task.studentResponse === StudentResponse.RESCHEDULE_REQUESTED) {
    responseBadgeClass = "border-[#D97706] bg-[#FFFBEB] text-[#92400E]";
  }

  // Scheduled window formatting (Never repeat a date)
  const startDate = parseSafeDate(task.startAt);
  let scheduledWindowText = "—";
  if (startDate && dueDate) {
    const startDayStr = formatDate(startDate, "yyyy-MM-dd");
    const dueDayStr = formatDate(dueDate, "yyyy-MM-dd");
    if (startDayStr === dueDayStr) {
      scheduledWindowText = `${formatDate(startDate, "EEE, MMM d")} · ${formatTimeRange(startDate, dueDate)}`;
    } else {
      scheduledWindowText = `${formatDate(startDate, "EEE, MMM d, h:mm a")} – ${formatDate(dueDate, "EEE, MMM d, h:mm a")}`;
    }
  } else if (startDate) {
    scheduledWindowText = formatDate(startDate, "EEE, MMM d, h:mm a");
  }

  // Relative due first
  const dueDay = dueDate ? formatDate(dueDate, "yyyy-MM-dd") : "";
  const nowDay = formatDate(now, "yyyy-MM-dd");
  const isDueToday = !isDone && dueDay === nowDay;

  let relativeDueText = dueDate ? `Due ${formatRelative(dueDate, now)}` : "—";
  let dueTone: "normal" | "amber" | "red" = "normal";

  if (isOverdue) {
    relativeDueText = "Overdue";
    dueTone = "red";
  } else if (isDueToday) {
    relativeDueText = "Due today";
    dueTone = "amber";
  }

  // Progress Bar calculation
  const estHours = Math.max(0.1, task.estHours);
  const isOverrun = task.loggedHours > task.estHours;
  const overHours = isOverrun ? task.loggedHours - task.estHours : 0;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((task.loggedHours / estHours) * 100))
  );

  // Hidden for tasks with nothing logged and not started
  const isNotStarted = task.status === TaskStatus.TODO && task.loggedHours === 0;

  // Awaiting approval hours (if loaded)
  const awaitingApproval = task.awaitingApprovalHours ?? 0;

  // Status transitions
  const validStatusTransitions: { status: TaskStatus; label: string }[] = [];
  if (task.status === TaskStatus.TODO) {
    validStatusTransitions.push({ status: TaskStatus.DOING, label: "Mark as in progress" });
    validStatusTransitions.push({ status: TaskStatus.DONE, label: "Mark as done" });
  } else if (task.status === TaskStatus.DOING) {
    validStatusTransitions.push({ status: TaskStatus.TODO, label: "Mark as to do" });
    validStatusTransitions.push({ status: TaskStatus.DONE, label: "Mark as done" });
  } else if (task.status === TaskStatus.DONE) {
    validStatusTransitions.push({ status: TaskStatus.TODO, label: "Mark as to do" });
    validStatusTransitions.push({ status: TaskStatus.DOING, label: "Mark as in progress" });
  }

  return (
    <article
      role="button"
      tabIndex={0}
      data-task-id={task.id}
      data-testid="client-task-card"
      data-status={task.status}
      data-response={task.studentResponse ?? "PENDING"}
      onClick={() => onOpenSheet(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenSheet(task);
        }
      }}
      className={cn(
        "group relative rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-3.5 sm:p-4 shadow-[3px_3px_0px_0px_#0F172A] overflow-hidden transition-all text-left w-full cursor-pointer",
        "hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#0F172A]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2",
        isDone && "opacity-75 hover:opacity-100"
      )}
    >
      {/* 4px Left Edge Bar */}
      <div
        className={cn("absolute left-0 top-0 bottom-0 w-1", leftBarClass)}
        aria-hidden="true"
      />

      <div className="pl-2 sm:pl-3 space-y-2">
        {/* ROW 1: Title + ONE StatusBadge + Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isDone && (
              <div
                className="flex size-4.5 items-center justify-center rounded-full bg-[#F0FDF4] border border-[#16A34A] text-[#166534] shrink-0"
                title="Completed"
                aria-label="Completed"
              >
                <Check className="size-3" strokeWidth={3} />
              </div>
            )}
            <h3 className="font-display text-[18px] font-bold text-[#0F172A] truncate leading-snug">
              {task.title}
            </h3>
            <div className="shrink-0">
              <StatusBadge status={task.status} />
            </div>
          </div>

          {/* "⋯" Action Menu (40px+ tap target) */}
          <div
            className="shrink-0 -mr-1 -mt-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid="client-task-menu"
                  aria-label={`Options for ${task.title}`}
                  className="flex size-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-white text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] hover:bg-[#FAF7F2] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuLabel>Change status</DropdownMenuLabel>
                {validStatusTransitions.map((st) => (
                  <DropdownMenuItem
                    key={st.status}
                    data-testid="client-task-status-option"
                    data-status={st.status}
                    onClick={() => onStatusChange(task.id, st.status)}
                    className="cursor-pointer font-medium text-xs"
                  >
                    <span>{st.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ROW 2: Description clamped to 1 line, muted */}
        {task.description && (
          <p className="text-[13px] text-slate-600 truncate leading-tight">
            {task.description}
          </p>
        )}

        {/* ROW 3: Chips and metadata (13px, AA contrast) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-slate-700 pt-0.5">
          {/* Student response chip showing every state */}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-bold shadow-[1px_1px_0px_0px_#0F172A]",
              responseBadgeClass
            )}
          >
            {responseMeta.label}
          </span>

          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
            ·
          </span>

          {/* Scheduled window */}
          <span className="flex items-center gap-1 text-slate-700 font-medium">
            <Calendar className="size-3.5 text-slate-500 shrink-0" />
            <span>{scheduledWindowText}</span>
          </span>

          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
            ·
          </span>

          {/* Due relative first */}
          <span className="flex items-center gap-1">
            <Clock className="size-3.5 text-slate-500 shrink-0" />
            <span
              className={cn(
                "font-semibold",
                dueTone === "red" && "text-[#DC2626]",
                dueTone === "amber" && "text-[#D97706]",
                dueTone === "normal" && "text-slate-800"
              )}
            >
              {relativeDueText}
            </span>
          </span>

          {/* Awaiting approval chip (if loaded and > 0) */}
          {awaitingApproval > 0 && (
            <Link
              href="/client/timesheets"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-[#D97706] bg-[#FFFBEB] px-2.5 py-0.5 text-xs font-bold text-[#92400E] shadow-[1.5px_1.5px_0px_0px_#D97706] hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <Clock className="size-3 text-[#D97706]" />
              <span>{`${formatHours(awaitingApproval)} awaiting your approval`}</span>
            </Link>
          )}
        </div>

        {/* PROGRESS BAR (hidden for tasks with nothing logged and not started) */}
        {!isNotStarted && (
          <div className="pt-1 space-y-1">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>
                {`${formatHours(task.loggedHours)} of ${formatHours(task.estHours)}`}
              </span>
              {isOverrun && (
                <span className="font-semibold text-[#D97706]">
                  {`${formatHours(overHours)} over estimate`}
                </span>
              )}
            </div>
            <div
              className="h-1.5 w-full rounded-full bg-slate-200 border border-slate-300 overflow-hidden"
              role="progressbar"
              aria-valuenow={task.loggedHours}
              aria-valuemin={0}
              aria-valuemax={task.estHours}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isOverrun ? "bg-[#D97706]" : "bg-[#16A34A]"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// DETAIL SHEET COMPONENT
// ---------------------------------------------------------------------------

interface ClientTaskDetailSheetProps {
  task: ClientTaskWithLogs | null;
  studentFirstName: string;
  now: Date;
  isOpen: boolean;
  onClose: () => void;
}

function ClientTaskDetailSheet({
  task,
  studentFirstName,
  now,
  isOpen,
  onClose,
}: ClientTaskDetailSheetProps) {
  if (!task) return null;

  const isDone = task.status === TaskStatus.DONE;
  const dueDate = parseSafeDate(task.dueAt);
  const isOverdue = !isDone && Boolean(dueDate && dueDate.getTime() < now.getTime());
  const dueDay = dueDate ? formatDate(dueDate, "yyyy-MM-dd") : "";
  const nowDay = formatDate(now, "yyyy-MM-dd");
  const isDueToday = !isDone && dueDay === nowDay;

  // Relative due string
  let relativeDueLabel = dueDate ? `Due ${formatRelative(dueDate, now)}` : "—";
  if (isOverdue) relativeDueLabel = "Overdue";
  else if (isDueToday) relativeDueLabel = "Due today";

  // Progress metrics
  const estHours = Math.max(0.1, task.estHours);
  const isOverrun = task.loggedHours > task.estHours;
  const overHours = isOverrun ? task.loggedHours - task.estHours : 0;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((task.loggedHours / estHours) * 100))
  );

  // Response chip tone
  const responseMeta = getResponseLabel(task.studentResponse, "CLIENT");
  let responseBadgeClass = "border-[#0F172A]/20 bg-[#FAF7F2] text-slate-700";
  if (task.studentResponse === StudentResponse.ACCEPTED) {
    responseBadgeClass = "border-[#16A34A] bg-[#F0FDF4] text-[#166534]";
  } else if (task.studentResponse === StudentResponse.RESCHEDULE_REQUESTED) {
    responseBadgeClass = "border-[#D97706] bg-[#FFFBEB] text-[#92400E]";
  }

  // Logs list for this task
  const timeLogs = task.timeLogs ?? [];
  const hasAwaitingApproval = timeLogs.some((l) => l.status === TimeLogStatus.CLOSED);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="responsive"
        data-testid="client-task-sheet"
        className="w-full sm:max-w-lg overflow-y-auto space-y-6"
      >
        <SheetHeader className="space-y-2 pb-4 border-b border-[#E5DFD5]">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <SheetTitle className="font-display text-xl font-bold text-[#0F172A] leading-snug">
              {task.title}
            </SheetTitle>
            <StatusBadge status={task.status} />
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-bold shadow-[1px_1px_0px_0px_#0F172A]",
                responseBadgeClass
              )}
            >
              {responseMeta.label}
            </span>
          </div>
          <SheetDescription className="sr-only">
            Task details for {task.title}
          </SheetDescription>
        </SheetHeader>

        {/* Reschedule callout (if requested) */}
        {task.studentResponse === StudentResponse.RESCHEDULE_REQUESTED && (
          <div
            data-testid="client-task-reschedule-reason"
            className="flex items-start gap-3 rounded-xl border-[1.5px] border-[#D97706] bg-[#FFFBEB] p-3.5 text-xs text-[#92400E] shadow-[2px_2px_0px_0px_#D97706]"
          >
            <AlertTriangle className="size-4 shrink-0 mt-0.5 text-[#D97706]" />
            <div className="space-y-1">
              <div className="font-bold text-sm text-[#92400E]">
                {`${studentFirstName} asked to reschedule`}
              </div>
              <p className="text-slate-800 leading-relaxed font-normal">
                {task.rescheduleReason || "No reason provided."}
              </p>
            </div>
          </div>
        )}

        {/* Description (full text) */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Description
          </h4>
          <p className="text-sm text-[#0F172A] whitespace-pre-wrap leading-relaxed">
            {task.description || "No description provided."}
          </p>
          {task.hoursWarning && (
            <p className="text-sm font-semibold text-[#D97706]">
              Exceeds available hours
            </p>
          )}
        </div>

        {/* Schedule & Due Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] shadow-[2px_2px_0px_0px_#0F172A]">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Scheduled window
            </div>
            <div className="text-xs font-semibold text-[#0F172A]">
              {formatDate(task.startAt, "EEE, MMM d, yyyy")}
            </div>
            <div className="text-xs text-slate-600 font-medium">
              {formatTimeRange(task.startAt, task.dueAt)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Deadline
            </div>
            <div
              className={cn(
                "text-xs font-bold",
                isOverdue && "text-[#DC2626]",
                isDueToday && "text-[#D97706]",
                !isOverdue && !isDueToday && "text-[#0F172A]"
              )}
            >
              {relativeDueLabel}
            </div>
            <div className="text-xs text-slate-600 font-medium">
              {formatDateTime(task.dueAt)}
            </div>
          </div>
        </div>

        {/* Progress: Estimate vs Logged */}
        <div className="space-y-2 p-3.5 rounded-xl border-[1.5px] border-[#0F172A] bg-white shadow-[2px_2px_0px_0px_#0F172A]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#0F172A]">Progress</span>
            <span className="font-mono text-slate-700">
              {`${formatHours(task.loggedHours)} of ${formatHours(task.estHours)}`}
            </span>
          </div>

          <div
            className="h-2 w-full rounded-full bg-slate-200 border border-slate-300 overflow-hidden"
            role="progressbar"
            aria-valuenow={task.loggedHours}
            aria-valuemin={0}
            aria-valuemax={task.estHours}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isOverrun ? "bg-[#D97706]" : "bg-[#16A34A]"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {isOverrun && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D97706] pt-0.5">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>{formatHours(overHours)} over estimate</span>
            </div>
          )}
        </div>

        {/* Time Logged List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Time logged
            </h4>
            <span className="text-xs font-mono font-bold text-[#0F172A]">
              {`Total: ${formatHours(task.loggedHours)}`}
            </span>
          </div>

          {timeLogs.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-[#E5DFD5] bg-[#FAF7F2] text-center text-xs text-slate-500 italic">
              No time logged yet.
            </div>
          ) : (
            <div className="space-y-2">
              {timeLogs.map((log) => (
                <div
                  key={log.id}
                  data-testid="client-task-log-row"
                  data-status={log.status}
                  className="flex items-center justify-between p-3 rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] shadow-[1.5px_1.5px_0px_0px_#0F172A]"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-[#0F172A]">
                      {formatDate(log.timeIn, "EEE, MMM d, yyyy")}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {formatTimeRange(log.timeIn, log.timeOut)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-[#0F172A]">
                      {formatHours(log.totalHours)}
                    </span>
                    <StatusBadge status={log.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Button if any log awaits approval */}
          {hasAwaitingApproval && (
            <div className="pt-2">
              <Link href="/client/timesheets" className="w-full block">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs font-bold bg-[#FAF7F2] text-[#0F172A] border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-white cursor-pointer"
                >
                  Review in Timesheets
                </Button>
              </Link>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
