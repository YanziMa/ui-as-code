import { NextResponse } from "next/server";

/**
 * Debug endpoint — only available in development.
 * Returns environment info, recent logs, and system state.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Debug endpoint not available in production" },
      { status: 403 },
    );
  }

  try {
    const { getApiLogs } = await import("@/lib/api-logger");
    const logs = getApiLogs();

    return NextResponse.json({
      environment: {
        node_env: process.env.NODE_ENV,
        version: "0.2.0",
        timestamp: new Date().toISOString(),
        platform: process.platform,
        arch: process.arch,
        node_version: process.version,
      },
      features: {
        has_supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        has_ai_key: !!process.env.AI_API_KEY,
        ai_provider: process.env.AI_MODEL || "not configured",
        ai_base: process.env.AI_API_BASE || "default (Anthropic)",
      },
      api_logs: {
        count: logs.length,
        recent: logs.slice(-20),
      },
      memory_usage: process.memoryUsage ? {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + "MB",
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
        external: Math.round(process.memoryUsage().external / 1024 / 1024) + "MB",
      } : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const { clearApiLogs } = await import("@/lib/api-logger");
  clearApiLogs();
  return NextResponse.json({ cleared: true, message: "API logs cleared" });
}
