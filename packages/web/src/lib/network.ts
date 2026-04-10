/**
 * Network / HTTP utilities (browser-side).
 */

/** Parse query string to object */
export function parseQueryString(str: string): Record<string, string> {
  const params: Record<string, string> = {};
  const search = str.startsWith("?") ? str.slice(1) : str;
  if (!search) return params;
  for (const pair of search.split("&")) {
    const [key, ...rest] = pair.split("=");
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
    }
  }
  return params;
}

/** Build query string from object */
export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return entries.length > 0 ? `?${entries.join("&")}` : "";
}

/** Simple fetch wrapper with timeout and retry */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number; retries?: number } = {},
): Promise<Response> {
  const { timeout = 10000, retries = 2, ...fetchOptions } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw new Error("Fetch failed");
}

/** Check if online */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/** Get estimated connection type */
export function getConnectionType(): string {
  if (typeof navigator === "undefined" || !navigator.connection) return "unknown";
  const conn = navigator.connection as { effectiveType?: string };
  return conn.effectiveType || "unknown";
}

/** Parse content-range header */
export function parseContentRange(header: string): { start: number; end: number; total: number } | null {
  const match = header.match(/bytes (\d+)-(\d+)\/(\d+|\*)/);
  if (!match) return null;
  return {
    start: parseInt(match[1]),
    end: parseInt(match[2]),
    total: match[3] === "*" ? -1 : parseInt(match[3]),
  };
}

/** Build URL with base + path + params */
export function buildUrl(
  base: string,
  path: string,
  params?: Record<string, string | number | undefined>,
): string {
  const url = new URL(path, base);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}
