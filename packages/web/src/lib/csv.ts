/**
 * CSV parsing and generation utilities.
 */

export interface CsvOptions {
  /** Field delimiter (default: ",") */
  delimiter?: string;
  /** Row delimiter (default: "\n") */
  lineDelimiter?: string;
  /** Include header row (default: true) */
  header?: boolean;
  /** Quote fields containing delimiter/quotes/newlines (default: true) */
  quote?: boolean;
  /** Quote character (default: '"') */
  quoteChar?: string;
}

/** Parse CSV string into array of objects or arrays */
export function parseCsv(
  csvText: string,
  options?: { hasHeader?: boolean; delimiter?: string },
): Record<string, string>[] | string[][] {
  const delimiter = options?.delimiter ?? ",";
  const hasHeader = options?.hasHeader !== false;

  const rows = splitCsvRows(csvText);
  if (rows.length === 0) return hasHeader ? [] : [];

  if (hasHeader && rows.length > 0) {
    const headers = parseCsvRow(rows[0], delimiter);
    return rows.slice(1).map((row) => {
      const values = parseCsvRow(row, delimiter);
      const obj: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        obj[headers[i]] = values[i] ?? "";
      }
      return obj;
    });
  }

  return rows.map((row) => parseCsvRow(row, delimiter));
}

/** Generate CSV from array of objects */
export function generateCsv(
  data: Record<string, unknown>[],
  columns?: string[],
  options?: CsvOptions,
): string {
  const {
    delimiter = ",",
    lineDelimiter = "\n",
    header = true,
    quote = true,
    quoteChar = '"',
  } = options ?? {};

  // Determine columns
  const cols = columns ?? (data.length > 0 ? Object.keys(data[0]) : []);

  const rows: string[] = [];

  // Header row
  if (header) {
    rows.push(cols.map((c) => quoteField(c, quote, quoteChar)).join(delimiter));
  }

  // Data rows
  for (const row of data) {
    rows.push(
      cols.map((col) => quoteField(String(row[col] ?? ""), quote, quoteChar)).join(delimiter),
    );
  }

  return rows.join(lineDelimiter);
}

/** Parse a single CSV row handling quoted fields */
function parseCsvRow(row: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < row.length) {
    const char = row[i];

    if (char === '"') {
      if (inQuotes && i + 1 < row.length && row[i + 1] === '"') {
        current += '"';
        i += 2; // Skip escaped quote
        continue;
      }
      inQuotes = !inQuotes;
      i++;
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
      i++;
    } else {
      current += char;
      i++;
    }
  }

  fields.push(current.trim());
  return fields;
}

/** Split CSV text into raw rows (respecting quoted newlines) */
function splitCsvRows(text: string): string[] {
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === "\n" || (char === "\r" && i + 1 < text.length && text[i + 1] === "\n")) && !inQuotes) {
      if (char === "\r") i++; // Skip \r\n
      rows.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current) rows.push(current);
  return rows;
}

/** Quote a field value for CSV output */
function quoteField(value: string, shouldQuote: boolean, quoteChar: string): string {
  if (!shouldQuote) return value;
  const needsQuoting = value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r");
  if (!needsQuoting) return value;
  return `${quoteChar}${value.replace(new RegExp(quoteChar, "g"), `${quoteChar}${quoteChar}`)}${quoteChar}`;
}

/** Convert CSV to HTML table */
export function csvToHtmlTable(csvText: string, tableAttrs = 'class="w-full border-collapse"'): string {
  const rows = parseCsvRow ? splitCsvRows(csvText).map((r) => parseCsvRow(r, ",")) : [];
  if (rows.length === 0) return "";

  const htmlRows = rows.map((row, idx) => {
    const tag = idx === 0 ? "th" : "td";
    const cells = row.map((cell) => `<${tag}>${escapeHtml(cell)}</${tag}>`).join("");
    return `<tr>${cells}</tr>`;
  });

  return `<table ${tableAttrs}>\n${htmlRows.join("\n")}\n</table>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
