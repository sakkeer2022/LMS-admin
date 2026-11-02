"use client";
import { forwardRef, type ComponentProps } from "react";
import { cx } from "./utils";

/**
 * On/off switch (WAI-ARIA switch pattern): a button with role="switch" and
 * aria-checked. Give it an accessible name with `label` (visually hidden) or
 * aria-labelledby. Space and Enter toggle it, as for any button.
 */
export const Switch = forwardRef<
  HTMLButtonElement,
  Omit<ComponentProps<"button">, "onChange" | "role"> & {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label?: string;
    size?: "sm" | "md";
  }
>(function Switch({ checked, onCheckedChange, label, size = "md", className, disabled, onClick, ...props }, ref) {
  const track = size === "sm" ? "h-[18px] w-[32px]" : "h-[22px] w-[40px]";
  const thumb = size === "sm" ? "h-[14px] w-[14px]" : "h-[18px] w-[18px]";
  const shift = size === "sm" ? "translate-x-[14px]" : "translate-x-[18px]";
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={props["aria-label"] ?? label}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onCheckedChange(!checked);
      }}
      className={cx(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-[2px] transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-[var(--info)]" : "bg-[var(--border)]",
        track,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "rounded-full bg-[var(--surface)] shadow-[0_1px_2px_rgb(15_23_42/0.25)] transition-transform duration-150",
          thumb,
          checked ? shift : "translate-x-0",
        )}
      />
    </button>
  );
});
