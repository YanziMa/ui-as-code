/**
 * CSV export/import utilities: generate CSV from data, parse CSV to objects,
 * streaming for large datasets, Excel-compatible output, encoding handling.
 */

export interface CsvOptions {
  delimiter?: string;       // Default: ","
  quoteChar?: string;       // Default: '"'
  escapeChar?: string;      // Default: '"'
  header?: boolean;         // Include header row (default: true)
  bom?: boolean;            // Prepend BOM for Excel (default: false)
  lineEnding?: "\r\n" | "\n" | "\r";
  nullValue?: string;       // How to represent null/undefined
  dateFormat?: string;      // Date format string
  columns?: Array<{ key: string; header?: string; transform?: (v: unknown) => unknown }>;
}

export interface ParseOptions {
  delimiter?: string;
  quoteChar?: string;
  escapeChar?: string;
  header?: boolean;
  skipEmptyLines?: boolean;
  trimValues?: boolean;
  commentChar?: string;     // Lines starting with this are comments
  maxRows?: number;         // Limit rows parsed
  /** Type coercion */
  types?: Record<string, "string" | "number" | "boolean" | "date">;
}

// --- Export ---

/** Convert array of objects to CSV string */
export function toCsv<T extends Record<string, unknown>>(
  data: T[],
  options: CsvOptions = {},
): string {
  const {
    delimiter = ",",
    quoteChar = '"',
    escapeChar = '"',
    header = true,
    bom = false,
    lineEnding = "\r\n",
    nullValue = "",
    columns,
  } = options;

  if (data.length === 0) return "";

  // Determine columns
  const cols = columns ?? autoDetectColumns(data);
  const keys = cols.map((c) => c.key);

  const lines: string[] = [];

  // BOM for Excel compatibility
  if (bom) lines.push("\uFEFF");

  // Header row
  if (header) {
    lines.push(cols.map((c) => c.header ?? c.key).map((h) => escapeCsvField(String(h), delimiter, quoteChar, escapeChar)).join(delimiter));
  }

  // Data rows
  for (const row of data) {
    const values = keys.map((key) => {
      let value = row[key];

      // Apply column transform
      const colDef = cols.find((c) => c.key === key);
      if (colDef?.transform) value = colDef.transform(value);

      // Handle special values
      if (value === null || value === undefined) return nullValue;
      if (value instanceof Date) return escapeCsvField(value.toISOString(), delimiter, quoteChar, escapeChar);
      if (typeof value === "object") return escapeCsvField(JSON.stringify(value), delimiter, quoteChar, escapeChar);

      return escapeCsvField(String(value), delimiter, quoteChar, escapeChar);
    });
    lines.push(values.join(delimiter));
  }

  return lines.join(lineEnding);
}

function escapeCsvField(value: string, delimiter: string, quoteChar: string, escapeChar: string): string {
  if (value.includes(delimiter) || value.includes(quoteChar) || value.includes("\n") || value.includes("\r")) {
    return `${quoteChar}${value.replace(new RegExp(quoteChar, "g"), escapeChar + quoteChar)}${quoteChar}`;
  }
  return value;
}

function autoDetectColumns<T extends Record<string, unknown>>(data: T[]): Array<{ key: string; header?: string }> {
  const keys = new Set<string>();
  for (const row of data) {
    for (const key of Object.keys(row)) keys.add(key);
  }
  return Array.from(keys).map((key) => ({ key }));
}

/** Download data as CSV file */
export function downloadCsv<T extends Record<string, unknown>>(
  data: T[],
  filename = "data.csv",
  options?: CsvOptions & { encoding?: "utf-8" | "gbk" },
): void {
  const csv = toCsv(data, options);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/** Copy CSV to clipboard */
export async function copyCsvToClipboard<T extends Record<string, unknown>>(
  data: T[],
  options?: CsvOptions,
): Promise<void> {
  const csv = toCsv(data, options);
  await navigator.clipboard.writeText(csv);
}

// --- Import / Parse ---

export interface ParsedCsv<T extends Record<string, string> = Record<string, string>> {
  data: T[];
  headers: string[];
  errors: Array<{ row: number; column: string; message: string }>;
  meta: { totalRows: number; parsedRows: number; skippedRows: number };
}

/** Parse CSV string to array of objects */
export function parseCsv<T extends Record<string, unknown> = Record<string, unknown>>(
  csvString: string,
  options: ParseOptions = {},
): ParsedCsv<T> {
  const {
    delimiter = ",",
    quoteChar = '"',
    escapeChar = '"',
    header = true,
    skipEmptyLines = true,
    trimValues = true,
    commentChar,
    maxRows,
    types,
  } = options;

  const errors: ParsedCsv["errors"] = [];
  let skippedRows = 0;

  // Normalize line endings
  const normalized = csvString.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n");

  // Strip BOM
  if (rawLines[0]?.startsWith("\uFEFF")) rawLines[0] = rawLines[0]!.slice(1);

  // Filter comments and empty lines
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length && (!maxRows || lines.length < (maxRows ?? Infinity)); i++) {
    const line = rawLines[i]!;
    if (commentChar && line.trimStart().startsWith(commentChar)) continue;
    if (skipEmptyLines && !line.trim()) { skippedRows++; continue; }
    lines.push(line);
  }

  if (lines.length === 0) return { data: [], headers: [], errors, meta: { totalRows: rawLines.length, parsedRows: 0, skippedRows } };

  // Parse header
  const headerRow = parseLine(lines[0]!, delimiter, quoteChar, escapeChar);
  const headers = trimValues ? headerRow.map((h) => h.trim()) : headerRow;

  // Parse data rows
  const startIdx = header ? 1 : 0;
  const dataRows: T[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const values = parseLine(lines[i]!, delimiter, quoteChar, escapeChar);
    if (trimValues) for (let j = 0; j < values.length; j++) values[j] = values[j]!.trim();

    const row = {} as T;

    for (let j = 0; j < headers.length; j++) {
      let value: unknown = values[j] ?? "";
      const fieldName = headers[j]!;

      // Type coercion
      const targetType = types?.[fieldName];
      if (targetType) {
        value = coerceType(String(value), targetType);
        if (value === null && String(values[j]) !== "") {
          errors.push({ row: i - startIdx + 1, column: fieldName, message: `Failed to convert "${values[j]}" to ${targetType}` });
        }
      }

      (row as Record<string, unknown>)[fieldName] = value;
    }

    dataRows.push(row);
  }

  return {
    data: dataRows,
    headers,
    errors,
    meta: {
      totalRows: rawLines.length,
      parsedRows: dataRows.length,
      skippedRows: skippedRows + (header ? 0 : 0),
    },
  };
}

/** Parse a single CSV line respecting quotes */
function parseLine(line: string, delimiter: string, quoteChar: string, escapeChar: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i]!;

    if (inQuotes) {
      if (char === escapeChar && line[i + 1] === quoteChar) {
        current += quoteChar;
        i += 2;
        continue;
      }
      if (char === quoteChar) {
        inQuotes = false;
        i++;
        continue;
      }
      current += char;
    } else {
      if (char === quoteChar) {
        inQuotes = true;
        i++;
        continue;
      }
      if (char === delimiter) {
        fields.push(current);
        current = "";
        i++;
        continue;
      }
      current += char;
    }
    i++;
  }

  fields.push(current);
  return fields;
}

function coerceType(value: string, type: string): unknown {
  switch (type) {
    case "number": {
      const n = Number(value);
      return isNaN(n) ? null : n;
    }
    case "boolean":
      return value.toLowerCase() === "true" || value === "1" || value.toLowerCase() === "yes";
    case "date": {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    default:
      return value;
  }
}

// --- Streaming Parser (for large files) ---

export interface StreamParseOptions extends ParseOptions {
  chunkSize?: number;     // Rows per chunk (default: 1000)
  onChunk?: (rows: Array<Record<string, unknown>>, chunkIndex: number) => void;
  onComplete?: (result: ParsedCsv) => void;
  onError?: (error: Error) => void;
}

/** Parse large CSV files in chunks using streaming */
export async function streamParseCsv(
  file: File | Blob,
  options: StreamParseOptions = {},
): Promise<ParsedCsv> {
  const { chunkSize = 1000, onChunk, onComplete, onError, ...parseOpts } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        const allLines = normalized.split("\n");

        // Strip BOM
        if (allLines[0]?.startsWith("\uFEFF")) allLines[0] = allLines[0]!.slice(1);

        const headerLine = allLines[0] ?? "";
        const headers = parseLine(headerLine, parseOpts.delimiter ?? ",", parseOpts.quoteChar ?? '"', parseOpts.escapeChar ?? '"');
        const allData: Array<Record<string, unknown>> = [];
        let chunkIndex = 0;

        for (let i = 1; i < allLines.length; i += chunkSize) {
          const chunkLines = allLines.slice(i, Math.min(i + chunkSize, allLines.length));
          const chunkRows: Array<Record<string, unknown>> = [];

          for (const line of chunkLines) {
            if (!line.trim() && parseOpts.skipEmptyLines !== false) continue;
            const values = parseLine(line, parseOpts.delimiter ?? ",", parseOpts.quoteChar ?? '"', parseOpts.escapeChar ?? '"');
            const row: Record<string, unknown> = {};
            for (let j = 0; j < headers.length; j++) {
              row[headers[j]!] = values[j] ?? "";
            }
            chunkRows.push(row);
          }

          allData.push(...chunkRows);
          onChunk?.(chunkRows, chunkIndex++);
        }

        const result: ParsedCsv = {
          data: allData as never,
          headers,
          errors: [],
          meta: { totalRows: allLines.length, parsedRows: allData.length, skippedRows: 0 },
        };

        onComplete?.(result);
        resolve(result);
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// --- Template-based generation ---

/** Generate CSV from a template with placeholder substitution */
export function templateCsv(
  template: string,
  data: Array<Record<string, unknown>>,
  options: Omit<CsvOptions, "columns"> & { variables?: Record<string, (row: Record<string, unknown>) => unknown> } = {},
): string {
  const { variables, ...csvOptions } = options;

  // Extract headers from template's first non-empty line
  const templateLines = template.split("\n").filter(Boolean);
  if (templateLines.length === 0) return "";

  // Replace {{variable}} placeholders in each data row
  const processedData = data.map((row) => {
    const processed: Record<string, unknown> = {};
    if (variables) {
      for (const [key, fn] of Object.entries(variables)) {
        processed[key] = fn(row);
      }
    }
    return { ...row, ...processed };
  });

  return toCsv(processedData, csvOptions);
}

// --- Validation ---

/** Validate that a string is valid CSV format */
export function isValidCsvFormat(content: string): boolean {
  try {
    const result = parseCsv(content, { maxRows: 10 });
    return result.errors.length === 0 && result.data.length > 0;
  } catch {
    return false;
  }
}

/** Get CSV statistics (column count, row count, estimated size) */
export function getCsvStats(content: string): {
  rowCount: number;
  columnCount: number;
  hasHeader: boolean;
  sizeBytes: number;
} {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  const firstLine = lines[0];
  const colCount = firstLine ? parseLine(firstLine, ",", '"', '"').length : 0;

  return {
    rowCount: lines.length - (lines.length > 1 ? 1 : 0), // Exclude header
    columnCount: colCount,
    hasHeader: lines.length > 1,
    sizeBytes: new Blob([content]).size,
  };
}
