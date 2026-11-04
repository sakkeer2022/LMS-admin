import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiError } from '../src/lib/api/contracts';
import { describeApiError } from '../src/lib/api/errors';
import { categoryDetailSchema, categoryTreeSchema, offeringSchema, type CategoryNode } from '../src/lib/api/category-tree';
import {
  addChildBlockedReason, applyMove, applyRelocation, applyReorder, breadcrumb, buildTree, codeFromName, keyboardPlacement, placementError,
  projectDrop, relocation, rowCount, rowCountLabel, searchMatches, visibleRows,
} from '../src/lib/api/category-tree-model';
import { Switch } from '../src/components/shadcn/switch';
import { CategoryTreeList } from '../src/features/category-tree/components/category-tree-list';
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

  it('labels a row with a bare count, as in the design, and spells it out for screen readers', () => {
    expect([rowCount(school), rowCount(k12), rowCount(nonAcademic)]).toEqual([1, 6, 0]);
  });
  it('suggests a valid code from a name', () => {
    expect(codeFromName('JEE / NEET')).toBe('jee-neet');
    expect(codeFromName('Research & Skill')).toBe('research-and-skill');
    expect(codeFromName('12th grade')).toBe('c-12th-grade');
  });
});

describe('drag and drop (reorder mode)', () => {
  // Visible rows with Academic and School open: academic, school, k-12, university, non-academic
  const flat = [academic, school, k12, university, nonAcademic].map((n) => ({ id: n.id, parentId: n.parentId, depth: n.depth }));

  it('reorders among siblings when dropped at the same depth', () => {
    const p = projectDrop(flat, nodes, university.id, school.id, 0, 20)!;
    expect(p).toMatchObject({ parentId: academic.id, depth: 1, index: 0, invalid: null });
    expect(relocation(nodes, university.id, p)).toEqual({ kind: 'reorder', parentId: academic.id, orderedIds: [university.id, school.id] });
  });

  it('nests under the row above when dragged right, and moves out when dragged left', () => {
    const nest = projectDrop(flat, nodes, university.id, university.id, 20, 20)!;
    expect(nest).toMatchObject({ parentId: school.id, depth: 2, index: 1 });
    expect(relocation(nodes, university.id, nest)).toEqual({ kind: 'move', parentId: school.id, index: 1 });
    const out = projectDrop(flat, nodes, university.id, university.id, -20, 20)!;
    expect(out).toMatchObject({ parentId: null, depth: 0, index: 1 });
  });

  it('marks a drop under a bookable leaf as invalid', () => {
    // university directly below the bookable K-12, dragged right: K-12 would be its parent
    const p = projectDrop(flat, nodes, nonAcademic.id, nonAcademic.id, 3 * 20, 20)!;
    expect(p).toMatchObject({ parentId: university.id, depth: 2 });
    const underK12 = projectDrop(flat, nodes, university.id, university.id, 40, 20)!;
    expect(underK12).toMatchObject({ parentId: k12.id, invalid: 'PARENT_IS_BOOKABLE' });
  });

  it('refuses a cycle and does nothing for an unchanged position', () => {
    expect(placementError(nodes, academic.id, k12.id)).toBe('INTO_ITSELF');
    expect(relocation(nodes, school.id, { parentId: academic.id, index: 0 })).toEqual({ kind: 'none' });
  });

  it('applies a drop locally exactly as the server stores it', () => {
    const after = applyRelocation(nodes, university.id, { parentId: school.id, index: 0 });
    const uni = after.find((n) => n.id === university.id)!;
    expect(uni).toMatchObject({ parentId: school.id, path: 'academic/school/university', depth: 2, displayOrder: 1 });
    expect(after.find((n) => n.id === k12.id)?.displayOrder).toBe(2);
  });

  it('offers the same moves from the keyboard', () => {
    expect(keyboardPlacement(nodes, university.id, 'ArrowUp')).toEqual({ parentId: academic.id, index: 0 });
    expect(keyboardPlacement(nodes, school.id, 'ArrowUp')).toBeNull();
    expect(keyboardPlacement(nodes, university.id, 'ArrowRight')).toEqual({ parentId: school.id, index: 1 });
    expect(keyboardPlacement(nodes, k12.id, 'ArrowLeft')).toEqual({ parentId: academic.id, index: 1 });
    const bookableTarget = [...nodes, node('olympiad', academic, { displayOrder: 99 })];
    expect(keyboardPlacement(bookableTarget, 'id-olympiad', 'ArrowRight')).toEqual({ invalid: 'PARENT_IS_BOOKABLE', parentId: university.id });
  });
});

describe('category tree list', () => {
  const rows = visibleRows(buildTree(nodes), new Set([academic.id, school.id]));
  const render = (reorder: boolean, canManage = true) => renderToStaticMarkup(<CategoryTreeList rows={rows} nodes={nodes}
    expanded={new Set([academic.id, school.id])} onToggle={() => undefined} selectedId={k12.id} onSelect={() => undefined} reorder={reorder}
    onRelocate={() => undefined} onInvalidDrop={() => undefined} canManage={canManage} pendingIds={new Set([university.id])}
    onEdit={() => undefined} onDelete={() => undefined} onToggleActive={() => undefined} />);

  it('shows the Active switch, Edit and Delete on every row', () => {
    const html = render(false);
    expect(html.match(/role="switch"/g)).toHaveLength(5);
    expect(html.match(/aria-label="Edit /g)).toHaveLength(5);
    expect(html.match(/aria-label="Delete /g)).toHaveLength(5);
    expect(html).toContain('aria-label="K-12, 6 curricula"');
    expect(html).toMatch(/aria-label="Edit University"[^>]*disabled/);
  });

  it('hides the row actions in reorder mode and without catalogue.manage', () => {
    expect(render(true)).not.toContain('role="switch"');
    expect(render(true)).toContain('aria-describedby="category-tree-reorder-help"');
    expect(render(false, false)).not.toContain('aria-label="Edit ');
  });
});

describe('Switch', () => {
  it('is a labelled switch reporting its state', () => {
    const html = renderToStaticMarkup(<Switch checked aria-label="Deactivate School" onCheckedChange={() => undefined} />);
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-label="Deactivate School"');
  });
});

describe('category detail panel', () => {
  const actions = { onAddChild: () => undefined, onEdit: () => undefined, onDelete: () => undefined, onToggleActive: () => undefined, onError: () => undefined };

  it('matches the design: breadcrumb, status, count card, Active switch, and Add sub-category disabled on a bookable leaf', () => {
    const html = wrap(<CategoryDetailView detail={categoryDetailSchema.parse(liveDetail)} node={k12} canManage pending={false} {...actions} />);
    expect(html).toContain('Academic › School › K-12');
    expect(html).toMatch(/role="switch" aria-checked="true"[^>]*aria-label="Deactivate K-12"/);
    expect(html).toContain('Status');
    expect(html).toMatch(/tabular-nums">6<\/p><span[^>]*>Curricula/);
    expect(html).toContain('Class 1');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*><svg[^>]*lucide-plus[\s\S]*?Add sub-category/);
    expect(html).not.toContain('>Move<');
    expect(html).toContain('A bookable category cannot have sub-categories');
    expect(html).toContain('Learner chooses');
  });

  it('hides every action without catalogue.manage', () => {
    const html = wrap(<CategoryDetailView detail={categoryDetailSchema.parse(liveDetail)} node={k12} canManage={false} pending={false} {...actions} />, ['catalogue.read']);
    expect(html).not.toContain('Delete');
    expect(html).not.toContain('Add sub-category');
  });
});

describe('category tree page', () => {
  it('shows a loading state, and Reorder and Add category only to managers', () => {
    const html = wrap(<CategoryTreePage />);
    expect(html).toContain('Category manager');
    expect(html).toMatch(/>Reorder<\/button>/);
    expect(html).toContain('>Add category</button>');
    expect(html).toContain('opacity-0');
    const reader = wrap(<CategoryTreePage />, ['catalogue.read']);
    expect(reader).not.toContain('Add category');
    expect(reader).not.toContain('>Reorder<');
  });

  it('refuses without catalogue.read', () => {
    expect(wrap(<CategoryTreePage />, [])).toContain('permission to view the catalogue');
  });
});
