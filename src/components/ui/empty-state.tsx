import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
  compact = false,
}: EmptyStateProps) {
  if (compact) {
    return (
      <Card
        className={cn(
          "border-[1.5px] border-border bg-card shadow-[3px_3px_0px_0px_#0F172A] min-h-[160px] flex items-center justify-center",
          className
        )}
      >
        <CardContent className="flex flex-col items-center justify-center p-5 text-center space-y-2 w-full">
          <div className="flex size-9 items-center justify-center rounded-lg border-[1.5px] border-border bg-[#FAF7F2] text-foreground shadow-[1.5px_1.5px_0px_0px_#0F172A]">
            <Icon className="size-4 text-slate-700" />
          </div>

          <div className="space-y-0.5">
            <h3 className="font-display text-sm font-bold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
              {description}
            </p>
          </div>

          {action && <div className="pt-1">{action}</div>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-[1.5px] border-border bg-card shadow-[3px_3px_0px_0px_#0F172A]",
        className
      )}
    >
      <CardContent className="flex flex-col items-start p-6 text-left space-y-3">
        <div className="flex size-9 items-center justify-center rounded-lg border-[1.5px] border-border bg-[#FAF7F2] text-foreground shadow-[1.5px_1.5px_0px_0px_#0F172A]">
          <Icon className="size-4 text-slate-700" />
        </div>

        <div className="space-y-1">
          <h3 className="font-display text-sm font-bold tracking-tight text-foreground">
            {title}
          </h3>
          <p className="text-xs text-slate-600 max-w-md leading-relaxed">
            {description}
          </p>
        </div>

        {action && <div className="pt-2">{action}</div>}
      </CardContent>
    </Card>
  );
}
