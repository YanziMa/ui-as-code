/**
 * API Request Logger — lightweight request/response logging for debugging.
 * Only active in development; no-op in production.
 */

interface ApiLogEntry {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  ip?: string;
  userAgent?: string;
}

const LOG_QUEUE: ApiLogEntry[] = [];
const MAX_ENTRIES = 200;

/** Log an API request (call from route handlers) */
export function logApiRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number,
  req?: Request,
): void {
  if (process.env.NODE_ENV === "production") return;

  const entry: ApiLogEntry = {
    timestamp: new Date().toISOString(),
    method,
    path: sanitizePath(path),
    status,
    durationMs,
    ip: req?.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req?.headers.get("user-agent") ?? undefined,
  };

  LOG_QUEUE.push(entry);
  if (LOG_QUEUE.length > MAX_ENTRIES) LOG_QUEUE.shift();

  const statusIcon = status < 400 ? "\u2713" : status < 500 ? "\u26A0" : "\u2717";
  console.log(
    `[API] ${statusIcon} ${method} ${path} ${status} (${durationMs}ms)`,
  );
}

/** Get recent logs (for debug endpoint) */
export function getApiLogs(): ApiLogEntry[] {
  return [...LOG_QUEUE];
}

/** Clear all logs */
export function clearApiLogs(): void {
  LOG_QUEUE.length = 0;
}

/** Sanitize path to remove sensitive query params */
function sanitizePath(path: string): string {
  try {
    const url = new URL(path, "http://localhost");
    url.searchParams.delete("token");
    url.searchParams.delete("key");
    url.searchParams.delete("secret");
    return url.pathname + (url.search || "");
  } catch {
    return path;
  }
}
