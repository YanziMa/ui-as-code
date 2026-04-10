/**
 * Advanced string manipulation utilities.
 */

/** Check if a string is empty or only whitespace */
export function isBlank(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

/** Check if a string is not empty and not only whitespace */
export function isPresent(str: string | null | undefined): str is string {
  return !!str && str.trim().length > 0;
}

/** Trim whitespace from both ends, collapse internal whitespace to single space */
export function collapseWhitespace(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}

/** Remove all diacritical marks from a string (e.g., é → e) */
export function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Escape special regex characters in a string */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Escape HTML entities */
export function escapeHtmlEntities(str: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
  };

  return str.replace(/[&<>"'/]/g, (char) => map[char]!);
}

/** Unescape HTML entities back to characters */
export function unescapeHtmlEntities(str: string): string {
  const map: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&#x2F;": "/",
  };

  return str.replace(/&(?:amp|lt|gt|quot|#39|#x2F);/g, (entity) => map[entity]!);
}

/** Convert a string to camelCase from any delimiter */
export function toCamelCaseString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
    .replace(/^(.)/, (c) => c.toLowerCase());
}

/** Convert a string to PascalCase */
export function toPascalCaseString(str: string): string {
  const camel = toCamelCaseString(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/** Convert a string to kebab-case */
export function toKebabCaseString(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/** Convert a string to snake_case */
export function toSnakeCaseString(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

/** Capitalize the first letter of each word */
export function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Truncate text with ellipsis, preserving word boundaries when possible */
export function smartTruncate(
  str: string,
  maxLength: number,
  suffix = "...",
): string {
  if (str.length <= maxLength) return str;

  // Try to break at word boundary
  const truncated = str.slice(0, maxLength - suffix.length);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.6) {
    return truncated.slice(0, lastSpace) + suffix;
  }

  return truncated + suffix;
}

/** Repeat a string N times with a separator between repetitions */
export function repeatWithSeparator(str: string, times: number, separator = ""): string {
  return Array(times).fill(str).join(separator);
}

/** Pad a string on both sides to center it within a given width */
export function centerPad(str: string, width: number, padChar = " "): string {
  if (str.length >= width) return str;

  const totalPad = width - str.length;
  const leftPad = Math.floor(totalPad / 2);
  const rightPad = totalPad - leftPad;

  return padChar.repeat(leftPad) + str + padChar.repeat(rightPad);
}

/** Check if a string contains only ASCII characters */
export function isAscii(str: string): boolean {
  return /^[\x00-\x7F]*$/.test(str);
}

/** Check if a string looks like an email address */
export function looksLikeEmail(str: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

/** Check if a string looks like a URL */
export function looksLikeUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return /^https?:\/\/.+/.test(str);
  }
}

/** Extract numbers from a string */
export function extractNumbers(str: string): number[] {
  const matches = str.match(/-?\d+(?:\.\d+)?/g);
  return matches ? matches.map(Number) : [];
}

/** Replace all occurrences of multiple strings at once */
export function replaceMultiple(
  str: string,
  replacements: Record<string, string>,
): string {
  let result = str;
  for (const [search, replace] of Object.entries(replacements)) {
    result = result.split(search).join(replace);
  }
  return result;
}

/** Generate a unique ID from a string (consistent for same input) */
export function stringToId(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

/** Count occurrences of a substring in a string */
export function countOccurrences(str: string, sub: string): number {
  let count = 0;
  let pos = 0;

  while ((pos = str.indexOf(sub, pos)) !== -1) {
    count++;
    pos += sub.length;
  }

  return count;
}

/** Reverse words in a sentence while maintaining word order */
export function reverseWords(str: string): string {
  return str.split(/\s+/).map((word) => [...word].reverse().join("")).join(" ");
}

/** Remove leading and trailing lines that are empty or whitespace-only */
export function trimLines(str: string): string {
  return str.replace(/^\s*\n|\n\s*$/g, "");
}

// --- Case Detection ---

/** Detect the predominant case style of a string */
export function detectCase(str: string): "camel" | "pascal" | "snake" | "kebab" | "upper" | "lower" | "mixed" | "unknown" {
  if (/^[A-Z][a-z]+([A-Z][a-z]+)*$/.test(str)) return "pascal";
  if (/^[a-z]+([A-Z][a-z]+)*$/.test(str)) return "camel";
  if (/^[a-z]+(_[a-z]+)+$/.test(str)) return "snake";
  if (/^[a-z]+(-[a-z]+)+$/.test(str)) return "kebab";
  if (str === str.toUpperCase() && str.length > 1) return "upper";
  if (str === str.toLowerCase()) return "lower";
  if (/[a-zA-Z]/.test(str)) return "mixed";
  return "unknown";
}

// --- Slugify ---

/** Convert a string to URL-friendly slug */
export function slugify(str: string, options?: { separator?: string; lowercase?: boolean; maxLength?: number }): string {
  const { separator = "-", lowercase = true, maxLength } = options ?? {};
  let result = stripDiacritics(str)
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, separator);
  if (lowercase) result = result.toLowerCase();
  if (maxLength && result.length > maxLength) result = result.slice(0, maxLength).replace(/[-_]+$/, "");
  return result;
}

// --- Levenshtein Distance ---

/** Compute Levenshtein edit distance between two strings */
export function levenshtein(a: string, b: number): number;
export function levenshtein(a: string, b: string): number;
export function levenshtein(a: string, b: string | number): number {
  const s = String(b);
  const m = a.length;
  const n = s.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Use single-row optimization for memory efficiency
  let prevRow = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const currRow = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === s[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1,        // insertion
        prevRow[j] + 1,            // deletion
        prevRow[j - 1] + cost,     // substitution
      );
    }
    prevRow = currRow;
  }
  return prevRow[n];
}

/** Check if two strings are similar within a threshold (0-1 ratio of max length) */
export function isSimilar(a: string, b: string, threshold = 0.8): boolean {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return true;
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen >= threshold;
}

// --- Soundex ---

/** Generate Soundex phonetic code for English words */
export function soundex(str: string): string {
  const s = str.toUpperCase().replace(/[^A-Z]/g, "");
  if (!s) return "";

  const mappings: Record<string, string> = {
    B: "1", F: "1", P: "1", V: "1",
    C: "2", G: "2", J: "2", K: "2", Q: "2", S: "2", X: "2", Z: "2",
    D: "3", T: "3",
    L: "4",
    M: "5", N: "5",
    R: "6",
  };

  let result = s[0]!;
  let prevCode = mappings[s[0]] ?? "";

  for (let i = 1; i < s.length; i++) {
    const code = mappings[s[i]] ?? "";
    if (code && code !== prevCode) result += code;
    prevCode = code || "";
  }

  return (result + "000").slice(0, 4);
}

// --- Random String Generation ---

/** Generate a random string with specified character set */
export function randomString(length = 16, charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"): string {
  let result = "";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  for (let i = 0; i < length; i++) result += charset[values[i] % charset.length];
  return result;
}

/** Generate a random hex string */
export function randomHex(length = 32): string {
  return randomString(length, "0123456789abcdef");
}

/** Generate a random alphanumeric ID (like MongoDB ObjectId style) */
export function generateId(): string {
  const ts = Date.now().toString(16).padStart(8, "0");
  const rand = randomString(16, "0123456789abcdef");
  return ts + rand;
}

// --- Word & Character Analysis ---

/** Count words in a string */
export function wordCount(str: string): number {
  return str.trim() ? str.trim().split(/\s+/).length : 0;
}

/** Get character frequency map */
export function charFrequency(str: string): Map<string, number> {
  const freq = new Map<string, number>();
  for (const ch of str) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  return freq;
}

/** Find most common character(s) */
export function mostCommonChars(str: string, count = 1): Array<{ char: string; frequency: number }> {
  const freq = charFrequency(str);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([char, frequency]) => ({ char, frequency }));
}

/** Find all unique words in a string */
export function uniqueWords(str: string): string[] {
  return [...new Set(str.toLowerCase().match(/\b[a-z]+\b/g) ?? [])].sort();
}

// --- Pluralization / Inflection ---

/** Simple English pluralizer (handles common rules, not exhaustive) */
export function pluralize(word: string, count?: number): string {
  if (count !== undefined && Math.abs(count) === 1) return word;

  const irregular: Record<string, string> = {
    person: "people", man: "men", woman: "women", child: "children",
    tooth: "teeth", foot: "feet", mouse: "mice", goose: "geese",
    ox: "oxen", louse: "lice", datum: "data", index: "indices",
    matrix: "matrices", vertex: "vertices", axis: "axes",
    crisis: "crises", analysis: "analyses", basis: "bases",
  };

  if (irregular[word]) return irregular[word];

  const endings: [RegExp, string][] = [
    [/(.*)$/, "$1s"],           // default: add s
    [/s$/, "ses"],             // bus -> buses
    [/(sh|ch|ss|x|z)$/, "$1es"], // watch -> watches, box -> boxes
    [/([^aeiou])y$/, "$1ies"],   // city -> cities
    [/fe?$/, "ves"],            // knife -> knives, leaf -> leaves
    [/on$/, "a"],               // criterion -> criteria
  ];

  for (const [pattern, replacement] of endings) {
    if (pattern.test(word)) return word.replace(pattern, replacement);
  }

  return word + "s";
}

/** Simple singularize (reverse of pluralize, best-effort) */
export function singularize(word: string): string {
  const irregular: Record<string, string> = {
    people: "person", men: "man", women: "woman", children: "child",
    teeth: "tooth", feet: "foot", mice: "mouse", geese: "goose",
    data: "datum", indices: "index", matrices: "matrix",
    vertices: "vertex", axes: "axis", crises: "crisis",
    analyses: "analysis", bases: "basis",
  };

  if (irregular[word]) return irregular[word];

  const endings: [RegExp, string][] = [
    [/(.*)(s|ss|sh|ch|x|z)es$/, "$1$2"],
    [/(.*)ies$/, "$1y"],
    [/(.*)ves$/, "$1f"],
    [/(.*)a$/, "$1on"],
    [/(.*)s$/, "$1"],
  ];

  for (const [pattern, replacement] of endings) {
    if (pattern.test(word)) return word.replace(pattern, replacement);
  }

  return word;
}

// --- Abbreviation / Acronym ---

/** Create acronym from words (e.g., "As Soon As Possible" → "ASAP") */
export function acronym(str: string): string {
  return str.match(/\b[A-Za-z]/g)?.join("").toUpperCase() ?? "";
}

/** Abbreviate text to fit within maxLength, preserving whole words */
export function abbreviate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return smartTruncate(str, maxLength, "...");
}

// --- Masking / Redaction ---

/** Mask part of a string (e.g., credit card numbers, emails) */
export function maskString(
  str: string,
  options: { start?: number; end?: number; maskChar?: string; showLast?: number } = {},
): string {
  const { start = 0, end = str.length, maskChar = "*", showLast = 4 } = options;
  const visibleEnd = Math.min(end, str.length - showLast);
  if (visibleEnd <= start) return str;
  return str.slice(0, start) + maskChar.repeat(visibleEnd - start) + str.slice(visibleEnd);
}

/** Mask email address: user***@domain.com */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const maskedUser = user.length > 2 ? user[0] + "*".repeat(Math.max(user.length - 2, 1)) + user[user.length - 1] : "***";
  return `${maskedUser}@${domain}`;
}

// --- Indentation ---

/** Detect indentation style (tabs vs spaces, and width) from text */
export function detectIndentation(text: string): { type: "tab" | "space"; size: number } {
  const lines = text.split("\n").filter((l) => /^\s+/.test(l));
  if (lines.length === 0) return { type: "space", size: 2 };

  let tabCount = 0;
  let spaceCounts: number[] = [];

  for (const line of lines) {
    const match = line.match(/^(\t+)|^(\s+)/);
    if (!match) continue;
    if (match[1]) tabCount++;
    else spaceCounts.push(match[2]!.length);
  }

  if (tabCount > spaceCounts.length) return { type: "tab", size: 1 };

  // Most common space indent size
  const counts = new Map<number, number>();
  for (const c of spaceCounts) {
    const size = c; // Use raw count as potential indent size
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }
  const mostCommon = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 2;
  return { type: "space", size: mostCommon };
}

/** Indent all lines by given amount */
export function indentText(text: string, spaces: number, indentChar = " "): string {
  const pad = indentChar.repeat(spaces);
  return text.split("\n").map((line) => (line ? pad + line : "")).join("\n");
}

// --- Diff at word level (simple) ---

/**
 * Get simple diff between two strings at word level.
 * Returns arrays of unchanged/added/removed segments.
 */
export interface DiffSegment {
  type: "equal" | "add" | "remove";
  value: string;
}

export function simpleDiff(oldStr: string, newStr: string): DiffSegment[] {
  const oldWords = oldStr.split(/(\s+)/);
  const newWords = newStr.split(/(\s+)/);
  const result: DiffSegment[] = [];
  let oi = 0, ni = 0;

  while (oi < oldWords.length || ni < newWords.length) {
    if (oi < oldWords.length && ni < newWords.length && oldWords[oi] === newWords[ni]) {
      pushOrMerge(result, "equal", oldWords[oi]!);
      oi++; ni++;
    } else {
      // Look ahead for matches
      let foundOld = -1, foundNew = -1;
      for (let j = ni; j < newWords.length; j++) {
        if (j < newWords.length && oi < oldWords.length && newWords[j] === oldWords[oi]) { foundNew = j; break; }
      }
      for (let k = oi; k < oldWords.length; k++) {
        if (k < oldWords.length && ni < newWords.length && oldWords[k] === newWords[ni]) { foundOld = k; break; }
      }

      if (foundNew >= 0 && (foundNew - ni) <= (foundOld >= 0 ? foundOld - oi : Infinity)) {
        while (ni < foundNew) pushOrMerge(result, "add", newWords[ni++]!);
      } else if (foundOld >= 0) {
        while (oi < foundOld) pushOrMerge(result, "remove", oldWords[oi++]!);
      } else {
        if (oi < oldWords.length) pushOrMerge(result, "remove", oldWords[oi++]!);
        if (ni < newWords.length) pushOrMerge(result, "add", newWords[ni++]!);
      }
    }
  }

  return result;
}

function pushOrMerge(arr: DiffSegment[], type: DiffSegment["type"], value: string): void {
  const last = arr[arr.length - 1];
  if (last && last.type === type) last.value += value;
  else arr.push({ type, value });
}
