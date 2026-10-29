import { parseRupeesToPaise } from '@/lib/currency/money';

// Screen 29b bulk edit: rule id -> the typed amount, the saved amount and the revision
// it was read at. Pure, so the change tracking is unit tested.

export interface PriceEdit {
  input: string;
  originalPaise: number;
  revision: number;
}
export type PriceEdits = Readonly<Record<string, PriceEdit>>;

export function setEdit(edits: PriceEdits, id: string, edit: PriceEdit): PriceEdits {
  return { ...edits, [id]: edit };
}
export function dropEdit(edits: PriceEdits, id: string): PriceEdits {
  const { [id]: _dropped, ...rest } = edits;
  return rest;
}

/** Valid amounts that differ from the saved one: what "Save N changes" sends. */
export function pendingChanges(edits: PriceEdits) {
  return Object.entries(edits).flatMap(([id, edit]) => {
    const parsed = parseRupeesToPaise(edit.input);
    return parsed.ok && parsed.paise > 0 && parsed.paise !== edit.originalPaise ? [{ id, sessionPricePaise: parsed.paise, expectedRevision: edit.revision }] : [];
  });
}

/** Typed amounts that cannot be saved, with the reason. */
export function editErrors(edits: PriceEdits) {
  const errors: Record<string, string> = {};
  for (const [id, edit] of Object.entries(edits)) {
    const parsed = parseRupeesToPaise(edit.input);
    if (!parsed.ok) errors[id] = parsed.error;
    else if (parsed.paise <= 0) errors[id] = 'The price must be more than zero';
  }
  return errors;
}

/** Maps the bulk endpoint's errors["changes[i]"] back to the rows that were sent. */
export function bulkRowErrors(fields: Record<string, string>, sent: readonly { id: string }[]) {
  const rows: Record<string, string> = {};
  for (const [key, message] of Object.entries(fields)) {
    const index = /^changes\[(\d+)\]/.exec(key)?.[1];
    const change = index === undefined ? undefined : sent[Number(index)];
    if (change) rows[change.id] = message;
  }
  return rows;
}

/** ISO instant -> the value of an <input type="datetime-local"> in the browser's zone. */
export function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
/** datetime-local value -> ISO instant with an explicit offset (UTC). Empty stays empty. */
export function fromLocalInput(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
