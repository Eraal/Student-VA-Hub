"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ClientRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Client portal error:", error);
  }, [error]);

  return (
    <div className="py-12 px-4 text-center space-y-4 max-w-md mx-auto">
      <div className="flex size-12 mx-auto items-center justify-center rounded-xl border border-[var(--color-conflict)]/40 bg-[var(--color-conflict-bg)] text-[var(--color-conflict)]">
        <AlertTriangle className="size-6" />
      </div>

      <div className="space-y-1">
        <h2 className="text-base font-semibold text-[var(--color-text)]">
          Hindi ma-load ang client page
        </h2>
        <p className="text-xs text-[var(--color-muted)]">
          {error.message || "Nagkaroon ng problema habang kinukuha ang iyong datos."}
        </p>
      </div>

      <div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => reset()}
          className="gap-1.5 text-xs cursor-pointer"
        >
          <RotateCcw className="size-3.5" />
          <span>Subukan muli</span>
        </Button>
      </div>
    </div>
  );
}
