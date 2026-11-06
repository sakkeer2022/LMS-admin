import { parseRupeesToPaise } from '@/lib/currency/money';

// Screen 29b bulk edit: row key -> the typed amount, the saved amount and the revision
// it was read at. Pure, so the change tracking is unit tested.
//
// A "Not priced" row (a tutor's subject card from GET /admin/prices/awaiting) has no rule
// yet: it carries `create` instead, has no saved amount, and any valid amount is a change.

export interface PriceEdit {
  input: string;
  originalPaise: number | null;
  revision: number;
  create?: { curriculumId: string; facultyId: string };
}
export type PriceEdits = Readonly<Record<string, PriceEdit>>;

export function setEdit(edits: PriceEdits, id: string, edit: PriceEdit): PriceEdits {
  return { ...edits, [id]: edit };
}
export function dropEdit(edits: PriceEdits, id: string): PriceEdits {
  const { [id]: _dropped, ...rest } = edits;
  return rest;
}

/** Valid amounts that differ from the saved one, on existing rules. */
export function pendingChanges(edits: PriceEdits) {
  return Object.entries(edits).flatMap(([id, edit]) => {
    if (edit.create) return [];
    const parsed = parseRupeesToPaise(edit.input);
    return parsed.ok && parsed.paise > 0 && parsed.paise !== edit.originalPaise ? [{ id, sessionPricePaise: parsed.paise, expectedRevision: edit.revision }] : [];
  });
}

/** Valid amounts typed on "Not priced" rows: the tutor prices to create. */
export function pendingCreates(edits: PriceEdits) {
  return Object.entries(edits).flatMap(([key, edit]) => {
    if (!edit.create) return [];
    const parsed = parseRupeesToPaise(edit.input);
    return parsed.ok && parsed.paise > 0 ? [{ key, ...edit.create, sessionPricePaise: parsed.paise }] : [];
  });
}

/** Typed amounts that cannot be saved, with the reason. A "Not priced" row left empty is not an error. */
export function editErrors(edits: PriceEdits) {
  const errors: Record<string, string> = {};
  for (const [id, edit] of Object.entries(edits)) {
    if (edit.create && !edit.input.trim()) continue;
    const parsed = parseRupeesToPaise(edit.input);
    if (!parsed.ok) errors[id] = parsed.error;
    else if (parsed.paise <= 0) errors[id] = 'The price must be more than zero';
  }
  return errors;
}

/** Maps the bulk endpoint's errors["changes[i]"] / errors["creates[i]"] back to the rows that were sent. */
export function bulkRowErrors(
  fields: Record<string, string>,
  sent: readonly { id: string }[],
  created: readonly { key: string }[] = [],
) {
  const rows: Record<string, string> = {};
  for (const [field, message] of Object.entries(fields)) {
    const match = /^(changes|creates)\[(\d+)\]/.exec(field);
    if (!match) continue;
    const key = match[1] === 'changes' ? sent[Number(match[2])]?.id : created[Number(match[2])]?.key;
    if (key) rows[key] = message;
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
