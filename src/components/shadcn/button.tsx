
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2",
    "rounded-md text-sm font-semibold whitespace-nowrap",

    // Interaction
    "cursor-pointer",
    "transition-all duration-200 ease-in-out",
    "active:scale-[0.98]",
    "motion-reduce:transition-none",
    "motion-reduce:active:scale-100",

    // Focus
    "outline-none",
    "focus-visible:border-ring",
    "focus-visible:ring-[3px] focus-visible:ring-ring/50",

    // Disabled and invalid states
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "aria-invalid:border-destructive",
    "aria-invalid:ring-destructive/20",
    "dark:aria-invalid:ring-destructive/40",

    // SVG
    "[&_svg]:pointer-events-none",
    "[&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed",

        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",

        outline:
          "border border-border bg-card text-foreground hover:bg-sunken hover:border-foreground/20",

        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",

        ghost:
          "text-accent-foreground hover:bg-accent",

        link:
          "text-primary underline-offset-4 hover:underline active:scale-100",
      },

      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-md px-5 has-[>svg]:px-4",
        icon: "size-10",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
