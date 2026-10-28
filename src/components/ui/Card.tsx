"use client";
import { type HTMLAttributes } from "react";
import { cx } from './utils';
export function Card({
  as: Tag = "section",
  variant = "default",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: "section" | "div";
  variant?: "default" | "section" | "stat";
}) {
  return (
    <Tag
      {...props}
      className={cx("ui-card", `ui-card--${variant}`, className)}
    />
  );
}
