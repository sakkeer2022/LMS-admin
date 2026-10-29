"use client";
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, FolderTree, GraduationCap, Landmark, Layers } from 'lucide-react';
import { Button, Card, Checkbox, Label, Menu, Tabs, TextField, TreeAccordion, Typography, expandableIds, type MenuItem } from '@/components/ui';
import { PageHeader, PanelMessage, PanelSkeleton, StatusBadge } from '@/components/ui/dashboard-ui';
import { usePermission } from '@/components/security/permission-provider';
import { useCatalogueNode, useCatalogueTrees, useCategories, type NodeType, type TreeNode } from '@/lib/api/catalogue';
import { catalogueTotals, childCountLabel, findNode, nodeActions, withoutArchived } from '@/lib/api/catalogue-tree';
import { NodeDetailPanel, statusLabel } from './node-detail-panel';
import { ArchiveDialog, MoveDialog, ReorderPanel } from './node-dialogs';

const icons: Record<NodeType, typeof FolderTree> = { CATEGORY: FolderTree, SUBSECTION: Layers, BOARD: Landmark, SUBJECT: BookOpen, LEVEL: GraduationCap };

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return debounced;
}

type Dialog = { kind: 'move' | 'archive'; node: TreeNode } | null;

/** Screen 28: Catalogue → Categories & content (LMS-55). */
export function CataloguePage({ tenant }: { tenant: string }) {
  const canRead = usePermission('catalogue.read');
  const canManage = usePermission('catalogue.manage');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 300);
  const [showArchived, setShowArchived] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string>();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reordering, setReordering] = useState(false);

  const categories = useCategories(tenant);
  const categoryIds = useMemo(() => categories.data?.map((c) => c.id) ?? [], [categories.data]);
  const trees = useCatalogueTrees(tenant, canRead ? categoryIds : [], q);
  const loading = categories.isPending || trees.some((t) => t.isPending);
  const failed = categories.isError || trees.some((t) => t.isError);
  const rawRoots = useMemo(() => trees.flatMap((t) => (t.data ? [t.data] : [])), [trees]);
  const roots = useMemo(() => (showArchived ? rawRoots : withoutArchived(rawRoots)), [rawRoots, showArchived]);

  // Open the category roots at first; a search opens every match with its ancestors
  const rootKey = roots.map((r) => r.id).join();
  useEffect(() => {
    if (loading || !roots.length) return;
    setExpanded((current) => (q ? new Set(expandableIds(roots)) : current.size ? current : new Set(roots.map((r) => r.id))));
  }, [rootKey, q, loading]);

  const selected = selectedId ? findNode(rawRoots, selectedId) : undefined;
  const detail = useCatalogueNode(tenant, selected?.id);
  const rootOf = (node: TreeNode) => rawRoots.find((r) => r.id === node.id || findNode(r.children, node.id));
  const categoryOf = (node: TreeNode) => categories.data?.find((c) => c.id === rootOf(node)?.categoryId);

  useEffect(() => {
    if (selectedId) document.querySelector(`[data-tree-id="${CSS.escape(selectedId)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, rootKey]);

  const actionsFor = (node: TreeNode) => {
    const allowed = nodeActions(node);
    return {
      onMove: canManage && allowed.move ? () => setDialog({ kind: 'move', node }) : undefined,
      onArchive: canManage && allowed.archive ? () => setDialog({ kind: 'archive', node }) : undefined,
    };
  };
  const menuFor = (node: TreeNode): MenuItem[] => {
    const a = actionsFor(node);
    return [
      a.onMove && { id: 'move', label: 'Move', onSelect: a.onMove },
      a.onArchive && { id: 'archive', label: 'Archive', onSelect: a.onArchive, destructive: true },
    ].filter((item): item is MenuItem => Boolean(item));
  };

  if (!canRead) return <PanelMessage>You don&apos;t have permission to view the catalogue.</PanelMessage>;

  const totals = catalogueTotals(rawRoots);
  const reorderParent = selected?.parentId ? findNode(rawRoots, selected.parentId) : undefined;
  const subtitle = loading || failed ? 'Category, board, subject and level paths students can book'
    : `${rawRoots.length} categories · ${totals.boards} boards · ${totals.subjects} subjects · ${totals.levels} levels`;

  const treePanel = <Card className="flex min-w-0 flex-col gap-3 p-4">
    <TextField label="Search catalogue" labelHidden type="search" placeholder="Search categories, subjects, resources"
      value={search} onChange={(e) => setSearch(e.target.value)} />
    <div className="flex flex-wrap items-center gap-3">
      <Label className="flex items-center gap-2">
        <Checkbox checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Show archived
      </Label>
      <Button size="sm" onClick={() => setExpanded(new Set(expandableIds(roots)))}>Expand all</Button>
      <Button size="sm" variant="ghost" onClick={() => setExpanded(new Set())}>Collapse all</Button>
    </div>
    {loading ? <PanelSkeleton rows={8} />
      : failed ? <PanelMessage onRetry={() => { void categories.refetch(); trees.forEach((t) => void t.refetch()); }}>The catalogue could not be loaded.</PanelMessage>
      : roots.every((r) => r.childCount === 0) ? <div className="flex flex-col items-start gap-3 py-6">
          <Typography>{q ? `Nothing matches “${q}”.` : 'The catalogue has no paths yet.'}</Typography>
        </div>
      : <div className="max-h-[70vh] overflow-auto">
          <TreeAccordion label="Catalogue tree" roots={roots} expanded={expanded} onExpandedChange={setExpanded}
            getLabel={(node) => node.name} selectedId={selectedId} onSelect={(node) => { setSelectedId(node.id); setReordering(false); }}
            renderLabel={(node) => {
              const Icon = icons[node.type];
              return <>
                <Icon size={16} aria-hidden="true" className="shrink-0 text-[var(--muted)]" />
                <Typography component="span" variant="body2" className={node.type === 'CATEGORY' ? 'font-semibold' : undefined}>{node.name}</Typography>
                {node.children.length > 0 && <Typography variant="caption" tone="muted">{childCountLabel(node)}</Typography>}
                {node.status !== 'PUBLISHED' && <StatusBadge status={statusLabel(node.status)} />}
              </>;
            }}
            renderActions={canManage ? (node) => <Menu label={`Actions for ${node.name}`} items={menuFor(node)} triggerTabIndex={-1} /> : undefined} />
        </div>}
  </Card>;

  const sidePanel = reordering && reorderParent
    ? <ReorderPanel key={reorderParent.id} tenant={tenant} parent={reorderParent} onDone={() => setReordering(false)} />
    : <NodeDetailPanel query={selected ? detail : null} pricingHref={`/admin/${encodeURIComponent(tenant)}/pricing`} actions={selected ? actionsFor(selected) : {}} />;

  return <div className="flex flex-col gap-4">
    <PageHeader title="Categories & content" subtitle={subtitle} action={canManage && <div className="flex flex-wrap gap-2">
      <Button onClick={() => setReordering((r) => !r)} disabled={!reorderParent} aria-pressed={reordering}
        title={reorderParent ? `Reorder the children of ${reorderParent.name}` : 'Select a node below a category to reorder its siblings'}>
        {reordering ? 'Close reorder' : 'Reorder'}
      </Button>
    </div>} />
    <Tabs label="Catalogue sections" items={[{ id: 'tree', label: 'Catalogue tree', content:
      <div className="grid gap-4 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        {treePanel}
        <div className="min-w-0">{sidePanel}</div>
      </div> }]} />
    {dialog?.kind === 'move' && rootOf(dialog.node) && <MoveDialog tenant={tenant} node={dialog.node} root={rootOf(dialog.node)!}
      requiresBoard={Boolean(categoryOf(dialog.node)?.requiresBoard)} onClose={() => setDialog(null)} />}
    {dialog?.kind === 'archive' && <ArchiveDialog tenant={tenant} node={dialog.node} onClose={() => setDialog(null)} />}
  </div>;
}
