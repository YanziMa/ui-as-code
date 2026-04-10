"use client";

import { useState, useMemo } from "react";
import { cn, formatDate } from "@/lib";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type ReleaseType = "Major" | "Minor" | "Patch" | "Hotfix";

type ChangeCategory = "New Features" | "Improvements" | "Bug Fixes" | "Breaking Changes";

interface ChangeItem {
  category: ChangeCategory;
  text: string;
}

interface Release {
  version: string;
  date: string;
  type: ReleaseType;
  title: string;
  description: string;
  changes: ChangeItem[];
}

/* ------------------------------------------------------------------ */
/*  Release data  (fictional but realistic, reverse chronological)      */
/* ------------------------------------------------------------------ */

const releases: Release[] = [
  {
    version: "v2.5.0",
    date: "2026-04-08",
    type: "Minor",
    title: "AI-Powered Design Token Suggestions",
    description:
      "Intelligent design token recommendations powered by your component library patterns.",
    changes: [
      { category: "New Features", text: "AI-powered design token suggestions that learn from your codebase" },
      { category: "New Features", text: "Token conflict detection with automatic resolution strategies" },
      { category: "New Features", text: "Design token diff viewer showing semantic vs value-level changes" },
      { category: "Improvements", text: "Token search now supports fuzzy matching across names and values" },
      { category: "Improvements", text: "Export dialog redesigned with live preview of output format" },
      { category: "Bug Fixes", text: "Fixed token alias resolution in nested theme configurations" },
    ],
  },
  {
    version: "v2.4.2",
    date: "2026-04-01",
    type: "Patch",
    title: "Stability Improvements",
    description:
      "Performance and reliability fixes for the sandbox and preview engines.",
    changes: [
      { category: "Bug Fixes", text: "Fixed memory leak in long-running sandbox sessions (> 30 min)" },
      { category: "Bug Fixes", text: "Resolved race condition when multiple previews load simultaneously" },
      { category: "Bug Fixes", text: "Fixed incorrect line numbers in generated diff output for multi-line changes" },
      { category: "Improvements", text: "Reduced initial bundle size by 12% through tree-shaking optimizations" },
    ],
  },
  {
    version: "v2.4.1",
    date: "2026-03-28",
    type: "Hotfix",
    title: "Critical Auth Fix",
    description:
      "Urgent fix for session validation edge case affecting SSO users.",
    changes: [
      { category: "Bug Fixes", text: "Fixed session token refresh failing for enterprise SSO users after 1 hour" },
      { category: "Bug Fixes", text: "Restored missing redirect_uri parameter in OAuth callback flow" },
    ],
  },
  {
    version: "v2.4.0",
    date: "2026-03-22",
    type: "Minor",
    title: "Component Catalog v2",
    description:
      "A completely rebuilt component catalog with interactive playgrounds and prop documentation.",
    changes: [
      { category: "New Features", text: "Interactive component playground with live prop editing" },
      { category: "New Features", text: "Auto-generated prop documentation from TypeScript types and JSDoc" },
      { category: "New Features", text: "Component variant visualizer showing all states side-by-side" },
      { category: "New Features", text: "Embeddable catalog widget for external documentation sites" },
      { category: "Improvements", text: "Catalog indexing speed improved by 3x using incremental parsing" },
      { category: "Bug Fixes", text: "Fixed component preview not rendering SSR-compatible components correctly" },
    ],
  },
  {
    version: "v2.3.0",
    date: "2026-03-15",
    type: "Minor",
    title: "Multi-Branch Diff Support",
    description:
      "Compare UI states across branches, tags, and deployment environments.",
    changes: [
      { category: "New Features", text: "Cross-branch visual diff comparison tool" },
      { category: "New Features", text: "Environment-aware snapshots (staging vs production)" },
      { category: "New Features", text: "Tag-based release annotations on diff timelines" },
      { category: "Improvements", text: "Diff engine now handles CSS-in-JS style mutations accurately" },
      { category: "Improvements", text: "Branch selector dropdown with recent-branch quick-pick" },
      { category: "Bug Fixes", text: "Fixed merge-base detection failing on shallow clone repositories" },
    ],
  },
  {
    version: "v2.2.0",
    date: "2026-03-08",
    type: "Minor",
    title: "Accessibility Audit Engine",
    description:
      "Automated accessibility scanning integrated directly into the diff workflow.",
    changes: [
      { category: "New Features", text: "WCAG 2.2 AA compliance scanner built into every diff" },
      { category: "New Features", text: "Color contrast checker with real-time threshold alerts" },
      { category: "New Features", text: "Keyboard navigation flow visualizer and tester" },
      { category: "New Features", text: "Screen reader announcement simulation panel" },
      { category: "Improvements", text: "A11y violations now appear as inline annotations on affected elements" },
      { category: "Bug Fixes", text: "Fixed false positive on focus-order detection for portals/modals" },
    ],
  },
  {
    version: "v2.1.0",
    date: "2026-03-01",
    type: "Minor",
    title: "Team Workspaces & Collaboration",
    description:
      "Shared workspaces, real-time cursors, and threaded discussions on diffs.",
    changes: [
      { category: "New Features", text: "Shared team workspaces with role-based access control" },
      { category: "New Features", text: "Real-time collaborative cursors on shared diff views" },
      { category: "New Features", text: "Threaded inline comments with @mentions and resolve state" },
      { category: "New Features", text: "Workspace activity feed with digest email options" },
      { category: "Improvements", text: "Project onboarding wizard with template selection" },
      { category: "Bug Fixes", text: "Fixed permission propagation delay when inviting new members" },
    ],
  },
  {
    version: "v2.0.0",
    date: "2026-02-20",
    type: "Major",
    title: "Platform Rewrite & Plugin System",
    description:
      "Complete architectural overhaul introducing a plugin system, new engine, and redesigned UI.",
    changes: [
      { category: "New Features", text: "Extensible plugin API for custom diff providers and exporters" },
      { category: "New Features", text: "Next-generation diff engine with sub-pixel accuracy" },
      { category: "New Features", text: "Redesigned dashboard with customizable widget layout" },
      { category: "New Features", text: "Native monorepo support with workspace-aware configuration" },
      { category: "Breaking Changes", text: "Plugin manifest format changed from JSON to YAML — migration guide provided" },
      { category: "Breaking Changes", text: "Removed legacy REST API v1 endpoints; migrate to GraphQL or REST v2" },
      { category: "Breaking Changes", text: "Configuration file renamed .uacrc to ui-as-code.config.ts" },
      { category: "Improvements", text: "Core diff processing throughput increased by 200%" },
      { category: "Bug Fixes", text: "Resolved all known issues with React StrictMode compatibility" },
    ],
  },
  {
    version: "v1.5.0",
    date: "2026-02-10",
    type: "Minor",
    title: "Figma Integration",
    description:
      "Bidirectional sync with Figma files for design-to-code workflows.",
    changes: [
      { category: "New Features", text: "Figma file import with auto-mapped component hierarchy" },
      { category: "New Features", text: "Design token extraction from Figma styles and variables" },
      { category: "New Features", text: "Two-way sync: push code changes back to Figma as annotations" },
      { category: "Improvements", text: "Import progress bar with per-layer status indicators" },
      { category: "Bug Fixes", text: "Fixed auto-layout frame misalignment for nested frames" },
    ],
  },
  {
    version: "v1.4.1",
    date: "2026-02-03",
    type: "Patch",
    title: "CLI Enhancements",
    description:
      "Quality-of-life improvements for the command-line interface.",
    changes: [
      { category: "Improvements", text: "CLI init command now supports --template flag for starter configs" },
      { category: "Improvements", text: "Diff output formatting respects terminal width via --width auto" },
      { category: "Bug Fixes", text: "Fixed CLI hanging on stdin when pipe source closes unexpectedly" },
      { category: "Bug Fixes", text: "Corrected exit code propagation for child process failures" },
    ],
  },
  {
    version: "v1.4.0",
    date: "2026-01-27",
    type: "Minor",
    title: "Visual Regression Testing",
    description:
      "Automated screenshot comparison with pixel-tolerance and ignore-region support.",
    changes: [
      { category: "New Features", text: "Automated visual regression test suite with CI integration" },
      { category: "New Features", text: "Pixel-tolerance configuration per-component or globally" },
      { category: "New Features", text: "Ignore-region annotation tool for masking dynamic content areas" },
      { category: "New Features", text: "Baseline management with approve/reject workflow" },
      { category: "Improvements", text: "Test report includes animated GIF diff overlays" },
      { category: "Bug Fixes", text: "Fixed flaky screenshots caused by font-loading race conditions" },
    ],
  },
  {
    version: "v1.3.0",
    date: "2026-01-18",
    type: "Minor",
    title: "Teams & Billing",
    description:
      "Multi-seat team management, role-based access, and usage-based billing.",
    changes: [
      { category: "New Features", text: "Team workspace creation with member invitation flows" },
      { category: "New Features", text: "Role-based access: Owner, Admin, Editor, Viewer" },
      { category: "New Features", text: "Usage-based billing dashboard with cost projections" },
      { category: "New Features", text: "Invoice history download in CSV and PDF formats" },
      { category: "Improvements", text: "Onboarding wizard guides new teams through setup in under 2 minutes" },
      { category: "Bug Fixes", text: "Fixed team seat count not updating after member removal" },
    ],
  },
  {
    version: "v1.2.1",
    date: "2026-01-10",
    type: "Patch",
    title: "Webhook Reliability",
    description:
      "Improved webhook delivery guarantees and debugging tools.",
    changes: [
      { category: "Improvements", text: "Webhook retry policy now uses exponential backoff (max 24 hours)" },
      { category: "Improvements", text: "Added webhook delivery log with request/response inspection" },
      { category: "Bug Fixes", text: "Fixed webhook signature verification failing for payloads > 64 KB" },
      { category: "Bug Fixes", text: "Resolved duplicate webhook delivery during failover events" },
    ],
  },
  {
    version: "v1.2.0",
    date: "2026-01-03",
    type: "Minor",
    title: "CLI & Webhooks",
    description:
      "Command-line tool and real-time event notifications via webhooks.",
    changes: [
      { category: "New Features", text: "Official CLI tool for generating diffs from the terminal" },
      { category: "New Features", text: "Webhook system for real-time PR event notifications" },
      { category: "New Features", text: "Performance dashboard monitoring diff latency and throughput" },
      { category: "Improvements", text: "Diff generation speed reduced by 40% with cached context" },
      { category: "Bug Fixes", text: "Fixed webhook retries not triggering on transient network errors" },
    ],
  },
  {
    version: "v1.1.1",
    date: "2025-12-22",
    type: "Patch",
    title: "Dashboard Polish",
    description:
      "UI refinements and performance tuning for the analytics dashboard.",
    changes: [
      { category: "Improvements", text: "Dashboard charts now animate smoothly on data load" },
      { category: "Improvements", text: "Date range picker supports preset ranges (7d, 30d, 90d, custom)" },
      { category: "Bug Fixes", text: "Fixed chart tooltip positioning overflow on narrow viewports" },
      { category: "Bug Fixes", text: "Corrected aggregation bug in weekly friction trend calculation" },
    ],
  },
  {
    version: "v1.1.0",
    date: "2025-12-15",
    type: "Minor",
    title: "Analytics & Notifications",
    description:
      "Track adoption trends, monitor system health, and stay informed with alerts.",
    changes: [
      { category: "New Features", text: "Analytics page with friction trends, adoption rates, and team activity" },
      { category: "New Features", text: "Status monitoring with health checks for AI providers and APIs" },
      { category: "New Features", text: "In-app notification center with email digest preferences" },
      { category: "Improvements", text: "Dashboard charts support custom date range selection" },
      { category: "Bug Fixes", text: "Fixed notification preferences not persisting across browser sessions" },
    ],
  },
  {
    version: "v1.0.1",
    date: "2025-12-05",
    type: "Patch",
    title: "Post-Launch Stabilization",
    description:
      "Critical fixes discovered during the first week of production usage.",
    changes: [
      { category: "Bug Fixes", text: "Fixed diff generation timeout on repositories with > 10,000 components" },
      { category: "Bug Fixes", text: "Resolved OAuth callback loop for certain identity providers" },
      { category: "Bug Fixes", text: "Fixed PR comment markdown rendering for code blocks with special chars" },
      { category: "Improvements", text: "Added rate limiting headers to all API responses" },
    ],
  },
  {
    version: "v1.0.0",
    date: "2025-11-25",
    type: "Major",
    title: "Initial Public Release",
    description:
      "The first stable release of UI-as-Code — turning UI friction into code changes.",
    changes: [
      { category: "New Features", text: "Core AI-powered diff generation supporting multiple LLM providers" },
      { category: "New Features", text: "Community PR workflow: submit, review, vote, and merge suggested changes" },
      { category: "New Features", text: "Browser extension MVP for inline component inspection and diff capture" },
      { category: "New Features", text: "Supabase-backed backend with PostgreSQL storage and OAuth authentication" },
      { category: "Breaking Changes", text: "API base path migrated from /v0 to /v1 — update all integrations" },
    ],
  },
  {
    version: "v0.5.0",
    date: "2025-11-10",
    type: "Minor",
    title: "Beta Preview",
    description:
      "Open beta with early adopter feedback loops and expanded provider support.",
    changes: [
      { category: "New Features", text: "Support for Anthropic Claude, Google Gemini, and OpenAI GPT providers" },
      { category: "New Features", text: "Feedback widget with screenshot attachment for bug reports" },
      { category: "New Features", text: "Public roadmap with upvote-powered prioritization" },
      { category: "Improvements", text: "Diff quality scoring model trained on 50,000 labeled examples" },
      { category: "Bug Fixes", text: "Fixed image upload failing for SVGs with foreignObject elements" },
    ],
  },
  {
    version: "v0.3.1",
    date: "2025-10-28",
    type: "Patch",
    title: "Alpha Stability",
    description:
      "Reliability fixes for the closed alpha testing phase.",
    changes: [
      { category: "Bug Fixes", text: "Fixed WebSocket connection dropping after 5 minutes of inactivity" },
      { category: "Bug Fixes", text: "Resolved database deadlock under concurrent write loads" },
      { category: "Improvements", text: "Added circuit breaker pattern for external AI API calls" },
    ],
  },
  {
    version: "v0.3.0",
    date: "2025-10-15",
    type: "Minor",
    title: "Closed Alpha",
    description:
      "First alpha release with core diff pipeline and basic web interface.",
    changes: [
      { category: "New Features", text: "Initial diff generation pipeline with single-provider AI backend" },
      { category: "New Features", text: "Basic web UI for uploading screenshots and viewing generated diffs" },
      { category: "New Features", text: "Simple user authentication with email/password and magic link" },
      { category: "Improvements", text: "Base architecture established with modular service layer" },
    ],
  },
  {
    version: "v0.1.0",
    date: "2025-09-20",
    type: "Minor",
    title: "Project Inception",
    description:
      "The very first commit — a proof of concept demonstrating AI-driven UI diff generation.",
    changes: [
      { category: "New Features", text: "Proof-of-concept: screenshot-to-diff transformation using vision models" },
      { category: "New Features", text: "Prototype CLI wrapper around the core diff algorithm" },
      { category: "New Features", text: "Initial repository scaffold with monorepo structure" },
      { category: "Improvements", text: "Established coding standards, CI pipeline, and contribution guidelines" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                 */
/* ------------------------------------------------------------------ */

const RELEASE_TYPE_FILTERS: { label: string; value: ReleaseType | "All"; count: number }[] =
  [
    { label: "All Releases", value: "All", count: releases.length },
    { label: "Major", value: "Major", count: releases.filter((r) => r.type === "Major").length },
    { label: "Minor", value: "Minor", count: releases.filter((r) => r.type === "Minor").length },
    { label: "Patch", value: "Patch", count: releases.filter((r) => r.type === "Patch").length },
    { label: "Hotfix", value: "Hotfix", count: releases.filter((r) => r.type === "Hotfix").length },
  ];

const typeBadgeStyles: Record<ReleaseType, string> = {
  Major:
    "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
  Minor:
    "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800",
  Patch:
    "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
  Hotfix:
    "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800",
};

const typeDotColors: Record<ReleaseType, string> = {
  Major: "bg-red-500",
  Minor: "bg-blue-500",
  Patch: "bg-emerald-500",
  Hotfix: "bg-orange-500",
};

const categoryMeta: Record<
  ChangeCategory,
  { icon: string; colorClass: string; label: string }
> = {
  "New Features": {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3v10M3 8h10" />
      </svg>
    ),
    colorClass: "text-emerald-600 dark:text-emerald-400",
    label: "New Features",
  },
  Improvements: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l4-4 3 3 4-5" />
        <path d="M13 5h2v2" />
      </svg>
    ),
    colorClass: "text-blue-600 dark:text-blue-400",
    label: "Improvements",
  },
  "Bug Fixes": {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 3L3 13M3 6.5V13h6.5" />
      </svg>
    ),
    colorClass: "text-amber-600 dark:text-amber-400",
    label: "Bug Fixes",
  },
  "Breaking Changes": {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v1M8 13v1M14 8h1M1 8h1M12.2 3.8l-.7.7M4.5 11.5l-.7.7M12.2 12.2l-.7-.7M4.5 4.5l-.7-.7" />
        <circle cx="8" cy="8" r="2.5" />
      </svg>
    ),
    colorClass: "text-red-600 dark:text-red-400",
    label: "Breaking Changes",
  },
};

const CATEGORY_ORDER: ChangeCategory[] = [
  "New Features",
  "Improvements",
  "Bug Fixes",
  "Breaking Changes",
];

function groupChanges(changes: ChangeItem[]): Map<ChangeCategory, ChangeItem[]> {
  const map = new Map<ChangeCategory, ChangeItem[]>();
  for (const cat of CATEGORY_ORDER) {
    const items = changes.filter((c) => c.category === cat);
    if (items.length > 0) map.set(cat, items);
  }
  return map;
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function ChangelogPage() {
  const [activeFilter, setActiveFilter] = useState<ReleaseType | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReleases = useMemo(() => {
    let result = releases;

    if (activeFilter !== "All") {
      result = result.filter((r) => r.type === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.version.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.changes.some((c) => c.text.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [activeFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="border-b border-zinc-200 bg-white px-6 py-10 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Changelog
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Track every improvement, fix, and feature shipped to UI-as-Code.
                All releases are listed in reverse chronological order.
              </p>
            </div>

            {/* RSS Feed Badge */}
            <a
              href="/rss.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm transition-all hover:border-orange-300 hover:text-orange-600 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-orange-800 dark:hover:text-orange-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-orange-500"
              >
                <path d="M4 11a9 9 0 0 1 9 9" />
                <path d="M4 4a16 16 0 0 1 16 16" />
                <circle cx="5" cy="19" r="1" fill="currentColor" stroke="none" />
              </svg>
              RSS Feed
            </a>
          </div>

          {/* ── Search Bar ─────────────────────────────── */}
          <div className="relative mt-6 max-w-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search versions, features, fixes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* ── Filter Tabs ────────────────────────────── */}
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filter by release type">
            {RELEASE_TYPE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                  activeFilter === filter.value
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/60 dark:text-blue-300"
                    : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-300",
                )}
              >
                {filter.label}
                <span
                  className={cn(
                    "ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums",
                    activeFilter === filter.value
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400",
                  )}
                >
                  {filter.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-10">
        {filteredReleases.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-20 dark:border-zinc-700 dark:bg-zinc-900/50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
              <path d="M8 11h6" />
            </svg>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              No releases match your search.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveFilter("All");
              }}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Timeline */
          <ol className="relative space-y-8">
            {/* Vertical timeline line */}
            <span
              className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-zinc-200 dark:bg-zinc-800"
              aria-hidden="true"
            />

            {filteredReleases.map((release) => {
              const grouped = groupChanges(release.changes);

              return (
                <li key={release.version} className="relative">
                  {/* Timeline dot */}
                  <span
                    className={cn(
                      "absolute left-[11px] top-6 z-10 block h-4 w-4 rounded-full border-2 border-white ring-2 ring-zinc-200 dark:border-zinc-950 dark:ring-zinc-800",
                      typeDotColors[release.type],
                    )}
                    aria-hidden="true"
                  />

                  {/* Card */}
                  <article className="ml-10 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/70">
                    {/* Card Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                          {release.version}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                            typeBadgeStyles[release.type],
                          )}
                        >
                          {release.type}
                        </span>
                      </div>
                      <time
                        dateTime={release.date}
                        className="shrink-0 text-xs font-medium text-zinc-400 tabular-nums"
                      >
                        {formatDate(release.date)}
                      </time>
                    </div>

                    {/* Title & Description */}
                    <h2 className="mt-3 text-base font-semibold text-zinc-800 dark:text-zinc-100">
                      {release.title}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {release.description}
                    </p>

                    {/* Grouped Changes */}
                    <div className="mt-5 space-y-4">
                      {Array.from(grouped.entries()).map(([category, items]) => {
                        const meta = categoryMeta[category];
                        return (
                          <div key={category}>
                            <h3
                              className={cn(
                                "mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider",
                                meta.colorClass,
                              )}
                            >
                              {meta.icon}
                              {meta.label}
                              <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-100 px-1.5 text-[11px] font-medium tabular-nums text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                {items.length}
                              </span>
                            </h3>
                            <ul className="space-y-2">
                              {items.map((item, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
                                >
                                  <span className="mt-2 block h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                  <span>{item.text}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        )}

        {/* Footer note */}
        <footer className="mt-16 border-t border-zinc-200 pt-8 text-center dark:border-zinc-800">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Showing {filteredReleases.length} of {releases.length} releases &middot;{" "}
            Last updated April 2026
          </p>
        </footer>
      </main>
    </div>
  );
}
