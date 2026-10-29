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
  const safe = /^[\s]*[=+@\-]|^[\t\r\n]/.test(text) ? "'" + text : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

function exportColumns(columns) {
  return columns.flatMap(column => {
    if (column.enableExport === false) return [];
    if (column.columns) return exportColumns(column.columns);
    return column.accessorKey || column.accessorFn || column.exportValue ? [column] : [];
  });
}

/** Serialize raw values, including nested keys and accessor functions. */
export function rowsToCsv({ rows, columns }) {
  const fields = exportColumns(columns);
  const lines = [fields.map(c => csvCell(c.exportHeader ??
    (typeof c.header === 'string' ? c.header : c.id ?? c.accessorKey ?? ''))).join(',')];
  rows.forEach((row, index) => lines.push(fields.map(c => {
    const value = c.exportValue ? c.exportValue(row, index) : c.accessorFn ? c.accessorFn(row, index) :
      c.accessorKey.split('.').reduce((value, key) => value?.[key], row);
    return csvCell(value);
  }).join(',')));
  return lines.join('\r\n');
}

export function exportRowsAsCsv({ rows, columns, filename = 'table.csv' }) {
  downloadBlob(new Blob(['\uFEFF', rowsToCsv({ rows, columns })], { type: 'text/csv;charset=utf-8' }), filename);
}
/** Server export is recommended for full datasets and Excel/PDF. */
export async function exportWithEndpoint({ url, filename, fetcher = fetch, signal, method = 'GET', body }) {
  const response = await fetcher(url, { method, signal, credentials: 'same-origin', ...(body == null ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  if (!response.ok) throw new Error(`Export failed (${response.status})`);
  downloadBlob(await response.blob(), filename);
}
