/**
 * Advanced URL manipulation and parsing utilities.
 */

/** Parse a URL into components (works in Node.js too) */
export interface ParsedUrl {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  username: string;
  password: string;
  origin: string;
  href: string;
}

export function parseUrl(url: string): ParsedUrl | null {
  try {
    // Handle relative URLs
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("//")) {
      if (typeof window !== "undefined") {
        url = window.location.origin + (url.startsWith("/") ? "" : "/") + url;
      } else {
        return null;
      }
    }

    const parsed = new URL(url);

    return {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      username: parsed.username,
      password: parsed.password,
      origin: parsed.origin,
      href: parsed.href,
    };
  } catch {
    return null;
  }
}

/** Build a URL from components */
export function buildUrlFromParts(parts: Partial<ParsedUrl>): string {
  const url = new URL(parts.pathname ?? "/", parts.origin ?? "https://example.com");

  if (parts.search) url.search = parts.search;
  if (parts.hash) url.hash = parts.hash;

  return url.toString();
}

/** Update query parameters on a URL */
export function updateSearchParams(
  url: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  const parsed = parseUrl(url);
  if (!parsed) return url;

  const searchParams = new URLSearchParams(parsed.search);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === false) {
      searchParams.delete(key);
    } else if (value === true) {
      searchParams.set(key, "1");
    } else {
      searchParams.set(key, String(value));
    }
  }

  parsed.search = searchParams.toString();
  return buildUrlFromParts(parsed);
}

/** Remove query parameters from a URL */
export function removeSearchParams(url: string, keys: string[]): string {
  const parsed = parseUrl(url);
  if (!parsed) return url;

  const searchParams = new URLSearchParams(parsed.search);
  for (const key of keys) {
    searchParams.delete(key);
  }

  parsed.search = searchParams.toString();
  return buildUrlFromParts(parsed);
}

/** Get query parameters as an object */
export function getQueryParams(url: string): Record<string, string> {
  const parsed = parseUrl(url);
  if (!parsed) return {};

  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(parsed.search);

  for (const [key, value] of searchParams) {
    params[key] = value;
  }

  return params;
}

/** Check if two URLs have the same origin */
export function isSameOrigin(url1: string, url2: string): boolean {
  try {
    const u1 = new URL(url1, typeof location !== "undefined" ? location.href : "https://example.com");
    const u2 = new URL(url2, typeof location !== "undefined" ? location.href : "https://example.com");

    return u1.origin === u2.origin;
  } catch {
    return false;
  }
}

/** Normalize a URL (remove trailing slash, lowercase protocol/host) */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url, typeof location !== "undefined" ? location.href : "https://example.com");
    let result = `${parsed.protocol}//${parsed.hostname.toLowerCase()}`;

    if (parsed.port && !((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80"))) {
      result += `:${parsed.port}`;
    }

    result += parsed.pathname.replace(/\/+$/, "");

    if (parsed.search) result += parsed.search;
    if (parsed.hash) result += parsed.hash;

    return result;
  } catch {
    return url;
  }
}

/** Check if a URL is absolute (has protocol) */
export function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || /^\/\//i.test(url);
}

/** Make a relative URL absolute based on a base */
export function makeAbsoluteUrl(relativeUrl: string, baseUrl?: string): string {
  if (isAbsoluteUrl(relativeUrl)) return relativeUrl;

  const base = baseUrl ?? (typeof window !== "undefined" ? window.location.href : "https://example.com");

  try {
    return new URL(relativeUrl, base).href;
  } catch {
    return relativeUrl;
  }
}

/** Extract the domain from a URL */
export function getDomainFromUrl(url: string): string | null {
  const parsed = parseUrl(url);
  return parsed?.hostname ?? null;
}

/** Extract the path without query/hash */
export function getPathnameFromUrl(url: string): string {
  const parsed = parseUrl(url);
  return parsed?.pathname ?? "";
}

/** Join path segments safely */
export function joinPathSegments(...segments: string[]): string {
  return segments
    .map((s, i) => {
      if (i === 0) return s.replace(/\/+$/, "");
      return s.replace(/^\/+|\/+$/g, "");
    })
    .filter(Boolean)
    .join("/");
}

/** Encode URI component with special handling for slashes */
export function encodeUriComponentSafe(str: string): string {
  return encodeURIComponent(str).replace(/%2F/g, "/");
}

/** Decode URI component safely */
export function decodeUriComponentSafe(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

/** Compare two URLs for equality (ignoring trailing slash, case, etc.) */
export function urlsEqual(a: string, b: string): boolean {
  return normalizeUrl(a) === normalizeUrl(b);
}
