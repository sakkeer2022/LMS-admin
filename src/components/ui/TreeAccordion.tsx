"use client";
import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from './Button';
import { cx } from './utils';

export type TreeAccordionNode<T> = { id: string; children: readonly T[] };

type Visible<T> = { node: T; depth: number; parentId: string | null };

/** Rows currently shown: every root, plus the children of expanded nodes. */
export function visibleTreeRows<T extends TreeAccordionNode<T>>(roots: readonly T[], expanded: ReadonlySet<string>) {
  const rows: Visible<T>[] = [];
  const walk = (nodes: readonly T[], depth: number, parentId: string | null) => {
    for (const node of nodes) {
      rows.push({ node, depth, parentId });
      if (expanded.has(node.id)) walk(node.children, depth + 1, node.id);
    }
  };
  walk(roots, 1, null);
  return rows;
}

/** Every id that has children, for "Expand all". */
export function expandableIds<T extends TreeAccordionNode<T>>(roots: readonly T[]) {
  const ids: string[] = [];
  const walk = (nodes: readonly T[]) => { for (const n of nodes) if (n.children.length) { ids.push(n.id); walk(n.children); } };
  walk(roots);
  return ids;
}

/**
 * Nested, keyboard-accessible tree (WAI-ARIA tree pattern): role="tree"/"treeitem",
 * aria-expanded, one tab stop, Up/Down to move, Right to expand or enter, Left to
 * collapse or leave, Home/End, Enter or Space to select. Native <details> cannot carry
 * treeitem semantics, so Disclosure is not used here; the expand toggle is a Button.
 */
export function TreeAccordion<T extends TreeAccordionNode<T>>({ label, roots, expanded, onExpandedChange, selectedId, onSelect, renderLabel, renderActions, getLabel, className }: {
  label: string;
  /** Short accessible name per item; otherwise it is computed from the whole subtree's text. */
  getLabel?: (node: T) => string;
  roots: readonly T[];
  expanded: ReadonlySet<string>;
  onExpandedChange: (next: Set<string>) => void;
  selectedId?: string;
  onSelect: (node: T) => void;
  renderLabel: (node: T) => ReactNode;
  renderActions?: (node: T) => ReactNode;
  className?: string;
}) {
  const tree = useRef<HTMLUListElement>(null);
  const rows = useMemo(() => visibleTreeRows(roots, expanded), [roots, expanded]);
  const [focusedId, setFocusedId] = useState<string>();
  const tabStop = rows.find((r) => r.node.id === focusedId)?.node.id ?? rows.find((r) => r.node.id === selectedId)?.node.id ?? rows[0]?.node.id;

  const focus = (id: string) => {
    setFocusedId(id);
    tree.current?.querySelector<HTMLElement>(`[data-tree-id="${CSS.escape(id)}"]`)?.focus();
  };
  const toggle = (id: string, open?: boolean) => {
    const next = new Set(expanded);
    if (open ?? !next.has(id)) next.add(id); else next.delete(id);
    onExpandedChange(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const index = rows.findIndex((r) => r.node.id === (document.activeElement as HTMLElement | null)?.dataset.treeId);
    if (index < 0) return;
    const row = rows[index];
    const hasChildren = row.node.children.length > 0;
    const isOpen = expanded.has(row.node.id);
    const handled = (() => {
      switch (event.key) {
        case 'ArrowDown': if (rows[index + 1]) focus(rows[index + 1].node.id); return true;
        case 'ArrowUp': if (rows[index - 1]) focus(rows[index - 1].node.id); return true;
        case 'Home': if (rows[0]) focus(rows[0].node.id); return true;
        case 'End': if (rows.length) focus(rows[rows.length - 1].node.id); return true;
        case 'ArrowRight':
          if (hasChildren && !isOpen) toggle(row.node.id, true);
          else if (hasChildren) focus(row.node.children[0].id);
          return true;
        case 'ArrowLeft':
          if (hasChildren && isOpen) toggle(row.node.id, false);
          else if (row.parentId) focus(row.parentId);
          return true;
        case 'Enter': case ' ': onSelect(row.node); return true;
        default: return false;
      }
    })();
    if (handled) event.preventDefault();
  };

  const branch = (nodes: readonly T[], depth: number): ReactNode => nodes.map((node) => {
    const hasChildren = node.children.length > 0;
    const isOpen = expanded.has(node.id);
    return <li key={node.id} role="treeitem" data-tree-id={node.id} aria-level={depth} aria-label={getLabel?.(node)}
      aria-expanded={hasChildren ? isOpen : undefined} aria-selected={node.id === selectedId}
      tabIndex={node.id === tabStop ? 0 : -1} className="ui-tree-item"
      onFocus={(event) => { if (event.target === event.currentTarget) setFocusedId(node.id); }}
      onClick={(event) => { event.stopPropagation(); setFocusedId(node.id); onSelect(node); }}>
      <div className={cx('ui-tree-row', node.id === selectedId && 'ui-tree-row--selected')} style={{ paddingInlineStart: `${(depth - 1) * 20 + 4}px` }}>
        {hasChildren
          ? <Button size="icon" variant="ghost" tabIndex={-1} aria-hidden="true" className="ui-tree-toggle"
              onClick={(event) => { event.stopPropagation(); toggle(node.id); }}>{isOpen ? '▾' : '▸'}</Button>
          : <span className="ui-tree-spacer" aria-hidden="true" />}
        <div className="ui-tree-label">{renderLabel(node)}</div>
        {renderActions && <div className="ui-tree-actions">{renderActions(node)}</div>}
      </div>
      {hasChildren && isOpen && <ul role="group">{branch(node.children, depth + 1)}</ul>}
    </li>;
  });

  return <ul ref={tree} role="tree" aria-label={label} className={cx('ui-tree', className)} onKeyDown={onKeyDown}>
    {branch(roots, 1)}
  </ul>;
}
