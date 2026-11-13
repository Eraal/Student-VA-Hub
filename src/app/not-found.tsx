import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center px-4 text-center">
      <div className="max-w-md space-y-4">
        <div className="flex size-14 mx-auto items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] shadow-xs">
          <FileQuestion className="size-7" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Error 404
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
            Page Not Found
          </h1>
          <p className="text-xs text-[var(--color-muted)] max-w-xs mx-auto">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs cursor-pointer">
              <ArrowLeft className="size-3.5" />
              <span>Back to Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

