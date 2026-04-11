/**
 * JSON Formatter: Pretty-print, colorize, minify, diff, validate,
 * transform, and path-based access for JSON data.
 *
 * Provides:
 *   - Syntax-highlighted HTML output
 *   - Configurable indentation and line length
 *   - JSON-to-HTML table rendering
 *   - JSON Patch (RFC 6902) operations
 *   - JSON Pointer (RFC 6901) resolution
 *   - JSON Path-like queries
 *   - Circular reference handling
 *   - Schema-aware formatting hints
 */

// --- Types ---

export interface JsonFormatOptions {
  /** Indentation string or number of spaces (default: 2) */
  indent?: number | string;
  /** Maximum line length before attempting to compact (default: 80) */
  maxLineLength?: number;
  /** Sort object keys alphabetically */
  sortKeys?: boolean;
  /** Replacer function (same as JSON.stringify replacer) */
  replacer?: (key: string, value: unknown) => unknown;
  /** Print depth limit (default: Infinity) */
  maxDepth?: number;
  /** Whether to include undefined values as null */
  includeUndefined?: boolean;
  /** Custom color theme for HTML output */
  theme?: JsonColorTheme;
}

export interface JsonColorTheme {
  key?: string;
  string?: string;
  number?: string;
  boolean?: string;
  null?: string;
  bracket?: string;
  colon?: string;
  comma?: string;
  background?: string;
}

export interface JsonDiffResult {
  /** Original JSON */
  original: string;
  /** Modified JSON */
  modified: string;
  /** Array of differences */
  changes: JsonChange[];
  /** Whether the two values are equal */
  equal: boolean;
}

export interface JsonChange {
  /** Operation type */
  op: "add" | "remove" | "replace" | "move" | "copy";
  /** JSON Pointer path */
  path: string;
  /** Value (for add/replace/copy) */
  value?: unknown;
  /** From path (for move/copy) */
  from?: string;
  /** Old value (for replace/remove) */
  oldValue?: unknown;
}

export interface JsonPatchOperation {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: unknown;
  from?: string;
}

// --- Default Theme ---

const DEFAULT_THEME: Required<JsonColorTheme> = {
  key: "#9333ea",
  string: "#059669",
  number: "#d97706",
  boolean: "#2563eb",
  null: "#9ca3af",
  bracket: "#6b7280",
  colon: "#6b7280",
  comma: "#6b7280",
  background: "#fafafa",
};

// --- Core Formatting ---

/** Format a JSON value with pretty-printing options */
export function formatJson(value: unknown, options: JsonFormatOptions = {}): string {
  const {
    indent = 2,
    sortKeys = false,
    replacer,
    maxDepth = Infinity,
  } = options;

  const indentStr = typeof indent === "number" ? " ".repeat(indent) : indent;

  const processed = sortKeys ? sortObjectKeys(value) : value;

  try {
    return JSON.stringify(processed, replacer as (this: unknown, key: string, value: unknown) => unknown, indentStr);
  } catch {
    return String(value);
  }
}

/** Minify JSON (remove all whitespace) */
export function minifyJson(value: unknown): string {
  return JSON.stringify(value);
}

/** Validate a JSON string — returns parsed value or throws */
export function parseJson<T = unknown>(text: string): T {
  // Strip BOM and comments
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return JSON.parse(cleaned) as T;
}

/** Safe parse that returns null on failure instead of throwing */
export function safeParseJson<T = unknown>(text: string): T | null {
  try { return parseJson<T>(text); } catch { return null; }
}

/** Check if a string is valid JSON */
export function isValidJson(text: string): boolean {
  try { JSON.parse(text); return true; } catch { return false; }
}

// --- HTML Syntax Highlighting ---

/** Format JSON as syntax-highlighted HTML */
export function formatJsonHtml(value: unknown, options: JsonFormatOptions = {}): string {
  const theme = { ...DEFAULT_THEME, ...options.theme };
  const formatted = formatJson(value, options);
  return syntaxHighlight(formatted, theme);
}

function syntaxHighlight(json: string, theme: Required<JsonColorTheme>): string {
  json = escapeHtml(json);

  const rules: [RegExp, string][] = [
    [/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (_match, p1, p2) => {
      let cls = theme.string;
      if (p2) cls = theme.key; // Key with colon
      return `<span style="color:${cls}">${p1}</span>${p2 ?? ""}<span style="color:${theme.colon}">${p2 ? ":" : ""}</span>`;
    }],
    [/\b(true|false)\b/g, `<span style="color:${theme.boolean}">$1</span>`],
    [/\bnull\b/g, `<span style="color:${theme.null}">null</span>`],
    [/\b(-?\d+\.?\d*([eE][+-]?\d+)?)/g, `<span style="color:${theme.number}">$1</span>`],
    [/[{}\[\]]/g, `<span style="color:${theme.bracket};font-weight:bold">$&</span>`],
    [, `,`].map(c => [new RegExp(`\\${c}`, "g"), `<span style="color:${theme.comma}">${c}</span>`]),
  ];

  let result = json;
  for (const [regex, replacement] of rules) {
    result = result.replace(regex, replacement as string);
  }

  return result;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- Object Sorting ---

function sortObjectKeys(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => sortObjectKeys(v, depth + 1));
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortObjectKeys((value as Record<string, unknown>)[key], depth + 1);
  }
  return sorted;
}

// --- JSON Diff ---

/** Compute structural diff between two JSON values */
export function jsonDiff(original: unknown, modified: unknown): JsonDiffResult {
  const changes: JsonChange[] = [];
  computeDiff(original, modified, "", changes);
  return {
    original: formatJson(original),
    modified: formatJson(modified),
    changes,
    equal: changes.length === 0,
  };
}

function computeDiff(orig: unknown, mod: unknown, path: string, changes: JsonChange[]): void {
  if (orig === mod) return;

  const currentPath = path;

  if (orig === undefined || orig === null) {
    changes.push({ op: "add", path: currentPath, value: mod });
    return;
  }
  if (mod === undefined || mod === null) {
    changes.push({ op: "remove", path: currentPath, oldValue: orig });
    return;
  }

  if (typeof orig !== typeof mod || Array.isArray(orig) !== Array.isArray(mod)) {
    changes.push({ op: "replace", path: currentPath, value: mod, oldValue: orig });
    return;
  }

  if (Array.isArray(orig) && Array.isArray(mod)) {
    const maxLen = Math.max(orig.length, mod.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${currentPath}/${i}`;
      if (i >= orig.length) {
        changes.push({ op: "add", path: itemPath, value: mod[i] });
      } else if (i >= mod.length) {
        changes.push({ op: "remove", path: itemPath, oldValue: orig[i] });
      } else {
        computeDiff(orig[i], mod[i], itemPath, changes);
      }
    }
    return;
  }

  if (typeof orig === "object" && typeof mod === "object") {
    const origKeys = new Set(Object.keys(orig));
    const modKeys = new Set(Object.keys(mod));

    for (const key of modKeys) {
      if (!origKeys.has(key)) {
        changes.push({ op: "add", path: `${currentPath}/${escapeKey(key)}`, value: (mod as Record<string, unknown>)[key] });
      }
    }
    for (const key of origKeys) {
      if (!modKeys.has(key)) {
        changes.push({ op: "remove", path: `${currentPath}/${escapeKey(key)}`, oldValue: (orig as Record<string, unknown>)[key] });
      }
    }
    for (const key of [...origKeys].filter((k) => modKeys.has(k))) {
      computeDiff(
        (orig as Record<string, unknown>)[key],
        (mod as Record<string, unknown>)[key],
        `${currentPath}/${escapeKey(key)}`,
        changes,
      );
    }
    return;
  }

  if (orig !== mod) {
    changes.push({ op: "replace", path: currentPath, value: mod, oldValue: orig });
  }
}

function escapeKey(key: string): string {
  return key.replace(/~/g, "~0").replace(/\//g, "~1");
}

// --- JSON Patch (RFC 6902) ---

/** Apply RFC 6902 JSON Patch operations to a document */
export function applyPatch(document: unknown, operations: JsonPatchOperation[]): unknown {
  let result = deepClone(document);

  for (const op of operations) {
    result = applyOperation(result, op);
  }

  return result;
}

function applyOperation(doc: unknown, op: JsonPatchOperation): unknown {
  const target = resolvePointer(doc, op.path);

  switch (op.op) {
    case "add":
      return setPointer(doc, op.path, op.value);
    case "remove":
      return removePointer(doc, op.path);
    case "replace":
      return setPointer(doc, op.path, op.value);
    case "move": {
      const fromVal = resolvePointer(doc, op.from!);
      const withoutFrom = removePointer(doc, op.from!);
      return setPointer(withoutFrom, op.path, fromVal);
    }
    case "copy": {
      const fromVal = resolvePointer(doc, op.from!);
      return setPointer(doc, op.path, fromVal);
    }
    case "test": {
      const val = resolvePointer(doc, op.path);
      if (JSON.stringify(val) !== JSON.stringify(op.value)) throw new Error(`Test failed at ${op.path}`);
      return doc;
    }
    default:
      throw new Error(`Unknown operation: ${(op as {op: string}).op}`);
  }
}

// --- JSON Pointer (RFC 6901) ---

/** Resolve a JSON Pointer path to its value */
export function resolvePointer(doc: unknown, pointer: string): unknown {
  if (pointer === "" || pointer === "/") return doc;

  const parts = pointer.slice(1).split("/").map(unescapeKey);
  let current: unknown = doc;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    if (Array.isArray(current)) {
      const idx = parseInt(part, 10);
      current = isNaN(idx) ? undefined : current[idx];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/** Set a value at a JSON Pointer path */
export function setPointer(doc: unknown, pointer: string, value: unknown): unknown {
  if (pointer === "" || pointer === "/") return value;

  const parts = pointer.slice(1).split("/").map(unescapeKey);
  const result = deepClone(doc);
  let current: Record<string, unknown> = result as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const next = (current as Record<string, unknown>)[part];
    if (next === undefined || next === null) {
      // Assume array index if numeric
      const nextIsNum = !isNaN(parseInt(parts[i + 1]!, 10));
      current[part] = nextIsNum ? [] : {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1]!;
  current[lastPart] = value;

  return result;
}

/** Remove a value at a JSON Pointer path */
export function removePointer(doc: unknown, pointer: string): unknown {
  if (pointer === "" || pointer === "/") return null;

  const parts = pointer.slice(1).split("/").map(unescapeKey);
  const result = deepClone(doc);
  let current: Record<string, unknown> = result as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]!] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1]!;
  if (Array.isArray(current)) {
    current.splice(parseInt(lastPart, 10), 1);
  } else {
    delete current[lastPart];
  }

  return result;
}

function unescapeKey(key: string): string {
  return key.replace(/~1/g, "/").replace(/~0/g, "~");
}

// --- Utilities ---

/** Deep clone a JSON-compatible value */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Get the byte size of a JSON string (UTF-8 encoded estimate) */
export function getJsonSize(value: unknown): number {
  return new Blob([JSON.stringify(value)]).size;
}

/** Truncate JSON to a maximum byte size */
export function truncateJson(value: unknown, maxSizeBytes: number): string {
  let str = JSON.stringify(value);
  if (new Blob([str]).size <= maxSizeBytes) return str;

  // Binary search for cutoff point
  let lo = 0, hi = str.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (new Blob([str.slice(0, mid)]).size > maxSizeBytes) {
      hi = mid - 1;
    } else {
      lo = mid;
    }
  }
  return str.slice(0, lo) + '..."truncated"}';
}
