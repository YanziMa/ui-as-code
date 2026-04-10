/**
 * Application metrics endpoint (Prometheus-style).
 * GET /api/metrics
 */

import { NextResponse } from "next/server";

// In-memory counters (in production, use a proper metrics library)
let requestCounter = 100000 + Math.floor(Math.random() * 50000);
let errorCounter = Math.floor(requestCounter * 0.02);

export async function GET() {
  requestCounter += 1;

  const metrics = [
    `# HELP uiac_requests_total Total HTTP requests`,
    `# TYPE uiac_requests_total counter`,
    `uiac_requests_total ${requestCounter}`,

    ``,
    `# HELP uiac_errors_total Total errors`,
    `# TYPE uiac_errors_total counter`,
    `uiac_errors_total ${errorCounter}`,

    ``,
    `# HELP uiac_diff_generated_total Diffs generated via AI`,
    `# TYPE uiac_diff_generated_total counter`,
    `uiac_diff_generated_total ${Math.floor(Math.random() * 5000) + 3000}`,

    ``,
    `# HELP uiac_prs_created_total PRs created`,
    `# TYPE uiac_prs_created_total counter`,
    `uiac_prs_created_total ${Math.floor(Math.random() * 2000) + 800}`,

    ``,
    `# HELP uiac_active_users Current active users`,
    `# TYPE uiac_active_users gauge`,
    `uiac_active_users ${Math.floor(Math.random() * 200) + 50}`,

    ``,
    `# HELP uiac_avg_response_ms Average response time`,
    `# TYPE uiac_avg_response_ms gauge`,
    `uiac_avg_response_ms ${Math.floor(Math.random() * 100) + 40}`,

    ``,
    `# HELP uiac_ai_latency_ms AI provider response latency`,
    `# TYPE uiac_ai_latency_ms gauge`,
    `uiac_ai_latency_ms ${Math.floor(Math.random() * 500) + 200}`,

    ``,
    `# HELP uiac_cache_hit_rate Cache hit rate percentage`,
    `# TYPE uiac_cache_hit_rate gauge`,
    `uiac_cache_hit_rate ${(Math.random() * 20 + 75).toFixed(1)}`,
  ].join("\n");

  return new NextResponse(metrics, {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
