"use client";
import { useId, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { CheckField, FormError, TextField } from "@/components/forms/field";
import { Button } from "@/components/shadcn/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/shadcn/sheet";
import { describeApiError } from "@/lib/api/errors";
import type { PickerOffering } from "@/lib/api/offering-tree";
import { pricingKeys, useCreatePriceRule, useUpdatePriceRule, type PriceRule } from "@/lib/api/pricing";
import { formatBps, formatPaise, paiseToRupeesInput, parseRupeesToPaise, previewStudentPays } from "@/lib/currency/money";
import { fromLocalInput, toLocalInput } from "../schemas/pricing";
import { OfferingPicker, chosenOffering, emptyChoice, type OfferingChoice } from "./offering-picker";

/** 18% until the GST setting (LMS-90) exists; the server applies it, this is display only. */
const DEFAULT_GST_BPS = 1800;

/** A new tutor price for one subject card, opened from a "Not priced" row's menu. */
export interface TutorPricePreset {
  facultyId: string;
  facultyName: string;
  curriculumId: string;
  offeringLabel: string;
  suggestedPaise: number | null;
}

/**
 * Add or edit a price rule (screen 29). Amounts are typed in rupees and sent as paise.
 * A new rule is the default for all tutors, unless it comes from a tutor's subject card.
 */
export function PriceRuleDrawer({
  rule,
  preset,
  offerings,
  onClose,
}: {
  rule?: PriceRule;
  preset?: TutorPricePreset;
  offerings: readonly PickerOffering[];
  onClose: () => void;
}) {
  const formId = useId();
  const client = useQueryClient();
  const [choice, setChoice] = useState<OfferingChoice>(emptyChoice);
  const [price, setPrice] = useState(
    rule
      ? paiseToRupeesInput(rule.amounts.sessionPricePaise)
      : preset?.suggestedPaise
        ? paiseToRupeesInput(preset.suggestedPaise)
        : "",
  );
  const [from, setFrom] = useState(toLocalInput(rule?.effectiveFrom ?? null));
  const [to, setTo] = useState(toLocalInput(rule?.effectiveTo ?? null));
  const [active, setActive] = useState(rule?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [stale, setStale] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const create = useCreatePriceRule();
  const update = useUpdatePriceRule();
  const pending = create.isPending || update.isPending;

  const gstBps = rule?.amounts.gstRateBps ?? DEFAULT_GST_BPS;
  const parsed = parseRupeesToPaise(price);
  const preview = parsed.ok && parsed.paise > 0 ? previewStudentPays(parsed.paise, gstBps) : null;
  const touch = () => {
    setDirty(true);
    setFormError(undefined);
  };
  const requestClose = () => (dirty ? setConfirming(true) : onClose());
  const tutorLabel = rule ? (rule.facultyId ? (rule.facultyName ?? "Unknown tutor") : "Default (all tutors)") : (preset?.facultyName ?? "Default (all tutors)");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    const offering = rule || preset ? undefined : chosenOffering(offerings, choice);
    if (!rule && !preset && !offering) {
      if (!choice.categoryId) found.categoryId = "Required";
      found.curriculumId = "Required";
    }
    if (!parsed.ok) found.price = parsed.error;
    else if (parsed.paise <= 0) found.price = "The price must be more than zero";
    const effectiveFrom = fromLocalInput(from);
    const effectiveTo = fromLocalInput(to);
    if (effectiveFrom && effectiveTo && effectiveTo <= effectiveFrom) found.to = "Must be after the start";
    setErrors(found);
    if (Object.keys(found).length || !parsed.ok) return;
    try {
      if (rule) {
        await update.mutateAsync({
          id: rule.id,
          expectedRevision: rule.revision,
          sessionPricePaise: parsed.paise,
          isActive: active,
          ...(effectiveFrom && from !== toLocalInput(rule.effectiveFrom) ? { effectiveFrom } : {}),
          ...(to !== toLocalInput(rule.effectiveTo) ? { effectiveTo: effectiveTo ?? null } : {}),
        });
      } else {
        await create.mutateAsync({
          curriculumId: preset ? preset.curriculumId : offering!.curriculumId,
          facultyId: preset?.facultyId ?? null,
          sessionPricePaise: parsed.paise,
          isActive: active,
          ...(effectiveFrom ? { effectiveFrom } : {}),
          effectiveTo: effectiveTo ?? null,
        });
      }
      toast.success(rule ? "Price rule saved" : preset ? `Price set for ${preset.facultyName}` : "Price rule added");
      onClose();
    } catch (error) {
      const described = describeApiError(error, "manage prices");
      setStale(described.kind === "stale");
      setErrors({
        price: described.fields.sessionPricePaise ?? "",
        to: described.fields.effectiveTo ?? "",
        curriculumId: described.fields.curriculumId ?? "",
      });
      setFormError(described.message);
    }
  };

  const reload = async () => {
    await client.invalidateQueries({ queryKey: pricingKeys.rules() });
    onClose();
  };

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && requestClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>{rule ? "Edit price rule" : preset ? "Set tutor price" : "Add price rule"}</SheetTitle>
            <SheetDescription>Session price before GST, per 60-minute session.</SheetDescription>
          </SheetHeader>
          <form id={formId} onSubmit={submit} noValidate aria-busy={pending || undefined} className="flex flex-col gap-4 px-4">
            <TextField label="Tutor" readOnly value={tutorLabel} hint={!rule && !preset ? "Tutor prices are set from the Not priced rows in the table." : undefined} />
            {rule ? (
              <TextField label="Offering" readOnly value={`${rule.subjectName} · ${rule.pathLabel}`} />
            ) : preset ? (
              <TextField label="Offering" readOnly value={preset.offeringLabel} />
            ) : (
              <OfferingPicker
                offerings={offerings}
                value={choice}
                errors={errors}
                onChange={(next) => {
                  setChoice(next);
                  touch();
                }}
              />
            )}
            <TextField
              label="Session price (₹)"
              inputMode="decimal"
              required
              value={price}
              error={errors.price || undefined}
              hint={preset?.suggestedPaise ? "Pre-filled with the default price for this offering." : "Before GST."}
              onChange={(e) => {
                setPrice(e.target.value);
                touch();
              }}
            />
            <TextField label="GST rate" readOnly value={formatBps(gstBps)} hint="Will come from Settings later." />
            <div className="flex flex-col gap-1 rounded-md border p-3" aria-live="polite">
              <p className="text-xs text-muted-foreground">Estimated; final amounts are calculated on save</p>
              {preview ? (
                <>
                  <p className="text-sm">
                    GST {formatPaise(preview.gstPaise)} (CGST {formatPaise(preview.cgstPaise)} + SGST {formatPaise(preview.sgstPaise)})
                  </p>
                  <p className="text-base font-semibold">Student pays {formatPaise(preview.studentPaysPaise)}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Enter a session price to see GST and the student total.</p>
              )}
            </div>
            <TextField
              label="Effective from"
              type="datetime-local"
              value={from}
              hint={rule ? undefined : "Leave empty to start now."}
              onChange={(e) => {
                setFrom(e.target.value);
                touch();
              }}
            />
            <TextField
              label="Effective to"
              type="datetime-local"
              value={to}
              error={errors.to || undefined}
              hint="Leave empty for no end date."
              onChange={(e) => {
                setTo(e.target.value);
                touch();
              }}
            />
            <CheckField
              label="Active"
              checked={active}
              onCheckedChange={(checked) => {
                setActive(checked === true);
                touch();
              }}
            />
            <FormError message={formError} />
            {stale && (
              <Button type="button" variant="outline" onClick={reload}>
                Reload prices
              </Button>
            )}
          </form>
          <SheetFooter className="flex-row justify-end border-t">
            <Button variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={pending}>
              {pending ? "Saving…" : rule ? "Save changes" : preset ? "Set price" : "Add price rule"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={confirming}
        title="Discard changes?"
        description="This price rule has unsaved changes."
        confirmLabel="Discard"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onClose();
        }}
      />
    </>
  );
}
