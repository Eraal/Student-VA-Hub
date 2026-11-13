"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { updateMaxHoursAction } from "@/lib/actions/schedule";
import { toast } from "@/components/ui/toast";
import { toUserErrorMessage } from "@/lib/errors";
import { Minus, Plus, Loader2, ShieldCheck, AlertCircle } from "lucide-react";

interface MaxHoursCardProps {
  initialMaxHours: number;
  onUpdated?: (hours: number) => void;
}

export function MaxHoursCard({ initialMaxHours, onUpdated }: MaxHoursCardProps) {
  const [savedHours, setSavedHours] = React.useState<number>(initialMaxHours);
  const [currentHours, setCurrentHours] = React.useState<number>(initialMaxHours);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSavedHours(initialMaxHours);
    setCurrentHours(initialMaxHours);
  }, [initialMaxHours]);

  const hasUnsavedChanges = currentHours !== savedHours;
  const presets = [2, 3, 4, 5, 6];

  const handleStep = (delta: number) => {
    setCurrentHours((prev) => Math.min(12, Math.max(1, prev + delta)));
  };

  const handleSave = async () => {
    if (!hasUnsavedChanges) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await updateMaxHoursAction({ maxHoursPerDay: currentHours });
      if (res.success && res.data) {
        setSavedHours(res.data.maxHoursPerDay);
        toast.success("Daily limit saved");
        onUpdated?.(res.data.maxHoursPerDay);
      } else {
        setError(toUserErrorMessage(res.error ?? "Failed to save daily limit."));
      }
    } catch (err) {
      console.error(err);
      setError(toUserErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border-[1.5px] border-[#0F172A] bg-white p-5 sm:p-6 shadow-[3px_3px_0px_0px_#0F172A] space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Title, Helper text, and Unsaved indicator */}
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]">
              <ShieldCheck className="size-3.5" />
            </div>
            <h3 className="font-display text-base font-bold text-[#0F172A]">
              Daily hour limit
            </h3>
            {hasUnsavedChanges && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFFBEB] border border-[#D97706] text-[#92400E] px-2 py-0.5 text-[10px] font-bold shadow-[1px_1px_0px_0px_#D97706]">
                Unsaved changes
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed pl-9 lg:pl-0">
            If tasks add up to more than this in one day, the client sees a warning and you decide whether to accept.
          </p>
        </div>

        {/* Right: Stepper + Presets + Save Button */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 pl-9 lg:pl-0">
          {/* Stepper control (>= 44px tall on mobile) */}
          <div
            data-testid="availability-limit-stepper"
            className="flex items-center rounded-xl border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-1 shadow-[2px_2px_0px_0px_#0F172A]"
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Decrease hour limit"
              disabled={currentHours <= 1 || isSaving}
              onClick={() => handleStep(-1)}
              className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-lg border-[1.5px] border-[#0F172A] bg-white text-[#0F172A] shadow-[1px_1px_0px_0px_#0F172A] hover:bg-[#FAF7F2] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-40 cursor-pointer"
            >
              <Minus className="size-4" />
            </Button>

            <span
              aria-live="polite"
              className="min-w-[48px] sm:min-w-[44px] text-center font-display text-lg sm:text-xl font-black text-[#0F172A] select-none px-2"
            >
              {currentHours}h
            </span>

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Increase hour limit"
              disabled={currentHours >= 12 || isSaving}
              onClick={() => handleStep(1)}
              className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-lg border-[1.5px] border-[#0F172A] bg-white text-[#0F172A] shadow-[1px_1px_0px_0px_#0F172A] hover:bg-[#FAF7F2] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-40 cursor-pointer"
            >
              <Plus className="size-4" />
            </Button>
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5">
            {presets.map((p) => {
              const isSelected = currentHours === p;
              return (
                <button
                  key={p}
                  type="button"
                  data-testid="availability-limit-preset"
                  data-hours={p}
                  onClick={() => setCurrentHours(p)}
                  disabled={isSaving}
                  className={`min-h-[36px] px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[1.5px_1.5px_0px_0px_#0F172A]"
                      : "bg-white text-slate-700 border-[1.5px] border-[#0F172A]/30 hover:border-[#0F172A] hover:bg-[#FAF7F2]"
                  }`}
                >
                  {p}h
                </button>
              );
            })}
          </div>

          {/* Save Button */}
          <Button
            type="button"
            data-testid="availability-limit-save"
            disabled={!hasUnsavedChanges || isSaving}
            onClick={handleSave}
            className="bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed font-bold min-h-[40px] px-4 rounded-lg text-xs cursor-pointer gap-1.5"
          >
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Saving...</span>
              </span>
            ) : (
              "Save limit"
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
