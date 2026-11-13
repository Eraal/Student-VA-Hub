import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Universal outer container for portal pages.
 * Stretches to the full max-w-7xl width and padding provided by the app shell layout,
 * ensuring identical left/right edges on every page with no per-page max-w overrides.
 */
export function PageContainer({
  children,
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      data-testid="page-container"
      className={cn("w-full space-y-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}

