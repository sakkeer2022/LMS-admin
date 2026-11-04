"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import {
  platformSettingsSchema,
  settingsDefaults,
  settingsSections,
  type PlatformSettings,
} from "./schema";

export function SettingsPage() {
  const {
    register,
    reset,
    formState: { errors, isDirty },
  } = useForm<PlatformSettings>({
    resolver: zodResolver(platformSettingsSchema),
    defaultValues: settingsDefaults,
    mode: "onChange",
  });

  return (
    <>
      <PageHeader
        title="Settings"
        description="Every value below is editable without a code change. Edits apply from the next scoring and billing cycle, never retrospectively."
      />
      {/* No settings endpoint exists yet: the form is display-only and Save stays disabled. */}
      <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()} noValidate>
        {settingsSections.map((section) => (
          <Card key={section.title} className="overflow-hidden">
            <CardHeader className="px-8 pb-2">
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-3">
              {section.rows.map((row) => {
                const error = errors[row.name]?.message;
                const asNumber = row.name !== "dailyLogCutoff";
                return (
                  <div
                    key={row.name}
                    className="flex flex-col gap-3 border-b border-border-subtle py-4 sm:flex-row sm:items-center sm:gap-6"
                  >
                    <div className="flex flex-1 flex-col gap-0.5">
                      <Label htmlFor={row.name} className="text-sm leading-5 font-semibold">
                        {row.label}
                      </Label>
                      <p id={`${row.name}-help`} className="text-xs text-muted-foreground">
                        {row.description}
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-1 sm:w-[180px] sm:shrink-0">
                      <div className="relative">
                        {row.clock && (
                          <Clock aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2" />
                        )}
                        <Input
                          id={row.name}
                          type={asNumber ? "number" : "text"}
                          inputMode={asNumber ? "numeric" : undefined}
                          aria-describedby={`${row.name}-help`}
                          aria-invalid={Boolean(error)}
                          className={cn(
                            "text-base font-semibold",
                            row.clock && "pl-10",
                            row.unit && "pr-9",
                          )}
                          {...register(row.name, { valueAsNumber: asNumber })}
                        />
                        {row.unit && (
                          <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-base font-semibold text-muted-foreground">
                            {row.unit}
                          </span>
                        )}
                      </div>
                      {error && <p className="text-xs text-error-foreground">{error}</p>}
                    </div>
                  </div>
                );
              })}
              {section.callout && (
                <div className="mt-4 flex items-start gap-3 rounded-md border border-warning-border bg-warning-subtle px-4 py-3 text-sm text-warning-foreground">
                  <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
                  <p>{section.callout}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Card className="flex-row flex-wrap items-center gap-3 px-6 py-4">
          <p className="min-w-0 flex-1 text-sm text-text-secondary" role="status">
            {isDirty ? "Unsaved changes" : "No unsaved changes"} · Saving is not connected to the backend yet; values shown are design defaults.
          </p>
          <Button type="button" variant="ghost" disabled={!isDirty} onClick={() => reset(settingsDefaults)}>
            Discard
          </Button>
          <Button type="submit" disabled>
            Save settings
          </Button>
        </Card>
      </form>
    </>
  );
}
