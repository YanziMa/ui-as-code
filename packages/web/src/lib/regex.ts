/**
 * Regular expression utilities and helpers.
 */

/** Escape special regex characters in a string */
export function escapeRegexString(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Test if a string matches a pattern (wraps error handling) */
export function testRegex(str: string, pattern: RegExp | string): boolean {
  try {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    return regex.test(str);
  } catch {
    return false;
  }
}

/** Extract all matches from a string */
export function extractMatches(
  str: string,
  pattern: RegExp | string,
): Array<{ match: string; index: number; groups: string[] }> {
  try {
    const regex = typeof pattern === "string" ? new RegExp(pattern, "g") : new RegExp(pattern.source, pattern.flags + "g");
    const results: Array<{ match: string; index: number; groups: string[] }> = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(str)) !== null) {
      results.push({
        match: match[0],
        index: match.index,
        groups: match.slice(1),
      });
    }

    return results;
  } catch {
    return [];
  }
}

/** Replace all occurrences with a replacement function */
export function replaceAll(
  str: string,
  pattern: RegExp | string,
  replacer: (match: string, ...groups: string[]) => string,
): string {
  try {
    const regex = typeof pattern === "string" ? new RegExp(pattern, "g") : new RegExp(pattern.source, pattern.flags + "g");
    return str.replace(regex, replacer as unknown as string);
  } catch {
    return str;
  }
}

/** Split a string by a regex pattern, keeping delimiters */
export function splitByRegex(
  str: string,
  pattern: RegExp | string,
  limit?: number,
): string[] {
  try {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    if (limit !== undefined) {
      return str.split(regex, limit);
    }
    return str.split(regex);
  } catch {
    return [str];
  }
}

/** Check if a string is a valid email address */
export function isValidEmailRegex(email: string): boolean {
  // RFC 5322 compliant simplified
  const pattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return pattern.test(email);
}

/** Check if a string is a valid URL */
export function isValidUrlRegex(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** Check if a string is a valid hex color */
export function isValidHexColor(hex: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(hex);
}

/** Check if a string is a valid RGB/RGBA color */
export function isValidRgbColor(rgb: string): boolean {
  return /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+\s*)?\)$/i.test(rgb);
}

/** Convert glob pattern to regex */
export function globToRegex(glob: string): RegExp {
  let regex = escapeRegexString(glob)
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".")
    .replace(/\./g, "\\.");

  return new RegExp(`^${regex}$`);
}

/** Test a string against a glob pattern */
export function isGlobMatch(str: string, glob: string): boolean {
  const regex = globToRegex(glob);
  return regex.test(str);
}

/** Find all strings in an array that match a glob pattern */
export function filterGlob(
  items: string[],
  glob: string,
): string[] {
  const regex = globToRegex(glob);
  return items.filter((item) => regex.test(item));
}

/** Create a reusable regex with flags */
export function createRegex(
  pattern: string,
  flags = "",
): RegExp {
  return new RegExp(pattern, flags);
}

/** Word boundary regex helper */
export const wordBoundary = /\b/g;

/** Digit regex helper */
export const digitPattern = /\d+/g;

/** Whitespace regex helper */
export const whitespacePattern = /\s+/g;

/** Newline regex helper */
export const newlinePattern = /\n\r?|\r\n?/g;

/** Extract words from a string */
export function extractWords(str: string): string[] {
  return str.match(/[a-zA-Z]+/g) ?? [];
}

/** Extract numbers from a string */
export function extractNumbersRegex(str: string): number[] {
  return (str.match(/-?\d+\.?\d*/g) ?? []).map(Number).filter((n) => !isNaN(n));
}

/** Count occurrences of a pattern in a string */
export function countPattern(str: string, pattern: RegExp | string): number {
  try {
    const regex = typeof pattern === "string" ? new RegExp(pattern, "g") : new RegExp(pattern.source, pattern.flags + "g");
    const matches = str.match(regex);
    return matches?.length ?? 0;
  } catch {
    return 0;
  }
}

/** Remove diacritics from a string */
export function removeDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Simple wildcard matching (* and ? supported) */
export function wildcardMatch(str: string, pattern: string): boolean {
  const regexStr = escapeRegexString(pattern)
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");

  try {
    return new RegExp(`^${regexStr}$`, "i").test(str);
  } catch {
    return false;
  }
}
