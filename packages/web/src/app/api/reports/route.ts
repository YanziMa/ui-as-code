/**
 * GET /api/reports — Generate usage/impact reports
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") ?? "overview";
  const period = searchParams.get("period") ?? "30d";

  if (type === "overview") {
    return NextResponse.json({
      ok: true,
      data: {
        generatedAt: new Date().toISOString(),
        period,
        summary: {
          totalSubmissions: 1247,
          uniqueUsers: 342,
          acceptanceRate: "73.2%",
          avgReviewTime: "4.2h",
          topSaaS: "HubSpot (234)",
          aiAccuracy: "94.2%",
        },
        charts: {
          submissionsTrend: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0],
            count: Math.floor(20 + Math.random() * 50),
          })),
          statusDistribution: [
            { label: "Accepted", value: 912, color: "#22c55e" },
            { label: "Pending", value: 187, color: "#f59e0b" },
            { label: "Rejected", value: 99, color: "#ef4444" },
            { label: "Expired", value: 49, color: "#94a3b8" },
          ],
          saasBreakdown: [
            { name: "HubSpot", value: 234 },
            { name: "Salesforce", value: 189 },
            { name: "Notion", value: 156 },
            { name: "Stripe", value: 134 },
            { name: "Figma", value: 98 },
            { name: "Other", value: 436 },
          ],
        },
      },
    });
  }

  if (type === "users") {
    return NextResponse.json({
      ok: true,
      data: {
        period,
        totalUsers: 342,
        newUsersThisPeriod: 28,
        activeUsers: 189,
        churnedUsers: 3,
        topContributors: [
          { rank: 1, username: "@alex_chen", submissions: 47, accepted: 41, acceptanceRate: "87%" },
          { rank: 2, username: "@sarah_dev", submissions: 31, accepted: 24, acceptanceRate: "77%" },
          { rank: 3, username: "@mike_t", submissions: 28, accepted: 22, acceptanceRate: "79%" },
          { rank: 4, username: "@janedoe", submissions: 24, accepted: 19, acceptanceRate: "79%" },
          { rank: 5, username: "@designer_pro", submissions: 21, accepted: 16, acceptanceRate: "76%" },
        ],
        userGrowth: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0],
          newUsers: Math.floor(Math.random() * 5),
          activeUsers: Math.floor(10 + Math.random() * 15),
        })),
      },
    });
  }

  if (type === "ai-performance") {
    return NextResponse.json({
      ok: true,
      data: {
        period,
        totalCalls: 45621,
        successfulCalls: 43089,
        errorRate: "0.56%",
        avgLatencyMs: 1234,
        p50LatencyMs: 987,
        p95LatencyMs: 2100,
        p99LatencyMs: 3500,
        totalTokensUsed: 12847293,
        estimatedCost: "$385.42",
        modelUsage: [
          { model: "Claude Sonnet", calls: 32000, tokens: 9800000, cost: "$294.00" },
          { model: "Claude Haiku", calls: 12000, tokens: 2800000, cost: "$70.00" },
          { model: "GPT-4o", calls: 1621, tokens: 247293, cost: "$21.42" },
        ],
        accuracyBySaaS: [
          { saas: "HubSpot", accuracy: 96.2, samples: 234 },
          { saas: "Notion", accuracy: 94.1, samples: 156 },
          { saas: "Stripe", accuracy: 93.8, samples: 134 },
          { saas: "Figma", accuracy: 91.5, samples: 98 },
          { saas: "Slack", accuracy: 92.7, samples: 76 },
        ],
      },
    });
  }

  // Default: unknown report type
  return NextResponse.json(
    { ok: false, error: `Unknown report type: ${type}. Available: overview, users, ai-performance` },
    { status: 400 },
  );
}
