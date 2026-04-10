import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy: Apply CORS headers to all /api/* routes.
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

  // For actual requests, set CORS headers on the response
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", origin || "*");
  response.headers.set("Vary", "Origin");
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
