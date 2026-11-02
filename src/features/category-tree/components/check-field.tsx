"use client";
import { useId, type ComponentProps } from 'react';
import { Checkbox, Label } from '@/components/ui';

/** A checkbox with its label beside it (the shared Label is a block, so it cannot wrap inline). */
export function CheckField({ label, className, ...props }: Omit<ComponentProps<typeof Checkbox>, 'id'> & { label: string; className?: string }) {
  const id = useId();
  return <div className={`flex items-center gap-2 ${className ?? ''}`}>
    <Checkbox id={id} {...props} />
    <Label htmlFor={id}>{label}</Label>
  </div>;
}
