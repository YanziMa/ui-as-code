import { NextResponse } from "next/server";

// ---------- Types ----------

interface ChangelogItem {
  title: string;
  description: string;
  pubDate: string;
}

// ---------- Helpers ----------

const BASE_URL = "https://ui-as-code-web.vercel.app";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRssDate(date: Date): string {
  return date.toUTCString();
}

// ---------- Hardcoded release data (matches /changelog page) ----------

const v0_2_0_items: ChangelogItem[] = [
  {
    title: "Analytics Dashboard",
    description:
      "Dashboard with activity chart, stat cards, and top pain points visualization.",
    pubDate: toRssDate(new Date()),
  },
  {
    title: "Performance Monitoring",
    description:
      "Cache-Control headers on GET API routes with stale-while-revalidate strategy.",
    pubDate: toRssDate(new Date()),
  },
  {
    title: "OpenAPI Specification",
    description:
      "API Documentation page (/api-docs) with all 10 endpoints documented.",
    pubDate: toRssDate(new Date()),
  },
  {
    title: "Enhanced CONTRIBUTING.md",
    description:
      "Improved contribution guidelines with clearer setup instructions and workflow documentation.",
    pubDate: toRssDate(new Date()),
  },
  {
    title: "Status Page Upgrade",
    description:
      "Enhanced status monitoring with database latency and health check reporting.",
    pubDate: toRssDate(new Date()),
  },
  {
    title: "Error Boundary",
    description:
      "Global error logging system with error boundary components and handlers.",
    pubDate: toRssDate(new Date()),
  },
  {
    title: "API Logger",
    description:
      "Structured API request/response logging for debugging and observability.",
    pubDate: toRssDate(new Date()),
  },
  {
    title: "Proxy/Middleware Rename",
    description:
      "Renamed and reorganized proxy and middleware layers for clarity.",
    pubDate: toRssDate(new Date()),
  },
  {
    title: "Extension Retry Button",
    description:
      "Chrome extension now includes a retry button for failed diff generation requests.",
    pubDate: toRssDate(new Date()),
  },
  {
    title: "Settings & Getting Started Pages",
    description:
      "New Settings page and improved Getting Started guide with step-by-step setup instructions.",
    pubDate: toRssDate(new Date()),
  },
  {
    title: "Security Headers",
    description:
      "Added security-focused HTTP headers across all routes for hardened production deployment.",
    pubDate: toRssDate(new Date()),
  },
  {
    title: "Next.js Configuration",
    description:
      "Optimized Next.js configuration for production performance and build reliability.",
    pubDate: toRssDate(new Date()),
  },
  {
    title: "Guide Page",
    description:
      "Comprehensive user guide page with usage examples and best practices.",
    pubDate: toRssDate(new Date()),
  },
];

// v0.1.0 -- one week ago
const oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

const v0_1_0_items: ChangelogItem[] = [
  {
    title: "Initial MVP Release",
    description:
      "UI-as-Code v0.1.0 Initial Beta release featuring the Chrome extension for inspecting SaaS UIs, the Next.js web app with App Router, unified diff generation from natural language descriptions, 10 REST API endpoints, Supabase integration (PostgreSQL + Auth), multi-provider AI support (GLM, Claude, OpenAI, DeepSeek), Zod v4 input validation on all routes, and CORS middleware for all /api/* routes.",
    pubDate: toRssDate(oneWeekAgo),
  },
];

const allItems = [...v0_2_0_items, ...v0_1_0_items];

// ---------- XML builder ----------

function buildItem(item: ChangelogItem): string {
  const title = escapeXml(item.title);
  const link = `${BASE_URL}/changelog`;
  const description = escapeXml(item.description);

  return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description>${description}</description>
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="false">${escapeXml(item.title)}</guid>
    </item>`;
}

// ---------- Route handler ----------

export async function GET() {
  const itemXml = allItems.map(buildItem).join("\n");
  const now = new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>UI-as-Code Changelog</title>
    <link>${BASE_URL}/changelog</link>
    <description>Release notes and changelog for UI-as-Code.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${BASE_URL}/api/changelog-feed" rel="self" type="application/rss+xml"/>
${itemXml}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600",
    },
  });
}
