import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/shadcn/button";

/** A `Button` for an action that takes a moment: disabled, with a spinner and its own label, while `pending`. */
export function PendingButton({
  pending,
  pendingLabel = "Please wait…",
  children,
  disabled,
  ...props
}: ComponentProps<typeof Button> & { pending?: boolean; pendingLabel?: string }) {
  return (
    <Button {...props} disabled={disabled || pending} aria-busy={pending || undefined}>
      {pending && <Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
