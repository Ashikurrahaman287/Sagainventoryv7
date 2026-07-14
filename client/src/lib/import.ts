export interface ParseCSVResult<T> {
  data: T[];
  errors: string[];
  warnings: string[];
}

export interface ColumnMapping<T> {
  csvHeader: string;
  field: keyof T;
  optional?: boolean;
}

export function parseCSV<T>(
  file: File,
  columnMapping: ColumnMapping<T>[],
  transform: (row: Record<string, string>) => Partial<T>
): Promise<ParseCSVResult<T>> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const raw = e.target?.result as string;
      // Strip UTF-8 BOM if present
      const text = raw.startsWith("\uFEFF") ? raw.slice(1) : raw;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());

      if (lines.length === 0) {
        resolve({ data: [], errors: ["CSV file is empty"], warnings: [] });
        return;
      }

      const headers = parseCSVLine(lines[0]);
      const errors: string[] = [];
      const warnings: string[] = [];

      // Map required columns; warn (not error) on missing optional ones
      const columnIndices = new Map<keyof T, number>();
      const missingOptional: string[] = [];

      for (const { csvHeader, field, optional } of columnMapping) {
        const idx = headers.findIndex(
          (h) => h.toLowerCase().trim() === csvHeader.toLowerCase().trim()
        );
        if (idx === -1) {
          if (optional) {
            missingOptional.push(csvHeader);
          } else {
            errors.push(`Required column "${csvHeader}" not found in CSV`);
          }
        } else {
          columnIndices.set(field, idx);
        }
      }

      if (missingOptional.length > 0) {
        warnings.push(
          `Optional column(s) not found and will be skipped: ${missingOptional.join(", ")}`
        );
      }

      if (errors.length > 0) {
        resolve({ data: [], errors, warnings });
        return;
      }

      const data: T[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        const rowData: Record<string, string> = {};

        for (const { csvHeader, field } of columnMapping) {
          const idx = columnIndices.get(field);
          rowData[csvHeader] = idx !== undefined ? (values[idx] ?? "").trim() : "";
        }

        try {
          const transformed = transform(rowData);
          data.push(transformed as T);
        } catch (err) {
          errors.push(
            `Row ${i + 1}: ${err instanceof Error ? err.message : "Invalid data"}`
          );
        }
      }

      resolve({ data, errors, warnings });
    };

    reader.onerror = () => {
      resolve({ data: [], errors: ["Failed to read file"], warnings: [] });
    };

    reader.readAsText(file, "utf-8");
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current.trim());
  return result;
}

export function validateRequired(value: string, fieldName: string): string {
  const v = (value ?? "").trim();
  if (!v) throw new Error(`${fieldName} is required`);
  return v;
}

export function validateNumber(value: string, fieldName: string): number {
  // Strip currency symbols, spaces, commas used as thousand separators
  const cleaned = (value ?? "").replace(/[৳$,\s]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num) || !isFinite(num)) {
    throw new Error(`${fieldName} must be a valid number (got: "${value}")`);
  }
  if (num < 0) throw new Error(`${fieldName} cannot be negative`);
  return num;
}

export function validateInteger(value: string, fieldName: string): number {
  const cleaned = (value ?? "").replace(/[,\s]/g, "");
  // Accept decimals like "5.0" and floor them
  const num = Math.floor(parseFloat(cleaned));
  if (isNaN(num) || !isFinite(num)) {
    throw new Error(`${fieldName} must be a valid whole number (got: "${value}")`);
  }
  if (num < 0) throw new Error(`${fieldName} cannot be negative`);
  return num;
}

export function validateEmail(value: string, fieldName: string): string {
  const email = (value ?? "").trim();
  if (!email) return email; // allow optional empty
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error(`${fieldName} must be a valid email address`);
  }
  return email;
}
