"use client";
import { type ComponentProps, type ReactNode } from "react";
import { cx } from "./utils";
export function Disclosure({
  summary,
  label,
  className,
  summaryClassName,
  children,
  ...props
}: Omit<ComponentProps<"details">, "children"> & {
  summary: ReactNode;
  label?: string;
  summaryClassName?: string;
  children: ReactNode;
}) {
  return (
    <details {...props} className={className}>
      <summary
        aria-label={label}
        className={cx("ui-disclosure-trigger", summaryClassName)}
      >
        {summary}
      </summary>
      {children}
    </details>
  );
}

// Native details/summary provides Enter/Space activation and expanded semantics.
export const Accordion = Disclosure;
