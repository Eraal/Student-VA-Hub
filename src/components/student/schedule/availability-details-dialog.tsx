"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FormattedAvailability } from "@/lib/services/schedule-service";
import { getDayName } from "@/lib/schedule-utils";
import { formatHours } from "@/lib/format";
import { X, Briefcase, Clock, Calendar, Pencil, Trash2 } from "lucide-react";

interface AvailabilityDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  windowItem: FormattedAvailability | null;
  onEdit: (windowItem: FormattedAvailability) => void;
  onDelete: (windowItem: FormattedAvailability) => void;
}

export function AvailabilityDetailsDialog({
  isOpen,
  onClose,
  windowItem,
  onEdit,
  onDelete,
}: AvailabilityDetailsDialogProps) {
  if (!isOpen || !windowItem) return null;

  const durationStr = formatHours(
    (windowItem.endMinutes - windowItem.startMinutes) / 60
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-sm rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-6 shadow-[4px_4px_0px_0px_#0F172A] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5DFD5]">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#F0FDF4] text-[#16A34A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
              <Briefcase className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-[#0F172A]">
                Free Window Details
              </h2>
              <p className="text-xs text-slate-500">
                VA working hours
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex size-8 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] hover:bg-white active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Calendar className="size-3" />
                Day
              </span>
              <p className="text-xs font-bold text-[#0F172A]">
                {getDayName(windowItem.dayOfWeek)}
              </p>
            </div>

            <div className="rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-2.5 space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Clock className="size-3" />
                Duration
              </span>
              <p className="text-xs font-bold text-[#0F172A]">{durationStr}</p>
            </div>
          </div>

          <div className="rounded-xl border-[1.5px] border-[#0F172A] border-l-4 border-l-[#16A34A] bg-[#F0FDF4] p-3 text-xs text-[#166534]">
            <p className="font-bold">
              {windowItem.startTime} – {windowItem.endTime}
            </p>
            <p className="text-[11px] text-green-800 mt-0.5">
              Clients can assign tasks during this time without triggering an outside-hours warning.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E5DFD5]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="availability-window-delete"
            aria-label="Delete free window"
            onClick={() => {
              onClose();
              onDelete(windowItem);
            }}
            className="border-[1.5px] border-[#0F172A] bg-white text-slate-500 hover:text-[#DC2626] hover:border-[#DC2626] shadow-[1.5px_1.5px_0px_0px_#0F172A] font-bold min-h-[40px] px-3.5 gap-1.5 cursor-pointer text-xs"
          >
            <Trash2 className="size-4" />
            <span>Delete</span>
          </Button>

          <Button
            type="button"
            size="sm"
            data-testid="availability-window-edit"
            aria-label="Edit free window"
            onClick={() => {
              onClose();
              onEdit(windowItem);
            }}
            className="bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 font-bold min-h-[40px] px-4 gap-1.5 cursor-pointer text-xs"
          >
            <Pencil className="size-4" />
            <span>Edit</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

