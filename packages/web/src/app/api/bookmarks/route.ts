/**
 * GET /api/bookmarks — List user bookmarks
 * POST /api/bookmarks — Create bookmark
 * DELETE /api/bookmarks?id=xxx — Remove bookmark
 */

import { NextRequest, NextResponse } from "next/server";

interface Bookmark {
  id: string;
  saasName: string;
  title: string;
  description: string;
  status: "accepted" | "pending" | "rejected" | "draft";
  bookmarkedAt: string;
  url: string;
}

const mockBookmarks: Bookmark[] = [
  { id: "bm_1", saasName: "HubSpot", title: "Navbar spacing fix", description: "Adjust padding between nav items for better visual balance", status: "accepted", bookmarkedAt: "2026-04-08T10:30:00Z", url: "/pr/hubspot-nav-1" },
  { id: "bm_2", saasName: "Salesforce", title: "Dashboard card redesign", description: "Modernize dashboard cards with rounded corners and subtle shadows", status: "pending", bookmarkedAt: "2026-04-09T14:15:00Z", url: "/pr/salesforce-dash-3" },
  { id: "bm_3", saasName: "Notion", title: "Table column resize", description: "Allow users to resize table columns by dragging borders", status: "accepted", bookmarkedAt: "2026-04-03T09:00:00Z", url: "/pr/notion-table-7" },
  { id: "bm_4", saasName: "Stripe", title: "Checkout button color", description: "Change primary CTA to brand green instead of blue", status: "rejected", bookmarkedAt: "2026-04-06T16:45:00Z", url: "/pr/stripe-checkout-2" },
  { id: "bm_5", saasName: "Figma", title: "Toolbar icon alignment", description: "Align toolbar icons to baseline grid", status: "accepted", bookmarkedAt: "2026-04-05T11:20:00Z", url: "/pr/figma-toolbar-4" },
  { id: "bm_6", saasName: "Slack", title: "Sidebar width adjustment", description: "Increase sidebar width from 240px to 280px for channel names", status: "pending", bookmarkedAt: "2026-04-09T08:30:00Z", url: "/pr/slack-sidebar-1" },
  { id: "bm_7", saasName: "Linear", title: "Issue detail layout", description: "Reorganize issue detail page with better information hierarchy", status: "accepted", bookmarkedAt: "2026-03-28T13:00:00Z", url: "/pr/linear-issue-5" },
  { id: "bm_8", saasName: "Vercel", title: "Deployment status colors", description: "Use more distinct colors for deployment states", status: "draft", bookmarkedAt: "2026-04-09T18:00:00Z", url: "/pr/vercel-deploy-1" },
  { id: "bm_9", saasName: "Discord", title: "Message bubble padding", description: "Increase message padding for better readability on mobile", status: "accepted", bookmarkedAt: "2026-04-04T07:30:00Z", url: "/pr/discord-msg-2" },
  { id: "bm_10", saasName: "GitHub", title: "PR file list icons", description: "Add file type icons next to filenames in PR diff view", status: "pending", bookmarkedAt: "2026-04-09T20:15:00Z", url: "/pr/github-pr-icons-3" },
  { id: "bm_11", saasName: "Intercom", title: "Chat widget position", description: "Move chat widget to bottom-right with better shadow", status: "accepted", bookmarkedAt: "2026-04-02T22:00:00Z", url: "/pr/intercom-widget-1" },
  { id: "bm_12", saasName: "Airtable", title: "Grid view header", description: "Sticky header row with filter chips in grid view", status: "rejected", bookmarkedAt: "2026-04-05T15:45:00Z", url: "/pr/airtable-grid-6" },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const sort = searchParams.get("sort") ?? "newest";
  const search = searchParams.get("search")?.toLowerCase();

  let filtered = [...mockBookmarks];

  if (status && status !== "all") {
    filtered = filtered.filter((b) => b.status === status);
  }

  if (search) {
    filtered = filtered.filter(
      (b) =>
        b.title.toLowerCase().includes(search) ||
        b.saasName.toLowerCase().includes(search),
    );
  }

  // Sort
  if (sort === "oldest") {
    filtered.sort((a, b) => new Date(a.bookmarkedAt).getTime() - new Date(b.bookmarkedAt).getTime());
  } else if (sort === "saas") {
    filtered.sort((a, b) => a.saasName.localeCompare(b.saasName));
  } else {
    filtered.sort((a, b) => new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime());
  }

  return NextResponse.json({
    ok: true,
    data: {
      items: filtered,
      total: filtered.length,
      filters: {
        statuses: ["all", ...new Set(mockBookmarks.map((b) => b.status))],
        sorts: ["newest", "oldest", "saas"],
      },
    },
  });
}

export async function POST(request: NextRequest) {
  let body: Partial<Bookmark>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { saasName, title, description, url } = body;
  if (!saasName || !title) {
    return NextResponse.json({ ok: false, error: "Missing saasName or title" }, { status: 400 });
  }

  const newBookmark: Bookmark = {
    id: `bm_${Date.now()}`,
    saasName: saasName as string,
    title: title as string,
    description: (description as string) ?? "",
    status: "draft",
    bookmarkedAt: new Date().toISOString(),
    url: (url as string) ?? "",
  };

  mockBookmarks.unshift(newBookmark);

  return NextResponse.json({ ok: true, data: newBookmark }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "Bookmark ID required" }, { status: 400 });
  }

  const idx = mockBookmarks.findIndex((b) => b.id === id);
  if (idx === -1) {
    return NextResponse.json({ ok: false, error: "Bookmark not found" }, { status: 404 });
  }

  mockBookmarks.splice(idx, 1);
  return NextResponse.json({ ok: true, message: "Bookmark removed" });
}
