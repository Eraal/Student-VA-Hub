"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FormattedAvailability } from "@/lib/services/schedule-service";
import { getDayName } from "@/lib/schedule-utils";
import { X, AlertTriangle, Loader2 } from "lucide-react";

interface DeleteAvailabilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  windowItem: FormattedAvailability | null;
  isDeleting: boolean;
}

export function DeleteAvailabilityDialog({
  isOpen,
  onClose,
  onConfirm,
  windowItem,
  isDeleting,
}: DeleteAvailabilityDialogProps) {
  if (!isOpen || !windowItem) return null;

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
            <div className="flex size-9 items-center justify-center rounded-lg border-[1.5px] border-[#DC2626] bg-[#FEF2F2] text-[#DC2626] shadow-[1.5px_1.5px_0px_0px_#DC2626]">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-[#0F172A]">
                Delete Free Window
              </h2>
              <p className="text-xs text-slate-500">
                Confirm removal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close dialog"
            className="flex size-8 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A] hover:bg-white active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Message */}
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            Are you sure you want to remove the availability window on{" "}
            <strong className="text-[#0F172A]">
              {getDayName(windowItem.dayOfWeek)}
            </strong>{" "}
            ({windowItem.startTime} – {windowItem.endTime})?
          </p>
          <p className="text-[11px] text-slate-500">
            Tasks assigned outside of your remaining availability windows will show a warning to clients.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5DFD5]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
            className="border-[1.5px] border-[#0F172A] bg-white text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#FAF7F2] font-bold min-h-[40px] px-4 rounded-lg cursor-pointer text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            data-testid="availability-delete-confirm"
            disabled={isDeleting}
            onClick={onConfirm}
            className="bg-[#DC2626] text-white border-[1.5px] border-[#DC2626] shadow-[2px_2px_0px_0px_#DC2626] hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none font-bold min-h-[40px] px-4 rounded-lg cursor-pointer text-xs gap-1.5"
          >
            {isDeleting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Deleting...</span>
              </span>
            ) : (
              "Delete window"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

