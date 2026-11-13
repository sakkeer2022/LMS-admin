"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { PageHeader } from "@/components/layout/page-header";
import { Form } from "@/components/forms/form";
import { SettingCallout, SettingCard, SettingRow, StickyBar } from "@/components/settings/setting-layout";
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
      <Form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()} noValidate>
        {settingsSections.map((section) => (
          <SettingCard key={section.title} title={section.title} caption={section.description}>
            {section.rows.map((row) => {
              const error = errors[row.name]?.message;
              const asNumber = row.name !== "dailyLogCutoff";
              return (
                <SettingRow key={row.name} label={row.label} description={row.description} htmlFor={row.name} error={error} narrow>
                  <div className="relative w-full">
                    {row.clock && (
                      <Clock aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    )}
                    <Input
                      id={row.name}
                      type={asNumber ? "number" : "text"}
                      inputMode={asNumber ? "numeric" : undefined}
                      aria-invalid={Boolean(error) || undefined}
                      aria-describedby={error ? `${row.name}-error` : undefined}
                      className={cn(row.clock && "pl-9", row.unit && "pr-9")}
                      {...register(row.name, { valueAsNumber: asNumber })}
                    />
                    {row.unit && (
                      <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                        {row.unit}
                      </span>
                    )}
                  </div>
                </SettingRow>
              );
            })}
            {section.callout && <SettingCallout>{section.callout}</SettingCallout>}
          </SettingCard>
        ))}

        <StickyBar
          message={`${isDirty ? "Unsaved changes" : "No unsaved changes"} · Saving is not connected to the backend yet; values shown are design defaults.`}
        >
          <Button type="button" variant="ghost" disabled={!isDirty} onClick={() => reset(settingsDefaults)}>
            Discard
          </Button>
          <Button type="submit" disabled>
            Save settings
          </Button>
        </StickyBar>
      </Form>
    </>
  );
}
