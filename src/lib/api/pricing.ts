'use client';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api, queryString } from './client';
import { catalogueKeys } from './catalogue';
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
  subjectName: z.string(),
  levelName: z.string(),
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
  all: (tenant: string) => ['pricing', tenant] as const,
  rules: (tenant: string) => ['pricing', tenant, 'rules'] as const,
  list: (tenant: string, filters: PriceRuleFilters) => ['pricing', tenant, 'rules', filters] as const,
  resolve: (tenant: string, curriculumId: string, facultyId: string) => ['pricing', tenant, 'resolve', curriculumId, facultyId] as const,
  quote: (tenant: string, items: QuoteRequestItem[]) => ['pricing', tenant, 'quote', items] as const,
};

function listQuery({ page, limit, isActive, q, categoryId, subjectId, facultyId }: PriceRuleFilters) {
  return queryString({ page: String(page), limit: String(limit), q, categoryId, subjectId, facultyId, isActive: isActive === undefined ? undefined : String(isActive) });
}

export function usePriceRules(tenant: string, filters: PriceRuleFilters, enabled = true) {
  return useQuery({
    queryKey: pricingKeys.list(tenant, filters),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }): Promise<{ rules: PriceRule[]; meta?: PaginationMeta }> => {
      const body = await api<unknown>(`/admin/prices?${listQuery(filters)}`, { signal });
      return { rules: z.array(priceRuleSchema).parse(body.data), meta: body.meta };
    },
  });
}

function usePricingMutation<V, R>(tenant: string, fn: (input: V) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    meta: { inlineErrors: true },
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: pricingKeys.all(tenant) }),
        // The catalogue detail panel shows each leaf's default price
        client.invalidateQueries({ queryKey: catalogueKeys.nodes(tenant) }),
      ]),
  });
}
const send = (method: 'POST' | 'PUT', body: unknown) => ({ method, body: JSON.stringify(body) });

export function useCreatePriceRule(tenant: string) {
  return usePricingMutation(tenant, async (input: CreatePriceRuleInput) =>
    priceRuleSchema.parse((await api<unknown>('/admin/prices', send('POST', input))).data));
}
export function useUpdatePriceRule(tenant: string) {
  return usePricingMutation(tenant, async ({ id, ...input }: UpdatePriceRuleInput) =>
    priceRuleSchema.parse((await api<unknown>(`/admin/prices/${encodeURIComponent(id)}`, send('PUT', input))).data));
}
/** Deactivating is an update with isActive false; there is no separate endpoint. */
export function useDeactivatePriceRule(tenant: string) {
  const update = useUpdatePriceRule(tenant);
  return { ...update, mutateAsync: (rule: Pick<PriceRule, 'id' | 'revision'>) => update.mutateAsync({ id: rule.id, expectedRevision: rule.revision, isActive: false }) };
}
/** All or nothing: a 409 lists the rejected rows as errors["changes[i]"]. */
export function useBulkUpdatePrices(tenant: string) {
  return usePricingMutation(tenant, async (changes: BulkPriceChange[]) =>
    z.array(priceRuleSchema).parse((await api<unknown>('/admin/prices/bulk', send('PUT', { changes }))).data));
}

export function useResolvePrice(tenant: string, params: { curriculumId?: string; facultyId?: string }) {
  return useQuery({
    queryKey: pricingKeys.resolve(tenant, params.curriculumId ?? '', params.facultyId ?? ''),
    enabled: Boolean(params.curriculumId),
    queryFn: async ({ signal }) => {
      const query = queryString({ curriculumId: params.curriculumId, facultyId: params.facultyId });
      return resolveResultSchema.parse((await api<unknown>(`/prices/resolve?${query}`, { signal })).data);
    },
  });
}
/** Price ranges for the faculty registration screens (F4); POST, so it carries the CSRF token. */
export function usePriceQuote(tenant: string, items: QuoteRequestItem[]) {
  return useQuery({
    queryKey: pricingKeys.quote(tenant, items),
    enabled: items.length > 0,
    queryFn: async () => z.array(quoteItemSchema).parse((await api<unknown>('/prices/quote', send('POST', { items }))).data),
  });
}
