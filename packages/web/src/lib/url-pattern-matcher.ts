/**
 * URL Pattern Matcher: Advanced URL routing/matching with parameter extraction,
 * wildcard support, regex compilation, query string matching, hash routing,
 * optional segments, RESTful resource patterns, and route group management.
 * Compatible with and extends the URLPattern web API.
 */

// --- Types ---

export interface RouteMatch {
  matched: boolean;
  params: Record<string, string>;
  queryParams: Record<string, string>;
  hash: string;
  pathname: string;
  pattern: string;
  score: number;       // Specificity score (higher = more specific)
  remaining: string;   // Unmatched portion (for partial matching)
}

export interface RoutePattern {
  /** Original pattern string */
  pattern: string;
  /** Compiled regex (internal) */
  regex: RegExp;
  /** Parameter names in order */
  paramNames: string[];
  /** Optional parameter names */
  optionalParams: Set<string>;
  /** Wildcard segments */
  hasWildcard: boolean;
  /** Whether this is an exact match or prefix match */
  exact: boolean;
  /** HTTP methods this pattern responds to (if applicable) */
  methods?: string[];
  /** Metadata attached to the route */
  meta?: Record<string, unknown>;
  /** Priority for sorting (higher = checked first) */
  priority?: number;
}

export interface MatchOptions {
  /** Require exact path match (no trailing segments) */
  exact?: boolean;
  /** Case-sensitive matching (default: false for paths) */
  caseSensitive?: boolean;
  /** Include query parameters in matching */
  matchQuery?: Record<string, string | RegExp>;
  /** Include hash in matching */
  matchHash?: string | RegExp;
  /** Base path to strip before matching */
  basePath?: string;
  /** Decode URI components in params */
  decodeParams?: boolean;
}

export interface RouterConfig {
  /** Default matching options */
  defaults?: MatchOptions;
  /** Strict trailing slash handling */
  strictTrailingSlash?: boolean;
  /** Auto-redirect trailing slashes */
  redirectTrailingSlash?: boolean;
  /** 404 handler */
  onNotFound?: (url: string) => void;
}

// --- Pattern Compilation ---

/**
 * Compile a URL pattern string into a RoutePattern object.
 *
 * Supported syntax:
 * - `/users/:id` — named parameter
 * - `/posts/:id/comments/:commentId` — multiple params
 * - `/files/*` — wildcard (matches everything after)
 * - `/api/v:version` — inline parameter
 * - `/posts/:id?` — optional parameter
 * - `/posts/:id(\\d+)` — parameter with regex constraint
 * - `/static/:path*` — wildcard parameter (greedy)
 * - `/search/:q+` — one-or-more segment parameter
 */
export function compilePattern(pattern: string, options?: { exact?: boolean; methods?: string[] }): RoutePattern {
  const exact = options?.exact ?? !pattern.includes("*");
  const paramNames: string[] = [];
  const optionalParams = new Set<string>();
  let hasWildcard = false;

  // Normalize: ensure leading slash
  let normalized = pattern.replace(/^\//, "");

  // Build regex from pattern segments
  const segments = normalized.split("/");
  const regexParts: string[] = ["^"];

  for (const segment of segments) {
    if (!segment || segment === "") continue;

    regexParts.push("\\/");

    if (segment === "*") {
      // Single-segment wildcard
      regexParts.push("([^\\/]+)");
      hasWildcard = true;
    } else if (segment === "**") {
      // Multi-segment wildcard (greedy)
      regexParts.push("(.*)");
      hasWildcard = true;
    } else if (segment.endsWith("*") && segment.length > 1) {
      // Wildcard parameter :name*
      const name = segment.slice(0, -1);
      if (name.startsWith(":")) {
        paramNames.push(name.slice(1));
        regexParts.push("(.*)");
        hasWildcard = true;
      } else {
        // Literal prefix + wildcard
        regexParts.push(escapeRegex(name) + "(.*)");
        hasWildcard = true;
      }
    } else if (segment.endsWith("?") && segment.startsWith(":")) {
      // Optional parameter :name?
      const name = segment.slice(1, -1);
      paramNames.push(name);
      optionalParams.add(name);
      regexParts.push(`([^\\/]*?)`);
    } else if (segment.endsWith("+") && segment.startsWith(":")) {
      // One-or-more parameter :name+
      const name = segment.slice(1, -1);
      paramNames.push(name);
      regexParts.push("((?:[^\\/]+\\/)+[^\\/]+)");
    } else if (segment.startsWith(":")) {
      // Named parameter with optional constraint
      const paramMatch = segment.match(/^:(\w+)(?:\((.+)\))?$/);
      if (paramMatch) {
        paramNames.push(paramMatch[1]);
        regexParts.push(paramMatch[2] ? `(${paramMatch[2]})` : "([^\\/]+)");
      } else {
        // Fallback: treat as literal starting with colon
        regexParts.push(escapeRegex(segment));
      }
    } else {
      // Literal segment
      regexParts.push(escapeRegex(segment));
    }
  }

  if (exact) {
    regexParts.push("$");
  } else {
    // Allow trailing slash optionally
    regexParts.push("(?:\\/)?");
  }

  const regexStr = regexParts.join("");
  const regex = new RegExp(regexStr);

  return {
    pattern,
    regex,
    paramNames,
    optionalParams,
    hasWildcard,
    exact,
    methods: options?.methods,
  };
}

// --- Matching ---

/**
 * Test a URL against a compiled pattern.
 */
export function matchUrl(url: string, pattern: RoutePattern, options: MatchOptions = {}): RouteMatch {
  const parsed = parseUrlForMatching(url, options);
  const { pathname } = parsed;

  // Apply base path stripping
  let testPath = pathname;
  if (options.basePath) {
    const bp = options.basePath.replace(/\/$/, "");
    if (testPath.startsWith(bp)) {
      testPath = testPath.slice(bp.length) || "/";
    } else {
      return createNoMatch(pattern.pattern, parsed);
    }
  }

  // Try regex match
  const regex = options.caseSensitive ? pattern.regex : new RegExp(pattern.regex.source, "i");
  const match = regex.exec(testPath);

  if (!match) {
    return createNoMatch(pattern.pattern, parsed);
  }

  // Extract params
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.paramNames.length; i++) {
    const name = pattern.paramNames[i]!;
    const value = match[i + 1];
    if (value !== undefined) {
      params[name] = options.decodeParams !== false ? decodeURIComponent(value) : value;
    }
  }

  // Check query params
  let queryParams = parsed.queryParams;
  if (options.matchQuery) {
    const queryMatch = matchQueryParams(queryParams, options.matchQuery);
    if (!queryMatch.matched) {
      return createNoMatch(pattern.pattern, parsed);
    }
  }

  // Check hash
  if (options.matchHash) {
    const hashMatch = typeof options.matchHash === "string"
      ? parsed.hash === options.matchHash
      : options.matchHash.test(parsed.hash);
    if (!hashMatch) {
      return createNoMatch(pattern.pattern, parsed);
    }
  }

  // Calculate specificity score
  const score = calculateSpecificity(pattern, params);

  // Calculate remaining (for non-exact matches)
  const remaining = match[0]?.length ?? 0 < testPath.length
    ? testPath.slice(match[0]?.length ?? 0)
    : "";

  return {
    matched: true,
      params,
      queryParams,
      hash: parsed.hash,
      pathname,
      pattern: pattern.pattern,
      score,
      remaining,
    };
}

/**
 * Quick match: compile + match in one call.
 */
export function quickMatch(url: string, pattern: string, options?: MatchOptions): RouteMatch | null {
  const compiled = compilePattern(pattern);
  const result = matchUrl(url, compiled, options);
  return result.matched ? result : null;
}

// --- Router Class ---

/**
 * URL Router with pattern registration, priority-based matching, and
 * middleware-style chain processing.
 */
export class UrlRouter {
  private routes: RoutePattern[] = [];
  private config: RouterConfig;
  private cache = new Map<string, { pattern: RoutePattern; match: RouteMatch }>();

  constructor(config: RouterConfig = {}) {
    this.config = config;
  }

  /** Register a route pattern */
  add(pattern: string, options?: { priority?: number; methods?: string[]; meta?: Record<string, unknown> }): UrlRouter {
    const compiled = compilePattern(pattern, {
      exact: this.config.strictTrailingSlash ?? false,
      methods: options?.methods,
    });
    compiled.priority = options?.priority ?? this.routes.length;
    compiled.meta = options?.meta;
    this.routes.push(compiled);
    this.cache.clear(); // Invalidate cache
    return this;
  }

  /** Register multiple routes at once */
  register(routes: Array<{ pattern: string; priority?: number; meta?: Record<string, unknown> }>): UrlRouter {
    for (const r of routes) this.add(r.pattern, r);
    return this;
  }

  /**
   * Find the best matching route for a URL.
   * Returns null if no route matches.
   */
  match(url: string, options?: MatchOptions): RouteMatch | null {
    const mergedOptions = { ...this.config.defaults, ...options };
    const cacheKey = `${url}:${JSON.stringify(mergedOptions)}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) return cached.match.matched ? cached.match : null;

    let bestMatch: RouteMatch | null = null;
    let bestScore = -1;

    // Sort by priority (descending), then by specificity
    const sortedRoutes = [...this.routes].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const pattern of sortedRoutes) {
      const result = matchUrl(url, pattern, mergedOptions);
      if (result.matched && result.score > bestScore) {
        bestMatch = result;
        bestScore = result.score;

        // If we have an exact match with high specificity, stop early
        if (pattern.exact && result.remaining === "" && bestScore >= 100) break;
      }
    }

    if (!bestMatch && this.config.onNotFound) {
      this.config.onNotFound(url);
    }

    // Cache result
    if (this.cache.size < 1000) {
      this.cache.set(cacheKey, { pattern: bestMatch ? this.routes.find((r) => r.pattern === bestMatch!.pattern)! : this.routes[0]!, match: bestMatch ?? createNoMatch("", parseUrlForMatching(url)) });
    }

    return bestMatch;
  }

  /**
   * Find ALL matching routes (not just the best).
   */
  matchAll(url: string, options?: MatchOptions): RouteMatch[] {
    const mergedOptions = { ...this.config.defaults, ...options };
    const results: RouteMatch[] = [];

    for (const pattern of this.routes) {
      const result = matchUrl(url, pattern, mergedOptions);
      if (result.matched) results.push(result);
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /** Remove a registered pattern */
  remove(pattern: string): boolean {
    const idx = this.routes.findIndex((r) => r.pattern === pattern);
    if (idx === -1) return false;
    this.routes.splice(idx, 1);
    this.cache.clear();
    return true;
  }

  /** Clear all registered routes */
  clear(): void {
    this.routes = [];
    this.cache.clear();
  }

  /** Get all registered patterns */
  getPatterns(): string[] {
    return this.routes.map((r) => r.pattern);
  }

  /** Get route count */
  size(): number {
    return this.routes.length;
  }
}

// --- Utility Functions ---

function parseUrlForMatching(url: string, options: MatchOptions = {}): {
  pathname: string;
  queryParams: Record<string, string>;
  hash: string;
} {
  try {
    const parsed = new URL(url, window.location.origin);
    return {
      pathname: parsed.pathname,
      queryParams: Object.fromEntries(parsed.searchParams.entries()),
      hash: parsed.hash.slice(1),
    };
  } catch {
    // Relative URL or invalid — parse manually
    const qIdx = url.indexOf("?");
    const hIdx = url.indexOf("#");
    const pathEnd = qIdx !== -1 ? qIdx : hIdx !== -1 ? hIdx : url.length;
    const pathname = url.slice(0, pathEnd);
    const queryString = qIdx !== -1 ? url.slice(qIdx + 1, hIdx !== -1 ? hIdx : undefined) : "";
    const hash = hIdx !== -1 ? url.slice(hIdx + 1) : "";

    const queryParams: Record<string, string> = {};
    if (queryString) {
      for (const pair of queryString.split("&")) {
        const [key, val] = pair.split("=");
        if (key) queryParams[decodeURIComponent(key)] = decodeURIComponent(val ?? "");
      }
    }

    return { pathname, queryParams, hash };
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchQueryParams(
  actual: Record<string, string>,
  expected: Record<string, string | RegExp>,
): { matched: boolean } {
  for (const [key, value] of Object.entries(expected)) {
    const actualValue = actual[key];
    if (actualValue === undefined) return { matched: false };
    if (value instanceof RegExp) {
      if (!value.test(actualValue)) return { matched: false };
    } else if (actualValue !== value) {
      return { matched: false };
    }
  }
  return { matched: true };
}

function calculateSpecificity(pattern: RoutePattern, _params: Record<string, string>): number {
  let score = 0;

  // Static segments are most specific
  const staticSegments = pattern.pattern.split("/").filter(
    (s) => s && !s.startsWith(":") && s !== "*" && s !== "**",
  ).length;
  score += staticSegments * 100;

  // Named params are next
  score += pattern.paramNames.length * 10;

  // Exact matches beat prefix matches
  if (pattern.exact) score += 5;

  // Fewer wildcards = more specific
  if (!pattern.hasWildcard) score += 3;

  // Optional params reduce specificity slightly
  score -= pattern.optionalParams.size * 1;

  return Math.max(0, score);
}

function createNoMatch(pattern: string, parsed: { pathname: string; queryParams: Record<string, string>; hash: string }): RouteMatch {
  return {
    matched: false,
    params: {},
    queryParams: parsed.queryParams,
    hash: parsed.hash,
    pathname: parsed.pathname,
    pattern,
    score: 0,
    remaining: "",
  };
}

// --- Path Generation ---

/** Generate a URL from a pattern and params (reverse routing) */
export function generatePath(pattern: string, params: Record<string, string> = {}, options?: { encode?: boolean }): string {
  const encode = options?.encode !== false;

  return pattern.replace(/:(\w+)(?:\(.+?\))?(\*|\+|\?)?/g, (_, name, _constraint, modifier) => {
    const value = params[name];
    if (value === undefined) throw new Error(`Missing required param: ${name}`);
    return encode ? encodeURIComponent(value) : value;
  }).replace(/\*\*/g, (_match) => {
    // Replace ** with the value of the last wildcard param
    const keys = Object.keys(params).filter((k) => !pattern.includes(`:${k}`));
    return keys.map((k) => encode ? encodeURIComponent(params[k]!) : params[k]).join("/");
  });
}

/** Validate that params satisfy a pattern's requirements */
export function validateParams(pattern: string, params: Record<string, string>): {
  valid: boolean;
  missing: string[];
  extra: string[];
} {
  const requiredParams = pattern.match(/:(\w+)(?![*+?])/g)?.map((p) => p.slice(1)) ?? [];
  const optionalParams = pattern.match(/:(\w+)\?/g)?.map((p) => p.slice(1, -1)) ?? [];

  const missing = requiredParams.filter((p) => !optionalParams.includes(p) && !(p in params));
  const providedKeys = new Set(Object.keys(params));
  const allParamNames = pattern.match(/:(\w+)/g)?.map((p) => p.slice(1)) ?? [];
  const extra = [...providedKeys].filter((k) => !allParamNames.includes(k));

  return { valid: missing.length === 0, missing, extra };
}
