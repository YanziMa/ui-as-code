/**
 * Feed items API (for the /feed page).
 * GET /api/feed-items
 */

import { NextResponse } from "next/server";

interface FeedItem {
  id: string;
  type: "release" | "blog" | "security" | "community";
  title: string;
  summary: string;
  date: string;
  url: string;
  author?: string;
}

const FEED_ITEMS: FeedItem[] = [
  { id: "f1", type: "release", title: "v1.3.0 Released — Teams, Billing & Integrations", summary: "Major release featuring team workspaces, billing management, integrations marketplace, audit log viewer, and much more.", date: "2026-04-08T10:00:00Z", url: "/changelog" },
  { id: "f2", type: "blog", title: "How We Built the Sandbox Preview Engine", summary: "A deep dive into the technical architecture behind our iframe-based diff preview system, including CSP handling and postMessage communication patterns.", date: "2026-04-07T14:00:00Z", url: "#" },
  { id: "f3", type: "security", title: "Security Advisory: Enhanced Rate Limiting", summary: "We've implemented improved rate limiting across all API endpoints with per-user tracking and exponential backoff for better protection against abuse.", date: "2026-04-06T09:00:00Z", url: "/security" },
  { id: "f4", type: "community", title: "Discord Server Hits 1,000 Members!", summary: "Our community Discord server has reached a major milestone. Thank you to everyone who has joined and contributed to making this community amazing.", date: "2026-04-05T16:00:00Z", url: "/community" },
  { id: "f5", type: "release", title: "v1.2.1 Patch — Safari Extension Fix", summary: "Hotfix addressing compatibility issues with Safari on macOS 15+. The extension should now properly detect React fiber trees in WebKit-based browsers.", date: "2026-04-04T11:30:00Z", url: "/changelog" },
  { id: "f6", type: "blog", title: "40% Faster Diff Generation with Claude Sonnet 4", summary: "We upgraded our AI engine to Claude Sonnet 4, resulting in significantly faster response times and higher quality diffs. Here are the benchmarks.", date: "2026-04-03T10:00:00Z", url: "#", author: "Engineering Team" },
  { id: "f7", type: "release", title: "New Integration: Slack Webhook Support", summary: "You can now receive UI-as-Code notifications directly in your Slack channels. Configure webhooks from Settings > Integrations > Slack.", date: "2026-04-02T08:00:00Z", url: "/integrations" },
  { id: "f8", type: "community", title: "Contributor Spotlight: Alice Chen", summary: "This month's top contributor has submitted 52 accepted PRs with a 78% acceptance rate. Learn about her workflow and tips for writing great friction descriptions.", date: "2026-04-01T12:00:00Z", url: "/leaderboard" },
  { id: "f9", type: "blog", title: "Dark Mode: A Complete Implementation Guide", summary: "How we approached dark mode for UI-as-Code — from design tokens to CSS custom properties, handling user preferences and system settings.", date: "2026-03-31T09:00:00Z", url: "#", author: "Design Team" },
  { id: "f10", type: "release", title: "v1.2.0 — CLI Tool, Webhooks & Analytics", summary: "The biggest update yet! New CLI tool for power users, webhook system for event notifications, analytics dashboard with charts, and status monitoring page.", date: "2026-03-28T10:00:00Z", url: "/changelog" },
  { id: "f11", type: "security", title: "CSP Header Hardening Across All Endpoints", summary: "All API endpoints now include strict Content-Security-Policy headers. This is part of our ongoing security hardening initiative.", date: "2026-03-25T08:00:00Z", url: "/security" },
  { id: "f12", type: "community", title: "March Community Stats: 234 New Contributors", summary: "March saw incredible growth with 234 new contributors joining the platform. Total frictions reported exceeded 4,500 for the first time.", date: "2026-03-24T18:00:00Z", url: "/analytics" },
];

const TYPE_CONFIG = {
  release: { label: "Release", bg: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
  blog: { label: "Blog", bg: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" },
  security: { label: "Security", bg: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
  community: { label: "Community", bg: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const limit = parseInt(searchParams.get("limit") || "20");

  let filtered = [...FEED_ITEMS];
  if (type && type !== "all") filtered = filtered.filter((item) => item.type === type);

  return NextResponse.json({
    items: filtered.slice(0, limit),
    total: filtered.length,
    types: Object.keys(TYPE_CONFIG),
  });
}
