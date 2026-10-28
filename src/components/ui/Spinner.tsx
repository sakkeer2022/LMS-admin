"use client";
import { cx } from './utils';
export function Spinner({ className }: { className?: string; }) {
  return <span className={cx("ui-spinner", className)} aria-hidden="true" />;
}
