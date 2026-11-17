import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** The show/hide eye of a password field, pinned to the right of its input. */
export function RevealButton({
  visible,
  onToggle,
  className,
}: {
  visible: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      onClick={onToggle}
      className={cn(
        "absolute top-1/2 right-3 -translate-y-1/2 rounded-md text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      {visible ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
    </button>
  );
}
