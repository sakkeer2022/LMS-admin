"use client";
import { forwardRef, type ComponentProps } from "react";
import { cx } from './utils';
export const Checkbox = forwardRef<
  HTMLInputElement,
  Omit<ComponentProps<"input">, "type">
>(function Checkbox({ className, ...props }, ref) {
  return (
    <input
      {...props}
      ref={ref}
      type="checkbox"
      className={cx("ui-checkbox", className)}
    />
  );
});
