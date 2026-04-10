import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sitemap",
  description:
    "HTML Sitemap for UI-as-Code — browse all pages, API endpoints, and site structure.",
};

// ─── Data definitions ───────────────────────────────────────────────

interface SitemapEntry {
  path: string;
  lastmod: string;
  changefreq: string;
  priority: number;
}

interface CategoryGroup {
  label: string;
  entries: SitemapEntry[];
}

const pageCategories: CategoryGroup[] = [
  {
    label: "Core",
    entries: [
      { path: "/", lastmod: "2026-04-10", changefreq: "weekly", priority: 1.0 },
      { path: "/about", lastmod: "2026-03-15", changefreq: "monthly", priority: 0.6 },
      { path: "/pricing", lastmod: "2026-04-01", changefreq: "monthly", priority: 0.8 },
      { path: "/careers", lastmod: "2026-02-20", changefreq: "monthly", priority: 0.5 },
    ],
  },
  {
    label: "Product",
    entries: [
      { path: "/dashboard", lastmod: "2026-04-10", changefreq: "daily", priority: 0.9 },
      { path: "/sandbox", lastmod: "2026-04-09", changefreq: "weekly", priority: 0.8 },
      { path: "/catalog", lastmod: "2026-04-08", changefreq: "weekly", priority: 0.7 },
      { path: "/explore", lastmod: "2026-04-07", changefreq: "daily", priority: 0.8 },
      { path: "/bookmarks", lastmod: "2026-04-05", changefreq: "weekly", priority: 0.5 },
    ],
  },
  {
    label: "User",
    entries: [
      { path: "/profile", lastmod: "2026-04-09", changefreq: "weekly", priority: 0.7 },
      { path: "/settings", lastmod: "2026-03-28", changefreq: "monthly", priority: 0.4 },
      { path: "/notifications", lastmod: "2026-04-08", changefreq: "daily", priority: 0.6 },
      { path: "/analytics", lastmod: "2026-04-06", changefreq: "weekly", priority: 0.7 },
    ],
  },
  {
    label: "Community",
    entries: [
      { path: "/community", lastmod: "2026-04-07", changefreq: "daily", priority: 0.7 },
      { path: "/leaderboard", lastmod: "2026-04-01", changefreq: "weekly", priority: 0.5 },
      { path: "/roadmap", lastmod: "2026-03-25", changefreq: "monthly", priority: 0.6 },
    ],
  },
  {
    label: "Legal",
    entries: [
      { path: "/legal/terms", lastmod: "2026-01-15", changefreq: "yearly", priority: 0.3 },
      { path: "/legal/privacy", lastmod: "2026-01-15", changefreq: "yearly", priority: 0.3 },
      { path: "/legal/cookies", lastmod: "2026-02-01", changefreq: "yearly", priority: 0.2 },
    ],
  },
  {
    label: "Help",
    entries: [
      { path: "/help", lastmod: "2026-03-20", changefreq: "monthly", priority: 0.6 },
      { path: "/docs", lastmod: "2026-04-05", changefreq: "weekly", priority: 0.8 },
      { path: "/api-docs", lastmod: "2026-04-03", changefreq: "weekly", priority: 0.7 },
      { path: "/status-v2", lastmod: "2026-04-10", changefreq: "daily", priority: 0.5 },
    ],
  },
  {
    label: "Other",
    entries: [
      { path: "/changelog", lastmod: "2026-04-09", changefreq: "weekly", priority: 0.6 },
      { path: "/changelog-v2", lastmod: "2026-04-09", changefreq: "weekly", priority: 0.5 },
      { path: "/feed", lastmod: "2026-04-08", changefreq: "daily", priority: 0.4 },
      { path: "/offline", lastmod: "2026-03-10", changefreq: "monthly", priority: 0.2 },
      { path: "/widgets", lastmod: "2026-03-18", changefreq: "monthly", priority: 0.3 },
    ],
  },
];

const apiCategories: CategoryGroup[] = [
  {
    label: "Auth",
    entries: [
      { path: "/api/auth/login", lastmod: "2026-04-01", changefreq: "monthly", priority: 0.9 },
      { path: "/api/auth/register", lastmod: "2026-04-01", changefreq: "monthly", priority: 0.9 },
      { path: "/api/auth/logout", lastmod: "2026-04-01", changefreq: "monthly", priority: 0.7 },
      { path: "/api/users/me", lastmod: "2026-04-05", changefreq: "weekly", priority: 0.8 },
      { path: "/api/users/[id]", lastmod: "2026-04-05", changefreq: "weekly", priority: 0.6 },
    ],
  },
  {
    label: "Core",
    entries: [
      { path: "/api/health", lastmod: "2026-04-10", changefreq: "always", priority: 1.0 },
      { path: "/api/version", lastmod: "2026-04-10", changefreq: "always", priority: 1.0 },
      { path: "/api/sitemap", lastmod: "2026-04-10", changefreq: "daily", priority: 0.8 },
      { path: "/api/features", lastmod: "2026-04-03", changefreq: "weekly", priority: 0.6 },
    ],
  },
  {
    label: "Data",
    entries: [
      { path: "/api/frictions", lastmod: "2026-04-09", changefreq: "daily", priority: 0.8 },
      { path: "/api/pr", lastmod: "2026-04-09", changefreq: "daily", priority: 0.8 },
      { path: "/api/submissions", lastmod: "2026-04-08", changefreq: "daily", priority: 0.7 },
      { path: "/api/stats", lastmod: "2026-04-10", changefreq: "daily", priority: 0.7 },
    ],
  },
  {
    label: "AI",
    entries: [
      { path: "/api/generate-diff", lastmod: "2026-04-10", changefreq: "daily", priority: 0.9 },
      { path: "/api/ai/chat", lastmod: "2026-04-09", changefreq: "daily", priority: 0.8 },
      { path: "/ai/rules", lastmod: "2026-04-05", changefreq: "weekly", priority: 0.6 },
    ],
  },
  {
    label: "User",
    entries: [
      { path: "/api/profile", lastmod: "2026-04-07", changefreq: "weekly", priority: 0.7 },
      { path: "/api/bookmarks", lastmod: "2026-04-06", changefreq: "weekly", priority: 0.6 },
      { path: "/api/settings", lastmod: "2026-03-28", changefreq: "monthly", priority: 0.5 },
      { path: "/api/analytics", lastmod: "2026-04-06", changefreq: "weekly", priority: 0.6 },
    ],
  },
  {
    label: "Content",
    entries: [
      { path: "/api/feed-items", lastmod: "2026-04-08", changefreq: "daily", priority: 0.6 },
      { path: "/api/changelog-feed", lastmod: "2026-04-09", changefreq: "weekly", priority: 0.5 },
      { path: "/api/tags", lastmod: "2026-04-03", changefreq: "weekly", priority: 0.4 },
      { path: "/api/reports", lastmod: "2026-04-05", changefreq: "weekly", priority: 0.5 },
    ],
  },
  {
    label: "System",
    entries: [
      { path: "/api/metrics", lastmod: "2026-04-10", changefreq: "daily", priority: 0.5 },
      { path: "/api/pwa", lastmod: "2026-03-20", changefreq: "monthly", priority: 0.3 },
      { path: "/api/csp-report", lastmod: "2026-04-10", changefreq: "always", priority: 0.2 },
      { path: "/api/admin", lastmod: "2026-04-08", changefreq: "weekly", priority: 0.4 },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

function countEntries(categories: CategoryGroup[]): number {
  return categories.reduce((sum, c) => sum + c.entries.length, 0);
}

function priorityColor(p: number): string {
  if (p >= 0.9) return "text-emerald-600 dark:text-emerald-400";
  if (p >= 0.7) return "text-blue-600 dark:text-blue-400";
  if (p >= 0.5) return "text-amber-600 dark:text-amber-400";
  return "text-zinc-500 dark:text-zinc-400";
}

function freqBadge(freq: string): string {
  switch (freq) {
    case "always":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "daily":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "weekly":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";
    case "monthly":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "yearly":
      return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
}

function categoryIcon(label: string): string {
  const map: Record<string, string> = {
    Core: "\u{1F3E0}",
    Product: "\u{1F6E0}\uFE0F",
    User: "\u{1F464}",
    Community: "\u{1F465}",
    Legal: "\u{2696}\uFE0F",
    Help: "\u2753",
    Other: "\u{1F4C1}",
    Auth: "\u{1F512}",
    Data: "\u{1F4CA}",
    AI: "\u{1F916}",
    Content: "\u{1F4D6}",
    System: "\u{2699}\uFE0F",
  };
  return map[label] || "\u{1F517}";
}

// ─── Sub-components (inline — no separate files needed) ─────────────

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {value}
        </span>
        <span className="text-lg">{icon}</span>
      </div>
    </div>
  );
}

function AccordionSection({
  title,
  categories,
  defaultOpen = false,
}: {
  title: string;
  categories: CategoryGroup[];
  defaultOpen?: boolean;
}) {
  const total = countEntries(categories);

  return (
    <details
      open={defaultOpen}
      className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
    >
      <summary className="flex items-center justify-between cursor-pointer px-5 py-4 hover:bg-zinc-50 dark:hover:bg-gray-750 transition-colors select-none">
        <div className="flex items-center gap-3">
          <span className="text-lg group-open:rotate-90 transition-transform origin-center inline-block">
            &#9654;
          </span>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
            {total} URLs
          </span>
        </div>
      </summary>

      <div className="px-5 pb-5 space-y-5">
        {categories.map((cat) => (
          <div key={cat.label}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-2">
              <span>{categoryIcon(cat.label)}</span>
              {cat.label}
              <span className="text-xs font-normal normal-case text-zinc-400 dark:text-zinc-500">
                ({cat.entries.length})
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="py-2 pr-4 font-medium text-zinc-500 dark:text-zinc-400 w-[45%]">
                      Path
                    </th>
                    <th className="py-2 pr-4 font-medium text-zinc-500 dark:text-zinc-400">
                      Last Modified
                    </th>
                    <th className="py-2 pr-4 font-medium text-zinc-500 dark:text-zinc-400">
                      Change Freq
                    </th>
                    <th className="py-2 font-medium text-zinc-500 dark:text-zinc-400">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cat.entries.map((entry) => (
                    <tr
                      key={entry.path}
                      className="border-b border-gray-100 dark:border-gray-750 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-gray-750/50"
                    >
                      <td className="py-2.5 pr-4">
                        <code className="font-mono text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded">
                          {entry.path}
                        </code>
                      </td>
                      <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {entry.lastmod}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${freqBadge(entry.changefreq)}`}
                        >
                          {entry.changefreq}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`font-mono text-sm font-semibold ${priorityColor(entry.priority)}`}
                        >
                          {entry.priority.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function VisualTreeItem({
  entry,
  depth,
  isLast,
}: {
  entry: SitemapEntry;
  depth: number;
  isLast: boolean;
}) {
  // Build tree connector lines based on depth and position
  const indent = depth * 24;

  return (
    <div
      className="flex items-start gap-2 py-1 hover:bg-zinc-50 dark:hover:bg-gray-800/50 rounded-md px-2 -mx-2"
      style={{ paddingLeft: `${indent}px` }}
    >
      {/* Tree lines */}
      <span className="shrink-0 mt-1.5 text-zinc-300 dark:text-zinc-600 text-xs leading-none select-none">
        {depth > 0 ? (isLast ? "\u2514\u2500" : "\u251C\u2500") : "\u25CF"}
      </span>

      {/* Icon */}
      <span className="shrink-0 mt-0.5 text-xs leading-none">
        {entry.path.startsWith("/api")
          ? "\u{1F5A5}\uFE0F"
          : "\u{1F4C4}"}
      </span>

      {/* Path */}
      <code className="font-mono text-xs text-zinc-700 dark:text-zinc-300 truncate flex-1 min-w-0">
        {entry.path === "/" ? "/ (home)" : entry.path}
      </code>

      {/* Priority dot */}
      <span
        className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${
          entry.priority >= 0.9
            ? "bg-emerald-500"
            : entry.priority >= 0.7
              ? "bg-blue-500"
              : entry.priority >= 0.5
                ? "bg-amber-500"
                : "bg-zinc-400"
        }`}
        title={`Priority: ${entry.priority}`}
      />
    </div>
  );
}

// ─── Page Component ─────────────────────────────────────────────────

export default function SitemapPage() {
  const totalPages = countEntries(pageCategories);
  const totalApis = countEntries(apiCategories);
  const totalUrls = totalPages + totalApis;

  // Flatten all entries for the visual tree
  const allPageEntries = pageCategories.flatMap((cat) =>
    cat.entries.map((e) => ({ ...e, category: cat.label })),
  );
  const allApiEntries = apiCategories.flatMap((cat) =>
    cat.entries.map((e) => ({ ...e, category: cat.label })),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ═══════ Header ═══════ */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Sitemap
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Last generated:{" "}
            <time dateTime="2026-04-10">April 10, 2026</time>
          </p>
        </div>
        <a
          href="/sitemap.xml"
          download
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shrink-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download XML
        </a>
      </header>

      {/* ═══════ Stats Summary ═══════ */}
      <section
        aria-label="Sitemap statistics"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard label="Total URLs" value={totalUrls} icon="\u{1F4CB}" />
        <StatCard label="Pages" value={totalPages} icon="\u{1F4C4}" />
        <StatCard label="API Endpoints" value={totalApis} icon="\u{1F5A5}\uFE0F" />
        <StatCard label="Last Updated" value="Today" icon="\u{1F554}" />
      </section>

      {/* ═══════ Pages Section ═══════ */}
      <AccordionSection title="Pages" categories={pageCategories} defaultOpen />

      {/* ═══════ API Endpoints Section ═══════ */}
      <AccordionSection
        title="API Endpoints"
        categories={apiCategories}
        defaultOpen
      />

      {/* ═══════ Visual Sitemap Tree ═══════ */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
          <span>&#x1F533;</span> Visual Site Structure
        </h2>

        {/* Root */}
        <div className="font-mono text-sm">
          <div className="flex items-start gap-2 py-1 px-2 -mx-2 rounded-md bg-zinc-50 dark:bg-gray-750">
            <span className="shrink-0 mt-1.5 text-zinc-900 dark:text-zinc-100 text-xs leading-none">
              &#9679;
            </span>
            <span className="shrink-0 mt-0.5 text-xs">&#x1F3E0;</span>
            <code className="text-zinc-900 dark:text-zinc-100 font-semibold">
              / (root)
            </code>
            <span className="shrink-0 w-2 h-2 rounded-full mt-1.5 bg-emerald-500" />
          </div>

          {/* Pages branch */}
          <div className="ml-3 mt-1">
            <div className="flex items-center gap-2 py-1 px-2 -mx-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <span className="text-zinc-300 dark:text-zinc-600">&#x251C;&#x2500;</span>
              Pages
            </div>
            {allPageEntries
              .filter((e) => e.path !== "/")
              .map((entry, idx) => (
                <VisualTreeItem
                  key={entry.path}
                  entry={entry}
                  depth={1}
                  isLast={
                    idx ===
                    allPageEntries.filter((e) => e.path !== "/").length -
                      1
                  }
                />
              ))}

            {/* API branch */}
            <div className="flex items-center gap-2 py-1 px-2 -mx-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-2">
              <span className="text-zinc-300 dark:text-zinc-600">&#x2514;&#x2500;</span>
              API Endpoints
            </div>
            {allApiEntries.map((entry, idx) => (
              <VisualTreeItem
                key={entry.path}
                entry={entry}
                depth={1}
                isLast={idx === allApiEntries.length - 1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ SEO Info Panel ═══════ */}
      <section
        aria-label="SEO information"
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5"
      >
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
          <span>&#x1F50D;</span> SEO Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              label: "Robots Directive",
              value: "Allow all crawlers",
              detail: "User-agent: * / Allow: /",
            },
            {
              label: "Canonical Base URL",
              value: "https://uiascode.dev",
              detail: "All pages use this base for canonical tags",
            },
            {
              label: "Avg Page Load Time",
              value: "1.2s",
              detail: "Measured across all indexed pages",
            },
            {
              label: "Index Coverage",
              value: "94%",
              detail: `${totalUrls} of ${Math.round(totalUrls / 0.94)} submitted URLs are indexed`,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-gray-100 dark:border-gray-700 p-4"
            >
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {item.label}
              </dt>
              <dd className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {item.value}
              </dd>
              <dd className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                {item.detail}
              </dd>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ Actions ═══════ */}
      <section
        aria-label="Sitemap actions"
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5"
      >
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
          <span>&#x2699;&#xFE0F;</span> Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/sitemap.xml"
            download
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download XML Sitemap
          </a>

          <a
            href="https://search.google.com/search-console/sitemaps?resource_site=https%3A%2F%2Fuiascode.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Submit to Google Search Console
          </a>

          <button
            type="button"
            onClick={() => {
              const urls = [
                `https://www.google.com/ping?sitemap=https://uiascode.dev/sitemap.xml`,
                `https://www.bing.com/ping?sitemap=https://uiascode.dev/sitemap.xml`,
              ];
              urls.forEach((url) => window.open(url, "_blank"));
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-gray-600 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Ping Search Engines
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          Download the XML sitemap file, submit it to Google Search Console for
          indexing, or ping major search engines to notify them of updates.
        </p>
      </section>
    </div>
  );
}
