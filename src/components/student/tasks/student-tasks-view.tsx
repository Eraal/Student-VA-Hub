"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TaskWithDetails } from "@/lib/services/task-service";
import { updateTaskStatusAction, respondToTaskAction } from "@/lib/actions/task";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CheckSquare,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  User,
  Play,
  RotateCcw,
  Check,
} from "lucide-react";
import { TaskStatus, StudentResponse } from "@prisma/client";

interface StudentTasksViewProps {
  initialTasks: TaskWithDetails[];
}

export function StudentTasksView({ initialTasks }: StudentTasksViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = React.useState<TaskWithDetails[]>(initialTasks);
  const [activeFilter, setActiveFilter] = React.useState<"ALL" | TaskStatus>("ALL");
  const [rescheduleTaskId, setRescheduleTaskId] = React.useState<string | null>(null);
  const [rescheduleReason, setRescheduleReason] = React.useState("");
  const [isSubmittingResponse, setIsSubmittingResponse] = React.useState(false);
  const [updatingTaskId, setUpdatingTaskId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === "ALL") return true;
    return t.status === activeFilter;
  });

  const handleResponse = async (
    taskId: string,
    response: StudentResponse,
    reason?: string
  ) => {
    setIsSubmittingResponse(true);
    try {
      const res = await respondToTaskAction({
        taskId,
        response,
        rescheduleReason: reason,
      });

      if (res.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  studentResponse: response,
                  rescheduleReason: reason ?? null,
                }
              : t
          )
        );
        setRescheduleTaskId(null);
        setRescheduleReason("");
        router.refresh();
      } else {
        alert(res.error ?? "Failed to respond to task.");
      }
    } catch (err) {
      console.error(err);
      alert("Error responding to task.");
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setUpdatingTaskId(taskId);
    try {
      const res = await updateTaskStatusAction({ taskId, status: newStatus });
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
        router.refresh();
      } else {
        alert(res.error ?? "Failed to update task status.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating status.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const formatManilaDateTime = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
          My VA Tasks
        </h1>
        <p className="text-xs text-[var(--color-muted)]">
          Tasks assigned by your client. Accept tasks, track time, or request schedule changes.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4 text-xs font-semibold">
          {(["ALL", "TODO", "DOING", "DONE"] as const).map((filter) => {
            const count =
              filter === "ALL"
                ? tasks.length
                : tasks.filter((t) => t.status === filter).length;

            const labelMap: Record<string, string> = {
              ALL: "All Tasks",
              TODO: "To Do",
              DOING: "In Progress",
              DONE: "Completed",
            };

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`flex items-center gap-1.5 pb-2.5 transition-colors cursor-pointer border-b-2 -mb-px ${
                  activeFilter === filter
                    ? "border-[var(--color-accent)] text-[var(--color-text)]"
                    : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                <span>{labelMap[filter]}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    activeFilter === filter
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                      : "bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={
            activeFilter === "ALL"
              ? "No tasks assigned yet"
              : `No tasks in "${activeFilter}"`
          }
          description="When your client assigns you work, it will appear here. The system ensures tasks are only assigned when you are not in class."
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((t) => (
            <div
              key={t.id}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--color-text)]">
                      {t.title}
                    </h3>
                    {t.status === "TODO" && (
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        To Do
                      </Badge>
                    )}
                    {t.status === "DOING" && (
                      <span className="rounded bg-[var(--color-class-bg)] text-[var(--color-class)] px-1.5 py-0.5 text-[10px] font-semibold border border-blue-200">
                        In Progress
                      </span>
                    )}
                    {t.status === "DONE" && (
                      <span className="rounded bg-[var(--color-work-bg)] text-[var(--color-work)] px-1.5 py-0.5 text-[10px] font-semibold border border-green-200">
                        Completed
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-[var(--color-muted)] line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>

                {/* Status action toggle */}
                <div className="flex items-center gap-2 self-start shrink-0">
                  <select
                    value={t.status}
                    onChange={(e) => handleStatusChange(t.id, e.target.value as TaskStatus)}
                    disabled={updatingTaskId === t.id}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs text-[var(--color-text)] outline-none"
                  >
                    <option value="TODO">To Do</option>
                    <option value="DOING">In Progress</option>
                    <option value="DONE">Completed</option>
                  </select>
                  {updatingTaskId === t.id && <Loader2 className="size-3.5 animate-spin" />}
                </div>
              </div>

              {/* Acceptance / Reschedule response bar */}
              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[var(--color-muted)] font-medium">
                      Status:
                    </span>
                    {t.studentResponse === "ACCEPTED" ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[var(--color-work)]">
                        <CheckCircle2 className="size-3.5" />
                        <span>Accepted</span>
                      </span>
                    ) : t.studentResponse === "RESCHEDULE_REQUESTED" ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                        <AlertTriangle className="size-3.5" />
                        <span>Reschedule Requested</span>
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)] italic">
                        Pending your response
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {t.studentResponse !== "ACCEPTED" && (
                      <Button
                        type="button"
                        size="xs"
                        onClick={() => handleResponse(t.id, StudentResponse.ACCEPTED)}
                        disabled={isSubmittingResponse}
                        className="gap-1 bg-[var(--color-work)] text-white hover:bg-[var(--color-work)]/90 text-xs h-7 cursor-pointer"
                      >
                        <Check className="size-3" />
                        <span>Accept</span>
                      </Button>
                    )}

                    {t.studentResponse !== "RESCHEDULE_REQUESTED" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setRescheduleTaskId(t.id);
                          setRescheduleReason("");
                        }}
                        disabled={isSubmittingResponse}
                        className="gap-1 text-xs h-7 cursor-pointer"
                      >
                        <RotateCcw className="size-3" />
                        <span>Ask to Reschedule</span>
                      </Button>
                    )}

                    {/* Quick Link to Timer */}
                    <Link href={`/student/time?taskId=${t.id}`}>
                      <Button
                        variant="outline"
                        size="xs"
                        className="gap-1 text-xs h-7 cursor-pointer"
                      >
                        <Play className="size-3 text-[var(--color-work)]" />
                        <span>Time In</span>
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Inline Reschedule Reason prompt */}
                {rescheduleTaskId === t.id && (
                  <div className="pt-2 border-t border-[var(--color-border)] space-y-2">
                    <Label htmlFor="reschedule-input" className="text-[11px] text-[var(--color-muted)] font-medium">
                      Reason for Reschedule Request:
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="reschedule-input"
                        placeholder="e.g. Conflict with an unscheduled exam or family emergency..."
                        value={rescheduleReason}
                        onChange={(e) => setRescheduleReason(e.target.value)}
                        className="bg-[var(--color-surface)] text-xs h-8"
                      />
                      <Button
                        type="button"
                        size="xs"
                        disabled={isSubmittingResponse || !rescheduleReason.trim()}
                        onClick={() =>
                          handleResponse(
                            t.id,
                            StudentResponse.RESCHEDULE_REQUESTED,
                            rescheduleReason
                          )
                        }
                        className="bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-xs h-8 cursor-pointer shrink-0"
                      >
                        {isSubmittingResponse ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          "Send Request"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setRescheduleTaskId(null)}
                        className="text-xs h-8 cursor-pointer"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Meta details footer */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-[var(--color-muted)]">
                <span className="flex items-center gap-1">
                  <User className="size-3" />
                  <span>Client: {t.clientName}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  <span>Due: {formatManilaDateTime(t.dueAt)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  <span>Est: {t.estHours}h (Logged: {t.loggedHours}h)</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
