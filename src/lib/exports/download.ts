'use client';
export function saveBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename.replace(/[/\\]/g, '_'); document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function csvCell(value: unknown) { let text = String(value ?? ''); if (/^[\s]*[=+@\-]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; }
export function exportCSV(rows: unknown[][], filename: string) { saveBlob(new Blob(['\uFEFF', rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), filename); }
export async function downloadReport(url: string, format: 'xlsx' | 'pdf', filename: string, signal?: AbortSignal) {
  if (!url.startsWith('/api/v1/') || url.includes('..')) throw new Error('Reports must use the same-origin authenticated API');
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', signal });
  if (!response.ok) throw new Error(`Report download failed (${response.status})`);
  const expected = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (!response.headers.get('content-type')?.includes(expected)) throw new Error('Unexpected report format');
  saveBlob(await response.blob(), `${filename}.${format}`);
}
// Large reports should use a backend export job and a short-lived authorized download URL, not browser row aggregation.
