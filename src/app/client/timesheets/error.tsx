"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toUserErrorMessage } from "@/lib/errors";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ClientTimesheetsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Client timesheets error:", error);
  }, [error]);

  return (
    <div className="py-12 px-4 text-center space-y-4 max-w-md mx-auto">
      <div className="flex size-12 mx-auto items-center justify-center rounded-2xl border-[1.5px] border-[#DC2626] bg-[#FEF2F2] text-[#991B1B] shadow-[2px_2px_0px_0px_#DC2626]">
        <AlertTriangle className="size-6" />
      </div>

      <div className="space-y-1">
        <h2 className="font-display text-base font-bold text-[#0F172A]">
          Unable to load timesheets
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          {toUserErrorMessage(error)}
        </p>
      </div>

      <div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => reset()}
          className="gap-1.5 text-xs font-bold border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] cursor-pointer"
        >
          <RotateCcw className="size-3.5" />
          <span>Try again</span>
        </Button>
      </div>
    </div>
  );
}

