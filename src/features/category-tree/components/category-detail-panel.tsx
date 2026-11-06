"use client";
import { useState, type FormEvent, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { TextField } from '@/components/forms/field';
import { PanelMessage } from '@/components/layout/panel-message';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Switch } from '@/components/shadcn/switch';
import { describeApiError } from '@/lib/api/errors';
import { useCategoryDetail, useCreateCategory, useUpdateCategory, type CategoryDetail, type CategoryNode } from '@/lib/api/category-tree';
import { addChildBlockedReason, breadcrumb, uniqueSiblingCode } from '@/lib/api/category-tree-model';

const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' });

/** What the right column shows: the selected category, or the add / edit form. */
export type PanelMode =
  | { kind: 'view' }
  | { kind: 'edit'; node: CategoryNode }
  | { kind: 'create'; parent: CategoryNode | null };

interface Actions {
  onAddChild: (node: CategoryNode) => void;
  onEdit: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode) => void;
  onToggleActive: (node: CategoryNode, isActive: boolean) => void;
}

export function Rows({ count }: { count: number }) {
  return <div className="flex flex-col gap-2" role="status" aria-label="Loading">
    {Array.from({ length: count }, (_, i) => <Skeleton key={i} className="h-5 w-full" />)}
  </div>;
}

/** Detail card for the selected category (screen 28, right column). */
export function CategoryDetailPanel({ node, canManage, pending, ...actions }: Actions & {
  node: CategoryNode | undefined;
  canManage: boolean;
  pending: boolean;
}) {
  const detail = useCategoryDetail(node?.id);
  if (!node) return <Card className="p-5"><p className="text-sm text-muted-foreground">Select a category to see its details.</p></Card>;
  if (detail.isPending) return <Card className="p-5"><Rows count={5} /></Card>;
  if (detail.isError || !detail.data) {
    return <Card className="p-5"><PanelMessage onRetry={() => void detail.refetch()}>The category could not be loaded. {describeApiError(detail.error, 'view the catalogue').message}</PanelMessage></Card>;
  }
  return <CategoryDetailView detail={detail.data} node={node} canManage={canManage} pending={pending} {...actions} />;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex items-center justify-between gap-3">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="m-0 text-right text-sm">{children}</dd>
  </div>;
}

/**
 * Same entity and the same actions as the selected tree row: the Active switch, Edit and
 * Delete, plus Add sub-category. The tree's cached node drives the switch, so a change
 * in either place shows in both.
 */
export function CategoryDetailView({ detail, node, canManage, pending, onAddChild, onEdit, onDelete, onToggleActive }: Actions & {
  detail: CategoryDetail;
  node: CategoryNode;
  canManage: boolean;
  pending: boolean;
}) {
  const blocked = addChildBlockedReason(node);
  const isLeaf = node.childrenCount === 0;

  return <Card className="gap-0 py-0">
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-lg font-semibold break-words">{node.name}</h2>
          {canManage && <Switch checked={node.isActive} disabled={pending} aria-label={`${node.isActive ? 'Disable' : 'Enable'} ${node.name}`}
            onCheckedChange={(value) => onToggleActive(node, value)} />}
        </div>
        <p className="text-xs text-muted-foreground" aria-label="Path">
          {[...detail.breadcrumb.map((b) => b.name), node.name].join(' › ')}
        </p>
      </div>
      <dl className="m-0 flex flex-col gap-3">
        <Row label="Status">
          <Badge variant={node.isActive ? 'success' : 'warning'}>
            <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-current" />
            {node.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </Row>
        <Row label="Created"><span className="font-semibold">{dateFormat.format(new Date(detail.createdAt))}</span></Row>
      </dl>
      {!node.isActive && <p className="text-xs text-muted-foreground">Hidden from tutors and learners, with everything below it.</p>}
    </div>

    <div className="flex flex-col gap-4 border-t p-5">
      <div className="flex flex-col gap-1 rounded-md border px-4 py-4">
        <p className="text-2xl font-bold tabular-nums">
          {(isLeaf ? node.tutorCount : node.childrenCount).toLocaleString('en-IN')}
        </p>
        <span className="text-xs text-muted-foreground">{isLeaf ? 'Tutor count' : 'Sub category count'}</span>
      </div>

      {canManage && <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => onAddChild(node)} disabled={Boolean(blocked)} title={blocked ?? undefined}
          aria-describedby={blocked ? `add-blocked-${node.id}` : undefined}>
          <Plus aria-hidden="true" /> Add sub-category
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(node)} disabled={pending}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(node)} disabled={pending} className="text-warning-foreground">Delete</Button>
      </div>}
      {canManage && blocked && <p id={`add-blocked-${node.id}`} className="text-xs text-muted-foreground">{blocked}</p>}
    </div>
  </Card>;
}

/**
 * "Edit category" (as in the design) and the same form for adding a category or a
 * sub-category: the name is the only field. The code in the path is made from the name
 * when the category is created and is not changed by a rename.
 */
export function CategoryForm({ mode, nodes, onCancel, onSaved }: {
  mode: Exclude<PanelMode, { kind: 'view' }>;
  nodes: readonly CategoryNode[];
  onCancel: () => void;
  onSaved: (id: string) => void;
}) {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const editing = mode.kind === 'edit' ? mode.node : undefined;
  const parent = mode.kind === 'create' ? mode.parent : null;
  const [name, setName] = useState(editing?.name ?? '');
  const [error, setError] = useState<string>();
  const pending = create.isPending || update.isPending;
  const trimmed = name.trim();

  const title = editing ? 'Edit category' : parent ? 'Add sub-category' : 'Add category';
  const path = editing
    ? breadcrumb(nodes, editing).map((n) => n.name)
    : [...(parent ? breadcrumb(nodes, parent).map((n) => n.name) : []), trimmed || 'New category'];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || pending) return;
    setError(undefined);
    try {
      if (editing) {
        if (trimmed !== editing.name) await update.mutateAsync({ id: editing.id, version: editing.version, name: trimmed });
        onSaved(editing.id);
        return;
      }
      const code = uniqueSiblingCode(nodes, parent?.id ?? null, trimmed);
      const created = await create.mutateAsync({ parentId: parent?.id ?? null, code, name: trimmed });
      onSaved(created.id);
    } catch (err) {
      setError(describeApiError(err, 'change the catalogue').message);
    }
  };

  return <Card className="gap-0 py-0">
    <form onSubmit={(e) => void submit(e)} aria-labelledby="category-form-title">
      <div className="flex flex-col gap-1 px-5 pt-5 pb-4">
        <h2 id="category-form-title" className="text-lg font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground" aria-label="Path">{path.join(' › ')}</p>
      </div>
      <div className="flex flex-col gap-3 px-5 pb-5">
        <TextField label="Name" required maxLength={100} value={name} autoFocus
          onChange={(e) => setName(e.target.value)} error={error} />
      </div>
      <div className="flex items-center gap-2 border-t px-5 py-4">
        <Button type="submit" size="sm" disabled={pending || !trimmed}>{pending ? 'Saving…' : 'Save'}</Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={pending}>
          <X aria-hidden="true" /> Cancel
        </Button>
      </div>
    </form>
  </Card>;
}
