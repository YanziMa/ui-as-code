/**
 * Server Utilities: SSR helpers, environment detection,
 * request context extraction, URL manipulation, CORS handling,
 * and isomorphic compatibility utilities.
 */

// --- Environment Detection ---

export interface EnvInfo {
  /** Running in browser? */
  isBrowser: boolean;
  /** Running in Node.js/Deno? */
  isNode: boolean;
  /** Running in Deno? */
  isDeno: boolean;
  /** Running in a Web Worker? */
  isWorker: boolean;
  /** DOM available? */
  hasDOM: boolean;
  /** Window object available? */
  hasWindow: boolean;
}

/** Get current runtime environment info */
export function getEnvInfo(): EnvInfo {
  return {
    isBrowser: typeof window !== "undefined" && typeof document !== "undefined",
    isNode: typeof process !== "undefined" && typeof process.versions?.node === "string",
    isDeno: typeof Deno !== "undefined",
    isWorker: typeof WorkerGlobalScope !== "undefined" && typeof window === "undefined",
    hasDOM: typeof document !== "undefined",
    hasWindow: typeof window !== "undefined",
  };
}

/** Check if code is running on the server side */
export function isServerSide(): boolean {
  return typeof window === "undefined";
}

/** Check if code is running on the client side */
export function isClientSide(): boolean {
  return typeof window !== "undefined";
}

// --- URL Utilities ---

/** Parse a URL and return its components */
export function parseURL(url: string): {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
} {
  try {
    const parsed = new URL(url, isClientSide() ? location.href : undefined);
    return {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      origin: parsed.origin,
    };
  } catch {
    // Fallback manual parse for relative URLs
    return { protocol: "", hostname: "", port: "", pathname: url, search: "", hash: "", origin: "" };
  }
}

/** Build a URL from components */
export function buildURL(base: string, path?: string, params?: Record<string, string>): string {
  let url = base.replace(/\/+$/, "");
  if (path) {
    url += path.startsWith("/") ? path : "/" + path;
  }
  if (params && Object.keys(params).length > 0) {
    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    url += (url.includes("?") ? "&" : "?") + qs;
  }
  return url;
}

/** Join URL path segments safely */
export function joinPath(...segments: string[]): string {
  return segments
    .map((s) => s.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

/** Check if a URL is absolute (has protocol) */
export function isAbsoluteURL(url: string): boolean {
  return /^https?:\/\//i.test(url) || /^\/\//.test(url);
}

/** Make a URL relative to the current origin */
export function makeRelative(url: string): string {
  if (!isAbsoluteURL(url)) return url;
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return url;
  }
}

// --- Request Context ---

/** Extract common request info from headers or environment */
export interface RequestContext {
  method: string;
  url: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  ip?: string;
  userAgent?: string;
  acceptLanguage?: string;
  contentType?: string;
}

/** Parse request headers into a structured context */
export function parseRequestContext(
  headers: Record<string, string>,
  options?: { url?: string; method?: string },
): RequestContext {
  const cookies: Record<string, string> = {};
  const cookieHeader = headers["cookie"] ?? "";
  if (cookieHeader) {
    for (const pair of cookieHeader.split(";")) {
      const [name, ...rest] = pair.split("=");
      if (name) cookies[name.trim()] = rest.join("=").trim();
    }
  }

  let query: Record<string, string> = {};
  if (options?.url) {
    const qIdx = options.url.indexOf("?");
    if (qIdx !== -1) {
      const search = options.url.slice(qIdx + 1);
      for (const pair of search.split("&")) {
        const [k, v] = pair.split("=");
        if (k) query[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
      }
    }
  }

  return {
    method: options?.method ?? (headers[":method"] ?? "GET"),
    url: options?.url ?? "/",
    path: options?.url?.split("?")[0] ?? "/",
    query,
    headers,
    cookies,
    ip: headers["x-forwarded-for"]?.split(",")[0]?.trim(),
    userAgent: headers["user-agent"],
    acceptLanguage: headers["accept-language"],
    contentType: headers["content-type"],
  };
}

// --- CORS Helpers ---

/** Build CORS headers for a response */
export function corsHeaders(
  origin: string | string[] | "*",
  options?: {
    methods?: string[];
    allowedHeaders?: string[];
    exposeHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  },
): Record<string, string> {
  const origins = Array.isArray(origin) ? origin : [origin];
  const allowOrigin = origins.includes("*") ? "*" : origins.join(", ");

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
  };

  if (options?.methods) {
    headers["Access-Control-Allow-Methods"] = options.methods.join(", ");
  }
  if (options?.allowedHeaders) {
    headers["Access-Control-Allow-Headers"] = options.allowedHeaders.join(", ");
  }
  if (options?.exposeHeaders) {
    headers["Access-Control-Expose-Headers"] = options.exposeHeaders.join(", ");
  }
  if (options?.credentials) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  if (options?.maxAge !== undefined) {
    headers["Access-Control-Max-Age"] = String(options.maxAge);
  }

  return headers;
}

/** Check if an origin is allowed */
export function isOriginAllowed(
  requestOrigin: string | null,
  allowedOrigins: string[] | "*",
): boolean {
  if (allowedOrigins === "*") return true;
  if (!requestOrigin) return false;
  return allowedOrigins.some((o) => o === requestOrigin || o === "null");
}

// --- SSR Compatibility ---

/**
 * Safely access browser-only APIs without crashing on server.
 * Returns fallback value when running on server.
 */
export function browserOnly<T>(fn: () => T, fallback: T): T {
  if (isClientSide()) return fn();
  return fallback;
}

/**
 * Safely access server-only APIs without crashing in browser.
 * Returns fallback value when running on client.
 */
export function serverOnly<T>(fn: () => T, fallback: T): T {
  if (isServerSide()) return fn();
  return fallback;
}

// --- Content Type Detection ---

/** Detect content type from string/content */
export function detectContentType(content: string | Buffer, filename?: string): string {
  // From filename extension
  if (filename) {
    const ext = filename.split(".").pop()?.toLowerCase();
    const extMap: Record<string, string> = {
      html: "text/html", htm: "text/html", css: "text/css",
      js: "application/javascript", mjs: "application/javascript",
      json: "application/json", jsonld: "application/ld+json",
      xml: "application/xml", svg: "image/svg+xml", png: "image/png",
      jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
      webp: "image/webp", ico: "image/x-icon",
      pdf: "application/pdf", woff: "font/woff", woff2: "font/woff2",
      txt: "text/plain", csv: "text/csv", tsv: "text/tab-separated-values",
      md: "text/markdown", wasm: "application/wasm",
    };
    if (ext && extMap[ext!]) return extMap[ext]!;
  }

  // From content sniffing
  const str = typeof content === "string" ? content : new TextDecoder().decode(content);

  if (str.trimStartsWith("<!DOCTYPE html") || str.trimStartsWith("<html")) return "text/html";
  if (str.trimStartsWith("{") || str.trimStartWith("[")) return "application/json";
  if (str.trimStartsWith("<svg")) return "image/svg+xml";
  if (str.trimStartsWith("<?xml")) return "application/xml";

  return "text/plain";
}
