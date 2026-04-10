/**
 * URL builder, parser, manipulator, and validation utilities.
 */

export interface ParsedUrl {
  protocol: string;
  username: string | null;
  password: string | null;
  host: string;
  port: string | null;
  pathname: string;
  search: string;
  hash: string;
}

export interface UrlParts {
  protocol: string;
  hostname: string;
  port?: number;
  pathname: string;
  search: Record<string, string>;
  hash: string;
  /** Username:password for auth URLs */
  auth?: string;
}

/** Parse a full URL into components */
export function parseUrl(url: string): ParsedUrl | null {
  try {
    // Handle protocol-relative URLs
    if (!url.includes("://") url = "https://" + url;

    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.replace(":", ""),
      username: parsed.username || null,
      password: parsed.password || null,
      host: parsed.hostname,
      port: parsed.port || null,
      pathname: parsed.pathname + (parsed.search || ""),
      search: parsed.searchParams.toString(),
      hash: parsed.hash || "",
    };
  } catch {
    return null;
  }
}

/** Build a URL from parts */
export function buildUrl(parts: UrlParts): string {
  let url = "";

  if (parts.auth) {
    url += `${parts.protocol}://${parts.auth}@`;
  } else {
    url += `${parts.protocol}://`;
  }

  url += parts.hostname;
  if (parts.port) url += `:${parts.port}`;
  url += parts.pathname;

  if (Object.keys(parts.search).length > 0) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(parts.search)) {
      params.set(k, v);
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  if (parts.hash) url += `#${parts.hash}`;

  return url;
}

/** Parse query parameters into object */
export function getQueryParams(searchStr: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!searchStr || !searchStr.startsWith("?")) return params;

  try {
    const urlParams = new URLSearchParams(searchStr);
    for (const [key, value] of urlParams.entries()) {
      params[key] = value;
    }
  } catch {}

  return params;
}

/** Build query string from object */
export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries as [string, string][]).toString();
}

/** Add/update a query parameter */
export function setQueryParam(url: string, key: string, value: string): string {
  const parsed = parseUrl(url);
  if (!parsed) return url;

  const params = new URLSearchParams(parsed.search);
  params.set(key, value);

  return `${parsed.protocol}://${parsed.host}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}?${params.toString()}${parsed.hash}`;
}

/** Remove a query parameter */
export function removeQueryParam(url: string, key: string): string {
  const parsed = parseUrl(url);
  if (!parsed) return url;

  const params = new URLSearchParams(parsed.search);
  params.delete(key);

  const qs = params.toString();
  return `${parsed.protocol}://${parsed.host}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}${qs ? `?${qs}` : ""}${parsed.hash}`;
}

/** Check if two URLs have the same origin */
export function isSameOrigin(a: string, b: string): boolean {
  try {
    const pa = new URL(a, location.origin);
    const pb = new URL(b, location.origin);
    return pa.origin === pb.origin;
  } catch {
    return a === b;
  }
}

/** Check if URL is absolute */
export function isAbsoluteUrl(url: string): boolean {
  return /^[a-z][a-z0-9+-.]+:/i.test(url) || /^\/\//i.test(url);
}

/** Make relative URL absolute against base */
export function resolveUrl(relative: string, base: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

/** Get domain from URL */
export function getDomain(url: string): string | null {
  const parsed = parseUrl(url);
  return parsed?.host ?? null;
}

/** Get pathname from URL */
export function getPathname(url: string): string | null {
  const parsed = parseUrl(url);
  return parsed?.pathname ?? null;
}

/** Get hash/fragment from URL */
export function getHash(url: string): string {
  const parsed = parseUrl(url);
  return parsed?.hash?.replace("#", "") ?? "";
}

/** Check if URL uses HTTPS */
export function isHttps(url: string): boolean {
  return url.startsWith("https://");
}

/** Check if URL is a data URI */
export function isDataUri(url: string): boolean {
  return url.startsWith("data:");
}

/** Encode URI component safely */
export function encodeUriComponent(str: string): string {
  return encodeURIComponent(str);
}

/** Decode URI component */
export function decodeUriComponent(str: string): string {
  try { return decodeURIComponent(str); } catch { return str; }
}

/** Join path segments */
export function joinPath(...segments: string[]): string {
  return segments
    .map((s) => s.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

/** Normalize a path (remove duplicate slashes, resolve ..) */
export function normalizePath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === "..") {
      resolved.pop();
    } else if (part !== ".") {
      resolved.push(part);
    }
  }

  return "/" + resolved.join("/");
}

/** Get file extension from URL path */
export function getUrlExtension(url: string): string {
  const pathname = getPathname(url) ?? url;
  const lastDot = pathname.lastIndexOf(".");
  if (lastDot < 0) return "";
  return pathname.slice(lastDot + 1);
}

/** Strip query string and hash from URL */
export function stripQueryAndHash(url: string): string {
  const qIdx = url.indexOf("?");
  const hIdx = url.indexOf("#");
  const end = hIdx >= 0 ? hIdx : (qIdx >= 0 ? qIdx : url.length);
  return url.slice(0, end);
}

/** Compare two URLs ignoring trailing slash, search, hash */
export function urlsEqual(a: string, b: string): boolean {
  const normalize = (u: string) => {
    let url = u.trim();
    if (url.endsWith("/")) url = url.slice(0, -1);
    return url.toLowerCase();
  };
  return normalize(a) === normalize(b);
}

/** Parse mailto: link into components */
export function parseMailtoLink(href: string): { to: string; subject?: string; body?: string } | null {
  const match = href.match(/^mailto:(.+?)(\?(.+))?(\&body=(.+))?$/i);
  if (!match) return null;

  return {
    to: decodeURIComponent(match[1]?.replace(/\+/g, "%20")),
    subject: match[2] ? decodeURIComponent(match[2].replace(/\+/g, "%20")) : undefined,
    body: match[4] ? decodeURIComponent(match[4]) : undefined,
  };
}

/** Build mailto: link */
export function buildMailtoLink(to: string, subject?: string, body?: string): string {
  let link = `mailto:${encodeURIComponent(to)}`;
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  if (params.length > 0) link += "?" + params.join("&");
  return link;
}

/** Validate URL format */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** Sanitize a URL for safe embedding (remove javascript:, etc.) */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove dangerous protocols
    if (!["http:", "https:", "mailto:", "tel:", "data:"].includes(parsed.protocol)) {
      return "";
    }
    // Remove script injection in fragments
    if (parsed.hash.includes("<") || parsed.hash.includes(">")) {
      return `${stripQueryAndHash(url)}#`;
    }
    return url;
  } catch {
    return "";
  }
}
