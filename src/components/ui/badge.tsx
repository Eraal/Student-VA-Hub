import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-bold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground shadow-[1.5px_1.5px_0px_0px_#0F172A]",
        secondary:
          "border-border bg-white text-foreground shadow-[1.5px_1.5px_0px_0px_#0F172A]",
        outline:
          "border-border bg-transparent text-foreground shadow-none",
        destructive:
          "border-[#DC2626] bg-[#FEF2F2] text-[#991B1B] shadow-[1.5px_1.5px_0px_0px_#DC2626]",
        conflict:
          "border-[#DC2626] bg-[#FEF2F2] text-[#991B1B] shadow-[1.5px_1.5px_0px_0px_#DC2626]",
        class:
          "border-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] shadow-[1.5px_1.5px_0px_0px_#2563EB]",
        work:
          "border-[#16A34A] bg-[#F0FDF4] text-[#166534] shadow-[1.5px_1.5px_0px_0px_#16A34A]",
        warning:
          "border-[#D97706] bg-[#FFFBEB] text-[#92400E] shadow-[1.5px_1.5px_0px_0px_#D97706]",
        ghost:
          "border-transparent bg-transparent text-foreground shadow-none hover:bg-[#EFEAE2]",
        link:
          "border-transparent text-primary underline-offset-4 hover:underline shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
