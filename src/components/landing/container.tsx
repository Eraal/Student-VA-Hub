import * as React from "react";
import { cn } from "@/lib/utils";

export interface LandingContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function LandingContainer({
  children,
  className,
  ...props
}: LandingContainerProps) {
  return (
    <div
      className={cn("mx-auto max-w-6xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    >
      {children}
    </div>
  );
}

