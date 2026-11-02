"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import {
  DndContext, DragOverlay, MeasuringStrategy, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent, type DragMoveEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS as DndCSS } from '@dnd-kit/utilities';
import { BookOpen, ChevronDown, ChevronRight, FileText, Folder, GripVertical, LayoutList, Pencil, Trash2 } from 'lucide-react';
import { Badge, Button, Switch, Typography, cx } from '@/components/ui';
import type { CategoryNode } from '@/lib/api/category-tree';
import {
  invalidDropMessage, isSelfOrDescendant, keyboardPlacement, projectDrop, rowCount, rowCountLabel,
  type Placement, type Projection, type TreeItem,
} from '@/lib/api/category-tree-model';

export interface TreeRow {
  item: TreeItem;
  level: number;
  index: number;
  siblings: number;
}

/** Row height and indentation, as in the design (screen 28) */
export const ROW_HEIGHT = 40;
export const INDENT = 20;
/** Outside reorder mode, past this many visible rows only the rows in view are rendered. */
export const VIRTUALIZE_AFTER = 300;
const OVERSCAN = 20;
const VIEWPORT = 560;
const EXPAND_ON_HOVER_MS = 700;

export interface CategoryTreeListProps {
  rows: readonly TreeRow[];
  nodes: readonly CategoryNode[];
  expanded: ReadonlySet<string>;
  onToggle: (id: string, open: boolean) => void;
  selectedId?: string;
  onSelect: (node: CategoryNode) => void;
  /** Reorder mode: rows can be dragged; selection and row actions are paused. */
  reorder: boolean;
  onRelocate: (node: CategoryNode, to: Placement) => void;
  onInvalidDrop: (message: string) => void;
  canManage: boolean;
  /** Ids with a write in flight; their controls are disabled */
  pendingIds: ReadonlySet<string>;
  onEdit: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode) => void;
  onToggleActive: (node: CategoryNode, isActive: boolean) => void;
  /** Called when a drag starts and ends (Escape then cancels the drag, not reorder mode) */
  onDraggingChange?: (dragging: boolean) => void;
}

/** Icon by depth, as in the design: folders, then board/course, subject and level. */
function NodeIcon({ node }: { node: CategoryNode }) {
  const Icon = node.depth <= 1 ? Folder : node.depth === 2 ? BookOpen : node.depth === 3 ? FileText : LayoutList;
  return <Icon size={16} strokeWidth={1.75} aria-hidden="true"
    className={cx('shrink-0', node.depth <= 1 ? 'text-[var(--accent)]' : 'text-[var(--muted)]')} />;
}

/**
 * The Category manager tree (screen 28). A flat WAI-ARIA tree (aria-level, aria-setsize,
 * aria-posinset) with one tab stop and arrow-key navigation. In reorder mode rows are
 * sortable with dnd-kit: the row under the pointer gives the position and the horizontal
 * drag (in INDENT steps) the depth; Alt+arrow keys do the same from the keyboard.
 */
export function CategoryTreeList(props: CategoryTreeListProps) {
  const { rows, nodes, expanded, onToggle, selectedId, onSelect, reorder, onRelocate, onInvalidDrop } = props;
  const list = useRef<HTMLUListElement>(null);
  const [focusedId, setFocusedId] = useState<string>();
  const [scrollTop, setScrollTop] = useState(0);
  const [activeId, setActiveId] = useState<string>();
  const [overId, setOverId] = useState<string>();
  const [offsetX, setOffsetX] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const expandTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // While dragging, the dragged node's own subtree is not a drop target
  const active = activeId ? nodes.find((n) => n.id === activeId) : undefined;
  const dragRows = useMemo(
    () => (active ? rows.filter((r) => r.item.id === active.id || !isSelfOrDescendant(active, r.item)) : rows),
    [rows, active],
  );
  const flat = useMemo(() => dragRows.map((r) => ({ id: r.item.id, parentId: r.item.parentId, depth: r.item.depth })), [dragRows]);
  const projection: Projection | null = activeId && overId ? projectDrop(flat, nodes, activeId, overId, offsetX, INDENT) : null;

  const virtual = !reorder && rows.length > VIRTUALIZE_AFTER;
  const first = virtual ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) : 0;
  const last = virtual ? Math.min(rows.length, Math.ceil((scrollTop + VIEWPORT) / ROW_HEIGHT) + OVERSCAN) : dragRows.length;
  const shown = virtual ? rows.slice(first, last) : dragRows;
  const tabStop = rows.find((r) => r.item.id === focusedId)?.item.id ?? rows.find((r) => r.item.id === selectedId)?.item.id ?? rows[0]?.item.id;

  useEffect(() => () => clearTimeout(expandTimer.current), []);

  const focusRow = (index: number) => {
    const row = rows[index];
    if (!row) return;
    setFocusedId(row.item.id);
    if (virtual && list.current) {
      const top = index * ROW_HEIGHT;
      if (top < list.current.scrollTop) list.current.scrollTop = top;
      else if (top + ROW_HEIGHT > list.current.scrollTop + VIEWPORT) list.current.scrollTop = top + ROW_HEIGHT - VIEWPORT;
    }
    requestAnimationFrame(() => list.current?.querySelector<HTMLElement>(`[data-tree-id="${CSS.escape(row.item.id)}"]`)?.focus());
  };

  const say = (message: string) => setAnnouncement(message);

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const index = rows.findIndex((r) => r.item.id === (document.activeElement as HTMLElement | null)?.dataset.treeId);
    if (index < 0) return;
    const row = rows[index];
    const node = row.item;
    // Keyboard alternative to dragging
    if (reorder && event.altKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const to = keyboardPlacement(nodes, node.id, event.key as 'ArrowUp');
      if (!to) return say(`${node.name} cannot move further that way.`);
      if ('invalid' in to) {
        const message = invalidDropMessage(to.invalid, nodes, to.parentId);
        onInvalidDrop(message);
        return say(message);
      }
      onRelocate(node, to);
      const parent = nodes.find((n) => n.id === to.parentId);
      say(`${node.name} moved to position ${to.index + 1} under ${parent?.name ?? 'the top level'}.`);
      if (to.parentId) onToggle(to.parentId, true);
      requestAnimationFrame(() => list.current?.querySelector<HTMLElement>(`[data-tree-id="${CSS.escape(node.id)}"]`)?.focus());
      return;
    }
    const open = expanded.has(node.id);
    const hasChildren = node.childrenCount > 0;
    const handled = (() => {
      switch (event.key) {
        case 'ArrowDown': focusRow(index + 1); return true;
        case 'ArrowUp': focusRow(index - 1); return true;
        case 'Home': focusRow(0); return true;
        case 'End': focusRow(rows.length - 1); return true;
        case 'ArrowRight':
          if (hasChildren && !open) onToggle(node.id, true);
          else if (hasChildren) focusRow(index + 1);
          return true;
        case 'ArrowLeft':
          if (hasChildren && open) onToggle(node.id, false);
          else if (node.parentId) focusRow(rows.findIndex((r) => r.item.id === node.parentId));
          return true;
        case 'Enter': case ' ':
          if (!reorder) onSelect(node);
          return true;
        default: return false;
      }
    })();
    if (handled) event.preventDefault();
  };

  const resetDrag = () => {
    clearTimeout(expandTimer.current);
    // Deferred: the Escape that cancels a drag must not also reach the page's Escape handler
    setTimeout(() => props.onDraggingChange?.(false), 0);
    setActiveId(undefined);
    setOverId(undefined);
    setOffsetX(0);
  };

  const onDragStart = ({ active: a }: DragStartEvent) => {
    props.onDraggingChange?.(true);
    setActiveId(String(a.id));
    setOverId(String(a.id));
    const node = nodes.find((n) => n.id === a.id);
    if (node) say(`Picked up ${node.name}.`);
  };
  const onDragMove = ({ delta }: DragMoveEvent) => setOffsetX(delta.x);
  const onDragOver = ({ over }: DragOverEvent) => {
    const id = over ? String(over.id) : undefined;
    setOverId(id);
    clearTimeout(expandTimer.current);
    // Hovering over a collapsed branch opens it, so the drop can go inside
    const target = id ? nodes.find((n) => n.id === id) : undefined;
    if (target && target.id !== activeId && target.childrenCount > 0 && !expanded.has(target.id)) {
      expandTimer.current = setTimeout(() => onToggle(target.id, true), EXPAND_ON_HOVER_MS);
    }
  };
  const onDragEnd = ({ active: a }: DragEndEvent) => {
    const node = nodes.find((n) => n.id === a.id);
    const result = projection;
    resetDrag();
    if (!node || !result) return;
    if (result.invalid) {
      const message = invalidDropMessage(result.invalid, nodes, result.parentId);
      onInvalidDrop(message);
      say(message);
      return;
    }
    onRelocate(node, { parentId: result.parentId, index: result.index });
    const parent = nodes.find((n) => n.id === result.parentId);
    say(`${node.name} dropped at position ${result.index + 1} under ${parent?.name ?? 'the top level'}.`);
  };

  const body = <ul ref={list} role="tree" aria-label="Category tree" aria-describedby={reorder ? 'category-tree-reorder-help' : undefined}
    className={cx('m-0 list-none p-0', !reorder && 'overflow-y-auto')} style={{ maxHeight: reorder ? undefined : VIEWPORT, position: 'relative' }}
    onKeyDown={onKeyDown} onScroll={virtual ? (e) => setScrollTop(e.currentTarget.scrollTop) : undefined}>
    {virtual && <li aria-hidden="true" style={{ height: first * ROW_HEIGHT }} />}
    {shown.map((row) => <SortableRow key={row.item.id} row={row} list={props} focused={row.item.id === tabStop}
      projectedDepth={row.item.id === activeId ? projection?.depth : undefined}
      invalid={row.item.id === activeId && Boolean(projection?.invalid)}
      onFocusRow={() => setFocusedId(row.item.id)} />)}
    {virtual && <li aria-hidden="true" style={{ height: (rows.length - last) * ROW_HEIGHT }} />}
  </ul>;

  return <>
    {reorder
      ? <DndContext sensors={sensors} collisionDetection={closestCenter} measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={onDragStart} onDragMove={onDragMove} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={resetDrag}
          accessibility={{ announcements: {
            onDragStart: () => '', onDragMove: () => '', onDragOver: () => '', onDragEnd: () => '', onDragCancel: () => 'Move cancelled.',
          } }}>
          <SortableContext items={flat.map((f) => f.id)} strategy={verticalListSortingStrategy}>{body}</SortableContext>
          <DragOverlay dropAnimation={null} zIndex={70}>
            {active && <DragPreview node={active} />}
          </DragOverlay>
        </DndContext>
      : body}
    <span role="status" aria-live="polite" className="sr-only">{announcement}</span>
  </>;
}

function DragPreview({ node }: { node: CategoryNode }) {
  return <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--surface)] px-4 shadow-[0_12px_28px_rgb(15_23_42/0.18)]"
    style={{ height: ROW_HEIGHT, cursor: 'grabbing' }}>
    <GripVertical size={16} aria-hidden="true" className="text-[var(--muted)]" />
    <NodeIcon node={node} />
    <Typography component="span" variant="body2">{node.name}</Typography>
  </div>;
}

function SortableRow({ row, list, focused, projectedDepth, invalid, onFocusRow }: {
  row: TreeRow;
  list: CategoryTreeListProps;
  focused: boolean;
  projectedDepth?: number;
  invalid: boolean;
  onFocusRow: () => void;
}) {
  const { reorder, expanded, onToggle, selectedId, onSelect, canManage, pendingIds, onEdit, onDelete, onToggleActive } = list;
  const node = row.item;
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: node.id, disabled: !reorder });
  const open = expanded.has(node.id);
  const hasChildren = node.childrenCount > 0;
  const selected = !reorder && node.id === selectedId;
  const depth = projectedDepth ?? node.depth;
  const pending = pendingIds.has(node.id);
  const style: CSSProperties = { transform: DndCSS.Translate.toString(transform), transition };

  const actions: ReactNode = canManage && !reorder && <div className="flex shrink-0 items-center gap-1"
    onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
    <Switch size="sm" checked={node.isActive} disabled={pending} tabIndex={-1}
      label={`${node.isActive ? 'Deactivate' : 'Activate'} ${node.name}`} onCheckedChange={(value) => onToggleActive(node, value)} />
    <Button size="icon" variant="ghost" tabIndex={-1} aria-label={`Edit ${node.name}`} title="Edit" disabled={pending}
      style={{ width: 28, height: 28, minHeight: 28, padding: 0 }} onClick={() => onEdit(node)}>
      <Pencil size={14} aria-hidden="true" />
    </Button>
    <Button size="icon" variant="ghost" tabIndex={-1} aria-label={`Delete ${node.name}`} title="Delete" disabled={pending}
      style={{ width: 28, height: 28, minHeight: 28, padding: 0 }} onClick={() => onDelete(node)}>
      <Trash2 size={14} aria-hidden="true" />
    </Button>
  </div>;

  return <li ref={setNodeRef} style={style} role="treeitem" data-tree-id={node.id} aria-level={row.level} aria-setsize={row.siblings}
    aria-posinset={row.index + 1} aria-label={`${node.name}, ${rowCountLabel(node)}${node.isActive ? '' : ', inactive'}`}
    aria-expanded={hasChildren ? open : undefined} aria-selected={selected} tabIndex={focused ? 0 : -1}
    className="group outline-none focus-visible:[&>div]:outline focus-visible:[&>div]:outline-2 focus-visible:[&>div]:-outline-offset-2 focus-visible:[&>div]:outline-[var(--accent)]"
    onFocus={(e) => { if (e.target === e.currentTarget) onFocusRow(); }}
    onClick={() => { onFocusRow(); if (!reorder) onSelect(node); }}
    {...(reorder ? listeners : {})}>
    <div className={cx(
      'flex items-center gap-2 border-b border-[var(--border)] pr-4 transition-colors',
      selected ? 'bg-[var(--accent-soft)]' : !reorder && 'hover:bg-[var(--subtle)]',
      reorder && 'cursor-grab bg-[var(--surface)] active:cursor-grabbing',
      isDragging && (invalid
        ? 'border border-dashed border-[var(--danger)] bg-[var(--danger-bg)]'
        : 'border border-dashed border-[var(--accent)] bg-[var(--accent-soft)]'),
      !node.isActive && !isDragging && 'opacity-60',
    )} style={{ height: ROW_HEIGHT, paddingInlineStart: 16 + depth * INDENT, transition: 'padding-inline-start 120ms ease' }}>
      {reorder && <GripVertical size={16} aria-hidden="true" className="-ml-1 shrink-0 text-[var(--muted)]" />}
      {hasChildren
        ? <Button size="icon" variant="ghost" tabIndex={-1} aria-hidden="true" style={{ width: 20, height: 20, minHeight: 20, padding: 0 }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggle(node.id, !open); }}>
            {open ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
          </Button>
        : <span className="inline-block w-5 shrink-0" aria-hidden="true" />}
      <NodeIcon node={node} />
      <Typography component="span" variant={node.depth === 0 ? 'subtitle2' : 'body2'} className="min-w-0 truncate">{node.name}</Typography>
      {node.isBookable && <Badge tone="info" className="shrink-0">Bookable</Badge>}
      {!node.isActive && <Badge tone="warning" className="shrink-0">Inactive</Badge>}
      <Typography component="span" variant="caption" tone="muted" className="ml-auto shrink-0 tabular-nums" title={rowCountLabel(node)} aria-hidden="true">
        {rowCount(node)}
      </Typography>
      {actions}
    </div>
  </li>;
}
