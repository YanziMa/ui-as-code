/**
 * URL Pattern Router using the URL Pattern API (or polyfill) for client-side
 * routing with named parameters, wildcards, optional segments, route groups,
 * middleware, guards, and navigation hooks.
 */

// --- Types ---

export interface RouteParams {
  [key: string]: string;
}

export interface RouteMatch {
  /** Matched route pattern */
  pattern: string;
  /** Extracted parameters */
  params: RouteParams;
  /** Query parameters */
  query: Record<string, string>;
  /** Hash fragment */
  hash: string;
  /** Whether this is an exact match */
  exact: boolean;
}

export interface RouteHandler {
  (match: RouteMatch): void | Promise<void>;
}

export interface RouteGuard {
  (match: RouteMatch): boolean | Promise<boolean>;
}

export interface RouteMiddleware {
  (match: RouteMatch, next: () => void): void | Promise<void>;
}

export interface RouteDefinition {
  /** URL pattern string (e.g., "/users/:id") */
  pattern: string;
  /** Handler for when route matches */
  handler: RouteHandler;
  /** Optional name for the route */
  name?: string;
  /** Guard function — return false to prevent navigation */
  guard?: RouteGuard;
  /** Middleware array — run before handler */
  middleware?: RouteMiddleware[];
  /** Metadata attached to the route */
  meta?: Record<string, unknown>;
  /** Children routes (nested) */
  children?: RouteDefinition[];
}

export interface RouterOptions {
  /** Base path for all routes (default: "") */
  basePath?: string;
  /** Default handler when no route matches */
  notFound?: RouteHandler;
  /** Called before every navigation */
  onBeforeNavigate?: (match: RouteMatch | null) => void | Promise<boolean>;
  /** Called after successful navigation */
  onAfterNavigate?: (match: RouteMatch) => void;
  /** Enable hash-based routing fallback (default: false) */
  useHashFallback?: boolean;
  /** Case-sensitive matching (default: true) */
  caseSensitive?: boolean;
  /** Log routing events (default: false) */
  debug?: boolean;
}

export interface RouterInstance {
  /** Add a route definition */
  add: (route: RouteDefinition) => RouterInstance;
  /** Add multiple routes at once */
  addMany: (routes: RouteDefinition[]) => RouterInstance;
  /** Navigate to a path programmatically */
  navigate: (path: string, state?: Record<string, unknown>) => Promise<RouteMatch | null>;
  /** Match current URL against registered routes */
  match: (url?: string) => RouteMatch | null;
  /** Get current route match */
  readonly current: RouteMatch | null;
  /** Start listening for popstate/hash changes */
  start: () => void;
  /** Stop listening */
  stop: () => void;
  /** Generate a URL from a route name and params */
  generateUrl: (nameOrPattern: string, params?: RouteParams, query?: Record<string, string>) => string;
  /** Go back in history */
  back: () => void;
  /** Go forward in history */
  forward: () => void;
  /** Get all registered routes */
  getRoutes: () => RouteDefinition[];
  /** Destroy router */
  destroy: () => void;
}

// --- Helpers ---

function parseQuery(search: string): Record<string, string> {
  const query: Record<string, string> = {};
  if (!search || search.length <= 1) return query;
  const params = new URLSearchParams(search.slice(1));
  for (const [key, value] of params) {
    query[key] = value;
  }
  return query;
}

function parseHash(url: string): string {
  try { return new URL(url).hash.slice(1); } catch { return ""; }
}

// Simple URL Pattern polyfill for browsers without native support
class SimpleURLPattern {
  private pattern: string;
  private regex: RegExp;
  private paramNames: string[];

  constructor(pattern: string) {
    this.pattern = pattern;
    const result = this.compilePattern(pattern);
    this.regex = result.regex;
    this.paramNames = result.names;
  }

  private compilePattern(pattern: string): { regex: RegExp; names: string[] } {
    const names: string[] = [];
    // Convert :param to named capture
    let regexStr = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/:(\w+)/g, (_, name) => {
        names.push(name);
        return "([^/]+)";
      })
      .replace(/\*/g, "(.*)")
      .replace(/\/?$/, "/?"); // Optional trailing slash

    return { regex: new RegExp(`^${regexStr}$`), names };
  }

  test(url: string): boolean {
    return this.regex.test(url);
  }

  exec(url: string): { params: Record<string, string> } | null {
    const match = url.match(this.regex);
    if (!match) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < this.paramNames.length; i++) {
      params[this.paramNames[i]!] = match[i + 1] ?? "";
    }
    return { params };
  }
}

// --- Main ---

export function createRouter(options: RouterOptions = {}): RouterInstance {
  const {
    basePath = "",
    notFound,
    onBeforeNavigate,
    onAfterNavigate,
    useHashFallback = false,
    caseSensitive = true,
    debug = false,
  } = options;

  let destroyed = false;
  let started = false;
  let currentMatch: RouteMatch | null = null;
  const routes: RouteDefinition[] = [];
  let popStateHandler: (() => void) | null = null;
  let hashHandler: (() => void) | null = null;

  const supportsURLPattern = typeof URLPattern !== "undefined";

  function log(msg: string): void {
    if (debug) console.log(`[router] ${msg}`);
  }

  function resolvePath(path: string): string {
    let resolved = path;
    if (basePath && !path.startsWith(basePath)) {
      resolved = `${basePath.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
    }
    return resolved;
  }

  function doMatch(url?: string): RouteMatch | null {
    const rawUrl = url ?? getCurrentUrl();
    const pathname = extractPathname(rawUrl);
    const search = extractSearch(rawUrl);
    const hash = parseHash(rawUrl);

    // Try each route
    for (const route of routes) {
      const match = tryRoute(route, pathname, search, hash);
      if (match) return match;
    }

    return null;
  }

  function tryRoute(
    route: RouteDefinition,
    pathname: string,
    search: string,
    hash: string,
  ): RouteMatch | null {
    const pattern = resolvePath(route.pattern);

    if (supportsURLPattern) {
      try {
        const urlPattern = new URLPattern({ pathname: pattern });
        const result = urlPattern.exec(pathname || "/");
        if (result) {
          const params: RouteParams = {};
          if (result.pathname.groups) {
            for (const [k, v] of Object.entries(result.pathname.groups)) {
              if (v) params[k] = v;
            }
          }
          return {
            pattern: route.pattern,
            params,
            query: parseQuery(search),
            hash,
            exact: true,
          };
        }
      } catch {
        // Fall through to simple matcher
      }
    }

    // Fallback: simple pattern matching
    const simple = new SimpleURLPattern(pattern);
    const result = simple.exec(pathname || "/");
    if (result) {
      return {
        pattern: route.pattern,
        params: result.params as RouteParams,
        query: parseQuery(search),
        hash,
        exact: true,
      };
    }

    // Check children
    if (route.children) {
      for (const child of route.children) {
        const childMatch = tryRoute(child, pathname, search, hash);
        if (childMatch) return childMatch;
      }
    }

    return null;
  }

  async function doNavigate(path: string, state?: Record<string, unknown>): Promise<RouteMatch | null> {
    if (destroyed) return null;

    const resolvedPath = resolvePath(path);

    // Before hook
    if (onBeforeNavigate) {
      const allowed = await onBeforeNavigate(null);
      if (allowed === false) {
        log("Navigation cancelled by onBeforeNavigate");
        return null;
      }
    }

    // Update URL
    if (useHashFallback) {
      window.location.hash = resolvedPath;
    } else {
      history.pushState(state ?? {}, "", resolvedPath);
    }

    // Find match
    const match = doMatch(resolvedPath);
    currentMatch = match;

    if (match) {
      log(`Route matched: ${match.pattern}`, match.params);

      // Run guards
      for (const route of routes) {
        if (route.guard) {
          const allowed = await route.guard(match);
          if (!allowed) {
            log(`Guard blocked: ${route.name ?? route.pattern}`);
            return null;
          }
        }
      }

      // Run middleware + handler
      await runWithMiddleware(match);
      onAfterNavigate?.(match);
    } else {
      log("No route matched");
      notFound?.({ pattern: "*", params: {}, query: {}, hash: "", exact: false });
    }

    return match;
  }

  async function runWithMiddleware(match: RouteMatch): Promise<void> {
    // Find the matched route's middleware and handler
    for (const route of routes) {
      const routeMatch = tryRoute(route, extractPathname(getCurrentUrl()), extractSearch(getCurrentUrl()), parseHash(getCurrentUrl()));
      if (!routeMatch) continue;

      // Run middleware chain
      if (route.middleware) {
        for (const mw of route.middleware) {
          let nextCalled = false;
          await mw(match, () => { nextCalled = true; });
        }
      }

      // Run handler
      await route.handler(match);
      return;
    }
  }

  function getCurrentUrl(): string {
    if (useHashFallback) {
      return window.location.hash.slice(1) || "/";
    }
    return window.location.pathname + window.location.search;
  }

  function extractPathname(url: string): string {
    try {
      return new URL(url, "http://localhost").pathname;
    } catch {
      return url.split("?")[0]?.split("#")[0] ?? "/";
    }
  }

  function extractSearch(url: string): string {
    const qIdx = url.indexOf("?");
    const hIdx = url.indexOf("#");
    if (qIdx === -1) return "";
    if (hIdx === -1) return url.slice(qIdx);
    return url.slice(qIdx, hIdx);
  }

  function doGenerateUrl(nameOrPattern: string, params?: RouteParams, query?: Record<string, string>): string {
    let url = resolvePath(nameOrPattern);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url = url.replace(`:${key}`, encodeURIComponent(value));
      }
    }
    if (query) {
      const qs = Object.entries(query)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      url += `?${qs}`;
    }
    return url;
  }

  function handlePopState(): void {
    if (destroyed) return;
    const match = doMatch();
    currentMatch = match;
    if (match) runWithMiddleware(match);
    else notFound?.({ pattern: "*", params: {}, query: {}, hash: "", exact: false });
  }

  function doStart(): void {
    if (started || destroyed) return;
    started = true;

    if (!useHashFallback) {
      popStateHandler = handlePopState;
      window.addEventListener("popstate", popStateHandler);
    } else {
      hashHandler = handlePopState;
      window.addEventListener("hashchange", hashHandler);
    }

    // Initial match
    const match = doMatch();
    currentMatch = match;
    if (match) runWithMiddleware(match);
  }

  function doStop(): void {
    started = false;
    if (popStateHandler) {
      window.removeEventListener("popstate", popStateHandler);
      popStateHandler = null;
    }
    if (hashHandler) {
      window.removeEventListener("hashchange", hashHandler);
      hashHandler = null;
    }
  }

  const instance: RouterInstance = {
    add(route: RouteDefinition) { routes.push(route); return instance; },
    addMany(rs: RouteDefinition[]) { rs.forEach((r) => instance.add(r)); return instance; },
    navigate: doNavigate,
    match: doMatch,
    get current() { return currentMatch; },
    start: doStart,
    stop: doStop,
    generateUrl: doGenerateUrl,
    back() { history.back(); },
    forward() { history.forward(); },
    getRoutes: () => [...routes],
    destroy() {
      if (destroyed) return;
      destroyed = true;
      doStop();
      routes.length = 0;
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Quick one-shot: check if a URL matches a pattern */
export function matchUrl(pattern: string, url: string): RouteParams | null {
  const router = createRouter();
  router.add({ pattern, handler: () => {} });
  const match = router.match(url);
  return match?.params ?? null;
}
