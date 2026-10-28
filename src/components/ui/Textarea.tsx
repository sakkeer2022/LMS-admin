"use client";
import { forwardRef, type ComponentProps } from "react";
import { cx } from './utils';
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  ComponentProps<"textarea">
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={cx("ui-input ui-textarea", className)}
    />
  );
});
