import { X } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Tip } from "./tip";

/** An active filter as a removable pill; put several in a `<ul aria-label="Active filters">`. */
export function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <li className="inline-flex items-center gap-1 rounded-pill border border-border bg-accent py-0.5 pr-1 pl-3 text-xs font-medium text-accent-foreground">
      {label}
      <Tip label="Remove filter">
        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-pill hover:bg-card"
          aria-label={`Remove filter ${label}`}
          onClick={onRemove}
        >
          <X aria-hidden />
        </Button>
      </Tip>
    </li>
  );
}
