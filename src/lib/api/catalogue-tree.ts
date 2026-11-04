import { nodeTypes, type Category, type NodeType, type TreeNode } from './catalogue';

// Pure helpers over the admin tree. The placement rules mirror the backend's
// catalogue.tree.ts checkPlacement; the server still validates every write.

const rank = (type: NodeType) => nodeTypes.indexOf(type);

export function findNode(roots: readonly TreeNode[], id: string): TreeNode | undefined {
  for (const root of roots) {
    if (root.id === id) return root;
    const hit = findNode(root.children, id);
    if (hit) return hit;
  }
  return undefined;
}

/** Ancestors from the category root down to the direct parent. */
export function ancestorsOf(roots: readonly TreeNode[], id: string): TreeNode[] {
  const walk = (nodes: readonly TreeNode[], trail: TreeNode[]): TreeNode[] | undefined => {
    for (const node of nodes) {
      if (node.id === id) return trail;
      const hit = walk(node.children, [...trail, node]);
      if (hit) return hit;
    }
    return undefined;
  };
  return walk(roots, []) ?? [];
}

/** Drops archived nodes (and everything under them) unless they should be shown. */
export function withoutArchived(nodes: readonly TreeNode[]): TreeNode[] {
  return nodes.filter((n) => n.status !== 'ARCHIVED').map((n) => ({ ...n, children: withoutArchived(n.children), childCount: n.children.filter((c) => c.status !== 'ARCHIVED').length }));
}

const plural: Record<NodeType, [string, string]> = {
  CATEGORY: ['category', 'categories'],
  SUBSECTION: ['subsection', 'subsections'],
  BOARD: ['board', 'boards'],
  SUBJECT: ['subject', 'subjects'],
  LEVEL: ['level', 'levels'],
};
export const typeLabel = (type: NodeType) => plural[type][0].replace(/^./, (c) => c.toUpperCase());

/** "3 boards", "1 subsection · 2 subjects": counts of the direct children by type. */
export function childCountLabel(node: TreeNode) {
  const byType = new Map<NodeType, number>();
  for (const child of node.children) byType.set(child.type, (byType.get(child.type) ?? 0) + 1);
  return [...byType].sort(([a], [b]) => rank(a) - rank(b)).map(([type, n]) => `${n} ${plural[type][n === 1 ? 0 : 1]}`).join(' · ');
}

/** Same rules as the backend: CATEGORY > SUBSECTION > BOARD > SUBJECT > LEVEL, boards only where required. */
export function canPlace(type: NodeType, parentType: NodeType, requiresBoard: boolean) {
  if (type === 'CATEGORY') return false;
  if (rank(type) <= rank(parentType)) return false;
  if (type === 'BOARD' && !requiresBoard) return false;
  if (type === 'SUBJECT' && requiresBoard && parentType !== 'BOARD') return false;
  if (type === 'LEVEL' && parentType !== 'SUBJECT') return false;
  return true;
}

export interface ParentOption { id: string; label: string }

/** Nodes in the same category that may become this node's parent. */
export function moveTargets(root: TreeNode, node: TreeNode, requiresBoard: boolean): ParentOption[] {
  const options: ParentOption[] = [];
  const walk = (current: TreeNode, trail: string[]) => {
    if (current.id === node.id || current.status === 'ARCHIVED') return; // never under itself, its subtree or an archived node
    const label = [...trail, current.name].join(' › ');
    if (current.id !== node.parentId && canPlace(node.type, current.type, requiresBoard)) options.push({ id: current.id, label });
    for (const child of current.children) walk(child, [...trail, current.name]);
  };
  walk(root, []);
  return options;
}

/** Which actions a node's menu offers. */
export function nodeActions(node: TreeNode) {
  return {
    addChild: node.type !== 'LEVEL' && node.status !== 'ARCHIVED',
    edit: true,
    move: node.type !== 'CATEGORY',
    archive: node.type !== 'CATEGORY' && node.status !== 'ARCHIVED',
  };
}

/** Values to pre-fill the add-path drawer when adding under a node. */
export function addPathPrefill(roots: readonly TreeNode[], node: TreeNode) {
  const chain = [...ancestorsOf(roots, node.id), node];
  return {
    categoryId: chain.find((n) => n.type === 'CATEGORY')?.categoryId ?? undefined,
    subsectionNodeId: chain.find((n) => n.type === 'SUBSECTION')?.id,
    boardId: chain.find((n) => n.type === 'BOARD')?.boardId ?? undefined,
    subjectId: chain.find((n) => n.type === 'SUBJECT')?.subjectId ?? undefined,
  };
}

export const subsectionsOf = (root: TreeNode | undefined) => (root?.children ?? []).filter((c) => c.type === 'SUBSECTION' && c.status !== 'ARCHIVED');

/** Header totals from the API's descendant counts. */
export function catalogueTotals(roots: readonly TreeNode[]) {
  return roots.reduce((t, r) => ({ boards: t.boards + r.counts.boards, subjects: t.subjects + r.counts.subjects, levels: t.levels + r.counts.levels }), { boards: 0, subjects: 0, levels: 0 });
}

export interface Offering {
  curriculumId: string;
  nodeId: string;
  categoryId: string;
  categoryName: string;
  requiresBoard: boolean;
  boardId: string | null;
  boardName: string | null;
  subjectId: string;
  subjectName: string;
  levelId: string;
  levelName: string;
  status: TreeNode['status'];
}

/** Every LEVEL leaf with a curriculum: the combinations that exist and can be priced. */
export function offeringsFromTrees(roots: readonly TreeNode[], categories: readonly Category[]): Offering[] {
  const out: Offering[] = [];
  const walk = (node: TreeNode, chain: TreeNode[], category: Category) => {
    if (node.status === 'ARCHIVED') return;
    if (node.type === 'LEVEL' && node.curriculumId && node.levelId) {
      const board = chain.find((n) => n.type === 'BOARD');
      const subject = chain.find((n) => n.type === 'SUBJECT');
      if (subject?.subjectId) {
        out.push({
          curriculumId: node.curriculumId, nodeId: node.id, categoryId: category.id, categoryName: category.name, requiresBoard: category.requiresBoard,
          boardId: board?.boardId ?? null, boardName: board?.name ?? null, subjectId: subject.subjectId, subjectName: subject.name,
          levelId: node.levelId, levelName: node.name, status: node.status,
        });
      }
    }
    for (const child of node.children) walk(child, [...chain, node], category);
  };
  for (const root of roots) {
    const category = categories.find((c) => c.id === root.categoryId);
    if (category) walk(root, [], category);
  }
  return out;
}

/** Distinct options, in first-seen order. */
export function uniqueBy<T>(items: readonly T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(key(item)) ? false : (seen.add(key(item)), true)));
}
