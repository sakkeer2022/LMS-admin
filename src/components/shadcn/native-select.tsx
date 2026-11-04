import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** shadcn "native-select": a styled <select>, for forms that need an empty option. */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative w-full" data-slot="native-select-wrapper">
      <select
        data-slot="native-select"
        className={cn(
          "h-10 w-full min-w-0 appearance-none rounded-md border border-input bg-card py-2 pr-9 pl-3 text-sm transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          className
        )}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}

export { NativeSelect }
