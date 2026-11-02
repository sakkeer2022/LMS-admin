"use client";
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from './Button';
import { cx } from './utils';

export type VirtualTreeRow<T> = { node: T; id: string; level: number; index: number; siblings: number; hasChildren: boolean; parentId: string | null };
export type DropPosition = 'before' | 'after' | 'inside';

const ROW_HEIGHT = 40;
/** Above this many visible rows only the rows in view (plus a margin) are rendered. */
export const VIRTUALIZE_AFTER = 300;
const OVERSCAN = 20;

/**
 * Flat, keyboard-accessible tree (WAI-ARIA tree pattern with aria-level, aria-setsize
 * and aria-posinset instead of nested groups). Rows come from the caller, who only lists
 * the children of expanded nodes, so collapsed branches cost nothing. Past
 * VIRTUALIZE_AFTER visible rows it renders only the window in view.
 *
 * Optional drag and drop: `canDrop` decides per target and position; `onDrop` receives
 * the dragged id. Keyboard users need an equivalent action (for example Move up/down).
 */
export function VirtualTree<T>({ label, rows, expanded, onToggle, selectedId, onSelect, renderLabel, renderActions, getLabel, canDrag, canDrop, onDrop, height = 560, className }: {
  label: string;
  rows: readonly VirtualTreeRow<T>[];
  expanded: ReadonlySet<string>;
  onToggle: (id: string, open: boolean) => void;
  selectedId?: string;
  onSelect: (row: VirtualTreeRow<T>) => void;
  renderLabel: (row: VirtualTreeRow<T>) => ReactNode;
  renderActions?: (row: VirtualTreeRow<T>) => ReactNode;
  getLabel?: (row: VirtualTreeRow<T>) => string;
  canDrag?: (row: VirtualTreeRow<T>) => boolean;
  canDrop?: (draggedId: string, target: VirtualTreeRow<T>, position: DropPosition) => boolean;
  onDrop?: (draggedId: string, target: VirtualTreeRow<T>, position: DropPosition) => void;
  height?: number;
  className?: string;
}) {
  const list = useRef<HTMLUListElement>(null);
  const [focusedId, setFocusedId] = useState<string>();
  const [scrollTop, setScrollTop] = useState(0);
  const [dragging, setDragging] = useState<string>();
  const [dropTarget, setDropTarget] = useState<{ id: string; position: DropPosition }>();
  const virtual = rows.length > VIRTUALIZE_AFTER;
  const tabStop = rows.find((r) => r.id === focusedId)?.id ?? rows.find((r) => r.id === selectedId)?.id ?? rows[0]?.id;

  const first = virtual ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) : 0;
  const last = virtual ? Math.min(rows.length, Math.ceil((scrollTop + height) / ROW_HEIGHT) + OVERSCAN) : rows.length;
  const shown = rows.slice(first, last);

  const focus = (index: number) => {
    const row = rows[index];
    if (!row) return;
    setFocusedId(row.id);
    if (virtual && list.current) {
      const top = index * ROW_HEIGHT;
      if (top < list.current.scrollTop) list.current.scrollTop = top;
      else if (top + ROW_HEIGHT > list.current.scrollTop + height) list.current.scrollTop = top + ROW_HEIGHT - height;
    }
    requestAnimationFrame(() => list.current?.querySelector<HTMLElement>(`[data-tree-id="${CSS.escape(row.id)}"]`)?.focus());
  };

  // Keep the selected row in view when the selection changes from outside (search, create)
  useEffect(() => {
    if (!selectedId || !list.current) return;
    const index = rows.findIndex((r) => r.id === selectedId);
    if (index < 0) return;
    const top = index * ROW_HEIGHT;
    if (virtual && (top < list.current.scrollTop || top > list.current.scrollTop + height - ROW_HEIGHT)) list.current.scrollTop = Math.max(0, top - height / 2);
  }, [selectedId]);

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const index = rows.findIndex((r) => r.id === (document.activeElement as HTMLElement | null)?.dataset.treeId);
    if (index < 0) return;
    const row = rows[index];
    const open = expanded.has(row.id);
    const handled = (() => {
      switch (event.key) {
        case 'ArrowDown': focus(index + 1); return true;
        case 'ArrowUp': focus(index - 1); return true;
        case 'Home': focus(0); return true;
        case 'End': focus(rows.length - 1); return true;
        case 'ArrowRight':
          if (row.hasChildren && !open) onToggle(row.id, true);
          else if (row.hasChildren) focus(index + 1);
          return true;
        case 'ArrowLeft':
          if (row.hasChildren && open) onToggle(row.id, false);
          else if (row.parentId) focus(rows.findIndex((r) => r.id === row.parentId));
          return true;
        case 'Enter': case ' ': onSelect(row); return true;
        default: return false;
      }
    })();
    if (handled) event.preventDefault();
  };

  const positionFor = (event: DragEvent<HTMLElement>, row: VirtualTreeRow<T>): DropPosition | null => {
    if (!dragging || !canDrop) return null;
    const box = event.currentTarget.getBoundingClientRect();
    const y = (event.clientY - box.top) / box.height;
    const order: DropPosition[] = y < 0.3 ? ['before', 'inside'] : y > 0.7 ? ['after', 'inside'] : ['inside', 'before'];
    return order.find((p) => canDrop(dragging, row, p)) ?? null;
  };

  return <ul ref={list} role="tree" aria-label={label} className={cx('ui-tree ui-vtree', className)} onKeyDown={onKeyDown}
    style={{ maxHeight: height, overflowY: 'auto', position: 'relative' }}
    onScroll={virtual ? (e) => setScrollTop(e.currentTarget.scrollTop) : undefined}>
    {virtual && <li aria-hidden="true" style={{ height: first * ROW_HEIGHT }} />}
    {shown.map((row) => {
      const open = expanded.has(row.id);
      const drop = dropTarget?.id === row.id ? dropTarget.position : undefined;
      const draggable = Boolean(onDrop && canDrag?.(row));
      return <li key={row.id} role="treeitem" data-tree-id={row.id} aria-level={row.level} aria-setsize={row.siblings} aria-posinset={row.index + 1}
        aria-label={getLabel?.(row)} aria-expanded={row.hasChildren ? open : undefined} aria-selected={row.id === selectedId}
        tabIndex={row.id === tabStop ? 0 : -1} className="ui-tree-item"
        draggable={draggable || undefined}
        onDragStart={draggable ? (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', row.id); setDragging(row.id); } : undefined}
        onDragEnd={() => { setDragging(undefined); setDropTarget(undefined); }}
        onDragOver={(e) => {
          const position = positionFor(e, row);
          if (!position) { if (drop) setDropTarget(undefined); return; }
          e.preventDefault();
          if (drop !== position) setDropTarget({ id: row.id, position });
        }}
        onDragLeave={() => { if (drop) setDropTarget(undefined); }}
        onDrop={(e) => {
          const position = positionFor(e, row);
          e.preventDefault();
          if (dragging && position) onDrop?.(dragging, row, position);
          setDragging(undefined); setDropTarget(undefined);
        }}
        onFocus={(event) => { if (event.target === event.currentTarget) setFocusedId(row.id); }}
        onClick={() => { setFocusedId(row.id); onSelect(row); }}>
        <div className={cx('ui-tree-row', row.id === selectedId && 'ui-tree-row--selected', drop && `ui-tree-row--drop-${drop}`, dragging === row.id && 'ui-tree-row--dragging')}
          style={{ paddingInlineStart: `${(row.level - 1) * 20 + 4}px`, height: ROW_HEIGHT }}>
          {row.hasChildren
            ? <Button size="icon" variant="ghost" tabIndex={-1} aria-hidden="true" className="ui-tree-toggle"
                onClick={(event) => { event.stopPropagation(); onToggle(row.id, !open); }}>{open ? '▾' : '▸'}</Button>
            : <span className="ui-tree-spacer" aria-hidden="true" />}
          <div className="ui-tree-label">{renderLabel(row)}</div>
          {renderActions && <div className="ui-tree-actions" onClick={(e) => e.stopPropagation()}>{renderActions(row)}</div>}
        </div>
      </li>;
    })}
    {virtual && <li aria-hidden="true" style={{ height: (rows.length - last) * ROW_HEIGHT }} />}
  </ul>;
}
