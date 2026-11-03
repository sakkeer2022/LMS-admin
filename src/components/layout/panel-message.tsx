import type { ReactNode } from "react";
import { Button } from "@/components/shadcn/button";

export function PanelMessage({
  children,
  onRetry,
}: {
  children: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div
      role={onRetry ? "alert" : undefined}
      className="flex items-center justify-center gap-3 px-6 py-8 text-sm text-muted-foreground"
    >
      {children}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
