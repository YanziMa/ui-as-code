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
