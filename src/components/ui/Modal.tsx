"use client";
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import { Typography } from './Typography';
import { cx } from './utils';

export type ModalPlacement = 'center' | 'right' | 'left' | 'top' | 'bottom';
export function Modal({ open, onClose, title, children, placement = 'center', dismissOnBackdrop = true, className, closeContent = 'Close', closeDisabled = false }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
  placement?: ModalPlacement; dismissOnBackdrop?: boolean;
  /** Extra class on the dialog, e.g. to set a narrower width. */
  className?: string;
  /** Visible content of the close button (its accessible name stays "Close <title>"). */
  closeContent?: ReactNode;
  /** Disables the close button, e.g. while a submission is in flight. */
  closeDisabled?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);
  return <dialog ref={ref} className={cx('ui-modal', `ui-modal--${placement}`, className)} aria-labelledby={id}
    onKeyDown={e => {
      if (e.key !== 'Tab') return;
      const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')).filter(item => item.getClientRects().length > 0 && !item.closest('[inert]'));
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }}
    onCancel={e => { e.preventDefault(); close.current(); }}
    onClick={e => {
      if (!dismissOnBackdrop || e.target !== e.currentTarget) return;
      const bounds = e.currentTarget.getBoundingClientRect();
      if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) close.current();
    }}>
    <div className="ui-modal-header"><Typography variant="h2" id={id}>{title}</Typography>
      <Button autoFocus aria-label={`Close ${title}`} onClick={onClose} disabled={closeDisabled}
        variant={closeContent === 'Close' ? undefined : 'ghost'} size={closeContent === 'Close' ? undefined : 'icon'}>{closeContent}</Button></div>
    {children}
  </dialog>;
}
