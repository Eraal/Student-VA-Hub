"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatHours } from "@/lib/format";

interface ConflictBannerProps {
  isAtCapacity: boolean;
  hoursToday: number;
  maxHoursPerDay: number;
}

export function ConflictBanner({
  isAtCapacity,
  hoursToday,
  maxHoursPerDay,
}: ConflictBannerProps) {
  const [dismissed, setDismissed] = React.useState(false);

  if (!isAtCapacity || dismissed) {
    return null;
  }

  return (
    <div
      className="rounded-xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-4 text-[#991B1B] shadow-[2px_2px_0px_0px_#DC2626] transition-all"
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#DC2626] text-white shrink-0 mt-0.5">
            <AlertCircle className="size-4" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-sm text-[#991B1B]">
                Daily capacity reached ({formatHours(hoursToday)} / {formatHours(maxHoursPerDay)} max)
              </span>
              <span className="font-mono text-[10px] font-bold bg-[#DC2626] text-white px-2 py-0.5 rounded-full">
                Burnout cap reached
              </span>
            </div>
            <p className="text-xs text-red-900 leading-relaxed font-normal">
              Health protection: You have reached your daily limit for VA work today. Rest to prevent burnout and focus on your studies.
            </p>
            <div className="pt-2">
              <Link href="/student/schedule">
                <Button
                  size="xs"
                  variant="outline"
                  className="bg-white text-[#DC2626] border-[#DC2626] hover:bg-red-50 text-xs font-bold gap-1 shadow-none"
                >
                  <span>Adjust schedule</span>
                  <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-[#991B1B]/70 hover:text-[#991B1B] p-1 rounded-md hover:bg-red-100 transition-colors cursor-pointer"
          aria-label="Dismiss banner"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

