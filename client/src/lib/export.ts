// Export utilities for CSV and data export

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) return;

  // If columns not provided, use all keys from first object
  const cols = columns || Object.keys(data[0]).map((key) => ({ key, label: key }));

  // Create CSV header
  const header = cols.map((col) => col.label).join(",");

  // Create CSV rows
  const rows = data.map((row) =>
    cols
      .map((col) => {
        const value = row[col.key];
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value ?? "");
        return stringValue.includes(",") || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      })
      .join(",")
  );

  // Combine header and rows
  const csv = [header, ...rows].join("\n");

  // Create blob and download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
