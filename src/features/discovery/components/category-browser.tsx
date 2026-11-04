"use client";
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge, Button, Card, SelectField, Typography } from '@/components/ui';
import { PanelMessage, PanelSkeleton } from '@/components/ui/dashboard-ui';
import { ApiError } from '@/lib/api/contracts';
import { describeApiError } from '@/lib/api/errors';
import { resolveOffering, useLearnerChildren, useLearnerLeaf, type BookableOffering, type LearnerNode } from '@/lib/api/learner-catalogue';

/**
 * Learner catalogue (ADR-0005): root → tier → leaf. Only active, bookable leaves are
 * listed. On a leaf the board field shows only when the leaf requires a board, the level
 * field only when it requires a level; subjects come from the leaf's offerings.
 */
export function CategoryBrowser({ tenant }: { tenant: string }) {
  const [trail, setTrail] = useState<LearnerNode[]>([]);
  const current = trail.at(-1);
  const atLeaf = current?.isLeaf ?? false;

  return <div className="flex flex-col gap-4">
    <nav aria-label="Catalogue path" className="flex flex-wrap items-center gap-1">
      <Button size="sm" variant="ghost" onClick={() => setTrail([])} aria-current={trail.length === 0 ? 'page' : undefined}>All categories</Button>
      {trail.map((n, i) => <span key={n.id} className="flex items-center gap-1">
        <ChevronRight size={14} aria-hidden="true" />
        <Button size="sm" variant="ghost" onClick={() => setTrail(trail.slice(0, i + 1))} aria-current={i === trail.length - 1 ? 'page' : undefined}>{n.name}</Button>
      </span>)}
    </nav>
    {atLeaf && current
      ? <LeafChooser tenant={tenant} leaf={current} />
      : <ChildList tenant={tenant} parentId={current?.id ?? null} onOpen={(n) => setTrail([...trail, n])} />}
  </div>;
}

function ChildList({ tenant, parentId, onOpen }: { tenant: string; parentId: string | null; onOpen: (n: LearnerNode) => void }) {
  const children = useLearnerChildren(tenant, parentId);
  if (children.isPending) return <PanelSkeleton rows={4} />;
  if (children.isError) {
    const off = children.error instanceof ApiError && children.error.code === 'FEATURE_DISABLED';
    return <PanelMessage onRetry={off ? undefined : () => void children.refetch()}>
      {off ? 'The catalogue is not available yet.' : `The catalogue could not be loaded. ${describeApiError(children.error, 'view the catalogue').message}`}
    </PanelMessage>;
  }
  if (children.data.length === 0) return <Typography tone="muted">Nothing can be booked here yet.</Typography>;
  return <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {children.data.map((n) => <li key={n.id}>
      <Button className="w-full justify-between" onClick={() => onOpen(n)}>
        <span>{n.name}</span>
        {n.isLeaf ? <Badge tone="info">Book</Badge> : <ChevronRight size={16} aria-hidden="true" />}
      </Button>
    </li>)}
  </ul>;
}

function LeafChooser({ tenant, leaf: node }: { tenant: string; leaf: LearnerNode }) {
  const [boardId, setBoardId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [result, setResult] = useState<{ offering?: BookableOffering; error?: string }>();
  const [pending, setPending] = useState(false);
  const leaf = useLearnerLeaf(tenant, node.id, { boardId: boardId || undefined, levelId: levelId || undefined });

  if (leaf.isPending) return <PanelSkeleton rows={4} />;
  if (leaf.isError) return <PanelMessage onRetry={() => void leaf.refetch()}>This category could not be loaded. {describeApiError(leaf.error, 'view the catalogue').message}</PanelMessage>;
  const data = leaf.data;
  const ready = subjectId && (!data.requiresBoard || boardId) && (!data.requiresLevel || levelId);

  const check = async () => {
    setPending(true);
    setResult(undefined);
    try {
      setResult({ offering: await resolveOffering(data.id, { subjectId, boardId: boardId || undefined, levelId: levelId || undefined }) });
    } catch (err) {
      setResult({ error: describeApiError(err, 'book this').message });
    } finally {
      setPending(false);
    }
  };

  return <Card className="flex max-w-xl flex-col gap-4 p-5">
    <div>
      <Typography variant="h2">{data.name}</Typography>
      <Typography variant="caption" tone="muted">{[...data.breadcrumb.map((b) => b.name), data.name].join(' › ')}</Typography>
    </div>
    {data.requiresBoard && <SelectField label="Board" required value={boardId} onChange={(e) => { setBoardId(e.target.value); setSubjectId(''); setResult(undefined); }}>
      <option value="">Choose a board…</option>
      {data.boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
    </SelectField>}
    {data.requiresLevel && <SelectField label="Level" required value={levelId} onChange={(e) => { setLevelId(e.target.value); setSubjectId(''); setResult(undefined); }}>
      <option value="">Choose a level…</option>
      {data.levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
    </SelectField>}
    <SelectField label="Subject" required value={subjectId} disabled={leaf.isFetching} onChange={(e) => { setSubjectId(e.target.value); setResult(undefined); }}
      description={data.subjects.length === 0 ? 'No subjects for this choice yet.' : undefined}>
      <option value="">Choose a subject…</option>
      {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </SelectField>
    <div className="flex items-center gap-3">
      <Button variant="primary" disabled={!ready} pending={pending} onClick={() => void check()}>Continue to booking</Button>
    </div>
    {result?.offering && <Typography role="status" variant="body2">
      Available. Booking for this offering (reference {result.offering.curriculumId.slice(0, 8)}) opens once tutor booking is live.
    </Typography>}
    {result?.error && <Typography role="alert" variant="body2" tone="danger">{result.error}</Typography>}
  </Card>;
}
