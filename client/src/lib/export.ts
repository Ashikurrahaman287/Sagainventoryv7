function quoteCSVField(value: unknown): string {
  const str = String(value ?? "");
  // Always quote if contains comma, quote, newline, or leading/trailing whitespace
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r") || str !== str.trim()) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) return;

  const cols = columns || Object.keys(data[0]).map((key) => ({ key, label: key }));

  const header = cols.map((col) => quoteCSVField(col.label)).join(",");

  const rows = data.map((row) =>
    cols.map((col) => quoteCSVField(row[col.key])).join(",")
  );

  // UTF-8 BOM so Excel opens it correctly with special characters
  const csv = "\uFEFF" + [header, ...rows].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCSVTemplate(
  filename: string,
  columns: { label: string; example?: string }[]
) {
  const header = columns.map((c) => quoteCSVField(c.label)).join(",");
  const example = columns.map((c) => quoteCSVField(c.example ?? "")).join(",");

  const csv = "\uFEFF" + [header, example].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_template.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `৳${num.toFixed(2)}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString();
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString();
}
