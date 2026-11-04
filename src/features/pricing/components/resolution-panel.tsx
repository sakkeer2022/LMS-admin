"use client";
import { useId, useState } from 'react';
import { Disclosure, SelectField, Typography } from '@/components/ui';
import { PanelSkeleton } from '@/components/ui/dashboard-ui';
import type { Offering } from '@/lib/api/catalogue-tree';
import { useResolvePrice } from '@/lib/api/pricing';
import { formatBps, formatPaise } from '@/lib/currency/money';
import { OfferingPicker, chosenOffering, emptyChoice } from './offering-picker';

const reasons = {
  PRICE_NOT_CONFIGURED: 'No price is configured for this offering (no tutor rule and no default rule).',
  INACTIVE_CATALOGUE: 'This offering is not bookable: it, an ancestor or a master value is draft or archived.',
} as const;

/** LMS-59 "test resolution": shows exactly what GET /prices/resolve returns for a choice. */
export function ResolutionPanel({ tenant, offerings }: { tenant: string; offerings: readonly Offering[] }) {
  const id = useId();
  const [choice, setChoice] = useState(emptyChoice);
  const offering = chosenOffering(offerings, choice);
  const result = useResolvePrice(tenant, { curriculumId: offering?.curriculumId });
  return <Disclosure className="rounded border border-[var(--border)] bg-[var(--surface)] p-3" summary="Test price resolution">
    <div className="flex flex-col gap-3 pt-3">
      <Typography variant="body2" tone="muted">Pick a tutor and an offering to see the price a booking would use: the tutor&apos;s rule first, then the default rule.</Typography>
      <div className="grid gap-3 md:grid-cols-5">
        <SelectField label="Tutor" value="" disabled description="Default only until the faculty list exists.">
          <option value="">Default (all tutors)</option>
        </SelectField>
        <OfferingPicker idPrefix={id} offerings={offerings} value={choice} onChange={setChoice} />
      </div>
      <div aria-live="polite">
        {!offering ? null
          : result.isPending ? <PanelSkeleton rows={1} />
          : result.isError ? <Typography tone="danger">The price could not be resolved.</Typography>
          : !result.data.available ? <Typography tone="warning">{reasons[result.data.reason]}</Typography>
          : <dl className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {([
                ['Session price', formatPaise(result.data.amounts.sessionPricePaise)],
                [`GST ${formatBps(result.data.amounts.gstRateBps)}`, `${formatPaise(result.data.amounts.gstPaise)} (CGST ${formatPaise(result.data.amounts.cgstPaise)} + SGST ${formatPaise(result.data.amounts.sgstPaise)})`],
                ['Student pays', formatPaise(result.data.amounts.studentPaysPaise)],
                ['Matched on', result.data.matchedOn === 'DEFAULT' ? 'Default rule' : 'Tutor rule'],
                ['Rule', result.data.matchedRuleId.slice(0, 8)],
              ] as const).map(([label, value]) => <div key={label} className="flex flex-col">
                <Typography variant="caption" tone="muted" component="dt">{label}</Typography>
                <Typography variant="body2" component="dd">{value}</Typography>
              </div>)}
            </dl>}
      </div>
    </div>
  </Disclosure>;
}
