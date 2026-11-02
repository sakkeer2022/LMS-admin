'use client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { api, queryString } from './client';

// Contract: amentorz-backend /catalogue/category-tree (ADR-0005), public and behind the
// catalogue.category_tree feature flag (404 FEATURE_DISABLED while it is off).

const learnerNode = z.object({ id: z.string(), code: z.string(), name: z.string(), path: z.string(), isLeaf: z.boolean() });
export type LearnerNode = z.infer<typeof learnerNode>;
const option = z.object({ id: z.string(), name: z.string() });
export const learnerLeafSchema = learnerNode.extend({
  breadcrumb: z.array(option),
  requiresBoard: z.boolean(),
  requiresLevel: z.boolean(),
  boards: z.array(option),
  levels: z.array(option),
  subjects: z.array(option),
});
export type LearnerLeaf = z.infer<typeof learnerLeafSchema>;
export const bookableOfferingSchema = z.object({
  curriculumId: z.string(),
  categoryId: z.string(),
  categoryPath: z.string(),
  subjectId: z.string(),
  boardId: z.string().nullable(),
  levelId: z.string().nullable(),
});
export type BookableOffering = z.infer<typeof bookableOfferingSchema>;

const base = '/catalogue/category-tree';
const keys = {
  children: (tenant: string, parentId: string | null) => ['learner-catalogue', tenant, 'children', parentId ?? 'root'] as const,
  leaf: (tenant: string, id: string, boardId: string, levelId: string) => ['learner-catalogue', tenant, 'leaf', id, boardId, levelId] as const,
};

export function useLearnerChildren(tenant: string, parentId: string | null) {
  return useQuery({
    queryKey: keys.children(tenant, parentId),
    staleTime: 60_000,
    retry: false,
    queryFn: async ({ signal }) =>
      z.array(learnerNode).parse((await api<unknown>(`${base}/children?${queryString({ parentId: parentId ?? undefined })}`, { signal })).data),
  });
}

/** The leaf and its options; subjects narrow to the chosen board and level. */
export function useLearnerLeaf(tenant: string, id: string | undefined, choice: { boardId?: string; levelId?: string }) {
  return useQuery({
    queryKey: keys.leaf(tenant, id ?? '', choice.boardId ?? '', choice.levelId ?? ''),
    enabled: Boolean(id),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) =>
      learnerLeafSchema.parse((await api<unknown>(`${base}/leaves/${encodeURIComponent(id!)}?${queryString(choice)}`, { signal })).data),
  });
}

/** The check a booking makes: the choice resolves to an active offering, or a typed error. */
export async function resolveOffering(leafId: string, choice: { subjectId: string; boardId?: string; levelId?: string }) {
  return bookableOfferingSchema.parse((await api<unknown>(`${base}/leaves/${encodeURIComponent(leafId)}/offering?${queryString(choice)}`)).data);
}
