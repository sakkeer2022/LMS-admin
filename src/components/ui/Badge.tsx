"use client";
import { type ComponentProps } from "react";
import { cx } from './utils';
export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & {
  tone?: "neutral" | "success" | "danger" | "warning" | "info" | "accent";
}) {
  return (
    <span
      {...props}
      className={cx("ui-badge", `ui-badge--${tone}`, className)}
    />
  );
}
