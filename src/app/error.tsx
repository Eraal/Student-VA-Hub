"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toUserErrorMessage } from "@/lib/errors";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Unhandled error caught in root boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center px-4 text-center">
      <div className="max-w-md space-y-4">
        <div className="flex size-14 mx-auto items-center justify-center rounded-xl border border-[var(--color-conflict)]/40 bg-[var(--color-conflict-bg)] text-[var(--color-conflict)] shadow-xs">
          <AlertTriangle className="size-7" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-mono font-semibold tracking-wider text-[var(--color-conflict)]">
            Application error
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Something went wrong
          </h1>
          <p className="text-xs text-[var(--color-muted)] max-w-sm mx-auto">
            {toUserErrorMessage(error)}
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-2">
          <Button
            size="sm"
            onClick={() => reset()}
            className="gap-1.5 text-xs cursor-pointer bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
          >
            <RotateCcw className="size-3.5" />
            <span>Try again</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

