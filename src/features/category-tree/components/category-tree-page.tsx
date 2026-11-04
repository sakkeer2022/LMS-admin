"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Button, Card, Input, Tabs, Typography, cx, type TabItem } from '@/components/ui';
import { PanelMessage, PanelSkeleton } from '@/components/ui/dashboard-ui';
import { usePermission } from '@/components/security/permission-provider';
import { describeApiError } from '@/lib/api/errors';
import { useCategoryTree, useRelocateCategory, useUpdateCategory, type CategoryNode } from '@/lib/api/category-tree';
import { buildTree, expandableIds, relocation, searchMatches, visibleRows, type Placement } from '@/lib/api/category-tree-model';
import { CategoryDetailPanel } from './category-detail-panel';
import { CategoryFormDialog, DeleteCategoryDialog, type FormState } from './category-dialogs';
import { CategoryTreeList, type TreeRow } from './category-tree-list';

type Dialog = { kind: 'form'; state: FormState } | { kind: 'delete'; node: CategoryNode } | null;

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return debounced;
}

const timeFormat = new Intl.DateTimeFormat('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' });

/**
 * Admin › Categories & content (screen 28). The tree is loaded once per session and
 * cached; children render only when expanded. Reorder mode dims the page and makes the
 * tree draggable: drop to reorder siblings, drag right or left to change the parent.
 * Writes are optimistic and roll back when the server refuses them.
 */
export function CategoryTreePage({ tenant, extraTabs = [] }: { tenant: string; extraTabs?: TabItem[] }) {
  const canRead = usePermission('catalogue.read');
  const canManage = usePermission('catalogue.manage');
  const tree = useCategoryTree(tenant, canRead);
  const relocate = useRelocateCategory(tenant);
  const update = useUpdateCategory(tenant);
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 200);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string>();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reorder, setReorder] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'danger' | 'info'; text: string; stale?: boolean }>();
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const dragging = useRef(false);

  const nodes = useMemo(() => tree.data?.nodes ?? [], [tree.data]);
  const roots = useMemo(() => buildTree(nodes), [nodes]);
  // Search is paused while reordering: a filtered tree would hide drop positions
  const found = useMemo(() => (reorder ? null : searchMatches(nodes, q)), [nodes, q, reorder]);
  const open = useMemo(() => (found ? new Set([...expanded, ...found.open]) : expanded), [expanded, found]);
  const rows: TreeRow[] = useMemo(() => visibleRows(roots, open, found?.matches), [roots, open, found]);
  const selected = nodes.find((n) => n.id === selectedId);
  const allExpandable = useMemo(() => expandableIds(nodes), [nodes]);
  const allOpen = allExpandable.length > 0 && allExpandable.every((id) => expanded.has(id));

  // Roots start open, so the first level is visible
  useEffect(() => {
    if (nodes.length && expanded.size === 0) setExpanded(new Set(nodes.filter((n) => n.depth === 0).map((n) => n.id)));
  }, [nodes.length]);

  // Escape leaves reorder mode (dialogs are closed while it is on)
  useEffect(() => {
    if (!reorder) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !dragging.current) setReorder(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [reorder]);

  const report = (error: unknown, action: string) => {
    const described = describeApiError(error, action);
    setNotice({ tone: 'danger', text: described.message, stale: described.kind === 'stale' });
  };
  const refresh = () => { setNotice(undefined); void tree.refetch(); };
  const track = (id: string, on: boolean) => setPendingIds((current) => {
    const next = new Set(current);
    if (on) next.add(id); else next.delete(id);
    return next;
  });

  const toggle = (id: string, isOpen: boolean) => setExpanded((current) => {
    const next = new Set(current);
    if (isOpen) next.add(id); else next.delete(id);
    return next;
  });

  const onRelocate = (node: CategoryNode, to: Placement) => {
    const change = relocation(nodes, node.id, to);
    if (change.kind === 'none') return;
    setNotice(undefined);
    track(node.id, true);
    relocate.mutate({ node, to, change }, {
      onError: (error) => report(error, 'move categories'),
      onSettled: () => track(node.id, false),
    });
  };

  const onToggleActive = (node: CategoryNode, isActive: boolean) => {
    track(node.id, true);
    update.mutate({ id: node.id, version: node.version, isActive }, {
      onError: (error) => report(error, 'change the status'),
      onSettled: () => track(node.id, false),
    });
  };

  if (!canRead) return <PanelMessage>You don&apos;t have permission to view the catalogue.</PanelMessage>;

  const stats = tree.data?.stats;
  const subtitle = stats
    ? `Category → sub-category → bookable category · ${stats.categories.toLocaleString('en-IN')} categories · ${stats.bookableLeaves.toLocaleString('en-IN')} bookable · ${stats.curricula.toLocaleString('en-IN')} curricula`
    : 'Category → sub-category → bookable category';

  const treeCard = <Card style={{ padding: 0, overflow: 'hidden' }} className={cx('relative flex min-w-0 flex-col transition-shadow duration-200',
    reorder && 'z-50 shadow-[0_0_0_2px_var(--accent),0_24px_48px_rgb(15_23_42/0.25)]')}>
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-5 md:flex-nowrap">
      <div className="flex min-w-0 basis-full flex-col gap-0.5 md:basis-auto md:flex-1">
        <Typography variant="h3" component="h2">Category manager</Typography>
        <Typography variant="caption" tone="muted">
          {reorder ? 'Drag a row to reorder it. Drag right to nest it, left to move it out.' : 'Organize categories, sub-categories, and nested levels'}
        </Typography>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!reorder && <div className="relative">
          <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <Input type="search" aria-label="Search categories" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ paddingInlineStart: 32, minHeight: 32, height: 32, width: 150 }} />
        </div>}
        <Button size="sm" onClick={() => setExpanded(allOpen ? new Set() : new Set(allExpandable))} disabled={!allExpandable.length}>
          {allOpen ? 'Collapse all' : 'Expand all'}
        </Button>
        {reorder && <Button size="sm" variant="primary" onClick={() => setReorder(false)} className="inline-flex items-center gap-1">
          <Check size={14} aria-hidden="true" /> Done
        </Button>}
      </div>
    </div>
    {reorder && <Typography id="category-tree-reorder-help" variant="caption" tone="muted" component="p" className="px-5 pb-2">
      Keyboard: focus a row, then Alt+Up or Alt+Down to reorder, Alt+Right to nest under the row above, Alt+Left to move out. Escape ends reordering.
    </Typography>}

    <div className="border-t border-[var(--border)]">
      {tree.isPending ? <div className="p-5"><PanelSkeleton rows={8} /></div>
        : tree.isError ? <div className="p-5"><PanelMessage onRetry={() => void tree.refetch()}>The categories could not be loaded. {describeApiError(tree.error, 'view the catalogue').message}</PanelMessage></div>
        : nodes.length === 0 ? <div className="flex flex-col items-start gap-3 p-5">
            <Typography>There are no categories yet. Start with a root such as Academic.</Typography>
            {canManage && <Button variant="primary" onClick={() => setDialog({ kind: 'form', state: { mode: 'create', parent: null } })}>Add category</Button>}
          </div>
        : rows.length === 0 ? <Typography tone="muted" className="p-5">Nothing matches “{q}”.</Typography>
        : <CategoryTreeList rows={rows} nodes={nodes} expanded={open} onToggle={toggle} selectedId={selectedId}
            onSelect={(node) => setSelectedId(node.id)} reorder={reorder} onRelocate={onRelocate}
            onInvalidDrop={(text) => setNotice({ tone: 'danger', text })} canManage={canManage} pendingIds={pendingIds}
            onEdit={(node) => setDialog({ kind: 'form', state: { mode: 'edit', node } })}
            onDelete={(node) => setDialog({ kind: 'delete', node })} onToggleActive={onToggleActive}
            onDraggingChange={(value) => { dragging.current = value; }} />}
    </div>

    {tree.data && <div className="flex items-center gap-2 px-5 py-2">
      <Typography variant="caption" tone="muted">Loaded at {timeFormat.format(new Date(tree.data.generatedAt))}{tree.isFetching ? ' · refreshing…' : ''}</Typography>
      <Button size="sm" variant="ghost" onClick={refresh} disabled={tree.isFetching}>Refresh</Button>
    </div>}
  </Card>;

  return <div className="flex flex-col gap-4">
    {/* Reorder mode: dim everything except the tree and the Reorder toggle */}
    <div aria-hidden="true" className={cx('fixed inset-0 z-40 bg-[rgb(15_23_42/0.38)] transition-opacity duration-200',
      reorder ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0')} />

    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <Typography variant="h1">Categories &amp; content</Typography>
        <Typography variant="body2" tone="muted">{subtitle}</Typography>
      </div>
      {canManage && <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => { setReorder((r) => !r); setDialog(null); }} aria-pressed={reorder}
          disabled={!nodes.length} className={cx('relative', reorder && 'z-50')}
          style={reorder ? { background: 'var(--surface)', borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}>
          {reorder ? 'Done reordering' : 'Reorder'}
        </Button>
        <Button variant="primary" inert={reorder} title="Add a top-level category"
          onClick={() => setDialog({ kind: 'form', state: { mode: 'create', parent: null } })}>Add category</Button>
      </div>}
    </div>

    {notice && <Card className={cx('relative flex flex-wrap items-center gap-3 p-3', reorder && 'z-50')} role="alert">
      <Typography variant="body2" tone={notice.tone === 'danger' ? 'danger' : 'default'}>{notice.text}</Typography>
      {notice.stale && <Button size="sm" onClick={refresh}>Reload</Button>}
      <Button size="sm" variant="ghost" onClick={() => setNotice(undefined)}>Dismiss</Button>
    </Card>}

    <Tabs label="Categories and content" items={[{ id: 'categories', label: 'Categories', content:
      <div className="grid items-start gap-4 pt-4 lg:grid-cols-[minmax(0,1.85fr)_minmax(300px,1fr)]">
        {treeCard}
        <div className="min-w-0" inert={reorder}>
          <CategoryDetailPanel tenant={tenant} node={selected} canManage={canManage} pending={selected ? pendingIds.has(selected.id) : false}
            onAddChild={(parent) => setDialog({ kind: 'form', state: { mode: 'create', parent } })}
            onEdit={(node) => setDialog({ kind: 'form', state: { mode: 'edit', node } })}
            onDelete={(node) => setDialog({ kind: 'delete', node })}
            onToggleActive={onToggleActive}
            onError={report} />
        </div>
      </div> }, ...extraTabs]} />

    {dialog?.kind === 'form' && <CategoryFormDialog tenant={tenant} state={dialog.state} nodes={nodes} onClose={() => setDialog(null)}
      onSaved={(id) => {
        const parent = dialog.state.mode === 'create' ? dialog.state.parent : null;
        setDialog(null);
        setSelectedId(id);
        if (parent) toggle(parent.id, true);
      }} />}
    {dialog?.kind === 'delete' && <DeleteCategoryDialog tenant={tenant} node={dialog.node} onClose={() => setDialog(null)}
      onDeleted={() => { setDialog(null); setSelectedId(undefined); }} />}
  </div>;
}
