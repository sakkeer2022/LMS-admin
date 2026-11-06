"use client";
import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Skeleton } from "@/components/shadcn/skeleton";
import type { PickerOffering } from "@/lib/api/offering-tree";
import { useResolvePrice } from "@/lib/api/pricing";
import { formatBps, formatPaise } from "@/lib/currency/money";
import { cn } from "@/lib/utils";
import { OfferingPicker, chosenOffering, emptyChoice } from "./offering-picker";

const reasons = {
  PRICE_NOT_CONFIGURED: "No price is configured for this offering (no tutor rule and no default rule).",
  INACTIVE_CATALOGUE: "This offering is not bookable: it, an ancestor or a master value is draft or archived.",
} as const;

/** LMS-59 "test resolution": shows exactly what GET /prices/resolve returns for a choice. */
export function ResolutionPanel({ offerings }: { offerings: readonly PickerOffering[] }) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(emptyChoice);
  const offering = chosenOffering(offerings, choice);
  const result = useResolvePrice({ curriculumId: open ? offering?.curriculumId : undefined });
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="py-3">
        <CardTitle>
          <Button variant="ghost" className="-ml-3" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <ChevronDownIcon className={cn("transition-transform", !open && "-rotate-90")} aria-hidden="true" />
            Test price resolution
          </Button>
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="flex flex-col gap-3 pb-4">
          <p className="text-sm text-muted-foreground">
            Pick an offering to see the default price a booking would use. A tutor&apos;s own price, when set, takes precedence.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <OfferingPicker offerings={offerings} value={choice} onChange={setChoice} />
          </div>
          <div aria-live="polite">
            {!offering ? null : result.isPending ? (
              <Skeleton className="h-10 w-full" />
            ) : result.isError ? (
              <p className="text-sm text-error-foreground">The price could not be resolved.</p>
            ) : !result.data.available ? (
              <p className="text-sm text-warning-foreground">{reasons[result.data.reason]}</p>
            ) : (
              <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {(
                  [
                    ["Session price", formatPaise(result.data.amounts.sessionPricePaise)],
                    [
                      `GST ${formatBps(result.data.amounts.gstRateBps)}`,
                      `${formatPaise(result.data.amounts.gstPaise)} (CGST ${formatPaise(result.data.amounts.cgstPaise)} + SGST ${formatPaise(result.data.amounts.sgstPaise)})`,
                    ],
                    ["Student pays", formatPaise(result.data.amounts.studentPaysPaise)],
                    ["Matched on", result.data.matchedOn === "DEFAULT" ? "Default rule" : "Tutor rule"],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
