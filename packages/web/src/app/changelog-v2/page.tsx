import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — UI-as-Code",
  description:
    "Track the latest releases, features, improvements, and fixes for UI-as-Code.",
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ChangeKind = "new" | "improved" | "fixed" | "breaking" | "security";

interface Change {
  kind: ChangeKind;
  text: string;
}

interface Release {
  version: string;
  date: string;
  badge?: "Latest" | "Milestone";
  changes: Change[];
  stats: { features: number; fixes: number };
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const releases: Release[] = [
  {
    version: "v1.4.0",
    date: "April 10, 2026",
    badge: "Latest",
    changes: [
      { kind: "new", text: "Dark mode for sandbox preview" },
      { kind: "new", text: "Team workspaces (80% rollout)" },
      { kind: "improved", text: "AI diff accuracy to 94.2%" },
      { kind: "fixed", text: "Extension crash on Firefox Nightly" },
    ],
    stats: { features: 12, fixes: 8 },
  },
  {
    version: "v1.3.0",
    date: "April 1, 2026",
    changes: [
      { kind: "new", text: "Analytics dashboard" },
      { kind: "new", text: "Export PRs as PDF" },
      { kind: "improved", text: "Search across all submissions" },
      { kind: "fixed", text: "Notification delivery delays" },
    ],
    stats: { features: 5, fixes: 6 },
  },
  {
    version: "v1.2.0",
    date: "March 15, 2026",
    changes: [
      { kind: "new", text: "Webhooks v2 (30% rollout)" },
      { kind: "new", text: "SaaS catalog browsing" },
      { kind: "improved", text: "Inspector mode performance" },
      { kind: "fixed", text: "Screenshot capture on retina displays" },
    ],
    stats: { features: 7, fixes: 4 },
  },
  {
    version: "v1.1.0",
    date: "March 1, 2026",
    changes: [
      { kind: "new", text: "Community leaderboards" },
      { kind: "new", text: "Badge/achievement system" },
      { kind: "improved", text: "Prompt suggestions" },
      { kind: "fixed", text: "Rate limit counter reset bug" },
    ],
    stats: { features: 9, fixes: 3 },
  },
  {
    version: "v1.0.5",
    date: "February 15, 2026",
    changes: [
      { kind: "improved", text: "Diff rendering speed 3x" },
      { kind: "fixed", text: "Memory leak in long sessions" },
      { kind: "security", text: "Updated dependency versions" },
    ],
    stats: { features: 0, fixes: 5 },
  },
  {
    version: "v1.0.0",
    date: "February 1, 2026",
    badge: "Milestone",
    changes: [
      { kind: "new", text: "Initial public release!" },
      { kind: "new", text: "Browser extension for Chrome/Firefox/Edge" },
      { kind: "new", text: "AI-powered diff generation via Claude API" },
      { kind: "new", text: "Sandbox preview with before/after comparison" },
      { kind: "new", text: "PR workflow for SaaS vendor review" },
      { kind: "new", text: "User dashboard with submission history" },
    ],
    stats: { features: 25, fixes: 0 },
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const kindConfig: Record<
  ChangeKind,
  { label: string; classes: string }
> = {
  new: {
    label: "New",
    classes:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
  },
  improved: {
    label: "Improved",
    classes:
      "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
  },
  fixed: {
    label: "Fixed",
    classes:
      "bg-orange-50 text-orange-700 dark:bg-orange-400/10 dark:text-orange-400 border-orange-200 dark:border-orange-500/30",
  },
  breaking: {
    label: "Breaking",
    classes:
      "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-400 border-red-200 dark:border-red-500/30",
  },
  security: {
    label: "Security",
    classes:
      "bg-purple-50 text-purple-700 dark:bg-purple-400/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/30",
  },
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
      {children}
    </span>
  );
}

function KindTag({ kind }: { kind: ChangeKind }) {
  const cfg = kindConfig[kind];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page (Server Component)                                            */
/* ------------------------------------------------------------------ */

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ---- Header ---- */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Changelog
              </h1>
              <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                Track every feature, fix, and improvement shipped to
                UI-as-Code.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* RSS link */}
              <a
                href="/rss.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M4 11a9 9 0 0 1 9 9" />
                  <path d="M4 4a16 16 0 0 1 16 16" />
                  <circle cx="5" cy="19" r="1" />
                </svg>
                RSS Feed
              </a>

              {/* Follow button */}
              <button
                type="button"
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1.5 h-4 w-4"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                Follow Updates
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ---- Filter Tabs ---- */}
      <section className="mx-auto max-w-4xl px-6 pt-8 sm:px-8">
        <nav
          aria-label="Filter changelog"
          className="flex flex-wrap gap-2"
        >
          {[
            { key: "all", label: "All" },
            { key: "new", label: "New Features" },
            { key: "improved", label: "Improvements" },
            { key: "fixed", label: "Fixes" },
            { key: "breaking", label: "Breaking Changes" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              data-filter={tab.key}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                tab.key === "all"
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-400/10 dark:text-indigo-300"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-750"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </section>

      {/* ---- Release Cards ---- */}
      <section className="mx-auto max-w-4xl space-y-8 px-6 pb-20 pt-8 sm:px-8">
        {releases.map((r) => (
          <article
            key={r.version}
            data-version={r.version}
            className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
            {/* Card header */}
            <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {r.version}
              </h2>
              <time
                dateTime={r.date.replace(/\s/g, "-")}
                className="text-sm text-gray-500 dark:text-gray-400"
              >
                &mdash; {r.date}
              </time>
              {r.badge && <Badge>{r.badge}</Badge>}
            </div>

            {/* Change list */}
            <ul className="space-y-3">
              {r.changes.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3"
                >
                  <KindTag kind={c.kind} />
                  <span className="text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
                    {c.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* Stats footer */}
            <footer className="mt-6 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4 dark:border-gray-700/60">
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
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
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                {r.stats.features > 0 ? `${r.stats.features} features` : "No new features"}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {r.stats.fixes > 0 ? `${r.stats.fixes} fixes` : "No fixes"}
              </span>
            </footer>
          </article>
        ))}
      </section>

      {/* ---- Subscribe CTA ---- */}
      <section className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center sm:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Stay in the loop
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Get notified when we ship something new — no spam, ever.
          </p>

          <form
            action="#"
            method="POST"
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row sm:gap-2"
          >
            <label htmlFor="subscribe-email" className="sr-only">
              Email address
            </label>
            <input
              id="subscribe-email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors cursor-pointer"
            >
              Subscribe
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            Or subscribe via{" "}
            <a
              href="/rss.xml"
              className="underline underline-offset-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              RSS feed
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
