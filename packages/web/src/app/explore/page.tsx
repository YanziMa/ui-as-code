import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore - UI-as-Code",
  description:
    "Browse SaaS products, trending diffs, and popular contributors on UI-as-Code.",
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const trendingDiffs = [
  {
    id: 1,
    saasName: "HubSpot",
    saasColor: "#ff7a59",
    saasIcon: "H",
    title: "navbar spacing fix",
    author: "@alex",
    votes: 124,
    status: "Accepted" as const,
  },
  {
    id: 2,
    saasName: "Notion",
    saasColor: "#000000",
    saasIcon: "N",
    title: "table resize",
    author: "@sarah",
    votes: 89,
    status: "Pending" as const,
  },
  {
    id: 3,
    saasName: "Stripe",
    saasColor: "#635bff",
    saasIcon: "S",
    title: "checkout redesign",
    author: "@mike",
    votes: 76,
    status: "Reviewing" as const,
  },
  {
    id: 4,
    saasName: "Figma",
    saasColor: "#f24e1e",
    saasIcon: "F",
    title: "toolbar alignment",
    author: "@jane",
    votes: 65,
    status: "Accepted" as const,
  },
  {
    id: 5,
    saasName: "Slack",
    saasColor: "#4a154b",
    saasIcon: "S",
    title: "sidebar width",
    author: "@tom",
    votes: 54,
    status: "Pending" as const,
  },
  {
    id: 6,
    saasName: "Linear",
    saasColor: "#5e6ad2",
    saasIcon: "L",
    title: "issue layout",
    author: "@alex",
    votes: 48,
    status: "Accepted" as const,
  },
];

const topContributors = [
  { handle: "@alex_chen", diffs: 12, color: "#635bff" },
  { handle: "@sarah_dev", diffs: 9, color: "#ff7a59" },
  { handle: "@mike_t", diffs: 7, color: "#10b981" },
];

const categories = [
  {
    name: "CRM",
    examples: ["HubSpot", "Salesforce"],
    count: 423,
    icon: "\u{1F4BC}",
    color: "#3b82f6",
  },
  {
    name: "Productivity",
    examples: ["Notion", "Linear", "Airtable"],
    count: 389,
    icon: "\u{2699}\u{FE0F}",
    color: "#8b5cf6",
  },
  {
    name: "Dev Tools",
    examples: ["GitHub", "Vercel", "Stripe"],
    count: 312,
    icon: "\u{1F4BB}",
    color: "#10b981",
  },
  {
    name: "Communication",
    examples: ["Slack", "Discord", "Intercom"],
    count: 234,
    icon: "\u{1F4AC}",
    color: "#f59e0b",
  },
  {
    name: "Design",
    examples: ["Figma", "Framer"],
    count: 156,
    icon: "\u{1F3A8}",
    color: "#ef4444",
  },
  {
    name: "E-commerce",
    examples: ["Shopify"],
    count: 98,
    icon: "\u{1F6D2}",
    color: "#ec4899",
  },
];

const recentUpdates = [
  {
    id: 1,
    text: 'HubSpot navbar spacing fix was accepted by @admin',
    time: "2 min ago",
  },
  {
    id: 2,
    text: '@sarah opened a new diff on Notion table resize',
    time: "5 min ago",
  },
  {
    id: 3,
    text: 'Stripe checkout redesign moved to Reviewing',
    time: "12 min ago",
  },
  {
    id: 4,
    text: '@jane updated Figma toolbar alignment with new screenshots',
    time: "18 min ago",
  },
  {
    id: 5,
    text: 'Slack sidebar width received 12 new upvotes',
    time: "25 min ago",
  },
  {
    id: 6,
    text: '@alex submitted Linear issue layout v2',
    time: "32 min ago",
  },
  {
    id: 7,
    text: 'New category "Analytics" proposed by @mike_t',
    time: "1 hr ago",
  },
  {
    id: 8,
    text: 'Salesforce login page diff reached 200 votes',
    time: "1 hr ago",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusBadge(status: string) {
  switch (status) {
    case "Accepted":
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          Accepted
        </span>
      );
    case "Pending":
      return (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          Pending
        </span>
      );
    case "Reviewing":
      return (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          Reviewing
        </span>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-components (client interactivity via <form> / native attrs)   */
/* ------------------------------------------------------------------ */

function SearchBar() {
  return (
    <div className="relative">
      {/* Search icon */}
      <svg
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
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
        placeholder="Search products, diffs, contributors..."
        className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
      />
    </div>
  );
}

function CategoryTabs({ activeTab }: { activeTab?: string }) {
  const tabs = ["Trending", "Popular", "Recent", "Categories"];

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/60">
      {tabs.map((tab) => {
        const isActive = activeTab === tab || (activeTab === undefined && tab === "Trending");
        return (
          <button
            key={tab}
            type="button"
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              isActive
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </nav>
  );
}

function TrendingDiffCard({
  saasName,
  saasColor,
  saasIcon,
  title,
  author,
  votes,
  status,
}: (typeof trendingDiffs)[number]) {
  return (
    <article className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 hover:dark:border-gray-600">
      {/* Top row: SaaS badge + status */}
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: saasColor }}
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
            {saasIcon}
          </span>
          {saasName}
        </span>
        {statusBadge(status)}
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold leading-snug text-gray-900 group-hover:text-indigo-600 transition-colors dark:text-gray-100 dark:group-hover:text-indigo-400">
        {title}
      </h3>

      {/* Meta row */}
      <div className="mt-auto flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>by {author}</span>
        <span className="inline-flex items-center gap-1.5">
          {/* Up arrow */}
          <svg
            className="h-4 w-4 text-emerald-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium text-gray-700 dark:text-gray-300">{votes}</span>
        </span>
      </div>
    </article>
  );
}

function ContributorCard({
  handle,
  diffs,
  color,
}: (typeof topContributors)[number]) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 hover:dark:border-gray-600">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {handle.charAt(1).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {handle}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {diffs} diffs this week
        </p>
      </div>
    </div>
  );
}

function CategoryCard({
  name,
  examples,
  count,
  icon,
  color,
}: (typeof categories)[number]) {
  return (
    <article className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 hover:dark:border-gray-600">
      <div className="flex items-start justify-between">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </span>
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {count} diffs
        </span>
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors dark:text-gray-100 dark:group-hover:text-indigo-400">
          {name}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {examples.join(", ")}
        </p>
      </div>
    </article>
  );
}

function RecentUpdateItem({ text, time }: (typeof recentUpdates)[number]) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {text}
        </p>
        <time className="mt-0.5 block text-xs text-gray-400 dark:text-gray-500">
          {time}
        </time>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ExplorePage() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      {/* ---- Header ---- */}
      <header className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Explore
        </h1>
        <SearchBar />
      </header>

      {/* ---- Tabs ---- */}
      <CategoryTabs activeTab="Trending" />

      {/* ---- Trending Section ---- */}
      <section aria-labelledby="trending-heading" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2
            id="trending-heading"
            className="text-xl font-bold text-gray-900 dark:text-white"
          >
            Trending Diffs
          </h2>
          <a
            href="#"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            View all &rarr;
          </a>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Diff cards grid — takes 2 columns on large screens */}
          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-3">
            {trendingDiffs.map((diff) => (
              <TrendingDiffCard key={diff.id} {...diff} />
            ))}
          </div>

          {/* Contributors side panel */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Top Contributors This Week
              </h3>
              <div className="space-y-3">
                {topContributors.map((c) => (
                  <ContributorCard key={c.handle} {...c} />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ---- Categories Section ---- */}
      <section aria-labelledby="categories-heading" className="space-y-6">
        <CategoryTabs activeTab="Categories" />

        <div className="flex items-center justify-between">
          <h2
            id="categories-heading"
            className="text-xl font-bold text-gray-900 dark:text-white"
          >
            Browse by Category
          </h2>
          <a
            href="#"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            View all &rarr;
          </a>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <CategoryCard key={cat.name} {...cat} />
          ))}
        </div>
      </section>

      {/* ---- Recently Updated ---- */}
      <section
        aria-labelledby="recent-heading"
        className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="recent-heading"
            className="text-lg font-bold text-gray-900 dark:text-white"
          >
            Recently Updated
          </h2>
          <a
            href="#"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            See all activity &rarr;
          </a>
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {recentUpdates.map((item) => (
            <RecentUpdateItem key={item.id} {...item} />
          ))}
        </ul>
      </section>
    </main>
  );
}
