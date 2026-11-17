import * as React from "react"
import { cn } from "@/lib/utils"

/** A keyboard key in an instruction, e.g. "Press <Kbd>Enter</Kbd> to search". */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-sunken px-1 font-sans text-[11px] leading-none font-semibold text-text-secondary",
        className
      )}
      {...props}
    />
  )
}

export { Kbd }
