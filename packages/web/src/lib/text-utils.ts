/**
 * Text Processing Utilities: Tokenization, case conversion, truncation,
 * word/line/sentence boundaries, text diff, indentation handling,
 * markdown helpers, and string transformation pipelines.
 */

// --- Case Conversion ---

/** Convert to title case (first letter of each word capitalized) */
export function toTitleCase(str: string): string {
  return str.replace(
    /\b\w+/g,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}

/** Convert to sentence case (first letter capitalized, rest lowercase) */
export function toSentenceCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** Convert to camelCase from space/underscore/dash/hyphen-separated */
export function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_\s]+(.)?/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

/** Convert from camelCase to kebab-case */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

/** Convert from camelCase to snake_case */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

/** Convert to CONSTANT_CASE (UPPER_SNAKE) */
export function toConstantCase(str: string): string {
  return toSnakeCase(str).toUpperCase();
}

/** Detect the case convention of a string */
export function detectCase(str: string): "camel" | "pascal" | "kebab" | "snake" | "upper" | "lower" | "unknown" {
  if (str === str.toUpperCase()) return "upper";
  if (str === str.toLowerCase()) return "lower";
  if (/^[a-z][a-z0-9]*$/.test(str)) return "camel";
  if (/^[A-Z][a-z0-9]*$/.test(str)) return "pascal";
  if (/-/.test(str)) return "kebab";
  if (/_/.test(str)) return "snake";
  return "unknown";
}

// --- Tokenization ---

/** Split text into words (respects Unicode word boundaries) */
export function tokenizeWords(text: string): string[] {
  return Array.from(text.matchAll(/\b[\w']+\b/g)).map((m) => m[0]);
}

/** Split text into lines (handles \n, \r\n, \r) */
export function tokenizeLines(text: string): string[] {
  return text.split(/\r?\n/);
}

/** Split text into sentences (basic: splits on .!? followed by space or end) */
export function tokenizeSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end of string
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])\s*$/);
  return parts.filter((s) => s.trim().length > 0);
}

/** Split text into paragraphs (double newline separation) */
export function tokenizeParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).filter((s) => s.trim().length > 0);
}

// --- Truncation ---

/** Truncate text with ellipsis, preserving whole words when possible */
export function truncate(
  text: string,
  maxLength: number,
  options?: { suffix?: string; breakWords?: boolean; fromStart?: boolean },
): string {
  const { suffix = "...", breakWords = false, fromStart = false } = options ?? {};
  if (text.length <= maxLength) return text;

  if (fromStart) {
    const end = text.length - maxLength;
    const truncated = text.slice(0, Math.max(0, end));
    return truncated + suffix;
  }

  if (breakWords) {
    return text.slice(0, maxLength - suffix.length) + suffix;
  }

  // Try to break at word boundary
  const lastSpace = text.lastIndexOf(" ", maxLength - suffix.length);
  if (lastSpace > maxLength * 0.6) {
    return text.slice(0, lastSpace) + suffix;
  }

  return text.slice(0, maxLength - suffix.length) + suffix;
}

/** Truncate from the middle (useful for filenames/paths) */
export function truncateMiddle(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const half = Math.floor((maxLength - 3) / 2);
  return text.slice(0, half) + "..." + text.slice(-half);
}

/** Ellipsize text in the center (keep start and end) */
export function ellipsize(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const keepEach = Math.floor((maxLength - 3) / 2);
  return text.slice(0, keepEach) + "..." + text.slice(-keepEach);
}

// --- Indentation ---

/** Detect indentation type (tabs vs spaces) and size */
export function detectIndent(lines: string[]): { type: "tab" | "space"; size: number } | null {
  for (const line of lines) {
    const match = line.match(/^(\t+)|^(\s+)/);
    if (!match) continue;
    if (match[1]) return { type: "tab", size: match[1].length };
    return { type: "space", size: match[2]!.length };
  }
  return null;
}

/** Get leading whitespace from a line */
export function getIndent(line: string): string {
  const match = line.match(/^(\s*)/);
  return match ? match[1] : "";
}

/** Add or change indentation of a line */
export function setIndent(line: string, indent: string): string {
  return indent + line.trimStart();
}

/** Remove common leading indentation from a block of text */
export function dedent(text: string): string {
  const lines = tokenizeLines(text);
  const indentInfo = detectIndent(lines);
  if (!indentInfo) return text;

  const indentStr = indentInfo.type === "tab" ? "\t".repeat(indentInfo.size) : " ".repeat(indentInfo.size);
  return lines
    .map((line) => line.startsWith(indentStr) ? line.slice(indentStr.length) : line)
    .join("\n");
}

/** Add uniform indentation to every line */
export function indent(text: string, size: number, type: "space" | "tab" = "space"): string {
  const prefix = type === "tab" ? "\t".repeat(size) : " ".repeat(size);
  return tokenizeLines(text)
    .map((line) => prefix + line)
    .join("\n");
}

// --- Text Diff ---

/** Simple line-based text diff result */
export interface TextDiff {
  added: string[];
  removed: string[];
  unchanged: string[];
}

/**
 * Compute a simple line-level diff between two texts.
 * Returns arrays of added, removed, and unchanged lines.
 */
export function textDiff(oldText: string, newText: string): TextDiff {
  const oldLines = tokenizeLines(oldText);
  const newLines = tokenizeLines(newText);

  const lcs = longestCommonSubsequence(oldLines, newLines);

  const removed: string[] = [];
  const added: string[] = [];
  const unchanged: string[] = [];

  let i = 0, j = 0;
  for (const item of lcs) {
    while (i < oldLines.length && oldLines[i] !== item) { removed.push(oldLines[i]!); i++; }
    while (j < newLines.length && newLines[j] !== item) { added.push(newLines[j]!); j++; }
    unchanged.push(item);
    i++;
    j++;
  }
  // Remaining old lines are removed
  while (i < oldLines.length) { removed.push(oldLines[i]!); i++; }
  // Remaining new lines are added
  while (j < newLines.length) { added.push(newLines[j]!); j++; }

  return { added, removed, unchanged };
}

/** Generate unified diff format from two texts */
export function unifiedDiff(oldText: string, newText: string, filename = "file"): string {
  const diff = textDiff(oldText, newText);
  const lines: string[] = [];

  let oldLine = 1;
  let newLine = 1;

  for (const u of diff.unchanged) {
    lines.push(` ${u}`);
    oldLine++;
    newLine++;
  }

  for (const r of diff.removed) {
    lines.push(`-${r}`);
    oldLine++;
  }

  for (const a of diff.added) {
    lines.push(`+${a}`);
    newLine++;
  }

  return `--- ${filename}\n+++ ${filename}\n${lines.join("\n")}`;
}

/** Compute LCS (Longest Common Subsequence) between two string arrays */
function longestCommonSubsequence(a: string[], b: string[]): string[] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the actual subsequence
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

// --- Similarity ---

/** Compute Levenshtein (edit) distance between two strings */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 0; j <= b.length; j++) {
      if (i === 0) { matrix[0][j] = j; continue; }
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

/** Compute similarity ratio (0-1) based on edit distance */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const maxLen = Math.max(a.length, b.length);
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/** Check if strings are similar above threshold */
export function isSimilar(a: string, b: string, threshold = 0.8): boolean {
  return similarity(a, b) >= threshold;
}

/** Find best matching string from candidates */
export function findBestMatch(query: string, candidates: string[], threshold = 0.5): {
  score: number;
  index: number;
} | null {
  let bestScore = -1;
  let bestIndex = -1;

  for (let i = 0; i < candidates.length; i++) {
    const score = similarity(query, candidates[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex >= 0 && bestScore >= threshold) {
    return { score: bestScore, index: bestIndex };
  }
  return null;
}

// --- Markdown Helpers ---

/** Bold markdown text */
export function mdBold(text: string): string { return `**${text}**`; }

/** Italic markdown text */
export function mdItalic(text: string): string { return `_${text}_`; }

/** Strikethrough markdown text */
export function mdStrikethrough(text: string): string { return `~~${text}~~`; }

/** Inline code markdown */
export function mdCode(text: string): string { return `\`${text}\``; }

/** Link markdown */
export function mdLink(text: string, url: string): string { return `[${text}](${url})`; }

/** Image markdown */
export function mdImage(alt: string, src: string): string { return `![${alt}](${src})`; }

/** Heading markdown (level 1-6) */
export function mdHeading(text: string, level = 1): string {
  const prefix = "#".repeat(Math.max(1, Math.min(6, level)));
  return `${prefix} ${text}`;
}

/** Blockquote markdown */
export function mdBlockquote(text: string): string {
  return tokenizeLines(text).map((line) => `> ${line}`).join("\n");
}

/** Unordered list markdown */
export function mdList(items: string[], ordered = false): string {
  const prefix = ordered ? "." : "-";
  return items.map((item, i) => `${ordered ? `${i + 1}${prefix}` : prefix} ${item}`).join("\n");
}

/** Horizontal rule */
export function hr(): string { return "---"; }

/** Code block with optional language hint */
export function mdCodeBlock(code: string, language?: string): string {
  return `\`\`\`${language ?? ""}\n${code}\n\`\`\``;
}

/** Table markdown from headers and rows */
export function mdTable(headers: string[], rows: string[][]): string {
  const separator = headers.map(() => "---").join(" | ");
  const headerRow = headers.join(" | ");
  const bodyRows = rows.map((row) => row.join(" | "));
  return `${headerRow}\n${separator}\n${bodyRows.join("\n")}`;
}

// --- String Pipeline ---

/** Apply multiple transformations sequentially */
export function pipe<T>(value: T, ...fns: Array<(v: T) => T>): T {
  return fns.reduce((val, fn) => fn(val), value);
}

/** Conditional transform — apply fn only if condition is truthy */
export function when<T>(condition: boolean, fn: (v: T) => T, value: T): T {
  return condition ? fn(value) : value;
}
