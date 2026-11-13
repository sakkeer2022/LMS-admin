import type { ComponentProps } from "react";
import { Badge } from "@/components/shadcn/badge";

type Variant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

/** One colour per kind of status, so the same state looks the same on every screen. */
const TONE = {
  active: "success",
  approved: "success",
  completed: "success",
  pending: "warning",
  processing: "info",
  inactive: "secondary",
  cancelled: "secondary",
  rejected: "destructive",
  failed: "destructive",
} as const satisfies Record<string, Variant>;

export type StatusTone = keyof typeof TONE;

/** A status pill. `status` picks the colour; `children` is the text shown (the label always carries the meaning). */
export function StatusBadge({
  status,
  children,
  ...props
}: { status: StatusTone } & Omit<ComponentProps<typeof Badge>, "variant">) {
  return (
    <Badge variant={TONE[status]} {...props}>
      {children}
    </Badge>
  );
}
