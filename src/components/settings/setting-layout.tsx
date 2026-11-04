"use client";
import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type ComponentProps, type ReactNode } from "react";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/dialog";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { cn } from "@/lib/utils";

/* Settings-style blocks (Figma Settings content, node 207:6913): a card of label / description / control rows. */

export function SettingsPage({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}

export const SettingForm = forwardRef<
  HTMLFormElement,
  ComponentProps<"form"> & { pending?: boolean }
>(function SettingForm({ pending, children, ...props }, ref) {
  return (
    <form {...props} ref={ref} aria-busy={pending || undefined}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
});

export function SettingCard({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden" aria-label={title} role="region">
      <CardHeader className="px-4 pb-2 sm:px-8">
        <CardTitle>{title}</CardTitle>
        {caption && <CardDescription>{caption}</CardDescription>}
      </CardHeader>
      <CardContent className="px-4 pb-3 sm:px-8">{children}</CardContent>
    </Card>
  );
}

export function SettingRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string;
  description?: ReactNode;
  /** Id of the control this row labels */
  htmlFor?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border-subtle py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {htmlFor ? (
          <Label htmlFor={htmlFor} className="text-sm leading-5 font-semibold">
            {label}
          </Label>
        ) : (
          <p className="text-sm leading-5 font-semibold">{label}</p>
        )}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children && (
        <div className="flex w-full max-w-full items-center gap-2 sm:w-80 sm:flex-none sm:justify-end">
          {children}
        </div>
      )}
    </div>
  );
}

export function SettingCallout({ children }: { children: ReactNode }) {
  return (
    <div
      role="note"
      className="mt-1 mb-2 rounded-md border border-warning-border bg-warning-subtle px-4 py-3 text-sm text-warning-foreground"
    >
      {children}
    </div>
  );
}

export const SettingInput = forwardRef<
  HTMLInputElement,
  ComponentProps<"input"> & { error?: string }
>(function SettingInput({ error, className, ...props }, ref) {
  const errorId = error && props.id ? `${props.id}-error` : undefined;
  return (
    <div className="min-w-0 flex-1">
      <Input
        {...props}
        ref={ref}
        className={cn("text-base font-semibold read-only:bg-border-subtle read-only:text-text-secondary", className)}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-error-foreground">
          {error}
        </p>
      )}
    </div>
  );
});

/** A native select styled like the inputs; the profile time-zone list is long and benefits from native search. */
export function SettingSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-base font-semibold outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    />
  );
}

export function SettingButton({
  variant = "secondary",
  size,
  pending,
  pendingLabel = "Please wait…",
  children,
  type = "button",
  disabled,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm";
  pending?: boolean;
  pendingLabel?: string;
  children: ReactNode;
}) {
  return (
    <Button
      {...props}
      type={type}
      variant={variant === "primary" ? "default" : variant === "ghost" ? "ghost" : "outline"}
      size={size === "sm" ? "sm" : "default"}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function SettingPill({
  tone,
  children,
}: {
  tone?: "warning";
  children: ReactNode;
}) {
  return <Badge variant={tone === "warning" ? "warning" : "default"}>{children}</Badge>;
}

export function SettingPills({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5 sm:justify-end">{children}</div>;
}

export function SettingEmpty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-sm text-muted-foreground">{children}</p>;
}

export function StickyBar({
  message,
  children,
}: {
  message: string;
  children: ReactNode;
}) {
  return (
    <Card
      role="region"
      aria-label="Save changes"
      className="sticky bottom-4 mt-6 flex-row flex-wrap items-center gap-3 px-6 py-4"
    >
      <p className="min-w-0 flex-1 text-sm text-text-secondary" role="status">
        {message}
      </p>
      {children}
    </Card>
  );
}

/** A password input with a show/hide toggle. */
export const SettingPasswordInput = forwardRef<
  HTMLInputElement,
  Omit<ComponentProps<"input">, "type"> & { error?: string }
>(function SettingPasswordInput({ error, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative min-w-0 flex-1">
      <SettingInput
        {...props}
        ref={ref}
        error={error}
        type={visible ? "text" : "password"}
        className="pr-10"
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
        className="absolute top-5 right-3 -translate-y-1/2 rounded-md text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  );
});

/** A modal dialog in the settings style: icon, title, description, content and a footer for actions. */
export function SettingDialog({
  open,
  onClose,
  title,
  description,
  icon,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  icon: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} className="gap-6 p-6 sm:max-w-md">
        <DialogHeader className="flex-row items-start gap-4 text-left">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-accent text-accent-foreground">
            {icon}
          </span>
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-lg leading-[26px] font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-sm text-text-secondary">{description}</DialogDescription>
          </div>
        </DialogHeader>
        <div>{children}</div>
        {footer && <DialogFooter className="gap-2">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

/** A label above a control, for stacked forms such as the dialog. */
export function SettingField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </Label>
      {children}
    </div>
  );
}
