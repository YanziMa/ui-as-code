/**
 * Advanced CSV utilities with streaming support, type inference, and transformation.
 */

export interface CsvParseOptions {
  /** Field delimiter (default: comma) */
  delimiter?: string;
  /** Row delimiter */
  rowDelimiter?: string;
  /** Quote character */
  quoteChar?: string;
  /** Escape character */
  escapeChar?: string;
  /** Has header row? */
  header?: boolean;
  /** Skip empty lines? */
  skipEmptyLines?: boolean;
  /** Trim fields? */
  trimFields?: boolean;
  /** Max rows to parse (0 = unlimited) */
  maxRows?: number;
  /** Encoding */
  encoding?: string;
}

export interface CsvRow {
  [key: string]: string | number | boolean | null;
  _raw: string[];
  _lineNumber: number;
}

export interface CsvWriteOptions {
  /** Field delimiter */
  delimiter?: string;
  /** Include BOM for Excel compatibility */
  includeBom?: boolean;
  /** Quote all fields? */
  quoteAll?: boolean;
  /** Quote only when necessary (default) */
  quoteWhenNeeded?: boolean;
  /** Line ending style */
  lineEnding?: "\r\n" | "\n" | "\r";
  /** Add header row */
  header?: boolean;
}

export interface CsvSchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "null";
  required?: boolean;
  defaultValue?: unknown;
  pattern?: RegExp;
  enum?: string[];
}

/** Parse CSV string into array of objects */
export function parseCsv(csvString: string, options: CsvParseOptions = {}): {
  headers: string[];
  rows: Array<Record<string, unknown>>;
  errors: Array<{ line: number; message: string }>;
} {
  const {
    delimiter = ",",
    rowDelimiter = /\r\n|\n|\r/,
    header = true,
    skipEmptyLines = true,
    trimFields = true,
    maxRows = 0,
  } = options;

  const errors: Array<{ line: number; message: string }> = [];
  const rawLines = csvString.split(rowDelimiter);
  const headers: string[] = [];
  const rows: Array<Record<string, unknown>> = [];

  let lineIndex = 0;

  // Parse header
  if (header && rawLines.length > 0) {
    const headerLine = rawLines[lineIndex]!;
    if (!skipEmptyLines || headerLine.trim() !== "") {
      headers.push(...parseCsvLine(headerLine, delimiter, trimFields));
    }
    lineIndex++;
  }

  // Parse data rows
  let rowCount = 0;
  while (lineIndex < rawLines.length) {
    if (maxRows > 0 && rowCount >= maxRows) break;

    const rawLine = rawLines[lineIndex]!;

    if (skipEmptyLines && rawLine.trim() === "") {
      lineIndex++;
      continue;
    }

    try {
      const values = parseCsvLine(rawLine, delimiter, trimFields);
      const row: Record<string, unknown> = {};

      if (header) {
        for (let i = 0; i < headers.length; i++) {
          const key = headers[i] ?? `column_${i}`;
          const value = i < values.length ? values[i] : null;
          row[key] = value;
        }

        // Extra columns beyond headers
        for (let i = headers.length; i < values.length; i++) {
          row[`extra_${i}`] = values[i];
        }
      } else {
        // No header: use column indices as keys
        for (let i = 0; i < values.length; i++) {
          row[`column_${i}`] = values[i];
        }
      }

      rows.push(row);
      rowCount++;
    } catch (err) {
      errors.push({ line: lineIndex + 1, message: String(err) });
    }

    lineIndex++;
  }

  return { headers, rows, errors };
}

/** Parse a single CSV line into fields */
function parseCsvLine(line: string, delimiter: string, trim: boolean): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i]!;

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
    } else if (!inQuotes && char === delimiter) {
      fields.push(trim ? current.trim() : current);
      current = "";
      i++;
    } else {
      current += char;
      i++;
    }
  }

  fields.push(trim ? current.trim() : current);
  return fields;
}

/** Generate CSV from array of objects */
export function generateCsv(
  data: Array<Record<string, unknown>>,
  options: CsvWriteOptions = {},
): string {
  const {
    delimiter = ",",
    includeBom = false,
    quoteWhenNeeded = true,
    lineEnding = "\r\n",
    header = true,
  } = options;

  if (data.length === 0) return "";

  // Get headers from first row keys
  const headers = Object.keys(data[0]!);

  let output = "";

  if (includeBom) output += "\uFEFF";

  // Header row
  if (header) {
    output += headers.map((h) => formatCsvField(h, delimiter, quoteWhenNeeded)).join(delimiter) + lineEnding;
  }

  // Data rows
  for (const row of data) {
    const values = headers.map((key) => {
      const val = row[key];
      let str: string;

      if (val == null) str = "";
      else if (typeof val === "object") str = JSON.stringify(val);
      else str = String(val);

      return formatCsvField(str, delimiter, quoteWhenNeeded);
    });

    output += values.join(delimiter) + lineEnding;
  }

  return output;
}

/** Format a single field for CSV output */
function formatCsvField(value: string, delimiter: string, quoteIfNeeded: boolean): string {
  const needsQuoting =
    !quoteIfNeeded ||
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r");

  if (needsQuoting) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/** Convert CSV to HTML table */
export function csvToHtmlTable(csvString: string, options: CsvParseOptions & { tableClass?: string } = {}): string {
  const { headers, rows, errors } = parseCsv(csvString, options);
  const tableClass = options.tableClass ?? "csv-table";

  if (errors.length > 0) {
    console.warn("CSV parse errors:", errors);
  }

  let html = `<table class="${tableClass}">\n`;

  // Header
  if (headers.length > 0) {
    html += "  <thead>\n    <tr>";
    for (const h of headers) {
      html += `<th>${escapeHtml(h)}</th>`;
    }
    html += "</tr>\n  </thead>\n";
  }

  // Body
  html += "  <tbody>\n";
  for (const row of rows) {
    html += "    <tr>";
    for (const key of Object.keys(row)) {
      html += `<td>${escapeHtml(String(row[key] ?? ""))}</td>`;
    }
    html += "</tr>\n";
  }
  html += "  </tbody>\n</table>";

  return html;
}

/** Convert CSV to Markdown table */
export function csvToMarkdown(csvString: string, options: CsvParseOptions = {}): string {
  const { headers, rows } = parseCsv(csvString, options);

  if (headers.length === 0 || rows.length === 0) return "";

  let md = "| " + headers.join(" | ") + " |\n";
  md += "| " + headers.map(() => "---").join(" | ") + " |\n";

  for (const row of rows) {
    md += "| " + headers.map((h) => String(row[h] ?? "")).join(" | ") + " |\n";
  }

  return md;
}

/** Infer schema from CSV data */
export function inferCsvSchema(rows: Array<Record<string, unknown>>): CsvSchemaField[] {
  if (rows.length === 0) return [];

  const sampleSize = Math.min(100, rows.length);
  const keys = Object.keys(rows[0]!);

  return keys.map((name) => {
    const types = new Set<string>();
    let nullCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      const val = rows[i]?.[name];

      if (val == null || val === "" || val === "null" || val === "NULL") {
        nullCount++;
        continue;
      }

      if (typeof val === "number") types.add("number");
      else if (typeof val === "boolean") types.add("boolean");
      else if (/^\d{4}-\d{2}-\d{2}/.test(String(val))) types.add("date");
      else types.add("string");
    }

    // Determine dominant type
    let inferredType: CsvSchemaField["type"] = "string";
    if (types.size === 1) inferredType = types.values().next().value as CsvSchemaField["type"];
    else if (types.has("number") && !types.has("string")) inferredType = "number";
    else if (nullCount > sampleSize * 0.5) inferredType = "null";

    return {
      name,
      type: inferredType,
      required: nullCount === 0,
    };
  });
}

/** Validate CSV against a schema */
export function validateCsvAgainstSchema(
  rows: Array<Record<string, unknown>>,
  schema: CsvSchemaField[],
): Array<{ row: number; field: string; error: string }> {
  const errors: Array<{ row: number; field: string; error: string }> = [];
  const schemaMap = new Map(schema.map((f) => [f.name, f]));

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]!;

    for (const [fieldName, value] of Object.entries(row)) {
      const fieldDef = schemaMap.get(fieldName);
      if (!fieldDef) continue;

      // Required check
      if (fieldDef.required && (value == null || value === "")) {
        errors.push({ row: rowIndex, field: fieldName, error: "Required field is empty" });
        continue;
      }

      if (value == null || value === "") continue;

      // Type check
      switch (fieldDef.type) {
        case "number":
          if (isNaN(Number(value))) {
            errors.push({ row: rowIndex, field: fieldName, error: `Expected number, got "${value}"` });
          }
          break;
        case "boolean":
          if (!/^(true|false|1|0)$/i.test(String(value))) {
            errors.push({ row: rowIndex, field: fieldName, error: `Expected boolean, got "${value}"` });
          }
          break;
        case "date":
          if (isNaN(Date.parse(String(value)))) {
            errors.push({ row: rowIndex, field: fieldName, error: `Invalid date: "${value}"` });
          }
          break;
      }

      // Pattern check
      if (fieldDef.pattern && !fieldDef.pattern.test(String(value))) {
        errors.push({ row: rowIndex, field: fieldName, error: `Does not match pattern` });
      }

      // Enum check
      if (fieldDef.enum && !fieldDef.enum.includes(String(value))) {
        errors.push({
          row: rowIndex,
          field: fieldName,
          error: `Not in allowed values: ${fieldDef.enum.join(", ")}`,
        });
      }
    }
  }

  return errors;
}

/** Transform CSV rows with a mapping function */
export function transformCsv<T>(
  rows: Array<Record<string, unknown>>,
  mapper: (row: Record<string, unknown>, index: number) => T,
): T[] {
  return rows.map(mapper);
}

/** Filter CSV rows */
export function filterCsv(
  rows: Array<Record<string, unknown>>,
  predicate: (row: Record<string, unknown>) => boolean,
): Array<Record<string, unknown>> {
  return rows.filter(predicate);
}

/** Sort CSV rows by one or more fields */
export function sortCsv(
  rows: Array<Record<string, unknown>>,
  sortFields: Array<{ field: string; order: "asc" | "desc" }>,
): Array<Record<string, unknown>> {
  return [...rows].sort((a, b) => {
    for (const { field, order } of sortFields) {
      const aVal = a[field];
      const bVal = b[field];

      if (aVal == null && bVal == null) continue;
      if (aVal == null) return order === "asc" ? -1 : 1;
      if (bVal == null) return order === "asc" ? 1 : -1;

      const cmp = String(aVal).localeCompare(String(bVal));
      if (cmp !== 0) return order === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

/** Aggregate CSV data by grouping on a field */
export function aggregateCsv(
  rows: Array<Record<string, unknown>>,
  groupBy: string,
  aggregations: Record<string, "sum" | "avg" | "count" | "min" | "max" | "concat">,
): Array<Record<string, unknown>> {
  const groups = new Map<string, Array<Record<string, unknown>>>();

  for (const row of rows) {
    const key = String(row[groupBy] ?? "");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const result: Array<Record<string, unknown>> = [];

  for (const [groupKey, groupRows] of groups) {
    const aggregated: Record<string, unknown> = { [groupBy]: groupKey };

    for (const [field, operation] of Object.entries(aggregations)) {
      if (field === groupBy) continue;

      const values = groupRows.map((r) => r[field]).filter((v) => v != null);

      switch (operation) {
        case "sum":
          aggregated[field] = values.reduce((sum, v) => sum + (Number(v) || 0), 0);
          break;
        case "avg":
          aggregated[field] = values.length > 0
            ? values.reduce((sum, v) => sum + (Number(v) || 0), 0) / values.length
            : 0;
          break;
        case "count":
          aggregated[field] = values.length;
          break;
        case "min":
          aggregated[field] = values.length > 0
            ? Math.min(...values.map((v) => Number(v)))
            : null;
          break;
        case "max":
          aggregated[field] = values.length > 0
            ? Math.max(...values.map((v) => Number(v)))
            : null;
          break;
        case "concat":
          aggregated[field] = values.join("; ");
          break;
      }
    }

    result.push(aggregated);
  }

  return result;
}

/** Download CSV as file */
export function downloadCsv(content: string, filename = "data.csv"): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
