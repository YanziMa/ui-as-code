import type { Metadata } from "next";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type Status = "Fully Supported" | "Beta" | "Coming Soon";

interface Product {
  name: string;
  category: string;
  status: Status;
  description: string;
  users: string;
}

const products: Product[] = [
  {
    name: "HubSpot",
    category: "CRM",
    status: "Fully Supported",
    description: "Forms, dashboards, email editor",
    users: "12.4k",
  },
  {
    name: "Salesforce",
    category: "CRM",
    status: "Fully Supported",
    description: "Lightning components, record pages",
    users: "9.8k",
  },
  {
    name: "Notion",
    category: "Project Management",
    status: "Fully Supported",
    description: "Pages, databases, sidebar",
    users: "18.2k",
  },
  {
    name: "Linear",
    category: "Project Management",
    status: "Fully Supported",
    description: "Issue views, navigation",
    users: "7.3k",
  },
  {
    name: "Jira",
    category: "Project Management",
    status: "Beta",
    description: "Board cards, issue detail views",
    users: "5.1k",
  },
  {
    name: "Figma",
    category: "Design",
    status: "Fully Supported",
    description: "Toolbar, property panels",
    users: "14.6k",
  },
  {
    name: "Stripe",
    category: "Analytics",
    status: "Fully Supported",
    description: "Dashboard, charts, tables",
    users: "11.0k",
  },
  {
    name: "Vercel",
    category: "Dev Tools",
    status: "Fully Supported",
    description: "Dashboard, project settings",
    users: "8.9k",
  },
  {
    name: "GitHub",
    category: "Dev Tools",
    status: "Fully Supported",
    description: "PR views, issue pages",
    users: "21.3k",
  },
  {
    name: "Slack",
    category: "Communication",
    status: "Beta",
    description: "Message composer, sidebar",
    users: "6.7k",
  },
  {
    name: "Discord",
    category: "Communication",
    status: "Coming Soon",
    description: "Channel UI, settings",
    users: "--",
  },
  {
    name: "Shopify",
    category: "E-commerce",
    status: "Beta",
    description: "Product editor, theme customizer",
    users: "4.2k",
  },
  {
    name: "Airtable",
    category: "Project Management",
    status: "Fully Supported",
    description: "Grid views, forms",
    users: "10.1k",
  },
  {
    name: "Asana",
    category: "Project Management",
    status: "Coming Soon",
    description: "Task lists, board view",
    users: "--",
  },
  {
    name: "Datadog",
    category: "Analytics",
    status: "Beta",
    description: "Dashboards, alert views",
    users: "3.8k",
  },
];

const categories = [
  "All",
  "CRM",
  "Project Management",
  "Design",
  "Dev Tools",
  "Analytics",
  "Communication",
  "E-commerce",
] as const;

type Category = (typeof categories)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<
  Status,
  { bg: string; text: string; dot: string }
> = {
  "Fully Supported": {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  Beta: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  "Coming Soon": {
    bg: "bg-gray-100 dark:bg-gray-800/60",
    text: "text-gray-500 dark:text-gray-400",
    dot: "bg-gray-400",
  },
};

/** Deterministic pastel-ish colour per product name */
function logoColor(name: string): string {
  const palette = [
    "bg-violet-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-teal-500",
    "bg-yellow-500",
    "bg-fuchsia-500",
    "bg-sky-500",
    "bg-lime-500",
    "bg-rose-500",
    "bg-amber-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 pb-16 pt-20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 sm:px-10 sm:pb-24 sm:pt-28">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-200/50 to-blue-200/50 blur-3xl dark:from-violet-900/20 dark:to-blue-900/20" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-emerald-100/40 blur-3xl dark:bg-emerald-900/20" />

      <div className="relative mx-auto max-w-4xl text-center">
        <span className="mb-4 inline-block rounded-full border border-slate-200 bg-white/70 px-4 py-1.5 text-sm font-medium tracking-wide text-slate-600 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
          Catalog
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
          Supported Applications
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-500 sm:text-xl dark:text-slate-400">
          UI-as-Code works with these popular SaaS products
        </p>
      </div>
    </section>
  );
}

function FilterBar({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const active = params.cat ?? "All";

  return (
    <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg dark:border-slate-700/80 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:gap-6 sm:py-4">
        {/* Search */}
        <form
          action="/catalog"
          className="relative flex-1"
        >
          <input
            type="hidden"
            name="cat"
            value={active}
          />
          <svg
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            defaultValue={query}
            name="q"
            placeholder="Search products..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-900/30"
          />
        </form>

        {/* Category tabs */}
        <nav
          aria-label="Category filter"
          className="-mb-px flex shrink-0 gap-1 overflow-x-auto scrollbar-hide"
        >
          {categories.map((cat) => {
            const isActive = active === cat;
            return (
              <a
                key={cat}
                href={`/catalog?${new URLSearchParams({
                  ...(query ? { q: query } : {}),
                  ...(cat !== "All" ? { cat } : {}),
                }).toString()}`}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition-colors sm:px-3.5 sm:text-sm ${
                  isActive
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-200 dark:bg-violet-500 dark:shadow-violet-900/30"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {cat}
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const style = STATUS_STYLES[product.status];
  const color = logoColor(product.name);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-700/60 dark:bg-slate-850 dark:hover:border-slate-600 dark:hover:shadow-black/20">
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          {/* Logo */}
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} text-base font-bold text-white shadow-sm`}
            aria-hidden="true"
          >
            {product.name.charAt(0)}
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {product.name}
            </h3>
            <span className="mt-0.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {product.category}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style.bg} ${style.text}`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`}
          />
          {product.status}
        </span>
      </div>

      {/* Description */}
      <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {product.description}
      </p>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-5">
        <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
          {product.users === "--" ? "No data yet" : `${product.users} active users`}
        </span>

        <a
          href={`/catalog/${product.name.toLowerCase()}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
        >
          Learn More
          <svg
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </svg>
        </a>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Supported SaaS Products | UI-as-Code Catalog",
  description:
    "Browse the catalog of SaaS products supported by UI-as-Code. Modify UIs of HubSpot, Salesforce, Notion, Figma, and more.",
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").toLowerCase().trim();
  const category: Category =
    categories.includes(params.cat as Category)
      ? (params.cat as Category)
      : "All";

  const filtered = products.filter((p) => {
    const matchesQuery =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query);
    const matchesCat = category === "All" || p.category === category;
    return matchesQuery && matchesCat;
  });

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Hero />
      <FilterBar searchParams={searchParams} />

      <section className="mx-auto max-w-6xl px-6 py-12 sm:px-8 sm:py-16">
        {filtered.length > 0 ? (
          <>
            <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
              Showing{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {filtered.length}
              </span>{" "}
              {filtered.length === 1 ? "product" : "products"}
              {category !== "All" && (
                <>
                  {" "}
                  in{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {category}
                  </span>
                </>
              )}
              {query && (
                <>
                  {" "}
                  matching &ldquo;
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {params.q}
                  </span>
                  &rdquo;
                </>
              )}
            </p>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard key={product.name} product={product} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <svg
                className="h-8 w-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              No results found
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Try adjusting your search or filter to find what you&apos;re looking
              for.
            </p>
            <a
              href="/catalog"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600"
            >
              Clear filters
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
