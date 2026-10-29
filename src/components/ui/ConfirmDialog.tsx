"use client";
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

/** Asks before a destructive or lossy action. Render it only while the question is open. */
export function ConfirmDialog({ title, children, confirmLabel, cancelLabel = 'Cancel', destructive = false, pending = false, onConfirm, onCancel }: {
  title: string; children: ReactNode; confirmLabel: string; cancelLabel?: string;
  destructive?: boolean; pending?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return <Modal open onClose={onCancel} title={title}>
    <div className="ui-confirm-body">{children}</div>
    <div className="ui-confirm-actions">
      <Button onClick={onCancel} disabled={pending}>{cancelLabel}</Button>
      <Button variant={destructive ? 'danger' : 'primary'} pending={pending} onClick={onConfirm}>{confirmLabel}</Button>
    </div>
  </Modal>;
}
