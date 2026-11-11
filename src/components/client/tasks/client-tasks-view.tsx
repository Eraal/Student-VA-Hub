"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TaskWithDetails } from "@/lib/services/task-service";
import { updateTaskStatusAction } from "@/lib/actions/task";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AssignTaskDialog } from "./assign-task-dialog";
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  User,
} from "lucide-react";
import { TaskStatus } from "@prisma/client";

interface ClientTasksViewProps {
  initialTasks: TaskWithDetails[];
  linkedStudent: { id: string; name: string } | null;
}

export function ClientTasksView({ initialTasks, linkedStudent }: ClientTasksViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = React.useState<TaskWithDetails[]>(initialTasks);
  const [activeFilter, setActiveFilter] = React.useState<"ALL" | TaskStatus>("ALL");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [updatingTaskId, setUpdatingTaskId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === "ALL") return true;
    return t.status === activeFilter;
  });

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Tasks & Assignments
          </h1>
          <p className="text-xs text-[var(--color-muted)]">
            {linkedStudent
              ? `Manage tasks assigned to ${linkedStudent.name}.`
              : "Link a student VA to begin assigning tasks."}
          </p>
        </div>

        <Button
          onClick={() => setIsAssignDialogOpen(true)}
          disabled={!linkedStudent}
          size="sm"
          className="gap-1.5 bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-xs cursor-pointer h-8"
        >
          <Plus className="size-3.5" />
          <span>Assign Task</span>
        </Button>
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
          description={
            linkedStudent
              ? "Click 'Assign Task' above to send a task. The live conflict detector will verify your student's class schedule automatically."
              : "You must link a student VA with an invite code before assigning tasks."
          }
          action={
            linkedStudent ? (
              <Button
                onClick={() => setIsAssignDialogOpen(true)}
                size="sm"
                className="gap-1.5 bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-xs cursor-pointer h-8"
              >
                <Plus className="size-3.5" />
                <span>Assign your first task</span>
              </Button>
            ) : undefined
          }
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

              {/* Student Response Banner */}
              {t.studentResponse === "RESCHEDULE_REQUESTED" && (
                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                  <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Reschedule requested:</span>{" "}
                    {t.rescheduleReason || "Student requested a different schedule."}
                  </div>
                </div>
              )}
              {t.studentResponse === "ACCEPTED" && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-work)]">
                  <CheckCircle2 className="size-3.5" />
                  <span className="font-medium">Accepted by student</span>
                </div>
              )}

              {/* Meta details footer */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-[var(--color-border)] text-[11px] text-[var(--color-muted)]">
                <span className="flex items-center gap-1">
                  <User className="size-3" />
                  <span>Assigned to: {t.studentName}</span>
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

      {/* Assign Task Modal */}
      <AssignTaskDialog
        isOpen={isAssignDialogOpen}
        onClose={() => setIsAssignDialogOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
        linkedStudentName={linkedStudent?.name}
      />
    </div>
  );
}
