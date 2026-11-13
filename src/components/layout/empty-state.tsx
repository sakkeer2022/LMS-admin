import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-md border border-dashed border-border-strong bg-card px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <span aria-hidden className="mb-1 grid size-12 place-items-center rounded-full bg-accent text-primary">
          <Icon className="size-6" />
        </span>
      )}
      <p className="text-lg font-semibold">{title}</p>
      {description && (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}
