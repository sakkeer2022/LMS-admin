"use client";
import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { CheckField, SelectField } from '@/components/forms/field';
import { PanelMessage } from '@/components/layout/panel-message';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Switch } from '@/components/shadcn/switch';
import { describeApiError } from '@/lib/api/errors';
import {
  useAddOffering, useCategoryDetail, useLookup, useOfferings, useSetOfferingActive,
  type CategoryDetail, type CategoryNode,
} from '@/lib/api/category-tree';
import { addChildBlockedReason, curriculaLabel } from '@/lib/api/category-tree-model';

const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' });

interface Actions {
  onAddChild: (node: CategoryNode) => void;
  onEdit: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode) => void;
  onToggleActive: (node: CategoryNode, isActive: boolean) => void;
  onError: (error: unknown, action: string) => void;
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
 * Same entity and the same actions as the tree row: the Active switch, Edit and Delete.
 * The tree's cached node drives the switch, so a change in either place shows in both.
 */
export function CategoryDetailView({ detail, node, canManage, pending, onAddChild, onEdit, onDelete, onToggleActive, onError }: Actions & {
  detail: CategoryDetail;
  node: CategoryNode;
  canManage: boolean;
  pending: boolean;
}) {
  const blocked = addChildBlockedReason(node);
  const isLeaf = node.childrenCount === 0;
  const showCurricula = node.isBookable;

  return <Card className="gap-0 py-0">
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-lg font-semibold break-words">{node.name}</h2>
          {canManage && <Switch checked={node.isActive} disabled={pending} aria-label={`${node.isActive ? 'Deactivate' : 'Activate'} ${node.name}`}
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
      {!node.isActive && <p className="text-xs text-muted-foreground">Hidden from learners, with everything below it.</p>}
    </div>

    <div className="flex flex-col gap-4 border-t p-5">
      <div className="flex flex-col gap-1 rounded-md border px-4 py-4">
        <p className="text-2xl font-bold tabular-nums">
          {(showCurricula ? node.curriculaCount : node.childrenCount).toLocaleString('en-IN')}
        </p>
        <span className="text-xs text-muted-foreground">{showCurricula ? 'Curricula' : 'Sub category count'}</span>
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

    {isLeaf && (node.isBookable || detail.requiresLevel) && <div className="flex flex-col gap-3 border-t p-5">
      <h3 className="text-sm font-semibold">Booking</h3>
      <dl className="m-0 flex flex-col gap-2">
        <Row label="Bookable">{node.isBookable ? 'Yes' : 'No'}</Row>
        {node.isBookable && <Row label="Learner chooses">
          {[detail.requiresBoard && 'board', detail.requiresLevel && 'level', 'subject'].filter(Boolean).join(', ')}
        </Row>}
      </dl>
      {detail.requiresLevel && <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">Allowed levels</p>
        <div className="flex flex-wrap gap-1">
          {detail.allowedLevels.length ? detail.allowedLevels.map((l) => <Badge key={l.id} variant={l.isActive ? 'secondary' : 'warning'}>{l.name}</Badge>)
            : <p className="text-sm text-muted-foreground">None yet. Choose levels in Edit.</p>}
        </div>
      </div>}
      {node.isBookable && <OfferingsSection detail={detail} canManage={canManage} onError={onError} />}
    </div>}
  </Card>;
}

/** The leaf's offerings: each is a subject with an optional board and level (a curriculum). */
function OfferingsSection({ detail, canManage, onError }: { detail: CategoryDetail; canManage: boolean; onError: Actions['onError'] }) {
  const offerings = useOfferings(detail.id);
  const subjects = useLookup('subjects', canManage);
  const boards = useLookup('boards', canManage && detail.requiresBoard);
  const add = useAddOffering();
  const toggle = useSetOfferingActive();
  const [form, setForm] = useState({ subjectId: '', boardId: '', levelId: '' });
  const [error, setError] = useState<string>();
  const ready = form.subjectId && (!detail.requiresBoard || form.boardId) && (!detail.requiresLevel || form.levelId);

  return <div className="flex flex-col gap-2">
    <h3 className="text-sm font-semibold">Offerings ({offerings.data ? curriculaLabel(offerings.data.length) : '…'})</h3>
    {offerings.isPending ? <Rows count={2} />
      : offerings.isError ? <PanelMessage onRetry={() => void offerings.refetch()}>Offerings could not be loaded.</PanelMessage>
      : offerings.data.length === 0 ? <p className="text-sm text-muted-foreground">No offerings yet, so learners cannot book this category.</p>
      : <ul className="flex flex-col gap-1">
          {offerings.data.map((o) => {
            const label = [o.board?.name, o.subject.name, o.level?.name].filter(Boolean).join(' · ');
            return <li key={o.curriculumId} className="flex items-center justify-between gap-2">
              <span className="text-sm">{label}</span>
              {canManage ? <CheckField label="Active" aria-label={`Active: ${label}`} checked={o.isActive}
                onCheckedChange={(checked) => toggle.mutate({ curriculumId: o.curriculumId, isActive: checked === true }, { onError: (err) => onError(err, 'change the offering') })} />
                : !o.isActive && <Badge variant="warning">Inactive</Badge>}
            </li>;
          })}
        </ul>}
    {canManage && <div className="flex flex-wrap items-end gap-2">
      <SelectField label="Subject" containerClassName="min-w-32 flex-1" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
        <option value="">Choose…</option>
        {subjects.data?.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </SelectField>
      {detail.requiresBoard && <SelectField label="Board" containerClassName="min-w-32 flex-1" value={form.boardId} onChange={(e) => setForm({ ...form, boardId: e.target.value })}>
        <option value="">Choose…</option>
        {boards.data?.filter((b) => b.isActive).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </SelectField>}
      {detail.requiresLevel && <SelectField label="Level" containerClassName="min-w-32 flex-1" value={form.levelId} onChange={(e) => setForm({ ...form, levelId: e.target.value })}>
        <option value="">Choose…</option>
        {detail.allowedLevels.filter((l) => l.isActive).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </SelectField>}
      <Button disabled={!ready || add.isPending} onClick={() => {
        setError(undefined);
        add.mutate({ categoryId: detail.id, subjectId: form.subjectId, boardId: form.boardId || null, levelId: form.levelId || null }, {
          onSuccess: () => setForm({ subjectId: '', boardId: '', levelId: '' }),
          onError: (err) => setError(describeApiError(err, 'add offerings').message),
        });
      }}>{add.isPending ? 'Adding…' : 'Add offering'}</Button>
    </div>}
    {error && <p className="text-xs text-error-foreground" role="alert">{error}</p>}
  </div>;
}
