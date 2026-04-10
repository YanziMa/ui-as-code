/**
 * Robots.txt generation.
 * GET /api/robots.txt
 */

import { NextResponse } from "next/server";

export async function GET() {
  const robots = `User-agent: *
Allow: /

# Disallow API and internal routes
Disallow: /api/
Disallow: /_next/

# Sitemap location
Sitemap: https://ui-as-code-web.vercel.app/api/sitemap.xml

# Crawl delay (be nice)
Crawl-delay: 1`;

  return new NextResponse(robots, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
