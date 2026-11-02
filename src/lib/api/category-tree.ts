'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api, queryString } from './client';
import { applyRelocation, applyRename, applyReorder, relocation, type Placement } from './category-tree-model';

// Contract: amentorz-backend src/modules/category-tree (category-tree.routes.ts,
// category-tree.dto.ts, category-tree.reads.ts), ADR-0005. Lives in lib because the
// admin tree and the learner catalogue (different features) both use it.

const node = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  code: z.string(),
  name: z.string(),
  path: z.string(),
  depth: z.number(),
  isBookable: z.boolean(),
  requiresBoard: z.boolean(),
  requiresLevel: z.boolean(),
  isActive: z.boolean(),
  displayOrder: z.number(),
  version: z.number(),
  childrenCount: z.number(),
  curriculaCount: z.number(),
  subtreeCurriculaCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CategoryNode = z.infer<typeof node>;

export const categoryTreeSchema = z.object({
  nodes: z.array(node),
  stats: z.object({ categories: z.number(), bookableLeaves: z.number(), curricula: z.number() }),
  generatedAt: z.string(),
});
export type CategoryTree = z.infer<typeof categoryTreeSchema>;

export const categoryDetailSchema = node.omit({ subtreeCurriculaCount: true }).extend({
  description: z.string().nullable(),
  breadcrumb: z.array(z.object({ id: z.string(), name: z.string(), path: z.string() })),
  allowedLevels: z.array(z.object({ id: z.string(), code: z.string(), name: z.string(), isActive: z.boolean() })),
  activeCurriculaCount: z.number(),
  studentCount: z.number(),
  descendantCount: z.number(),
});
export type CategoryDetail = z.infer<typeof categoryDetailSchema>;

const named = z.object({ id: z.string(), name: z.string() });
export const offeringSchema = z.object({
  curriculumId: z.string(),
  categoryId: z.string(),
  subject: named,
  board: named.nullable(),
  level: named.nullable(),
  isActive: z.boolean(),
});
export type Offering = z.infer<typeof offeringSchema>;

const lookup = z.object({ id: z.string(), code: z.string(), name: z.string(), isActive: z.boolean(), sortOrder: z.number() });
export type Lookup = z.infer<typeof lookup>;

async function getData<T>(schema: z.ZodType<T>, path: string, signal?: AbortSignal) {
  return schema.parse((await api<unknown>(path, { signal })).data);
}
const json = (method: 'POST' | 'PUT' | 'PATCH', body: unknown) => ({ method, body: JSON.stringify(body) });
const base = '/admin/category-tree';
const at = (id: string) => `${base}/${encodeURIComponent(id)}`;

export const categoryTreeKeys = {
  all: (tenant: string) => ['category-tree', tenant] as const,
  tree: (tenant: string) => ['category-tree', tenant, 'tree'] as const,
  detail: (tenant: string, id: string) => ['category-tree', tenant, 'detail', id] as const,
  offerings: (tenant: string, id: string) => ['category-tree', tenant, 'offerings', id] as const,
  lookups: (tenant: string, kind: 'levels' | 'boards' | 'subjects') => ['category-tree', tenant, 'lookups', kind] as const,
};

/**
 * The whole tree, loaded once per admin session: it never goes stale on its own and
 * is refreshed only after a write (or the Refresh button). The server caches it too.
 */
export function useCategoryTree(tenant: string, enabled = true) {
  return useQuery({
    queryKey: categoryTreeKeys.tree(tenant),
    enabled,
    staleTime: Infinity,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => getData(categoryTreeSchema, base, signal),
  });
}

export function useCategoryDetail(tenant: string, id: string | undefined) {
  return useQuery({
    queryKey: categoryTreeKeys.detail(tenant, id ?? ''),
    enabled: Boolean(id),
    queryFn: ({ signal }) => getData(categoryDetailSchema, at(id!), signal),
  });
}

export function useOfferings(tenant: string, id: string | undefined) {
  return useQuery({
    queryKey: categoryTreeKeys.offerings(tenant, id ?? ''),
    enabled: Boolean(id),
    queryFn: ({ signal }) => getData(z.array(offeringSchema), `${at(id!)}/offerings`, signal),
  });
}

/** Lookup lists for the forms (board, level and subject are managed on their own screens). */
export function useLookup(tenant: string, kind: 'levels' | 'boards' | 'subjects', enabled = true) {
  const path = kind === 'levels' ? '/admin/catalogue/levels' : `/admin/catalogue/${kind}`;
  return useQuery({
    queryKey: categoryTreeKeys.lookups(tenant, kind),
    enabled,
    staleTime: 10 * 60_000,
    queryFn: ({ signal }) => getData(z.array(lookup), `${path}?${queryString({ limit: '100' })}`, signal),
  });
}

/**
 * Every write: optional optimistic edit of the cached tree, rollback on failure, and a
 * refetch of the tree and the affected detail once settled (server is authoritative).
 */
function useTreeMutation<V, R>(
  tenant: string,
  fn: (input: V) => Promise<R>,
  optimistic?: (nodes: CategoryNode[], input: V) => CategoryNode[]
) {
  const client = useQueryClient();
  const key = categoryTreeKeys.tree(tenant);
  return useMutation({
    mutationFn: fn,
    meta: { inlineErrors: true },
    onMutate: async (input: V) => {
      if (!optimistic) return { previous: undefined };
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<CategoryTree>(key);
      if (previous) client.setQueryData<CategoryTree>(key, { ...previous, nodes: optimistic(previous.nodes, input) });
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
    },
    onSettled: () => client.invalidateQueries({ queryKey: categoryTreeKeys.all(tenant) }),
  });
}

export const useCreateCategory = (tenant: string) =>
  useTreeMutation(tenant, async ({ parentId, code, name }: { parentId: string | null; code: string; name: string }) =>
    categoryDetailSchema.parse((await api<unknown>(parentId ? `${at(parentId)}/children` : `${base}/roots`, json('POST', { code, name }))).data));

export const useUpdateCategory = (tenant: string) =>
  useTreeMutation(
    tenant,
    async ({ id, ...body }: { id: string; version: number; name?: string; code?: string; isActive?: boolean }) =>
      categoryDetailSchema.parse((await api<unknown>(at(id), json('PATCH', body))).data),
    (nodes, { id, name, isActive }) => applyRename(nodes, id, { ...(name !== undefined && { name }), ...(isActive !== undefined && { isActive }) })
  );

export const useSaveLeafSettings = (tenant: string) =>
  useTreeMutation(tenant, async ({ id, ...body }: { id: string; version: number; isBookable: boolean; requiresBoard: boolean; requiresLevel: boolean; levelIds: string[] }) =>
    categoryDetailSchema.parse((await api<unknown>(`${at(id)}/leaf-settings`, json('PUT', body))).data));

export const useReorderCategories = (tenant: string) =>
  useTreeMutation(
    tenant,
    async (body: { parentId: string | null; orderedIds: string[] }) => (await api<unknown>(`${base}/reorder`, json('PUT', body))).data,
    (nodes, { orderedIds }) => applyReorder(nodes, orderedIds)
  );

export type Relocation = ReturnType<typeof relocation>;

/**
 * A drop in reorder mode: a reorder within the same parent, or a move to a position under
 * another parent (one transaction on the server). The caller works out `change` from the
 * tree it shows (relocation()); the tree updates at once and rolls back if the server refuses.
 */
export const useRelocateCategory = (tenant: string) =>
  useTreeMutation(
    tenant,
    async ({ node, change }: { node: CategoryNode; to: Placement; change: Relocation }) => {
      if (change.kind === 'reorder') await api<unknown>(`${base}/reorder`, json('PUT', { parentId: change.parentId, orderedIds: change.orderedIds }));
      if (change.kind === 'move') await api<unknown>(`${at(node.id)}/move`, json('PUT', { version: node.version, parentId: change.parentId, index: change.index }));
      return change.kind;
    },
    (nodes, { node, to, change }) => (change.kind === 'none' ? nodes : applyRelocation(nodes, node.id, to))
  );

export const useDeleteCategory = (tenant: string) =>
  useTreeMutation(tenant, async ({ id, version }: { id: string; version: number }) => {
    await api<null>(`${at(id)}?${queryString({ version: String(version) })}`, { method: 'DELETE' });
  });

export const useAddOffering = (tenant: string) =>
  useTreeMutation(tenant, async ({ categoryId, ...body }: { categoryId: string; subjectId: string; boardId: string | null; levelId: string | null }) =>
    offeringSchema.parse((await api<unknown>(`${at(categoryId)}/offerings`, json('POST', body))).data));

export const useSetOfferingActive = (tenant: string) =>
  useTreeMutation(tenant, async ({ curriculumId, isActive }: { curriculumId: string; isActive: boolean }) =>
    offeringSchema.parse((await api<unknown>(`${base}/offerings/${encodeURIComponent(curriculumId)}`, json('PATCH', { isActive }))).data));
