"use client";
import { Button, Card, Link, Typography } from '@/components/ui';
import { PanelMessage, PanelSkeleton, StatusBadge } from '@/components/ui/dashboard-ui';
import type { NodeDetail } from '@/lib/api/catalogue';
import { typeLabel } from '@/lib/api/catalogue-tree';
import { formatPaise } from '@/lib/currency/money';

export const statusLabel = (status: NodeDetail['status']) => status.charAt(0) + status.slice(1).toLowerCase();

/** A count the API reports as null (its module isn't built yet) shows "—", never 0. */
export const countLabel = (value: number | null) => (value === null ? '—' : value.toLocaleString('en-IN'));

const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' });

export interface NodeDetailActions {
  onAddChild?: () => void;
  onEdit?: () => void;
  onMove?: () => void;
  onArchive?: () => void;
}

/** Screen 28 detail panel, given the node detail from the API. */
export function NodeDetailView({ node, pricingHref, actions }: { node: NodeDetail; pricingHref: string; actions: NodeDetailActions }) {
  const facts: [string, string][] = [
    ['Library resources', countLabel(node.libraryResources)],
    ['Tutors mapped', countLabel(node.tutorsMapped)],
    ['Sessions this month', countLabel(node.sessionsThisMonth)],
  ];
  return <Card className="flex flex-col gap-4 p-5">
    <div className="flex flex-col gap-1">
      <Typography variant="caption" tone="muted" component="p" aria-label="Path">
        {[...node.path.map((p) => p.name), node.name].join(' › ')}
      </Typography>
      <div className="flex flex-wrap items-center gap-2">
        <Typography variant="h2">{node.name}</Typography>
        <StatusBadge status={statusLabel(node.status)} />
      </div>
      <Typography variant="body2" tone="muted">{typeLabel(node.type)}</Typography>
    </div>
    <dl className="grid grid-cols-3 gap-3">
      {facts.map(([label, value]) => <div key={label} className="flex flex-col gap-1">
        <Typography variant="caption" tone="muted" component="dt">{label}</Typography>
        <Typography variant="h3" component="dd">{value}</Typography>
      </div>)}
    </dl>
    {node.type === 'LEVEL' && <div className="flex flex-col gap-1">
      <Typography variant="caption" tone="muted" component="p">Session price (default, all tutors)</Typography>
      {node.sessionPricePaise === null
        ? <Typography variant="body2">Not configured · <Link href={pricingHref}>Set a price in Pricing</Link></Typography>
        : <Typography variant="body1">{formatPaise(node.sessionPricePaise)} <Typography variant="caption" tone="muted" component="span">+ GST per session</Typography></Typography>}
    </div>}
    <Typography variant="caption" tone="muted" component="p">Created {dateFormat.format(new Date(node.createdAt))}</Typography>
    {Object.values(actions).some(Boolean) && <div className="flex flex-wrap gap-2">
      {actions.onAddChild && <Button size="sm" onClick={actions.onAddChild}>Add child</Button>}
      {actions.onEdit && <Button size="sm" onClick={actions.onEdit}>Edit</Button>}
      {actions.onMove && <Button size="sm" onClick={actions.onMove}>Move</Button>}
      {actions.onArchive && <Button size="sm" variant="danger" onClick={actions.onArchive}>Archive</Button>}
    </div>}
  </Card>;
}

export function NodeDetailPanel({ query, pricingHref, actions }: {
  query: { isPending: boolean; isError: boolean; data?: NodeDetail; refetch: () => unknown } | null;
  pricingHref: string;
  actions: NodeDetailActions;
}) {
  if (!query) return <Card className="p-5"><Typography tone="muted">Select a node to see its details.</Typography></Card>;
  if (query.isPending) return <Card className="p-5"><PanelSkeleton rows={5} /></Card>;
  if (query.isError || !query.data) return <Card className="p-5"><PanelMessage onRetry={() => query.refetch()}>The node could not be loaded.</PanelMessage></Card>;
  return <NodeDetailView node={query.data} pricingHref={pricingHref} actions={actions} />;
}
