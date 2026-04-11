/**
 * Pattern Matching & Regex Utilities: Enhanced regex builders,
 * pattern matching combinators, wildcard/glob patterns,
 * string pattern validation, regex test helpers, and pattern DSL.
 */

// --- Regex Builders ---

/** Escape all special regex characters in a string */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a regex that matches any of the given strings (word boundaries optional) */
export function matchAnyOf(strings: string[], options?: { wholeWord?: boolean; caseInsensitive?: boolean }): RegExp {
  const flags = options?.caseInsensitive ? "gi" : "g";
  const escaped = strings.map(escapeRegex);
  const pattern = options?.wholeWord
    ? `(?:\\b(?:${escaped.join("|")})\\b)`
    : `(?:${escaped.join("|")})`;
  return new RegExp(pattern, flags);
}

/** Build a regex that matches a value between min and max occurrences */
export function repeatPattern(pattern: string, min: number, max?: number): string {
  if (max === undefined || max === min) return `${pattern}{${min}}`;
  return `${pattern}{${min},${max}}`;
}

/** Create a regex from a simple pattern DSL:
 * - "word" → exact match
 * - ":word" → capture group
 * - "*" → .*
 * - "?" → .
 * - "[digits]" → [0-9]
 * - "{alpha}" → [a-zA-Z]
 */
export function buildPattern(parts: Array<{ type: "literal" | "wildcard" | "optional" | "digits" | "alpha" | "any"; value?: string }>): RegExp {
  let source = "";
  for (const part of parts) {
    switch (part.type) {
      case "literal":  source += escapeRegex(part.value ?? ""); break;
      case "wildcard": source += ".*"; break;
      case "optional": source += "."; break;
      case "digits":   source += "\\d"; break;
      case "alpha":    source += "[a-zA-Z]"; break;
      case "any":      source += "."; break;
    }
  }
  return new RegExp(`^${source}$`);
}

// --- Wildcard / Glob Patterns ---

/** Convert a glob/wildcard pattern to regex:
 * * matches any characters (except / by default)
 * ? matches single character (except / by default)
 * ** matches across directory boundaries
 */
export function globToRegex(glob: string, options?: { extended?: boolean; globstar?: boolean }): RegExp {
  const { extended = true, globstar = true } = options ?? {};
  let re = "";

  const chars = [...glob];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    switch (ch) {
      case "*":
        if (globstar && chars[i + 1] === "*") {
          re += "(?:[^/]*(?:/.*)?)?";
          i++; // skip second *
        } else {
          re += "[^/]*";
        }
        break;
      case "?": re += "[^/]"; break;
      case ".": re += "\\."; break;
      case "+": re += "\\+"; break;
      case "(":
      case ")":
      case "[": re += "\\" + ch; break;
      case "!":
        if (extended && i === 0) { re += "(?!"; continue; }
        re += "\\!"; break;
      case "@":
      case "+":
        if (extended) { re += "\\" + ch; break; }
        // fallthrough
      default: re += escapeRegex(ch);
    }
  }

  return new RegExp(`^${re}$`);
}

/** Test a string against a glob pattern */
export function globMatch(str: string, pattern: string, options?: { extended?: boolean; globstar?: boolean }): boolean {
  return globToRegex(pattern, options).test(str);
}

/** Match multiple glob patterns against a string */
export function multiGlobMatch(str: string, patterns: string[]): boolean {
  return patterns.some((p) => globMatch(str, p));
}

// --- Pattern Match Combinators ---

/** Result of a pattern match attempt */
export interface MatchResult<T = unknown> {
  matched: boolean;
  value?: T;
  rest?: string;
  captures?: string[];
}

/** Try to match a literal prefix */
export function matchLiteral(pattern: string): (input: string) => MatchResult<string> {
  return (input: string) => {
    if (input.startsWith(pattern)) {
      return { matched: true, value: pattern, rest: input.slice(pattern.length) };
    }
    return { matched: false };
  };
}

/** Try to match a regex pattern */
export function matchRegex(regex: RegExp): (input: string) => MatchResult<string[]> {
  return (input: string) => {
    const m = regex.exec(input);
    if (m) {
      return { matched: true, value: m[0], captures: m.slice(1), rest: input.slice(m[0].length) };
    }
    return { matched: false };
  };
}

/** Compose multiple pattern matchers sequentially */
export function sequence<T>(
  ...matchers: Array<(input: string) => MatchResult<T>>
): (input: string) => MatchResult<T> {
  return (input: string) => {
    let current = input;
    const allCaptures: string[] = [];
    for (const matcher of Matchers) {
      const result = matcher(current);
      if (!result.matched) return { matched: false };
      if (result.captures) allCaptures.push(...result.captures);
      current = result.rest ?? "";
    }
    return { matched: true, captures: allCaptures, rest: current };
  };
}

/** Try each matcher in order, return first success */
export function choice<T>(
  ...matchers: Array<(input: string) => MatchResult<T>>
): (input: string) => MatchResult<T> {
  return (input: string) => {
    for (const matcher of Matchers) {
      const result = matcher(input);
      if (result.matched) return result;
    }
    return { matched: false };
  };
}

/** Repeat a matcher zero or more times */
export function zeroOrMore<T>(matcher: (input: string) => MatchResult<T>): (input: string) => MatchResult<T[]> {
  return (input: string) => {
    const results: T[] = [];
    let current = input;
    while (true) {
      const result = matcher(current);
      if (!result.matched) break;
      results.push(result.value as T);
      current = result.rest ?? "";
    }
    return { matched: true, value: results, rest: current };
  };
}

/** Repeat a matcher one or more times */
export function oneOrMore<T>(matcher: (input: string) => MatchResult<T>): (input: string) => MatchResult<T[]> {
  const zom = zeroOrMore(matcher);
  return (input: string) => {
    const result = zom(input);
    if (result.matched && result.value!.length > 0) return result;
    return { matched: false };
  };
}

/** Optionally match a pattern */
export function optional<T>(matcher: (input: string) => MatchResult<T>): (input: string) => MatchResult<T | undefined> {
  return (input: string) => {
    const result = matcher(input);
    if (result.matched) return result;
    return { matched: true, value: undefined, rest: input };
  };
}

// --- Validation Patterns ---

/** Common regex patterns for validation */
export const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b(\/[-a-zA-Z0-9@:%_+.~#?&=]*)*$/,
  ipv4: /^(\d{1,3}\.){3}\d{1,3}$/,
  ipv6: /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}|::1)$/,
  mac: /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/,
  hex: /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/i,
  base64: /^[A-Za-z0-9+/]*={0,2}$/,
  base64url: /^[A-Za-z0-9_-]*$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  slug: /^[a-z0-9](?:-[a-z0-9]+)*$/,
  semver: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:[0-9a-zA-Z-]+))?$/,
  username: /^[a-zA-Z][a-zA-Z0-9_-]{2,19}$/,
  password_min8: /.{8,}/,
  creditCard: /^\d{13,19}$/,
  phone_e164: /^\+?[1-9]\d{1,14}$/,
  htmlTag: /^<[a-zA-Z][^>]*>/,
  cssColor: /^(#[0-9a-fA-F]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|hsl\([^)]+\)|[a-z]+)$/i,
  dateISO: /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/,
  time24h: /^(?:[01]?\d|2[0-3]):[0-5]\d$/,
  latitude: /^-?([1-8]?\d(\.\d+)?|90(\.0+)?)$/,
  longitude: /^-?(?:180(\.0+)?|1[0-7]\d(\.\d+)?|0?\d{1,2}(\.\d+)?)$/,
  bitcoinAddress: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
  ethereumAddress: /^0x[a-fA-F0-9]{40}$/,
  hashSha256: /^[a-fA-F0-9]{64}$/,
  hashMd5: /^[a-fA-F0-9]{32}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  ascii: /^[\x00-\x7F]*$/,
  printable: /^[\x20-\x7E\t\r\n]+$/,
  digits: /^\d+$/,
  float: /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/,
  safeFilename: /^[a-zA-Z0-9_.\-]+$/,
  version: /^v?\d+(?:\.\d+)*(?:-[a-zA-Z][\w.-]*)?$/i,
} as const;

/** Test a string against a named pattern */
export function testPattern(name: keyof typeof PATTERNS, str: string): boolean {
  const regex = PATTERNS[name];
  if (!regex) throw new Error(`Unknown pattern: ${name}`);
  return regex.test(str);
}

/** Extract matches from a string using a named pattern */
export function extractPattern(name: keyof typeof PATTERNS, str: string): RegExpExecArray | null {
  const regex = PATTERNS[name];
  if (!regex) throw new Error(`Unknown pattern: ${name}`);
  // Need global flag for exec loop
  const gRegex = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
  return gRegex.exec(str);
}

// --- String Search Helpers ---

/** Find all overlapping matches of a pattern in a string */
export function findAllOverlapping(str: string, pattern: string | RegExp): Array<{ index: number; match: string }> {
  const regex = typeof pattern === "string" ? new RegExp(escapeRegex(pattern), "g") : new RegExp(pattern.source, "g");
  const results: Array<{ index: number; match: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(str)) !== null) {
    results.push({ index: match.index, match: match[0] });
    // Advance by one character for overlapping matches
    regex.lastIndex = match.index + 1;
  }

  return results;
}

/** Replace all occurrences with a replacer function that receives match info */
export function replaceWithInfo(
  str: string,
  pattern: string | RegExp,
  replacer: (match: string, index: number, groups: string[]) => string,
): string {
  const regex = typeof pattern === "string" ? new RegExp(escapeRegex(pattern), "g") : new RegExp(pattern.source, "g");
  return str.replace(regex, (...args) => {
    const full = args[0]!;
    const offset = args[args.length - 2];
    const groups = args.slice(1, -2);
    return replacer(full, offset, groups);
  });
}

/** Count non-overlapping occurrences of a pattern */
export function countOccurrences(str: string, pattern: string | RegExp): number {
  const regex = typeof pattern === "string" ? new RegExp(escapeRegex(pattern), "g") : new RegExp(pattern.source, "g");
  const matches = str.match(regex);
  return matches ? matches.length : 0;
}
