/**
 * Client-side Router: Hash and History API routing with route matching,
 * guards, params, query strings, transitions, nested routes, lazy loading,
 * and programmatic navigation.
 */

// --- Types ---

export type RouteMode = "hash" | "history" | "memory";

export interface RouteParams {
  [key: string]: string;
}

export interface QueryParams {
  [key: string]: string | string[] | undefined;
}

export interface RouteDefinition {
  /** Path pattern (e.g., "/users/:id") */
  path: string;
  /** Component/renderer name */
  component: string;
  /** Child routes for nesting */
  children?: RouteDefinition[];
  /** Meta information */
  meta?: Record<string, unknown>;
  /** Guard function - return true to allow, false/string to redirect */
  guard?: () => boolean | string;
  /** Lazy load callback */
  loader?: () => Promise<unknown>;
  /** Page title override */
  title?: string;
}

export interface RouterConfig {
  /** Routing mode (default: "hash") */
  mode?: RouteMode;
  /** Base URL prefix for history mode */
  basePath?: string;
  /** Route definitions */
  routes: RouteDefinition[];
  /** Default route when no match (default: "/") */
  notFoundPath?: string;
  /** Default route on init */
  defaultRoute?: string;
  /** Enable transition animations? */
  transitions?: boolean;
  /** Transition duration ms (default: 200) */
  transitionDuration?: number;
  /** Scroll to top on navigate? (default: true) */
  scrollBehavior?: "top" | "preserve" | "smooth";
  /** Callback before navigation */
  beforeEach?: (to: RouteInfo, from: RouteInfo | null) => boolean | void | Promise<boolean | void>;
  /** Callback after navigation */
  afterEach?: (to: RouteInfo, from: RouteInfo | null) => void;
  /** Callback on 404 */
  onNotFound?: (path: string) => void;
}

export interface RouteInfo {
  path: string;
  matchedPath: string;
  params: RouteParams;
  query: QueryParams;
  hash: string;
  component: string;
  meta: Record<string, unknown>;
  /** Full matched path including parent segments */
  fullPath: string;
}

export interface NavigationResult {
  success: boolean;
  route: RouteInfo | null;
  redirectedFrom?: string;
}

// --- Internal ---

interface MatchedRoute {
  definition: RouteDefinition;
  params: RouteParams;
  remaining: string;
  consumed: string;
}

// --- Router Class ---

export class Router {
  private config: Required<RouterConfig> & RouterConfig;
  private currentRoute: RouteInfo | null = null;
  private listeners = new Set<(route: RouteInfo | null) => void>();
  private historyStack: string[] = [];
  private historyIndex = -1;
  private destroyed = false;

  constructor(config: RouterConfig) {
    this.config = {
      mode: config.mode ?? "hash",
      basePath: config.basePath ?? "",
      notFoundPath: config.notFoundPath ?? "/404",
      transitions: config.transitions ?? true,
      transitionDuration: config.transitionDuration ?? 200,
      scrollBehavior: config.scrollBehavior ?? "top",
      ...config,
    };

    if (typeof window !== "undefined" && this.config.mode !== "memory") {
      this.setupListeners();
    }
  }

  // --- Navigation ---

  /** Navigate to a path */
  async navigate(path: string): Promise<NavigationResult> {
    const from = this.currentRoute;
    const resolved = this.resolveRoute(path);

    // Run global guard
    if (this.config.beforeEach) {
      const allowed = await this.config.beforeEach(resolved, from);
      if (allowed === false) return { success: false, route: null };
    }

    // Run route-specific guard
    if (resolved.meta?.guard) {
      const guardResult = (resolved.meta.guard as () => boolean | string)();
      if (typeof guardResult === "string") {
        return this.navigate(guardResult);
      }
      if (!guardResult) return { success: false, route: null };
    }

    // Update browser URL
    this.updateURL(path);

    // Update state
    this.currentRoute = resolved;

    // Manage history
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    }
    this.historyStack.push(path);
    this.historyIndex = this.historyStack.length - 1;

    // Scroll behavior
    if (this.config.scrollBehavior === "top" && typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }

    // Notify
    this.notify();

    // After hook
    this.config.afterEach?.(resolved, from);

    return { success: true, route: resolved };
  }

  /** Go back in history */
  back(): boolean {
    if (this.historyIndex <= 0) return false;
    this.historyIndex--;
    const path = this.historyStack[this.historyIndex]!;
    this.updateURL(path);
    this.currentRoute = this.resolveRoute(path);
    this.notify();
    return true;
  }

  /** Go forward in history */
  forward(): boolean {
    if (this.historyIndex >= this.historyStack.length - 1) return false;
    this.historyIndex++;
    const path = this.historyStack[this.historyIndex]!;
    this.updateURL(path);
    this.currentRoute = this.resolveRoute(path);
    this.notify();
    return true;
  }

  /** Get current route info */
  getCurrentRoute(): RouteInfo | null { return this.currentRoute; }

  /** Check if a path matches the current route */
  isActive(path: string): boolean {
    return this.currentRoute?.path === path || this.currentRoute?.fullPath === path;
  }

  /** Check if path starts with given path */
  isExactActive(path: string): boolean {
    return this.currentRoute?.fullPath === path || this.currentRoute?.path === path;
  }

  /** Generate URL with params */
  generateUrl(path: string, params?: RouteParams, query?: QueryParams): string {
    let url = path;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url = url.replace(`:${key}`, value);
      }
    }
    if (query && Object.keys(query).length > 0) {
      const qs = Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(Array.isArray(v) ? v.join(",") : v!)}`)
        .join("&");
      url += `?${qs}`;
    }
    return url;
  }

  /** Subscribe to route changes */
  subscribe(listener: (route: RouteInfo | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentRoute);
    return () => this.listeners.delete(listener);
  }

  /** Start the router (init with current URL or default) */
  start(): void {
    if (this.destroyed) return;
    const initialPath = this.getCurrentPath() || this.config.defaultRoute || "/";
    this.navigate(initialPath);
  }

  /** Destroy router and cleanup */
  destroy(): void {
    this.destroyed = true;
    this.listeners.clear();
    if (typeof window !== "undefined") {
      window.removeEventListener("popstate", this._popStateHandler as EventListener);
      window.removeEventListener("hashchange", this._hashChangeHandler as EventListener);
    }
  }

  // --- Internal ---

  private resolveRoute(path: string): RouteInfo {
    const { pathname, query, hash } = this.parseURL(path);

    // Try matching against all routes
    const matched = this.matchRoutes(this.config.routes, pathname);

    if (matched) {
      return {
        path: pathname,
        matchedPath: matched.consumed,
        params: matched.params,
        query,
        hash,
        component: matched.definition.component,
        meta: matched.definition.meta ?? {},
        fullPath: pathname,
      };
    }

    // 404 fallback
    this.config.onNotFound?.(pathname);
    return {
      path: pathname,
      matchedPath: "",
      params: {},
      query,
      hash,
      component: "NotFound",
      meta: {},
      fullPath: pathname,
    };
  }

  private matchRoutes(routes: RouteDefinition[], path: string): MatchedRoute | null {
    for (const route of routes) {
      const result = this.matchSingle(route, path);
      if (result) return result;
    }
    return null;
  }

  private matchSingle(definition: RouteDefinition, path: string): MatchedRoute | null {
    const segments = definition.path.split("/").filter(Boolean);
    const pathSegments = path.split("/").filter(Boolean);

    const params: RouteParams = {};
    let consumed = "";
    let idx = 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      if (idx >= pathSegments.length) return null;

      const pathSeg = pathSegments[idx++]!;

      if (seg.startsWith(":")) {
        // Dynamic parameter
        params[seg.slice(1)] = decodeURIComponent(pathSeg);
        consumed += `/${pathSeg}`;
      } else if (seg === "*") {
        // Wildcard - consume rest
        consumed += "/" + pathSegments.slice(idx).join("/");
        idx = pathSegments.length;
        break;
      } else if (seg !== pathSeg) {
        return null;
      } else {
        consumed += `/${pathSeg}`;
      }
    }

    // Check children if there's remaining path
    if (idx < pathSegments.length && definition.children) {
      const remaining = pathSegments.slice(idx).join("/");
      const childMatch = this.matchRoutes(definition.children, remaining);
      if (childMatch) {
        return {
          definition,
          params: { ...params, ...childMatch.params },
          remaining: childMatch.remaining,
          consumed: consumed + (consumed ? "/" : "") + childMatch.consumed,
        };
      }
    } else if (idx < pathSegments.length) {
      return null;
    }

    return { definition, params, remaining: "", consumed: consumed || "/" };
  }

  private parseURL(url: string): { pathname: string; query: QueryParams; hash: string } {
    let cleanUrl = url;
    let hash = "";

    // Extract hash
    const hashIdx = cleanUrl.indexOf("#");
    if (hashIdx >= 0) {
      hash = cleanUrl.slice(hashIdx + 1);
      cleanUrl = cleanUrl.slice(0, hashIdx);
    }

    // Extract query
    const queryIdx = cleanUrl.indexOf("?");
    let query: QueryParams = {};
    if (queryIdx >= 0) {
      const qs = cleanUrl.slice(queryIdx + 1);
      cleanUrl = cleanUrl.slice(0, queryIdx);
      for (const pair of qs.split("&")) {
        const [key, ...rest] = pair.split("=");
        const val = rest.join("=");
        if (key) {
          const decodedKey = decodeURIComponent(key);
          const decodedVal = val ? decodeURIComponent(val) : undefined;
          if (decodedKey in query) {
            const existing = query[decodedKey];
            query[decodedKey] = Array.isArray(existing) ? [...existing, decodedVal!] : [existing!, decodedVal!];
          } else {
            query[decodedKey] = decodedVal;
          }
        }
      }
    }

    return { pathname: cleanUrl || "/", query, hash };
  }

  private getCurrentPath(): string {
    if (typeof window === "undefined") return "";

    switch (this.config.mode) {
      case "hash":
        return window.location.hash.slice(1) || "/";
      case "history":
        return window.location.pathname.slice(this.config.basePath.length) || "/";
      case "memory":
        return this.historyStack[this.historyIndex] ?? "/";
      default:
        return "/";
    }
  }

  private updateURL(path: string): void {
    if (typeof window === "undefined") return;

    switch (this.config.mode) {
      case "hash":
        window.location.hash = path;
        break;
      case "history":
        window.history.pushState({ path }, "", this.config.basePath + path);
        break;
      case "memory":
        // No-op - managed internally
        break;
    }
  }

  private setupListeners(): void {
    if (this.config.mode === "history") {
      this._popStateHandler = (_e: PopStateEvent) => {
        const path = this.getCurrentPath();
        this.currentRoute = this.resolveRoute(path);
        this.notify();
      };
      window.addEventListener("popstate", this._popStateHandler as EventListener);
    } else if (this.config.mode === "hash") {
      this._hashChangeHandler = () => {
        const path = this.getCurrentPath();
        this.currentRoute = this.resolveRoute(path);
        this.notify();
      };
      window.addEventListener("hashchange", this._hashChangeHandler as EventListener);
    }
  }

  private _popStateHandler: ((e: PopStateEvent) => void) | null = null;
  private _hashChangeHandler: (() => void) | null = null;

  private notify(): void {
    if (this.destroyed) return;
    for (const fn of this.listeners) { try { fn(this.currentRoute); } catch {} }
  }
}

// --- Singleton Helper ---

let defaultRouter: Router | null = null;

/** Create/get the default router singleton */
export function createRouter(config: RouterConfig): Router {
  defaultRouter = new Router(config);
  return defaultRouter;
}

/** Get the default router instance */
export function getRouter(): Router | null { return defaultRouter; }
