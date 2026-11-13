
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  [
    "group/tabs-list relative inline-flex w-full",
    "items-center justify-start",
    "rounded-none border-b border-border",
    "p-0 text-muted-foreground",
    "data-[variant=line]:bg-transparent",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "rounded-lg bg-muted p-[3px]",
        line: "gap-0 rounded-none bg-transparent",
      },
    },
    defaultVariants: {
      variant: "line",
    },
  }
)

function TabsList({
  className,
  variant = "line",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        tabsListVariants({ variant }),
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Layout
        "relative inline-flex shrink-0 items-center",
        "justify-center gap-2",
        "h-[72px] px-7",

        // Typography
        "text-base font-medium whitespace-nowrap",
        "text-muted-foreground",

        // Interaction
        "transition-colors duration-200 ease-in-out",
        "hover:text-foreground",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring",

        // Active state
        "data-[state=active]:text-[#63318B]",

        // Animated underline
        "after:absolute after:bottom-0 after:left-0",
        "after:h-[3px] after:w-full",
        "after:origin-center after:scale-x-0",
        "after:bg-[#963D9C]",
        "after:transition-transform after:duration-300",
        "after:ease-[cubic-bezier(0.22,1,0.36,1)]",
        "data-[state=active]:after:scale-x-100",

        // Remove default tab styling
        "rounded-none border-0 bg-transparent shadow-none",
        "data-[state=active]:bg-transparent",
        "data-[state=active]:shadow-none",

        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 outline-none",
        "focus-visible:outline-none",
        className
      )}
      {...props}
    />
  )
}

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  tabsListVariants,
}
