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

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime_ms: Date.now() - startTime,
    version: "0.1.0",
    checks: {
      database: {
        status: dbStatus,
        latency_ms: dbLatency,
      },
    },
  });
}
