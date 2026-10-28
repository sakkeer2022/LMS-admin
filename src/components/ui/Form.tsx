"use client";
import { forwardRef, type ComponentProps } from "react";
import { cx } from "./utils";
export const Form = forwardRef<
  HTMLFormElement,
  ComponentProps<"form"> & { pending?: boolean }
>(function Form({ className, pending, children, ...props }, ref) {
  return (
    <form
      {...props}
      ref={ref}
      className={cx("ui-form", className)}
      aria-busy={pending || undefined}
    >
      <fieldset disabled={pending} className="ui-form-fields">
        {children}
      </fieldset>
    </form>
  );
});
