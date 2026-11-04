"use client";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Checkbox } from "@/components/shadcn/checkbox";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { NativeSelect } from "@/components/shadcn/native-select";
import { Textarea } from "@/components/shadcn/textarea";
import { cn } from "@/lib/utils";

/** Label, control, hint and error stacked; ids wired for screen readers. */
export function Field({
  label,
  hint,
  error,
  labelHidden,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  labelHidden?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className={labelHidden ? "sr-only" : undefined}>
        {label}
      </Label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-error-foreground">
          {error}
        </p>
      )}
    </div>
  );
}

type FieldProps = { label: ReactNode; hint?: ReactNode; error?: string; labelHidden?: boolean; containerClassName?: string };

export function TextField({ label, hint, error, labelHidden, containerClassName, ...props }: FieldProps & Omit<ComponentProps<"input">, "id">) {
  return (
    <Field label={label} hint={hint} error={error} labelHidden={labelHidden} className={containerClassName}>
      {({ id, describedBy, invalid }) => (
        <Input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} {...props} />
      )}
    </Field>
  );
}

export function TextareaField({ label, hint, error, labelHidden, containerClassName, ...props }: FieldProps & Omit<ComponentProps<"textarea">, "id">) {
  return (
    <Field label={label} hint={hint} error={error} labelHidden={labelHidden} className={containerClassName}>
      {({ id, describedBy, invalid }) => (
        <Textarea id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} {...props} />
      )}
    </Field>
  );
}

export function SelectField({ label, hint, error, labelHidden, containerClassName, ...props }: FieldProps & Omit<ComponentProps<"select">, "id">) {
  return (
    <Field label={label} hint={hint} error={error} labelHidden={labelHidden} className={containerClassName}>
      {({ id, describedBy, invalid }) => (
        <NativeSelect id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} {...props} />
      )}
    </Field>
  );
}

/** A checkbox with its label beside it. */
export function CheckField({
  label,
  className,
  ...props
}: Omit<ComponentProps<typeof Checkbox>, "id"> & { label: ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Checkbox id={id} {...props} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}

/** A form-level error message (role=alert). Renders nothing without a message. */
export function FormError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={cn("rounded-md bg-error-subtle px-3 py-2 text-sm text-error-foreground", className)}>
      {message}
    </p>
  );
}
