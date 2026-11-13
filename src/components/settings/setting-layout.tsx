"use client";
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Label } from "@/components/shadcn/label";
import { cn } from "@/lib/utils";

/*
 * The layout of a settings-style page (Figma Settings content, node 207:6913): a card of label / description /
 * control rows, a save bar, and a note. These are layout only. The controls inside a row are the standard ones:
 * Input, PhoneInput, NativeSelect, Button, Badge, StatusBadge; forms and dialogs use components/forms.
 */

export function SettingsPage({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}

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
  error,
  narrow,
  children,
}: {
  label: string;
  description?: ReactNode;
  /** Id of the control this row labels */
  htmlFor?: string;
  /** Shown under the control, tied to it by the id `${htmlFor}-error` (set it as the control's aria-describedby) */
  error?: string;
  /** A short control, such as a number */
  narrow?: boolean;
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
      {(children || error) && (
        <div className={cn("flex w-full max-w-full flex-col gap-1 sm:flex-none", narrow ? "sm:w-44" : "sm:w-80")}>
          {children && <div className="flex items-center gap-2 sm:justify-end [&>[data-slot=input]]:min-w-0 [&>[data-slot=input]]:flex-1">{children}</div>}
          {error && (
            <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-xs text-error-foreground">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** A note inside a card (a warning about how the settings apply). Errors belong in `FormError`. */
export function SettingCallout({ children }: { children: ReactNode }) {
  return (
    <div
      role="note"
      className="mt-4 mb-2 flex items-start gap-3 rounded-md border border-warning-border bg-warning-subtle px-4 py-3 text-sm text-warning-foreground"
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function SettingPills({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5 sm:justify-end">{children}</div>;
}

/** The save bar at the bottom of a settings page: what changed, then Discard and Save. */
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
