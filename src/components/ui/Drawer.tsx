"use client";
import type { ReactNode } from 'react';
import { Modal } from './Modal';

/**
 * Side panel for create and edit flows. Built on Modal, so focus is trapped while open
 * and returned to the trigger on close. `onClose` also fires for Escape and the Close
 * button, so a parent with unsaved edits can ask for confirmation there.
 */
export function Drawer({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode;
}) {
  return <Modal open={open} onClose={onClose} title={title} placement="right" dismissOnBackdrop={false}>
    <div className="ui-drawer-body">{children}</div>
    {footer && <div className="ui-drawer-footer">{footer}</div>}
  </Modal>;
}
