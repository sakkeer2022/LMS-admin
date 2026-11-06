"use client";
import { useState } from 'react';
import { ConfirmDialog } from '@/components/forms/confirm-dialog';
import { describeApiError } from '@/lib/api/errors';
import { useDeleteCategory, useUpdateCategory, type CategoryNode } from '@/lib/api/category-tree';
import { subCategoryLabel, tutorLabel } from '@/lib/api/category-tree-model';

/** Hard delete. The server refuses while anything depends on the category and says why. */
export function DeleteCategoryDialog({ node, onClose, onDeleted }: {
  node: CategoryNode;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const remove = useDeleteCategory();
  const update = useUpdateCategory();
  const [blocked, setBlocked] = useState<string>();
  const [error, setError] = useState<string>();
  const knownBlock = node.childrenCount > 0 || node.tutorCount > 0;

  if (blocked || knownBlock) {
    const reason = blocked ?? `${node.name} cannot be deleted because it has ${[node.childrenCount && subCategoryLabel(node.childrenCount), node.tutorCount && tutorLabel(node.tutorCount)].filter(Boolean).join(' and ')}. Disable it instead.`;
    return <ConfirmDialog open title={`Delete ${node.name}`} confirmLabel={node.isActive ? 'Disable instead' : 'Close'} pending={update.isPending} onCancel={onClose}
      onConfirm={() => {
        if (!node.isActive) { onClose(); return; }
        update.mutate({ id: node.id, version: node.version, isActive: false }, {
          onSuccess: onClose,
          onError: (err) => setError(describeApiError(err, 'change the status').message),
        });
      }}>
      <p className="text-sm" role="alert">{reason}</p>
      {node.isActive && <p className="text-sm text-muted-foreground">Disabling hides it and everything below it from tutors and learners. Nothing is lost.</p>}
      {error && <p className="text-sm text-error-foreground">{error}</p>}
    </ConfirmDialog>;
  }

  return <ConfirmDialog open title={`Delete ${node.name}`} confirmLabel="Delete" destructive pending={remove.isPending} onCancel={onClose}
    onConfirm={() => remove.mutate({ id: node.id, version: node.version }, {
      onSuccess: onDeleted,
      onError: (err) => {
        const described = describeApiError(err, 'delete categories');
        if (described.code === 'DELETE_BLOCKED') setBlocked(described.message);
        else setError(described.message);
      },
    })}>
    <p className="text-sm">Delete {node.name} permanently? This cannot be undone.</p>
    {error && <p className="text-sm text-error-foreground" role="alert">{error}</p>}
  </ConfirmDialog>;
}
