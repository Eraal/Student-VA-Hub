"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toUserErrorMessage } from "@/lib/errors";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function ClientTasksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Client tasks error:", error);
  }, [error]);

  return (
    <div className="w-full max-w-5xl mx-auto py-16 px-4 text-center space-y-5">
      <div className="flex size-14 mx-auto items-center justify-center rounded-2xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] text-[#DC2626] shadow-[3px_3px_0px_0px_#DC2626]">
        <AlertCircle className="size-7" />
      </div>

      <div className="space-y-2">
        <h2 className="font-display text-xl font-bold text-[#0F172A]">
          Unable to load tasks
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
          {toUserErrorMessage(error)}
        </p>
      </div>

      <div>
        <Button
          type="button"
          onClick={() => reset()}
          className="gap-2 text-xs font-bold bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
        >
          <RotateCcw className="size-4" />
          <span>Retry</span>
        </Button>
      </div>
    </div>
  );
}

