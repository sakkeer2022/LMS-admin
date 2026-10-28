export function formatINR(minorUnits: number) {
  if (!Number.isSafeInteger(minorUnits)) throw new Error('Use safe integer paise');
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(minorUnits / 100);
}
export function taxBreakdown(basePaise: number, gstBasisPoints = 1800, tdsBasisPoints = 0) {
  if (![basePaise, gstBasisPoints, tdsBasisPoints].every(Number.isSafeInteger) || basePaise < 0 || gstBasisPoints < 0 || tdsBasisPoints < 0 || gstBasisPoints > 10000 || tdsBasisPoints > 10000) throw new Error('Invalid monetary input');
  const gst = Math.round(basePaise * gstBasisPoints / 10000); const tds = Math.round(basePaise * tdsBasisPoints / 10000);
  return { base: basePaise, gst, tds, total: basePaise + gst, net: basePaise + gst - tds };
}
// Illustrative exclusive GST / base TDS display only. Backend provides authoritative tax amounts and rates.
