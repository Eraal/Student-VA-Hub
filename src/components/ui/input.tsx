import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border-[1.5px] border-input bg-white px-3 py-2 text-sm text-foreground shadow-[2px_2px_0px_0px_#0F172A] transition-all outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-slate-400 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        "aria-invalid:border-destructive aria-invalid:shadow-[2px_2px_0px_0px_#DC2626]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
