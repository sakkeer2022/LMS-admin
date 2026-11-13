"use client";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";
import { cn } from "@/lib/utils";

const RESET_MS = 1500;

/** Copies `value`; the icon becomes a check for a moment. `label` names what is copied, for the accessible name. */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), RESET_MS);
    } catch {
      // Insecure context or permission denied
      toast.error(`Could not copy the ${label.toLowerCase()}.`);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
          className={cn(
            "shrink-0 text-muted-foreground",
            copied && "text-success-foreground",
            className,
          )}
          onClick={(event) => {
            event.stopPropagation();
            void copy();
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
    </Tooltip>
  );
}

/** A value with its copy button, which shows on hover or keyboard focus (always on touch screens). */
export function CopyValue({
  value,
  label,
  children,
  className,
}: {
  value: string;
  label: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("group/copy inline-flex min-w-0 items-center gap-1", className)}>
      <span className="min-w-0 break-words">{children ?? value}</span>
      <CopyButton
        value={value}
        label={label}
        className="opacity-0 transition-opacity group-hover/copy:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 motion-reduce:transition-none"
      />
    </span>
  );
}
