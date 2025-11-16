import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "whitespace-nowrap inline-flex items-center brutal-border px-3 py-1.5 text-xs font-black uppercase focus:outline-none shadow-brutal-sm",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-primary-border",
        secondary: "bg-secondary text-secondary-foreground border-secondary-border",
        destructive:
          "bg-destructive text-destructive-foreground border-destructive-border",
        outline: "bg-background text-foreground border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }
