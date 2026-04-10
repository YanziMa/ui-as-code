import Link from "next/link";

type Category = "Release" | "Blog" | "Security" | "Community";

interface FeedItem {
  id: number;
  category: Category;
  date: string;
  title: string;
  summary: string;
}

const CATEGORY_CONFIG: Record<
  Category,
  { bg: string; text: string; dot: string }
> = {
  Release: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  Blog: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
  },
  Security: {
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
  Community: {
    bg: "bg-green-50 dark:bg-green-950/40",
    text: "text-green-700 dark:text-green-300",
    dot: "bg-green-500",
  },
};

const feedItems: FeedItem[] = [
  {
    id: 1,
    category: "Release",
    date: "2026-04-08",
    title: "v1.3.0 Released — Teams & Collaboration is Here",
    summary:
      "The biggest update yet brings real-time collaboration, team workspaces, and shared component libraries. Invite teammates, review changes together, and ship UI faster than ever.",
  },
  {
    id: 2,
    category: "Blog",
    date: "2026-04-05",
    title: "How We Built Teams & Collaboration from Scratch",
    summary:
      "A deep dive into the architecture behind our new collaboration features. Learn how we handled conflict resolution, real-time sync, and permission modeling at scale.",
  },
  {
    id: 3,
    category: "Security",
    date: "2026-04-03",
    title: "Security Advisory: Enhanced Rate Limiting & Abuse Prevention",
    summary:
      "We have strengthened our rate limiting infrastructure across all API endpoints. This update addresses potential abuse vectors and improves overall system resilience under high load.",
  },
  {
    id: 4,
    category: "Community",
    date: "2026-04-01",
    title: "Contributor Spotlight: @sarah-dev",
    summary:
      "This month we are shining a light on Sarah, who has contributed over 47 pull requests spanning the sandbox engine, CLI tooling, and documentation improvements. Thank you, Sarah!",
  },
  {
    id: 5,
    category: "Release",
    date: "2026-03-28",
    title: "New Integration: Slack Webhook Support",
    summary:
      "Get instant notifications in Slack when builds complete, reviews are requested, or deployments go live. Configure webhooks in your project settings in just a few clicks.",
  },
  {
    id: 6,
    category: "Release",
    date: "2026-03-25",
    title: "Performance: 40% Faster Diff Generation",
    summary:
      "Our diff engine has been completely rewritten using a new incremental algorithm. Large component trees now render comparisons almost instantly, even with hundreds of changed nodes.",
  },
  {
    id: 7,
    category: "Release",
    date: "2026-03-22",
    title: "Bug Fix: Safari Extension Compatibility Restored",
    summary:
      "Resolved an issue where the browser extension would fail to initialize on Safari 17+ due to changes in the manifest v3 service worker lifecycle. All Safari users should update to the latest version.",
  },
  {
    id: 8,
    category: "Release",
    date: "2026-03-19",
    title: "v1.2.1 Patch Notes — Stability & Accessibility Fixes",
    summary:
      "This patch release includes fixes for keyboard navigation in the editor, corrected contrast ratios in dark mode, and resolves a memory leak when switching between large projects.",
  },
  {
    id: 9,
    category: "Blog",
    date: "2026-03-15",
    title: "How We Built the Sandboxed Live Preview Engine",
    summary:
      "Running untrusted user code safely inside a preview iframe is no small feat. Read about the iframe isolation strategy, Content Security Policy hardening, and postMessage bridge we use to keep previews both fast and secure.",
  },
  {
    id: 10,
    category: "Community",
    date: "2026-03-12",
    title: "Discord Community Hits 1,000 Members!",
    summary:
      "Our Discord server has officially crossed the 1,000-member milestone. Join the conversation, get help from fellow developers, and share what you are building with UI-as-Code.",
  },
  {
    id: 11,
    category: "Release",
    date: "2026-03-08",
    title: "Dark Mode Improvements Across the Board",
    summary:
      "We have refined every color token in our dark theme for better readability and consistency. The editor canvas, sidebar panels, and settings pages all received a visual pass this sprint.",
  },
  {
    id: 12,
    category: "Release",
    date: "2026-03-05",
    title: "v1.3.1 Hotfix — Critical Build Pipeline Regression",
    summary:
      "A regression introduced in v1.3.0 caused certain monorepo configurations to fail during the build step. This hotfix restores the correct behavior immediately. Upgrade recommended for all v1.3.0 users.",
  },
];

const FILTER_TABS: (Category | "All")[] = [
  "All",
  "Release",
  "Blog",
  "Security",
  "Community",
];

function relativeTime(dateStr: string): string {
  const now = new Date("2026-04-10");
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  const months = Math.floor(diffDays / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

function Badge({ category }: { category: Category }) {
  const config = CATEGORY_CONFIG[category];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {category}
    </span>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  return (
    <article className="group rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Badge category={item.category} />
        <time className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
          {relativeTime(item.date)}
        </time>
      </div>
      <h2 className="mb-2 text-lg font-semibold leading-snug text-gray-900 dark:text-gray-100">
        {item.title}
      </h2>
      <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-400">
        {item.summary}
      </p>
      <Link
        href="#"
        className="inline-flex items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Read more
        <svg
          className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Link>
    </article>
  );
}

export default function FeedPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-4xl">
            Latest Updates
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Stay up to date with UI-as-Code news and releases
          </p>
        </div>
      </header>

      {/* Filter tabs */}
      <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ul className="-mb-px flex gap-6 overflow-x-auto py-4 text-sm font-medium">
            {FILTER_TABS.map((tab) => (
              <li key={tab}>
                <button
                  className={`whitespace-nowrap pb-3 transition-colors ${
                    tab === "All"
                      ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                      : "border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
                  }`}
                >
                  {tab}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Feed column */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {feedItems.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Subscribe RSS */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
                Subscribe via RSS
              </h3>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Get the latest updates delivered straight to your feed reader.
              </p>
              <Link
                href="/api/feed"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
                </svg>
                RSS Feed
              </Link>
            </div>

            {/* Email subscribe */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
                Subscribe by Email
              </h3>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                A weekly digest of releases, blog posts, and community highlights.
              </p>
              <form className="space-y-3">
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                >
                  Subscribe
                </button>
              </form>
            </div>

            {/* Quick links */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
                Quick Links
              </h3>
              <ul className="space-y-2">
                {[
                  {
                    href: "/changelog",
                    label: "Changelog",
                    desc: "Full version history",
                  },
                  {
                    href: "/status",
                    label: "System Status",
                    desc: "Uptime & incidents",
                  },
                  {
                    href: "/roadmap",
                    label: "Roadmap",
                    desc: "What we are building next",
                  },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-start gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {link.href === "/changelog" && (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        )}
                        {link.href === "/status" && (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                        {link.href === "/roadmap" && (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                            />
                          </svg>
                        )}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {link.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {link.desc}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
