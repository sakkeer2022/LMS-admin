"use client";
import { useId, useState, type ReactNode } from 'react';
import { Button } from './Button';
export type TabItem = { id: string; label: string; content: ReactNode; disabled?: boolean; };
export function Tabs({ items, label, defaultValue }: { items: TabItem[]; label: string; defaultValue?: string; }) {
  const base = useId();
  const enabled = items.filter(item => !item.disabled);
  const [value, setValue] = useState(defaultValue ?? enabled[0]?.id);
  const selected = enabled.find(item => item.id === value)?.id ?? enabled[0]?.id;
  return <div className="ui-tabs">
    <div role="tablist" aria-label={label} onKeyDown={e => {
      const index = enabled.findIndex(item => item.id === selected);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? enabled.length - 1 : e.key === 'ArrowRight' ? (index + 1) % enabled.length : e.key === 'ArrowLeft' ? (index - 1 + enabled.length) % enabled.length : -1;
      if (next < 0 || !enabled.length) return;
      e.preventDefault(); setValue(enabled[next].id);
      document.getElementById(`${base}-tab-${enabled[next].id}`)?.focus();
    }}>
      {items.map(item => <Button key={item.id} role="tab" variant="tab" id={`${base}-tab-${item.id}`} aria-controls={`${base}-panel-${item.id}`} aria-selected={selected === item.id} tabIndex={selected === item.id ? 0 : -1} disabled={item.disabled} onClick={() => setValue(item.id)}>{item.label}</Button>)}
    </div>
    {items.map(item => <div key={item.id} role="tabpanel" id={`${base}-panel-${item.id}`} aria-labelledby={`${base}-tab-${item.id}`} hidden={selected !== item.id} tabIndex={0}>{item.content}</div>)}
  </div>;
}
