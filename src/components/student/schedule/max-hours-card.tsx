"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updateMaxHoursAction } from "@/lib/actions/schedule";
import { ShieldCheck, Loader2, Check } from "lucide-react";

interface MaxHoursCardProps {
  initialMaxHours: number;
  onUpdated?: (hours: number) => void;
}

export function MaxHoursCard({ initialMaxHours, onUpdated }: MaxHoursCardProps) {
  const [maxHours, setMaxHours] = React.useState<number>(initialMaxHours);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showSaved, setShowSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const presets = [2, 3, 4, 5, 6];

  const handleSave = async (hoursToSave: number) => {
    setIsSaving(true);
    setError(null);
    setShowSaved(false);

    try {
      const res = await updateMaxHoursAction({ maxHoursPerDay: hoursToSave });
      if (res.success && res.data) {
        setMaxHours(res.data.maxHoursPerDay);
        setShowSaved(true);
        if (onUpdated) onUpdated(res.data.maxHoursPerDay);
        setTimeout(() => setShowSaved(false), 2000);
      } else {
        setError(res.error ?? "Failed to update max hours.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-[var(--color-text)]">
                Daily Capacity Limit (Burnout Protection)
              </CardTitle>
              <CardDescription className="text-xs text-[var(--color-muted)]">
                Clients receive a warning alert if tasks assigned on a given day exceed this limit.
              </CardDescription>
            </div>
          </div>
          {showSaved && (
            <span className="flex items-center gap-1 rounded bg-[var(--color-work-bg)] px-2 py-0.5 text-xs font-medium text-[var(--color-work)]">
              <Check className="size-3" />
              <span>Saved</span>
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="max-hours-input" className="text-xs text-[var(--color-muted)] font-medium">
              Max Hours / Day:
            </Label>
            <Input
              id="max-hours-input"
              type="number"
              step="0.5"
              min="0.5"
              max="16"
              value={maxHours}
              onChange={(e) => setMaxHours(parseFloat(e.target.value) || 0)}
              className="w-20 bg-[var(--color-bg)] text-xs h-8 text-center font-semibold"
              disabled={isSaving}
            />
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] text-[var(--color-muted)]">Presets:</span>
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setMaxHours(p);
                  handleSave(p);
                }}
                disabled={isSaving}
                className={`rounded border px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                  maxHours === p
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                    : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[var(--color-accent)]"
                }`}
              >
                {p}h
              </button>
            ))}
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSave(maxHours)}
            disabled={isSaving}
            className="ml-auto bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-xs cursor-pointer h-8"
          >
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Saving...</span>
              </span>
            ) : (
              "Save Limit"
            )}
          </Button>
        </div>

        {error && <p className="text-[11px] text-[var(--color-conflict)]">{error}</p>}
      </CardContent>
    </Card>
  );
}
