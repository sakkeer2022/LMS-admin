import { describe, expect, it } from 'vitest';
import { priceRuleSchema, resolveResultSchema } from '../src/lib/api/pricing';
import { bulkRowErrors, dropEdit, editErrors, pendingChanges, setEdit } from '../src/features/pricing/schemas/pricing';

describe('pricing schemas accept the live response shapes', () => {
  it('parses a price rule and both resolution outcomes', () => {
    const amounts = { currency: 'INR', durationMinutes: 60, sessionPricePaise: 145000, gstRateBps: 1800, gstPaise: 26100, cgstPaise: 13050, sgstPaise: 13050, studentPaysPaise: 171100 };
    expect(priceRuleSchema.parse({ id: 'r1', curriculumId: 'c1', facultyId: null, facultyName: null, categoryName: 'School', boardName: 'CBSE', subjectName: 'Physics',
      levelName: 'Class 12', amounts, effectiveFrom: '2026-10-29T09:30:00.000Z', effectiveTo: null, isActive: true, revision: 1, updatedAt: '2026-10-29T09:30:00.000Z' }).amounts.studentPaysPaise).toBe(171100);
    expect(resolveResultSchema.parse({ available: false, reason: 'PRICE_NOT_CONFIGURED' }).available).toBe(false);
    expect(resolveResultSchema.parse({ available: true, matchedRuleId: 'r1', matchedOn: 'DEFAULT', curriculumId: 'c1', facultyId: null, amounts }).available).toBe(true);
  });
});


describe('bulk price edit tracking (screen 29b)', () => {
  const edit = (input: string, originalPaise = 145000) => ({ input, originalPaise, revision: 2 });
  it('counts only valid amounts that changed, and discards drop them', () => {
    let edits = setEdit({}, 'a', edit('1450'));
    edits = setEdit(edits, 'b', edit('1600'));
    edits = setEdit(edits, 'c', edit('abc'));
    expect(pendingChanges(edits)).toEqual([{ id: 'b', sessionPricePaise: 160000, expectedRevision: 2 }]);
    expect(Object.keys(editErrors(edits))).toEqual(['c']);
    expect(pendingChanges(dropEdit(edits, 'b'))).toEqual([]);
  });
  it('maps rejected rows back from changes[i]', () => {
    expect(bulkRowErrors({ 'changes[1]': 'stale' }, [{ id: 'a' }, { id: 'b' }])).toEqual({ b: 'stale' });
  });
});


import { awaitingPriceSchema } from '../src/lib/api/pricing';
import { offeringTreeSchema, pickerCategories, pickerOfferings } from '../src/lib/api/offering-tree';
import { groupByTutor, presetFor } from '../src/features/pricing/components/awaiting-prices';
import { chosenOffering } from '../src/features/pricing/components/offering-picker';

const tree = offeringTreeSchema.parse({
  nodes: [
    { id: 'a', parentId: null, name: 'Academic', isLeaf: false },
    { id: 's', parentId: 'a', name: 'School', isLeaf: false },
    { id: 'k', parentId: 's', name: 'K-12', isLeaf: true },
    { id: 'u', parentId: 'a', name: 'University', isLeaf: true },
  ],
  offerings: [
    { curriculumId: 'c2', categoryId: 'k', board: { id: 'b', name: 'CBSE' }, level: { id: 'l', name: 'Class 11' }, subject: { id: 'p', name: 'Physics' } },
    { curriculumId: 'c1', categoryId: 'k', board: { id: 'b', name: 'CBSE' }, level: { id: 'l', name: 'Class 11' }, subject: { id: 'c', name: 'Chemistry' } },
    { curriculumId: 'c3', categoryId: 'u', board: null, level: null, subject: { id: 'm', name: 'Maths' } },
  ],
});

describe('offering picker (GET /admin/category-tree/picker)', () => {
  it('labels each offering with its category path and sorts by path then subject', () => {
    const offerings = pickerOfferings(tree);
    expect(offerings.map((o) => [o.categoryLabel, o.label])).toEqual([
      ['Academic › School › K-12', 'Chemistry · CBSE · Class 11'],
      ['Academic › School › K-12', 'Physics · CBSE · Class 11'],
      ['Academic › University', 'Maths'],
    ]);
    expect(pickerCategories(offerings)).toEqual([
      { id: 'k', label: 'Academic › School › K-12' },
      { id: 'u', label: 'Academic › University' },
    ]);
    expect(pickerOfferings(undefined)).toEqual([]);
  });
  it('finds the offering only for a complete, matching choice', () => {
    const offerings = pickerOfferings(tree);
    expect(chosenOffering(offerings, { categoryId: 'k', curriculumId: 'c2' })?.subject).toBe('Physics');
    expect(chosenOffering(offerings, { categoryId: 'u', curriculumId: 'c2' })).toBeUndefined();
    expect(chosenOffering(offerings, { categoryId: 'k', curriculumId: '' })).toBeUndefined();
  });
});

describe('awaiting tutor prices', () => {
  const amounts = { currency: 'INR', durationMinutes: 60, sessionPricePaise: 80000, gstRateBps: 1800, gstPaise: 14400, cgstPaise: 7200, sgstPaise: 7200, studentPaysPaise: 94400 } as const;
  const row = (facultyId: string, curriculumId: string, defaultPrice: typeof amounts | null = null) =>
    awaitingPriceSchema.parse({
      facultyId, facultyName: `Tutor ${facultyId}`, facultyEmail: `${facultyId}@example.com`, approvedAt: '2026-11-04T09:00:00Z',
      curriculumId, subject: 'Physics', pathLabel: 'Academic › School › K-12 › CBSE › Class 11', categoryPath: ['Academic', 'School', 'K-12'],
      board: 'CBSE', level: 'Class 11', defaultPrice,
    });

  it('groups cards by tutor in the server order', () => {
    const groups = groupByTutor([row('f1', 'c1'), row('f2', 'c1'), row('f1', 'c2')]);
    expect(groups.map((g) => [g.facultyId, g.cards.map((c) => c.curriculumId)])).toEqual([['f1', ['c1', 'c2']], ['f2', ['c1']]]);
  });
  it('pre-fills the tutor price with the default price when there is one', () => {
    expect(presetFor(row('f1', 'c1', amounts))).toEqual({
      facultyId: 'f1', facultyName: 'Tutor f1', curriculumId: 'c1',
      offeringLabel: 'Academic › School › K-12 › CBSE › Class 11 › Physics', suggestedPaise: 80000,
    });
    expect(presetFor(row('f1', 'c1')).suggestedPaise).toBeNull();
  });
});
