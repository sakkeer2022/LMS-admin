"use client";
import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Badge, Button, Card, SelectField, Switch, Typography } from '@/components/ui';
import { CheckField } from './check-field';
import { PanelMessage, PanelSkeleton } from '@/components/ui/dashboard-ui';
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

/** Detail card for the selected category (screen 28, right column). */
export function CategoryDetailPanel({ tenant, node, canManage, pending, ...actions }: Actions & {
  tenant: string;
  node: CategoryNode | undefined;
  canManage: boolean;
  pending: boolean;
}) {
  const detail = useCategoryDetail(tenant, node?.id);
  if (!node) return <Card className="p-5"><Typography tone="muted">Select a category to see its details.</Typography></Card>;
  if (detail.isPending) return <Card className="p-5"><PanelSkeleton rows={5} /></Card>;
  if (detail.isError || !detail.data) {
    return <Card className="p-5"><PanelMessage onRetry={() => void detail.refetch()}>The category could not be loaded. {describeApiError(detail.error, 'view the catalogue').message}</PanelMessage></Card>;
  }
  return <CategoryDetailView tenant={tenant} detail={detail.data} node={node} canManage={canManage} pending={pending} {...actions} />;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex items-center justify-between gap-3">
    <Typography variant="body2" tone="muted" component="dt">{label}</Typography>
    <dd className="m-0 text-right">{children}</dd>
  </div>;
}

/**
 * Same entity and the same actions as the tree row: the Active switch, Edit and Delete.
 * The tree's cached node drives the switch, so a change in either place shows in both.
 */
export function CategoryDetailView({ tenant, detail, node, canManage, pending, onAddChild, onEdit, onDelete, onToggleActive, onError }: Actions & {
  tenant: string;
  detail: CategoryDetail;
  node: CategoryNode;
  canManage: boolean;
  pending: boolean;
}) {
  const blocked = addChildBlockedReason(node);
  const isLeaf = node.childrenCount === 0;
  const showCurricula = node.isBookable;

  return <Card style={{ padding: 0 }} className="flex flex-col">
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <Typography variant="h3" component="h2" className="min-w-0 break-words">{node.name}</Typography>
          {canManage && <Switch checked={node.isActive} disabled={pending} label={`${node.isActive ? 'Deactivate' : 'Activate'} ${node.name}`}
            onCheckedChange={(value) => onToggleActive(node, value)} />}
        </div>
        <Typography variant="caption" tone="muted" component="p" aria-label="Path">
          {[...detail.breadcrumb.map((b) => b.name), node.name].join(' › ')}
        </Typography>
      </div>
      <dl className="m-0 flex flex-col gap-3">
        <Row label="Status">
          <Badge tone={node.isActive ? 'success' : 'warning'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            {node.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </Row>
        <Row label="Created">
          <Typography variant="subtitle2" component="span">{dateFormat.format(new Date(detail.createdAt))}</Typography>
        </Row>
      </dl>
      {!node.isActive && <Typography variant="caption" tone="muted" component="p">Hidden from learners, with everything below it.</Typography>}
    </div>

    <div className="flex flex-col gap-4 border-t border-[var(--border)] p-5">
      <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--border)] px-4 py-4">
        <Typography variant="h1" component="p" className="tabular-nums">
          {(showCurricula ? node.curriculaCount : node.childrenCount).toLocaleString('en-IN')}
        </Typography>
        <Typography variant="caption" tone="muted">{showCurricula ? 'Curricula' : 'Sub category count'}</Typography>
      </div>

      {canManage && <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => onAddChild(node)} disabled={Boolean(blocked)} title={blocked ?? undefined}
          aria-describedby={blocked ? `add-blocked-${node.id}` : undefined} className="inline-flex items-center gap-1">
          <Plus size={14} aria-hidden="true" /> Add sub-category
        </Button>
        <Button size="sm" onClick={() => onEdit(node)} disabled={pending}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(node)} disabled={pending} style={{ color: 'var(--warning)' }}>Delete</Button>
      </div>}
      {canManage && blocked && <Typography id={`add-blocked-${node.id}`} variant="caption" tone="muted" component="p">{blocked}</Typography>}
    </div>

    {isLeaf && (node.isBookable || detail.requiresLevel) && <div className="flex flex-col gap-3 border-t border-[var(--border)] p-5">
      <Typography variant="subtitle2" component="h3">Booking</Typography>
      <dl className="m-0 flex flex-col gap-2">
        <Row label="Bookable"><Typography variant="body2" component="span">{node.isBookable ? 'Yes' : 'No'}</Typography></Row>
        {node.isBookable && <Row label="Learner chooses">
          <Typography variant="body2" component="span">{[detail.requiresBoard && 'board', detail.requiresLevel && 'level', 'subject'].filter(Boolean).join(', ')}</Typography>
        </Row>}
      </dl>
      {detail.requiresLevel && <div className="flex flex-col gap-1">
        <Typography variant="caption" tone="muted" component="p">Allowed levels</Typography>
        <div className="flex flex-wrap gap-1">
          {detail.allowedLevels.length ? detail.allowedLevels.map((l) => <Badge key={l.id} tone={l.isActive ? 'neutral' : 'warning'}>{l.name}</Badge>)
            : <Typography variant="body2" tone="muted">None yet. Choose levels in Edit.</Typography>}
        </div>
      </div>}
      {node.isBookable && <OfferingsSection tenant={tenant} detail={detail} canManage={canManage} onError={onError} />}
    </div>}
  </Card>;
}

/** The leaf's offerings: each is a subject with an optional board and level (a curriculum). */
function OfferingsSection({ tenant, detail, canManage, onError }: { tenant: string; detail: CategoryDetail; canManage: boolean; onError: Actions['onError'] }) {
  const offerings = useOfferings(tenant, detail.id);
  const subjects = useLookup(tenant, 'subjects', canManage);
  const boards = useLookup(tenant, 'boards', canManage && detail.requiresBoard);
  const add = useAddOffering(tenant);
  const toggle = useSetOfferingActive(tenant);
  const [form, setForm] = useState({ subjectId: '', boardId: '', levelId: '' });
  const [error, setError] = useState<string>();
  const ready = form.subjectId && (!detail.requiresBoard || form.boardId) && (!detail.requiresLevel || form.levelId);

  return <div className="flex flex-col gap-2">
    <Typography variant="subtitle2" component="h3">Offerings ({offerings.data ? curriculaLabel(offerings.data.length) : '…'})</Typography>
    {offerings.isPending ? <PanelSkeleton rows={2} />
      : offerings.isError ? <PanelMessage onRetry={() => void offerings.refetch()}>Offerings could not be loaded.</PanelMessage>
      : offerings.data.length === 0 ? <Typography variant="body2" tone="muted">No offerings yet, so learners cannot book this category.</Typography>
      : <ul className="flex flex-col gap-1">
          {offerings.data.map((o) => <li key={o.curriculumId} className="flex items-center justify-between gap-2">
            <Typography variant="body2" component="span">{[o.board?.name, o.subject.name, o.level?.name].filter(Boolean).join(' · ')}</Typography>
            {canManage ? <CheckField label="Active" aria-label={`Active: ${[o.board?.name, o.subject.name, o.level?.name].filter(Boolean).join(' · ')}`} checked={o.isActive}
              onChange={(e) => toggle.mutate({ curriculumId: o.curriculumId, isActive: e.target.checked }, { onError: (err) => onError(err, 'change the offering') })} />
              : !o.isActive && <Badge tone="warning">Inactive</Badge>}
          </li>)}
        </ul>}
    {canManage && <div className="flex flex-wrap items-end gap-2">
      <SelectField label="Subject" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
        <option value="">Choose…</option>
        {subjects.data?.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </SelectField>
      {detail.requiresBoard && <SelectField label="Board" value={form.boardId} onChange={(e) => setForm({ ...form, boardId: e.target.value })}>
        <option value="">Choose…</option>
        {boards.data?.filter((b) => b.isActive).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </SelectField>}
      {detail.requiresLevel && <SelectField label="Level" value={form.levelId} onChange={(e) => setForm({ ...form, levelId: e.target.value })}>
        <option value="">Choose…</option>
        {detail.allowedLevels.filter((l) => l.isActive).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </SelectField>}
      <Button size="sm" variant="primary" disabled={!ready} pending={add.isPending} onClick={() => {
        setError(undefined);
        add.mutate({ categoryId: detail.id, subjectId: form.subjectId, boardId: form.boardId || null, levelId: form.levelId || null }, {
          onSuccess: () => setForm({ subjectId: '', boardId: '', levelId: '' }),
          onError: (err) => setError(describeApiError(err, 'add offerings').message),
        });
      }}>Add offering</Button>
    </div>}
    {error && <Typography variant="caption" tone="danger" role="alert">{error}</Typography>}
  </div>;
}
