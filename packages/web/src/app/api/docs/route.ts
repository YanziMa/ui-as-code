/**
 * GET /api/docs — Documentation content API
 */

import { NextRequest, NextResponse } from "next/server";

const DOC_CATEGORIES = [
  {
    slug: "getting-started",
    name: "Getting Started",
    icon: "rocket",
    description: "New to UI-as-Code? Start here.",
    articles: [
      { slug: "quick-start", title: "Quick Start Guide", readTime: "5 min", reads: 12450 },
      { slug: "installation", title: "Installing the Extension", readTime: "3 min", reads: 8920 },
      { slug: "first-diff", title: "Creating Your First Diff", readTime: "7 min", reads: 7340 },
      { slug: "workflow", title: "Understanding the Workflow", readTime: "4 min", reads: 5620 },
    ],
  },
  {
    slug: "extension",
    name: "Browser Extension",
    icon: "puzzle",
    description: "Master the browser extension tools.",
    articles: [
      { slug: "inspector-mode", title: "Inspector Mode Deep Dive", readTime: "8 min", reads: 6780 },
      { slug: "screenshots", title: "Taking Smart Screenshots", readTime: "4 min", reads: 4560 },
      { slug: "managing-extensions", title: "Managing Multiple Extensions", readTime: "3 min", reads: 2340 },
      { slug: "shortcuts", title: "Keyboard Shortcuts Reference", readTime: "6 min", reads: 5120 },
      { slug: "troubleshooting", title: "Troubleshooting Guide", readTime: "10 min", reads: 3890 },
    ],
  },
  {
    slug: "ai-diffs",
    name: "AI & Diffs",
    icon: "brain",
    description: "How AI generates and improves diffs.",
    articles: [
      { slug: "how-it-works", title: "How AI Generates Diffs", readTime: "10 min", reads: 9120 },
      { slug: "prompts", title: "Writing Better Prompts", readTime: "8 min", reads: 7650 },
      { slug: "reviewing", title: "Reviewing Generated Code", readTime: "6 min", reads: 5430 },
      { slug: "patterns", title: "Common Patterns & Best Practices", readTime: "12 min", reads: 4890 },
    ],
  },
  {
    slug: "saas",
    name: "SaaS Integration",
    icon: "cloud",
    description: "Connect with your favorite SaaS products.",
    articles: [
      { slug: "supported-products", title: "Supported Products List", readTime: "5 min", reads: 11230 },
      { slug: "adding-targets", title: "Adding New SaaS Targets", readTime: "15 min", reads: 3210 },
      { slug: "compatibility", title: "Compatibility Notes", readTime: "4 min", reads: 2890 },
    ],
  },
  {
    slug: "dashboard",
    name: "Dashboard",
    icon: "layout",
    description: "Navigate and use the web dashboard.",
    articles: [
      { slug: "submissions", title: "Your Submissions", readTime: "4 min", reads: 4560 },
      { slug: "pr-workflow", title: "PR Workflow Guide", readTime: "8 min", reads: 6230 },
      { slug: "teams", title: "Team Management", readTime: "6 min", reads: 3450 },
      { slug: "billing", title: "Billing & Plans", readTime: "3 min", reads: 5670 },
    ],
  },
  {
    slug: "api",
    name: "API Reference",
    icon: "code",
    description: "Build on top of our REST API.",
    articles: [
      { slug: "auth", title: "Authentication", readTime: "5 min", reads: 7890 },
      { slug: "endpoints", title: "Endpoints Overview", readTime: "12 min", reads: 10230 },
      { slug: "webhooks", title: "Webhooks Guide", readTime: "8 min", reads: 4560 },
      { slug: "rate-limits", title: "Rate Limits & Quotas", readTime: "3 min", reads: 3450 },
      { slug: "errors", title: "Error Codes Reference", readTime: "6 min", reads: 2780 },
    ],
  },
];

const POPULAR_ARTICLES = [
  { category: "Getting Started", slug: "quick-start", title: "Quick Start Guide", reads: 12450 },
  { category: "SaaS Integration", slug: "supported-products", title: "Supported Products List", reads: 11230 },
  { category: "API Reference", slug: "endpoints", title: "Endpoints Overview", reads: 10230 },
  { category: "AI & Diffs", slug: "how-it-works", title: "How AI Generates Diffs", reads: 9120 },
  { category: "API Reference", slug: "auth", title: "Authentication", reads: 7890 },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const section = searchParams.get("section");

  if (section === "categories") {
    return NextResponse.json({ ok: true, data: DOC_CATEGORIES });
  }
  if (section === "popular") {
    return NextResponse.json({ ok: true, data: POPULAR_ARTICLES });
  }
  if (section?.startsWith("category:")) {
    const catSlug = section.slice(9);
    const category = DOC_CATEGORIES.find((c) => c.slug === catSlug);
    if (!category) return NextResponse.json({ ok: false, error: "Category not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: category });
  }

  // Return all
  return NextResponse.json({
    ok: true,
    data: {
      categories: DOC_CATEGORIES,
      popularArticles: POPULAR_ARTICLES,
      totalCategories: DOC_CATEGORIES.length,
      totalArticles: DOC_CATEGORIES.reduce((sum, c) => sum + c.articles.length, 0),
    },
  });
}
