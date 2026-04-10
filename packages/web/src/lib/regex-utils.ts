/**
 * Regular expression utilities: fluent regex builder, common pattern library,
 * regex tester, escaping, extraction helpers, named capture groups,
 * replacement templates, performance analysis, and pattern validation.
 */

// --- Types ---

export interface RegexTestResult {
  input: string;
  pattern: string;
  flags: string;
  matches: Array<{ match: string; index: number; groups?: Record<string, string | undefined> }>;
  totalMatches: number;
  execTimeMs: number;
}

export interface RegexPerformance {
  /** Estimated complexity class */
  complexity: "constant" | "linear" | "polynomial" | "exponential" | "unknown";
  /** Potential catastrophic backtracking risk */
  backtrackingRisk: "none" | "low" | "medium" | "high";
  /** Suggestions for optimization */
  suggestions: string[];
}

// --- Regex Builder (Fluent API) ---

/**
 * Fluent regex builder. Chain methods to construct patterns.
 * ```ts
 * const emailPattern = new RegexBuilder()
 *   .startOfLine()
 *   .wordChar().oneOrMore()
 *   .literal("@")
 *   .wordChar().oneOrMore()
 *   .literal(".")
 *   .wordChar().between(2, 4)
 *   .endOfLine()
 *   .build();
 * ```
 */
export class RegexBuilder {
  private parts: string[] = [];
  private flags: string = "";

  /** Set flags on the final regex */
  withFlags(flags: string): this { this.flags = flags; return this; }

  // --- Literals ---
  literal(str: string): this { this.parts.push(escapeRegex(str)); return this; }
  anyOf(chars: string): this { this.parts.push(`[${escapeRegexBracket(chars)}]`); return this; }
  noneOf(chars: string): this { this.parts.push(`[^${escapeRegexBracket(chars)}]`); return this; }

  // --- Character classes ---
  wordChar(): this { this.parts.push("\\w"); return this; }
  digit(): this { this.parts.push("\\d"); return this; }
  whitespace(): this { this.parts.push("\\s"); return this; }
  nonWordChar(): this { this.parts.push("\\W"); return this; }
  nonDigit(): this { this.parts.push("\\D"); return this; }
  nonWhitespace(): this { this.parts.push("\\S"); return this; }
  anyChar(): this { this.parts.push("."); return this; }

  // --- Position anchors ---
  startOfLine(): this { this.parts.push("^"); return this; }
  endOfLine(): this { this.parts.push("$"); return this; }
  wordBoundary(): this { this.parts.push("\\b"); return this; }
  nonWordBoundary(): this { this.parts.push("\\B"); return this; }
  startOfString(): this { this.parts.push("\\A"); return this; }
  endOfString(): this { this.parts.push("\\z"); return this; }

  // --- Quantifiers ---
  zeroOrMore(greedy = true): this { this.parts.push(greedy ? "*" : "*?"); return this; }
  oneOrMore(greedy = true): this { this.parts.push(greedy ? "+" : "+?"); return this; }
  optional(greedy = true): this { this.parts.push(greedy ? "?" : "??"); return this; }
  exactly(n: number): this { this.parts.push(`{${n}}`); return this; }
  between(min: number, max: number): this { this.parts.push(`{${min},${max}}`); return this; }
  atLeast(n: number): this { this.parts.push(`{${n},}`); return this; }
  atMost(n: number): this { this.parts.push(`{0,${n}}`); return this; }

  // --- Groups ---
  group(capture = false): this {
    this.parts.push(capture ? "(" : "(?:");
    return this as unknown as RegexBuilder & { endGroup: () => RegexBuilder };
  }
  namedGroup(name: string): this {
    this.parts.push(`(?<${name}>`);
    return this as unknown as RegexBuilder & { endGroup: () => RegexBuilder };
  }
  lookAhead(pattern: string): this { this.parts.push(`(?=${pattern})`); return this; }
  lookBehind(pattern: string): this { this.parts.push(`(?<=${pattern})`); return this; }
  negativeLookAhead(pattern: string): this { this.parts.push`(?!${pattern})`; return this; }
  negativeLookBehind(pattern: string): this { this.parts.push`(?<!${pattern})`; return this; }
  endGroup(): this { this.parts.push(")"); return this; }

  // --- Alternation ---
  or(alternative: string): this { this.parts.push(`|${alternative}`); return this; }
  either(...alternatives: string[]): this {
    this.parts.push(`(?:${alternatives.join("|")})`);
    return this;
  }

  // --- Backreferences ---
  backref(n: number): this { this.parts.push(`\\${n}`); return this; }
  namedBackref(name: string): this { this.parts.push(`\\k<${name}>`); return this; }

  // --- Build ---
  build(): RegExp {
    return new RegExp(this.parts.join(""), this.flags);
  }

  toString(): string {
    return `/${this.parts.join("")}/${this.flags}`;
  }

  /** Test the built regex against a string */
  test(str: string): boolean {
    return this.build().test(str);
  }

  /** Execute and get all matches */
  matchAll(str: string): Array<{ match: string; index: number; groups?: Record<string, string | undefined> }> {
    const re = this.build();
    const results: Array<{ match: string; index: number; groups?: Record<string, string | undefined> }> = [];
    let m: RegExpExecArray | null;

    if (re.global || re.sticky) {
      while ((m = re.exec(str)) !== null) {
        results.push({ match: m[0], index: m.index, groups: (m as any).groups });
      }
    } else {
      m = re.exec(str);
      if (m) results.push({ match: m[0], index: m.index, groups: (m as any).groups });
    }

    return results;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function escapeRegexBracket(str: string): string {
  return str.replace(/[\]\\^]/g, "\\$&");
}

// --- Common Pattern Library ---

/** Commonly used regex patterns */
export const PATTERNS = {
  // Basic
  email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&/=]*)$/,
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  ipv6: /^(?:(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}|::(?:[a-fA-F0-9]{1,4}:){0,6}[a-fA-F0-9]{1,4}|...)$/,
  ip: /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*(((0x[0-9a-fA-F]{1,4})|([0-9a-fA-F]{1,4}):((0x[0-9a-fA-F]{0,4}:){0,5}(0x[0-9a-fA-F]{0,4}))|(fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+)|(::(ffff(:0{1,4})?:)?((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|([0-9a-fA-F]{1,4}:){1,7}:))\s*$))/,

  // Identifiers
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  uuidV4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  semver: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,

  // Text
  hexColor: /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
  rgbColor: /^rgb\(\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*\)$/i,
  rgbaColor: /^rgba\(\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*,\s*(0?\.\d+|1|0)\s*\)$/i,

  // Phone
  phoneE164: /^\+?[1-9]\d{6,14}$/,
  phoneUS: /^(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/,

  // Credit card
  creditCard: /^\d{13,19}$/,
  visa: /^4\d{12}(\d{3})?$/,
  mastercard: /^5[1-5]\d{14}$/,
  amex: /^3[47]\d{13}$/,

  // Password
  passwordMedium: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*#?&]{8,}$/,

  // Date/Time
  isoDate: /^\d{4}-\d{2}-\d{2}$/,
  isoTime: /^\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/,
  isoDateTime: /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/,

  // Web
  domain: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/,
  hostname: /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z]{2,}$/,
  username: /^[a-zA-Z0-9_-]{3,20}$/,

  // Code
  base64: /^[A-Za-z0-9+/]*={0,2}$/,
  base64Url: /^[A-Za-z0-9_-]*$/,
  hex: /^[0-9a-fA-F]*$/,
  binary: /^[01]*$/,

  // Social
  twitterHandle: /^@?[a-zA-Z0-9_]{1,15}$/,
  githubUsername: /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38}[a-zA-Z0-9])?$/,

  // Geographic
  latitude: /^-?90(\.\d+)?$/,
  longitude: /^-?180(\.\d+)?$/,
  coordinates: /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/,

  // MAC address
  macAddress: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,

  // IBAN
  iban: /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/,

  // Misc
  htmlTag: /^<[a-zA-Z][\w]*.*?>.*?<\/[a-zA-Z][\w]*>|<[a-zA-Z][\w]*.*?\/>/,
  cssSelector: /^([#.]?[\w-]+|\*)?(:?[\w-]+(?:\([^)]*\))?(?:\[[^\]]+\])?)+$/,
  jsonString: /^("(\\.|[^"\\])*"|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?:\s*,\s*(?:"(\\.|[^"\\])*"|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?))*$/,
} as const;

// --- Testing Utilities ---

/**
 * Test a regex pattern against a string with detailed results.
 */
export function testRegex(
  pattern: string | RegExp,
  input: string,
  options?: { global?: boolean; caseInsensitive?: boolean; multiline?: boolean },
): RegexTestResult {
  const source = typeof pattern === "string" ? pattern : pattern.source;
  const baseFlags = typeof pattern === "string" ? "" : (pattern.flags ?? "");

  const flagOptions = [
    options?.global ? "g" : "",
    options?.caseInsensitive ? "i" : "",
    options?.multiline ? "m" : "",
  ].join("");

  const flags = flagOptions || baseFlags || "";
  const startTime = performance.now();

  try {
    const re = new RegExp(source, flags);
    const matches: RegexTestResult["matches"] = [];

    if (re.global || re.sticky) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(input)) !== null) {
        matches.push({
          match: m[0],
          index: m.index,
          groups: (m as any).groups ?? undefined,
        });
      }
    } else {
      const m = re.exec(input);
      if (m) {
        matches.push({
          match: m[0],
          index: m.index,
          groups: (m as any).groups ?? undefined,
        });
      }
    }

    const execTimeMs = performance.now() - startTime;

    return {
      input,
      pattern: source,
      flags,
      matches,
      totalMatches: matches.length,
      execTimeMs,
    };
  } catch (error) {
    return {
      input,
      pattern: source,
      flags,
      matches: [],
      totalMatches: 0,
      execTimeMs: performance.now() - startTime,
    };
  }
}

/** Quick check if a string matches a pattern */
export function matchesPattern(input: string, pattern: string | RegExp): boolean {
  try {
    const re = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    return re.test(input);
  } catch {
    return false;
  }
}

/** Extract all matching substrings */
export function extractAll(input: string, pattern: string | RegExp): string[] {
  const result = testRegex(pattern, input, { global: true });
  return result.matches.map((m) => m.match);
}

/** Extract first matching substring */
export function extractFirst(input: string, pattern: string | RegExp): string | null {
  const result = testRegex(pattern, input);
  return result.matches.length > 0 ? result.matches[0].match : null;
}

/** Replace all matches using a replacer function */
export function replaceWith(
  input: string,
  pattern: string | RegExp,
  replacer: (match: string, ...groups: string[]) => string,
): string {
  const source = typeof pattern === "string" ? pattern : pattern.source;
  const re = new RegExp(source, typeof pattern === "string" ? "g" : (pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"));
  return input.replace(re, replacer as any);
}

/** Replace using template string with capture group references */
export function replaceTemplate(
  input: string,
  pattern: string | RegExp,
  template: string,
): string {
  const source = typeof pattern === "string" ? pattern : pattern.source;
  const re = new RegExp(source, typeof pattern === "string" ? "g" : (pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"));
  return input.replace(re, template);
}

// --- Performance Analysis ---

/**
 * Analyze a regex for potential performance issues.
 */
export function analyzePerformance(pattern: string): RegexPerformance {
  const suggestions: string[] = [];

  // Check for nested quantifiers (catastrophic backtracking risk)
  const nestedQuantifiers = /\(+[^)]*[+*][+*][^)]*\)/g;
  if (nestedQuantifiers.test(pattern)) {
    suggestions.push("Nested quantifiers detected - may cause catastrophic backtracking");
  }

  // Check for alternation with overlapping prefixes
  const overlappingAlternation = /\|[^|]+\|[^|]*\1/g;
  if (overlappingAlternation.test(pattern)) {
    suggestions.push("Alternating branches may have overlapping content - consider refactoring");
  }

  // Check for unbounded quantifiers
  if (/(?:\+|\*)\+/.test(pattern) || /(?:\+|\*)\*/.test(pattern)) {
    suggestions.push("Multiple consecutive unbounded quantifiers - add bounds");
  }

  // Check for dot-star patterns
  if (/^[^.]*\.\*[^$]*$/.test(pattern)) {
    suggestions.push("Dot-star pattern can be slow on large inputs - use [^...] instead when possible");
  }

  // Check for optional groups inside quantified groups
  const optionalInQuantified = /\([^)]+\)?[+*]/g;
  if (optionalInQuantified.test(pattern)) {
    suggestions.push("Optional group inside quantifier - may cause exponential time");
  }

  // Determine complexity
  let complexity: RegexPerformance["complexity"] = "constant";
  let backtrackingRisk: RegexPerformance["backtrackingRisk"] = "none";

  if (suggestions.length >= 3) {
    complexity = "exponential";
    backtrackingRisk = "high";
  } else if (suggestions.length >= 2) {
    complexity = "polynomial";
    backtrackingRisk = "medium";
  } else if (suggestions.length >= 1) {
    complexity = "linear";
    backtrackingRisk = "low";
  }

  // Simple heuristic: longer patterns with many alternations are more complex
  const altCount = (pattern.match(/\|/g) || []).length;
  const groupCount = (pattern.match(/\(/g) || []).length;
  if (altCount > 5 && groupCount > 3 && complexity === "constant") {
    complexity = "linear";
  }

  return { complexity, backtrackingRisk, suggestions };
}

// --- Escaping ---

/** Escape special regex characters in a string so it can be used as a literal */
export function escapeRegexChars(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Unescape a previously escaped regex string */
export function unescapeRegexChars(str: string): string {
  return str.replace(/\\(.)/g, "$1");
}
