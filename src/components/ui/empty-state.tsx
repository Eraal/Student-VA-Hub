import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <Card
      className={`border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm ${className}`}
    >
      <CardContent className="flex flex-col items-start p-6 text-left space-y-3">
        <div className="flex size-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]">
          <Icon className="size-4 text-[var(--color-muted)]" />
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-tight text-[var(--color-text)]">
            {title}
          </h3>
          <p className="text-xs text-[var(--color-muted)] max-w-md leading-relaxed">
            {description}
          </p>
        </div>

        {action && <div className="pt-2">{action}</div>}
      </CardContent>
    </Card>
  );
}

