import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog",
  description: "UI-as-Code release history and updates",
};

const releases = [
  {
    version: "v0.2.0",
    date: "2026-04-10",
    label: "Production Launch",
    items: [
      { type: "feature", text: "Landing page with 7 sections (Hero, How It Works, Why, Pricing, FAQ, CTA)" },
      { type: "feature", text: "Dashboard with activity chart, stat cards, top pain points" },
      { type: "feature", text: "PR Dashboard with search, filter, sort, vote/merge" },
      { type: "feature", text: "API Documentation page (/api-docs) with all 10 endpoints" },
      { type: "feature", text: "CSV export for friction data (/api/frictions/export)" },
      { type: "feature", text: "Error logging system with global handlers" },
      { type: "feature", text: "Dark mode toggle (light/dark/system) with persistence" },
      { type: "feature", text: "Chrome extension with inspector panel, diff review, copy diff" },
      { type: "improvement", text: "AI prompt engineering: 10 strict rules for better diff quality" },
      { type: "improvement", text: "Cache-Control headers on GET API routes (stale-while-revalidate)" },
      { type: "improvement", text: "Accessibility: skip link, focus-visible, ARIA labels" },
      { type: "improvement", text: "Rate limiting on AI endpoints (5 req/min) and general API (30 req/min)" },
    ],
  },
  {
    version: "v0.1.0",
    date: "2026-04-09",
    label: "Initial Beta",
    items: [
      { type: "feature", text: "Monorepo setup (pnpm workspace + Turborepo)" },
      { type: "feature", text: "Next.js 16 web app with App Router" },
      { type: "feature", text: "Plasmo Chrome extension (Manifest V3)" },
      { type: "feature", text: "10 API endpoints (generate-diff, frictions, PRs, health, etc.)" },
      { type: "feature", text: "Unified diff parser and sandbox preview" },
      { type: "feature", text: "Supabase integration (PostgreSQL + Auth)" },
      { type: "feature", text: "Multi-provider AI support (GLM, Claude, OpenAI, DeepSeek)" },
      { type: "improvement", text: "Zod v4 input validation on all routes" },
      { type: "improvement", text: "CORS middleware for all /api/* routes" },
    ],
  },
];

const typeStyles: Record<string, string> = {
  feature: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900",
  improvement: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
  fix: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📋</span>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Changelog</h1>
          </div>
          <p className="text-sm text-zinc-500">
            Track what&apos;s new and what&apos;s improved in UI-as-Code.
          </p>
          <nav className="mt-3 flex gap-3 text-sm">
            <Link href="/" className="text-blue-600 hover:text-blue-700">Home</Link>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">Dashboard</Link>
            <Link href="/api-docs" className="text-blue-600 hover:text-blue-700">API Docs</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-10">
        {releases.map((release) => (
          <section key={release.version}>
            {/* Release header */}
            <div className="flex items-center gap-3 mb-5">
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                {release.version}
              </span>
              <span className="text-xs text-zinc-400">{release.date}</span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {release.label}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {release.items.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${typeStyles[item.type] || ""}`}
                >
                  <span className="mt-0.5 shrink-0 text-xs font-bold uppercase">
                    {item.type === "feature" ? "+" : item.type === "fix" ? "fix" : "~"}
                  </span>
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
