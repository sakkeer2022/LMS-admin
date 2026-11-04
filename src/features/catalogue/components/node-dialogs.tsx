"use client";
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, ConfirmDialog, FormError, SelectField, Typography } from '@/components/ui';
import { useArchiveNode, useMoveNode, useReorderNodes, type TreeNode } from '@/lib/api/catalogue';
import { moveTargets, typeLabel } from '@/lib/api/catalogue-tree';
import { describeApiError } from '@/lib/api/errors';

/** Move a node under another valid parent in the same category. */
export function MoveDialog({ tenant, node, root, requiresBoard, onClose }: {
  tenant: string; node: TreeNode; root: TreeNode; requiresBoard: boolean; onClose: () => void;
}) {
  const targets = moveTargets(root, node, requiresBoard);
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState<string>();
  const move = useMoveNode(tenant);
  const confirm = async () => {
    if (!parentId) { setError('Choose the new parent'); return; }
    try {
      await move.mutateAsync({ id: node.id, parentId });
      toast.success(`Moved ${node.name}`);
      onClose();
    } catch (e) { setError(describeApiError(e, 'move catalogue nodes').message); }
  };
  return <ConfirmDialog title={`Move ${node.name}`} confirmLabel="Move" pending={move.isPending} onCancel={onClose} onConfirm={confirm}>
    <Typography variant="body2" tone="muted">
      The {typeLabel(node.type).toLowerCase()} and everything under it move together, within {root.name}. Its offerings keep their ids,
      so their prices stay attached; the board and subject of each offering follow the new parent. A node cannot move while
      students, tutors, price rules or library items use any offering under it; archive it and add a new path instead.
    </Typography>
    {targets.length === 0
      ? <Typography>There is no other valid parent for this {typeLabel(node.type).toLowerCase()} in {root.name}.</Typography>
      : <SelectField label="New parent" value={parentId} onChange={(e) => { setParentId(e.target.value); setError(undefined); }} required>
          <option value="">Select the new parent</option>
          {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </SelectField>}
    <FormError message={error} />
  </ConfirmDialog>;
}

/** Archive after confirmation; the API refuses while children are not archived. */
export function ArchiveDialog({ tenant, node, onClose }: { tenant: string; node: TreeNode; onClose: () => void }) {
  const [error, setError] = useState<string>();
  const archive = useArchiveNode(tenant);
  const active = node.children.filter((c) => c.status !== 'ARCHIVED').length;
  const below = Object.entries(node.counts).filter(([, n]) => n > 0).map(([type, n]) => `${n} ${n === 1 ? type.replace(/s$/, '') : type}`);
  const confirm = async () => {
    try {
      await archive.mutateAsync(node.id);
      toast.success(`Archived ${node.name}`);
      onClose();
    } catch (e) { setError(describeApiError(e, 'archive catalogue nodes').message); }
  };
  return <ConfirmDialog title={`Archive ${node.name}?`} confirmLabel="Archive" destructive pending={archive.isPending} onCancel={onClose} onConfirm={confirm}>
    <Typography>Archived nodes are hidden from students, and the offering a level stands for stops being bookable.</Typography>
    {below.length > 0 && <Typography variant="body2" tone="muted">Under this node: {below.join(', ')} (archived ones included).</Typography>}
    {active > 0 && <Typography variant="body2" tone="warning">{active} child node{active === 1 ? '' : 's'} must be archived first.</Typography>}
    <FormError message={error} />
  </ConfirmDialog>;
}

/** Reorder the siblings of one node (every child of its parent, archived ones included). */
export function ReorderPanel({ tenant, parent, onDone }: { tenant: string; parent: TreeNode; onDone: () => void }) {
  const [ids, setIds] = useState(() => parent.children.map((c) => c.id));
  const [error, setError] = useState<string>();
  const reorder = useReorderNodes(tenant);
  const byId = new Map(parent.children.map((c) => [c.id, c]));
  const moveBy = (index: number, delta: number) => setIds((list) => {
    const next = [...list];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    return next;
  });
  const changed = ids.some((id, i) => id !== parent.children[i]?.id);
  const save = async () => {
    try {
      await reorder.mutateAsync({ parentId: parent.id, orderedIds: ids });
      toast.success(`Saved the order under ${parent.name}`);
      onDone();
    } catch (e) { setError(describeApiError(e, 'reorder the catalogue').message); }
  };
  return <Card className="flex flex-col gap-3 p-5">
    <div className="flex flex-col gap-1">
      <Typography variant="h2">Reorder</Typography>
      <Typography variant="body2" tone="muted">Children of {parent.name}. Move them up or down, then save.</Typography>
    </div>
    <ol className="flex flex-col gap-1" aria-label={`Order of the children of ${parent.name}`}>
      {ids.map((id, i) => <li key={id} className="flex items-center gap-2">
        <Typography component="span" className="flex-1">{i + 1}. {byId.get(id)?.name}{byId.get(id)?.status === 'ARCHIVED' ? ' (archived)' : ''}</Typography>
        <Button size="sm" variant="ghost" disabled={i === 0} aria-label={`Move ${byId.get(id)?.name} up`} onClick={() => moveBy(i, -1)}>↑</Button>
        <Button size="sm" variant="ghost" disabled={i === ids.length - 1} aria-label={`Move ${byId.get(id)?.name} down`} onClick={() => moveBy(i, 1)}>↓</Button>
      </li>)}
    </ol>
    <FormError message={error} />
    <div className="flex justify-end gap-2">
      <Button onClick={onDone} disabled={reorder.isPending}>Cancel</Button>
      <Button variant="primary" disabled={!changed} pending={reorder.isPending} onClick={save}>Save order</Button>
    </div>
  </Card>;
}
