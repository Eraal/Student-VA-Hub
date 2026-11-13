"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TaskWithDetails } from "@/lib/services/task-service";
import { updateTaskStatusAction, respondToTaskAction } from "@/lib/actions/task";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { StatusBadge, getResponseLabel, TONE_STYLES } from "@/lib/labels";
import { formatDate, formatHours, formatRelative, parseSafeDate } from "@/lib/format";
import { toUserErrorMessage } from "@/lib/errors";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  CheckSquare,
  Clock,
  Calendar,
  AlertTriangle,
  Loader2,
  Play,
  RotateCcw,
  Check,
  MoreHorizontal,
  X,
  AlertCircle,
} from "lucide-react";
import { TaskStatus, StudentResponse, Role } from "@prisma/client";

interface StudentTasksViewProps {
  initialTasks: TaskWithDetails[];
}

type TabKey = "ALL" | "TODO" | "DOING" | "DONE";

interface RescheduleModalState {
  isOpen: boolean;
  taskId: string | null;
  taskTitle: string;
}

export function StudentTasksView({ initialTasks }: StudentTasksViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = React.useState<TaskWithDetails[]>(initialTasks);
  const [activeTab, setActiveTab] = React.useState<TabKey>("ALL");
  const [now, setNow] = React.useState<Date>(() => new Date());

  // Reschedule Dialog state
  const [rescheduleModal, setRescheduleModal] = React.useState<RescheduleModalState>({
    isOpen: false,
    taskId: null,
    taskTitle: "",
  });
  const [rescheduleReason, setRescheduleReason] = React.useState("");
  const [isSubmittingReschedule, setIsSubmittingReschedule] = React.useState(false);

  // Loading states
  const [isSubmittingAccept, setIsSubmittingAccept] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Keep now updated periodically
  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Filtered task counts for tabs
  const countAll = tasks.length;
  const countTodo = tasks.filter((t) => t.status === TaskStatus.TODO).length;
  const countDoing = tasks.filter((t) => t.status === TaskStatus.DOING).length;
  const countDone = tasks.filter((t) => t.status === TaskStatus.DONE).length;

  // Optimistic Accept action
  const handleAccept = async (taskId: string) => {
    setIsSubmittingAccept(taskId);
    const previousTasks = [...tasks];

    // Optimistic local update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, studentResponse: StudentResponse.ACCEPTED } : t
      )
    );

    try {
      const res = await respondToTaskAction({
        taskId,
        response: StudentResponse.ACCEPTED,
      });

      if (res.success) {
        toast.success("Task accepted.");
        router.refresh();
      } else {
        setTasks(previousTasks);
        toast.error(toUserErrorMessage(res.error ?? "Failed to accept task."));
      }
    } catch (err) {
      setTasks(previousTasks);
      toast.error(toUserErrorMessage(err));
    } finally {
      setIsSubmittingAccept(null);
    }
  };

  // Open reschedule modal
  const openRescheduleModal = (task: TaskWithDetails) => {
    setRescheduleReason("");
    setRescheduleModal({
      isOpen: true,
      taskId: task.id,
      taskTitle: task.title,
    });
  };

  // Submit reschedule request
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleModal.taskId || !rescheduleReason.trim()) return;

    setIsSubmittingReschedule(true);
    const taskId = rescheduleModal.taskId;
    const reason = rescheduleReason.trim();
    const previousTasks = [...tasks];

    // Optimistic local update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              studentResponse: StudentResponse.RESCHEDULE_REQUESTED,
              rescheduleReason: reason,
            }
          : t
      )
    );

    try {
      const res = await respondToTaskAction({
        taskId,
        response: StudentResponse.RESCHEDULE_REQUESTED,
        rescheduleReason: reason,
      });

      if (res.success) {
        setRescheduleModal({ isOpen: false, taskId: null, taskTitle: "" });
        setRescheduleReason("");
        toast.success("Reschedule request sent to client.");
        router.refresh();
      } else {
        setTasks(previousTasks);
        toast.error(toUserErrorMessage(res.error ?? "Failed to request reschedule."));
      }
    } catch (err) {
      setTasks(previousTasks);
      toast.error(toUserErrorMessage(err));
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  // Optimistic Status Change action
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const previousTasks = [...tasks];

    // Optimistic update
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
  const sortByNearestDueDate = (a: TaskWithDetails, b: TaskWithDetails) => {
    const aTime = parseSafeDate(a.dueAt)?.getTime() ?? 0;
    const bTime = parseSafeDate(b.dueAt)?.getTime() ?? 0;
    return aTime - bTime;
  };

  // Partition tasks for "All" tab view
  // 1. Needs your response (pending response, not done)
  const needsResponseGroup = tasks
    .filter((t) => !t.studentResponse && t.status !== TaskStatus.DONE)
    .sort(sortByNearestDueDate);

  // 2. In progress
  const inProgressGroup = tasks
    .filter(
      (t) =>
        t.status === TaskStatus.DOING &&
        Boolean(t.studentResponse)
    )
    .sort(sortByNearestDueDate);

  // 3. Up next (To do, accepted / reschedule requested)
  const upNextGroup = tasks
    .filter(
      (t) =>
        t.status === TaskStatus.TODO &&
        Boolean(t.studentResponse)
    )
    .sort(sortByNearestDueDate);

  // 4. Done last (visually dimmed)
  const doneGroup = tasks
    .filter((t) => t.status === TaskStatus.DONE)
    .sort(sortByNearestDueDate);

  // Tab-specific list
  let currentTabTasks: TaskWithDetails[] = [];
  if (activeTab === "TODO") {
    const pendingTodo = tasks
      .filter((t) => t.status === TaskStatus.TODO && !t.studentResponse)
      .sort(sortByNearestDueDate);
    const acceptedTodo = tasks
      .filter((t) => t.status === TaskStatus.TODO && Boolean(t.studentResponse))
      .sort(sortByNearestDueDate);
    currentTabTasks = [...pendingTodo, ...acceptedTodo];
  } else if (activeTab === "DOING") {
    currentTabTasks = tasks
      .filter((t) => t.status === TaskStatus.DOING)
      .sort(sortByNearestDueDate);
  } else if (activeTab === "DONE") {
    currentTabTasks = doneGroup;
  }

  return (
    <PageContainer>
      {/* HEADER */}
      <PageHeader
        title="My tasks"
        subtitle="Tasks from your client. Accept them, track your time, or ask to reschedule."
      />

      {/* TABS (Segmented style, matching Schedule tabs) */}
      <div className="w-full overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-1 shadow-[2px_2px_0px_0px_#0F172A] w-fit min-w-max">
          <button
            type="button"
            data-testid="task-tab"
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
            data-testid="task-tab"
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
            data-testid="task-tab"
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
            data-testid="task-tab"
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
          <EmptyState
            icon={CheckSquare}
            title="No tasks yet."
            description="When your client assigns one, it will show up here."
          />
        ) : (
          <div className="space-y-6">
            {/* Group 1: Needs your response */}
            {needsResponseGroup.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Needs your response
                  </h2>
                  <span className="rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                    {needsResponseGroup.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {needsResponseGroup.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      now={now}
                      onAccept={handleAccept}
                      isAccepting={isSubmittingAccept === task.id}
                      onOpenReschedule={openRescheduleModal}
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
                    <TaskCard
                      key={task.id}
                      task={task}
                      now={now}
                      onAccept={handleAccept}
                      isAccepting={isSubmittingAccept === task.id}
                      onOpenReschedule={openRescheduleModal}
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
                    <TaskCard
                      key={task.id}
                      task={task}
                      now={now}
                      onAccept={handleAccept}
                      isAccepting={isSubmittingAccept === task.id}
                      onOpenReschedule={openRescheduleModal}
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
                    <TaskCard
                      key={task.id}
                      task={task}
                      now={now}
                      onAccept={handleAccept}
                      isAccepting={isSubmittingAccept === task.id}
                      onOpenReschedule={openRescheduleModal}
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
                title="Nothing waiting for you."
                description="When your client assigns tasks to do, they will show up here."
              />
            ) : activeTab === "DOING" ? (
              <EmptyState
                icon={CheckSquare}
                title="No tasks in progress."
                description="Accept a task and press Time In to start."
              />
            ) : (
              <EmptyState
                icon={CheckSquare}
                title="Completed tasks will show up here."
                description="When you finish tasks, they will appear here."
              />
            )
          ) : (
            <div className="space-y-2.5">
              {currentTabTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  now={now}
                  onAccept={handleAccept}
                  isAccepting={isSubmittingAccept === task.id}
                  onOpenReschedule={openRescheduleModal}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {rescheduleModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => {
            if (!isSubmittingReschedule) {
              setRescheduleModal({ isOpen: false, taskId: null, taskTitle: "" });
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-5 shadow-[4px_4px_0px_0px_#0F172A] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#E5DFD5] pb-3">
              <div className="space-y-0.5">
                <h3
                  id="reschedule-dialog-title"
                  className="font-display text-lg font-bold text-[#0F172A]"
                >
                  Ask to reschedule
                </h3>
                <p className="text-xs text-slate-600 line-clamp-1">
                  {rescheduleModal.taskTitle}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                disabled={isSubmittingReschedule}
                onClick={() =>
                  setRescheduleModal({ isOpen: false, taskId: null, taskTitle: "" })
                }
                className="rounded-lg p-1 text-slate-500 hover:text-[#0F172A] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="reschedule-reason"
                  className="text-xs font-bold text-[#0F172A]"
                >
                  Reason for reschedule request
                </Label>
                <Input
                  id="reschedule-reason"
                  placeholder="e.g. Conflict with an unscheduled exam or family emergency..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  disabled={isSubmittingReschedule}
                  className="bg-white text-xs h-10 border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Your client will receive a notification with your proposed request.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5DFD5]">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setRescheduleModal({ isOpen: false, taskId: null, taskTitle: "" })
                  }
                  disabled={isSubmittingReschedule}
                  className="text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingReschedule || !rescheduleReason.trim()}
                  className="bg-[#0F172A] text-white font-bold border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 text-xs h-9 px-4 cursor-pointer"
                >
                  {isSubmittingReschedule ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    "Send request"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// TASK CARD COMPONENT
// ---------------------------------------------------------------------------

interface TaskCardProps {
  task: TaskWithDetails;
  now: Date;
  onAccept: (taskId: string) => Promise<void>;
  isAccepting: boolean;
  onOpenReschedule: (task: TaskWithDetails) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
}

function TaskCard({
  task,
  now,
  onAccept,
  isAccepting,
  onOpenReschedule,
  onStatusChange,
}: TaskCardProps) {
  const isDone = task.status === TaskStatus.DONE;
  const isPendingResponse = !task.studentResponse && !isDone;
  const isRescheduleRequested =
    task.studentResponse === StudentResponse.RESCHEDULE_REQUESTED && !isDone;
  const isAcceptedAndNotDone =
    task.studentResponse === StudentResponse.ACCEPTED && !isDone;

  const dueDate = parseSafeDate(task.dueAt);
  const isOverdue = !isDone && Boolean(dueDate && dueDate.getTime() < now.getTime());

  // Determine Left Edge Bar Color
  let leftBarClass = "bg-[#0F172A]"; // Neutral ink for to do
  if (isDone) {
    leftBarClass = "bg-[#16A34A]/50"; // Muted green for done
  } else if (isOverdue) {
    leftBarClass = "bg-[#DC2626]"; // Red if due date passed and not done
  } else if (isRescheduleRequested) {
    leftBarClass = "bg-[#D97706]"; // Amber if reschedule requested
  } else if (task.status === TaskStatus.DOING) {
    leftBarClass = "bg-[#16A34A]"; // Green for in progress (work)
  }

  // Format Due relative & absolute
  const dueDay = dueDate ? formatDate(dueDate, "yyyy-MM-dd") : "";
  const nowDay = formatDate(now, "yyyy-MM-dd");
  const isDueToday = !isDone && dueDay === nowDay;

  const absoluteDueText = dueDate
    ? formatDate(dueDate, "EEE, MMM d, h:mm a")
    : "—";

  // Relative prefix
  let relativeDueLabel = dueDate ? `Due ${formatRelative(dueDate, now)}` : "—";
  let dueTone: "normal" | "amber" | "red" = "normal";

  if (isOverdue) {
    relativeDueLabel = "Overdue";
    dueTone = "red";
  } else if (isDueToday) {
    relativeDueLabel = "Due today";
    dueTone = "amber";
  }

  // Progress Bar calculation
  const estHours = Math.max(0.1, task.estHours);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((task.loggedHours / estHours) * 100))
  );

  // Client Initials
  const clientInitials = getClientInitials(task.clientName);

  // Status transitions valid for current status
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
      tabIndex={0}
      data-testid="task-card"
      data-status={task.status}
      data-response={task.studentResponse ?? "PENDING"}
      className={cn(
        "group relative rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-3.5 sm:p-4 shadow-[3px_3px_0px_0px_#0F172A] overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#0F172A]",
        isDone && "opacity-70 hover:opacity-100"
      )}
    >
      {/* 4px Colored Left Edge Bar */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          leftBarClass
        )}
        aria-hidden="true"
      />

      <div className="pl-2">
        {/* DESKTOP LAYOUT (>= 640px) */}
        <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-4">
          {/* Main info block: Title, Description, Metadata */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Row 1: Title & ONE Status Badge */}
            <div className="flex items-center gap-2 min-w-0">
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

              {/* Exactly ONE Status Badge */}
              <div className="shrink-0">
                {isPendingResponse || isRescheduleRequested ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-bold transition-all",
                      TONE_STYLES[getResponseLabel(task.studentResponse, Role.STUDENT).tone]
                    )}
                  >
                    {getResponseLabel(task.studentResponse, Role.STUDENT).label}
                  </span>
                ) : (
                  <StatusBadge status={task.status} />
                )}
              </div>
            </div>

            {/* Row 2: Description (1 line) */}
            {task.description && (
              <p className="text-[13px] text-slate-600 truncate leading-tight">
                {task.description}
              </p>
            )}
            {task.hoursWarning && (
              <p className="text-[13px] font-semibold text-[#D97706] truncate leading-tight">
                Exceeds available hours
              </p>
            )}

            {/* Row 3: Metadata (Client, Due, Progress, Conflict) */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-600 pt-0.5">
              {/* Client Avatar + Name */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className="flex size-5 items-center justify-center rounded-full border border-[#0F172A] bg-[#FAF7F2] text-[10px] font-bold text-[#0F172A] shrink-0"
                  aria-hidden="true"
                >
                  {clientInitials}
                </div>
                <span className="font-medium text-slate-700 truncate max-w-[140px]">
                  {task.clientName || "Client"}
                </span>
              </div>

              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>

              {/* Due Date: Relative first, Absolute second */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Calendar className="size-3.5 text-slate-500 shrink-0" />
                <span
                  className={cn(
                    "font-semibold",
                    dueTone === "red" && "text-[#DC2626]",
                    dueTone === "amber" && "text-[#D97706]",
                    dueTone === "normal" && "text-slate-700"
                  )}
                >
                  {relativeDueLabel}
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">{absoluteDueText}</span>
              </div>

              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>

              {/* Progress Indicator */}
              <div className="flex items-center gap-2 shrink-0">
                {isDone ? (
                  <span className="font-semibold text-slate-700">
                    {`${formatHours(task.loggedHours)} logged`}
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-1.5 w-16 rounded-full bg-slate-200 border border-slate-300 overflow-hidden shrink-0"
                      role="progressbar"
                      aria-valuenow={task.loggedHours}
                      aria-valuemin={0}
                      aria-valuemax={task.estHours}
                    >
                      <div
                        className="h-full bg-[#16A34A] rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="font-medium text-slate-600">
                      {`${formatHours(task.loggedHours)} of ${formatHours(task.estHours)} logged`}
                    </span>
                  </div>
                )}
              </div>

              {/* Conflict chip if data loaded */}
              {((task as unknown as { hasConflict?: boolean; overlapsClass?: boolean })
                .hasConflict ||
                (task as unknown as { hasConflict?: boolean; overlapsClass?: boolean })
                  .overlapsClass) && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#D97706] bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-bold text-[#92400E] shadow-[1.5px_1.5px_0px_0px_#D97706]">
                  <AlertTriangle className="size-3" />
                  Overlaps a class
                </span>
              )}
            </div>
          </div>

          {/* Right Action Block (Desktop) */}
          <div className="flex items-center gap-2 shrink-0 self-center">
            {/* State 1: Pending response */}
            {isPendingResponse && (
              <>
                <Button
                  type="button"
                  data-testid="task-accept"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAccept(task.id);
                  }}
                  disabled={isAccepting}
                  className="bg-[#16A34A] text-white font-bold border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#15803D] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none min-h-[38px] px-3.5 text-xs rounded-lg cursor-pointer"
                >
                  {isAccepting ? (
                    <Loader2 className="size-3.5 animate-spin mr-1" />
                  ) : (
                    <Check className="size-3.5 mr-1" strokeWidth={3} />
                  )}
                  <span>Accept</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  data-testid="task-reschedule"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenReschedule(task);
                  }}
                  disabled={isAccepting}
                  className="text-slate-700 hover:text-[#0F172A] hover:bg-[#EFEAE2] font-semibold min-h-[38px] px-3 text-xs rounded-lg cursor-pointer"
                >
                  <RotateCcw className="size-3 mr-1" />
                  <span>Ask to reschedule</span>
                </Button>
              </>
            )}

            {/* State 2: Accepted and not done */}
            {isAcceptedAndNotDone && (
              <Link
                href={`/student/time?taskId=${task.id}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-block"
              >
                <Button
                  type="button"
                  data-testid="task-time-in"
                  className="bg-[#0F172A] text-white font-bold border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none min-h-[38px] px-3.5 text-xs rounded-lg cursor-pointer gap-1.5"
                >
                  <Play className="size-3.5 fill-[#16A34A] text-[#16A34A]" />
                  <span>Time In</span>
                </Button>
              </Link>
            )}

            {/* State 3: Reschedule requested */}
            {isRescheduleRequested && (
              <span className="text-xs text-slate-500 italic font-medium px-2">
                Waiting for your client to reply
              </span>
            )}

            {/* State 4: Done - No primary action */}

            {/* "⋯" Overflow Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid="task-menu"
                  aria-label={`More options for ${task.title}`}
                  onClick={(e) => e.stopPropagation()}
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
                {/* Ask to reschedule inside overflow menu for accepted tasks */}
                {isAcceptedAndNotDone && (
                  <>
                    <DropdownMenuItem
                      data-testid="task-reschedule"
                      onClick={() => onOpenReschedule(task)}
                      className="cursor-pointer"
                    >
                      <RotateCcw className="size-3.5 mr-2 text-slate-500" />
                      <span>Ask to reschedule</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* Status Transitions */}
                <DropdownMenuLabel>Change status</DropdownMenuLabel>
                {validStatusTransitions.map((st) => (
                  <DropdownMenuItem
                    key={st.status}
                    data-testid="task-status-option"
                    data-status={st.status}
                    onClick={() => onStatusChange(task.id, st.status)}
                    className="cursor-pointer"
                  >
                    <span>{st.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* MOBILE LAYOUT (< 640px) */}
        <div className="flex sm:hidden flex-col gap-2.5">
          {/* Top row: Title + Status Badge on left, "⋯" Menu on top right */}
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                {isDone && (
                  <div
                    className="flex size-4 items-center justify-center rounded-full bg-[#F0FDF4] border border-[#16A34A] text-[#166534] shrink-0"
                    aria-label="Completed"
                  >
                    <Check className="size-2.5" strokeWidth={3} />
                  </div>
                )}
                <h3 className="font-display text-base font-bold text-[#0F172A] truncate leading-tight">
                  {task.title}
                </h3>
                <div className="shrink-0">
                  {isPendingResponse || isRescheduleRequested ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-bold transition-all",
                        TONE_STYLES[getResponseLabel(task.studentResponse, Role.STUDENT).tone]
                      )}
                    >
                      {getResponseLabel(task.studentResponse, Role.STUDENT).label}
                    </span>
                  ) : (
                    <StatusBadge status={task.status} />
                  )}
                </div>
              </div>

              {/* Row 2: Description */}
              {task.description && (
                <p className="text-xs text-slate-600 truncate leading-tight">
                  {task.description}
                </p>
              )}
              {task.hoursWarning && (
                <p className="text-xs font-semibold text-[#D97706] truncate leading-tight">
                  Exceeds available hours
                </p>
              )}
            </div>

            {/* Overflow Menu "⋯" pinned at top-right */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid="task-menu"
                  aria-label={`More options for ${task.title}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex size-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-white text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] hover:bg-[#FAF7F2] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Ask to reschedule inside menu */}
                {(isAcceptedAndNotDone || isPendingResponse) && (
                  <>
                    <DropdownMenuItem
                      data-testid="task-reschedule"
                      onClick={() => onOpenReschedule(task)}
                      className="cursor-pointer"
                    >
                      <RotateCcw className="size-3.5 mr-2 text-slate-500" />
                      <span>Ask to reschedule</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* Status Transitions */}
                <DropdownMenuLabel>Change status</DropdownMenuLabel>
                {validStatusTransitions.map((st) => (
                  <DropdownMenuItem
                    key={st.status}
                    data-testid="task-status-option"
                    data-status={st.status}
                    onClick={() => onStatusChange(task.id, st.status)}
                    className="cursor-pointer"
                  >
                    <span>{st.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Row 3: Metadata wraps onto two lines */}
          <div className="space-y-1.5 text-xs text-slate-600 pt-0.5">
            {/* Metadata Line 1: Client and Due */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className="flex size-4.5 items-center justify-center rounded-full border border-[#0F172A] bg-[#FAF7F2] text-[9px] font-bold text-[#0F172A]"
                  aria-hidden="true"
                >
                  {clientInitials}
                </div>
                <span className="font-medium text-slate-700 truncate max-w-[120px]">
                  {task.clientName || "Client"}
                </span>
              </div>

              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>

              <div className="flex items-center gap-1 shrink-0">
                <Calendar className="size-3 text-slate-500 shrink-0" />
                <span
                  className={cn(
                    "font-semibold",
                    dueTone === "red" && "text-[#DC2626]",
                    dueTone === "amber" && "text-[#D97706]",
                    dueTone === "normal" && "text-slate-700"
                  )}
                >
                  {relativeDueLabel}
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">{absoluteDueText}</span>
              </div>
            </div>

            {/* Metadata Line 2: Progress Bar full width */}
            <div className="w-full">
              {isDone ? (
                <span className="font-semibold text-slate-700">
                  {`${formatHours(task.loggedHours)} logged`}
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 flex-1 rounded-full bg-slate-200 border border-slate-300 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={task.loggedHours}
                    aria-valuemin={0}
                    aria-valuemax={task.estHours}
                  >
                    <div
                      className="h-full bg-[#16A34A] rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="font-medium text-[11px] text-slate-600 shrink-0">
                    {`${formatHours(task.loggedHours)} of ${formatHours(task.estHours)}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Primary Action Button (Full width 44px on mobile) */}
          {isPendingResponse && (
            <div className="pt-1 flex flex-col gap-1.5 w-full">
              <Button
                type="button"
                data-testid="task-accept"
                onClick={(e) => {
                  e.stopPropagation();
                  onAccept(task.id);
                }}
                disabled={isAccepting}
                className="w-full min-h-[44px] h-11 bg-[#16A34A] text-white font-bold border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#15803D] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-xs rounded-lg cursor-pointer"
              >
                {isAccepting ? (
                  <Loader2 className="size-4 animate-spin mr-1" />
                ) : (
                  <Check className="size-4 mr-1" strokeWidth={3} />
                )}
                <span>Accept</span>
              </Button>
            </div>
          )}

          {isAcceptedAndNotDone && (
            <div className="pt-1 w-full">
              <Link
                href={`/student/time?taskId=${task.id}`}
                onClick={(e) => e.stopPropagation()}
                className="block w-full"
              >
                <Button
                  type="button"
                  data-testid="task-time-in"
                  className="w-full min-h-[44px] h-11 bg-[#0F172A] text-white font-bold border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-xs rounded-lg cursor-pointer gap-2"
                >
                  <Play className="size-4 fill-[#16A34A] text-[#16A34A]" />
                  <span>Time In</span>
                </Button>
              </Link>
            </div>
          )}

          {isRescheduleRequested && (
            <p className="text-center text-xs text-slate-500 italic font-medium py-1">
              Waiting for your client to reply
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------------------------

function getClientInitials(name?: string | null): string {
  if (!name || !name.trim()) return "CL";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
