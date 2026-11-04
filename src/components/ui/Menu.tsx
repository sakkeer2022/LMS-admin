"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from './Button';

export type MenuItem = { id: string; label: string; onSelect: () => void; destructive?: boolean; disabled?: boolean };

/** A small action menu (the ⋮ button on rows). Arrow keys move between items; Escape closes. */
export function Menu({ label, items, triggerLabel = '⋮', triggerTabIndex }: {
  label: string; items: MenuItem[]; triggerLabel?: string; triggerTabIndex?: number;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  if (items.length === 0) return null;
  return <div className="ui-menu" ref={root} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (!open || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const options = Array.from(root.current!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'));
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    options[next]?.focus();
  }}>
    <Button ref={trigger} size="icon" variant="ghost" aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={id}
      tabIndex={triggerTabIndex} onClick={() => setOpen((value) => !value)}>{triggerLabel}</Button>
    {open && <div className="ui-menu-list" role="menu" id={id} aria-label={label}>
      {items.map((item) => <Button key={item.id} role="menuitem" variant="ghost" size="sm" disabled={item.disabled}
        className={item.destructive ? 'ui-menu-item ui-menu-item--danger' : 'ui-menu-item'}
        onClick={() => { setOpen(false); item.onSelect(); }}>{item.label}</Button>)}
    </div>}
  </div>;
}
