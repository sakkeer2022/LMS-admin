import type { CategoryNode } from './category-tree';

// Pure helpers over the flat category tree (ADR-0005). They mirror the backend rules in
// amentorz-backend src/modules/category-tree/category-tree.rules.ts for a fast, clear UI;
// the server still validates every write.

export interface TreeItem extends CategoryNode {
  children: TreeItem[];
}

export function compareSiblings(a: CategoryNode, b: CategoryNode) {
  return a.displayOrder - b.displayOrder || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

/** Nests the flat node list (one array per parent, in display order). */
export function buildTree(nodes: readonly CategoryNode[]): TreeItem[] {
  const items = new Map<string, TreeItem>(nodes.map((n) => [n.id, { ...n, children: [] }]));
  const roots: TreeItem[] = [];
  for (const item of items.values()) {
    const parent = item.parentId ? items.get(item.parentId) : undefined;
    (parent ? parent.children : roots).push(item);
  }
  const sort = (list: TreeItem[]) => {
    list.sort(compareSiblings);
    for (const item of list) sort(item.children);
  };
  sort(roots);
  return roots;
}

export interface VisibleRow {
  item: TreeItem;
  level: number;
  /** Position among siblings, for aria-posinset / aria-setsize */
  index: number;
  siblings: number;
}

/**
 * Rows on screen: roots plus the children of expanded nodes. Children of a collapsed
 * node are never walked, so a large tree costs only what is open (lazy rendering).
 */
export function visibleRows(roots: readonly TreeItem[], expanded: ReadonlySet<string>, matches?: ReadonlySet<string>): VisibleRow[] {
  const rows: VisibleRow[] = [];
  const walk = (list: readonly TreeItem[], level: number) => {
    const shown = matches ? list.filter((i) => matches.has(i.id)) : list;
    shown.forEach((item, index) => {
      rows.push({ item, level, index, siblings: shown.length });
      if (expanded.has(item.id) && item.children.length) walk(item.children, level + 1);
    });
  };
  walk(roots, 1);
  return rows;
}

/** Ids that have children, for "Expand all". */
export function expandableIds(nodes: readonly CategoryNode[]) {
  return nodes.filter((n) => n.childrenCount > 0).map((n) => n.id);
}

/** Search: matching nodes plus their ancestors (so the match can be reached). */
export function searchMatches(nodes: readonly CategoryNode[], q: string): { matches: Set<string>; open: Set<string> } | null {
  const term = q.trim().toLowerCase();
  if (!term) return null;
  const byPath = new Map(nodes.map((n) => [n.path, n]));
  const matches = new Set<string>();
  const open = new Set<string>();
  for (const n of nodes) {
    if (!n.name.toLowerCase().includes(term) && !n.code.includes(term)) continue;
    matches.add(n.id);
    for (const p of ancestorPaths(n.path)) {
      const a = byPath.get(p);
      if (a) {
        matches.add(a.id);
        open.add(a.id);
      }
    }
  }
  return { matches, open };
}

export function ancestorPaths(path: string): string[] {
  const parts = path.split('/');
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
}

/** Breadcrumb names from the node's path, e.g. ["Academic", "School", "K-12"]. */
export function breadcrumb(nodes: readonly CategoryNode[], node: CategoryNode): CategoryNode[] {
  const byPath = new Map(nodes.map((n) => [n.path, n]));
  return [...ancestorPaths(node.path).flatMap((p) => byPath.get(p) ?? []), node];
}

export function isSelfOrDescendant(node: Pick<CategoryNode, 'path'>, candidate: Pick<CategoryNode, 'path'>) {
  return candidate.path === node.path || candidate.path.startsWith(`${node.path}/`);
}

/**
 * Why "Add sub-category" is unavailable, or null when it is allowed. A leaf that tutors
 * teach cannot get sub-categories (the server also refuses one with prices or learners).
 */
export function addChildBlockedReason(node: CategoryNode): string | null {
  return node.isLeaf && node.tutorCount > 0
    ? `Tutors teach ${node.name}, so it cannot have sub-categories.`
    : null;
}

/** Plain-language counts, never a bare number. */
export function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;
}
export const subCategoryLabel = (n: number) => plural(n, 'sub-category', 'sub-categories');
export const tutorLabel = (n: number) => plural(n, 'tutor', 'tutors');

/** The row's count label: sub-categories for a branch, tutors for a leaf. */
export function rowCountLabel(node: CategoryNode) {
  return node.childrenCount > 0 ? subCategoryLabel(node.childrenCount) : tutorLabel(node.tutorCount);
}

// ── Optimistic edits (rolled back when the server refuses) ───────────────────

export function applyRename(nodes: CategoryNode[], id: string, change: { name?: string; isActive?: boolean }): CategoryNode[] {
  return nodes.map((n) => (n.id === id ? { ...n, ...change } : n));
}

export function applyReorder(nodes: CategoryNode[], orderedIds: readonly string[]): CategoryNode[] {
  const order = new Map(orderedIds.map((id, i) => [id, i + 1]));
  return nodes.map((n) => (order.has(n.id) ? { ...n, displayOrder: order.get(n.id)! } : n));
}

/** Moves a node and rewrites path and depth for its subtree, like the server does. */
export function applyMove(nodes: CategoryNode[], id: string, parentId: string | null): CategoryNode[] {
  const node = nodes.find((n) => n.id === id);
  const parent = parentId ? nodes.find((n) => n.id === parentId) : null;
  if (!node || (parentId && !parent)) return nodes;
  const newPrefix = parent ? `${parent.path}/${node.code}` : node.code;
  const delta = (parent ? parent.depth + 1 : 0) - node.depth;
  const lastOrder = Math.max(0, ...nodes.filter((n) => n.parentId === parentId).map((n) => n.displayOrder));
  return nodes.map((n) => {
    if (!isSelfOrDescendant(node, n)) {
      if (n.id === node.parentId) return { ...n, childrenCount: n.childrenCount - 1, isLeaf: n.childrenCount - 1 === 0 };
      if (n.id === parentId) return { ...n, childrenCount: n.childrenCount + 1, isLeaf: false };
      return n;
    }
    const moved = { ...n, path: newPrefix + n.path.slice(node.path.length), depth: n.depth + delta };
    return n.id === id ? { ...moved, parentId, displayOrder: lastOrder + 1 } : moved;
  });
}

// ── Drag and drop (reorder mode) ─────────────────────────────────────────────

export interface FlatItem {
  id: string;
  parentId: string | null;
  depth: number;
}

/** Where a drop lands: the new parent and the position among its children. */
export interface Placement {
  parentId: string | null;
  index: number;
}

export type InvalidReason = 'PARENT_IN_USE' | 'INTO_ITSELF';

export interface Projection extends Placement {
  depth: number;
  /** Set when the drop is not allowed; the UI shows it and ignores the drop */
  invalid: InvalidReason | null;
}

function arrayMove<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Projected drop for a flat, visible tree (the dragged node's own subtree is left out).
 * The row the pointer is over gives the vertical position; the horizontal offset, in
 * indentation steps, picks the depth between what the rows above and below allow.
 */
export function projectDrop(
  items: readonly FlatItem[],
  nodes: readonly CategoryNode[],
  activeId: string,
  overId: string,
  offsetX: number,
  indentWidth: number,
): Projection | null {
  const activeIndex = items.findIndex((i) => i.id === activeId);
  const overIndex = items.findIndex((i) => i.id === overId);
  if (activeIndex < 0 || overIndex < 0) return null;
  const moved = arrayMove(items, activeIndex, overIndex);
  const previous = moved[overIndex - 1];
  const next = moved[overIndex + 1];
  const maxDepth = previous ? previous.depth + 1 : 0;
  const minDepth = next ? next.depth : 0;
  const wanted = items[activeIndex].depth + Math.round(offsetX / indentWidth);
  const depth = Math.max(minDepth, Math.min(maxDepth, wanted));

  let parentId: string | null = null;
  if (depth > 0 && previous) {
    if (previous.depth === depth) parentId = previous.parentId;
    else if (previous.depth < depth) parentId = previous.id;
    else parentId = moved.slice(0, overIndex).reverse().find((i) => i.depth === depth)?.parentId ?? null;
  }
  const index = moved.slice(0, overIndex).filter((i) => i.parentId === parentId && i.depth === depth).length;
  return { parentId, index, depth, invalid: placementError(nodes, activeId, parentId) };
}

/** Why `id` may not go under `parentId`, or null. Mirrors the server's checks. */
export function placementError(nodes: readonly CategoryNode[], id: string, parentId: string | null): InvalidReason | null {
  if (parentId === null) return null;
  const node = nodes.find((n) => n.id === id);
  const parent = nodes.find((n) => n.id === parentId);
  if (!node || !parent) return null;
  if (isSelfOrDescendant(node, parent)) return 'INTO_ITSELF';
  if (addChildBlockedReason(parent)) return 'PARENT_IN_USE';
  return null;
}

export function invalidDropMessage(reason: InvalidReason, nodes: readonly CategoryNode[], parentId: string | null) {
  const parent = nodes.find((n) => n.id === parentId)?.name ?? 'that category';
  return reason === 'PARENT_IN_USE'
    ? `Tutors teach ${parent}, so it cannot have sub-categories.`
    : 'A category cannot move inside itself or one of its sub-categories.';
}

/** Children of a parent in display order. */
export function siblingIds(nodes: readonly CategoryNode[], parentId: string | null) {
  return nodes.filter((n) => n.parentId === parentId).sort(compareSiblings).map((n) => n.id);
}

/** `id` placed at `index` among the other children (clamped). */
export function insertAt(ids: readonly string[], id: string, index: number) {
  const rest = ids.filter((x) => x !== id);
  const at = Math.max(0, Math.min(index, rest.length));
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}

/** What a placement means for the API: nothing, a reorder within the parent, or a move. */
export function relocation(nodes: readonly CategoryNode[], id: string, to: Placement):
  | { kind: 'none' }
  | { kind: 'reorder'; parentId: string | null; orderedIds: string[] }
  | { kind: 'move'; parentId: string | null; index: number } {
  const node = nodes.find((n) => n.id === id);
  if (!node) return { kind: 'none' };
  if (node.parentId !== to.parentId) return { kind: 'move', parentId: to.parentId, index: to.index };
  const current = siblingIds(nodes, to.parentId);
  const orderedIds = insertAt(current, id, to.index);
  return orderedIds.every((x, i) => x === current[i]) ? { kind: 'none' } : { kind: 'reorder', parentId: to.parentId, orderedIds };
}

/** The tree after a drop, as the server will store it (optimistic update). */
export function applyRelocation(nodes: CategoryNode[], id: string, to: Placement): CategoryNode[] {
  const node = nodes.find((n) => n.id === id);
  if (!node) return nodes;
  const moved = node.parentId === to.parentId ? nodes : applyMove(nodes, id, to.parentId);
  return applyReorder(moved, insertAt(siblingIds(moved, to.parentId), id, to.index));
}

/**
 * Keyboard alternative to dragging (reorder mode, on a row's handle):
 * Alt+Up / Alt+Down move among siblings, Alt+Right nests under the previous sibling,
 * Alt+Left moves out to just after the parent.
 */
export function keyboardPlacement(
  nodes: readonly CategoryNode[],
  id: string,
  key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
): Placement | { invalid: InvalidReason; parentId: string | null } | null {
  const node = nodes.find((n) => n.id === id);
  if (!node) return null;
  const siblings = siblingIds(nodes, node.parentId);
  const at = siblings.indexOf(id);
  switch (key) {
    case 'ArrowUp': return at > 0 ? { parentId: node.parentId, index: at - 1 } : null;
    case 'ArrowDown': return at < siblings.length - 1 ? { parentId: node.parentId, index: at + 1 } : null;
    case 'ArrowRight': {
      if (at === 0) return null;
      const target = siblings[at - 1];
      const invalid = placementError(nodes, id, target);
      return invalid ? { invalid, parentId: target } : { parentId: target, index: siblingIds(nodes, target).length };
    }
    case 'ArrowLeft': {
      const parent = nodes.find((n) => n.id === node.parentId);
      if (!parent) return null;
      return { parentId: parent.parentId, index: siblingIds(nodes, parent.parentId).indexOf(parent.id) + 1 };
    }
  }
}

/** Compact count for a row, as in the design: children for a branch, tutors for a leaf. */
export function rowCount(node: CategoryNode) {
  return node.childrenCount > 0 ? node.childrenCount : node.tutorCount;
}

/** A code for a new category that no sibling uses yet ("physics", "physics-2", …). */
export function uniqueSiblingCode(nodes: readonly CategoryNode[], parentId: string | null, name: string) {
  const base = codeFromName(name) || 'category';
  const taken = new Set(nodes.filter((n) => n.parentId === parentId).map((n) => n.code));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i += 1) {
    const suffix = `-${i}`;
    const code = `${base.slice(0, 50 - suffix.length).replace(/-+$/, '')}${suffix}`;
    if (!taken.has(code)) return code;
  }
}

/** A code from a name: lowercase, digits and hyphens, starting with a letter. */
export function codeFromName(name: string) {
  const code = name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50).replace(/-+$/, '');
  return /^[a-z]/.test(code) ? code : code ? `c-${code}`.slice(0, 50) : '';
}
export const CODE_PATTERN = /^[a-z][a-z0-9_-]*$/;
