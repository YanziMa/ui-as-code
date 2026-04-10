/**
 * Security utilities.
 */

/** Generate CSP nonce for inline scripts */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Check if request appears to be from a bot */
export function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const bots = [
    /bot/i,
    /crawl/i,
    /spider/i,
    /scraper/i,
    /slurp/i,
    /mediapartners/i,
    /googlebot/i,
    /bingbot/i,
    /yandexbot/i,
    /baiduspider/i,
  ];
  return bots.some((pattern) => pattern.test(userAgent));
}

/** Rate limit state (in-memory, per-process) */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Simple in-memory rate limiter.
 * @param key Identifier (e.g., IP address)
 * @param windowMs Time window in milliseconds
 * @param maxRequests Max requests allowed in window
 */
export function rateLimit(
  key: string,
  windowMs: number = 60_000,
  maxRequests: number = 100,
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs, limit: maxRequests };
  }

  entry.count += 1;
  return {
    allowed: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
    limit: maxRequests,
  };
}

/** Clean up expired rate limit entries */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}

/** Validate origin against allowed list */
export function isAllowedOrigin(
  origin: string | undefined,
  allowedOrigins: string[],
): boolean {
  if (!origin) return false;
  return allowedOrigins.some((allowed) =>
    allowed === "*" || origin === allowed || origin.endsWith("." + allowed.replace("https://", "")),
  );
}

/** Sanitize filename to prevent path traversal */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/\.\./g, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 255);
}
