/**
 * React Router Utilities: Route matching, query parameter parsing,
 * navigation guards, route metadata, breadcrumbs, and router
 * integration helpers for React Router (and framework-agnostic usage).
 */

// --- Types ---

export interface RouteDef {
  /** Path pattern (e.g., "/users/:id") */
  path: string;
  /** Route name for display */
  name?: string;
  /** Child routes */
  children?: RouteDef[];
  /** Route metadata */
  meta?: Record<string, unknown>;
  /** Guard function — return false to block navigation */
  guard?: () => boolean | Promise<boolean>;
  /** Layout wrapper component */
  layout?: unknown;
}

export interface ParsedRoute {
  /** Matched route definition */
  route: RouteDef;
  /** Extracted path parameters */
  params: Record<string, string>;
  /** Remaining path not consumed */
  remaining: string;
  /** Query parameters */
  query: Record<string, string>;
}

export interface BreadcrumbItem {
  label: string;
  href: string;
  /** Is this the current page? */
  current: boolean;
}

// --- Path Matching ---

/** Simple path-to-regexp style matcher */
export function matchPath(
  pattern: string,
  pathname: string,
): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);

  if (patternParts.length > pathParts.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]!;
    const pathPart = pathParts[i]!;

    if (patternPart.startsWith(":")) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  // Check exact match or prefix match
  if (patternParts.length === pathParts.length || pattern.endsWith("/*")) {
    return params;
  }

  return null;
}

/** Match a pathname against a list of route definitions */
export function matchRoutes(
  routes: RouteDef[],
  pathname: string,
): ParsedRoute | null {
  const query = parseQuery(pathname);
  const cleanPath = pathname.split("?")[0] ?? "";

  for (const route of routes) {
    const params = matchPath(route.path, cleanPath);
    if (params) {
      const consumedLength = route.path.split("/").filter(Boolean).length;
      const remainingParts = cleanPath.split("/").filter(Boolean).slice(consumedLength);
      const remaining = "/" + remainingParts.join("/");

      // Try matching children
      if (route.children?.length && remainingParts.length > 0) {
        const childMatch = matchRoutes(route.children, remaining);
        if (childMatch) {
          return { ...childMatch, params: { ...params, ...childMatch.params }, query };
        }
      }

      return { route, params, remaining, query };
    }
  }

  return null;
}

// --- Query Parameter Parsing ---

/** Parse URL query string into an object */
export function parseQuery(urlOrSearch: string): Record<string, string> {
  const qIndex = urlOrSearch.indexOf("?");
  const search = qIndex === -1 ? "" : urlOrSearch.slice(qIndex + 1);
  if (!search) return {};

  const params: Record<string, string> = {};
  const pairs = search.split("&");

  for (const pair of pairs) {
    const [key, ...rest] = pair.split("=");
    if (!key) continue;
    params[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
  }

  return params;
}

/** Serialize an object into a query string */
export function stringifyQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/** Update a single query parameter in a URL */
export function setQueryParam(
  url: string,
  key: string,
  value: string | number | undefined,
): string {
  const [base, search] = url.split("?");
  const params = parseQuery(search ?? "");

  if (value === undefined) {
    delete params[key];
  } else {
    params[key] = String(value);
  }

  const newQuery = stringifyQuery(params);
  return base + newQuery;
}

// --- Navigation Guards ---

/** Create a navigation guard that checks conditions before allowing navigation */
export function createNavigationGuard(
  condition: () => boolean | Promise<boolean>,
  options?: {
    redirectTo?: string;
    onBlocked?: () => void;
  },
): () => Promise<boolean> {
  return async (): Promise<boolean> => {
    const allowed = await condition();
    if (!allowed) {
      options?.onBlocked?.();
      if (options?.redirectTo) {
        window.location.href = options.redirectTo;
      }
      return false;
    }
    return true;
  };
}

// --- Breadcrumbs ---

/** Generate breadcrumb trail from matched routes */
export function generateBreadcrumbs(
  routes: RouteDef[],
  pathname: string,
  options?: {
    /** Custom label resolver per route */
    getLabel?: (route: RouteDef, params: Record<string, string>) => string;
    /** Home label */
    homeLabel?: string;
    /** Home path */
    homePath?: string;
  },
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [];
  const getLabel = options?.getLabel ?? ((r) => r.name ?? r.path.split("/").pop() ?? "");
  const cleanPath = pathname.split("?")[0] ?? "";

  // Add home
  if (options?.homePath) {
    crumbs.push({
      label: options.homeLabel ?? "Home",
      href: options.homePath,
      current: cleanPath === options.homePath,
    });
  }

  // Walk through path segments building up crumbs
  const segments = cleanPath.split("/").filter(Boolean);
  let builtPath = "";

  for (let i = 0; i < segments.length; i++) {
    builtPath += "/" + segments[i]!;

    // Find matching route at this level
    let found = false;
    for (const route of routes) {
      const params = matchPath(route.path, builtPath);
      if (params) {
        crumbs.push({
          label: getLabel(route, params),
          href: builtPath,
          current: i === segments.length - 1,
        });
        found = true;

        // Recurse into children
        if (route.children && i < segments.length - 1) {
          const childCrumbs = generateBreadcrumbs(route.children, builtPath + "/" + segments.slice(i + 1).join("/"), options);
          crumbs.push(...childCrumbs.filter((c) => !c.current));
        }
        break;
      }
    }

    if (!found && i === segments.length - 1) {
      // Last segment with no match — add as-is
      crumbs.push({
        label: segments[i]!,
        href: builtPath,
        current: true,
      });
    }
  }

  return crumbs;
}

// --- Route Helpers ---

/** Check if a path matches a pattern (for active link highlighting) */
export function isActiveRoute(currentPath: string, pattern: string, exact = false): boolean {
  if (exact) {
    const cleanCurrent = currentPath.split("?")[0] ?? "";
    return cleanCurrent === pattern || cleanCurrent === pattern + "/";
  }
  return currentPath.startsWith(pattern);
}

/** Join path segments safely */
export function joinPaths(...segments: string[]): string {
  return segments
    .map((s) => s.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

/** Resolve a relative path against a base path */
export function resolvePath(base: string, relative: string): string {
  if (relative.startsWith("/")) return relative;
  if (relative.startsWith(".")) {
    const baseDir = base.substring(0, base.lastIndexOf("/"));
    const combined = baseDir + "/" + relative;
    // Normalize .. and .
    const parts = combined.split("/");
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === "..") resolved.pop();
      else if (part !== "." && part) resolved.push(part);
    }
    return "/" + resolved.join("/");
  }
  return base + "/" + relative;
}
