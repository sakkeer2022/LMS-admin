"use client";
import { useId, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Checkbox, ConfirmDialog, Drawer, Form, FormError, Label, SelectField, SubmitButton, TextField, Typography } from '@/components/ui';
import type { Offering } from '@/lib/api/catalogue-tree';
import { describeApiError } from '@/lib/api/errors';
import { pricingKeys, useCreatePriceRule, useUpdatePriceRule, type PriceRule } from '@/lib/api/pricing';
import { formatBps, formatPaise, paiseToRupeesInput, parseRupeesToPaise, previewStudentPays } from '@/lib/currency/money';
import { fromLocalInput, toLocalInput } from '../schemas/pricing';
import { OfferingPicker, chosenOffering, emptyChoice, type OfferingChoice } from './offering-picker';

/** 18% until the GST setting (LMS-90) exists; the server applies it, this is display only. */
const DEFAULT_GST_BPS = 1800;

/** Add or edit a price rule (screen 29). Amounts are typed in rupees and sent as paise. */
export function PriceRuleDrawer({ tenant, rule, offerings, onClose }: {
  tenant: string; rule?: PriceRule; offerings: readonly Offering[]; onClose: () => void;
}) {
  const formId = useId();
  const client = useQueryClient();
  const [choice, setChoice] = useState<OfferingChoice>(emptyChoice);
  const [price, setPrice] = useState(rule ? paiseToRupeesInput(rule.amounts.sessionPricePaise) : '');
  const [from, setFrom] = useState(toLocalInput(rule?.effectiveFrom ?? null));
  const [to, setTo] = useState(toLocalInput(rule?.effectiveTo ?? null));
  const [active, setActive] = useState(rule?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [stale, setStale] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const create = useCreatePriceRule(tenant);
  const update = useUpdatePriceRule(tenant);
  const pending = create.isPending || update.isPending;

  const gstBps = rule?.amounts.gstRateBps ?? DEFAULT_GST_BPS;
  const parsed = parseRupeesToPaise(price);
  const preview = parsed.ok && parsed.paise > 0 ? previewStudentPays(parsed.paise, gstBps) : null;
  const touch = () => { setDirty(true); setFormError(undefined); };
  const requestClose = () => (dirty ? setConfirming(true) : onClose());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    const offering = rule ? undefined : chosenOffering(offerings, choice);
    if (!rule && !offering) for (const key of ['categoryId', 'boardId', 'subjectId', 'levelId'] as const) if (!choice[key]) found[key] = 'Required';
    if (!rule && !offering && Object.keys(found).length === 0) found.levelId = 'This combination is not in the catalogue';
    if (!parsed.ok) found.price = parsed.error;
    else if (parsed.paise <= 0) found.price = 'The price must be more than zero';
    const effectiveFrom = fromLocalInput(from);
    const effectiveTo = fromLocalInput(to);
    if (effectiveFrom && effectiveTo && effectiveTo <= effectiveFrom) found.to = 'Must be after the start';
    setErrors(found);
    if (Object.keys(found).length || !parsed.ok) return;
    try {
      if (rule) {
        await update.mutateAsync({
          id: rule.id, expectedRevision: rule.revision, sessionPricePaise: parsed.paise, isActive: active,
          ...(effectiveFrom && from !== toLocalInput(rule.effectiveFrom) ? { effectiveFrom } : {}),
          ...(to !== toLocalInput(rule.effectiveTo) ? { effectiveTo: effectiveTo ?? null } : {}),
        });
      } else {
        await create.mutateAsync({ curriculumId: offering!.curriculumId, facultyId: null, sessionPricePaise: parsed.paise, isActive: active, ...(effectiveFrom ? { effectiveFrom } : {}), effectiveTo: effectiveTo ?? null });
      }
      toast.success(rule ? 'Price rule saved' : 'Price rule added');
      onClose();
    } catch (error) {
      const described = describeApiError(error, 'manage prices');
      setStale(described.kind === 'stale');
      setErrors({
        price: described.fields.sessionPricePaise ?? '',
        to: described.fields.effectiveTo ?? '',
        levelId: described.fields.curriculumId ?? '',
      });
      setFormError(described.message);
    }
  };

  const reload = async () => {
    await client.invalidateQueries({ queryKey: pricingKeys.rules(tenant) });
    onClose();
  };

  return <>
    <Drawer open onClose={requestClose} title={rule ? 'Edit price rule' : 'Add price rule'} footer={<>
      <Button onClick={requestClose}>Cancel</Button>
      <SubmitButton form={formId} pending={pending} pendingLabel="Saving…">{rule ? 'Save changes' : 'Add price rule'}</SubmitButton>
    </>}>
      <Form id={formId} onSubmit={submit} pending={pending} noValidate>
        <SelectField label="Tutor" value="" disabled
          description="Tutor-specific prices need the faculty list, which the backend does not provide yet.">
          <option value="">{rule?.facultyName ?? 'Default (all tutors)'}</option>
        </SelectField>
        {rule
          ? <TextField label="Offering" readOnly value={[rule.categoryName, rule.boardName, rule.subjectName, rule.levelName].filter(Boolean).join(' › ')} />
          : <OfferingPicker idPrefix={formId} offerings={offerings} value={choice} errors={errors} onChange={(next) => { setChoice(next); touch(); }} />}
        <TextField label="Session price (₹)" inputMode="decimal" required value={price} error={errors.price || undefined}
          onChange={(e) => { setPrice(e.target.value); touch(); }} description="Before GST, per 60-minute session." />
        <TextField label="GST rate" readOnly value={formatBps(gstBps)} description="Will come from Settings later." />
        <div className="flex flex-col gap-1 rounded border border-[var(--border)] p-3" aria-live="polite">
          <Typography variant="caption" tone="muted" component="p">Estimated; final amounts are calculated on save</Typography>
          {preview
            ? <>
                <Typography variant="body2">GST {formatPaise(preview.gstPaise)} (CGST {formatPaise(preview.cgstPaise)} + SGST {formatPaise(preview.sgstPaise)})</Typography>
                <Typography variant="subtitle1">Student pays {formatPaise(preview.studentPaysPaise)}</Typography>
              </>
            : <Typography variant="body2" tone="muted">Enter a session price to see GST and the student total.</Typography>}
        </div>
        <TextField label="Effective from" type="datetime-local" value={from} onChange={(e) => { setFrom(e.target.value); touch(); }}
          description={rule ? undefined : 'Leave empty to start now.'} />
        <TextField label="Effective to" type="datetime-local" value={to} onChange={(e) => { setTo(e.target.value); touch(); }}
          error={errors.to || undefined} description="Leave empty for no end date." />
        <Label className="flex items-center gap-2">
          <Checkbox checked={active} onChange={(e) => { setActive(e.target.checked); touch(); }} />
          Active
        </Label>
        <FormError message={formError} />
        {stale && <Button onClick={reload}>Reload prices</Button>}
      </Form>
    </Drawer>
    {confirming && <ConfirmDialog title="Discard changes?" confirmLabel="Discard" cancelLabel="Keep editing" destructive
      onCancel={() => setConfirming(false)} onConfirm={() => { setConfirming(false); onClose(); }}>
      <Typography>This price rule has unsaved changes.</Typography>
    </ConfirmDialog>}
  </>;
}
