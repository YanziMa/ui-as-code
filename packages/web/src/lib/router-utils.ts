/**
 * Client-side router utilities — hash-based and history-based routing,
 * route matching, navigation guards, query param sync.
 */

// --- Types ---

export interface RouteDefinition {
  /** Route pattern (e.g., "/users/:id", "/posts/:postId/comments/:commentId") */
  path: string;
  /** Route name for identification */
  name?: string;
  /** Meta information attached to the route */
  meta?: Record<string, unknown>;
  /** Children routes */
  children?: RouteDefinition[];
}

export interface RouteMatch<T = unknown> {
  /** Matched route definition */
  route: RouteDefinition;
  /** Extracted path parameters */
  params: Record<string, string>;
  /** Remaining unmatched path (for nested routes) */
  remaining: string;
  /** Query parameters */
  query: Record<string, string>;
  /** Full matched path */
  fullPath: string;
  /** User data */
  data?: T;
}

export interface NavigationGuard {
  /** Guard function — return false/undefined to allow, string to redirect */
  guard: (to: RouteMatch, from?: RouteMatch) => string | false | void | Promise<string | false | void>;
  /** Priority (lower = runs first) */
  priority?: number;
}

export interface RouterOptions {
  /** Use history API instead of hash (default: false) */
  useHistory?: boolean;
  /** Base path for all routes */
  basePath?: string;
  /** Called on navigation */
  onNavigate?: (match: RouteMatch, prevMatch?: RouteMatch) => void;
  /** 404 handler */
  onNotFound?: (path: string) => void;
}

// --- Route Matching ---

/**
 * Parse a route pattern into a regex and parameter names.
 */
export function compileRoute(pattern: string): {
  regex: RegExp;
  paramNames: string[];
  isWildcard: boolean;
} {
  const paramNames: string[] = [];
  let isWildcard = false;

  // Escape special chars except : and *
  let regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    })
    .replace(/\*/g, () => {
      isWildcard = true;
      return "(.*)";
    });

  regexStr = `^${regexStr}$`;

  return {
    regex: new RegExp(regexStr),
    paramNames,
    isWildcard,
  };
}

/**
 * Match a path against a route pattern.
 */
export function matchRoute(
  pattern: string,
  path: string,
): RouteMatch | null {
  const compiled = compileRoute(pattern);
  const exec = compiled.regex.exec(path);

  if (!exec) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < compiled.paramNames.length; i++) {
    params[compiled.paramNames[i]!] = exec[i + 1]!;
  }

  // Extract query string
  const queryIndex = path.indexOf("?");
  const queryStr = queryIndex >= 0 ? path.slice(queryIndex + 1) : "";
  const query: Record<string, string> = {};
  if (queryStr) {
    for (const pair of queryStr.split("&")) {
      const [key, ...rest] = pair.split("=");
      if (key) query[key] = decodeURIComponent(rest.join("="));
    }
  }

  return {
    route: { path: pattern },
    params,
    remaining: "",
    query,
    fullPath: path.split("?")[0]!,
  };
}

/**
 * Match a path against multiple route definitions (first match wins).
 */
export function matchRoutes(
  routes: RouteDefinition[],
  path: string,
): RouteMatch | null {
  const cleanPath = path.split("?")[0]?.replace(/\/+$/, "") ?? "";

  for (const route of routes) {
    const match = matchRoute(route.path, cleanPath);
    if (match) {
      match.route = route;
      // Try matching children
      if (route.children?.length) {
        const childPath = match.remaining || "";
        const childMatch = matchRoutes(route.children, childPath);
        if (childMatch) return childMatch;
      }
      return match;
    }
  }

  return null;
}

/**
 * Generate a path from a pattern and parameters.
 */
export function generatePath(
  pattern: string,
  params: Record<string, string> = {},
  query?: Record<string, string>,
): string {
  let path = pattern;

  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`:${key}`, encodeURIComponent(value));
  }

  if (query && Object.keys(query).length > 0) {
    const qs = Object.entries(query)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    path += `?${qs}`;
  }

  return path;
}

// --- Simple Router ---

/**
 * Lightweight client-side router.
 */
export class SimpleRouter {
  private routes: RouteDefinition[] = [];
  private guards: NavigationGuard[] = [];
  private currentMatch: RouteMatch | null = null;
  private options: Required<RouterOptions>;
  private listenerAttached = false;

  constructor(options: RouterOptions = {}) {
    this.options = {
      useHistory: options.useHistory ?? false,
      basePath: options.basePath ?? "",
      onNavigate: options.onNavigate ?? (() => {}),
      onNotFound: options.onNotFound ?? ((p) => console.warn(`[Router] No route matched: ${p}`)),
    };
  }

  /** Register routes */
  addRoutes(routes: RouteDefinition[]): this {
    this.routes.push(...routes);
    return this;
  }

  /** Add a single route */
  addRoute(route: RouteDefinition): this {
    this.routes.push(route);
    return this;
  }

  /** Add a navigation guard */
  addGuard(guard: NavigationGuard): this {
    this.guards.push(guard);
    this.guards.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    return this;
  }

  /** Navigate to a path */
  async navigate(path: string): Promise<boolean> {
    const resolvedPath = this.resolvePath(path);
    const match = matchRoutes(this.routes, resolvedPath);

    if (!match) {
      this.options.onNotFound(resolvedPath);
      return false;
    }

    // Run guards
    for (const guard of this.guards) {
      const result = await guard.guard(match, this.currentMatch ?? undefined);
      if (result === false) return false;
      if (typeof result === "string") {
        return this.navigate(result);
      }
    }

    const prevMatch = this.currentMatch;
    this.currentMatch = match;

    // Update browser state
    if (this.options.useHistory) {
      window.history.pushState({ path: resolvedPath }, "", resolvedPath);
    } else {
      window.location.hash = resolvedPath;
    }

    this.options.onNavigate(match, prevMatch);
    return true;
  }

  /** Go back */
  back(): void {
    if (this.options.useHistory) {
      window.history.back();
    } else {
      // Hash-based: we can't truly go back, but can navigate to previous
      // This is a limitation of hash-based routing
    }
  }

  /** Go forward */
  forward(): void {
    if (this.options.useHistory) {
      window.history.forward();
    }
  }

  /** Replace current entry (no history entry) */
  replace(path: string): Promise<boolean> {
    const resolvedPath = this.resolvePath(path);
    if (this.options.useHistory) {
      window.history.replaceState({ path: resolvedPath }, "", resolvedPath);
    }
    return this.navigate(path);
  }

  /** Get current route match */
  get current(): RouteMatch | null {
    return this.currentMatch;
  }

  /** Get current path */
  get currentPath(): string {
    if (this.options.useHistory) {
      return window.location.pathname + window.location.search;
    }
    return window.location.hash.slice(1) || "/";
  }

  /** Start listening for popstate/hashchange events */
  start(): void {
    if (this.listenerAttached) return;
    this.listenerAttached = true;

    const handler = () => {
      const path = this.currentPath;
      const match = matchRoutes(this.routes, path);
      if (match) {
        const prev = this.currentMatch;
        this.currentMatch = match;
        this.options.onNavigate(match, prev);
      } else {
        this.options.onNotFound(path);
      }
    };

    if (this.options.useHistory) {
      window.addEventListener("popstate", handler);
    } else {
      window.addEventListener("hashchange", handler);
    }

    // Initial navigation
    this.navigate(this.currentPath);
  }

  /** Stop listening */
  stop(): void {
    if (this.options.useHistory) {
      window.removeEventListener("popstate", this.handlePopState);
    } else {
      window.removeEventListener("hashchange", this.handleHashChange);
    }
    this.listenerAttached = false;
  }

  /** Destroy router */
  destroy(): void {
    this.stop();
    this.routes = [];
    this.guards = [];
    this.currentMatch = null;
  }

  private resolvePath(path: string): string {
    let resolved = path;
    if (this.options.basePath && !path.startsWith(this.options.basePath)) {
      resolved = `${this.options.basePath}${path.startsWith("/") ? "" : "/"}${path}`;
    }
    return resolved;
  }

  private handlePopState = (): void => {};
  private handleHashChange = (): void => {};
}

// --- Path Utilities ---

/**
 * Check if a path matches a glob pattern.
 */
export function pathMatchesGlob(pattern: string, path: string): boolean {
  const regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{DOUBLESTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{DOUBLESTAR\}\}/g, ".*")
    .replace(/:(\w+)/g, "[^/]+");

  return new RegExp(`^${regexStr}$`).test(path);
}

/**
 * Split a path into segments.
 */
export function splitPath(path: string): string[] {
  return path
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);
}

/**
 * Join path segments.
 */
export function joinPath(...segments: string[]): string {
  return "/" + segments
    .map((s) => s.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

/**
 * Get the parent path of a given path.
 */
export function getParentPath(path: string): string {
  const segments = splitPath(path);
  segments.pop();
  return joinPath(...segments) || "/";
}

/**
 * Normalize a path (remove duplicate slashes, resolve .. and .).
 */
export function normalizePath(path: string): string {
  const segments = splitPath(path);
  const resolved: string[] = [];

  for (const seg of segments) {
    if (seg === "..") {
      resolved.pop();
    } else if (seg !== ".") {
      resolved.push(seg);
    }
  }

  return joinPath(...resolved);
}
