import { NextRequest, NextResponse } from "next/server";

/**
 * CORS middleware for API routes.
 * Allows configured origins and sets standard headers.
 */
const ALLOWED_ORIGINS = [
  "https://ui-as-code-web.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

export function cors(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";

  const isAllowed =
    !origin ||
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".vercel.app") ||
    origin.endsWith(".vercel.app/");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-requested-with",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function corsHeaders(headers: Record<string, string>) {
  // For preflight requests
  if (headers["access-control-request-method"]) {
    return {
      "Access-Control-Allow-Origin": headers["origin"] || "*",
      "Access-Control-Allow-Methods": headers["access-control-request-method"] || "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": headers["access-control-request-headers"] || "Content-Type",
      "Access-Control-Max-Age": "86400",
    };
  }
  return {};
}
