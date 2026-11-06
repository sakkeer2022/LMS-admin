import type { AwaitingPrice } from "@/lib/api/pricing";
import type { TutorPricePreset } from "./price-rule-drawer";

// Screen 29: a tutor's subject cards that still need a tutor price (GET /admin/prices/awaiting)
// are listed as "Not priced" rows at the top of the price rules table. Pure helpers, unit tested.

/** Row key for a "Not priced" row; never collides with a price rule id (a uuid). */
export function awaitingKey(card: Pick<AwaitingPrice, "facultyId" | "curriculumId">) {
  return `new:${card.facultyId}:${card.curriculumId}`;
}

/** The drawer preset for setting one card's price from the row's "…" menu. */
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
 * The "Not priced" rows the table shows with the current filters. They have no rule yet, so
 * they appear on the first page only, never under "Inactive", and are filtered here the way
 * the server filters rules: search on tutor and category, category on the top-level name
 * (`category` null = a category is chosen but its name is not known yet, so nothing matches).
 */
export function visibleAwaiting(
  cards: readonly AwaitingPrice[],
  filters: { page: number; status: string; q?: string; category?: string | null },
): AwaitingPrice[] {
  if (filters.page !== 1 || filters.status === "inactive" || filters.category === null) return [];
  const q = filters.q?.trim().toLowerCase();
  return cards.filter(
    (card) =>
      (!filters.category || card.categoryPath[0] === filters.category) &&
      (!q || [card.facultyName, card.subject, card.pathLabel].some((text) => text.toLowerCase().includes(q))),
  );
}
