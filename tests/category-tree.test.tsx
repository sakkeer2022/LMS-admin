import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiError } from '../src/lib/api/contracts';
import { describeApiError } from '../src/lib/api/errors';
import { categoryDetailSchema, categoryTreeSchema, offeringSchema, type CategoryNode } from '../src/lib/api/category-tree';
import {
  addChildBlockedReason, applyMove, applyReorder, breadcrumb, buildTree, codeFromName, dropIntent, moveTargets, reorderedSiblings, rowCountLabel,
  searchMatches, shiftedSiblings, visibleRows,
} from '../src/lib/api/category-tree-model';
import { VirtualTree, VIRTUALIZE_AFTER } from '../src/components/ui';
import { PermissionProvider } from '../src/components/security/permission-provider';
import { CategoryDetailView } from '../src/features/category-tree/components/category-detail-panel';
import { CategoryTreePage } from '../src/features/category-tree/components/category-tree-page';

// Shapes copied from live responses of the ADR-0005 backend (reference + demo seed)
let seq = 0;
const node = (code: string, parent: CategoryNode | null, extra: Partial<CategoryNode> = {}): CategoryNode => ({
  id: `id-${code}`, parentId: parent?.id ?? null, code, name: code.toUpperCase(), path: parent ? `${parent.path}/${code}` : code,
  depth: parent ? parent.depth + 1 : 0, isBookable: false, requiresBoard: false, requiresLevel: false, isActive: true, displayOrder: ++seq,
  version: 1, childrenCount: 0, curriculaCount: 0, subtreeCurriculaCount: 0, createdAt: '2026-11-02T07:10:09.296Z', updatedAt: '2026-11-02T07:10:09.296Z', ...extra,
});
const academic = node('academic', null, { name: 'Academic', childrenCount: 2, subtreeCurriculaCount: 7 });
const school = node('school', academic, { name: 'School', requiresBoard: true, childrenCount: 1, subtreeCurriculaCount: 6 });
const k12 = node('k-12', school, { name: 'K-12', isBookable: true, requiresBoard: true, requiresLevel: true, curriculaCount: 6, subtreeCurriculaCount: 6 });
const university = node('university', academic, { name: 'University', isBookable: true, curriculaCount: 1, subtreeCurriculaCount: 1 });
const nonAcademic = node('non-academic', null, { name: 'Non-academic' });
const nodes = [academic, school, k12, university, nonAcademic];

const liveDetail = {
  ...k12, description: null, activeCurriculaCount: 6, studentCount: 0, descendantCount: 0,
  breadcrumb: [{ id: academic.id, name: 'Academic', path: 'academic' }, { id: school.id, name: 'School', path: 'academic/school' }],
  allowedLevels: [{ id: 'l1', code: 'class-1', name: 'Class 1', isActive: true }, { id: 'l2', code: 'class-2', name: 'Class 2', isActive: false }],
};

function wrap(children: ReactNode, permissions = ['catalogue.read', 'catalogue.manage']) {
  return renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><PermissionProvider permissions={permissions}>{children}</PermissionProvider></QueryClientProvider>);
}

describe('API schemas accept the live response shapes', () => {
  it('parses the tree, a detail and an offering', () => {
    expect(categoryTreeSchema.parse({ nodes, stats: { categories: 5, bookableLeaves: 2, curricula: 7 }, generatedAt: '2026-11-02T07:10:09.296Z' }).nodes).toHaveLength(5);
    expect(categoryDetailSchema.parse(liveDetail).breadcrumb[1].name).toBe('School');
    expect(offeringSchema.parse({ curriculumId: 'c', categoryId: k12.id, subject: { id: 's', name: 'Physics' }, board: { id: 'b', name: 'CBSE' }, level: null, isActive: true }).level).toBeNull();
  });

  it('maps typed error codes, including stale versions', () => {
    expect(describeApiError(new ApiError(409, 'Someone else changed School.', undefined, 't', 'STALE_VERSION'))).toMatchObject({ kind: 'stale', code: 'STALE_VERSION' });
    expect(describeApiError(new ApiError(409, 'School cannot be deleted because it has 1 sub-category.', undefined, 't', 'DELETE_BLOCKED')))
      .toMatchObject({ kind: 'conflict', code: 'DELETE_BLOCKED', message: 'School cannot be deleted because it has 1 sub-category.' });
  });
});

describe('tree model', () => {
  it('nests by parent in display order and lists only expanded children', () => {
    const roots = buildTree(nodes);
    expect(roots.map((r) => r.code)).toEqual(['academic', 'non-academic']);
    expect(visibleRows(roots, new Set()).map((r) => r.item.code)).toEqual(['academic', 'non-academic']);
    const open = visibleRows(roots, new Set([academic.id, school.id]));
    expect(open.map((r) => [r.item.code, r.level])).toEqual([['academic', 1], ['school', 2], ['k-12', 3], ['university', 2], ['non-academic', 1]]);
    expect(open[1]).toMatchObject({ index: 0, siblings: 2 });
  });

  it('builds the breadcrumb from the path, not a fixed chain', () => {
    expect(breadcrumb(nodes, k12).map((n) => n.name)).toEqual(['Academic', 'School', 'K-12']);
  });

  it('labels counts in words, never as bare numbers', () => {
    expect(rowCountLabel(school)).toBe('1 sub-category · 6 curricula');
    expect(rowCountLabel(university)).toBe('1 curriculum');
    expect(rowCountLabel(nonAcademic)).toBe('0 curricula');
  });

  it('searches names and keeps the ancestors of a match open', () => {
    const found = searchMatches(nodes, 'k-1')!;
    expect([...found.matches].sort()).toEqual([academic.id, k12.id, school.id].sort());
    expect([...found.open].sort()).toEqual([academic.id, school.id].sort());
    expect(searchMatches(nodes, '  ')).toBeNull();
  });

  it('offers move targets without the node, its descendants, its parent or bookable leaves', () => {
    const labels = moveTargets(nodes, school).map((o) => o.label);
    expect(labels).toEqual(['Top level (make it a root)', 'Non-academic']);
    expect(moveTargets(nodes, k12).map((o) => o.id)).toEqual([null, academic.id, nonAcademic.id]);
  });

  it('blocks adding sub-categories to a bookable leaf with a reason', () => {
    expect(addChildBlockedReason(k12)).toMatch(/bookable category cannot have sub-categories/);
    expect(addChildBlockedReason(school)).toBeNull();
  });

  it('rebuilds paths and depths optimistically when a branch moves', () => {
    const moved = applyMove(nodes, school.id, nonAcademic.id);
    expect(moved.find((n) => n.id === school.id)).toMatchObject({ parentId: nonAcademic.id, path: 'non-academic/school', depth: 1 });
    expect(moved.find((n) => n.id === k12.id)).toMatchObject({ path: 'non-academic/school/k-12', depth: 2 });
    expect(moved.find((n) => n.id === academic.id)?.childrenCount).toBe(1);
    expect(moved.find((n) => n.id === nonAcademic.id)?.childrenCount).toBe(1);
  });

  it('computes sibling order for drag, drop and Move up/down', () => {
    expect(reorderedSiblings(nodes, university.id, school.id, false)).toEqual([university.id, school.id]);
    expect(reorderedSiblings(nodes, university.id, k12.id, false)).toBeNull();
    expect(shiftedSiblings(nodes, school.id, 1)).toEqual([university.id, school.id]);
    expect(shiftedSiblings(nodes, school.id, -1)).toBeNull();
    expect(applyReorder(nodes, [university.id, school.id]).find((n) => n.id === university.id)?.displayOrder).toBe(1);
  });

  it('decides what a drop does: reorder siblings, move inside, or nothing', () => {
    expect(dropIntent(nodes, university.id, school)).toBe('reorder');
    expect(dropIntent(nodes, university.id, nonAcademic)).toBe('move');
    expect(dropIntent(nodes, school.id, k12)).toBeNull();
    expect(dropIntent(nodes, nonAcademic.id, k12)).toBeNull();
  });

  it('suggests a valid code from a name', () => {
    expect(codeFromName('JEE / NEET')).toBe('jee-neet');
    expect(codeFromName('Research & Skill')).toBe('research-and-skill');
    expect(codeFromName('12th grade')).toBe('c-12th-grade');
  });
});

describe('VirtualTree', () => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ node: i, id: `r${i}`, level: 1, index: i, siblings: n, hasChildren: false, parentId: null }));
  const render = (n: number) => renderToStaticMarkup(<VirtualTree label="Big tree" rows={rows(n)} expanded={new Set()} onToggle={() => undefined}
    onSelect={() => undefined} renderLabel={(r) => `Row ${r.node}`} />);

  it('renders every row of a small tree with tree semantics', () => {
    const html = render(10);
    expect(html.match(/role="treeitem"/g)).toHaveLength(10);
    expect(html).toContain('aria-setsize="10"');
    expect(html).toContain('aria-posinset="10"');
  });

  it('renders only the visible window of a large tree', () => {
    const html = render(VIRTUALIZE_AFTER * 10);
    const items = html.match(/role="treeitem"/g)?.length ?? 0;
    expect(items).toBeGreaterThan(0);
    expect(items).toBeLessThan(100);
  });
});

describe('category detail panel', () => {
  const actions = { onAddChild: () => undefined, onEdit: () => undefined, onMove: () => undefined, onDelete: () => undefined, onError: () => undefined };

  it('shows the breadcrumb, labelled counts, allowed levels and disables Add sub-category on a bookable leaf', () => {
    const html = wrap(<CategoryDetailView tenant="t1" detail={categoryDetailSchema.parse(liveDetail)} node={k12} canManage {...actions} />);
    expect(html).toContain('Academic › School › K-12');
    expect(html).toContain('0 sub-categories');
    expect(html).toContain('6 curricula');
    expect(html).toContain('Class 1');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>\+ Add sub-category/);
    expect(html).toContain('A bookable category cannot have sub-categories');
    expect(html).toContain('Learner chooses');
  });

  it('hides every action without catalogue.manage', () => {
    const html = wrap(<CategoryDetailView tenant="t1" detail={categoryDetailSchema.parse(liveDetail)} node={k12} canManage={false} {...actions} />, ['catalogue.read']);
    expect(html).not.toContain('Delete');
    expect(html).not.toContain('Add sub-category');
  });
});

describe('category tree page', () => {
  it('shows a loading state, and the Add root action only to managers', () => {
    const html = wrap(<CategoryTreePage tenant="t1" />);
    expect(html).toContain('Category manager');
    expect(html).toContain('Add root category');
    expect(wrap(<CategoryTreePage tenant="t1" />, ['catalogue.read'])).not.toContain('Add root category');
  });

  it('refuses without catalogue.read', () => {
    expect(wrap(<CategoryTreePage tenant="t1" />, [])).toContain('permission to view the catalogue');
  });
});
