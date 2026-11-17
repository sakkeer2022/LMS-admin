
import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Styled native select with smooth interactions. */
function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div
      className="relative w-full"
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        className={cn(
          // Layout
          "h-10 w-full min-w-0 appearance-none",
          "rounded-md border border-input",
          "bg-card py-2 pr-9 pl-3 text-sm",

          // Interaction
          "cursor-pointer",
          "transition-all duration-200 ease-in-out",
          "hover:border-foreground/25",
          "active:border-ring",
          "motion-reduce:transition-none",

          // Focus
          "outline-none",
          "focus-visible:border-ring",
          "focus-visible:ring-[3px] focus-visible:ring-ring/50",

          // Disabled
          "disabled:pointer-events-none",
          "disabled:cursor-not-allowed",
          "disabled:opacity-50",

          // Invalid
          "aria-invalid:border-destructive",
          "aria-invalid:ring-destructive/20",

          className
        )}
        {...props}
      />

      <ChevronDownIcon
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 right-3",
          "size-4 -translate-y-1/2",
          "text-muted-foreground",
          "transition-colors duration-200",
          "motion-reduce:transition-none"
        )}
      />
    </div>
  )
}

export { NativeSelect }
