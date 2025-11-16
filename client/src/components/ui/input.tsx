import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // h-9 to match icon buttons and default buttons.
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full brutal-border border-input bg-input px-4 py-3 text-base font-semibold file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:shadow-brutal disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
