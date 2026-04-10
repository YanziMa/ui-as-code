/**
 * GET /api/analytics — Analytics and metrics data
 */

import { NextRequest, NextResponse } from "next/server";

// Simulated analytics data
const DAILY_SUBMISSIONS = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0],
  submissions: Math.floor(20 + Math.random() * 60 + (i > 20 ? 20 : 0)),
  accepted: Math.floor(15 + Math.random() * 40 + (i > 20 ? 15 : 0)),
  users: Math.floor(5 + Math.random() * 25),
}));

const SAAS_TARGETS = [
  { name: "HubSpot", count: 234, change: 12 },
  { name: "Salesforce", count: 189, change: -3 },
  { name: "Notion", count: 156, change: 24 },
  { name: "Stripe", count: 134, change: 8 },
  { name: "Figma", count: 98, change: -5 },
  { name: "Linear", count: 87, change: 31 },
  { name: "Slack", count: 76, change: 14 },
  { name: "Vercel", count: 65, change: 19 },
];

const STATUS_BREAKDOWN = [
  { status: "Accepted", count: 912, pct: 73.2, color: "#22c55e" },
  { status: "Pending Review", count: 187, pct: 15.0, color: "#f59e0b" },
  { status: "Rejected", count: 99, pct: 7.9, color: "#ef4444" },
  { status: "Expired", count: 49, pct: 3.9, color: "#94a3b8" },
];

const RECENT_ACTIVITY = [
  { id: "1", type: "submission", text: 'New PR submitted for Slack sidebar by @janedoe', time: "2 min ago" },
  { id: "2", type: "user_join", text: "@alex_chen joined the platform", time: "5 min ago" },
  { id: "3", type: "accept", text: "HubSpot Navbar spacing fix accepted", time: "12 min ago" },
  { id: "4", type: "submission", text: 'Notion table column resize suggestion by @mike', time: "18 min ago" },
  { id: "5", type: "milestone", text: "1,000th submission milestone reached!", time: "1 hour ago" },
  { id: "6", type: "integration", text: "New SaaS target added: Framer", time: "2 hours ago" },
  { id: "7", type: "accept", text: "Stripe checkout button redesign accepted", time: "3 hours ago" },
  { id: "8", type: "submission", text: 'Salesforce dashboard layout PR by @sarah', time: "4 hours ago" },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get("range") ?? "30d";
  const metric = searchParams.get("metric");

  // Parse range
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const dailyData = DAILY_SUBMISSIONS.slice(-days);

  if (metric === "kpis") {
    return NextResponse.json({
      ok: true,
      data: {
        totalSubmissions: { value: 1247, trend: "+12.5%", direction: "up" },
        acceptanceRate: { value: 73.2, trend: "+3.1%", direction: "up", unit: "%" },
        activeUsers: { value: 342, trend: "+28", direction: "up" },
        avgReviewTime: { value: "4.2h", trend: "-18min", direction: "down" },
      },
    });
  }

  if (metric === "timeline") {
    return NextResponse.json({ ok: true, data: dailyData });
  }

  if (metric === "saas") {
    return NextResponse.json({ ok: true, data: SAAS_TARGETS });
  }

  if (metric === "status") {
    return NextResponse.json({ ok: true, data: STATUS_BREAKDOWN });
  }

  if (metric === "activity") {
    return NextResponse.json({ ok: true, data: RECENT_ACTIVITY });
  }

  // Return all data
  return NextResponse.json({
    ok: true,
    data: {
      kpis: {
        totalSubmissions: { value: 1247, trend: "+12.5%", direction: "up" },
        acceptanceRate: { value: 73.2, trend: "+3.1%", direction: "up", unit: "%" },
        activeUsers: { value: 342, trend: "+28", direction: "up" },
        avgReviewTime: { value: "4.2h", trend: "-18min", direction: "down" },
      },
      timeline: dailyData,
      saasTargets: SAAS_TARGETS,
      statusBreakdown: STATUS_BREAKDOWN,
      recentActivity: RECENT_ACTIVITY,
      insights: {
        topContributor: { username: "@alex_chen", submissions: 47 },
        busiestDay: "Tuesday",
        peakHour: "14:00-16:00 UTC",
        aiAccuracy: 94.2,
      },
    },
  });
}
