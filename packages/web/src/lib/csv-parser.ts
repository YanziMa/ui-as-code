/**
 * Advanced CSV Parser: Streaming/batch CSV parsing with type inference, schema
 * validation, header detection, quoting/escaping support, delimiter auto-detection,
 * large file handling, transform pipelines, and error recovery.
 */

// --- Types ---

export type CsvFieldType = "string" | "number" | "boolean" | "date" | "null" | "unknown";

export interface CsvField {
  name: string;
  index: number;
  type: CsvFieldType;
  nullable: boolean;
  examples?: unknown[];
}

export interface CsvRow {
  [key: string]: unknown;
  _lineNumber?: number;
  _raw?: string;
}

export interface CsvSchema {
  fields: CsvField[];
  delimiter: string;
  hasHeader: boolean;
  lineCount: number;
  encoding: string;
}

export interface ParseOptions {
  /** Field delimiter (default: auto-detect or ",") */
  delimiter?: string | null; // null = auto-detect
  /** Whether first row is headers (default: true) */
  header?: boolean;
  /** Custom header names (overrides first row) */
  columns?: string[];
  /** Quote character (default: '"') */
  quoteChar?: string;
  /** Escape character (default: '"') */
  escapeChar?: string;
  /** Skip empty lines (default: true) */
  skipEmptyLines?: boolean;
  /** Skip lines starting with this prefix (e.g., "#") */
  commentPrefix?: string | null;
  /** Max number of rows to parse (0 = unlimited) */
  maxRows?: number;
  /** Trim whitespace around values (default: true) */
  trimValues?: boolean;
  /** Infer types from data (default: true) */
  inferTypes?: boolean;
  /** Cast parsed values to inferred types (default: true) */
  castValues?: boolean;
  /** Strict mode: throw on malformed rows instead of skipping */
  strict?: boolean;
  /** Encoding for text decoding (default: "utf-8") */
  encoding?: string;
  /** Callback for each parsed row (streaming) */
  onRow?: (row: CsvRow, index: number) => void;
  /** Callback for progress updates */
  onProgress?: (parsed: number, total: number) => void;
  /** Transform function applied to each row before returning */
  transform?: (row: CsvRow) => CsvRow | null;
}

export interface ParseResult {
  data: CsvRow[];
  schema: CsvSchema;
  errors: ParseError[];
  warnings: string[];
  stats: {
    totalLines: number;
    dataRows: number;
    headerRows: number;
    skippedLines: number;
    errorLines: number;
    parseTimeMs: number;
  };
}

export interface ParseError {
  line: number;
  column: number;
  message: string;
  rawLine?: string;
  row?: CsvRow;
}

export interface TypeInferenceOptions {
  sampleSize?: number;     // Number of rows to sample (default: 100)
  dateFormats?: string[];  // Date format patterns to try
  nullValues?: string[];   // Strings treated as null
  booleanTrue?: string[];  // Strings treated as true
  booleanFalse?: string[]; // Strings treated as false
  numberLocale?: string;   // Locale for number parsing
}

// --- Constants ---

const DEFAULT_NULL_VALUES = ["", "null", "NULL", "nil", "NIL", "none", "NONE", "NA", "N/A", "-", "--", "\u2014"];
const DEFAULT_BOOL_TRUE = ["true", "TRUE", "yes", "YES", "1", "y", "Y", "t", "T"];
const DEFAULT_BOOL_FALSE = ["false", "FALSE", "no", "NO", "0", "n", "N", "f", "F"];

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,                          // ISO date
  /^\d{2}\/\d{2}\/\d{4}$/,                        // US date
  /^\d{4}\/\d{2}\/\d{2}$/,                        // ISO slash date
  /^\d{2}-\d{2}-\d{4}$/,                          // EU date
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?/,   // ISO datetime
  /^\d{2}\/\d{2}\/\d{2}$/,                        // Short date
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i, // "Month DD, YYYY"
];

// --- Delimiter Detection ---

/** Auto-detect the most likely delimiter from the first few lines */
function detectDelimiter(text: string): string {
  const candidates = [",", ";", "\t", "|", "^"];
  const firstLines = text.split("\n").slice(0, 10);
  let bestDelimiter = ",";
  let bestScore = -1;

  for (const delim of candidates) {
    let score = 0;
    let fieldCounts: number[] = [];

    for (const line of firstLines) {
      if (line.trim() === "" || line.trim().startsWith("#")) continue;
      const count = splitCsvLine(line, delim).length;
      fieldCounts.push(count);
    }

    if (fieldCounts.length === 0) continue;

    // Score based on consistency and having multiple fields
    const avgCount = fieldCounts.reduce((a, b) => a + b, 0) / fieldCounts.length;
    const consistency = fieldCounts.every((c) => c === fieldCounts[0]) ? 1 : 0.5;
    score = avgCount * consistency + (avgCount > 1 ? 2 : 0);

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

// --- Core Parsing ---

/** Split a single CSV line into fields respecting quotes */
function splitCsvLine(line: string, delimiter: string, quoteChar = '"', escapeChar = '"'): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i]!;

    if (inQuotes) {
      if (ch === escapeChar && i + 1 < line.length && line[i + 1] === quoteChar) {
        current += quoteChar;
        i += 2;
      } else if (ch === quoteChar) {
        inQuotes = false;
        i++;
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === quoteChar) {
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        fields.push(current);
        current = "";
        i++;
      } else if (ch === "\r") {
        i++; // skip CR
      } else {
        current += ch;
        i++;
      }
    }
  }

  fields.push(current);
  return fields;
}

/** Parse CSV text into structured result */
export function parseCsv(source: string, options: ParseOptions = {}): ParseResult {
  const startTime = performance.now();
  const opts: Required<Omit<ParseOptions, "onRow" | "onProgress" | "transform" | "delimiter">> & Pick<ParseOptions, "onRow" | "onProgress" | "transform" | "delimiter"> = {
    delimiter: options.delimiter ?? null,
    header: options.header ?? true,
    columns: options.columns ?? [],
    quoteChar: options.quoteChar ?? '"',
    escapeChar: options.escapeChar ?? '"',
    skipEmptyLines: options.skipEmptyLines ?? true,
    commentPrefix: options.commentPrefix,
    maxRows: options.maxRows ?? 0,
    trimValues: options.trimValues ?? true,
    inferTypes: options.inferTypes ?? true,
    castValues: options.castValues ?? true,
    strict: options.strict ?? false,
    encoding: options.encoding ?? "utf-8",
    onRow: options.onRow,
    onProgress: options.onProgress,
    transform: options.transform,
  };

  const errors: ParseError[] = [];
  const warnings: string[] = [];
  const data: CsvRow[] = [];
  const rawLines = source.split(/\r?\n/);

  // Detect delimiter
  const delimiter = opts.delimiter ?? detectDelimiter(source);

  // Determine headers
  let headers: string[] = [];
  let dataStartIndex = 0;

  if (opts.header) {
    // Find first non-empty, non-comment line as header
    while (dataStartIndex < rawLines.length) {
      const line = rawLines[dataStartIndex]!;
      if (opts.skipEmptyLines && line.trim() === "") { dataStartIndex++; continue; }
      if (opts.commentPrefix && line.trim().startsWith(opts.commentPrefix)) { dataStartIndex++; continue; }
      break;
    }

    if (dataStartIndex < rawLines.length) {
      const headerFields = splitCsvLine(rawLines[dataStartIndex]!, delimiter, opts.quoteChar, opts.escapeChar);
      headers = opts.columns.length > 0
        ? opts.columns
        : headerFields.map((h) => (opts.trimValues ? h.trim() : h));
      dataStartIndex++;
    }
  } else {
    // No header — generate column names
    if (rawLines.length > 0) {
      const firstFields = splitCsvLine(rawLines[0]!, delimiter, opts.quoteChar, opts.escapeChar);
      headers = firstFields.map((_, i) => `col_${i + 1}`);
    }
  }

  // Normalize header names (deduplicate)
  headers = deduplicateHeaders(headers);

  // Parse data rows
  let dataRowCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const totalDataLines = rawLines.length - dataStartIndex;

  for (let lineIdx = dataStartIndex; lineIdx < rawLines.length; lineIdx++) {
    const rawLine = rawLines[lineIdx]!;

    // Skip empty lines
    if (opts.skipEmptyLines && rawLine.trim() === "") { skippedCount++; continue; }

    // Skip comments
    if (opts.commentPrefix && rawLine.trim().startsWith(opts.commentPrefix)) { skippedCount++; continue; }

    // Max rows check
    if (opts.maxRows > 0 && dataRowCount >= opts.maxRows) {
      warnings.push(`Stopped at maxRows (${opts.maxRows})`);
      break;
    }

    // Progress callback
    opts.onProgress?.(dataRowCount, totalDataLines);

    try {
      const fields = splitCsvLine(rawLine, delimiter, opts.quoteChar, opts.escapeChar);

      // Build row object
      const row: CsvRow = { _lineNumber: lineIdx + 1, _raw: rawLine };
      for (let i = 0; i < headers.length; i++) {
        let value: unknown = fields[i] ?? "";
        if (opts.trimValues && typeof value === "string") value = value.trim();
        row[headers[i]!] = value;
      }

      // Handle extra fields beyond headers
      for (let i = headers.length; i < fields.length; i++) {
        row[`_extra_${i}`] = opts.trimValues ? fields[i]!.trim() : fields[i];
      }

      // Apply transform
      const transformed = opts.transform ? opts.transform(row) : row;
      if (transformed === null) { skippedCount++; continue; }

      data.push(transformed);
      opts.onRow?.(transformed, dataRowCount);
      dataRowCount++;
    } catch (err) {
      errorCount++;
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push({
        line: lineIdx + 1,
        column: 0,
        message: errorMsg,
        rawLine,
      });
      if (opts.strict) throw new Error(`CSV parse error at line ${lineIdx + 1}: ${errorMsg}`);
    }
  }

  // Infer schema
  const schema = inferSchema(data, headers, delimiter, opts.inferTypes);

  // Cast values if requested
  if (opts.castValues && opts.inferTypes) {
    for (const row of data) {
      for (const field of schema.fields) {
        const val = row[field.name];
        if (val !== undefined && val !== null) {
          row[field.name] = castValue(val, field.type);
        }
      }
    }
  }

  return {
    data,
    schema,
    errors,
    warnings,
    stats: {
      totalLines: rawLines.length,
      dataRows: dataRowCount,
      headerRows: opts.header ? 1 : 0,
      skippedLines: skippedCount,
      errorLines: errorCount,
      parseTimeMs: Math.round((performance.now() - startTime) * 1000) / 1000,
    },
  };
}

// --- Schema Inference ---

function inferSchema(
  rows: CsvRow[],
  headers: string[],
  delimiter: string,
  doInfer: boolean,
): CsvSchema {
  const fields: CsvField[] = [];
  const inferOpts: TypeInferenceOptions = { sampleSize: 100 };

  for (let i = 0; i < headers.length; i++) {
    const name = headers[i]!;
    const values = rows.slice(0, inferOpts.sampleSize).map((r) => r[name]).filter((v) => v !== undefined && v !== null);

    const type = doInfer ? inferType(values, inferOpts) : "string";
    const nullable = values.some((v) =>
      typeof v === "string" && DEFAULT_NULL_VALUES.includes(v),
    );

    fields.push({
      name,
      index: i,
      type,
      nullable,
      examples: values.slice(0, 3),
    });
  }

  return {
    fields,
    delimiter,
    hasHeader: true,
    lineCount: rows.length,
    encoding: "utf-8",
  };
}

/** Infer the type of a column from its values */
function inferType(values: unknown[], opts: TypeInferenceOptions): CsvFieldType {
  if (values.length === 0) return "unknown";

  const sampleSize = Math.min(values.length, opts.sampleSize ?? 100);
  const samples = values.slice(0, sampleSize);
  const strSamples = samples.map((v) => String(v ?? ""));

  // Check for nulls
  const nullCount = strSamples.filter((v) => DEFAULT_NULL_VALUES.includes(v)).length;
  if (nullCount === sampleSize) return "null";

  // Check booleans
  const nonNullStr = strSamples.filter((v) => !DEFAULT_NULL_VALUES.includes(v));
  if (nonNullStr.length > 0 &&
      nonNullStr.every((v) => [...DEFAULT_BOOL_TRUE, ...DEFAULT_BOOL_FALSE].includes(v))) {
    return "boolean";
  }

  // Check numbers
  const numPattern = /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
  if (nonNullStr.length > 0 && nonNullStr.every((v) => numPattern.test(v))) {
    return "number";
  }

  // Check dates
  if (nonNullStr.length > 0) {
    const dateMatches = nonNullStr.filter((v) =>
      DATE_PATTERNS.some((p) => p.test(v)),
    );
    if (dateMatches.length >= nonNullStr.length * 0.8) return "date";
  }

  return "string";
}

/** Cast a string value to the inferred type */
function castValue(value: unknown, type: CsvFieldType): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();

  switch (type) {
    case "number":
      if (trimmed === "" || DEFAULT_NULL_VALUES.includes(trimmed)) return null;
      const num = Number(trimmed);
      return isNaN(num) ? value : num;
    case "boolean":
      if (DEFAULT_BOOL_TRUE.includes(trimmed)) return true;
      if (DEFAULT_BOOL_FALSE.includes(trimmed)) return false;
      return value;
    case "date":
      const d = new Date(trimmed);
      return isNaN(d.getTime()) ? value : d.toISOString();
    case "null":
      if (DEFAULT_NULL_VALUES.includes(trimmed)) return null;
      return value;
    default:
      return value;
  }
}

// --- Header Utilities ---

/** Deduplicate header names by appending suffixes */
function deduplicateHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((h) => {
    const base = h.trim();
    if (!seen.has(base)) {
      seen.set(base, 1);
      return base;
    }
    const count = seen.get(base)!;
    seen.set(base, count + 1);
    return `${base}_${count}`;
  });
}

// --- Serialization ---

/** Serialize rows back to CSV string */
export function serializeCsv(
  data: CsvRow[],
  options: {
    delimiter?: string;
    header?: boolean;
    columns?: string[];
    quoteChar?: string;
    lineEnding?: string;
  } = {},
): string {
  const delimiter = options.delimiter ?? ",";
  const quoteChar = options.quoteChar ?? '"';
  const lineEnding = options.lineEnding ?? "\n";

  // Determine columns
  const columns = options.columns ?? (
    data.length > 0 ? Object.keys(data[0]!).filter((k) => !k.startsWith("_")) : []
  );

  const lines: string[] = [];

  // Header row
  if (options.header !== false && columns.length > 0) {
    lines.push(columns.map((c) => quoteField(c, delimiter, quoteChar)).join(delimiter));
  }

  // Data rows
  for (const row of data) {
    const fields = columns.map((col) => {
      const val = row[col];
      return quoteField(formatCellValue(val), delimiter, quoteChar);
    });
    lines.push(fields.join(delimiter));
  }

  return lines.join(lineEnding);
}

/** Quote a CSV field if necessary */
function quoteField(value: string, delimiter: string, quoteChar: string): string {
  if (value.includes(delimiter) || value.includes(quoteChar) || value.includes("\n") || value.includes("\r")) {
    return `${quoteChar}${value.replace(new RegExp(quoteChar, "g"), `${quoteChar}${quoteChar}`)}${quoteChar}`;
  }
  return value;
}

/** Format any cell value to string for serialization */
function formatCellValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.join("; ");
  }
  return String(value);
}

// --- Streaming Parser ---

/**
 * Create a streaming CSV parser for large files.
 * Uses chunked processing to avoid blocking the main thread.
 */
export function createStreamingParser(
  options: ParseOptions & { chunkSize?: number },
): StreamingParser {
  return new StreamingParser(options);
}

export class StreamingParser {
  private buffer = "";
  private options: ParseOptions & { chunkSize?: number };
  private lineNumber = 0;
  private dataLineNumber = 0;
  private headers: string[] = [];
  private delimiter: string;
  private started = false;
  private finished = false;
  private data: CsvRow[] = [];
  private errors: ParseError[] = [];

  constructor(options: ParseOptions & { chunkSize?: number } = {}) {
    this.options = { chunkSize: 1000, ...options };
    this.delimiter = options.delimiter ?? ",";
  }

  /** Feed a chunk of CSV text into the parser */
  feed(chunk: string): void {
    if (this.finished) return;
    this.buffer += chunk;
    this.processBuffer();
  }

  /** Signal end of input */
  end(): ParseResult {
    this.finished = true;
    // Process remaining buffer
    if (this.buffer.trim()) {
      this.processBuffer();
    }

    return {
      data: this.data,
      schema: {
        fields: this.headers.map((name, index) => ({
          name, index, type: "string" as CsvFieldType, nullable: true,
        })),
        delimiter: this.delimiter,
        hasHeader: this.headers.length > 0,
        lineCount: this.lineNumber,
        encoding: "utf-8",
      },
      errors: this.errors,
      warnings: [],
      stats: {
        totalLines: this.lineNumber,
        dataRows: this.data.length,
        headerRows: this.headers.length > 0 ? 1 : 0,
        skippedLines: 0,
        errorLines: this.errors.length,
        parseTimeMs: 0,
      },
    };
  }

  private processBuffer(): void {
    const lines = this.buffer.split("\n");
    // Keep last incomplete line in buffer
    this.buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      this.lineNumber++;
      const line = rawLine.replace(/\r$/, "");

      if (this.options.skipEmptyLines !== false && line.trim() === "") continue;
      if (this.options.commentPrefix && line.trim().startsWith(this.options.commentPrefix)) continue;

      if (!this.started) {
        // First non-empty line is header (if configured)
        if (this.options.header !== false) {
          this.headers = splitCsvLine(line, this.delimiter, this.options.quoteChar, this.options.escapeChar)
            .map((h) => (this.options.trimValues !== false ? h.trim() : h));
          this.headers = deduplicateHeaders(this.headers);
          this.started = true;
          continue;
        } else {
          this.headers = splitCsvLine(line, this.delimiter, this.options.quoteChar, this.options.escapeChar)
            .map((_, i) => `col_${i + 1}`);
          this.started = true;
        }
      }

      // Data row
      try {
        const fields = splitCsvLine(line, this.delimiter, this.options.quoteChar, this.options.escapeChar);
        const row: CsvRow = { _lineNumber: this.lineNumber };
        for (let i = 0; i < this.headers.length; i++) {
          let val = fields[i] ?? "";
          if (this.options.trimValues !== false) val = val.trim();
          row[this.headers[i]!] = val;
        }

        const transformed = this.options.transform ? this.options.transform(row) : row;
        if (transformed !== null) {
          this.data.push(transformed);
          this.options.onRow?.(transformed, this.data.length - 1);
        }
        this.dataLineNumber++;
      } catch (err) {
        this.errors.push({
          line: this.lineNumber,
          column: 0,
          message: err instanceof Error ? err.message : String(err),
          rawLine: line,
        });
      }
    }
  }
}

// --- Validation ---

/** Validate data against a known schema */
export function validateAgainstSchema(data: CsvRow[], schema: CsvSchema): {
  valid: boolean;
  errors: Array<{ row: number; field: string; message: string; value: unknown }>;
} {
  const errors: Array<{ row: number; field: string; message: string; value: unknown }> = [];

  for (let ri = 0; ri < data.length; ri++) {
    const row = data[ri]!;
    for (const field of schema.fields) {
      const val = row[field.name];
      const rowNum = (row._lineNumber ?? ri + 1);

      // Null check
      if (val == null || (typeof val === "string" && val.trim() === "")) {
        if (!field.nullable) {
          errors.push({ row: rowNum, field: field.name, message: "Required field is null/empty", value: val });
        }
        continue;
      }

      // Type check
      switch (field.type) {
        case "number":
          if (isNaN(Number(val))) {
            errors.push({ row: rowNum, field: field.name, message: "Expected number", value: val });
          }
          break;
        case "boolean": {
          const s = String(val);
          if (![...DEFAULT_BOOL_TRUE, ...DEFAULT_BOOL_FALSE].includes(s)) {
            errors.push({ row: rowNum, field: field.name, message: "Expected boolean", value: val });
          }
          break;
        }
        case "date":
          if (isNaN(Date.parse(String(val)))) {
            errors.push({ row: rowNum, field: field.name, message: "Expected date", value: val });
          }
          break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// --- Query / Filter ---

/** Filter CSV data with simple query expressions */
export function queryCsv(
  data: CsvRow[],
  filters: Array<{
    field: string;
    operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "startsWith" | "endsWith" | "in" | "regex";
    value: unknown;
  }>,
): CsvRow[] {
  return data.filter((row) =>
    filters.every((f) => {
      const val = row[f.field];
      return applyFilterOperator(val, f.operator, f.value);
    }),
  );
}

function applyFilterOperator(actual: unknown, operator: string, expected: unknown): boolean {
  const a = actual == null ? "" : actual;
  const e = expected;

  switch (operator) {
    case "=": return a == e;
    case "!=": return a != e;
    case ">": return Number(a) > Number(e);
    case "<": return Number(a) < Number(e);
    case ">=": return Number(a) >= Number(e);
    case "<=": return Number(a) <= Number(e);
    case "contains": return String(a).includes(String(e));
    case "startsWith": return String(a).startsWith(String(e));
    case "endsWith": return String(a).endsWith(String(e));
    case "in": return Array.isArray(e) ? e.includes(a) : false;
    case "regex": return new RegExp(String(e), "i").test(String(a));
    default: return true;
  }
}
