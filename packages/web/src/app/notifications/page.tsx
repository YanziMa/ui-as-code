"use client";

import { useState, useMemo, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "announcement";

type NotificationCategory = "mention" | "pr" | "system" | "update" | "security";

interface Notification {
  id: number;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: Date;
  unread: boolean;
  actionLabel?: string;
  actionHref?: string;
  source?: string; // who/what triggered it
}

type FilterTab = "all" | "unread" | "mentions" | "system" | "updates";

interface Preference {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

/* ------------------------------------------------------------------ */
/*  Sample data (24 realistic notifications)                            */
/* ------------------------------------------------------------------ */

const now = new Date("2026-04-10T09:30:00Z");

const SAMPLE_NOTIFICATIONS: Notification[] = [
  // --- Info / Mentions ---
  {
    id: 1,
    type: "info",
    category: "mention",
    title: "You were mentioned in a discussion",
    message:
      '@sarah-chen mentioned you in PR #187: "Can you review the accessibility changes on the nav component?"',
    timestamp: new Date(now.getTime() - 2 * 60 * 1000),
    unread: true,
    actionLabel: "View Thread",
    actionHref: "#",
    source: "Sarah Chen",
  },
  {
    id: 2,
    type: "info",
    category: "mention",
    title: "New comment on your diff",
    message:
      '@mike-rodriguez left feedback: "The spacing looks great, but consider adding a focus ring for keyboard navigation."',
    timestamp: new Date(now.getTime() - 12 * 60 * 1000),
    unread: true,
    actionLabel: "Reply",
    actionHref: "#",
    source: "Mike Rodriguez",
  },
  {
    id: 3,
    type: "info",
    category: "mention",
    title: "You were tagged in #design-tokens",
    message:
      "@alex-kim tagged you in the design tokens channel asking about the new color system rollout.",
    timestamp: new Date(now.getTime() - 45 * 60 * 1000),
    unread: false,
    actionLabel: "Open Channel",
    actionHref: "#",
    source: "Alex Kim",
  },

  // --- Success / PR ---
  {
    id: 4,
    type: "success",
    category: "pr",
    title: "PR merged successfully",
    message:
      'Your PR <strong>#184 — Fix pagination edge case</strong> was merged into main by Grace Park.',
    timestamp: new Date(now.getTime() - 18 * 60 * 1000),
    unread: true,
    actionLabel: "View Commit",
    actionHref: "#",
    source: "Grace Park",
  },
  {
    id: 5,
    type: "success",
    category: "pr",
    title: "Your diff was approved",
    message:
      'Your diff for <strong>HubSpot Navbar v2.4</strong> received approval from 2 reviewers. Ready to ship!',
    timestamp: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
    unread: true,
    actionLabel: "Ship Diff",
    actionHref: "#",
    source: "Review Team",
  },
  {
    id: 6,
    type: "success",
    category: "pr",
    title: "Build passed for PR #179",
    message:
      "All 142 tests passed, lint clean, bundle size reduced by 3.2 KB. Deployment ready.",
    timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    unread: false,
    actionLabel: "View Build",
    actionHref: "#",
    source: "CI/CD Pipeline",
  },
  {
    id: 7,
    type: "success",
    category: "update",
    title: "Integration connected successfully",
    message:
      'Your <strong>Slack workspace</strong> is now connected. Notifications will be sent to #ui-updates.',
    timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000),
    unread: false,
    actionLabel: "Configure",
    actionHref: "#",
    source: "System",
  },

  // --- Warning ---
  {
    id: 8,
    type: "warning",
    category: "system",
    title: "Approaching rate limit",
    message:
      "You have used 80% of your monthly AI generation quota (800 / 1,000). Consider upgrading.",
    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    unread: true,
    actionLabel: "Upgrade Plan",
    actionHref: "#",
    source: "Billing System",
  },
  {
    id: 9,
    type: "warning",
    category: "update",
    title: "SaaS source updated",
    message:
      "<strong>Stripe Dashboard</strong> published an update. 2 of your tracked diffs may need rebasing.",
    timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    unread: true,
    actionLabel: "Rebase Diffs",
    actionHref: "#",
    source: "Source Tracker",
  },
  {
    id: 10,
    type: "warning",
    category: "system",
    title: "Webhook delivery delayed",
    message:
      "Webhook endpoint https://api.example.com/deploy responded slowly (avg 4.2s) over the last hour.",
    timestamp: new Date(now.getTime() - 10 * 60 * 60 * 1000),
    unread: false,
    actionLabel: "View Logs",
    actionHref: "#",
    source: "Webhook Service",
  },

  // --- Error ---
  {
    id: 11,
    type: "error",
    category: "security",
    title: "Failed login attempt detected",
    message:
      "Someone tried to sign in with your email from an unrecognized device in Berlin, Germany.",
    timestamp: new Date(now.getTime() - 30 * 60 * 1000),
    unread: true,
    actionLabel: "Review Activity",
    actionHref: "#",
    source: "Security Monitor",
  },
  {
    id: 12,
    type: "error",
    category: "pr",
    title: "PR #173 changes requested",
    message:
      'Your PR for <strong>Dark mode toggle refactor</strong> received change requests. 3 issues need addressing.',
    timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    unread: true,
    actionLabel: "View Feedback",
    actionHref: "#",
    source: "Iris Nakamura",
  },
  {
    id: 13,
    type: "error",
    category: "system",
    title: "Build failed for PR #170",
    message:
      "TypeScript compilation failed: Type 'undefined' is not assignable to type 'string' in auth.ts:42.",
    timestamp: new Date(now.getTime() - 14 * 60 * 60 * 1000),
    unread: false,
    actionLabel: "Fix Build",
    actionHref: "#",
    source: "CI/CD Pipeline",
  },

  // --- Announcement ---
  {
    id: 14,
    type: "announcement",
    category: "update",
    title: "v1.4.0 is now available!",
    message:
      "Real-time collaboration, team workspaces, and shared component libraries are here. Update today!",
    timestamp: new Date(now.getTime() - 22 * 60 * 60 * 1000),
    unread: true,
    actionLabel: "Read Changelog",
    actionHref: "#",
    source: "UI-as-Code Team",
  },
  {
    id: 15,
    type: "announcement",
    category: "system",
    title: "Scheduled maintenance this weekend",
    message:
      "Platform maintenance window: Saturday April 12, 02:00–04:00 UTC. Brief downtime expected.",
    timestamp: new Date(now.getTime() - 28 * 60 * 60 * 1000),
    unread: false,
    actionLabel: "Details",
    actionHref: "#",
    source: "Operations",
  },
  {
    id: 16,
    type: "announcement",
    category: "update",
    title: "New feature: Component Catalog Search",
    message:
      "Search across all your tracked SaaS components instantly. Try it in the Catalog tab.",
    timestamp: new Date(now.getTime() - 36 * 60 * 60 * 1000),
    unread: false,
    actionLabel: "Try It Out",
    actionHref: "#",
    source: "Product Team",
  },

  // --- More info items for variety ---
  {
    id: 17,
    type: "info",
    category: "pr",
    title: "New review request",
    message:
      "@david-kim assigned you as a reviewer for PR #192 — Analytics dashboard chart migration.",
    timestamp: new Date(now.getTime() - 55 * 60 * 1000),
    unread: true,
    actionLabel: "Start Review",
    actionHref: "#",
    source: "David Kim",
  },
  {
    id: 18,
    type: "info",
    category: "system",
    title: "Weekly digest ready",
    message:
      "You have 5 pending reviews, 2 shipped diffs, and 3 new mentions this week. See your summary.",
    timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000),
    unread: false,
    actionLabel: "Open Digest",
    actionHref: "#",
    source: "Digest Bot",
  },
  {
    id: 19,
    type: "success",
    category: "update",
    title: "Badge earned: Code Reviewer",
    message:
      "You reviewed 25+ PRs this month! The Code Reviewer badge has been added to your profile.",
    timestamp: new Date(now.getTime() - 20 * 60 * 60 * 1000),
    unread: false,
    actionLabel: "Share Badge",
    actionHref: "#",
    source: "Achievements",
  },
  {
    id: 20,
    type: "info",
    category: "mention",
    title: "Team invite accepted",
    message:
      "@olivia-brown accepted your invitation to join the Acme Corp team workspace.",
    timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    unread: false,
    actionLabel: "View Team",
    actionHref: "#",
    source: "Olivia Brown",
  },
  {
    id: 21,
    type: "warning",
    category: "security",
    title: "API key expires in 7 days",
    message:
      'Your production API key (sk-prod-...a3f8) will expire on April 17. Rotate it soon.',
    timestamp: new Date(now.getTime() - 52 * 60 * 60 * 1000),
    unread: false,
    actionLabel: "Rotate Key",
    actionHref: "#",
    source: "Security",
  },
  {
    id: 22,
    type: "info",
    category: "system",
    title: "Welcome to UI-as-Code!",
    message:
      "Complete your profile and connect your first SaaS product to start generating diffs automatically.",
    timestamp: new Date(now.getTime() - 72 * 60 * 60 * 1000),
    unread: false,
    actionLabel: "Get Started",
    actionHref: "#",
    source: "Onboarding",
  },
  {
    id: 23,
    type: "success",
    category: "pr",
    title: "First diff accepted by vendor",
    message:
      "Congratulations! Your diff for Salesforce Login Page was accepted by the vendor. This is your first vendor acceptance!",
    timestamp: new Date(now.getTime() - 96 * 60 * 60 * 1000),
    unread: false,
    actionLabel: "Celebrate",
    actionHref: "#",
    source: "Milestones",
  },
  {
    id: 24,
    type: "announcement",
    category: "update",
    title: "Community Discord hits 1,000 members",
    message:
      "Our community server crossed 1,000 members! Join the conversation, share your work, and get help.",
    timestamp: new Date(now.getTime() - 120 * 60 * 60 * 1000),
    unread: false,
    actionLabel: "Join Discord",
    actionHref: "#",
    source: "Community",
  },
];

/* ------------------------------------------------------------------ */
/*  Type configuration                                                 */
/* ------------------------------------------------------------------ */

const TYPE_CONFIG: Record<
  NotificationType,
  {
    icon: React.ReactNode;
    bg: string;
    text: string;
    border: string;
    dotColor: string;
  }
> = {
  info: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    dotColor: "bg-blue-500",
  },
  success: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    dotColor: "bg-emerald-500",
  },
  warning: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    dotColor: "bg-amber-500",
  },
  error: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    dotColor: "bg-red-500",
  },
  announcement: {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800",
    dotColor: "bg-violet-500",
  },
};

/* ------------------------------------------------------------------ */
/*  Tab config                                                         */
/* ------------------------------------------------------------------ */

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "mentions", label: "Mentions" },
  { key: "system", label: "System" },
  { key: "updates", label: "Updates" },
];

/* ------------------------------------------------------------------ */
/*  Preferences data                                                   */
/* ------------------------------------------------------------------ */

const DEFAULT_PREFERENCES: Preference[] = [
  {
    key: "email_digest",
    label: "Email Digest",
    description: "Receive a daily or weekly summary of your notifications via email.",
    enabled: true,
  },
  {
    key: "push_browser",
    label: "Browser Push",
    description: "Get instant push notifications in your browser for real-time updates.",
    enabled: true,
  },
  {
    key: "slack_integration",
    label: "Slack Integration",
    description: "Forward important notifications to your connected Slack channel.",
    enabled: false,
  },
  {
    key: "pr_activity",
    label: "PR Activity",
    description: "Notifications for approvals, comments, merges, and review requests.",
    enabled: true,
  },
  {
    key: "mentions_only",
    label: "Mentions Only",
    description: "Only notify me when I am directly @mentioned (reduces noise).",
    enabled: false,
  },
  {
    key: "security_alerts",
    label: "Security Alerts",
    description: "Critical security events like failed logins, new devices, and key expirations.",
    enabled: true,
  },
  {
    key: "product_updates",
    label: "Product Updates",
    description: "Announcements about new features, releases, and platform changes.",
    enabled: true,
  },
  {
    key: "marketing",
    label: "Marketing & Tips",
    description: "Occasional tips, tutorials, and promotional content from UI-as-Code.",
    enabled: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function matchesFilter(n: Notification, tab: FilterTab): boolean {
  switch (tab) {
    case "all":
      return true;
    case "unread":
      return n.unread;
    case "mentions":
      return n.category === "mention";
    case "system":
      return n.category === "system" || n.category === "security";
    case "updates":
      return n.category === "update";
  }
}

function formatRelativeTime(date: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  const months = Math.floor(diffDay / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function EmptyState({ filter }: { filter: FilterTab }) {
  const messages: Record<FilterTab, { title: string; desc: string }> = {
    all: {
      title: "No notifications yet",
      desc: "When you receive notifications, they will appear here.",
    },
    unread: {
      title: "All caught up!",
      desc: "You have no unread notifications. Great job staying on top of things.",
    },
    mentions: {
      title: "No mentions",
      desc: "When someone tags you, it will show up here.",
    },
    system: {
      title: "No system notifications",
      desc: "System alerts and security updates will appear here.",
    },
    updates: {
      title: "No updates",
      desc: "Product announcements and update news will appear here.",
    },
  };

  const msg = messages[filter];

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <svg
          className="h-8 w-8 text-gray-400 dark:text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
      </div>
      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {msg.title}
      </p>
      <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        {msg.desc}
      </p>
    </div>
  );
}

function SettingsPanel({
  preferences,
  setPreferences,
  onClose,
}: {
  preferences: Preference[];
  setPreferences: React.Dispatch<React.SetStateAction<Preference[]>>;
  onClose: () => void;
}) {
  const togglePref = useCallback(
    (key: string) =>
      setPreferences((prev) =>
        prev.map((p) => (p.key === key ? { ...p, enabled: !p.enabled } : p))
      ),
    [setPreferences]
  );

  return (
    <aside className="w-full shrink-0 lg:w-80 lg:border-l lg:border-gray-200 lg:pl-8 dark:lg:border-gray-800">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Preferences
        </h2>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 lg:hidden transition-colors"
          aria-label="Close settings"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-1">
        {preferences.map((pref) => (
          <label
            key={pref.key}
            className="group flex items-start justify-between gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {pref.label}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                {pref.description}
              </p>
            </div>
            {/* Toggle switch */}
            <button
              role="switch"
              aria-checked={pref.enabled}
              onClick={(e) => {
                e.preventDefault();
                togglePref(pref.key);
              }}
              className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                pref.enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  pref.enabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </label>
        ))}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);

  /* ---- derived state ---- */

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (!matchesFilter(n, activeTab)) return false;
      if (!dismissedIds.has(n.id)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.source && n.source.toLowerCase().includes(q))
        );
      }
      return !dismissedIds.has(n.id); // not dismissed
    });
  }, [notifications, activeTab, searchQuery, dismissedIds]);

  // Re-filter properly: apply tab + search, then exclude dismissed
  const displayed = useMemo(() => {
    return notifications.filter((n) => {
      if (!matchesFilter(n, activeTab)) return false;
      if (dismissedIds.has(n.id)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.source && n.source.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [notifications, activeTab, searchQuery, dismissedIds]);

  const visible = displayed.slice(0, visibleCount);
  const hasMore = visibleCount < displayed.length;
  const unreadCount = notifications.filter((n) => n.unread).length;

  /* ---- actions ---- */

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));

  const markRead = (id: number) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );

  const dismiss = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const loadMore = () => setVisibleCount((c) => c + 8);

  /* ---- render ---- */

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ===== HEADER ===== */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium shadow-sm transition-all active:scale-[0.98] ${
                  showSettings
                    ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Preferences
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mt-4">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>
        </div>
      </header>

      {/* ===== FILTER TABS ===== */}
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <ul className="-mb-px flex gap-1 overflow-x-auto py-0">
            {FILTER_TABS.map(({ key, label }) => {
              const count =
                key === "all"
                  ? notifications.length - dismissedIds.size
                  : key === "unread"
                    ? notifications.filter((n) => n.unread).length
                    : notifications.filter((n) => matchesFilter(n, key) && !dismissedIds.has(n.id)).length;

              return (
                <li key={key}>
                  <button
                    onClick={() => {
                      setActiveTab(key);
                      setVisibleCount(10);
                    }}
                    className={`whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-medium transition-colors ${
                      activeTab === key
                        ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
                    }`}
                  >
                    {label}
                    <span
                      className={`ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                        activeTab === key
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Notification list */}
          <div className="min-w-0 flex-1">
            {displayed.length === 0 ? (
              <EmptyState filter={activeTab} />
            ) : (
              <>
                <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                  {visible.map((item) => {
                    const config = TYPE_CONFIG[item.type];
                    return (
                      <li
                        key={item.id}
                        onClick={() => markRead(item.id)}
                        className={`group relative flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors ${
                          item.unread
                            ? "bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }`}
                      >
                        {/* Unread indicator dot */}
                        {item.unread && (
                          <span
                            className={`absolute left-2 top-1/2 -translate-y-1/2 block h-2 w-2 rounded-full ${config.dotColor} ring-4 ring-blue-50/60 dark:ring-gray-900/60`}
                          />
                        )}

                        {/* Icon badge */}
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.bg} ${config.text}`}
                          aria-hidden="true"
                        >
                          {config.icon}
                        </span>

                        {/* Content body */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[15px] font-semibold leading-snug text-gray-900 dark:text-gray-100">
                                {item.title}
                              </p>
                              <p
                                className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400 [&_strong]:font-semibold [&_strong]:text-gray-800 dark:[&_strong]:text-gray-200"
                                dangerouslySetInnerHTML={{ __html: item.message }}
                              />
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <time
                                  dateTime={item.timestamp.toISOString()}
                                  className="tabular-nums text-xs font-medium text-gray-400 dark:text-gray-500"
                                >
                                  {formatRelativeTime(item.timestamp)}
                                </time>
                                {item.source && (
                                  <>
                                    <span className="text-gray-300 dark:text-gray-600">&middot;</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {item.source}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Action buttons row */}
                            <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                              {item.actionLabel && (
                                <a
                                  href={item.actionHref ?? "#"}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                  {item.actionLabel}
                                </a>
                              )}
                              <button
                                onClick={(e) => dismiss(item.id, e)}
                                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                aria-label="Dismiss notification"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Load more */}
                {hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={loadMore}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 active:scale-[0.98] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-600"
                    >
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
                      Load more ({displayed.length - visibleCount} remaining)
                    </button>
                  </div>
                )}

                {/* Bottom summary */}
                {!hasMore && displayed.length > 0 && (
                  <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
                    Showing all {displayed.length} notification{displayed.length !== 1 ? "s" : ""}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Settings sidebar (desktop always visible when open, mobile toggleable) */}
          {(showSettings || typeof window !== "undefined" && window.innerWidth >= 1024) && (
            <SettingsPanel
              preferences={preferences}
              setPreferences={setPreferences}
              onClose={() => setShowSettings(false)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
