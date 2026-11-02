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

export interface ParentOption {
  id: string | null;
  label: string;
}

/**
 * Where a node may move: any category except itself, its descendants, its current parent
 * and bookable leaves (they cannot have children). null = make it a root.
 */
export function moveTargets(nodes: readonly CategoryNode[], node: CategoryNode): ParentOption[] {
  const byPath = new Map(nodes.map((n) => [n.path, n]));
  const label = (n: CategoryNode) => [...ancestorPaths(n.path).map((p) => byPath.get(p)?.name ?? p), n.name].join(' › ');
  const options: ParentOption[] = node.parentId ? [{ id: null, label: 'Top level (make it a root)' }] : [];
  for (const n of [...nodes].sort((a, b) => a.path.localeCompare(b.path))) {
    if (isSelfOrDescendant(node, n) || n.id === node.parentId || n.isBookable) continue;
    options.push({ id: n.id, label: label(n) });
  }
  return options;
}

/** Why "Add sub-category" is unavailable, or null when it is allowed. */
export function addChildBlockedReason(node: CategoryNode): string | null {
  return node.isBookable ? 'A bookable category cannot have sub-categories. Turn off booking in Edit first.' : null;
}

/** Plain-language counts, never a bare number. */
export function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;
}
export const subCategoryLabel = (n: number) => plural(n, 'sub-category', 'sub-categories');
export const curriculaLabel = (n: number) => plural(n, 'curriculum', 'curricula');

/** The row's count label: sub-categories for a branch, curricula for a leaf. */
export function rowCountLabel(node: CategoryNode) {
  if (node.childrenCount > 0) return `${subCategoryLabel(node.childrenCount)} · ${curriculaLabel(node.subtreeCurriculaCount)}`;
  return curriculaLabel(node.curriculaCount);
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
      if (n.id === node.parentId) return { ...n, childrenCount: n.childrenCount - 1 };
      if (n.id === parentId) return { ...n, childrenCount: n.childrenCount + 1 };
      return n;
    }
    const moved = { ...n, path: newPrefix + n.path.slice(node.path.length), depth: n.depth + delta };
    return n.id === id ? { ...moved, parentId, displayOrder: lastOrder + 1 } : moved;
  });
}

/** New sibling order after dragging `draggedId` before or after `targetId`. */
export function reorderedSiblings(nodes: readonly CategoryNode[], draggedId: string, targetId: string, after: boolean): string[] | null {
  const dragged = nodes.find((n) => n.id === draggedId);
  const target = nodes.find((n) => n.id === targetId);
  if (!dragged || !target || dragged.parentId !== target.parentId || dragged.id === target.id) return null;
  const siblings = nodes.filter((n) => n.parentId === dragged.parentId).sort(compareSiblings).map((n) => n.id).filter((id) => id !== draggedId);
  siblings.splice(siblings.indexOf(targetId) + (after ? 1 : 0), 0, draggedId);
  return siblings;
}

/** Up/down by one place, for the keyboard alternative to dragging. */
export function shiftedSiblings(nodes: readonly CategoryNode[], id: string, by: -1 | 1): string[] | null {
  const node = nodes.find((n) => n.id === id);
  if (!node) return null;
  const siblings = nodes.filter((n) => n.parentId === node.parentId).sort(compareSiblings).map((n) => n.id);
  const from = siblings.indexOf(id);
  const to = from + by;
  if (to < 0 || to >= siblings.length) return null;
  [siblings[from], siblings[to]] = [siblings[to], siblings[from]];
  return siblings;
}

/** What a drop on `target` would do: reorder among siblings, move inside, or nothing. */
export function dropIntent(nodes: readonly CategoryNode[], draggedId: string, target: CategoryNode): 'reorder' | 'move' | null {
  const dragged = nodes.find((n) => n.id === draggedId);
  if (!dragged || dragged.id === target.id) return null;
  if (dragged.parentId === target.parentId) return 'reorder';
  if (target.isBookable || isSelfOrDescendant(dragged, target) || target.id === dragged.parentId) return null;
  return 'move';
}

/** A code from a name: lowercase, digits and hyphens, starting with a letter. */
export function codeFromName(name: string) {
  const code = name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50).replace(/-+$/, '');
  return /^[a-z]/.test(code) ? code : code ? `c-${code}`.slice(0, 50) : '';
}
export const CODE_PATTERN = /^[a-z][a-z0-9_-]*$/;
