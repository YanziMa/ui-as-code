/**
 * GET /api/audit — Security audit log entries
 */

import { NextRequest, NextResponse } from "next/server";

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  resource: string;
  details: string;
  severity: "info" | "warning" | "critical";
  ip: string;
}

const AUDIT_LOG: AuditEntry[] = [
  { id: "aud_1", timestamp: "2026-04-10T08:30:12Z", action: "LOGIN", actor: "@alex_chen", resource: "session", details: "Successful login from Chrome/Windows (Shanghai)", severity: "info", ip: "203.0.113.42" },
  { id: "aud_2", timestamp: "2026-04-10T07:15:33Z", action: "PR_CREATE", actor: "@sarah_dev", resource: "pr:salesforce-dash-3", details: "Created new PR for Salesforce dashboard redesign", severity: "info", ip: "198.51.100.17" },
  { id: "aud_3", timestamp: "2026-04-10T06:42:01Z", action: "API_KEY_ROTATE", actor: "system", resource: "api-key:prod-1", details: "Scheduled API key rotation completed", severity: "info", ip: "-" },
  { id: "aud_4", timestamp: "2026-04-09T22:18:45Z", action: "PERMISSION_CHANGE", actor: "@admin", resource: "team:acme-corp", details: "Elevated @janedoe to admin role in Acme Corp team", severity: "warning", ip: "192.0.2.88" },
  { id: "aud_5", timestamp: "2026-04-09T18:55:22Z", action: "RATE_LIMIT_HIT", actor: "@unknown_user", resource: "ai-api", details: "Rate limit exceeded for AI generation endpoint (50 req/min)", severity: "warning", ip: "45.33.22.11" },
  { id: "aud_6", timestamp: "2026-04-09T14:30:00Z", action: "LOGIN_FAILED", actor: "anonymous", resource: "session", details: "Failed login attempt — invalid credentials (3rd attempt)", severity: "warning", ip: "91.121.87.44" },
  { id: "aud_7", timestamp: "2026-04-09T10:00:00Z", action: "DATA_EXPORT", actor: "@alex_chen", resource: "user-data", details: "Exported full user data (GDPR request)", severity: "info", ip: "203.0.113.42" },
  { id: "aud_8", timestamp: "2026-04-08T16:22:11Z", action: "WEBHOOK_CONFIG", actor: "@admin", resource: "webhook:slack-alerts", details: "Updated Slack webhook URL for incident alerts", severity: "info", ip: "192.0.2.88" },
  { id: "aud_9", timestamp: "2026-04-08T03:14:59Z", action: "SUSPICIOUS_ACTIVITY", actor: "system", resource: "rate-monitor", details: "Detected unusual traffic pattern from IP range 45.33.x.x — auto-throttled", severity: "critical", ip: "-" },
  { id: "aud_10", timestamp: "2026-04-07T20:45:33Z", action: "SESSION_REVOKED", actor: "@alex_chen", resource: "session:sess_3", details: "Manually revoked stale session from MacBook Pro", severity: "info", ip: "203.0.113.42" },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const severity = searchParams.get("severity");
  const action = searchParams.get("action")?.toUpperCase();

  let filtered = [...AUDIT_LOG];

  if (severity) {
    filtered = filtered.filter((e) => e.severity === severity);
  }
  if (action) {
    filtered = filtered.filter((e) => e.action === action);
  }

  // Newest first
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return NextResponse.json({
    ok: true,
    data: {
      items: paginated,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    },
  });
}
