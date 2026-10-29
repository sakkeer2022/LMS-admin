"use client";
import { SelectField } from '@/components/ui';
import { uniqueBy, type Offering } from '@/lib/api/catalogue-tree';

export interface OfferingChoice {
  categoryId: string;
  boardId: string;
  subjectId: string;
  levelId: string;
}
export const emptyChoice: OfferingChoice = { categoryId: '', boardId: '', subjectId: '', levelId: '' };

const order = ['categoryId', 'boardId', 'subjectId', 'levelId'] as const;

/** The offering a complete choice stands for, or undefined while incomplete. */
export function chosenOffering(offerings: readonly Offering[], choice: OfferingChoice) {
  return offerings.find((o) => o.categoryId === choice.categoryId && (o.boardId ?? '') === choice.boardId && o.subjectId === choice.subjectId && o.levelId === choice.levelId);
}

/**
 * Category → Board (only where required) → Subject → Level, offering only combinations
 * that exist as leaves in the catalogue tree. Changing an earlier choice clears the rest.
 */
export function OfferingPicker({ offerings, value, onChange, errors = {}, idPrefix }: {
  offerings: readonly Offering[]; value: OfferingChoice; onChange: (next: OfferingChoice) => void;
  errors?: Partial<Record<keyof OfferingChoice, string>>; idPrefix: string;
}) {
  const inCategory = offerings.filter((o) => o.categoryId === value.categoryId);
  const requiresBoard = inCategory[0]?.requiresBoard ?? false;
  const inBoard = requiresBoard ? inCategory.filter((o) => o.boardId === value.boardId) : inCategory;
  const inSubject = inBoard.filter((o) => o.subjectId === value.subjectId);
  const choose = (key: keyof OfferingChoice, id: string) => {
    const next = { ...value, [key]: id };
    for (const later of order.slice(order.indexOf(key) + 1)) next[later] = '';
    onChange(next);
  };
  const field = (key: keyof OfferingChoice, label: string, options: { id: string; name: string }[], disabled: boolean) =>
    <SelectField id={`${idPrefix}-${key}`} label={label} value={value[key]} onChange={(e) => choose(key, e.target.value)} disabled={disabled} required error={errors[key]}>
      <option value="">Select {label.toLowerCase()}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </SelectField>;
  return <>
    {field('categoryId', 'Category', uniqueBy(offerings, (o) => o.categoryId).map((o) => ({ id: o.categoryId, name: o.categoryName })), false)}
    {requiresBoard && field('boardId', 'Board / Stream', uniqueBy(inCategory, (o) => o.boardId ?? '').map((o) => ({ id: o.boardId ?? '', name: o.boardName ?? '' })), !value.categoryId)}
    {field('subjectId', 'Subject', uniqueBy(inBoard, (o) => o.subjectId).map((o) => ({ id: o.subjectId, name: o.subjectName })), !value.categoryId || (requiresBoard && !value.boardId))}
    {field('levelId', 'Level', uniqueBy(inSubject, (o) => o.levelId).map((o) => ({ id: o.levelId, name: `${o.levelName}${o.status === 'DRAFT' ? ' (draft)' : ''}` })), !value.subjectId)}
  </>;
}
