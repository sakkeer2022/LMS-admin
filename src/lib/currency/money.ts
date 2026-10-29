// Integer paise and basis points only. Server amounts are authoritative; the previews
// below copy the backend rounding (pricing.engine.ts) for live estimates while typing.

const whole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const exact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

/** 145000 -> "₹1,450"; 99950 -> "₹999.50". Paise are shown only when they are not zero. */
export function formatPaise(paise: number) {
  if (!Number.isSafeInteger(paise)) throw new Error('Use safe integer paise');
  return paise % 100 === 0 ? whole.format(paise / 100) : exact.format(paise / 100);
}

/** 1800 -> "18%"; 1250 -> "12.5%". */
export function formatBps(bps: number) {
  return `${bps / 100}%`;
}

export type ParsedRupees = { ok: true; paise: number } | { ok: false; error: string };

/**
 * Parses a rupee amount typed by a person ("1,450", "999.5", "₹1450.00") into paise with
 * string arithmetic only. Rejects negatives, more than two decimals and anything else.
 */
export function parseRupeesToPaise(input: string): ParsedRupees {
  const value = input.trim().replace(/^₹\s*/, '').replace(/,/g, '');
  if (!value) return { ok: false, error: 'Enter an amount' };
  if (value.startsWith('-')) return { ok: false, error: 'The amount cannot be negative' };
  const match = /^(\d+)(?:\.(\d*))?$/.exec(value);
  if (!match) return { ok: false, error: 'Enter an amount in rupees, for example 1450 or 999.50' };
  const [, rupees, fraction = ''] = match;
  if (fraction.length > 2) return { ok: false, error: 'Use at most two decimal places' };
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(paise)) return { ok: false, error: 'The amount is too large' };
  return { ok: true, paise };
}

/** Paise as an editable rupee string: 145000 -> "1450", 99950 -> "999.50". */
export function paiseToRupeesInput(paise: number) {
  const rupees = Math.trunc(paise / 100);
  const rest = paise % 100;
  return rest === 0 ? String(rupees) : `${rupees}.${String(rest).padStart(2, '0')}`;
}

/** GST = round_half_up(price x rate / 10000), exactly as the server stores it. Preview only. */
export function previewGst(paise: number, bps: number) {
  if (!Number.isSafeInteger(paise) || paise < 0 || !Number.isInteger(bps) || bps < 0) throw new Error('Invalid monetary input');
  return Math.floor((paise * bps + 5000) / 10000);
}

/** Preview of every amount the server will return; CGST takes the odd paisa. */
export function previewStudentPays(paise: number, bps: number) {
  const gstPaise = previewGst(paise, bps);
  const cgstPaise = Math.ceil(gstPaise / 2);
  return { sessionPricePaise: paise, gstRateBps: bps, gstPaise, cgstPaise, sgstPaise: gstPaise - cgstPaise, studentPaysPaise: paise + gstPaise };
}
