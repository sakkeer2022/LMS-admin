import { describe, expect, it } from 'vitest';
import { priceRuleSchema, resolveResultSchema } from '../src/lib/api/pricing';
import { bulkRowErrors, dropEdit, editErrors, pendingChanges, pendingCreates, setEdit } from '../src/features/pricing/schemas/pricing';

describe('pricing schemas accept the live response shapes', () => {
  it('parses a price rule and both resolution outcomes', () => {
    const amounts = { currency: 'INR', durationMinutes: 60, sessionPricePaise: 145000, gstRateBps: 1800, gstPaise: 26100, cgstPaise: 13050, sgstPaise: 13050, studentPaysPaise: 171100 };
    expect(priceRuleSchema.parse({ id: 'r1', curriculumId: 'c1', facultyId: null, facultyName: null, categoryName: 'School', boardName: 'CBSE', subjectName: 'Physics',
      levelName: 'Class 12', pathLabel: 'Academic › School › K-12 › CBSE', amounts, effectiveFrom: '2026-10-29T09:30:00.000Z', effectiveTo: null, isActive: true, revision: 1, updatedAt: '2026-10-29T09:30:00.000Z' }).amounts.studentPaysPaise).toBe(171100);
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
  it('maps rejected rows back from changes[i] and creates[i]', () => {
    expect(bulkRowErrors({ 'changes[1]': 'stale' }, [{ id: 'a' }, { id: 'b' }])).toEqual({ b: 'stale' });
    expect(bulkRowErrors({ 'creates[0]': 'overlap', 'changes[0]': 'stale' }, [{ id: 'a' }], [{ key: 'new:f1:c1' }])).toEqual({
      a: 'stale',
      'new:f1:c1': 'overlap',
    });
  });
  it('turns amounts typed on Not priced rows into creates, and ignores empty ones', () => {
    const create = { curriculumId: 'c1', facultyId: 'f1' };
    let edits = setEdit({}, 'new:f1:c1', { input: '1,200', originalPaise: null, revision: 0, create });
    edits = setEdit(edits, 'new:f1:c2', { input: '', originalPaise: null, revision: 0, create: { ...create, curriculumId: 'c2' } });
    edits = setEdit(edits, 'a', { input: '1500', originalPaise: 145000, revision: 2 });
    expect(pendingCreates(edits)).toEqual([{ key: 'new:f1:c1', curriculumId: 'c1', facultyId: 'f1', sessionPricePaise: 120000 }]);
    expect(pendingChanges(edits)).toEqual([{ id: 'a', sessionPricePaise: 150000, expectedRevision: 2 }]);
    expect(editErrors(edits)).toEqual({});
  });
});


import { awaitingPriceSchema } from '../src/lib/api/pricing';
import { offeringTreeSchema, pickerOfferings } from '../src/lib/api/offering-tree';
import { awaitingKey, presetFor, visibleAwaiting } from '../src/features/pricing/components/awaiting-rows';
import { chosenOffering } from '../src/features/pricing/components/offering-picker';

const tree = offeringTreeSchema.parse({
  nodes: [
    { id: 's', parentId: null, name: 'School', isLeaf: false },
    { id: 'k', parentId: 's', name: 'K-12', isLeaf: false },
    { id: 'p', parentId: 'k', name: 'Physics', isLeaf: false },
    { id: 'p11', parentId: 'p', name: 'Class 11', isLeaf: true },
    { id: 'p12', parentId: 'p', name: 'Class 12', isLeaf: true },
    { id: 'u', parentId: null, name: 'University', isLeaf: true },
  ],
  // One category curriculum per leaf: the subject is the leaf, board and level are null
  offerings: [
    { curriculumId: 'c12', categoryId: 'p12', board: null, level: null, subject: { id: 'p12', name: 'Class 12' } },
    { curriculumId: 'c11', categoryId: 'p11', board: null, level: null, subject: { id: 'p11', name: 'Class 11' } },
    { curriculumId: 'cu', categoryId: 'u', board: null, level: null, subject: { id: 'u', name: 'University' } },
  ],
});

describe('offering picker (GET /admin/category-tree/picker)', () => {
  it('labels each leaf with its full path and sorts by path', () => {
    const offerings = pickerOfferings(tree);
    expect(offerings.map((o) => [o.curriculumId, o.label])).toEqual([
      ['c11', 'School › K-12 › Physics › Class 11'],
      ['c12', 'School › K-12 › Physics › Class 12'],
      ['cu', 'University'],
    ]);
    expect(pickerOfferings(undefined)).toEqual([]);
  });
  it('finds the offering only for a complete, matching choice', () => {
    const offerings = pickerOfferings(tree);
    expect(chosenOffering(offerings, { categoryId: 'p11', curriculumId: 'c11' })?.subject).toBe('Class 11');
    expect(chosenOffering(offerings, { categoryId: 'u', curriculumId: 'c11' })).toBeUndefined();
    expect(chosenOffering(offerings, { categoryId: 'p11', curriculumId: '' })).toBeUndefined();
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

  it('lists Not priced rows on the first page, filtered like the rules', () => {
    const cards = [row('f1', 'c1'), row('f2', 'c2')];
    const keys = (list: typeof cards) => list.map(awaitingKey);
    expect(keys(visibleAwaiting(cards, { page: 1, status: 'active' }))).toEqual(['new:f1:c1', 'new:f2:c2']);
    expect(visibleAwaiting(cards, { page: 2, status: 'active' })).toEqual([]);
    expect(visibleAwaiting(cards, { page: 1, status: 'inactive' })).toEqual([]);
    expect(keys(visibleAwaiting(cards, { page: 1, status: 'all', q: 'tutor F2' }))).toEqual(['new:f2:c2']);
    expect(keys(visibleAwaiting(cards, { page: 1, status: 'active', q: 'k-12' }))).toHaveLength(2);
    expect(visibleAwaiting(cards, { page: 1, status: 'active', category: 'Academic' })).toHaveLength(2);
    expect(visibleAwaiting(cards, { page: 1, status: 'active', category: 'Languages' })).toEqual([]);
    expect(visibleAwaiting(cards, { page: 1, status: 'active', category: null })).toEqual([]);
  });
  it('pre-fills the tutor price with the default price when there is one', () => {
    expect(presetFor(row('f1', 'c1', amounts))).toEqual({
      facultyId: 'f1', facultyName: 'Tutor f1', curriculumId: 'c1',
      offeringLabel: 'Academic › School › K-12 › CBSE › Class 11 › Physics', suggestedPaise: 80000,
    });
    expect(presetFor(row('f1', 'c1')).suggestedPaise).toBeNull();
  });
});
