"use client";
import { useState } from 'react';
import { Badge, Button, Card, SelectField, Typography } from '@/components/ui';
import { CheckField } from './check-field';
import { PanelMessage, PanelSkeleton } from '@/components/ui/dashboard-ui';
import { describeApiError } from '@/lib/api/errors';
import {
  useAddOffering, useCategoryDetail, useLookup, useOfferings, useSetOfferingActive, useUpdateCategory,
  type CategoryDetail, type CategoryNode,
} from '@/lib/api/category-tree';
import { addChildBlockedReason, curriculaLabel, plural, subCategoryLabel } from '@/lib/api/category-tree-model';

const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' });

interface Actions {
  onAddChild: (node: CategoryNode) => void;
  onEdit: (node: CategoryNode) => void;
  onMove: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode) => void;
  onError: (error: unknown, action: string) => void;
}

/** Detail panel for the selected category (screen 28, right column). */
export function CategoryDetailPanel({ tenant, node, nodes, canManage, ...actions }: Actions & {
  tenant: string;
  node: CategoryNode | undefined;
  nodes: readonly CategoryNode[];
  canManage: boolean;
}) {
  const detail = useCategoryDetail(tenant, node?.id);
  if (!node) return <Card className="p-5"><Typography tone="muted">Select a category to see its details.</Typography></Card>;
  if (detail.isPending) return <Card className="p-5"><PanelSkeleton rows={5} /></Card>;
  if (detail.isError || !detail.data) {
    return <Card className="p-5"><PanelMessage onRetry={() => void detail.refetch()}>The category could not be loaded. {describeApiError(detail.error, 'view the catalogue').message}</PanelMessage></Card>;
  }
  return <CategoryDetailView tenant={tenant} detail={detail.data} node={node} canManage={canManage} {...actions} />;
}

export function CategoryDetailView({ tenant, detail, node, canManage, onAddChild, onEdit, onMove, onDelete, onError }: Actions & {
  tenant: string;
  detail: CategoryDetail;
  node: CategoryNode;
  canManage: boolean;
}) {
  const update = useUpdateCategory(tenant);
  const blocked = addChildBlockedReason(node);
  const isLeaf = detail.childrenCount === 0;
  // The tree is the session snapshot; the detail is fresh. Prefer the newer version for writes.
  const version = Math.max(detail.version, node.version);

  return <Card className="flex flex-col gap-4 p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <Typography variant="h2">{detail.name}</Typography>
        <Typography variant="caption" tone="muted" component="p" aria-label="Path">
          {[...detail.breadcrumb.map((b) => b.name), detail.name].join(' › ')}
        </Typography>
        <Typography variant="caption" tone="muted" component="p">Code: {detail.code}</Typography>
      </div>
      {canManage && <CheckField label="Active" className="shrink-0" checked={detail.isActive} disabled={update.isPending}
        onChange={(e) => update.mutate({ id: detail.id, version, isActive: e.target.checked }, { onError: (err) => onError(err, 'change the status') })} />}
    </div>

    <dl className="grid grid-cols-2 gap-2">
      <Typography variant="body2" tone="muted" component="dt">Status</Typography>
      <dd className="text-right"><Badge tone={detail.isActive ? 'success' : 'warning'}>{detail.isActive ? 'Active' : 'Inactive (hidden with everything below it)'}</Badge></dd>
      <Typography variant="body2" tone="muted" component="dt">Created</Typography>
      <Typography variant="body2" component="dd" className="text-right">{dateFormat.format(new Date(detail.createdAt))}</Typography>
      <Typography variant="body2" tone="muted" component="dt">Booking</Typography>
      <Typography variant="body2" component="dd" className="text-right">
        {detail.isBookable ? 'Bookable' : isLeaf ? 'Not bookable' : 'Branch (not bookable)'}
      </Typography>
      {detail.isBookable && <>
        <Typography variant="body2" tone="muted" component="dt">Learner chooses</Typography>
        <Typography variant="body2" component="dd" className="text-right">
          {[detail.requiresBoard && 'board', detail.requiresLevel && 'level', 'subject'].filter(Boolean).join(', ')}
        </Typography>
      </>}
    </dl>

    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Counts">
      {[
        [subCategoryLabel(detail.childrenCount), 'directly below'],
        [curriculaLabel(detail.curriculaCount), `${detail.activeCurriculaCount} active`],
        [plural(detail.studentCount, 'student', 'students'), 'on this category'],
      ].map(([value, hint]) => <li key={value} className="flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2">
        <Typography variant="subtitle2" component="span">{value}</Typography>
        <Typography variant="caption" tone="muted">{hint}</Typography>
      </li>)}
    </ul>

    {detail.requiresLevel && isLeaf && <div className="flex flex-col gap-1">
      <Typography variant="caption" tone="muted" component="p">Allowed levels</Typography>
      <div className="flex flex-wrap gap-1">
        {detail.allowedLevels.length ? detail.allowedLevels.map((l) => <Badge key={l.id} tone={l.isActive ? 'neutral' : 'warning'}>{l.name}</Badge>)
          : <Typography variant="body2" tone="muted">None yet. Choose levels in Edit.</Typography>}
      </div>
    </div>}

    {canManage && <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => onAddChild(node)} disabled={Boolean(blocked)} title={blocked ?? undefined}
        aria-describedby={blocked ? `add-blocked-${node.id}` : undefined}>+ Add sub-category</Button>
      <Button size="sm" onClick={() => onEdit(node)}>Edit</Button>
      <Button size="sm" onClick={() => onMove(node)}>Move</Button>
      <Button size="sm" variant="danger" onClick={() => onDelete(node)}>Delete</Button>
    </div>}
    {canManage && blocked && <Typography id={`add-blocked-${node.id}`} variant="caption" tone="muted" component="p">{blocked}</Typography>}

    {detail.isBookable && <OfferingsSection tenant={tenant} detail={detail} canManage={canManage} onError={onError} />}
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

  return <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
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
