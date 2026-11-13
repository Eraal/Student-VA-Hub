"use client";

import * as React from "react";
import { FormattedBlockedDate } from "@/lib/services/schedule-service";
import {
  addBlockedDateAction,
  deleteBlockedDateAction,
} from "@/lib/actions/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { toUserErrorMessage } from "@/lib/errors";
import { formatDateRange } from "@/lib/format";
import {
  CalendarOff,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  AlertTriangle,
  X,
} from "lucide-react";

interface BlockedDatesSectionProps {
  initialBlockedDates: FormattedBlockedDate[];
  onRefresh?: () => void;
}

export function BlockedDatesSection({
  initialBlockedDates,
  onRefresh,
}: BlockedDatesSectionProps) {
  const [blockedDates, setBlockedDates] =
    React.useState<FormattedBlockedDate[]>(initialBlockedDates);
  const [isAdding, setIsAdding] = React.useState(false);
  const [dateStart, setDateStart] = React.useState("");
  const [dateEnd, setDateEnd] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [itemToDelete, setItemToDelete] =
    React.useState<FormattedBlockedDate | null>(null);
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
        toast.success("Unavailable dates added.");
        onRefresh?.();
      } else {
        setError(
          toUserErrorMessage(res.error ?? "Failed to add blocked date range.")
        );
      }
    } catch (err) {
      console.error(err);
      setError(toUserErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const target = itemToDelete;
    setDeletingId(target.id);

    try {
      const res = await deleteBlockedDateAction(target.id);
      if (res.success) {
        setBlockedDates((prev) => prev.filter((b) => b.id !== target.id));
        setItemToDelete(null);
        toast.success("Unavailable date removed.", {
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                const addRes = await addBlockedDateAction({
                  dateStart: new Date(target.dateStart).toISOString(),
                  dateEnd: new Date(target.dateEnd).toISOString(),
                  reason: target.reason ?? undefined,
                });
                if (addRes.success) {
                  toast.success("Unavailable date restored.");
                  onRefresh?.();
                }
              } catch (err) {
                toast.error(toUserErrorMessage(err));
              }
            },
          },
        });
        onRefresh?.();
      } else {
        toast.error(
          toUserErrorMessage(res.error ?? "Failed to delete blocked date.")
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(toUserErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-5 sm:p-6 shadow-[3px_3px_0px_0px_#0F172A] space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5DFD5]">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
            <CalendarOff className="size-4" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-[#0F172A]">
              Unavailable dates
            </h3>
            <p className="text-xs text-slate-500">
              Block days you can&apos;t work, like exams or events.
            </p>
          </div>
        </div>

        {!isAdding && (
          <Button
            type="button"
            data-testid="blocked-date-add"
            onClick={() => setIsAdding(true)}
            className="self-start sm:self-auto bg-[#0F172A] text-white font-bold border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 text-xs min-h-[40px] px-3.5 gap-1.5 cursor-pointer rounded-lg"
          >
            <Plus className="size-4" />
            <span>Add unavailable dates</span>
          </Button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-4 space-y-3 shadow-[2px_2px_0px_0px_#0F172A]"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#E5DFD5]">
            <span className="font-display text-xs font-bold text-[#0F172A]">
              Add Unavailable Dates
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-[#0F172A] cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-2.5 text-xs text-[#991B1B]">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="date-start"
                className="text-xs font-bold text-[#0F172A]"
              >
                Start Date
              </Label>
              <Input
                id="date-start"
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                disabled={isSubmitting}
                className="bg-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] rounded-lg h-10 px-3 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="date-end"
                className="text-xs font-bold text-[#0F172A]"
              >
                End Date
              </Label>
              <Input
                id="date-end"
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                disabled={isSubmitting}
                className="bg-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] rounded-lg h-10 px-3 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="date-reason"
              className="text-xs font-bold text-[#0F172A]"
            >
              Reason (Optional)
            </Label>
            <Input
              id="date-reason"
              placeholder="e.g. Midterm Exams, Thesis Defense, Family Event"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              className="bg-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] rounded-lg h-10 px-3 text-sm"
              maxLength={200}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5DFD5]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(false)}
              disabled={isSubmitting}
              className="border-[1.5px] border-[#0F172A] bg-white text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#FAF7F2] font-bold min-h-[36px] px-3.5 rounded-lg text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 font-bold min-h-[36px] px-4 rounded-lg text-xs cursor-pointer"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : (
                "Save dates"
              )}
            </Button>
          </div>
        </form>
      )}

      {/* List of blocked dates or Empty State */}
      {blockedDates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E5DFD5] bg-[#FAF7F2]/60 p-6 text-center space-y-3">
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            No unavailable dates. Block days you can&apos;t work, like exams or
            events.
          </p>
          {!isAdding && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="blocked-date-add"
              onClick={() => setIsAdding(true)}
              className="border-[1.5px] border-[#0F172A] bg-white text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] font-bold text-xs gap-1.5 cursor-pointer rounded-lg"
            >
              <Plus className="size-3.5" />
              <span>Add unavailable dates</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {blockedDates.map((b) => (
            <div
              key={b.id}
              data-testid="blocked-date-row"
              className="flex items-center justify-between p-3.5 rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] shadow-[1.5px_1.5px_0px_0px_#0F172A]"
            >
              <div className="min-w-0 flex-1 pr-3">
                <span className="font-bold text-sm text-[#0F172A] block leading-snug">
                  {formatDateRange(b.dateStart, b.dateEnd)}
                </span>
                {b.reason && (
                  <p className="text-xs text-slate-600 mt-0.5 truncate">
                    {b.reason}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setItemToDelete(b)}
                aria-label={`Remove unavailable range: ${formatDateRange(b.dateStart, b.dateEnd)}`}
                className="size-10 rounded-lg border-[1.5px] border-[#0F172A] bg-white text-slate-400 hover:text-[#DC2626] hover:border-[#DC2626] shadow-[1.5px_1.5px_0px_0px_#0F172A] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center cursor-pointer shrink-0"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm dialog for blocked dates */}
      {itemToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-6 shadow-[4px_4px_0px_0px_#0F172A] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DFD5]">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg border-[1.5px] border-[#DC2626] bg-[#FEF2F2] text-[#DC2626] shadow-[1.5px_1.5px_0px_0px_#DC2626]">
                  <AlertTriangle className="size-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-[#0F172A]">
                    Remove Unavailable Dates
                  </h2>
                  <p className="text-xs text-slate-500">Confirm removal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex size-8 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] hover:bg-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove the unavailable dates from{" "}
              <strong className="text-[#0F172A]">
                {formatDateRange(itemToDelete.dateStart, itemToDelete.dateEnd)}
              </strong>
              ?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5DFD5]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItemToDelete(null)}
                disabled={deletingId === itemToDelete.id}
                className="border-[1.5px] border-[#0F172A] bg-white text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] font-bold min-h-[40px] px-4 rounded-lg cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={deletingId === itemToDelete.id}
                onClick={handleConfirmDelete}
                className="bg-[#DC2626] text-white border-[1.5px] border-[#DC2626] shadow-[2px_2px_0px_0px_#DC2626] hover:bg-red-700 font-bold min-h-[40px] px-4 rounded-lg cursor-pointer text-xs gap-1.5"
              >
                {deletingId === itemToDelete.id ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Removing...</span>
                  </span>
                ) : (
                  "Remove dates"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
