"use client";
import { forwardRef, type ComponentProps } from "react";
import { cx } from './utils';
export const Input = forwardRef<
  HTMLInputElement,
  ComponentProps<"input"> & { variant?: "default" | "search"; }
>(function Input({ className, variant = "default", ...props }, ref) {
  return (
    <input
      {...props}
      ref={ref}
      className={cx("ui-input", `ui-input--${variant}`, className)}
    />
  );
});
