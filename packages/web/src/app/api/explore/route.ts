/**
 * GET /api/explore — Explore/discover data (trending, categories, contributors)
 */

import { NextRequest, NextResponse } from "next/server";

const TRENDING_DIFFS = [
  { id: "d_1", saas: "HubSpot", title: "Navbar spacing fix", author: "@alex_chen", votes: 124, status: "accepted", createdAt: "2026-04-08T10:30:00Z" },
  { id: "d_2", saas: "Notion", title: "Table column resize feature", author: "@sarah_dev", votes: 89, status: "pending", createdAt: "2026-04-09T14:15:00Z" },
  { id: "d_3", saas: "Stripe", title: "Checkout page redesign", author: "@mike_t", votes: 76, status: "reviewing", createdAt: "2026-04-09T18:00:00Z" },
  { id: "d_4", saas: "Figma", title: "Toolbar icon alignment to grid", author: "@janedoe", votes: 65, status: "accepted", createdAt: "2026-04-05T11:20:00Z" },
  { id: "d_5", saas: "Slack", title: "Sidebar width increase", author: "@tom_w", votes: 54, status: "pending", createdAt: "2026-04-09T08:30:00Z" },
  { id: "d_6", saas: "Linear", title: "Issue detail layout restructure", author: "@alex_chen", votes: 48, status: "accepted", createdAt: "2026-04-03T13:00:00Z" },
];

const CATEGORIES = [
  { name: "CRM", icon: "📊", products: ["HubSpot", "Salesforce"], diffCount: 423, color: "#3b82f6" },
  { name: "Productivity", icon: "📋", products: ["Notion", "Linear", "Airtable"], diffCount: 389, color: "#8b5cf6" },
  { name: "Dev Tools", icon: "⚡", products: ["GitHub", "Vercel", "Stripe"], diffCount: 312, color: "#10b981" },
  { name: "Communication", icon: "💬", products: ["Slack", "Discord", "Intercom"], diffCount: 234, color: "#f59e0b" },
  { name: "Design", icon: "🎨", products: ["Figma", "Framer"], diffCount: 156, color: "#ec4899" },
  { name: "E-commerce", icon: "🛒", products: ["Shopify"], diffCount: 98, color: "#ef4444" },
];

const TOP_CONTRIBUTORS = [
  { handle: "@alex_chen", avatar: null, diffsThisWeek: 12, totalDiffs: 47, acceptanceRate: 87.3 },
  { handle: "@sarah_dev", avatar: null, diffsThisWeek: 9, totalDiffs: 31, acceptanceRate: 77.4 },
  { handle: "@mike_t", avatar: null, diffsThisWeek: 7, totalDiffs: 28, acceptanceRate: 78.6 },
];

const RECENT_UPDATES = [
  { type: "new_diff", text: 'New submission for "Vercel deployment colors"', time: "2 min ago", user: "@designer_pro" },
  { type: "accepted", text: '"Slack sidebar width" accepted by Slack team', time: "15 min ago", user: null },
  { type: "comment", text: '@alex commented on "Notion table resize"', time: "30 min ago", user: "@alex_chen" },
  { type: "new_user", text: "@frontend_ninja joined UI-as-Code", time: "1 hour ago", user: null },
  { type: "merged", text: '"Figma toolbar alignment" merged to production', time: "2 hours ago", user: null },
  { type: "badge", text: '@sarah earned the "Diff Master" badge', time: "3 hours ago", user: null },
  { type: "new_diff", text: 'New submission for "Discord message bubbles"', time: "4 hours ago", user: "@webmaster" },
  { type: "trending", text: '"HubSpot navbar" is trending with 50+ new votes', time: "5 hours ago", user: null },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const section = searchParams.get("section");

  if (section === "trending") {
    return NextResponse.json({ ok: true, data: TRENDING_DIFFS });
  }
  if (section === "categories") {
    return NextResponse.json({ ok: true, data: CATEGORIES });
  }
  if (section === "contributors") {
    return NextResponse.json({ ok: true, data: TOP_CONTRIBUTORS });
  }
  if (section === "recent") {
    return NextResponse.json({ ok: true, data: RECENT_UPDATES });
  }

  // Return all
  return NextResponse.json({
    ok: true,
    data: {
      trending: TRENDING_DIFFS,
      categories: CATEGORIES,
      topContributors: TOP_CONTRIBUTORS,
      recentUpdates: RECENT_UPDATES,
    },
  });
}
