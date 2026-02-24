/**
 * Escape a value for CSV (wrap in quotes if contains comma, newline, or quote).
 */
function escapeCsvValue(value: string | number): string {
  const s = String(value);
  if (/[,"\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Convert rows to CSV string.
 */
export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

/**
 * Trigger download of CSV content as a file.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Export array of rows to CSV and download.
 */
export function exportToCsv(rows: (string | number)[][], filename: string): void {
  downloadCsv(toCsv(rows), filename);
}
