import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const startTime = Date.now();

  // Check database connectivity
  let dbStatus = "ok";
  let dbLatency = 0;
  try {
    const dbStart = Date.now();
    await supabase.from("frictions").select("id").limit(1);
    dbLatency = Date.now() - dbStart;
  } catch {
    dbStatus = "error";
  }

  // Count API routes (known endpoints)
  const apiRoutes = [
    "GET  /api/health",
    "POST /api/generate-diff",
    "GET  /api/frictions",
    "POST /api/frictions",
    "GET  /api/frictions/top",
    "GET  /api/frictions/export",
    "GET  /api/pull-requests",
    "POST /api/pull-requests",
    "POST /api/pr/[id]/vote",
    "POST /api/pr/[id]/merge",
    "GET  /api/auth/callback",
  ];

  // Environment info (sanitized — no secrets)
  const envInfo = {
    node_env: process.env.NODE_ENV || "unknown",
    ai_provider: process.env.AI_PROVIDER || "glm",
    has_supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    has_ai_key: !!(
      process.env.AI_API_KEY ||
      process.env.CLAUDE_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.GLM_API_KEY
    ),
  };

  return NextResponse.json({
    status: dbStatus === "ok" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptime_ms: Date.now() - startTime,
    version: "0.2.0",
    checks: {
      database: {
        status: dbStatus,
        latency_ms: dbLatency,
      },
    },
    routes: {
      count: apiRoutes.length,
      endpoints: apiRoutes,
    },
    environment: envInfo,
  });
}
