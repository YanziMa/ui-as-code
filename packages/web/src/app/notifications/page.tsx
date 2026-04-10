"use client";

import { useState, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type NotificationType =
  | "pr_approved"
  | "comment"
  | "pr_merged"
  | "mention"
  | "system"
  | "digest"
  | "saas_update"
  | "badge"
  | "team_invite"
  | "rate_limit"
  | "security"
  | "achievement";

type Notification = {
  id: number;
  type: NotificationType;
  title: string;
  timestamp: string; // ISO-ish relative label
  unread: boolean;
  action?: string;
};

/* ------------------------------------------------------------------ */
/*  Sample data                                                        */
/* ------------------------------------------------------------------ */

const ALL_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    type: "pr_approved",
    title:
      'Your diff for <strong>HubSpot Navbar</strong> was approved by @sarah',
    timestamp: "2m ago",
    unread: true,
    action: "View PR",
  },
  {
    id: 2,
    type: "comment",
    title:
      '@mike commented on your PR: <em>"Great work on the spacing fix!"</em>',
    timestamp: "15m ago",
    unread: true,
    action: "View Comment",
  },
  {
    id: 3,
    type: "pr_merged",
    title:
      "Your change to <strong>Salesforce Dashboard</strong> was merged",
    timestamp: "1h ago",
    unread: false,
    action: "View Commit",
  },
  {
    id: 4,
    type: "mention",
    title: "You were mentioned in #142 by @alex",
    timestamp: "2h ago",
    unread: true,
    action: "View Thread",
  },
  {
    id: 5,
    type: "system",
    title:
      "Welcome to UI-as-Code! Complete your profile to unlock all features.",
    timestamp: "5h ago",
    unread: false,
    action: "Complete Profile",
  },
  {
    id: 6,
    type: "digest",
    title: "You have <strong>3 pending reviews</strong> this week",
    timestamp: "8h ago",
    unread: true,
    action: "Review Queue",
  },
  {
    id: 7,
    type: "saas_update",
    title:
      "<strong>HubSpot</strong> updated their UI — 2 of your diffs may need rebasing",
    timestamp: "12h ago",
    unread: true,
    action: "Rebase Diffs",
  },
  {
    id: 8,
    type: "badge",
    title: 'You earned the <strong>"Early Adopter"</strong> badge!',
    timestamp: "1d ago",
    unread: false,
    action: "Share Badge",
  },
  {
    id: 9,
    type: "team_invite",
    title:
      "You've been invited to join <strong>Acme Corp</strong>'s team",
    timestamp: "1d ago",
    unread: true,
    action: "Accept Invite",
  },
  {
    id: 10,
    type: "rate_limit",
    title:
      "You've used <strong>80%</strong> of your monthly AI generation quota",
    timestamp: "2d ago",
    unread: false,
    action: "Upgrade Plan",
  },
  {
    id: 11,
    type: "security",
    title:
      "New login from Chrome on Windows (Shanghai)",
    timestamp: "3d ago",
    unread: false,
    action: "Review Activity",
  },
  {
    id: 12,
    type: "achievement",
    title:
      "Your first PR was accepted by a SaaS vendor!",
    timestamp: "4d ago",
    unread: false,
    action: "Celebrate",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const TYPE_ICON_MAP: Record<NotificationType, { bg: string; icon: string }> =
  {
    pr_approved: { bg: "bg-green-100 text-green-700", icon: "\u2713" }, // check
    comment: { bg: "bg-blue-100 text-blue-700", icon: "\u{1F4AC}" },   // speech balloon
    pr_merged: { bg: "bg-purple-100 text-purple-700", icon: "\u{1F517}" }, // link
    mention: { bg: "bg-yellow-100 text-yellow-700", icon: "@" },
    system: { bg: "bg-gray-100 text-gray-600", icon: "\u2699\uFE0F" },     // gear
    digest: { bg: "bg-indigo-100 text-indigo-700", icon: "\u{1F4ED}" }, // mailbox
    saas_update: { bg: "bg-orange-100 text-orange-700", icon: "\u{1F504}" }, // refresh
    badge: { bg: "bg-amber-100 text-amber-700", icon: "\u{1F3C6}" },     // trophy
    team_invite: { bg: "bg-teal-100 text-teal-700", icon: "\u{1F465}" }, // group
    rate_limit: { bg: "bg-red-100 text-red-700", icon: "\u26A0\uFE0F" },  // warning
    security: { bg: "bg-red-100 text-red-600", icon: "\u{1F512}" },       // lock
    achievement: { bg: "bg-pink-100 text-pink-700", icon: "\u{1F389}" }, // party popper
  };

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "mentions", label: "Mentions" },
  { key: "pr_updates", label: "PR Updates" },
  { key: "system", label: "System" },
];

type TabFilter = "all" | "unread" | "mentions" | "pr_updates" | "system";

function matchesTab(n: Notification, tab: TabFilter): boolean {
  switch (tab) {
    case "all":
      return true;
    case "unread":
      return n.unread;
    case "mentions":
      return n.type === "mention";
    case "pr_updates":
      return ["pr_approved", "comment", "pr_merged"].includes(n.type);
    case "system":
      return ["system", "digest", "saas_update", "rate_limit", "security"].includes(
        n.type
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [notifications, setNotifications] = useState(ALL_NOTIFICATIONS);
  const [visibleCount, setVisibleCount] = useState(8);

  const filtered = useMemo(
    () => notifications.filter((n) => matchesTab(n, activeTab)),
    [notifications, activeTab]
  );

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const unreadCount = notifications.filter((n) => n.unread).length;

  /* ---- actions ---- */

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));

  const markRead = (id: number) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );

  const loadMore = () => setVisibleCount((c) => c + 6);

  /* ---- render ---- */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===== HEADER ===== */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-medium text-white">
                {unreadCount}
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 active:bg-gray-200"
            >
              Mark all as read
            </button>
          )}
        </div>
      </header>

      {/* ===== FILTER TABS ===== */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6">
          <ul className="-mb-px flex gap-1 overflow-x-auto py-0">
            {TABS.map(({ key, label }) => (
              <li key={key}>
                <button
                  onClick={() => {
                    setActiveTab(key);
                    setVisibleCount(8);
                  }}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* ===== LIST / EMPTY STATE ===== */}
      <main className="mx-auto max-w-3xl px-6 py-6">
        {filtered.length === 0 ? (
          /* -- empty state -- */
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <span className="mb-3 text-4xl">\u{1F4E4}</span>
            <p className="text-lg font-medium text-gray-900">
              No notifications
            </p>
            <p className="mt-1 text-sm text-gray-500">
              You&apos;re all caught up!
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
              {visible.map((item) => {
                const meta = TYPE_ICON_MAP[item.type];
                return (
                  <li
                    key={item.id}
                    onClick={() => markRead(item.id)}
                    className={`group relative flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors ${
                      item.unread
                        ? "bg-blue-50/60 hover:bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Unread dot */}
                    {item.unread && (
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 block h-2 w-2 rounded-full bg-blue-500 ring-4 ring-blue-50/60" />
                    )}

                    {/* Icon */}
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${meta.bg}`}
                      aria-hidden="true"
                    >
                      {meta.icon}
                    </span>

                    {/* Body */}
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[15px] leading-snug text-gray-800 [&_strong]:font-semibold [&_em]:text-gray-600"
                        dangerouslySetInnerHTML={{ __html: item.title }}
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        {item.timestamp}
                      </p>
                    </div>

                    {/* Action button */}
                    {item.action && (
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 self-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-gray-50 active:bg-gray-100"
                      >
                        {item.action}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Load more */}
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={loadMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 active:bg-gray-100"
                >
                  Load more
                  <svg
                    className="h-4 w-4 text-gray-400"
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
