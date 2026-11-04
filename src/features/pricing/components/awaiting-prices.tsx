"use client";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Skeleton } from "@/components/shadcn/skeleton";
import { PanelMessage } from "@/components/layout/panel-message";
import { describeApiError } from "@/lib/api/errors";
import { useAwaitingPrices, type AwaitingPrice } from "@/lib/api/pricing";
import { formatPaise } from "@/lib/currency/money";
import type { TutorPricePreset } from "./price-rule-drawer";

/** Groups awaiting cards by tutor, keeping the server's order (oldest approval first). */
export function groupByTutor(rows: readonly AwaitingPrice[]) {
  const groups = new Map<string, { facultyId: string; facultyName: string; facultyEmail: string; cards: AwaitingPrice[] }>();
  for (const row of rows) {
    const group = groups.get(row.facultyId) ?? { facultyId: row.facultyId, facultyName: row.facultyName, facultyEmail: row.facultyEmail, cards: [] };
    group.cards.push(row);
    groups.set(row.facultyId, group);
  }
  return [...groups.values()];
}

export function presetFor(card: AwaitingPrice): TutorPricePreset {
  return {
    facultyId: card.facultyId,
    facultyName: card.facultyName,
    curriculumId: card.curriculumId,
    offeringLabel: `${card.pathLabel} › ${card.subject}`,
    suggestedPaise: card.defaultPrice?.sessionPricePaise ?? null,
  };
}

/**
 * Screen 29 "new price entries": every approved tutor's subject cards (from onboarding)
 * that have no tutor price yet. The tutor cannot sign in until each card is priced.
 */
export function AwaitingPrices({ canManage, onSetPrice }: { canManage: boolean; onSetPrice: (preset: TutorPricePreset) => void }) {
  const query = useAwaitingPrices();
  if (query.isSuccess && query.data.length === 0) return null;
  const groups = groupByTutor(query.data ?? []);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Awaiting tutor price
          {query.data && <Badge variant="warning">{query.data.length}</Badge>}
        </CardTitle>
        <CardDescription>
          Approved tutors&apos; subject cards from onboarding. A tutor can sign in once every card has a price.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {query.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : query.isError ? (
          <PanelMessage onRetry={() => void query.refetch()}>
            {describeApiError(query.error, "view pricing").message || "Awaiting prices could not be loaded."}
          </PanelMessage>
        ) : (
          groups.map((group) => (
            <section key={group.facultyId} aria-label={group.facultyName} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="text-sm font-semibold">{group.facultyName}</h3>
                <span className="text-xs text-muted-foreground">{group.facultyEmail}</span>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {group.cards.map((card) => (
                  <li key={card.curriculumId} className="flex items-start justify-between gap-3 rounded-md border bg-card p-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-semibold">{card.subject}</span>
                      <span className="text-xs break-words text-muted-foreground">{card.pathLabel}</span>
                      <span className="text-xs text-text-secondary">
                        {card.defaultPrice ? `Default ${formatPaise(card.defaultPrice.sessionPricePaise)}` : "No default price"}
                      </span>
                    </div>
                    {canManage && (
                      <Button size="sm" onClick={() => onSetPrice(presetFor(card))} aria-label={`Set price for ${group.facultyName}, ${card.subject}`}>
                        Set price
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  );
}
