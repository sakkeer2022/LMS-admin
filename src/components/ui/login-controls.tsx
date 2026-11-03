"use client";
import { Form } from "./Form";
import { forwardRef, useState, type ComponentProps } from "react";

/* Figma-skinned controls for the sign-in screens (styles: features/auth/login.css) */

export const LoginForm = forwardRef<
  HTMLFormElement,
  ComponentProps<typeof Form>
>(function LoginForm({ className, ...props }, ref) {
  return (
    <Form
      {...props}
      ref={ref}
      className={`login-form ${className ?? ""}`.trim()}
    />
  );
});

export function LoginHeading({ children }: { children: string }) {
  return <h1 className="login-title">{children}</h1>;
}

type LoginFieldProps = Omit<ComponentProps<"input">, "id" | "name"> & {
  name: string;
  label: string;
  /** Leading icon; the recovery screens have none */
  icon?: string;
  /** Helper text under the field */
  hint?: string;
  error?: string;
  /** Adds the show/hide toggle for a password input */
  reveal?: boolean;
};

export function LoginField({
  name,
  label,
  icon,
  hint,
  error,
  reveal,
  type,
  required,
  ...props
}: LoginFieldProps) {
  const [visible, setVisible] = useState(false);
  const errorId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className="login-field">
      <label className="login-label" htmlFor={name}>
        {label}
        {required && (
          <span className="login-required" aria-hidden>
            *
          </span>
        )}
      </label>
      <div className="login-control" data-invalid={Boolean(error)}>
        {icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="login-icon" src={icon} alt="" />
        )}
        <input
          {...props}
          id={name}
          name={name}
          required={required}
          type={reveal && visible ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [errorId, hintId].filter(Boolean).join(" ") || undefined
          }
        />
        {reveal && (
          <button
            type="button"
            className="login-reveal"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="login-icon" src="/auth/icon-eye.svg" alt="" />
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="login-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="login-field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function LoginCheckbox({
  label,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: string }) {
  return (
    <label className="login-check">
      <input {...props} type="checkbox" />
      {label}
    </label>
  );
}

export function LoginSubmit({
  pending,
  children,
}: {
  pending?: boolean;
  children: string;
}) {
  return (
    <button
      className="login-submit"
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
    >
      {children}
    </button>
  );
}

export function LoginSecondaryButton({
  children,
  ...props
}: Omit<ComponentProps<"button">, "type" | "className"> & {
  children: string;
}) {
  return (
    <button {...props} type="button" className="login-secondary">
      {children}
    </button>
  );
}
