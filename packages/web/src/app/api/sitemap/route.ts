/**
 * Dynamic sitemap generation.
 * GET /api/sitemap.xml
 */

import { NextResponse } from "next/server";

const BASE_URL = "https://ui-as-code-web.vercel.app";

const STATIC_PAGES = [
  "",
  "/dashboard",
  "/frictions",
  "/prs",
  "/analytics",
  "/settings",
  "/profile",
  "/getting-started",
  "/status",
  "/webhooks",
  "/cli",
  "/integrations",
  "/teams",
  "/billing",
  "/audit-log",
  "/api-keys",
];

export async function GET() {
  const now = new Date().toISOString();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_PAGES.map(
  (path) => `  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${path === "" ? "daily" : "weekly"}</changefreq>
    <priority>${path === "" ? "1.0" : path === "/dashboard" ? "0.9" : "0.7"}</priority>
  </url>`,
).join("\n")}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
