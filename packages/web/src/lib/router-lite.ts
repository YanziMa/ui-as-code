/**
 * Router Lite: Client-side hash/history-based router with nested routes,
 * route guards, lazy loading, query parsing, transitions, scroll management,
 * breadcrumbs, and SSR-compatible API.
 */

// --- Types ---

export type RouterMode = "history" | "hash" | "memory";

export type RouteMatchType = "exact" | "startsWith" | "regex" | "custom";

export interface RouteDefinition {
  /** Path pattern (e.g., "/users/:id", "/posts/*") */
  path: string;
  /** Component name or loader function */
  component?: string | (() => Promise<unknown>);
  /** Child routes */
  children?: RouteDefinition[];
  /** Route metadata */
  meta?: Record<string, unknown>;
  /** Page title template */
  title?: string;
  /** Guard function — return true to allow, false/string to redirect */
  guard?: (ctx: NavigationContext) => boolean | string;
  /** Before navigation hook */
  beforeEnter?: (to: RouteInfo, from: RouteInfo | null) => void | Promise<void>;
  /** After navigation hook */
  afterEnter?: (to: RouteInfo) => void;
  /** Lazy data loader */
  loader?: (params: Record<string, string>) => Promise<unknown>;
  /** Layout wrapper */
  layout?: string;
  /** Transition name */
  transition?: string;
  /** Scroll behavior */
  scroll?: "restore" | "top" | "preserve";
}

export interface RouteInfo {
  /** Matched path pattern */
  path: string;
  /** Actual URL pathname */
  fullPath: string;
  /** Extracted path parameters */
  params: Record<string, string>;
  /** Parsed query parameters */
  query: Record<string, string>;
  /** Hash fragment */
  hash: string;
  /** Matched route definition */
  route: RouteDefinition;
  /** Parent routes (for nested layouts) */
  parents: RouteInfo[];
  /** Breadcrumb entries */
  breadcrumbs: BreadcrumbEntry[];
  /** Navigation ID */
  navId: string;
}

export interface BreadcrumbEntry {
  label: string;
  path: string;
  params?: Record<string, string>;
}

export interface NavigationContext {
  to: RouteInfo;
  from: RouteInfo | null;
  type: "push" | "replace" | "pop";
  direction: "forward" | "back";
}

export interface RouterOptions {
  /** Routing mode (default: history) */
  mode?: RouterMode;
  /** Base path for history mode */
  basePath?: string;
  /** Default route when no match found */
  notFound?: RouteDefinition;
  /** Global navigation guard */
  beforeEach?: (ctx: NavigationContext) => boolean | string | Promise<boolean | string>;
  /** Global after-each hook */
  afterEach?: (to: RouteInfo) => void;
  /** Scroll restoration strategy */
  scrollBehavior?: "auto" | "manual" | "restore";
  /** Link selector for interception */
  linkSelector?: string;
  /** Enable transition animations */
  transitions?: boolean;
  /** Transition duration (ms) */
  transitionDuration?: number;
  /** Query string parse mode */
  queryParseMode?: "loose" | "strict";
  /** Case-sensitive routing? */
  caseSensitive?: boolean;
  /** Trailing slash handling */
  trailingSlash?: "add" | "remove" | "ignore";
}

export interface NavigationResult {
  /** Was the navigation successful? */
  success: boolean;
  /** Final route info */
  route: RouteInfo | null;
  /** Redirect URL if redirected */
  redirectUrl?: string;
  /** Error message if failed */
  error?: string;
}

// --- Internal Types ---

interface RegisteredRoute {
  definition: RouteDefinition;
  paramNames: string[];
  regex: RegExp;
  wildcard: boolean;
  children: RegisteredRoute[];
}

// --- Path Utilities ---

/** Parse a path pattern into parameter names and regex. */
function parsePath(pattern: string, caseSensitive = false): { paramNames: string[]; regex: RegExp; wildcard: boolean } {
  const paramNames: string[] = [];
  let regexStr = "";
  let wildcard = false;

  // Normalize
  let normalized = pattern.replace(/\/+/g, "/");
  if (!normalized.startsWith("/")) normalized = "/" + normalized;

  const segments = normalized.split("/").filter(Boolean);

  for (const segment of segments) {
    if (segment === "*") {
      wildcard = true;
      regexStr += "/(.*)";
    } else if (segment.startsWith(":")) {
      const name = segment.slice(1);
      paramNames.push(name);
      regexStr += "/([^/]+)";
    } else {
      regexStr += `/${escapeRegex(segment)}`;
    }
  }

  if (regexStr === "") regexStr = "/";

  const flags = caseSensitive ? "" : "i";

  return {
    paramNames,
    regex: new RegExp(`^${regexStr}$`, flags),
    wildcard,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match a URL against registered routes. */
function matchRoute(
  url: string,
  routes: RegisteredRoute[],
  parents: RouteInfo[] = [],
): RouteInfo | null {
  for (const route of routes) {
    const match = url.match(route.regex);
    if (match) {
      // Extract params
      const params: Record<string, string> = {};
      for (let i = 0; i < route.paramNames.length; i++) {
        params[route.paramNames[i]!] = decodeURIComponent(match[i + 1]!);
      }

      // Parse query and hash
      const [pathPart, hashPart] = url.split("#");
      const queryIdx = pathPart.indexOf("?");
      const pathname = queryIdx >= 0 ? pathPart.slice(0, queryIdx) : pathPart;
      const queryString = queryIdx >= 0 ? pathPart.slice(queryIdx + 1) : "";
      const query = parseQuery(queryString);
      const hash = hashPart ?? "";

      // Build route info
      const info: RouteInfo = {
        path: route.definition.path,
        fullPath: url,
        params,
        query,
        hash,
        route: route.definition,
        parents,
        breadcrumbs: buildBreadcrumbs(parents, route.definition, params),
        navId: generateNavId(),
      };

      // Try matching children first
      if (route.children.length > 0) {
        // For child matching, we need the remaining URL portion
        const childMatch = matchChildRoutes(url, route.children, [...parents, info]);
        if (childMatch) return childMatch;
      }

      return info;
    }
  }

  return null;
}

function matchChildRoutes(
  url: string,
  children: RegisteredRoute[],
  parents: RouteInfo[],
): RouteInfo | null {
  // Find where parent path ends and child begins
  for (const child of children) {
    const match = url.match(child.regex);
    if (match) {
      const params: Record<string, string> = {};
      for (let i = 0; i < child.paramNames.length; i++) {
        params[child.paramNames[i]!] = decodeURIComponent(match[i + 1]!);
      }

      const [pathPart, hashPart] = url.split("#");
      const queryIdx = pathPart.indexOf("?");
      const queryString = queryIdx >= 0 ? pathPart.slice(queryIdx + 1) : "";
      const hash = hashPart ?? "";

      return {
        path: child.definition.path,
        fullPath: url,
        params,
        query: parseQuery(queryString),
        hash,
        route: child.definition,
        parents,
        breadcrumbs: buildBreadcrumbs(parents, child.definition, params),
        navId: generateNavId(),
      };
    }
  }
  return null;
}

function parseQuery(queryString: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!queryString) return result;

  const pairs = queryString.split("&");
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split("=");
    if (key) {
      result[decodeURIComponent(key)] = decodeURIComponent(valueParts.join("="));
    }
  }
  return result;
}

function stringifyQuery(query: Record<string, string>): string {
  return Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

function buildBreadcrumbs(
  parents: RouteInfo[],
  route: RouteDefinition,
  params: Record<string, string>,
): BreadcrumbEntry[] {
  const crumbs: BreadcrumbEntry[] = [];

  for (const parent of parents) {
    crumbs.push({
      label: parent.route.title ?? parent.route.meta?.title as string ?? parent.path,
      path: parent.fullPath,
      params: parent.params,
    });
  }

  const label = route.title ?? route.meta?.title as string ?? route.path;
  crumbs.push({
    label: replaceParams(label, params),
    path: route.path,
    params,
  });

  return crumbs;
}

function replaceParams(template: string, params: Record<string, string>): string {
  return template.replace(/:(\w+)/g, (_, name) => params[name] ?? name);
}

function generateNavId(): string {
  return `nav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- Core Router ---

export class RouterLite {
  private options: Required<RouterOptions>;
  private routes: RegisteredRoute[] = [];
  private currentRoute: RouteInfo | null = null;
  private navigationId = 0;
  private popStateHandler: ((e: PopStateEvent) => void) | null = null;
  private hashChangeHandler: (() => void) | null = null;
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private listeners: Set<(route: RouteInfo | null) => void> = new Map() as Set<(route: RouteInfo | null) => void>;
  private scrollPositions: Map<string, { x: number; y: number }> = new Map();
  private pendingNavigation: Promise<NavigationResult> | null = null;

  constructor(options: RouterOptions = {}) {
    this.options = {
      mode: "history",
      basePath: "",
      scrollBehavior: "auto",
      linkSelector: 'a[href]:not([target]):not([data-no-router])',
      transitions: false,
      transitionDuration: 200,
      queryParseMode: "loose",
      caseSensitive: false,
      trailingSlash: "ignore",
      ...options,
    };

    // Setup event listeners
    this.setupEventListeners();
  }

  /** Add route definitions. */
  addRoutes(routes: RouteDefinition[]): this {
    for (const route of routes) {
      const parsed = parsePath(route.path, this.options.caseSensitive);
      this.routes.push({
        definition: route,
        ...parsed,
        children: (route.children ?? []).map((child) => {
          const cp = parsePath(child.path, this.options.caseSensitive);
          return { definition: child, ...cp, children: [] };
        }),
      });
    }
    return this;
  }

  /** Navigate to a path. */
  async navigate(path: string, options: { replace?: boolean; state?: Record<string, unknown> } = {}): Promise<NavigationResult> {
    // Cancel any pending navigation
    if (this.pendingNavigation) {
      // Don't cancel — let it resolve naturally
    }

    this.pendingNavigation = this.performNavigation(path, options.replace ?? false, options.state);
    return this.pendingNavigation;
  }

  /** Go back in history. */
  back(): void {
    window.history.back();
  }

  /** Go forward in history. */
  forward(): void {
    window.history.forward();
  }

  /** Go N steps in history. */
  go(delta: number): void {
    window.history.go(delta);
  }

  /** Get current route information. */
  getCurrentRoute(): RouteInfo | null {
    return this.currentRoute;
  }

  /** Get current full URL. */
  getCurrentURL(): string {
    return this.getCurrentPath();
  }

  /** Check if a path matches any registered route. */
  hasRoute(path: string): boolean {
    return this.match(path) !== null;
  }

  /** Resolve a path to its route info without navigating. */
  resolve(path: string): RouteInfo | null {
    return this.match(path);
  }

  /** Generate URL for a route name/with params. */
  generateUrl(path: string, params?: Record<string, string>, query?: Record<string, string>): string {
    let url = path;

    // Replace :param values
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url = url.replace(`:${key}`, encodeURIComponent(value));
      }
    }

    // Add query string
    if (query && Object.keys(query).length > 0) {
      url += `?${stringifyQuery(query)}`;
    }

    return this.options.basePath + url;
  }

  /** Subscribe to route changes. Returns unsubscribe function. */
  onChange(callback: (route: RouteInfo | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /** Check if we're on the given path. */
  isActive(path: string, exact = false): boolean {
    if (!this.currentRoute) return false;
    if (exact) return this.currentRoute.path === path;
    return this.currentRoute.fullPath.startsWith(path);
  }

  /** Start the router (match initial route). */
  start(initialPath?: string): NavigationResult {
    const path = initialPath ?? this.getCurrentPath();
    const matched = this.match(path);

    if (matched) {
      this.currentRoute = matched;
      this.updateDocumentTitle(matched);
      this.handleScroll(matched.route.scroll ?? this.options.scrollBehavior === "restore" ? "restore" : "top");
      this.notifyListeners();
      return { success: true, route: matched };
    }

    if (this.options.notFound) {
      const notFoundInfo: RouteInfo = {
        path: this.options.notFound.path,
        fullPath: path,
        params: {},
        query: {},
        hash: "",
        route: this.options.notFound,
        parents: [],
        breadcrumbs: [{ label: "Not Found", path: path }],
        navId: generateNavId(),
      };
      this.currentRoute = notFoundInfo;
      this.notifyListeners();
      return { success: true, route: notFoundInfo };
    }

    return { success: false, route: null, error: `No route matched: ${path}` };
  }

  /** Stop the router — clean up event listeners. */
  stop(): void {
    if (this.popStateHandler) {
      window.removeEventListener("popstate", this.popStateHandler);
    }
    if (this.hashChangeHandler) {
      window.removeEventListener("hashchange", this.hashChangeHandler);
    }
    if (this.clickHandler) {
      document.removeEventListener("click", this.clickHandler);
    }
    this.listeners.clear();
  }

  // --- Internal ---

  private getCurrentPath(): string {
    switch (this.options.mode) {
      case "history": {
        const base = this.options.basePath;
        let path = window.location.pathname;
        if (base && path.startsWith(base)) {
          path = path.slice(base.length);
        }
        return path + window.location.search + (window.location.hash || "");
      }
      case "hash":
        return (window.location.hash.replace(/^#/, "") || "/") + window.location.search;
      case "memory":
        return "/";
      default:
        return "/";
    }
  }

  private match(url: string): RouteInfo | null {
    // Strip query/hash for matching
    const cleanUrl = url.split("?")[0]?.split("#")[0] ?? url;
    return matchRoute(cleanUrl, this.routes);
  }

  private async performNavigation(
    targetPath: string,
    replace: boolean,
    state?: Record<string, unknown>,
  ): Promise<NavigationResult> {
    const navId = ++this.navigationId;
    const from = this.currentRoute;

    // Normalize path
    let path = targetPath;
    if (!path.startsWith("/")) path = "/" + path;
    if (this.options.basePath && !path.startsWith(this.options.basePath)) {
      path = this.options.basePath + path;
    }

    // Handle trailing slash
    switch (this.options.trailingSlash) {
      case "add":
        if (!path.endsWith("/") && !path.includes(".")) path += "/";
        break;
      case "remove":
        path = path.replace(/\/+$/, "") || "/";
        break;
    }

    // Match route
    const matched = this.match(path);

    if (!matched) {
      if (this.options.notFound) {
        const nf: RouteInfo = {
          path: this.options.notFound.path,
          fullPath: path,
          params: {},
          query: parseQuery(path.split("?")[1] ?? ""),
          hash: path.split("#")[1] ?? "",
          route: this.options.notFound,
          parents: [],
          breadcrumbs: [{ label: "Not Found", path }],
          navId: generateNavId(),
        };
        this.currentRoute = nf;
        this.updateURL(nf.fullPath, replace);
        this.notifyListeners();
        return { success: true, route: nf };
      }
      return { success: false, route: null, error: `No route matched: ${path}` };
    }

    // Build context for guards
    const ctx: NavigationContext = {
      to: matched,
      from,
      type: replace ? "replace" : "push",
      direction: from ? "forward" : "forward",
    };

    // Run global guard
    if (this.options.beforeEach) {
      const guardResult = await this.options.beforeEach(ctx);
      if (guardResult === false) {
        return { success: false, route: this.currentRoute, error: "Navigation cancelled by global guard" };
      }
      if (typeof guardResult === "string") {
        return this.navigate(guardResult, { replace });
      }
    }

    // Run route-specific guard
    if (matched.route.guard) {
      const routeGuard = matched.route.guard(ctx);
      if (routeGuard === false) {
        return { success: false, route: this.currentRoute, error: "Navigation cancelled by route guard" };
      }
      if (typeof routeGuard === "string") {
        return this.navigate(routeGuard, { replace });
      }
    }

    // Run beforeEnter hook
    if (matched.route.beforeEnter) {
      await matched.route.beforeEnter(matched, from);
    }

    // Check this navigation wasn't superseded
    if (navId !== this.navigationId) {
      return { success: false, route: null, error: "Navigation superseded" };
    }

    // Save scroll position
    if (from && this.options.scrollBehavior === "restore") {
      this.scrollPositions.set(from.fullPath, {
        x: window.scrollX,
        y: window.scrollY,
      });
    }

    // Update URL
    this.updateURL(matched.fullPath, replace, state);

    // Run data loader
    if (matched.route.loader) {
      try {
        await matched.route.loader(matched.params);
      } catch (err) {
        console.error("Router: Loader failed:", err);
      }
    }

    // Update current route
    this.currentRoute = matched;
    this.updateDocumentTitle(matched);
    this.handleScroll(matched.route.scroll ?? "top");

    // Run after hooks
    this.options.afterEach?.(matched);
    matched.route.afterEnter?.(matched);

    this.notifyListeners();

    return { success: true, route: matched };
  }

  private updateURL(path: string, replace: boolean, state?: Record<string, unknown>): void {
    const fullUrl = this.options.basePath + path;

    switch (this.options.mode) {
      case "history":
        if (replace) {
          window.history.replaceState(state ?? {}, "", fullUrl);
        } else {
          window.history.pushState(state ?? {}, "", fullUrl);
        }
        break;
      case "hash":
        const hashPath = "#" + path;
        if (replace) {
          window.location.replace(hashPath);
        } else {
          window.location.hash = hashPath;
        }
        break;
      case "memory":
        // No-op for memory mode
        break;
    }
  }

  private updateDocumentTitle(route: RouteInfo): void {
    if (route.route.title) {
      document.title = replaceParams(route.route.title, route.params);
    }
  }

  private handleScroll(scrollOption: string): void {
    if (this.options.scrollBehavior === "manual") return;

    requestAnimationFrame(() => {
      switch (scrollOption) {
        case "restore": {
          const pos = this.scrollPositions.get(this.currentRoute?.fullPath ?? "");
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

  private setupEventListeners(): void {
    // PopState for history mode
    if (this.options.mode === "history") {
      this.popStateHandler = (_e: PopStateEvent) => {
        const path = this.getCurrentPath();
        this.performNavigation(path, true).catch(() => {});
      };
      window.addEventListener("popstate", this.popStateHandler);
    }

    // Hash change for hash mode
    if (this.options.mode === "hash") {
      this.hashChangeHandler = () => {
        const path = this.getCurrentPath();
        this.performNavigation(path, true).catch(() => {});
      };
      window.addEventListener("hashchange", this.hashChangeHandler);
    }

    // Click interception for same-app links
    if (typeof document !== "undefined") {
      this.clickHandler = (e: MouseEvent) => {
        const target = (e.target as HTMLElement)?.closest(this.options.linkSelector);
        if (!target) return;

        const href = (target as HTMLAnchorElement).getAttribute("href");
        if (!href || href.startsWith("//") || href.startsWith("http://") || href.startsWith("https://")) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

        e.preventDefault();
        this.navigate(href).catch(() => {});
      };
      document.addEventListener("click", this.clickHandler);
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.currentRoute);
    }
  }
}

// --- Factory Function ---

/** Create a new router instance with the given options. */
export function createRouter(options?: RouterOptions): RouterLite {
  return new RouterLite(options);
}
