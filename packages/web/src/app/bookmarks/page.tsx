import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bookmarks | UI-as-Code",
  description: "Your saved and bookmarked items",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BookmarkStatus = "accepted" | "pending" | "rejected" | "draft";
type SortOption = "newest" | "oldest" | "saas-name";
type FilterTab = "all" | "accepted" | "pending" | "rejected" | "drafts";

interface BookmarkItem {
  id: string;
  saasName: string;
  saasColor: string;
  title: string;
  status: BookmarkStatus;
  dateLabel: string;
}

// ---------------------------------------------------------------------------
// Static data (12 items)
// ---------------------------------------------------------------------------

const ALL_BOOKMARKS: BookmarkItem[] = [
  {
    id: "1",
    saasName: "HubSpot",
    saasColor: "#FF7A59",
    title: "Navbar spacing fix",
    status: "accepted",
    dateLabel: "2 days ago",
  },
  {
    id: "2",
    saasName: "Salesforce",
    saasColor: "#00A1E0",
    title: "Dashboard card redesign",
    status: "pending",
    dateLabel: "5 hours ago",
  },
  {
    id: "3",
    saasName: "Notion",
    saasColor: "#000000",
    title: "Table column resize",
    status: "accepted",
    dateLabel: "1 week ago",
  },
  {
    id: "4",
    saasName: "Stripe",
    saasColor: "#635BFF",
    title: "Checkout button color",
    status: "rejected",
    dateLabel: "3 days ago",
  },
  {
    id: "5",
    saasName: "Figma",
    saasColor: "#F24E1E",
    title: "Toolbar icon alignment",
    status: "accepted",
    dateLabel: "4 days ago",
  },
  {
    id: "6",
    saasName: "Slack",
    saasColor: "#4A154B",
    title: "Sidebar width adjustment",
    status: "pending",
    dateLabel: "1 day ago",
  },
  {
    id: "7",
    saasName: "Linear",
    saasColor: "#5E6AD2",
    title: "Issue detail layout",
    status: "accepted",
    dateLabel: "2 weeks ago",
  },
  {
    id: "8",
    saasName: "Vercel",
    saasColor: "#000000",
    title: "Deployment status colors",
    status: "draft",
    dateLabel: "6 hours ago",
  },
  {
    id: "9",
    saasName: "Discord",
    saasColor: "#5865F2",
    title: "Message bubble padding",
    status: "accepted",
    dateLabel: "5 days ago",
  },
  {
    id: "10",
    saasName: "GitHub",
    saasColor: "#181717",
    title: "PR file list icons",
    status: "pending",
    dateLabel: "3 hours ago",
  },
  {
    id: "11",
    saasName: "Intercom",
    saasColor: "#1F8DED",
    title: "Chat widget position",
    status: "accepted",
    dateLabel: "1 week ago",
  },
  {
    id: "12",
    saasName: "Airtable",
    saasColor: "#18BFFF",
    title: "Grid view header",
    status: "rejected",
    dateLabel: "4 days ago",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  BookmarkStatus,
  { label: string; classes: string }
> = {
  accepted: {
    label: "Accepted",
    classes:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  pending: {
    label: "Pending Review",
    classes:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  rejected: {
    label: "Rejected",
    classes:
      "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  draft: {
    label: "Draft",
    classes:
      "bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  },
};

function getInitial(saasName: string): string {
  return saasName.charAt(0);
}

// ---------------------------------------------------------------------------
// Client sub-components (must be in the same file for a single-file page)
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useTransition } from "react";

function BookmarksClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [visibleCount, setVisibleCount] = useState(12);

  // Filter logic
  const filtered = ALL_BOOKMARKS.filter((item) => {
    // Search filter
    if (
      searchQuery.trim() !== "" &&
      !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.saasName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    // Tab filter
    if (activeFilter !== "all") {
      if (
        activeFilter === "accepted" && item.status !== "accepted"
      )
        return false;
      if (
        activeFilter === "pending" && item.status !== "pending"
      )
        return false;
      if (
        activeFilter === "rejected" && item.status !== "rejected"
      )
        return false;
      if (
        activeFilter === "drafts" && item.status !== "draft"
      )
        return false;
    }
    return true;
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortOption === "saas-name") {
      return a.saasName.localeCompare(b.saasName);
    }
    if (sortOption === "oldest") {
      return a.id.localeCompare(b.id); // id order approximates oldest-first for this demo
    }
    // newest (default)
    return b.id.localeCompare(a.id);
  });

  const visibleItems = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: ALL_BOOKMARKS.length },
    { key: "accepted", label: "PRs Accepted", count: ALL_BOOKMARKS.filter((i) => i.status === "accepted").length },
    { key: "pending", label: "Pending", count: ALL_BOOKMARKS.filter((i) => i.status === "pending").length },
    { key: "rejected", label: "Rejected", count: ALL_BOOKMARKS.filter((i) => i.status === "rejected").length },
    { key: "drafts", label: "Drafts", count: ALL_BOOKMARKS.filter((i) => i.status === "draft").length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ---- Header ---- */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Title + badge */}
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Bookmarks
              </h1>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {ALL_BOOKMARKS.length} items
              </span>
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
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
                  type="text"
                  placeholder="Search bookmarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>

              {/* Sort dropdown */}
              <select
                value={sortOption}
                onChange={(e) =>
                  setSortOption(e.target.value as SortOption)
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="saas-name">SaaS Name</option>
              </select>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="mt-6 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  activeFilter === tab.key
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {tab.label}
                <span
                  className={`ml-0.5 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                    activeFilter === tab.key
                      ? "bg-white/20 text-inherit"
                      : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Content ---- */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {visibleItems.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 py-20">
            <svg
              className="mb-4 h-16 w-16 text-gray-300 dark:text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
              No bookmarks found
            </p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <>
            {/* Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleItems.map((item) => {
                const cfg = STATUS_CONFIG[item.status];
                return (
                  <article
                    key={item.id}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                  >
                    {/* Top row: SaaS icon + status */}
                    <div className="mb-3 flex items-start justify-between">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                        style={{ backgroundColor: item.saasColor }}
                      >
                        {getInitial(item.saasName)}
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.classes}`}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    {/* SaaS name */}
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {item.saasName}
                    </p>

                    {/* Title */}
                    <h3 className="mb-2 text-base font-semibold leading-snug text-gray-900 dark:text-white">
                      {item.title}
                    </h3>

                    {/* Date */}
                    <p className="mt-auto mb-4 text-xs text-gray-400 dark:text-gray-500">
                      Bookmarked {item.dateLabel}
                    </p>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-700/60">
                      <button className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-700">
                        <svg
                          className="h-3.5 w-3.5"
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
                        View
                      </button>
                      <button className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                      <button className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 transition hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Load more / Pagination */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() =>
                    setVisibleCount((prev) => prev + 6)
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Load more
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
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* eslint-enable @typescript-eslint/no-unused-vars */

// ---------------------------------------------------------------------------
// Page (Server Component shell)
// ---------------------------------------------------------------------------

export default function BookmarksPage() {
  return <BookmarksClient />;
}
