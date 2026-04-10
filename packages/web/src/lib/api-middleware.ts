import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ========== Rate Limiting (in-memory, per-IP) ==========

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in ms
  maxRequests: number;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000, // 1 minute
  maxRequests: 30,
};

const GENERATE_DIFF_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 5, // AI calls are expensive
};

export function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { allowed: boolean; remaining: number; resetAt: number } {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitMap.set(ip, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

// Cleanup stale entries every 5 minutes
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }, 300_000);
}

// ========== Auth Helpers ==========

export async function getAuthUser(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    // Try cookie-based auth (Supabase default)
    const cookies = req.cookies.get("sb-access-token")?.value ||
      req.cookies.get("sb-*.auth-token")?.value;
    if (!cookies) return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token || ""}` },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token || "");

  if (error || !user) return null;
  return user;
}

export function requireAuth(req: NextRequest) {
  return getAuthUser(req).then((user) => {
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }
    return null; // null means authorized
  });
}

// ========== Response Helpers ==========

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Vary": "Origin",
};

export function apiError(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: CORS_HEADERS });
}

export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ data }, { status, headers: CORS_HEADERS });
}

// ========== Standard API Wrapper ==========

export async function withHandler(
  req?: NextRequest,
  handler?: () => Promise<NextResponse>,
  options?: { rateLimit?: RateLimitConfig; requireAuth?: boolean }
): Promise<NextResponse> {
  // Rate limit check (only if request is available)
  if (options?.rateLimit && req) {
    const result = checkRateLimit(req, options.rateLimit);
    if (!result.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) },
        }
      );
    }
  }

  // Auth check (only if request is available)
  if (options?.requireAuth && req) {
    const authResult = await requireAuth(req);
    if (authResult) return authResult;
  }

  try {
    return await (handler ?? (() => apiSuccess(null)))();
  } catch (err) {
    console.error("[API Error]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return apiError(`Internal error: ${message}`, 500);
  }
}
