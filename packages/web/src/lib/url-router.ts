/**
 * URL Router: Client-side routing with History API, route matching,
 * query parsing, params extraction, guards, lazy loading,
 * nested routes, redirects, scroll restoration, and code splitting.
 */

// --- Types ---

export type RouteMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "*" | "ALL";

export interface RouteParams {
  [key: string]: string | undefined;
}

export interface QueryParams {
  [key: string]: string | string[] | undefined;
}

export interface RouteMatch {
  /** Matched route definition */
  route: RouteDefinition;
  /** Extracted path parameters */
  params: RouteParams;
  /** Parsed query parameters */
  query: QueryParams;
  /** Full matched path */
  path: string;
  /** Hash fragment */
  hash: string;
  /** Whether this is an exact match or prefix match */
  isExact: boolean;
  /** Score for sorting multiple matches */
  score: number;
}

export interface RouteDefinition {
  /** Path pattern (e.g., "/users/:id", "/files/*path") */
  path: string;
  /** HTTP method filter (for API-like routing) */
  method?: RouteMethod | RouteMethod[];
  /** Handler function called on match */
  handler: (match: RouteMatch) => void | Promise<void>;
  /** Child routes (nested) */
  children?: RouteDefinition[];
  /** Route metadata */
  meta?: Record<string, unknown>;
  /** Display name */
  name?: string;
  /** Guard function — return false to block navigation */
  guard?: (match: RouteMatch, from?: RouteMatch) => boolean | Promise<boolean>;
  /** Redirect to another path */
  redirect?: string;
  /** Lazy-load handler (code splitting) */
  loader?: () => Promise<{ default: (match: RouteMatch) => void }>;
  /** Layout component wrapper (for SPA frameworks) */
  layout?: unknown;
  /** Page title template */
  title?: string | ((params: RouteParams) => string);
  /** Scroll position behavior */
  scrollBehavior?: "restore" | "top" | "preserve";
  /** Transition name for animations */
  transition?: string;
  /** Priority for sorting (higher = more specific) */
  priority?: number;
}

export interface NavigationResult {
  success: boolean;
  match: RouteMatch | null;
  from: RouteMatch | null;
  to: RouteMatch | null;
  redirectedFrom?: string;
  error?: Error;
}

export interface RouterState {
  currentPath: string;
  currentMatch: RouteMatch | null;
  previousMatch: RouteMatch | null;
  historyIndex: number;
  historyLength: number;
  isNavigating: boolean;
  pendingNavigation: NavigationResult | null;
}

export interface RouterConfig {
  /** Base path for all routes (default: "/") */
  basePath?: string;
  /** Use hash-based routing fallback (default: false) */
  useHash?: boolean;
  /** Enable HTML5 History API (default: true) */
  useHistory?: boolean;
  /** Scroll restoration mode (default: "restore") */
  scrollMode?: "restore" | "top" | "preserve";
  /** Global navigation guard */
  beforeNavigate?: (to: RouteMatch, from: RouteMatch | null) => boolean | Promise<boolean>;
  /** After navigation hook */
  afterNavigate?: (result: NavigationResult) => void;
  /** On 404 / no match handler */
  onNotFound?: (path: string) => void;
  /** On error during navigation */
  onError?: (error: Error, match: RouteMatch) => void;
  /** Query string parsing mode */
  queryMode?: "loose" | "strict";
  /** Case-sensitive paths (default: false) */
  caseSensitive?: boolean;
  /** Trailing slash handling: "add" | "remove" | "keep" */
  trailingSlash?: "add" | "remove" | "keep";
  /** Maximum redirect depth to prevent loops */
  maxRedirects?: number;
}

// --- URL Utilities ---

/** Parse query string into object */
export function parseQueryString(query: string): QueryParams {
  const params: QueryParams = {};
  if (!query || query.length === 0) return params;

  const search = query.startsWith("?") ? query.slice(1) : query;
  const pairs = search.split("&");

  for (const pair of pairs) {
    if (!pair) continue;
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) {
      params[decodeURIComponent(pair)] = "";
      continue;
    }
    const key = decodeURIComponent(pair.slice(0, eqIdx));
    const value = decodeURIComponent(pair.slice(eqIdx + 1));

    if (key in params) {
      const existing = params[key];
      params[key] = Array.isArray(existing)
        ? [...existing, value]
        : [existing as string, value];
    } else {
      params[key] = value;
    }
  }

  return params;
}

/** Serialize object back to query string */
export function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v ?? ""))}`);
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/** Join path segments safely */
export function joinPath(...segments: string[]): string {
  let result = segments
    .filter((s) => s && s.length > 0)
    .map((s) => s.replace(/^\/+|\/+$/g, ""))
    .join("/");
  result = "/" + result;
  // Avoid double slash at start
  return result.replace(/\/+/g, "/");
}

/** Normalize a path (handle trailing slashes, etc.) */
export function normalizePath(path: string, trailingSlash: "add" | "remove" | "keep" = "keep"): string {
  let normalized = path;

  // Decode then re-encode to normalize
  try {
    normalized = decodeURIComponent(normalized);
    normalized = encodeURIComponent(normalized).replace(/%2F/gi, "/");
  } catch {
    // Keep as-is if encoding fails
  }

  switch (trailingSlash) {
    case "add":
      if (!normalized.endsWith("/") && normalized !== "/") normalized += "/";
      break;
    case "remove":
      normalized = normalized.replace(/\/+$/, "") || "/";
      break;
  }

  return normalized;
}

// --- Path Matching ---

interface PathSegment {
  literal: string;       // Static part
  param: string | null;  // Param name (:id) or wildcard (*name)
  wildcard: boolean;
  optional: boolean;
}

function parsePattern(pattern: string): { segments: PathSegment[]; regex: RegExp; paramNames: string[] } {
  const segments: PathSegment[] = [];
  const paramNames: string[] = [];

  // Split pattern into segments
  const parts = pattern.split("/").filter(Boolean);

  for (const part of parts) {
    if (part.startsWith(":")) {
      const name = part.slice(1);
      const optional = name.endsWith("?");
      paramNames.push(optional ? name.slice(0, -1) : name);
      segments.push({ literal: "", param: optional ? name.slice(0, -1) : name, wildcard: false, optional });
    } else if (part === "*") {
      paramNames.push("wildcard");
      segments.push({ literal: "", param: "wildcard", wildcard: true, optional: false });
    } else if (part.startsWith("*")) {
      const name = part.slice(1);
      paramNames.push(name);
      segments.push({ literal: "", param: name, wildcard: true, optional: false });
    } else if (part.startsWith("(") && part.endsWith(")")) {
      // Regex segment
      segments.push({ literal: part.slice(1, -1), param: null, wildcard: false, optional: false });
    } else {
      segments.push({ literal: part, param: null, wildcard: false, optional: false });
    }
  }

  // Build regex
  let regexStr = "^";
  for (const seg of segments) {
    regexStr += "/";
    if (seg.wildcard) {
      regexStr += "(.*)";
    } else if (seg.param) {
      regexStr += seg.optional ? "([^/]*)?" : "([^/]+)";
    } else if (seg.literal.startsWith("(")) {
      regexStr += seg.literal;
    } else {
      regexStr += escapeRegex(seg.literal);
    }
  }
  // Allow trailing slash optionally
  regexStr += "/?$";

  return {
    segments,
    regex: new RegExp(regexStr),
    paramNames,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- Router ---

export class UrlRouter {
  private config: Required<RouterConfig>;
  private routes: RouteDefinition[] = [];
  private state: RouterState;
  private listeners = new Set<(state: RouterState) => void>();
  private popStateHandler: ((e: PopStateEvent) => void) | null = null;
  private hashChangeHandler: (() => void) | null = null;
  private scrollPositions = new Map<string, { x: number; y: number }>();
  private redirectCount = 0;

  constructor(config: RouterConfig = {}) {
    this.config = {
      basePath: config.basePath ?? "",
      useHash: config.useHash ?? false,
      useHistory: config.useHistory ?? true,
      scrollMode: config.scrollMode ?? "restore",
      beforeNavigate: config.beforeNavigate,
      afterNavigate: config.afterNavigate,
      onNotFound: config.onNotFound,
      onError: config.onError,
      queryMode: config.queryMode ?? "loose",
      caseSensitive: config.caseSensitive ?? false,
      trailingSlash: config.trailingSlash ?? "keep",
      maxRedirects: config.maxRedirects ?? 10,
    };

    this.state = {
      currentPath: this.getCurrentPath(),
      currentMatch: null,
      previousMatch: null,
      historyIndex: 0,
      historyLength: 1,
      isNavigating: false,
      pendingNavigation: null,
    };

    this.attachListeners();
  }

  // --- Route Registration ---

  /** Register a route */
  add(route: RouteDefinition): () => void {
    this.routes.push(route);
    // Sort by specificity (more specific first)
    this.sortRoutes();
    return () => {
      this.routes = this.routes.filter((r) => r !== route);
    };
  }

  /** Register multiple routes */
  addRoutes(routes: RouteDefinition[]): void {
    for (const route of routes) this.add(route);
  }

  /** Shorthand: add GET route */
  get(path: string, handler: RouteDefinition["handler"], options?: Partial<Omit<RouteDefinition, "path" | "handler">>): () => void {
    return this.add({ path, method: "GET", handler, ...options });
  }

  /** Shorthand: add POST route */
  post(path: string, handler: RouteDefinition["handler"], options?: Partial<Omit<RouteDefinition, "path" | "handler">>): () => void {
    return this.add({ path, method: "POST", handler, ...options });
  }

  /** Create a group with shared prefix/middleware */
  group(prefix: string, routes: RouteDefinition[], sharedMeta?: Record<string, unknown>): void {
    for (const route of routes) {
      this.add({
        ...route,
        path: joinPath(prefix, route.path),
        meta: { ...sharedMeta, ...route.meta },
      });
    }
  }

  // --- Navigation ---

  /** Navigate to a path programmatically */
  async navigate(to: string, options?: { replace?: boolean; state?: unknown }): Promise<NavigationResult> {
    if (this.redirectCount >= this.config.maxRedirects) {
      return { success: false, match: null, from: this.state.currentMatch, to: null, error: new Error("Too many redirects") };
    }

    const from = this.state.currentMatch;
    this.state.isNavigating = true;

    // Normalize target path
    let targetPath = this.config.useHash ? to : normalizePath(to, this.config.trailingSlash);

    // Apply base path
    if (this.config.basePath && !targetPath.startsWith(this.config.basePath)) {
      targetPath = joinPath(this.config.basePath, targetPath);
    }

    // Find matching route
    const match = this.matchRoute(targetPath);
    if (!match) {
      this.config.onNotFound?.(targetPath);
      this.state.isNavigating = false;
      return { success: false, match: null, from, to: null };
    }

    // Check global guard
    if (this.config.beforeNavigate) {
      const allowed = await this.config.beforeNavigate(match, from ?? undefined);
      if (!allowed) {
        this.state.isNavigating = false;
        return { success: false, match: null, from, to: null };
      }
    }

    // Check route-level guard
    if (match.route.guard) {
      const allowed = await match.route.guard(match, from ?? undefined);
      if (!allowed) {
        this.state.isNavigating = false;
        return { success: false, match: null, from, to: null };
      }
    }

    // Handle redirect
    if (match.route.redirect) {
      this.redirectCount++;
      const result = await this.navigate(match.route.redirect, options);
      this.redirectCount--;
      return { ...result, redirectedFrom: targetPath };
    }

    // Save scroll position
    if (this.config.scrollMode === "restore" && this.state.currentPath) {
      this.scrollPositions.set(this.state.currentPath, { x: window.scrollX, y: window.scrollY });
    }

    // Update browser URL
    this.updateUrl(targetPath, options?.replace ?? false, options?.state);

    // Lazy load handler if needed
    let handler = match.route.handler;
    if (match.route.loader && !match.route.handler) {
      try {
        const mod = await match.route.loader();
        handler = mod.default;
      } catch (e) {
        this.config.onError?.(e as Error, match);
        this.state.isNavigating = false;
        return { success: false, match, from, to: match, error: e as Error };
      }
    }

    // Execute handler
    try {
      await handler(match);
    } catch (e) {
      this.config.onError?.(e as Error, match);
    }

    // Update state
    this.state.previousMatch = this.state.currentMatch;
    this.state.currentMatch = match;
    this.state.currentPath = targetPath;
    this.state.historyLength = history.length;
    this.state.historyIndex = history.state?.index ?? 0;
    this.state.isNavigating = false;

    // Scroll behavior
    this.applyScrollBehavior(match.route.scrollBehavior ?? this.config.scrollMode);

    // Update page title
    if (match.route.title) {
      document.title = typeof match.route.title === "function"
        ? match.route.title(match.params)
        : match.route.title;
    }

    const result: NavigationResult = { success: true, match, from, to: match };
    this.config.afterNavigate?.(result);
    this.notifyListeners();

    return result;
  }

  /** Go back in history */
  back(): void {
    history.back();
  }

  /** Go forward in history */
  forward(): void {
    history.forward();
  }

  /** Go N steps in history */
  go(delta: number): void {
    history.go(delta);
  }

  /** Replace current entry without adding to history */
  replace(path: string, state?: unknown): Promise<NavigationResult> {
    return this.navigate(path, { replace: true, state });
  }

  // --- Matching ---

  /** Match a path against registered routes */
  matchRoute(path: string): RouteMatch | null {
    const { pathname, queryStr, hash } = this.parseUrl(path);
    const query = parseQueryString(queryStr);

    let bestMatch: RouteMatch | null = null;
    let bestScore = -1;

    for (const route of this.routes) {
      const parsed = parsePattern(route.path);
      const match = pathname.match(parsed.regex);
      if (!match) continue;

      // Extract params
      const params: RouteParams = {};
      for (let i = 0; i < parsed.paramNames.length; i++) {
        params[parsed.paramNames[i]!] = match[i + 1];
      }

      // Calculate specificity score
      const score = this.calculateScore(parsed.segments);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          route,
          params,
          query,
          path: pathname,
          hash,
          isExact: pathname === route.path || !!route.path.includes(":"),
          score,
        };
      }
    }

    return bestMatch;
  }

  /** Get all routes that partially match a path (for breadcrumbs, etc.) */
  matchAll(path: string): RouteMatch[] {
    const matches: RouteMatch[] = [];
    const { pathname, queryStr, hash } = this.parseUrl(path);
    const query = parseQueryString(queryStr);

    for (const route of this.routes) {
      const parsed = parsePattern(route.path);
      if (parsed.regex.test(pathname)) {
        const m = pathname.match(parsed.regex)!;
        const params: RouteParams = {};
        for (let i = 0; i < parsed.paramNames.length; i++) {
          params[parsed.paramNames[i]!] = m[i + 1];
        }
        matches.push({
          route, params, query, path: pathname, hash,
          isExact: true, score: this.calculateScore(parsed.segments),
        });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  // --- State ---

  /** Get current router state */
  getState(): RouterState { return { ...this.state }; }

  /** Get current path */
  getCurrentPath(): string {
    if (this.config.useHash) {
      const hash = location.hash;
      return hash.replace(/^#\/?/, "/") || "/";
    }
    return location.pathname + location.search + location.hash;
  }

  /** Subscribe to state changes */
  onChange(listener: (state: RouterState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Get all registered routes */
  getRoutes(): ReadonlyArray<RouteDefinition> { return this.routes; }

  /** Generate a URL path from route name and params */
  generate(name: string, params?: RouteParams, query?: Record<string, unknown>): string | null {
    const route = this.routes.find((r) => r.name === name);
    if (!route) return null;

    let path = route.path;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        path = path.replace(`:${key}`, value ?? "");
        path = path.replace(`*${key}`, value ?? "");
      }
    }

    if (query) path += buildQueryString(query);
    return path;
  }

  /** Check if a path matches any registered route */
  isActive(path: string, exact = false): boolean {
    const current = this.state.currentPath;
    if (exact) return current === path || current === path + "/";
    return current.startsWith(path);
  }

  // --- Cleanup ---

  /** Detach event listeners */
  destroy(): void {
    if (this.popStateHandler) {
      window.removeEventListener("popstate", this.popStateHandler);
      this.popStateHandler = null;
    }
    if (this.hashChangeHandler) {
      window.removeEventListener("hashchange", this.hashChangeHandler);
      this.hashChangeHandler = null;
    }
    this.routes = [];
    this.listeners.clear();
  }

  // --- Internal ---

  private parseUrl(url: string): { pathname: string; queryStr: string; hash: string } {
    let fullUrl = url;
    if (!fullUrl.startsWith("http") && !fullUrl.startsWith("/")) {
      fullUrl = "/" + fullUrl;
    }

    try {
      const u = new URL(fullUrl, location.origin);
      return { pathname: u.pathname, queryStr: u.search, hash: u.hash };
    } catch {
      // Fallback manual parse
      const qIdx = url.indexOf("?");
      const hIdx = url.indexOf("#");
      const endQuery = hIdx > -1 ? hIdx : url.length;
      const queryPart = qIdx > -1 ? url.slice(qIdx, endQuery) : "";
      const hashPart = hIdx > -1 ? url.slice(hIdx) : "";
      const pathPart = qIdx > -1 ? url.slice(0, qIdx) : (hIdx > -1 ? url.slice(0, hIdx) : url);
      return { pathname: pathPart, queryStr: queryPart, hash: hashPart };
    }
  }

  private updateUrl(path: string, replace: boolean, state?: unknown): void {
    if (this.config.useHash) {
      const hash = path === "/" ? "#/" : "#" + path;
      if (replace) {
        location.replace(hash);
      } else {
        location.hash = hash;
      }
    } else if (this.config.useHistory) {
      const url = path + (location.hash || "");
      if (replace) {
        history.replaceState({ ...(history.state as object ?? {}), index: this.state.historyIndex, customState: state }, "", url);
      } else {
        history.pushState({ index: this.state.historyLength, customState: state }, "", url);
        this.state.historyLength++;
        this.state.historyIndex = this.state.historyLength - 1;
      }
    }
  }

  private attachListeners(): void {
    if (this.config.useHistory && !this.config.useHash) {
      this.popStateHandler = (e: PopStateEvent) => {
        const newPath = this.getCurrentPath();
        if (newPath !== this.state.currentPath) {
          void this.navigate(newPath);
        }
      };
      window.addEventListener("popstate", this.popStateHandler);
    }

    if (this.config.useHash) {
      this.hashChangeHandler = () => {
        const newPath = this.getCurrentPath();
        if (newPath !== this.state.currentPath) {
          void this.navigate(newPath);
        }
      };
      window.addEventListener("hashchange", this.hashChangeHandler);
    }
  }

  private applyScrollBehavior(mode: "restore" | "top" | "preserve"): void {
    requestAnimationFrame(() => {
      switch (mode) {
        case "restore": {
          const pos = this.scrollPositions.get(this.state.currentPath);
          if (pos) {
            window.scrollTo(pos.x, pos.y);
          } else {
            window.scrollTo(0, 0);
          }
          break;
        }
        case "top":
          window.scrollTo(0, 0);
          break;
        case "preserve":
          // Do nothing
          break;
      }
    });
  }

  private calculateScore(segments: PathSegment[]): number {
    let score = 0;
    for (const seg of segments) {
      if (seg.wildcard) score += 1;
      else if (seg.param) score += 10;
      else score += 100; // Literal segments rank highest
    }
    return score;
  }

  private sortRoutes(): void {
    this.routes.sort((a, b) => {
      const scoreA = this.calculateScore(parsePattern(a.path).segments);
      const scoreB = this.calculateScore(parsePattern(b.path).segments);
      return (b.priority ?? 0) - (a.priority ?? 0) || scoreB - scoreA;
    });
  }

  private notifyListeners(): void {
    for (const l of this.listeners) l(this.getState());
  }
}
