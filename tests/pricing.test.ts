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

