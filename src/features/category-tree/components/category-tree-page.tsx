"use client";
import { useEffect, useMemo, useState } from 'react';
import { BookMarked, Folder, FolderOpen } from 'lucide-react';
import { Badge, Button, Card, Menu, Tabs, TextField, Typography, VirtualTree, type DropPosition, type MenuItem, type TabItem, type VirtualTreeRow } from '@/components/ui';
import { PageHeader, PanelMessage, PanelSkeleton } from '@/components/ui/dashboard-ui';
import { usePermission } from '@/components/security/permission-provider';
import { describeApiError } from '@/lib/api/errors';
import { useCategoryTree, useMoveCategory, useReorderCategories, type CategoryNode } from '@/lib/api/category-tree';
import {
  addChildBlockedReason, buildTree, dropIntent, expandableIds, reorderedSiblings, rowCountLabel, searchMatches, shiftedSiblings,
  visibleRows, type TreeItem,
} from '@/lib/api/category-tree-model';
import { CategoryDetailPanel } from './category-detail-panel';
import { CategoryFormDialog, DeleteCategoryDialog, MoveCategoryDialog, type FormState } from './category-dialogs';

type Dialog =
  | { kind: 'form'; state: FormState }
  | { kind: 'move'; node: CategoryNode; parentId?: string | null }
  | { kind: 'delete'; node: CategoryNode }
  | null;

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return debounced;
}

const timeFormat = new Intl.DateTimeFormat('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' });

/**
 * Admin › Categories & content (screen 28, updated for ADR-0005). The tree is loaded once
 * per session and cached; children render only when their parent is expanded, and the
 * list is virtualised past a few hundred visible rows. Writes are optimistic and roll
 * back when the server refuses them.
 */
export function CategoryTreePage({ tenant, extraTabs = [] }: { tenant: string; extraTabs?: TabItem[] }) {
  const canRead = usePermission('catalogue.read');
  const canManage = usePermission('catalogue.manage');
  const tree = useCategoryTree(tenant, canRead);
  const reorder = useReorderCategories(tenant);
  const move = useMoveCategory(tenant);
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 200);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string>();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<{ tone: 'danger' | 'info'; text: string; stale?: boolean }>();

  const nodes = useMemo(() => tree.data?.nodes ?? [], [tree.data]);
  const roots = useMemo(() => buildTree(nodes), [nodes]);
  const found = useMemo(() => searchMatches(nodes, q), [nodes, q]);
  const open = found ? new Set([...expanded, ...found.open]) : expanded;
  const rows: VirtualTreeRow<TreeItem>[] = useMemo(
    () => visibleRows(roots, open, found?.matches).map((r) => ({
      node: r.item, id: r.item.id, level: r.level, index: r.index, siblings: r.siblings,
      hasChildren: r.item.children.length > 0, parentId: r.item.parentId,
    })),
    [roots, open, found],
  );
  const selected = nodes.find((n) => n.id === selectedId);

  // Roots start open, so the first level of the tree is visible
  useEffect(() => {
    if (nodes.length && expanded.size === 0) setExpanded(new Set(nodes.filter((n) => n.depth === 0).map((n) => n.id)));
  }, [nodes.length]);

  const report = (error: unknown, action: string) => {
    const described = describeApiError(error, action);
    setNotice({ tone: 'danger', text: described.message, stale: described.kind === 'stale' });
  };
  const refresh = () => { setNotice(undefined); void tree.refetch(); };

  const reorderTo = (parentId: string | null, orderedIds: string[]) =>
    reorder.mutate({ parentId, orderedIds }, { onError: (e) => report(e, 'reorder categories') });

  const menuFor = (node: CategoryNode): MenuItem[] => {
    const blocked = addChildBlockedReason(node);
    const up = shiftedSiblings(nodes, node.id, -1);
    const down = shiftedSiblings(nodes, node.id, 1);
    return [
      { id: 'add', label: 'Add sub-category', disabled: Boolean(blocked), onSelect: () => setDialog({ kind: 'form', state: { mode: 'create', parent: node } }) },
      { id: 'edit', label: 'Edit', onSelect: () => setDialog({ kind: 'form', state: { mode: 'edit', node } }) },
      { id: 'up', label: 'Move up', disabled: !up, onSelect: () => up && reorderTo(node.parentId, up) },
      { id: 'down', label: 'Move down', disabled: !down, onSelect: () => down && reorderTo(node.parentId, down) },
      { id: 'move', label: 'Move to…', onSelect: () => setDialog({ kind: 'move', node }) },
      { id: 'delete', label: 'Delete', destructive: true, onSelect: () => setDialog({ kind: 'delete', node }) },
    ];
  };

  const onDrop = (draggedId: string, target: VirtualTreeRow<TreeItem>, position: DropPosition) => {
    const dragged = nodes.find((n) => n.id === draggedId);
    if (!dragged) return;
    if (position === 'inside') {
      // A different parent is a move: confirm it, it rebuilds the branch's paths
      setDialog({ kind: 'move', node: dragged, parentId: target.id });
      return;
    }
    const ordered = reorderedSiblings(nodes, draggedId, target.id, position === 'after');
    if (ordered) reorderTo(dragged.parentId, ordered);
  };

  if (!canRead) return <PanelMessage>You don&apos;t have permission to view the catalogue.</PanelMessage>;

  const stats = tree.data?.stats;
  const subtitle = stats
    ? `${stats.categories.toLocaleString('en-IN')} categories · ${stats.bookableLeaves.toLocaleString('en-IN')} bookable · ${stats.curricula.toLocaleString('en-IN')} curricula`
    : 'Categories and sub-categories students can book';

  return <div className="flex flex-col gap-4">
    <PageHeader title="Categories & content" subtitle={subtitle} action={canManage &&
      <Button variant="primary" onClick={() => setDialog({ kind: 'form', state: { mode: 'create', parent: null } })}>Add root category</Button>} />

    <Tabs label="Categories and content" items={[{ id: 'categories', label: 'Categories', content: <div className="flex flex-col gap-4 pt-4">
    {notice && <Card className="flex flex-wrap items-center gap-3 p-3" role="alert">
      <Typography variant="body2" tone={notice.tone === 'danger' ? 'danger' : 'default'}>{notice.text}</Typography>
      {notice.stale && <Button size="sm" onClick={refresh}>Reload</Button>}
      <Button size="sm" variant="ghost" onClick={() => setNotice(undefined)}>Dismiss</Button>
    </Card>}

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
      <Card className="flex min-w-0 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col">
            <Typography variant="h3" component="h2">Category manager</Typography>
            <Typography variant="caption" tone="muted">Organize categories, sub-categories and bookable leaves. Drag to reorder.</Typography>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TextField label="Search categories" labelHidden type="search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="flex gap-1">
              <Button size="sm" onClick={() => setExpanded(new Set(expandableIds(nodes)))}>Expand all</Button>
              <Button size="sm" variant="ghost" onClick={() => setExpanded(new Set())}>Collapse all</Button>
            </div>
          </div>
        </div>

        {tree.isPending ? <PanelSkeleton rows={8} />
          : tree.isError ? <PanelMessage onRetry={() => void tree.refetch()}>The categories could not be loaded. {describeApiError(tree.error, 'view the catalogue').message}</PanelMessage>
          : nodes.length === 0 ? <div className="flex flex-col items-start gap-3 py-6">
              <Typography>There are no categories yet. Start with a root such as Academic.</Typography>
              {canManage && <Button variant="primary" onClick={() => setDialog({ kind: 'form', state: { mode: 'create', parent: null } })}>Add root category</Button>}
            </div>
          : rows.length === 0 ? <Typography tone="muted">Nothing matches “{q}”.</Typography>
          : <VirtualTree label="Category tree" rows={rows} expanded={open} selectedId={selectedId}
              onToggle={(id, isOpen) => setExpanded((current) => { const next = new Set(current); if (isOpen) next.add(id); else next.delete(id); return next; })}
              onSelect={(row) => setSelectedId(row.id)}
              getLabel={(row) => row.node.name}
              canDrag={() => canManage && !reorder.isPending && !move.isPending}
              canDrop={(draggedId, target, position) => {
                const intent = dropIntent(nodes, draggedId, target.node);
                return position === 'inside' ? intent === 'move' : intent === 'reorder';
              }}
              onDrop={onDrop}
              renderLabel={(row) => {
                const n = row.node;
                const Icon = n.isBookable ? BookMarked : row.hasChildren && open.has(n.id) ? FolderOpen : Folder;
                return <>
                  <Icon size={16} aria-hidden="true" className="shrink-0 text-[var(--muted)]" />
                  <Typography component="span" variant={n.depth === 0 ? 'subtitle2' : 'body2'} className="truncate">{n.name}</Typography>
                  {n.isBookable && <Badge tone="info">Bookable</Badge>}
                  {!n.isActive && <Badge tone="warning">Inactive</Badge>}
                  <Typography component="span" variant="caption" tone="muted" className="ml-auto shrink-0 whitespace-nowrap">{rowCountLabel(n)}</Typography>
                </>;
              }}
              renderActions={canManage ? (row) => <Menu label={`Actions for ${row.node.name}`} items={menuFor(row.node)} triggerTabIndex={-1} /> : undefined} />}

        {tree.data && <div className="flex items-center gap-2">
          <Typography variant="caption" tone="muted">Loaded at {timeFormat.format(new Date(tree.data.generatedAt))}{tree.isFetching ? ' · refreshing…' : ''}</Typography>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={tree.isFetching}>Refresh</Button>
        </div>}
      </Card>

      <div className="min-w-0">
        <CategoryDetailPanel tenant={tenant} node={selected} nodes={nodes} canManage={canManage}
          onAddChild={(parent) => setDialog({ kind: 'form', state: { mode: 'create', parent } })}
          onEdit={(node) => setDialog({ kind: 'form', state: { mode: 'edit', node } })}
          onMove={(node) => setDialog({ kind: 'move', node })}
          onDelete={(node) => setDialog({ kind: 'delete', node })}
          onError={report} />
      </div>
    </div>
    </div> }, ...extraTabs]} />

    {dialog?.kind === 'form' && <CategoryFormDialog tenant={tenant} state={dialog.state} nodes={nodes} onClose={() => setDialog(null)}
      onSaved={(id) => {
        const parent = dialog.state.mode === 'create' ? dialog.state.parent : null;
        setDialog(null);
        setSelectedId(id);
        if (parent) setExpanded((c) => new Set([...c, parent.id]));
      }} />}
    {dialog?.kind === 'move' && <MoveCategoryDialog tenant={tenant} node={dialog.node} nodes={nodes} initialParentId={dialog.parentId}
      onClose={() => setDialog(null)} onMoved={(parentId) => { setDialog(null); if (parentId) setExpanded((c) => new Set([...c, parentId])); }} />}
    {dialog?.kind === 'delete' && <DeleteCategoryDialog tenant={tenant} node={dialog.node} onClose={() => setDialog(null)}
      onDeleted={() => { setDialog(null); setSelectedId(undefined); }} />}
  </div>;
}
