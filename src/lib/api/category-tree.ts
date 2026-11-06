'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api, queryString } from './client';
import { applyRelocation, applyRename, applyReorder, relocation, type Placement } from './category-tree-model';

// Contract: amentorz-backend src/modules/category-tree (category-tree.routes.ts,
// category-tree.dto.ts, category-tree.reads.ts), ADR-0005. The admin manages only the
// tree: names, order, active state. A category without sub-categories is a leaf, the
// thing tutors pick on onboarding (migration 20261105090000_category_simple_leaves).

const node = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  code: z.string(),
  name: z.string(),
  path: z.string(),
  depth: z.number(),
  /** No sub-categories: the category tutors and learners choose */
  isLeaf: z.boolean(),
  isActive: z.boolean(),
  displayOrder: z.number(),
  version: z.number(),
  childrenCount: z.number(),
  /** Tutors teaching a leaf (0 for a category with sub-categories) */
  tutorCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CategoryNode = z.infer<typeof node>;

export const categoryTreeSchema = z.object({
  nodes: z.array(node),
  stats: z.object({ categories: z.number(), leaves: z.number() }),
  generatedAt: z.string(),
});
export type CategoryTree = z.infer<typeof categoryTreeSchema>;

export const categoryDetailSchema = node.extend({
  description: z.string().nullable(),
  breadcrumb: z.array(z.object({ id: z.string(), name: z.string(), path: z.string() })),
  descendantCount: z.number(),
});
export type CategoryDetail = z.infer<typeof categoryDetailSchema>;

const lookup = z.object({ id: z.string(), code: z.string(), name: z.string(), isActive: z.boolean(), sortOrder: z.number() });
export type Lookup = z.infer<typeof lookup>;

async function getData<T>(schema: z.ZodType<T>, path: string, signal?: AbortSignal) {
  return schema.parse((await api<unknown>(path, { signal })).data);
}
const json = (method: 'POST' | 'PUT' | 'PATCH', body: unknown) => ({ method, body: JSON.stringify(body) });
const base = '/admin/category-tree';
const at = (id: string) => `${base}/${encodeURIComponent(id)}`;

export const categoryTreeKeys = {
  all: () => ['category-tree'] as const,
  tree: () => ['category-tree', 'tree'] as const,
  detail: (id: string) => ['category-tree', 'detail', id] as const,
  lookups: (kind: 'levels' | 'boards' | 'subjects') => ['category-tree', 'lookups', kind] as const,
};

/**
 * The whole tree, loaded once per admin session: it never goes stale on its own and
 * is refreshed only after a write (or the Refresh button). The server caches it too.
 */
export function useCategoryTree(enabled = true) {
  return useQuery({
    queryKey: categoryTreeKeys.tree(),
    enabled,
    staleTime: Infinity,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => getData(categoryTreeSchema, base, signal),
  });
}

export function useCategoryDetail(id: string | undefined) {
  return useQuery({
    queryKey: categoryTreeKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: ({ signal }) => getData(categoryDetailSchema, at(id!), signal),
  });
}

/** Lookup lists (board, level and subject), used by the pricing filters. */
export function useLookup(kind: 'levels' | 'boards' | 'subjects', enabled = true) {
  const path = kind === 'levels' ? '/admin/catalogue/levels' : `/admin/catalogue/${kind}`;
  return useQuery({
    queryKey: categoryTreeKeys.lookups(kind),
    enabled,
    staleTime: 10 * 60_000,
    queryFn: ({ signal }) => getData(z.array(lookup), `${path}?${queryString({ limit: '100' })}`, signal),
  });
}

/**
 * Every write: optional optimistic edit of the cached tree, rollback on failure, and a
 * refetch of the tree and the affected detail once settled (server is authoritative).
 */
function useTreeMutation<V, R>(fn: (input: V) => Promise<R>,
  optimistic?: (nodes: CategoryNode[], input: V) => CategoryNode[]
) {
  const client = useQueryClient();
  const key = categoryTreeKeys.tree();
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
    onSettled: () => client.invalidateQueries({ queryKey: categoryTreeKeys.all() }),
  });
}

export const useCreateCategory = () =>
  useTreeMutation(async ({ parentId, code, name }: { parentId: string | null; code: string; name: string }) =>
    categoryDetailSchema.parse((await api<unknown>(parentId ? `${at(parentId)}/children` : `${base}/roots`, json('POST', { code, name }))).data));

export const useUpdateCategory = () =>
  useTreeMutation(async ({ id, ...body }: { id: string; version: number; name?: string; code?: string; isActive?: boolean }) =>
      categoryDetailSchema.parse((await api<unknown>(at(id), json('PATCH', body))).data),
    (nodes, { id, name, isActive }) => applyRename(nodes, id, { ...(name !== undefined && { name }), ...(isActive !== undefined && { isActive }) })
  );

export const useReorderCategories = () =>
  useTreeMutation(async (body: { parentId: string | null; orderedIds: string[] }) => (await api<unknown>(`${base}/reorder`, json('PUT', body))).data,
    (nodes, { orderedIds }) => applyReorder(nodes, orderedIds)
  );

export type Relocation = ReturnType<typeof relocation>;

/**
 * A drop in reorder mode: a reorder within the same parent, or a move to a position under
 * another parent (one transaction on the server). The caller works out `change` from the
 * tree it shows (relocation()); the tree updates at once and rolls back if the server refuses.
 */
export const useRelocateCategory = () =>
  useTreeMutation(async ({ node, change }: { node: CategoryNode; to: Placement; change: Relocation }) => {
      if (change.kind === 'reorder') await api<unknown>(`${base}/reorder`, json('PUT', { parentId: change.parentId, orderedIds: change.orderedIds }));
      if (change.kind === 'move') await api<unknown>(`${at(node.id)}/move`, json('PUT', { version: node.version, parentId: change.parentId, index: change.index }));
      return change.kind;
    },
    (nodes, { node, to, change }) => (change.kind === 'none' ? nodes : applyRelocation(nodes, node.id, to))
  );

export const useDeleteCategory = () =>
  useTreeMutation(async ({ id, version }: { id: string; version: number }) => {
    await api<null>(`${at(id)}?${queryString({ version: String(version) })}`, { method: 'DELETE' });
  });
