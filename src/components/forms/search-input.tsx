"use client";
import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Tip } from "@/components/feedback/tip";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Kbd } from "@/components/shadcn/kbd";
import { cn } from "@/lib/utils";

/**
 * The search box of a list screen. A leading icon, our own clear button (the browser's is hidden), `Esc`
 * clears, and `/` focuses it from anywhere that is not already a text field or a dialog.
 */
export function SearchInput({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name, e.g. "Search students" */
  label: string;
  placeholder: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        event.key !== "/" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        target.closest("input, textarea, select, [contenteditable], [role=dialog]")
      )
        return;
      event.preventDefault();
      ref.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={cn("relative min-w-0", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={ref}
        type="search"
        aria-label={label}
        placeholder={placeholder}
        className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) onChange("");
        }}
      />
      {!value && (
        <Kbd
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 sm:inline-flex"
        >
          /
        </Kbd>
      )}
      {value && (
        <Tip
          label={
            <span className="flex items-center gap-2">
              Clear search <Kbd>Esc</Kbd>
            </span>
          }
        >
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute top-1/2 right-2 -translate-y-1/2"
            aria-label="Clear search"
            onClick={() => onChange("")}
          >
            <X aria-hidden />
          </Button>
        </Tip>
      )}
    </div>
  );
}
