/**
 * Tags / categories API.
 * GET /api/tags
 */

import { NextResponse } from "next/server";

interface Tag {
  id: string;
  name: string;
  slug: string;
  count: number;
  color: string;
}

const TAGS: Tag[] = [
  { id: "t1", name: "Accessibility", slug: "accessibility", count: 234, color: "#7c3aed" },
  { id: "t2", name: "Button Size", slug: "button-size", count: 567, color: "#2563eb" },
  { id: "t3", name: "Color Contrast", slug: "color-contrast", count: 445, color: "#dc2626" },
  { id: "t4", name: "Layout", slug: "layout", count: 389, color: "#059669" },
  { id: "t5", name: "Typography", slug: "typography", count: 312, color: "#d97706" },
  { id: "t6", name: "Navigation", slug: "navigation", count: 278, color: "#0891b2" },
  { id: "t7", name: "Forms", slug: "forms", count: 456, color: "#be185d" },
  { id: "t8", name: "Loading States", slug: "loading-states", count: 234, color: "#6366f1" },
  { id: "t9", name: "Mobile Responsive", slug: "mobile-responsive", count: 523, color: "#16a34a" },
  { id: "t10", name: "Dark Mode", slug: "dark-mode", count: 189, color: "#374151" },
  { id: "t11", name: "Performance", slug: "performance", count: 156, color: "#ea580c" },
  { id: "t12", name: "Empty States", slug: "empty-states", count: 134, color: "#6b7280" },
  { id: "t13", name: "Error Handling", slug: "error-handling", count: 178, color: "#dc2626" },
  { id: "t14", name: "Onboarding", slug: "onboarding", count: 98, color: "#8b5cf6" },
  { id: "t15", name: "Tables & Data", slug: "tables-data", count: 267, color: "#0284c7" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") || "count"; // count | name
  const limit = parseInt(searchParams.get("limit") || "50");

  let sorted = [...TAGS];
  if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
  else sorted.sort((a, b) => b.count - a.count);

  return NextResponse.json({
    tags: sorted.slice(0, limit),
    total: TAGS.length,
  });
}
