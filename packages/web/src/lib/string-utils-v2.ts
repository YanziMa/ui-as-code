/**
 * String manipulation utilities v2: advanced case conversion, slug generation,
 * text truncation, template interpolation, masking, analysis, encoding.
 */

// --- Case Conversion ---

export function toTitleCase(str: string): string {
  return str.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
export function toSentenceCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
export function toCamelCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : "").replace(/^(.)/, (c) => c.toLowerCase());
}
export function toKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/\s+/g, "-").toLowerCase();
}
export function toSnakeCase(str: string): string { return toKebabCase(str).replace(/-/g, "_"); }
export function toPascalCase(str: string): string {
  const camel = toCamelCase(str); return camel.charAt(0).toUpperCase() + camel.slice(1);
}
export function toConstantCase(str: string): string { return toSnakeCase(str).toUpperCase(); }

export type CaseType = "camel" | "pascal" | "snake" | "kebab" | "constant" | "title" | "sentence" | "lower" | "upper";
export function detectCase(str: string): CaseType {
  if (/^[a-z]+[A-Z][a-zA-Z0-9]*$/.test(str)) return "camel";
  if (/^[A-Z][a-zA-Z0-9]*$/.test(str)) return "pascal";
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(str)) return "snake";
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(str)) return "kebab";
  if (/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(str)) return "constant";
  if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(str)) return "title";
  if (/^[A-Z][a-z]+.*[.]$/.test(str)) return "sentence";
  if (str === str.toLowerCase()) return "lower";
  if (str === str.toUpperCase()) return "upper";
  return "mixed";
}

// --- Slug & URL ---

export function slugify(text: string, options?: { separator?: string; lowercase?: boolean; maxLength?: number }): string {
  const { separator = "-", lowercase = true, maxLength } = options ?? {};
  let result = text.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, separator).replace(/-+/g, separator);
  if (maxLength && result.length > maxLength) result = result.slice(0, maxLength).replace(new RegExp(`${separator}$`), "");
  return lowercase ? result : result;
}

export function uniqueSlug(base: string, existing: Set<string>, sep = "-"): string {
  let slug = slugify(base, { separator: sep });
  let counter = 1;
  while (existing.has(slug)) { slug = `${slugify(base, { separator: sep })}${sep}${counter}`; counter++; }
  return slug;
}

export function humanize(str: string): string {
  return str.replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim()
    .split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

// --- Truncation ---

export function truncateMiddle(str: string, maxLen = 30, ellipsis = "..."): string {
  if (str.length <= maxLen) return str;
  const endLen = Math.floor((maxLen - ellipsis.length) / 2);
  return str.slice(0, maxLen - ellipsis.length - endLen) + ellipsis + str.slice(-endLen);
}

export function truncateAtWord(str: string, maxLen = 100, ellipsis = "..."): string {
  if (str.length <= maxLen) return str;
  const truncated = str.slice(0, maxLen - ellipsis.length);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > maxLen * 0.6 ? truncated.slice(0, lastSpace) + ellipsis : truncated + ellipsis;
}

export function smartTruncate(str: string, maxChars: number): string {
  if (str.length <= maxChars) return str;
  const truncated = str.slice(0, maxChars);
  for (const bp of [" ", ".", ",", "!", "?", ";", ":", "-"]) {
    const idx = truncated.lastIndexOf(bp);
    if (idx > Math.floor(maxChars * 0.5)) return truncated.slice(0, idx) + "...";
  }
  return truncated + "...";
}

// --- Analysis ---

export function countWords(text: string): number { return text.trim().split(/\s+/).filter(Boolean).length; }
export function readingTime(text: string, wpm = 200): string {
  const minutes = Math.ceil(countWords(text) / wpm); return minutes <= 1 ? "1 min read" : `${minutes} min read`;
}
export function charCount(text: string): number { return text.replace(/\s/g, "").length; }

export interface StringStats {
  length: number; charCount: number; wordCount: number; lineCount: number;
  paragraphCount: number; sentenceCount: number; avgWordLength: number;
}
export function stringStats(text: string): StringStats {
  const lines = text.split("\n");
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const totalChars = words.reduce((sum, w) => sum + w.length, 0);
  return { length: text.length, charCount: text.replace(/\s/g, "").length, wordCount: words.length,
    lineCount: lines.length, paragraphCount: paragraphs.length, sentenceCount: sentences.length,
    avgWordLength: words.length > 0 ? totalChars / words.length : 0 };
}

export function isBlank(str: string | null | undefined): boolean { return !str || str.trim().length === 0; }
export function isPresent(str: string | null | undefined): boolean { return !isBlank(str); }

// --- Template & Interpolation ---

export function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const value = getPathValue(vars, path.split(".")); return value != null ? String(value) : match;
  });
}

function getPathValue(obj: unknown, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) { if (current == null || typeof current !== "object") return undefined; current = (current as Record<string, unknown>)[key]; }
  return current;
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, str, i) => {
    const val = values[i] ?? "";
    const escaped = typeof val === "string" ? val.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") : String(val);
    return result + str + escaped;
  }, "");
}

export function repeat(str: string, times: number, sep = ""): string { return Array(Math.max(0, times)).fill(str).join(sep); }

export function pad(str: string, targetLength: number, padChar = " ", align: "left" | "right" | "center" = "left"): string {
  if (str.length >= targetLength) return str;
  const padding = targetLength - str.length;
  switch (align) {
    case "right": return repeat(padChar, padding) + str;
    case "center": { const h = Math.floor(padding / 2); return repeat(padChar, h) + str + repeat(padChar, padding - h); }
    default: return str + repeat(padChar, padding);
  }
}

// --- Searching & Comparison ---

export function startsWith(str: string, prefix: string, pos = 0): boolean { return str.indexOf(prefix, pos) === pos; }
export function endsWith(str: string, suffix: string): boolean { return str.slice(-suffix.length) === suffix; }
export function includes(str: string, searchStr: string, ignoreCase = false): boolean {
  return ignoreCase ? str.toLowerCase().includes(searchStr.toLowerCase()) : str.includes(searchStr);
}
export function findAllOccurrences(str: string, searchStr: string): number[] {
  const positions: number[] = []; let pos = str.indexOf(searchStr);
  while (pos !== -1) { positions.push(pos); pos = str.indexOf(searchStr, pos + 1); } return positions;
}
export function countOccurrences(str: string, searchStr: string): number { return findAllOccurrences(str, searchStr).length; }
export function replaceAll(str: string, search: string, replacement: string): string { return str.split(search).join(replacement); }

// --- Encoding ---

export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
export function unescapeHtml(str: string): string {
  return str.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

// --- Array <-> String ---

export function splitKeep(str: string, delimiter: string | RegExp): string[] {
  if (typeof delimiter === "string") {
    const parts: string[] = []; let remaining = str; let idx: number;
    while ((idx = remaining.indexOf(delimiter)) !== -1) { parts.push(remaining.slice(0, idx + delimiter.length)); remaining = remaining.slice(idx + delimiter.length); }
    parts.push(remaining); return parts;
  }
  return str.split(delimiter);
}

export function joinWithAnd(items: string[], conjunction = "and"): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]!}`;
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items[items.length - 1]!}`;
}

export function initialism(str: string, maxLen = 5): string {
  const words = str.split(/[\s-_]+/).filter(Boolean);
  return words.length <= maxLen ? words.map((w) => w.charAt(0).toUpperCase()).join("") : words.slice(0, maxLen).map((w) => w.charAt(0).toUpperCase()).join("");
}
export const acronym = initialism;

// --- Masking ---

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@"); return domain ? `${local!.charAt(0)}***@${domain}` : email;
}
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, ""); return digits.length <= 4 ? "*".repeat(digits.length) : "*".repeat(digits.length - 4) + digits.slice(-4);
}
export function maskCard(card: string): string {
  const digits = card.replace(/\D/g, ""); return digits.length <= 4 ? "*".repeat(digits.length) : "*".repeat(Math.min(digits.length - 4, 12)) + digits.slice(-4);
}
export function maskString(str: string, showFirst = 2, showLast = 2, maskChar = "*"): string {
  if (str.length <= showFirst + showLast) return maskChar.repeat(str.length);
  return `${str.slice(0, showFirst)}${maskChar.repeat(str.length - showFirst - showLast)}${str.slice(-showLast)}`;
}
