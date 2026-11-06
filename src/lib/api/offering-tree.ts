'use client';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from './client';

// Contract: amentorz-backend GET /admin/category-tree/picker (getCategoryTreePicker),
// the same shape as the faculty onboarding catalogue (category-tree.picker.ts). Each leaf
// (a category without sub-categories) has one offering: its category curriculum, whose
// subject is the leaf itself and whose board and level are null.

const named = z.object({ id: z.string(), name: z.string() });

export const offeringTreeSchema = z.object({
  nodes: z.array(z.object({ id: z.string(), parentId: z.string().nullable(), name: z.string(), isLeaf: z.boolean() })),
  offerings: z.array(
    z.object({ curriculumId: z.string(), categoryId: z.string(), board: named.nullable(), level: named.nullable(), subject: named }),
  ),
});
export type OfferingTree = z.infer<typeof offeringTreeSchema>;

/** One offering (a leaf) with its category path, ready for a select. */
export interface PickerOffering {
  curriculumId: string;
  categoryId: string;
  /** "School › K-12 › CBSE › Physics › Class 11" */
  categoryLabel: string;
  subject: string;
  board: string | null;
  level: string | null;
  /** The leaf's path ("School › K-12 › CBSE › Physics › Class 11") */
  label: string;
}

export const offeringTreeKeys = { all: () => ['category-tree', 'picker'] as const };

export function useOfferingTree(enabled = true) {
  return useQuery({
    queryKey: offeringTreeKeys.all(),
    enabled,
    staleTime: 60_000,
    queryFn: async ({ signal }) => offeringTreeSchema.parse((await api<unknown>('/admin/category-tree/picker', { signal })).data),
  });
}

/** Flattens the tree into offerings with readable labels, sorted by path then subject. */
export function pickerOfferings(tree: OfferingTree | undefined): PickerOffering[] {
  if (!tree) return [];
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const pathOf = (id: string) => {
    const names: string[] = [];
    for (let node = byId.get(id), guard = 0; node && guard < 50; node = node.parentId ? byId.get(node.parentId) : undefined, guard++)
      names.unshift(node.name);
    return names.join(' › ');
  };
  const labels = new Map<string, string>();
  return tree.offerings
    .map((o) => {
      const categoryLabel = labels.get(o.categoryId) ?? pathOf(o.categoryId);
      labels.set(o.categoryId, categoryLabel);
      return {
        curriculumId: o.curriculumId,
        categoryId: o.categoryId,
        categoryLabel,
        subject: o.subject.name,
        board: o.board?.name ?? null,
        level: o.level?.name ?? null,
        // A category curriculum is the leaf itself; older subject offerings keep their parts
        label: o.subject.id === o.categoryId
          ? categoryLabel
          : [o.subject.name, o.board?.name, o.level?.name].filter(Boolean).join(' · '),
      };
    })
    .sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel) || a.label.localeCompare(b.label));
}
