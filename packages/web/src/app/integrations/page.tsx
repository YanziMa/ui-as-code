import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "Connect your favorite tools to UI-as-Code. Browse the marketplace and enable integrations for CI/CD, monitoring, communication, project management, and AI/ML.",
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Category = "CI/CD" | "Monitoring" | "Communication" | "Project Management" | "AI/ML";

interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: Category;
  connected: boolean;
}

const CATEGORY_STYLES: Record<
  Category,
  { bg: string; text: string }
> = {
  "CI/CD": { bg: "bg-blue-50", text: "text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  Monitoring: { bg: "bg-orange-50", text: "text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  Communication: { bg: "bg-purple-50", text: "text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  "Project Management": {
    bg: "bg-green-50",
    text: "text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  "AI/ML": { bg: "bg-pink-50", text: "text-pink-700 dark:bg-pink-950 dark:text-pink-300" },
};

const ICON_BG_COLORS: Record<string, string> = {
  GitHub: "bg-gray-900",
  Slack: "bg-[#4A154B]",
  Jira: "bg-[#0052CC]",
  Datadog: "bg-[#632CA6]",
  Linear: "bg-[#5E6AD2]",
  Discord: "bg-[#5865F2]",
  Vercel: "bg-black",
  Sentry: "bg-[#362D59]",
  Notion: "bg-white border border-zinc-200",
  Zapier: "bg-[#FF4A00]",
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const INTEGRATIONS: Integration[] = [
  {
    id: "github",
    name: "GitHub",
    icon: "\u{1F4BB}",
    description: "Connect PRs to repos",
    category: "CI/CD",
    connected: true,
  },
  {
    id: "slack",
    name: "Slack",
    icon: "\u{1F4E7}",
    description: "Get notifications in channels",
    category: "Communication",
    connected: true,
  },
  {
    id: "jira",
    name: "Jira",
    icon: "\u{1F4CB}",
    description: "Link frictions to tickets",
    category: "Project Management",
    connected: false,
  },
  {
    id: "datadog",
    name: "Datadog",
    icon: "\u{1F4C8}",
    description: "Track performance impact",
    category: "Monitoring",
    connected: false,
  },
  {
    id: "linear",
    name: "Linear",
    icon: "\u{1F517}",
    description: "Sync PRs to issues",
    category: "Project Management",
    connected: false,
  },
  {
    id: "discord",
    name: "Discord",
    icon: "\u{1F4AC}",
    description: "Community updates",
    category: "Communication",
    connected: false,
  },
  {
    id: "vercel",
    name: "Vercel",
    icon: "\u25B6",
    description: "Auto-deploy accepted changes",
    category: "CI/CD",
    connected: false,
  },
  {
    id: "sentry",
    name: "Sentry",
    icon: "\u{1F6A8}",
    description: "Error tracking for diffs",
    category: "Monitoring",
    connected: false,
  },
  {
    id: "notion",
    name: "Notion",
    icon: "\u{1F4D3}",
    description: "Documentation sync",
    category: "Project Management",
    connected: false,
  },
  {
    id: "zapier",
    name: "Zapier",
    icon: "\u26A1",
    description: "Automate workflows",
    category: "AI/ML",
    connected: false,
  },
];

const CATEGORIES: Category[] = [
  "CI/CD",
  "Monitoring",
  "Communication",
  "Project Management",
  "AI/ML",
];

/* ------------------------------------------------------------------ */
/*  Page (Server Component)                                            */
/* ------------------------------------------------------------------ */

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-6 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Integrations
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Connect your favorite tools and automate your workflow.
            </p>
          </div>
          <a
            href="/"
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            Back to Home
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Search & Filter Bar */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full max-w-md">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="search"
              placeholder="Search integrations..."
              className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-100`}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {/* Stats Summary */}
        <div className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
          <span>
            <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
              {INTEGRATIONS.length}
            </strong>{" "}
            integrations available
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">
            <strong className="font-semibold text-green-600 dark:text-green-400">
              {INTEGRATIONS.filter((i) => i.connected).length}
            </strong>{" "}
            connected
          </span>
        </div>

        {/* Integration Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Integration Card                                                   */
/* ------------------------------------------------------------------ */

function IntegrationCard({ integration }: { integration: Integration }) {
  const catStyle = CATEGORY_STYLES[integration.category];
  const iconBg = ICON_BG_COLORS[integration.name] ?? "bg-zinc-100";

  return (
    <article className="group relative flex flex-col rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-200/40 dark:border-zinc-800 dark:bg-black dark:hover:border-zinc-700 dark:hover:shadow-zinc-900/30">
      {/* Card Header: Icon + Name + Connected Badge */}
      <div className="flex items-start gap-4">
        {/* Icon Circle */}
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg} text-lg`}
          aria-hidden="true"
        >
          {integration.icon}
        </div>

        {/* Name + Badge */}
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {integration.name}
            </h2>
            {integration.connected && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-600 dark:bg-green-950 dark:text-green-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                </span>
                Connected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {integration.description}
      </p>

      {/* Category Tag */}
      <div className="mt-4">
        <span
          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${catStyle.bg} ${catStyle.text}`}
        >
          {integration.category}
        </span>
      </div>

      {/* Action Button */}
      <div className="mt-auto pt-5">
        <form action="#" method="post">
          <input type="hidden" name="integration" value={integration.id} />
          <button
            type="submit"
            className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              integration.connected
                ? "border border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-black dark:text-red-400 dark:hover:bg-red-950/30"
                : "border border-blue-200 bg-blue-600 text-white hover:bg-blue-700 dark:border-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700"
            }`}
          >
            {integration.connected ? "Disconnect" : "Connect"}
          </button>
        </form>
      </div>
    </article>
  );
}
