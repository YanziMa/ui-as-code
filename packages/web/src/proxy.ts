import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy: Apply CORS, security headers to all /api/* routes.
 * Handles OPTIONS preflight requests.
 *
 * Next.js 16: renamed from middleware.ts to proxy.ts
 */
export function proxy(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";

  // Handle preflight (OPTIONS)
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Webhook-Signature",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }

  // For actual requests, set security + CORS headers on the response
  const response = NextResponse.next();

  // CORS
  response.headers.set("Access-Control-Allow-Origin", origin || "*");
  response.headers.set("Vary", "Origin");

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
