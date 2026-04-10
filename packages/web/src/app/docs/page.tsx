import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation | UI-as-Code",
  description:
    "Explore the complete documentation for UI-as-Code. Learn how to install, use, and integrate the browser extension, AI diffs, and dashboard.",
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Article {
  title: string;
}

interface Category {
  icon: string;
  name: string;
  description: string;
  articleCount: number;
  articles: Article[];
}

interface PopularArticle {
  title: string;
  category: string;
  reads: number;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const categories: Category[] = [
  {
    icon: "🚀",
    name: "Getting Started",
    description:
      "New to UI-as-Code? Start here with installation guides and your first AI-powered UI change.",
    articleCount: 8,
    articles: [
      { title: "Quick Start Guide" },
      { title: "Installation" },
      { title: "First Diff" },
      { title: "Understanding the Workflow" },
    ],
  },
  {
    icon: "🧩",
    name: "Browser Extension",
    description:
      "Master the extension that lets you inspect any page and request AI-generated changes in seconds.",
    articleCount: 12,
    articles: [
      { title: "Inspector Mode" },
      { title: "Taking Screenshots" },
      { title: "Managing Extensions" },
      { title: "Keyboard Shortcuts" },
      { title: "Troubleshooting" },
    ],
  },
  {
    icon: "🤖",
    name: "AI & Diffs",
    description:
      "Understand how AI turns natural-language descriptions into precise code diffs you can review and apply.",
    articleCount: 10,
    articles: [
      { title: "How AI Generates Diffs" },
      { title: "Writing Better Prompts" },
      { title: "Reviewing Generated Code" },
      { title: "Common Patterns" },
    ],
  },
  {
    icon: "☁️",
    name: "SaaS Integration",
    description:
      "Connect UI-as-Code to popular SaaS products and manage compatibility across platforms.",
    articleCount: 7,
    articles: [
      { title: "Supported Products" },
      { title: "Adding New Targets" },
      { title: "Compatibility Notes" },
      { title: "API Reference" },
    ],
  },
  {
    icon: "📊",
    name: "Dashboard",
    description:
      "Track submissions, manage pull requests, oversee team activity, and handle billing from one place.",
    articleCount: 6,
    articles: [
      { title: "Your Submissions" },
      { title: "PR Workflow" },
      { title: "Team Management" },
      { title: "Billing" },
    ],
  },
  {
    icon: "📡",
    name: "API Reference",
    description:
      "Complete API docs covering authentication, endpoints, webhooks, rate limits, and error handling.",
    articleCount: 9,
    articles: [
      { title: "Authentication" },
      { title: "Endpoints Overview" },
      { title: "Webhooks" },
      { title: "Rate Limits" },
      { title: "Error Codes" },
    ],
  },
  {
    icon: "⚙️",
    name: "Advanced",
    description:
      "Self-hosting, custom model configurations, enterprise deployments, and security best practices.",
    articleCount: 5,
    articles: [
      { title: "Self-hosting" },
      { title: "Custom Models" },
      { title: "Enterprise Setup" },
      { title: "Security" },
    ],
  },
];

const popularArticles: PopularArticle[] = [
  { title: "Quick Start Guide", category: "Getting Started", reads: 12400 },
  { title: "How AI Generates Diffs", category: "AI & Diffs", reads: 9820 },
  { title: "Inspector Mode", category: "Browser Extension", reads: 7650 },
  { title: "Writing Better Prompts", category: "AI & Diffs", reads: 6340 },
  { title: "Authentication", category: "API Reference", reads: 5100 },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatReads(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* -------- Header -------- */}
      <section className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Documentation
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            Everything you need to build, ship, and iterate on UI changes with
            AI-powered diffs.
          </p>

          {/* Search + CTA */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-xl">
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="search"
                placeholder="Search documentation..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2.5 pl-11 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
              />
            </div>
            <a
              href="/docs/quick-start"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              Quick Start
              <svg
                className="ml-1.5 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-12">
        {/* -------- Quick Start Card (highlighted) -------- */}
        <section>
          <div className="relative overflow-hidden rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 p-8 sm:p-10">
            {/* subtle decorative blob */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-100/60 dark:bg-blue-900/20 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚡</span>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Get started in 3 steps
                </h2>
              </div>

              <ol className="mt-6 grid gap-6 sm:grid-cols-3">
                {[
                  {
                    step: 1,
                    emoji: "📦",
                    title: "Install Extension",
                    desc: "Add the UI-as-Code browser extension from the Chrome or Firefox store.",
                  },
                  {
                    step: 2,
                    emoji: "🖱️",
                    title: "Alt+Click any element",
                    desc: "Navigate to any page and Alt+Click (or Option+Click) the element you want to change.",
                  },
                  {
                    step: 3,
                    emoji: "✍️",
                    title: "Describe your change",
                    desc: "Type what you want in plain English. AI generates a ready-to-review diff.",
                  },
                ].map((item) => (
                  <li key={item.step} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white dark:bg-gray-700 text-base shadow-sm border border-gray-200 dark:border-gray-600">
                      {item.emoji}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        Step {item.step}: {item.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                        {item.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-8">
                <a
                  href="/docs/getting-started/quick-start-guide"
                  className="inline-flex items-center text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  Read full guide
                  <svg
                    className="ml-1 h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* -------- Documentation Categories Grid -------- */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Browse by category
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Find the topic you need or explore something new.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
            {categories.map((cat) => (
              <article
                key={cat.name}
                className="group flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 transition-shadow hover:shadow-md"
              >
                {/* card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {cat.articleCount}{" "}
                        {cat.articleCount === 1 ? "article" : "articles"}
                      </p>
                    </div>
                  </div>
                  <svg
                    className="h-5 w-5 shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors"
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
                </div>

                <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {cat.description}
                </p>

                {/* article list */}
                <ul className="mt-4 space-y-2 border-t border-gray-100 dark:border-gray-700/60 pt-4">
                  {cat.articles.map((art) => (
                    <li key={art.title}>
                      <a
                        href={`/docs/${cat.name.toLowerCase().replace(/\s+/g, "-")}/${art.title.toLowerCase().replace(/\s+/g, "-")}`}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <svg
                          className="h-3.5 w-3.5 shrink-0 text-gray-400"
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
                        {art.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* -------- Popular Articles -------- */}
        <section>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Popular Articles
              </h2>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                The most-read guides this month.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {popularArticles.map((art) => (
              <a
                key={art.title}
                href={`/docs/${art.category.toLowerCase().replace(/\s+/g, "-")}/${art.title.toLowerCase().replace(/\s+/g, "-")}`}
                className="group flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {art.title}
                  </h3>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {art.category}
                </p>
                <div className="mt-auto pt-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                    <svg
                      className="mr-1 h-3.5 w-3.5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    {formatReads(art.reads)} reads
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* -------- Footer: Still need help? -------- */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 sm:p-10 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Still need help?
          </h2>
          <p className="mt-2 mx-auto max-w-lg text-sm text-gray-600 dark:text-gray-400">
            Can&apos;t find what you&apos;re looking for? Reach out through one of
            these channels and we&apos;ll get you sorted.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/help"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
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
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Help Center
            </a>

            <a
              href="https://discord.gg/uiascode"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <svg
                className="h-4 w-4 text-indigo-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Discord Community
            </a>

            <a
              href="mailto:support@uiascode.dev"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Contact Support
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
