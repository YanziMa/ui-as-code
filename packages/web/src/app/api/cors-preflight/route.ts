/**
 * CORS Preflight (OPTIONS) handler for API routes.
 * Handles OPTIONS requests for all API endpoints.
 *
 * Note: In Next.js App Router, this is handled by middleware/proxy.ts
 * This route serves as an explicit fallback.
 */

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://ui-as-code-web.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const ALLOWED_METHODS = "GET, POST, PUT, DELETE, PATCH, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization, X-Requested-With, X-Webhook-Signature, X-IDEMPOTENCY-Key";
const MAX_AGE = "86400"; // 24 hours

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");

  // Validate origin or use wildcard for development
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin)
      ? origin
      : process.env.NODE_ENV === "development"
        ? "*"
        : ALLOWED_ORIGINS[0];

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin || "*",
      "Access-Control-Allow-Methods": ALLOWED_METHODS,
      "Access-Control-Allow-Headers": ALLOWED_HEADERS,
      "Access-Control-Max-Age": MAX_AGE,
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
    },
  });
}
