"use client";

import * as React from "react";
import { FormattedBlockedDate } from "@/lib/services/schedule-service";
import { addBlockedDateAction, deleteBlockedDateAction } from "@/lib/actions/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarOff, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";

interface BlockedDatesSectionProps {
  initialBlockedDates: FormattedBlockedDate[];
  onRefresh?: () => void;
}

export function BlockedDatesSection({
  initialBlockedDates,
  onRefresh,
}: BlockedDatesSectionProps) {
  const [blockedDates, setBlockedDates] = React.useState<FormattedBlockedDate[]>(initialBlockedDates);
  const [isAdding, setIsAdding] = React.useState(false);
  const [dateStart, setDateStart] = React.useState("");
  const [dateEnd, setDateEnd] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setBlockedDates(initialBlockedDates);
  }, [initialBlockedDates]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateStart || !dateEnd) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await addBlockedDateAction({
        dateStart: new Date(dateStart).toISOString(),
        dateEnd: new Date(dateEnd).toISOString(),
        reason: reason.trim() || undefined,
      });

      if (res.success) {
        setIsAdding(false);
        setDateStart("");
        setDateEnd("");
        setReason("");
        if (onRefresh) onRefresh();
      } else {
        setError(res.error ?? "Failed to add blocked date range.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this blocked date range?")) return;
    setDeletingId(id);
    try {
      const res = await deleteBlockedDateAction(id);
      if (res.success) {
        setBlockedDates((prev) => prev.filter((b) => b.id !== id));
        if (onRefresh) onRefresh();
      } else {
        alert(res.error ?? "Failed to delete blocked date.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting blocked date.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDateRange = (start: Date, end: Date) => {
    const s = new Date(start).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    });
    const e = new Date(end).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    });
    return s === e ? s : `${s} – ${e}`;
  };

  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-conflict-bg)] text-[var(--color-conflict)]">
              <CalendarOff className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-[var(--color-text)]">
                Blocked Dates (Exams, Events, Leave)
              </CardTitle>
              <CardDescription className="text-xs text-[var(--color-muted)]">
                Block specific calendar ranges when you are completely unavailable for VA work.
              </CardDescription>
            </div>
          </div>
          {!isAdding && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="gap-1 text-xs cursor-pointer h-8"
            >
              <Plus className="size-3" />
              <span>Block Date</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Add Form */}
        {isAdding && (
          <form
            onSubmit={handleAdd}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 space-y-3"
          >
            <div className="text-xs font-semibold text-[var(--color-text)]">
              Add Blocked Date Range
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded border border-[var(--color-conflict)] bg-[var(--color-conflict-bg)] p-2 text-xs text-[var(--color-conflict)]">
                <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="date-start" className="text-[11px] text-[var(--color-muted)] font-medium">
                  Start Date
                </Label>
                <Input
                  id="date-start"
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  disabled={isSubmitting}
                  className="bg-[var(--color-surface)] text-xs h-8"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="date-end" className="text-[11px] text-[var(--color-muted)] font-medium">
                  End Date
                </Label>
                <Input
                  id="date-end"
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  disabled={isSubmitting}
                  className="bg-[var(--color-surface)] text-xs h-8"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="date-reason" className="text-[11px] text-[var(--color-muted)] font-medium">
                Reason / Note (e.g. Midterm Exams, Thesis Defense)
              </Label>
              <Input
                id="date-reason"
                placeholder="Optional reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                className="bg-[var(--color-surface)] text-xs h-8"
                maxLength={200}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAdding(false)}
                disabled={isSubmitting}
                className="text-xs cursor-pointer h-7"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-xs cursor-pointer h-7"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3 animate-spin" />
                    <span>Saving...</span>
                  </span>
                ) : (
                  "Save Blocked Date"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* List of blocked dates */}
        {blockedDates.length === 0 ? (
          <p className="text-[11px] text-[var(--color-muted)] italic py-1">
            No blocked dates configured. You are accepting tasks according to your recurring availability windows.
          </p>
        ) : (
          <div className="space-y-1.5">
            {blockedDates.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-[var(--color-text)]">
                    {formatDateRange(b.dateStart, b.dateEnd)}
                  </div>
                  {b.reason && (
                    <div className="text-[11px] text-[var(--color-muted)]">
                      {b.reason}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  disabled={deletingId === b.id}
                  title="Remove blocked date"
                  className="rounded p-1 text-[var(--color-conflict)] hover:bg-[var(--color-surface)] cursor-pointer"
                >
                  {deletingId === b.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
