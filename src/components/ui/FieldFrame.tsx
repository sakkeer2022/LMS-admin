"use client";
import { type ReactNode } from "react";
import { Label } from "./Label";
import { Typography } from "./Typography";
import { cx } from "./utils";

export type FieldContent = {
  label: string;
  labelHidden?: boolean;
  description?: ReactNode;
  error?: string;
  containerClassName?: string;
};
export function fieldIds(
  id: string,
  description: ReactNode,
  error: string | undefined,
  external?: string,
) {
  return (
    [
      external,
      description ? `${id}-description` : undefined,
      error ? `${id}-error` : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined
  );
}

export function FieldFrame({
  id,
  label,
  labelHidden,
  description,
  error,
  required,
  containerClassName,
  children,
}: FieldContent & { id: string; required?: boolean; children: ReactNode }) {
  return (
    <div className={cx("ui-field", containerClassName)}>
      {/* <Label htmlFor={id} className={labelHidden ? "sr-only" : undefined}>
        {label}
        {required && (
          <span className="ui-required" aria-hidden="true">
            *
          </span>
        )}
      </Label> */}
      {children}
      {description && (
        <Typography
          variant="body2"
          id={`${id}-description`}
          tone="muted"
          className="ui-field-description"
        >
          {description}
        </Typography>
      )}
      {error && (
        <Typography
          variant="body2"
          id={`${id}-error`}
          tone="danger"
          className="ui-field-error"
        >
          {error}
        </Typography>
      )}
    </div>
  );
}
