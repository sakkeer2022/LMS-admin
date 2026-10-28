"use client";
import { forwardRef, type ComponentProps } from "react";
import { cx } from './utils';
export const Label = forwardRef<HTMLLabelElement, ComponentProps<"label">>(
  function Label({ className, ...props }, ref) {
    return <label {...props} ref={ref} className={cx("ui-label", className)} />;
  },
);
