"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileUp } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { DatePicker } from "@/components/forms/DatePicker";
import {
  SettingButton,
  SettingDialog,
  SettingField,
  SettingForm,
  SettingInput,
  SettingSelect,
} from "@/components/settings/setting-layout";
import { ApiError } from "@/lib/api/contracts";
import { toIsoDate } from "@/lib/dates";
import { useUploadPolicy } from "./api";
import { uploadSchema, type UploadValues } from "./schema";
import {
  POLICY_LABELS,
  POLICY_TYPES,
  type Country,
  type PolicyType,
} from "./types";

type Draft = Omit<UploadValues, "file"> & { file: File | null };

/**
 * Upload a new version of one policy for one country. The new version becomes the one students see as soon
 * as it is saved; the old one stays on record and can be made current again from its history.
 */
export function UploadPolicyDialog({
  open,
  onClose,
  countries,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  countries: Country[];
  initial: { type: PolicyType; country: string; title: string };
}) {
  const upload = useUploadPolicy();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<Draft>({
    resolver: zodResolver(uploadSchema) as never,
    defaultValues: {
      ...initial,
      version: "",
      effectiveAt: toIsoDate(new Date()),
      file: null,
    },
  });

  useEffect(() => {
    if (open)
      reset({
        ...initial,
        version: "",
        effectiveAt: toIsoDate(new Date()),
        file: null,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial.type, initial.country]);

  const file = watch("file");

  const submit = handleSubmit((values) => {
    upload.mutate(
      { ...values, file: values.file as File },
      {
        onSuccess: () => {
          toast.success(
            `${POLICY_LABELS[values.type]} ${values.version} is now live for ${values.country}.`,
          );
          onClose();
        },
        onError: (error) => {
          // The backend reports a version that already exists as a 409: show it beside the field
          if (error instanceof ApiError && error.status === 409)
            setError("version", { message: error.message });
        },
      },
    );
  });

  return (
    <SettingDialog
      open={open}
      onClose={() => !upload.isPending && onClose()}
      title="Upload a new version"
      description="It becomes the version students see as soon as it is saved. The previous one stays on record."
      icon={<FileUp size={20} aria-hidden />}
      footer={
        <>
          <SettingButton
            variant="ghost"
            onClick={onClose}
            disabled={upload.isPending}
          >
            Cancel
          </SettingButton>
          <SettingButton
            variant="primary"
            type="submit"
            form="upload-policy-form"
            pending={upload.isPending}
            pendingLabel="Uploading…"
          >
            Upload
          </SettingButton>
        </>
      }
    >
      <SettingForm
        id="upload-policy-form"
        onSubmit={(event) => void submit(event)}
        noValidate
        pending={upload.isPending}
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingField label="Document" htmlFor="policy-type">
              <SettingSelect
                id="policy-type"
                className="text-sm"
                {...register("type")}
              >
                {POLICY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {POLICY_LABELS[type]}
                  </option>
                ))}
              </SettingSelect>
            </SettingField>
            <SettingField label="Country" htmlFor="policy-country">
              <SettingSelect
                id="policy-country"
                {...register("country")}
                aria-invalid={Boolean(errors.country)}
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </SettingSelect>
            </SettingField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingField label="Version" htmlFor="policy-version">
              <SettingInput
                id="policy-version"
                placeholder="1.0"
                error={errors.version?.message}
                {...register("version")}
              />
            </SettingField>
            <SettingField label="Takes effect" htmlFor="policy-effective">
              <Controller
                control={control}
                name="effectiveAt"
                render={({ field }) => (
                  <div className="rounded-md border border-input bg-card">
                    <DatePicker
                      id="policy-effective"
                      name="effectiveAt"
                      value={field.value}
                      onChange={field.onChange}
                      invalid={Boolean(errors.effectiveAt)}
                    />
                  </div>
                )}
              />
              {errors.effectiveAt && (
                <p className="text-xs text-error-foreground">
                  {errors.effectiveAt.message}
                </p>
              )}
            </SettingField>
          </div>
          <SettingField label="Title" htmlFor="policy-title">
            <SettingInput
              id="policy-title"
              error={errors.title?.message}
              {...register("title")}
            />
          </SettingField>
          <SettingField label="PDF file" htmlFor="policy-file">
            <input
              id="policy-file"
              type="file"
              accept="application/pdf,.pdf"
              aria-invalid={Boolean(errors.file)}
              onChange={(event) =>
                setValue("file", event.target.files?.[0] ?? null, {
                  shouldValidate: true,
                })
              }
              className="block w-full cursor-pointer rounded-md border border-input bg-card text-sm file:mr-3 file:cursor-pointer file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-accent-foreground"
            />
            {file && (
              <p className="text-xs text-text-secondary">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
            {errors.file && (
              <p className="text-xs text-error-foreground">
                {errors.file.message}
              </p>
            )}
          </SettingField>
        </div>
      </SettingForm>
    </SettingDialog>
  );
}
