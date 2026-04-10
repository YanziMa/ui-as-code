import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware: Apply CORS headers to all /api/* routes.
 * Also handles OPTIONS preflight requests.
 */
export function middleware(req: NextRequest) {
  // Only apply to API routes
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return;
  }

  const origin = req.headers.get("origin") ?? "";

  // Handle preflight (OPTIONS)
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }

  // For actual requests, CORS is handled per-route in response headers.
  // This middleware just ensures consistent behavior.
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", origin || "*");
  response.headers.set("Vary", "Origin");
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
