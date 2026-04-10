/**
 * GET /api/tags/:tag — Get tag details and related items
 */

import { NextRequest, NextResponse } from "next/server";

const TAG_DETAILS: Record<string, {
  name: string;
  description: string;
  color: string;
  count: number;
  trending: boolean;
  relatedTags: string[];
  topItems: { id: string; title: string; saas: string; votes: number }[];
}> = {
  "ui-improvement": {
    name: "UI Improvement",
    description: "General UI polish and visual enhancements",
    color: "#3b82f6",
    count: 423,
    trending: true,
    relatedTags: ["spacing", "typography", "colors"],
    topItems: [
      { id: "d_1", title: "Navbar spacing fix", saas: "HubSpot", votes: 124 },
      { id: "d_2", title: "Button alignment fix", saas: "Notion", votes: 89 },
      { id: "d_3", title: "Card shadow adjustment", saas: "Figma", votes: 65 },
    ],
  },
  "accessibility": {
    name: "Accessibility",
    description: "Improvements for screen readers, keyboard nav, and a11y compliance",
    color: "#10b981",
    count: 156,
    trending: false,
    relatedTags: ["keyboard", "screen-reader", "aria"],
    topItems: [
      { id: "d_4", title: "Add ARIA labels to navigation", saas: "Slack", votes: 78 },
      { id: "d_5", title: "Fix keyboard focus order", saas: "Linear", votes: 52 },
    ],
  },
  "performance": {
    name: "Performance",
    description: "Performance optimizations and speed improvements",
    color: "#f59e0b",
    count: 98,
    trending: true,
    relatedTags: ["loading", "animation", "bundle-size"],
    topItems: [
      { id: "d_6", title: "Lazy load dashboard widgets", saas: "Salesforce", votes: 91 },
      { id: "d_7", title: "Optimize image loading", saas: "Figma", votes: 44 },
    ],
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tag: string }> },
) {
  const { tag } = await params;

  const detail = TAG_DETAILS[tag];

  if (!detail) {
    return NextResponse.json(
      { ok: false, error: `Tag "${tag}" not found` },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, data: detail });
}
