import { describe, expect, it } from 'vitest';
import { formatBps, formatPaise, paiseToRupeesInput, parseRupeesToPaise, previewGst, previewStudentPays } from '../src/lib/currency/money';

describe('formatPaise', () => {
  it('shows paise only when they are not zero', () => {
    expect(formatPaise(145000)).toBe('₹1,450');
    expect(formatPaise(99950)).toBe('₹999.50');
    expect(formatPaise(100000000)).toBe('₹10,00,000');
    expect(formatPaise(5)).toBe('₹0.05');
  });
  it('rejects non-integer paise', () => expect(() => formatPaise(1.5)).toThrow());
  it('formats basis points', () => { expect(formatBps(1800)).toBe('18%'); expect(formatBps(1250)).toBe('12.5%'); });
});

describe('parseRupeesToPaise', () => {
  it.each([
    ['1450', 145000], ['1,450', 145000], ['₹1450.00', 145000], ['999.5', 99950], ['999.50', 99950], ['0.01', 1], ['  12 ', 1200], ['12.', 1200],
  ])('%s -> %i paise', (input, paise) => expect(parseRupeesToPaise(input)).toEqual({ ok: true, paise }));
  it.each(['', '-5', '1.234', 'abc', '1e3', '12.3.4', '0x10', '₹'])('rejects %j', (input) => expect(parseRupeesToPaise(input).ok).toBe(false));
  it('never uses floating point (0.29 is exactly 29 paise)', () => expect(parseRupeesToPaise('0.29')).toEqual({ ok: true, paise: 29 }));
  it('round-trips the editable form', () => {
    for (const p of [1, 29, 100, 99950, 145000]) expect(parseRupeesToPaise(paiseToRupeesInput(p))).toEqual({ ok: true, paise: p });
  });
});

describe('GST preview matches the server (round half up, CGST takes the odd paisa)', () => {
  // Values from amentorz-backend tests/unit/pricing-engine.test.ts
  it.each([
    [145000, 1800, 26100, 171100], [160000, 1800, 28800, 188800], [99999, 1800, 18000, 117999], [100003, 1800, 18001, 118004],
    [100002, 1800, 18000, 118002], [25, 1800, 5, 30], [1, 1800, 0, 1], [50000, 0, 0, 50000], [100000000, 10000, 100000000, 200000000],
  ])('%i paise at %i bps -> GST %i, pays %i', (paise, bps, gst, pays) => {
    expect(previewGst(paise, bps)).toBe(gst);
    expect(previewStudentPays(paise, bps).studentPaysPaise).toBe(pays);
  });
  it('splits and totals like the server', () => {
    expect(previewStudentPays(145000, 1800)).toEqual({ sessionPricePaise: 145000, gstRateBps: 1800, gstPaise: 26100, cgstPaise: 13050, sgstPaise: 13050, studentPaysPaise: 171100 });
    const odd = previewStudentPays(25, 1800);
    expect([odd.cgstPaise, odd.sgstPaise]).toEqual([3, 2]);
  });
});
