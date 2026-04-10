import { Metadata } from "next";
import Link from "next/link";
import { cn, formatDate, capitalize } from "@/lib";

export const metadata: Metadata = {
  title: "Changelog",
  description: "UI-as-Code release history and updates",
};

type ChangeType = "New" | "Improved" | "Fixed" | "Breaking";

interface ChangeItem {
  type: ChangeType;
  text: string;
}

interface Release {
  version: string;
  date: string;
  changes: ChangeItem[];
}

const releases: Release[] = [
  {
    version: "v1.3.0",
    date: "2026-04-08",
    changes: [
      { type: "New", text: "Teams &amp; billing — invite members, manage roles, and upgrade plans" },
      { type: "New", text: "Integrations marketplace — browse and connect third-party tools" },
      { type: "New", text: "Audit log — track every action across your workspace" },
      { type: "Improved", text: "Team onboarding flow with guided setup wizard" },
      { type: "Improved", text: "Billing dashboard with usage breakdowns and invoices" },
    ],
  },
  {
    version: "v1.2.0",
    date: "2026-04-01",
    changes: [
      { type: "New", text: "CLI tool — generate diffs, manage PRs, and configure settings from terminal" },
      { type: "New", text: "Webhook system — receive real-time notifications for PR events" },
      { type: "New", text: "Performance dashboard — monitor diff generation latency and throughput" },
      { type: "Improved", text: "Diff generation speed reduced by 40% with cached context" },
      { type: "Fixed", text: "Webhook delivery retries on transient network failures" },
    ],
  },
  {
    version: "v1.1.0",
    date: "2026-03-25",
    changes: [
      { type: "New", text: "Analytics page — visualize friction trends, adoption rates, and team activity" },
      { type: "New", text: "Status monitoring — health checks for AI providers and API endpoints" },
      { type: "New", text: "Notifications — in-app alerts and email digests for PR updates" },
      { type: "Improved", text: "Dashboard charts now support custom date range selection" },
      { type: "Fixed", text: "Notification preferences not persisting across sessions" },
    ],
  },
  {
    version: "v1.0.0",
    date: "2026-03-18",
    changes: [
      { type: "New", text: "Initial release — core diff generation powered by multi-provider AI" },
      { type: "New", text: "PR workflow — submit, review, vote, and merge community-suggested changes" },
      { type: "New", text: "Browser extension MVP — inspect components, capture screenshots, generate diffs inline" },
      { type: "New", text: "Supabase backend with PostgreSQL storage and OAuth authentication" },
      { type: "Breaking", text: "API base path migrated from /v0 to /v1 — update all integrations" },
    ],
  },
];

function getReleaseType(version: string): "Major" | "Minor" | "Patch" {
  const minor = parseInt(version.split(".")[1], 10);
  if (minor === 0) return "Major";
  const patch = parseInt(version.split(".")[2], 10);
  return patch === 0 ? "Minor" : "Patch";
}

const releaseTypeStyles: Record<string, string> = {
  Major:
    "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800",
  Minor:
    "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800",
  Patch:
    "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
};

const changeTypeStyles: Record<ChangeType, string> = {
  New: "text-emerald-600 dark:text-emerald-400",
  Improved: "text-blue-600 dark:text-blue-400",
  Fixed: "text-amber-600 dark:text-amber-400",
  Breaking: "text-red-600 dark:text-red-400",
};

const changeTypeIcons: Record<ChangeType, string> = {
  New: "+",
  Improved: "~",
  Fixed: "\u2713",
  Breaking: "!",
};

function groupByType(changes: ChangeItem[]): Map<ChangeType, ChangeItem[]> {
  const groups = new Map<ChangeType, ChangeItem[]>();
  const order: ChangeType[] = ["New", "Improved", "Fixed", "Breaking"];
  for (const type of order) {
    const items = changes.filter((c) => c.type === type);
    if (items.length > 0) groups.set(type, items);
  }
  return groups;
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                What&apos;s New
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Track the latest releases and improvements to UI-as-Code.
              </p>
            </div>
            <a
              href="/rss.xml"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M4 11a9 9 0 0 1 9 9" />
                <path d="M4 4a16 16 0 0 1 16 16" />
                <circle cx="5" cy="19" r="1" />
              </svg>
              RSS Feed
            </a>
          </div>
          <nav className="mt-4 flex gap-3 text-sm">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Dashboard
            </Link>
            <Link
              href="/api-docs"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              API Docs
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <ol className="relative border-l-2 border-zinc-200 pl-8 space-y-10 dark:border-zinc-800">
          {releases.map((release) => {
            const releaseType = getReleaseType(release.version);
            const grouped = groupByType(release.changes);

            return (
              <li key={release.version} className="relative">
                {/* Timeline dot */}
                <div
                  className={cn(
                    "absolute -left-[calc(2rem+5px)] top-1 h-3 w-3 rounded-full border-2 border-white ring-2 ring-zinc-200 dark:border-zinc-950 dark:ring-zinc-800",
                    releaseType === "Major"
                      ? "bg-purple-500"
                      : releaseType === "Minor"
                        ? "bg-blue-500"
                        : "bg-zinc-400",
                  )}
                />

                {/* Release header */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {release.version}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                      releaseTypeStyles[releaseType],
                    )}
                  >
                    {releaseType}
                  </span>
                  <span className="text-sm text-zinc-400">
                    {formatDate(release.date)}
                  </span>
                </div>

                {/* Grouped changes */}
                <div className="space-y-4">
                  {Array.from(grouped.entries()).map(([type, items]) => (
                    <div key={type}>
                      <h3
                        className={cn(
                          "mb-2 text-xs font-bold uppercase tracking-wider",
                          changeTypeStyles[type],
                        )}
                      >
                        {changeTypeIcons[type]} {type}
                      </h3>
                      <ul className="space-y-1.5">
                        {items.map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                            <span dangerouslySetInnerHTML={{ __html: item.text }} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
