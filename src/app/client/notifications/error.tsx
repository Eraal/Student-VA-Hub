"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toUserErrorMessage } from "@/lib/errors";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function ClientNotificationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Client notifications error:", error);
  }, [error]);

  return (
    <div className="w-full max-w-4xl py-12 px-2 text-left space-y-4">
      <div className="rounded-2xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] p-6 shadow-[3px_3px_0px_0px_#DC2626] space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-[#DC2626] bg-white text-[#DC2626] shadow-[2px_2px_0px_0px_#DC2626]">
            <AlertCircle className="size-5" />
          </div>
          <div className="space-y-0.5">
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              Unable to load notifications
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {toUserErrorMessage(error)}
            </p>
          </div>
        </div>

        <div>
          <Button
            type="button"
            onClick={() => reset()}
            className="gap-2 text-xs font-bold bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

