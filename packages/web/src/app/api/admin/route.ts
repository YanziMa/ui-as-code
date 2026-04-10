/**
 * GET /api/admin — Admin dashboard data
 */

import { NextResponse } from "next/server";

const ADMIN_STATS = {
  totalUsers: { value: 1247, change: "+23", trend: "up" },
  activeSubmissions: { value: 89, detail: "12 pending review" },
  aiApiCallsToday: { value: 3421, cost: "$12.40" },
  acceptanceRate: { value: 73.2, unit: "%", change: "+3.1%", trend: "up" },
  errorRate: { value: 0.03, unit: "%", change: "-0.01%", trend: "down" },
  uptime: { value: 99.98, unit: "%" },
};

const SYSTEM_HEALTH = [
  { metric: "CPU Usage", value: 34, max: 100, unit: "%", status: "good" as const },
  { metric: "Memory", value: 4.2, max: 8, unit: "GB", status: "warning" as const },
  { metric: "Disk", value: 67, max: 100, unit: "GB", status: "good" as const },
  { metric: "DB Connections", value: 23, max: 100, unit: "", status: "good" as const },
];

const RECENT_SUBMISSIONS = [
  { id: "sub_001", user: "@alex_chen", saas: "HubSpot", status: "accepted", created: "2 min ago" },
  { id: "sub_002", user: "@sarah_dev", saas: "Notion", status: "pending", created: "5 min ago" },
  { id: "sub_003", user: "@mike_t", saas: "Stripe", status: "reviewing", created: "12 min ago" },
  { id: "sub_004", user: "@janedoe", saas: "Figma", status: "accepted", created: "18 min ago" },
  { id: "sub_005", user: "@webmaster", saas: "Slack", status: "rejected", created: "25 min ago" },
  { id: "sub_006", user: "@designer_pro", saas: "Linear", status: "pending", created: "34 min ago" },
  { id: "sub_007", user: "@frontend_ninja", saas: "Vercel", status: "accepted", created: "45 min ago" },
  { id: "sub_008", user: "@fullstack_joe", saas: "Discord", status: "pending", created: "1 hour ago" },
];

const AI_USAGE_DAILY = Array.from({ length: 7 }, (_, i) => ({
  date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString("en-US", { weekday: "short" }),
  tokens: Math.floor(200 + Math.random() * 300),
}));

const ALERTS = [
  { type: "warning" as const, message: "Rate limit approaching for Claude API key — 85% of daily quota used" },
  { type: "info" as const, message: "Scheduled maintenance window on April 12th, 02:00-04:00 UTC" },
  { type: "success" as const, message: "Database backup completed successfully at 06:00 UTC today" },
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      stats: ADMIN_STATS,
      systemHealth: SYSTEM_HEALTH,
      recentSubmissions: RECENT_SUBMISSIONS,
      aiUsageDaily: AI_USAGE_DAILY,
      alerts,
      lastUpdated: new Date().toISOString(),
    },
  });
}
