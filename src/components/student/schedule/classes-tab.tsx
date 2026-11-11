"use client";

import * as React from "react";
import { FormattedClass } from "@/lib/services/schedule-service";
import { DAYS_ORDER_ACADEMIC } from "@/lib/schedule-utils";
import { deleteClassAction } from "@/lib/actions/schedule";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ClassFormDialog } from "./class-form-dialog";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Loader2,
  CalendarDays,
} from "lucide-react";

interface ClassesTabProps {
  initialClasses: FormattedClass[];
  onRefresh?: () => void;
}

export function ClassesTab({ initialClasses, onRefresh }: ClassesTabProps) {
  const [classes, setClasses] = React.useState<FormattedClass[]>(initialClasses);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingClass, setEditingClass] = React.useState<FormattedClass | null>(null);
  const [selectedDayForAdd, setSelectedDayForAdd] = React.useState<number>(1);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setClasses(initialClasses);
  }, [initialClasses]);

  const handleOpenAdd = (dayOfWeek = 1) => {
    setEditingClass(null);
    setSelectedDayForAdd(dayOfWeek);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (cls: FormattedClass) => {
    setEditingClass(cls);
    setIsDialogOpen(true);
  };

  const handleDelete = async (classId: string) => {
    if (!confirm("Are you sure you want to remove this class schedule item?")) {
      return;
    }
    setDeletingId(classId);
    try {
      const res = await deleteClassAction(classId);
      if (res.success) {
        setClasses((prev) => prev.filter((c) => c.id !== classId));
        if (onRefresh) onRefresh();
      } else {
        alert(res.error ?? "Failed to delete class.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting class.");
    } finally {
      setDeletingId(null);
    }
  };

  const totalClassesCount = classes.length;

  return (
    <div className="space-y-4">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text)]">
            Weekly Class Schedule
          </h2>
          <p className="text-[11px] text-[var(--color-muted)]">
            Blue blocks represent scheduled class hours. Clients cannot book tasks that overlap classes.
          </p>
        </div>
        <Button
          onClick={() => handleOpenAdd(1)}
          size="sm"
          className="gap-1.5 bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-xs cursor-pointer h-8"
        >
          <Plus className="size-3.5" />
          <span>Add Class</span>
        </Button>
      </div>

      {totalClassesCount === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No classes added yet"
          description="Enter your weekly class schedule here. The Conflict Detector uses this as the absolute source of truth to protect your study time."
          action={
            <Button
              onClick={() => handleOpenAdd(1)}
              size="sm"
              className="gap-1.5 bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-xs cursor-pointer h-8"
            >
              <Plus className="size-3.5" />
              <span>Add your first class</span>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {DAYS_ORDER_ACADEMIC.map((day) => {
            const dayClasses = classes.filter((c) => c.dayOfWeek === day.dayOfWeek);

            return (
              <div
                key={day.dayOfWeek}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2"
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--color-text)]">
                      {day.name}
                    </span>
                    <span className="rounded bg-[var(--color-bg)] border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)] font-medium">
                      {dayClasses.length} {dayClasses.length === 1 ? "class" : "classes"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenAdd(day.dayOfWeek)}
                    className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
                  >
                    <Plus className="size-3" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Day Classes */}
                {dayClasses.length === 0 ? (
                  <p className="text-[11px] text-[var(--color-muted)] italic py-1">
                    No classes scheduled for {day.name}.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {dayClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex items-center justify-between rounded-md border border-blue-200 bg-[var(--color-class-bg)] p-2.5 text-xs text-[var(--color-class)]"
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="size-3.5 shrink-0" />
                            <span className="font-semibold truncate text-[var(--color-text)]">
                              {cls.subject}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-[var(--color-class)] font-medium">
                            <Clock className="size-3 shrink-0" />
                            <span>
                              {cls.startTime} – {cls.endTime} ({cls.duration})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cls)}
                            title="Edit class"
                            className="rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/60 transition-colors cursor-pointer"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cls.id)}
                            disabled={deletingId === cls.id}
                            title="Delete class"
                            className="rounded p-1 text-[var(--color-conflict)] hover:bg-white/60 transition-colors cursor-pointer"
                          >
                            {deletingId === cls.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <ClassFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
        initialClass={editingClass}
        defaultDayOfWeek={selectedDayForAdd}
      />
    </div>
  );
}
