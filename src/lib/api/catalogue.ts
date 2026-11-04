'use client';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api, queryString } from './client';

// Contract: amentorz-backend src/modules/catalogue (catalogue.routes.ts, catalogue.dto.ts,
// catalogue.service.ts, catalogue.lists.service.ts). Shared by the catalogue and pricing
// features, so it lives outside src/features (no cross-feature imports).

export const nodeTypes = ['CATEGORY', 'SUBSECTION', 'BOARD', 'SUBJECT', 'LEVEL'] as const;
export const nodeType = z.enum(nodeTypes);
export const nodeStatus = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type NodeType = z.infer<typeof nodeType>;
export type NodeStatus = z.infer<typeof nodeStatus>;

export const categorySchema = z.object({ id: z.string(), code: z.string(), name: z.string(), requiresBoard: z.boolean(), isActive: z.boolean() });
export const masterItemSchema = z.object({ id: z.string(), code: z.string(), name: z.string(), isActive: z.boolean(), sortOrder: z.number() });
export const levelSchema = masterItemSchema.extend({ categoryId: z.string() });
export type Category = z.infer<typeof categorySchema>;
export type MasterItem = z.infer<typeof masterItemSchema>;
export type Level = z.infer<typeof levelSchema>;

const counts = z.object({ subsections: z.number(), boards: z.number(), subjects: z.number(), levels: z.number() });
const nodeFields = {
  id: z.string(),
  parentId: z.string().nullable(),
  type: nodeType,
  name: z.string(),
  slug: z.string(),
  status: nodeStatus,
  sortOrder: z.number(),
  categoryId: z.string().nullable(),
  boardId: z.string().nullable(),
  subjectId: z.string().nullable(),
  levelId: z.string().nullable(),
  bookingEnabled: z.boolean(),
  curriculumId: z.string().nullable(),
  childCount: z.number(),
  counts,
};
export type TreeNode = z.infer<z.ZodObject<typeof nodeFields>> & { children: TreeNode[] };
export const treeNodeSchema: z.ZodType<TreeNode> = z.lazy(() => z.object({ ...nodeFields, children: z.array(treeNodeSchema) }));

export const nodeDetailSchema = z.object({
  ...nodeFields,
  rootId: z.string(),
  path: z.array(z.object({ id: z.string(), type: nodeType, name: z.string() })),
  // Null until the owning module exists; never shown as 0
  libraryResources: z.number().nullable(),
  tutorsMapped: z.number().nullable(),
  sessionsThisMonth: z.number().nullable(),
  sessionPricePaise: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type NodeDetail = z.infer<typeof nodeDetailSchema>;

export const createPathResultSchema = z.object({ leaf: nodeDetailSchema, createdNodeIds: z.array(z.string()) });

export interface CreatePathInput {
  categoryId: string;
  subsectionNodeId?: string;
  boardId?: string;
  subjectId: string;
  levelId: string;
  status: 'DRAFT' | 'PUBLISHED';
}
export interface UpdateNodeInput {
  name?: string;
  slug?: string;
  sortOrder?: number;
  status?: 'DRAFT' | 'PUBLISHED';
  bookingEnabled?: boolean;
}

async function getData<T>(schema: z.ZodType<T>, path: string, signal?: AbortSignal) {
  return schema.parse((await api<unknown>(path, { signal })).data);
}
const send = (method: 'POST' | 'PUT', body: unknown) => ({ method, body: JSON.stringify(body) });

// The master lists are short (tens of rows) and change rarely.
const LOOKUP_STALE = 10 * 60_000;
const ALL = 'limit=100';

export const catalogueKeys = {
  all: (tenant: string) => ['catalogue', tenant] as const,
  lookups: (tenant: string) => ['catalogue', tenant, 'lookups'] as const,
  categories: (tenant: string) => ['catalogue', tenant, 'lookups', 'categories'] as const,
  boards: (tenant: string) => ['catalogue', tenant, 'lookups', 'boards'] as const,
  subjects: (tenant: string) => ['catalogue', tenant, 'lookups', 'subjects'] as const,
  levels: (tenant: string, categoryId: string) => ['catalogue', tenant, 'lookups', 'levels', categoryId] as const,
  trees: (tenant: string) => ['catalogue', tenant, 'tree'] as const,
  tree: (tenant: string, categoryId: string, q: string) => ['catalogue', tenant, 'tree', categoryId, q] as const,
  nodes: (tenant: string) => ['catalogue', tenant, 'node'] as const,
  node: (tenant: string, id: string) => ['catalogue', tenant, 'node', id] as const,
};

/** Active categories (the four fixed tabs), in display order. */
export function useCategories(tenant: string) {
  return useQuery({ queryKey: catalogueKeys.categories(tenant), staleTime: LOOKUP_STALE, queryFn: ({ signal }) => getData(z.array(categorySchema), `/catalogue/categories?${ALL}`, signal) });
}
/** Boards are global (no category filter in the API); fetch only when a category requires one. */
export function useBoards(tenant: string, enabled: boolean) {
  return useQuery({ queryKey: catalogueKeys.boards(tenant), enabled, staleTime: LOOKUP_STALE, queryFn: ({ signal }) => getData(z.array(masterItemSchema), `/catalogue/boards?${ALL}`, signal) });
}
export function useSubjects(tenant: string, enabled = true) {
  return useQuery({ queryKey: catalogueKeys.subjects(tenant), enabled, staleTime: LOOKUP_STALE, queryFn: ({ signal }) => getData(z.array(masterItemSchema), `/catalogue/subjects?${ALL}`, signal) });
}
export function useLevels(tenant: string, categoryId: string | undefined) {
  return useQuery({
    queryKey: catalogueKeys.levels(tenant, categoryId ?? ''),
    enabled: Boolean(categoryId),
    staleTime: LOOKUP_STALE,
    queryFn: ({ signal }) => getData(z.array(levelSchema), `/catalogue/levels?${queryString({ categoryId, limit: '100' })}`, signal),
  });
}

/** The admin tree (drafts and archived nodes included) for each category; `q` searches names on the server. */
export function useCatalogueTrees(tenant: string, categoryIds: string[], q = '') {
  return useQueries({
    queries: categoryIds.map((categoryId) => ({
      queryKey: catalogueKeys.tree(tenant, categoryId, q),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getData(treeNodeSchema, `/admin/catalogue/tree?${queryString({ categoryId, q })}`, signal),
    })),
  });
}
export function useCatalogueNode(tenant: string, id: string | undefined) {
  return useQuery({
    queryKey: catalogueKeys.node(tenant, id ?? ''),
    enabled: Boolean(id),
    queryFn: ({ signal }) => getData(nodeDetailSchema, `/admin/catalogue/nodes/${encodeURIComponent(id!)}`, signal),
  });
}

function useCatalogueMutation<V, R>(tenant: string, fn: (input: V) => Promise<R>, inlineErrors = true) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    meta: { inlineErrors },
    // Any structural change can alter counts, paths, curricula and the detail price
    onSuccess: () => client.invalidateQueries({ queryKey: catalogueKeys.all(tenant) }),
  });
}

export function useAddCataloguePath(tenant: string) {
  return useCatalogueMutation(tenant, async (input: CreatePathInput) =>
    createPathResultSchema.parse((await api<unknown>('/admin/catalogue/paths', send('POST', input))).data));
}
export function useUpdateNode(tenant: string) {
  return useCatalogueMutation(tenant, async ({ id, ...input }: UpdateNodeInput & { id: string }) =>
    nodeDetailSchema.parse((await api<unknown>(`/admin/catalogue/nodes/${encodeURIComponent(id)}`, send('PUT', input))).data));
}
export function useMoveNode(tenant: string) {
  return useCatalogueMutation(tenant, async ({ id, parentId }: { id: string; parentId: string }) =>
    nodeDetailSchema.parse((await api<unknown>(`/admin/catalogue/nodes/${encodeURIComponent(id)}/move`, send('PUT', { parentId }))).data));
}
export function useArchiveNode(tenant: string) {
  return useCatalogueMutation(tenant, async (id: string) =>
    nodeDetailSchema.parse((await api<unknown>(`/admin/catalogue/nodes/${encodeURIComponent(id)}/archive`, { method: 'PUT' })).data));
}
export function useReorderNodes(tenant: string) {
  return useCatalogueMutation(tenant, async (input: { parentId: string; orderedIds: string[] }) =>
    (await api<{ parentId: string; orderedIds: string[] }>('/admin/catalogue/nodes/reorder', send('PUT', input))).data);
}
