'use client';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api, queryString } from './client';
import type { PaginationMeta } from './contracts';

// Contract: amentorz-backend src/modules/pricing (pricing.routes.ts, pricing.dto.ts,
// pricing.service.ts, pricing.resolve.ts). GST and totals always come from the server.

export const priceAmountsSchema = z.object({
  currency: z.literal('INR'),
  durationMinutes: z.number(),
  sessionPricePaise: z.number(),
  gstRateBps: z.number(),
  gstPaise: z.number(),
  cgstPaise: z.number(),
  sgstPaise: z.number(),
  studentPaysPaise: z.number(),
});
export type PriceAmounts = z.infer<typeof priceAmountsSchema>;

export const priceRuleSchema = z.object({
  id: z.string(),
  curriculumId: z.string(),
  // faculty_profiles.id; null is the default price for all tutors
  facultyId: z.string().nullable(),
  facultyName: z.string().nullable(),
  categoryName: z.string(),
  boardName: z.string().nullable(),
  /** The subject, or the leaf of the category tree ("Class 11") */
  subjectName: z.string(),
  levelName: z.string().nullable(),
  /** The category path above it: "Academic › School › K-12 › CBSE › Physics" */
  pathLabel: z.string(),
  amounts: priceAmountsSchema,
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  isActive: z.boolean(),
  revision: z.number(),
  updatedAt: z.string(),
});
export type PriceRule = z.infer<typeof priceRuleSchema>;

export const resolveResultSchema = z.discriminatedUnion('available', [
  z.object({
    available: z.literal(true),
    matchedRuleId: z.string(),
    matchedOn: z.enum(['FACULTY', 'DEFAULT']),
    curriculumId: z.string(),
    facultyId: z.string().nullable(),
    amounts: priceAmountsSchema,
  }),
  z.object({ available: z.literal(false), reason: z.enum(['PRICE_NOT_CONFIGURED', 'INACTIVE_CATALOGUE']) }),
]);
export type ResolveResult = z.infer<typeof resolveResultSchema>;

export const quoteItemSchema = z.discriminatedUnion('available', [
  z.object({ index: z.number(), available: z.literal(true), min: priceAmountsSchema, max: priceAmountsSchema, curriculaMatched: z.number(), curriculaPriced: z.number() }),
  z.object({ index: z.number(), available: z.literal(false), reason: z.enum(['PRICE_NOT_CONFIGURED', 'NO_MATCHING_CURRICULUM']) }),
]);
export type QuoteItem = z.infer<typeof quoteItemSchema>;
export type QuoteRequestItem =
  | { curriculumId: string; facultyId?: string | null }
  | { categoryId: string; boardId?: string | null; subjectId: string; levelId: string; facultyId?: string | null };

export interface PriceRuleFilters {
  q?: string;
  categoryId?: string;
  subjectId?: string;
  facultyId?: string;
  isActive?: boolean;
  page: number;
  limit: number;
}
export interface CreatePriceRuleInput {
  curriculumId: string;
  facultyId: string | null;
  sessionPricePaise: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive: boolean;
}
export interface UpdatePriceRuleInput {
  id: string;
  expectedRevision: number;
  sessionPricePaise?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive?: boolean;
}
export interface BulkPriceChange {
  id: string;
  sessionPricePaise: number;
  expectedRevision: number;
}

export const pricingKeys = {
  all: () => ['pricing'] as const,
  rules: () => ['pricing', 'rules'] as const,
  list: (filters: PriceRuleFilters) => ['pricing', 'rules', filters] as const,
  resolve: (curriculumId: string, facultyId: string) => ['pricing', 'resolve', curriculumId, facultyId] as const,
  quote: (items: QuoteRequestItem[]) => ['pricing', 'quote', items] as const,
  awaiting: () => ['pricing', 'awaiting'] as const,
};

function listQuery({ page, limit, isActive, q, categoryId, subjectId, facultyId }: PriceRuleFilters) {
  return queryString({ page: String(page), limit: String(limit), q, categoryId, subjectId, facultyId, isActive: isActive === undefined ? undefined : String(isActive) });
}

export function usePriceRules(filters: PriceRuleFilters, enabled = true) {
  return useQuery({
    queryKey: pricingKeys.list(filters),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }): Promise<{ rules: PriceRule[]; meta?: PaginationMeta }> => {
      const body = await api<unknown>(`/admin/prices?${listQuery(filters)}`, { signal });
      return { rules: z.array(priceRuleSchema).parse(body.data), meta: body.meta };
    },
  });
}

function usePricingMutation<V, R>(fn: (input: V) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    meta: { inlineErrors: true },
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: pricingKeys.all() }),
        // The faculty list and drawer show each tutor's pricing state
        client.invalidateQueries({ queryKey: ['faculty'] }),
        // The category detail panel shows each leaf's default price
        client.invalidateQueries({ queryKey: ['category-tree'] }),
      ]),
  });
}
const send = (method: 'POST' | 'PUT', body: unknown) => ({ method, body: JSON.stringify(body) });

export function useCreatePriceRule() {
  return usePricingMutation(async (input: CreatePriceRuleInput) =>
    priceRuleSchema.parse((await api<unknown>('/admin/prices', send('POST', input))).data));
}
export function useUpdatePriceRule() {
  return usePricingMutation(async ({ id, ...input }: UpdatePriceRuleInput) =>
    priceRuleSchema.parse((await api<unknown>(`/admin/prices/${encodeURIComponent(id)}`, send('PUT', input))).data));
}
/** Deactivating is an update with isActive false; there is no separate endpoint. */
export function useDeactivatePriceRule() {
  const update = useUpdatePriceRule();
  return { ...update, mutateAsync: (rule: Pick<PriceRule, 'id' | 'revision'>) => update.mutateAsync({ id: rule.id, expectedRevision: rule.revision, isActive: false }) };
}
/** All or nothing: a 409 lists the rejected rows as errors["changes[i]"]. */
export function useBulkUpdatePrices() {
  return usePricingMutation(async (changes: BulkPriceChange[]) =>
    z.array(priceRuleSchema).parse((await api<unknown>('/admin/prices/bulk', send('PUT', { changes }))).data));
}

export function useResolvePrice(params: { curriculumId?: string; facultyId?: string }) {
  return useQuery({
    queryKey: pricingKeys.resolve(params.curriculumId ?? '', params.facultyId ?? ''),
    enabled: Boolean(params.curriculumId),
    queryFn: async ({ signal }) => {
      const query = queryString({ curriculumId: params.curriculumId, facultyId: params.facultyId });
      return resolveResultSchema.parse((await api<unknown>(`/prices/resolve?${query}`, { signal })).data);
    },
  });
}
/** Price ranges for the faculty registration screens (F4); POST, so it carries the CSRF token. */
export function usePriceQuote(items: QuoteRequestItem[]) {
  return useQuery({
    queryKey: pricingKeys.quote(items),
    enabled: items.length > 0,
    queryFn: async () => z.array(quoteItemSchema).parse((await api<unknown>('/prices/quote', send('POST', { items }))).data),
  });
}

/** GET /admin/prices/awaiting: approved tutors' subject cards with no active tutor price yet. */
export const awaitingPriceSchema = z.object({
  facultyId: z.string(),
  facultyName: z.string(),
  facultyEmail: z.string(),
  approvedAt: z.string().nullable(),
  curriculumId: z.string(),
  subject: z.string(),
  pathLabel: z.string(),
  categoryPath: z.array(z.string()),
  board: z.string().nullable(),
  level: z.string().nullable(),
  defaultPrice: priceAmountsSchema.nullable(),
});
export type AwaitingPrice = z.infer<typeof awaitingPriceSchema>;

export function useAwaitingPrices(enabled = true) {
  return useQuery({
    queryKey: pricingKeys.awaiting(),
    enabled,
    queryFn: async ({ signal }) =>
      z.array(awaitingPriceSchema).parse((await api<unknown>('/admin/prices/awaiting', { signal })).data),
  });
}
