/**
 * URL parsing and manipulation utilities.
 */

/** Validate URL string */
export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

/** Get domain from URL */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Get pathname from URL */
export function getPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

/** Get query params as object */
export function getQueryParams(url: string): Record<string, string> {
  try {
    return Object.fromEntries(new URL(url).searchParams.entries());
  } catch {
    return {};
  }
}

/** Check if URL is absolute (has protocol) */
export function isAbsoluteUrl(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url);
}

/** Check if URL is same origin */
export function isSameOrigin(url1: string, url2: string): boolean {
  try {
    return new URL(url1).origin === new URL(url2).origin;
  } catch {
    return false;
  }
}

/** Join path segments safely */
export function joinPath(...segments: string[]): string {
  return segments
    .map((s) => s.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

/** Make relative URL absolute using base */
export function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).toString();
  } catch {
    return relative;
  }
}

/** Strip query string and hash from URL */
export function stripQueryAndHash(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url.split("?")[0].split("#")[0];
  }
}

/** Extract file extension from URL path */
export function getUrlExtension(url: string): string {
  const pathname = getPathname(url);
  const lastDot = pathname.lastIndexOf(".");
  return lastDot > pathname.lastIndexOf("/") ? pathname.slice(lastDot + 1) : "";
}
