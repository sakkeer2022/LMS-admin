"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileUp } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { DatePicker } from "@/components/forms/DatePicker";
import { Field, SelectField, TextField } from "@/components/forms/field";
import { Form } from "@/components/forms/form";
import { FormDialog } from "@/components/forms/form-dialog";
import { PendingButton } from "@/components/forms/pending-button";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
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
    <FormDialog
      open={open}
      onClose={onClose}
      busy={upload.isPending}
      title="Upload a new version"
      description="It becomes the version students see as soon as it is saved. The previous one stays on record."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={upload.isPending}>
            Cancel
          </Button>
          <PendingButton type="submit" form="upload-policy-form" pending={upload.isPending} pendingLabel="Uploading…">
            <FileUp aria-hidden />
            Upload
          </PendingButton>
        </>
      }
    >
      <Form id="upload-policy-form" onSubmit={(event) => void submit(event)} noValidate pending={upload.isPending}>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Document" {...register("type")}>
              {POLICY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {POLICY_LABELS[type]}
                </option>
              ))}
            </SelectField>
            <SelectField label="Country" error={errors.country?.message} {...register("country")}>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Version" placeholder="1.0" error={errors.version?.message} {...register("version")} />
            <Controller
              control={control}
              name="effectiveAt"
              render={({ field }) => (
                <Field label="Takes effect" error={errors.effectiveAt?.message}>
                  {({ id, invalid }) => (
                    <div className="rounded-md border border-input bg-card">
                      <DatePicker id={id} name="effectiveAt" value={field.value} onChange={field.onChange} invalid={invalid} />
                    </div>
                  )}
                </Field>
              )}
            />
          </div>
          <TextField label="Title" error={errors.title?.message} {...register("title")} />
          <Field label="PDF file" hint={file ? `${(file.size / 1024).toFixed(0)} KB` : undefined} error={errors.file?.message}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="file"
                accept="application/pdf,.pdf"
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                onChange={(event) => setValue("file", event.target.files?.[0] ?? null, { shouldValidate: true })}
                className="h-auto cursor-pointer p-0 file:mr-3 file:h-10 file:cursor-pointer file:bg-accent file:px-3 file:font-semibold file:text-accent-foreground"
              />
            )}
          </Field>
        </div>
      </Form>
    </FormDialog>
  );
}
