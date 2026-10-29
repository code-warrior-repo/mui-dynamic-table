export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csvCell(value) {
  const text = value == null ? '' : String(value);
  const escaped = text.replaceAll('"', '""');
  return /^[=+@\-\t\r]/.test(text) || /[",\r\n]/.test(text) ? `"${escaped.startsWith('=') || /^[+@\-\t\r]/.test(text) ? "'" : ''}${escaped}"` : escaped;
}
/** CSV protects against spreadsheet formula injection. Pass accessorKey columns. */
export function exportRowsAsCsv({ rows, columns, filename = 'table.csv' }) {
  const fields = columns.filter(c => c.accessorKey && c.enableExport !== false);
  const lines = [fields.map(c => csvCell(typeof c.header === 'string' ? c.header : c.accessorKey)).join(',')];
  rows.forEach(row => lines.push(fields.map(c => csvCell(row[c.accessorKey])).join(',')));
  downloadBlob(new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), filename);
}
/** Server export is recommended for full datasets and Excel/PDF. */
export async function exportWithEndpoint({ url, filename, fetcher = fetch, signal, method = 'GET', body }) {
  const response = await fetcher(url, { method, signal, credentials: 'same-origin', ...(body == null ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  if (!response.ok) throw new Error(`Export failed (${response.status})`);
  downloadBlob(await response.blob(), filename);
}
