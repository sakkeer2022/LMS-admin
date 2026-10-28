"use client";
import { forwardRef, type ComponentProps } from "react";
import { cx } from './utils';
export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        {...props}
        ref={ref}
        className={cx("ui-input ui-select", className)}
      />
    );
  },
);
