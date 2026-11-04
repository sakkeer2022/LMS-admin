"use client";
import { forwardRef, useState, type ComponentProps, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shadcn/button";
import { Checkbox } from "@/components/shadcn/checkbox";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";

/* Sign-in and recovery building blocks (Figma "Screen/02 · Login"). */

export const AuthFormShell = forwardRef<
  HTMLFormElement,
  ComponentProps<"form"> & { pending?: boolean }
>(function AuthFormShell({ className, pending, children, ...props }, ref) {
  return (
    <form
      {...props}
      ref={ref}
      aria-busy={pending || undefined}
      className={cn("flex w-full max-w-[420px] flex-col gap-6", className)}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
});

export function AuthHeading({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-[30px] leading-[38px] font-bold tracking-[-0.01em]">
      {children}
    </h1>
  );
}

export function AuthHead({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <AuthHeading>{title}</AuthHeading>
      {lead && <p className="text-sm text-text-secondary">{lead}</p>}
    </div>
  );
}

const icons = { mail: Mail, lock: Lock };

type AuthFieldProps = Omit<ComponentProps<"input">, "id" | "name"> & {
  name: string;
  label: string;
  icon?: keyof typeof icons;
  hint?: string;
  error?: string;
  /** Adds the show/hide toggle for a password input */
  reveal?: boolean;
};

export function AuthField({
  name,
  label,
  icon,
  hint,
  error,
  reveal,
  type,
  required,
  className,
  ...props
}: AuthFieldProps) {
  const [visible, setVisible] = useState(false);
  const Icon = icon ? icons[icon] : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name} className="gap-1 text-sm font-semibold">
        {label}
        {required && (
          <span aria-hidden className="text-error-foreground">
            *
          </span>
        )}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-foreground"
          />
        )}
        <Input
          {...props}
          id={name}
          name={name}
          required={required}
          type={reveal && visible ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
          className={cn(Icon && "pl-10", reveal && "pr-10", className)}
        />
        {reveal && (
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {visible ? (
              <EyeOff aria-hidden className="size-5" />
            ) : (
              <Eye aria-hidden className="size-5" />
            )}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-error-foreground">
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthCheckbox({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={name} name={name} className="size-5 border-[1.5px] border-border-strong" />
      <Label htmlFor={name} className="text-sm font-normal">
        {label}
      </Label>
    </div>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-md bg-error-subtle px-3 py-2 text-sm text-error-foreground"
    >
      {children}
    </p>
  );
}

export function AuthSubmit({
  pending,
  children,
}: {
  pending?: boolean;
  children: ReactNode;
}) {
  return (
    <Button type="submit" size="lg" disabled={pending} aria-busy={pending || undefined}>
      {children}
    </Button>
  );
}

export function AuthLinkButton({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: ReactNode;
  variant?: "default" | "ghost";
}) {
  return (
    <Button asChild size="lg" variant={variant}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}

export function AuthSecondaryButton(
  props: Omit<ComponentProps<typeof Button>, "variant" | "size" | "type">,
) {
  return <Button {...props} type="button" variant="ghost" size="lg" />;
}

export function AuthSuccess({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full max-w-[420px] flex-col gap-6">
      <span className="flex size-16 items-center justify-center rounded-pill bg-success-subtle">
        <Image src="/auth/icon-circle-check.svg" alt="" width={20} height={20} />
      </span>
      {children}
    </div>
  );
}

export function AuthStack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>;
}
