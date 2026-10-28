"use client";
import { forwardRef, type ComponentProps } from "react";
import { buttonClass, type ButtonStyle } from "./button-style";
import { Spinner } from "./Spinner";
import { cx } from "./utils";
export const Button = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button"> &
    ButtonStyle & { pending?: boolean; pendingLabel?: string }
>(function Button(
  {
    variant,
    size,
    className,
    type = "button",
    pending = false,
    pendingLabel = "Please wait…",
    disabled,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      className={cx(buttonClass({ variant, size }), className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending && <Spinner />}
      {pending ? pendingLabel : children}
    </button>
  );
});
