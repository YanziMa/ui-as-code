import { NextResponse } from "next/server";

// ---------- Types (derived from Supabase schema) ----------

interface PullRequest {
  id: string;
  description: string;
  status: string;
  created_at: string;
}

interface Friction {
  id: string;
  saas_name: string | null;
  component_name: string | null;
  description: string;
  created_at: string;
}

// ---------- Helpers ----------

const BASE_URL = process.env.APP_URL || "http://localhost:3000";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRssDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toUTCString();
}

function truncate(str: string, maxLen = 120): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trimEnd() + "\u2026";
}

// ---------- Internal fetch helpers ----------

async function fetchPullRequests(): Promise<PullRequest[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/pull-requests`, {
      next: { revalidate: 0 }, // always fresh for the feed builder
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`PRs responded ${res.status}`);
    const json = await res.json();
    return (json.data ?? []) as PullRequest[];
  } catch (err) {
    console.error("[Feed] Failed to fetch pull requests:", err);
    return [];
  }
}

async function fetchFrictions(): Promise<Friction[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/frictions`, {
      next: { revalidate: 0 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Frictions responded ${res.status}`);
    const json = await res.json();
    return (json.data ?? []) as Friction[];
  } catch (err) {
    console.error("[Feed] Failed to fetch frictions:", err);
    return [];
  }
}

// ---------- XML builders ----------

function buildPrItem(pr: PullRequest): string {
  const title = escapeXml(truncate(pr.description || "Untitled Pull Request"));
  const link = `${BASE_URL}/pr`;
  const pubDate = toRssDate(pr.created_at);
  const guid = `pr-${pr.id}`;
  const description = escapeXml(
    `Status: ${pr.status}\n\n${pr.description || "No description."}`
  );

  return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${guid}</guid>
    </item>`;
}

function buildFrictionItem(friction: Friction): string {
  const label = [friction.saas_name, friction.component_name]
    .filter(Boolean)
    .join(" \u2013 ") || "Unknown";
  const title = escapeXml(truncate(`${label}: ${friction.description}`));
  const link = `${BASE_URL}/pr`;
  const pubDate = toRssDate(friction.created_at);
  const guid = `friction-${friction.id}`;
  const description = escapeXml(
    `${label}\n\n${friction.description || "No description."}`
  );

  return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${guid}</guid>
    </item>`;
}

// ---------- Route handler ----------

export async function GET() {
  // Fetch both data sources in parallel
  const [prs, frictions] = await Promise.all([
    fetchPullRequests(),
    fetchFrictions(),
  ]);

  // Merge and sort by created_at descending (newest first)
  const items = [
    ...prs.map((pr) => ({ type: "pr" as const, data: pr, date: new Date(pr.created_at).getTime() })),
    ...frictions.map((f) => ({ type: "friction" as const, data: f, date: new Date(f.created_at).getTime() })),
  ]
    .sort((a, b) => b.date - a.date)
    .slice(0, 50); // cap at 50 items

  const itemXml = items.map((item) =>
    item.type === "pr"
      ? buildPrItem(item.data as PullRequest)
      : buildFrictionItem(item.data as Friction)
  ).join("\n");

  const now = new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>UI-as-Code Recent Activity</title>
    <link>https://ui-as-code-web.vercel.app/pr</link>
    <description>Recent pull requests and user-reported frictions from UI-as-Code.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${BASE_URL}/api/feed" rel="self" type="application/rss+xml"/>
${itemXml}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
