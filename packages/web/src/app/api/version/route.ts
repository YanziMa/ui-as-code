/**
 * Version info endpoint.
 * GET /api/version
 */

import { NextResponse } from "next/server";

const VERSION = {
  version: "1.3.0",
  build: "20260410.1",
  commit: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
  environment: process.env.NODE_ENV || "development",
  deployedAt: new Date().toISOString(),
  dependencies: {
    next: "16.x",
    react: "19.x",
    typescript: "5.x",
  },
};

export async function GET() {
  return NextResponse.json(VERSION, {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}
