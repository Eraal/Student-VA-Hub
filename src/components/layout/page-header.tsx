import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  srOnlyTitle?: boolean;
  className?: string;
  titleClassName?: string;
}

/**
 * Universal header component for all portal pages.
 * Consistent typography, responsive wrapping on mobile with full-width actions,
 * right-aligned desktop actions, and 24px bottom spacing.
 */
export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  srOnlyTitle = false,
  className,
  titleClassName,
}: PageHeaderProps) {
  if (srOnlyTitle) {
    return (
      <header className={cn("sr-only", className)}>
        <h1>{title}</h1>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6",
        className
      )}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1
            className={cn(
              "font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text)]",
              titleClassName
            )}
          >
            {title}
          </h1>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {subtitle && (
          <p className="text-sm text-[var(--color-muted-darker)] leading-relaxed max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-stretch sm:items-center gap-2 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto [&>a]:w-full sm:[&>a]:w-auto [&>a>button]:w-full sm:[&>a>button]:w-auto sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}

