/**
 * CSV Parser: Robust CSV/TSV/delimiter parsing with streaming support,
 * header detection, type inference, quoting, escaping, comments, multiline
 * fields, schema validation, transformation pipeline, and output formatting.
 */

// --- Types ---

export type CSVDelimiter = "," | "\t" | ";" | "|" | "^";

export type CSVQuoteChar = '"' | "'" | "`";

export type LineEnding = "auto" | "\n" | "\r\n" | "\r";

export interface CSVParserOptions {
  /** Delimiter character (default: auto-detect) */
  delimiter?: CSVDelimiter | "auto";
  /** Quote character (default: ") */
  quoteChar?: CSVQuoteChar;
  /** Escape character (default: \ or double-quote) */
  escapeChar?: string;
  /** Has header row? (default: true) */
  header?: boolean;
  /** Header row index if headers are not on line 0 */
  headerRow?: number;
  /** Skip empty lines? (default: true) */
  skipEmptyLines?: boolean;
  /** Skip comment lines starting with this prefix */
  commentPrefix?: string;
  /** Maximum number of rows to parse (0 = unlimited) */
  maxRows?: number;
  /** Type inference for columns */
  inferTypes?: boolean;
  /** Trim whitespace around fields */
  trimFields?: boolean;
  /** Line ending style */
  lineEnding?: LineEncoding;
  /** Encoding for Blob/File input */
  encoding?: string;
  /** Callback for each parsed row (streaming) */
  onRow?: (row: Record<string, unknown>, index: number) => void;
  /** Callback for progress (rows processed / total estimated) */
  onProgress?: (processed: number, total: number) => void;
  /** Schema for validation */
  schema?: CSVSchema;
  /** Transform function applied to each row */
  transform?: (row: Record<string, unknown>) => Record<string, unknown>;
  /** Skip N rows from the beginning */
  skipRows?: number;
  /** Take only N rows */
  takeRows?: number;
}

export interface CSVSchema {
  columns: CSVColumnSchema[];
}

export interface CSVColumnSchema {
  name: string;
  type?: "string" | "number" | "boolean" | "date" | "any";
  required?: boolean;
  defaultValue?: unknown;
  validate?: (value: unknown) => boolean | string;
  transform?: (value: unknown) => unknown;
}

export interface CSVRow {
  [column: string]: unknown;
}

export interface CSVResult {
  /** Parsed rows as array of objects */
  data: CSVRow[];
  /** Detected or provided headers */
  headers: string[];
  /** Total rows parsed (excluding header) */
  rowCount: number;
  /** Errors encountered during parsing */
  errors: ParseError[];
  /** Metadata about the parse operation */
  meta: CSVMeta;
}

export interface ParseError {
  row: number;
  column: string | number;
  value: string;
  message: string;
  type: "quote" | "delimiter" | "type" | "required" | "schema" | "length";
}

export interface CSVMeta {
  delimiter: string;
  quoteChar: string;
  lineEnding: string;
  hasBOM: boolean;
  fields: FieldMeta[];
  aborted: boolean;
}

export interface FieldMeta {
  name: string;
  index: number;
  type: string;
  nullable: boolean;
  uniqueCount: number;
}

export interface CSVWriterOptions {
  /** Delimiter character */
  delimiter?: CSVDelimiter;
  /** Quote character */
  quoteChar?: CSVQuoteChar;
  /** Always quote all fields? */
  quoteAll?: boolean;
  /** Include header row? */
  header?: boolean;
  /** Line ending */
  lineEnding?: LineEncoding;
  /** Quote fields containing these characters */
  quoteColumns?: boolean;
  /** Transform values before writing */
  transform?: (value: unknown, field: string) => string;
}

// --- Constants ---

const DEFAULT_DELIMITERS: CSVDelimiter[] = [",", "\t", ";", "|", "^"];

type LineEncoding = "\n" | "\r\n" | "\r";

// --- Detection ---

/** Detect delimiter from content. */
function detectDelimiter(content: string): CSVDelimiter {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return ",";

  const firstLine = lines[0]!;
  const counts: Record<string, number> = {};

  for (const delim of DEFAULT_DELIMITERS) {
    counts[delim] = (firstLine.match(new RegExp(escapeRegex(delim), "g")))?.length ?? 0;
  }

  // Pick the delimiter with highest count (that's not 0)
  let best = ",";
  let bestCount = 0;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      best = delim as CSVDelimiter;
    }
  }

  return best as CSVDelimiter;
}

/** Detect line ending style. */
function detectLineEnding(content: string): LineEncoding {
  const crlf = (content.match(/\r\n/g) ?? []).length;
  const cr = (content.match/(?<!\n)\r(?!\n)/g)?.length ?? 0;
  const lf = (content.match(/(?<!\r)\n/g) ?? []).length;

  if (crlf >= cr && crlf >= lf) return "\r\n";
  if (cr >= lf) return "\r";
  return "\n";
}

/** Detect BOM marker. */
function stripBOM(content: string): { content: string; hasBOM: boolean } {
  if (content.charCodeAt(0) === 0xFEFF) {
    return { content: content.slice(1), hasBOM: true };
  }
  return { content, hasBOM: false };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- Type Inference ---

function inferType(values: string[]): "string" | "number" | "boolean" | "date" | "null" {
  const nonEmpty = values.filter((v) => v.trim() !== "");
  if (nonEmpty.length === 0) return "null";

  // Check boolean
  const lowerValues = nonEmpty.map((v) => v.toLowerCase().trim());
  if (lowerValues.every((v) => ["true", "false", "t", "f", "yes", "no", "1", "0"].includes(v))) {
    return "boolean";
  }

  // Check number
  if (nonEmpty.every((v) => /^-?\d*\.?\d+$/.test(v.trim()) || v.trim() === "")) {
    return "number";
  }

  // Check date (ISO format)
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/,
    /^\d{2}\/\d{2}\/\d{4}/,
    /^\d{2}-\d{2}-\d{4}/,
  ];
  if (nonEmpty.some((v) => datePatterns.some((p) => p.test(v.trim())))) {
    // Verify most values are dates
    const dateCount = nonEmpty.filter((v) =>
      datePatterns.some((p) => p.test(v.trim())),
    ).length;
    if (dateCount > nonEmpty.length * 0.5) return "date";
  }

  return "string";
}

function convertValue(value: string, type: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "NULL") return null;

  switch (type) {
    case "number":
      const num = Number(trimmed);
      return isNaN(num) ? value : num;
    case "boolean":
      if (["true", "t", "yes", "1"].includes(trimmed.toLowerCase())) return true;
      if (["false", "f", "no", "0"].includes(trimmed.toLowerCase())) return false;
      return value;
    case "date":
      const d = new Date(trimmed);
      return isNaN(d.getTime()) ? value : d;
    default:
      return value;
  }
}

// --- Core Parser ---

export class CSVParser {
  private options: Required<CSVParserOptions> & { delimiter: CSVDelimiter; quoteChar: CSVQuoteChar };

  constructor(options: CSVParserOptions = {}) {
    this.options = {
      delimiter: ",",
      quoteChar: '"',
      escapeChar: '"',
      header: true,
      headerRow: 0,
      skipEmptyLines: true,
      commentPrefix: "#",
      maxRows: 0,
      inferTypes: true,
      trimFields: true,
      lineEnding: "\n",
      encoding: "utf-8",
      skipRows: 0,
      takeRows: 0,
      ...options,
    };
  }

  /** Parse a CSV string. */
  parse(content: string): CSVResult {
    const errors: ParseError[] = [];

    // Strip BOM
    const bomResult = stripBOM(content);
    let csvContent = bomResult.content;

    // Detect settings
    if (this.options.delimiter === "auto") {
      this.options.delimiter = detectDelimiter(csvContent);
    }
    const lineEnding = detectLineEnding(csvContent);

    // Normalize line endings
    csvContent = csvContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Split into raw lines
    const rawLines = csvContent.split("\n");

    // Determine header row
    const headerRowIndex = this.options.headerRow ?? 0;
    let dataStartIndex = headerRowIndex + 1;

    // Apply skipRows
    if (this.options.skipRows > 0) {
      dataStartIndex += this.options.skipRows;
    }

    // Parse header
    let headers: string[] = [];
    if (this.options.header) {
      if (headerRowIndex < rawLines.length) {
        headers = this.parseLine(rawLines[headerRowIndex]!);
        if (this.options.trimFields) {
          headers = headers.map((h) => h.trim());
        }
      }
    }

    // Parse data rows
    const data: CSVRow[] = [];
    let rowIndex = 0;
    let totalLines = rawLines.length;

    for (let i = dataStartIndex; i < rawLines.length; i++) {
      const line = rawLines[i]!;

      // Skip empty lines
      if (this.options.skipEmptyLines && line.trim() === "") continue;

      // Skip comments
      if (this.options.commentPrefix && line.trim().startsWith(this.options.commentPrefix)) continue;

      // Check max rows
      if (this.options.maxRows > 0 && rowIndex >= this.options.maxRows) break;

      // Take limit
      if (this.options.takeRows > 0 && rowIndex >= this.options.takeRows) break;

      // Parse the row
      const fields = this.parseLine(line);
      if (this.options.trimFields) {
        for (let f = 0; f < fields.length; f++) {
          fields[f] = fields[f]!.trim();
        }
      }

      // Build row object
      const row: CSVRow = {};

      if (headers.length > 0) {
        for (let j = 0; j < Math.max(headers.length, fields.length); j++) {
          const key = headers[j] ?? `col_${j}`;
          const value = j < fields.length ? fields[j]! : "";

          // Type inference
          if (this.options.inferTypes) {
            row[key] = convertValue(value, inferType([value]));
          } else {
            row[key] = value;
          }
        }
      } else {
        // No headers — use column indices
        for (let j = 0; j < fields.length; j++) {
          row[`col_${j}`] = this.options.inferTypes
            ? convertValue(fields[j]!, inferType([fields[j]!]))
            : fields[j]!;
        }
      }

      // Validate against schema
      if (this.options.schema) {
        this.validateRow(row, rowIndex, errors);
      }

      // Transform
      if (this.options.transform) {
        try {
          Object.assign(row, this.options.transform(row));
        } catch {}
      }

      data.push(row);

      // Streaming callback
      this.options.onRow?.(row, rowIndex);
      rowIndex++;

      // Progress callback
      this.options.onProgress?.(rowIndex, totalLines);
    }

    // Build field metadata
    const fields: FieldMeta[] = headers.map((name, idx) => {
      const colValues = data.map((r) => r[name]).filter((v) => v != null) as string[];
      return {
        name,
        index: idx,
        type: inferType(colValues),
        nullable: colValues.length < data.length,
        uniqueCount: new Set(colValues).size,
      };
    });

    return {
      data,
      headers,
      rowCount: data.length,
      errors,
      meta: {
        delimiter: this.options.delimiter,
        quoteChar: this.options.quoteChar,
        lineEnding,
        hasBOM: bomResult.hasBOM,
        fields,
        aborted: false,
      },
    };
  }

  /** Parse a CSV file (File/Blob). */
  async parseFile(file: File | Blob): Promise<CSVResult> {
    const text = await file.text();
    return this.parse(text);
  }

  /** Parse streaming via ReadableStream (for large files). */
  async parseStream(stream: ReadableStream<Uint8Array>): Promise<CSVResult> {
    const reader = stream.getReader();
    const decoder = new TextDecoder(this.options.encoding);
    let content = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      content += decoder.decode(value, { stream: true });
    }
    content += decoder.decode(); // Flush

    return this.parse(content);
  }

  /** Parse a single CSV line respecting quotes and escapes. */
  parseLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    const qc = this.options.quoteChar;
    const ec = this.options.escapeChar;
    const delim = this.options.delimiter;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;

      if (inQuotes) {
        if (ch === ec) {
          // Escape char — check next char
          if (i + 1 < line.length && line[i + 1] === qc) {
            current += qc;
            i++; // Skip escaped quote
          } else if (ec === qc) {
            // Double-quote escape
            current += qc;
            i++;
          } else {
            current += ch;
          }
        } else if (ch === qc) {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === qc) {
          inQuotes = true;
        } else if (ch === delim) {
          fields.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
    }

    fields.push(current); // Last field
    return fields;
  }

  // --- Validation ---

  private validateRow(row: CSVRow, rowIndex: number, errors: ParseError[]): void {
    if (!this.options.schema) return;

    for (const col of this.options.schema.columns) {
      const value = row[col.name];

      // Required check
      if (col.required && (value === undefined || value === null || value === "")) {
        errors.push({
          row: rowIndex,
          column: col.name,
          value: String(value ?? ""),
          message: `Required field "${col.name}" is missing`,
          type: "required",
        });
        continue;
      }

      // Type check
      if (col.type && col.type !== "any" && value !== null && value !== undefined) {
        const expectedType = col.type;
        const actualType = typeof value;
        if (expectedType === "number" && actualType !== "number") {
          errors.push({
            row: rowIndex,
            column: col.name,
            value: String(value),
            message: `Expected ${expectedType}, got ${actualType}`,
            type: "type",
          });
        }
      }

      // Custom validation
      if (col.validate && value !== undefined && value !== null) {
        const result = col.validate(value);
        if (result !== true) {
          errors.push({
            row: rowIndex,
            column: col.name,
            value: String(value),
            message: typeof result === "string" ? result : `Validation failed for "${col.name}"`,
            type: "schema",
          });
        }
      }

      // Apply column transform
      if (col.transform && value !== undefined) {
        try {
          row[col.name] = col.transform(value);
        } catch {}
      }

      // Apply default value
      if (value === undefined || value === null || value === "") {
        if (col.defaultValue !== undefined) {
          row[col.name] = col.defaultValue;
        }
      }
    }
  }
}

// --- Writer ---

export class CSVWriter {
  private options: Required<CSVWriterOptions>;

  constructor(options: CSVWriterOptions = {}) {
    this.options = {
      delimiter: ",",
      quoteChar: '"',
      quoteAll: false,
      header: true,
      lineEnding: "\n",
      quoteColumns: true,
      ...options,
    };
  }

  /** Write data rows to CSV string. */
  write(data: CSVRow[], headers?: string[]): string {
    const lines: string[] = [];
    const effectiveHeaders = headers ?? (data.length > 0 ? Object.keys(data[0]!) : []);

    // Header row
    if (this.options.header && effectiveHeaders.length > 0) {
      lines.push(effectiveHeaders.map((h) => this.formatField(h)).join(this.options.delimiter));
    }

    // Data rows
    for (const row of data) {
      const fields: string[] = [];
      for (const header of effectiveHeaders) {
        let value = row[header];

        // Transform
        if (this.options.transform) {
          value = this.options.transform(value, header);
        }

        fields.push(this.formatField(String(value ?? "")));
      }
      lines.push(fields.join(this.options.delimiter));
    }

    return lines.join(this.options.lineEnding);
  }

  /** Write to downloadable Blob. */
  toBlob(data: CSVRow[], headers?: string[], mimeType = "text/csv"): Blob {
    const content = this.write(data, headers);
    return new Blob([content], { type: `${mimeType};charset=utf-8` });
  }

  /** Trigger file download in browser. */
  download(data: CSVRow[], filename = "data.csv", headers?: string[]): void {
    const blob = this.toBlob(data, headers);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Append a row to existing CSV content. */
  appendRow(existingCSV: string, row: CSVRow): string {
    const headers = this.extractHeaders(existingCSV);
    const fields: string[] = [];
    for (const h of headers) {
      fields.push(this.formatField(String(row[h] ?? "")));
    }
    return existingCSV + this.options.lineEnding + fields.join(this.options.delimiter);
  }

  private formatField(value: string): string {
    const qc = this.options.quoteChar;
    const delim = this.options.delimiter;
    const le = this.options.lineEnding;

    const needsQuoting =
      this.options.quoteAll ||
      value.includes(qc) ||
      value.includes(delim) ||
      value.includes(le) ||
      value.includes("\n") ||
      value.includes("\r");

    if (!needsQuoting) return value;

    // Escape internal quotes
    const escaped = value.replaceAll(qc, qc + qc);
    return `${qc}${escaped}${qc}`;
  }

  private extractHeaders(csv: string): string[] {
    const firstLine = csv.split(/\r?\n/)[0] ?? "";
    if (firstLine.trim() === "") return [];
    const parser = new CSVParser({ delimiter: this.options.delimiter, quoteChar: this.options.quoteChar });
    return parser.parseLine(firstLine);
  }
}

// --- Convenience Functions ---

/** Quick-parse a CSV string. */
export function parseCSV(content: string, options?: CSVParserOptions): CSVResult {
  const parser = new CSVParser(options);
  return parser.parse(content);
}

/** Quick-write data to CSV string. */
export function writeCSV(data: CSVRow[], options?: CSVWriterOptions): string {
  const writer = new CSVWriter(options);
  return writer.write(data);
}

/** Convert CSV to JSON array. */
export function csvToJson(content: string, options?: CSVParserOptions): unknown[] {
  const result = parseCSV(content, options);
  return result.data;
}

/** Convert JSON array to CSV string. */
export function jsonToCsv(data: Record<string, unknown>[], options?: CSVWriterOptions): string {
  const writer = new CSVWriter(options);
  return writer.write(data as CSVRow[]);
}

/** Merge two CSV files by a common key column. */
export function mergeCSV(
  left: CSVResult,
  right: CSVResult,
  leftKey: string,
  rightKey: string,
  joinType: "inner" | "left" | "right" | "outer" = "inner",
): CSVResult {
  const rightMap = new Map<string, CSVRow>();
  for (const row of right.data) {
    const key = String(row[rightKey] ?? "");
    rightMap.set(key, row);
  }

  const mergedData: CSVRow[] = [];
  const mergedHeaders = [...new Set([...left.headers, ...right.headers.filter((h) => h !== rightKey)])];
  const errors: ParseError[] = [...left.errors, ...right.errors];

  for (const leftRow of left.data) {
    const lk = String(leftRow[leftKey] ?? "");
    const rightRow = rightMap.get(lk);

    if (joinType === "inner" && !rightRow) continue;

    const merged: CSVRow = { ...leftRow };
    if (rightRow) {
      for (const [k, v] of Object.entries(rightRow)) {
        if (k !== rightKey) {
          merged[k] = v;
        }
      }
    }

    mergedData.push(merged);
  }

  // Right/outer join: add unmatched right rows
  if (joinType === "right" || joinType === "outer") {
    const leftKeys = new Set(left.data.map((r) => String(r[leftKey] ?? "")));
    for (const [rk, rv] of rightMap) {
      if (!leftKeys.has(rk)) {
        const merged: CSVRow = {};
        for (const h of left.headers) {
          merged[h] = null;
        }
        for (const [k, v] of Object.entries(rv)) {
          if (k !== rightKey) merged[k] = v;
        }
        mergedData.push(merged);
      }
    }
  }

  return {
    data: mergedData,
    headers: mergedHeaders,
    rowCount: mergedData.length,
    errors,
    meta: { ...left.meta, fields: [] },
  };
}
