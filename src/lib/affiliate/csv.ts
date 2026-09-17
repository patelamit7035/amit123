/** Minimal, dependency-free CSV export used by the lead/earnings tables. */

export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Guard against spreadsheet formula injection from user-supplied lead fields.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T & string; label: string }[],
): string {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsvValue(row[column.key])).join(","));
  return [header, ...body].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  if (typeof document === "undefined") return;
  // Excel needs a byte-order mark to read the file as UTF-8.
  const bom = String.fromCharCode(0xfeff);
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
