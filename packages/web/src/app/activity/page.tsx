import type { Metadata } from "next";
import { formatRelativeTime, cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Activity",
  description: "Activity feed and timeline for your workspace.",
};

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type ActivityType =
  | "friction_created"
  | "diff_generated"
  | "pr_created"
  | "pr_accepted"
  | "pr_rejected"
  | "vote_cast"
  | "user_joined"
  | "integration_connected"
  | "settings_changed"
  | "webhook_triggered";

interface ActivityEntry {
  id: string;
  type: ActivityType;
  timestamp: string;
  actor: { name: string; avatar: string };
  action: string;
  target?: string;
  metadata?: string;
  preview?: { label: string; value: string };
}

type FilterTab = "all" | "yours" | "team" | "system";

/* ------------------------------------------------------------------ */
/* Sample data (22 entries)                                            */
/* ------------------------------------------------------------------ */

const entries: ActivityEntry[] = [
  // --- friction_created (blue) ---
  {
    id: "act-001",
    type: "friction_created",
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    actor: { name: "Alice Chen", avatar: "AC" },
    action: "reported new friction on",
    target: "Navbar overflow on mobile viewport",
    metadata: "Severity: medium \u00b7 Component: NavigationBar",
    preview: { label: "Component", value: "NavigationBar v2.4" },
  },
  {
    id: "act-002",
    type: "friction_created",
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    actor: { name: "Bob Martinez", avatar: "BM" },
    action: "reported new friction on",
    target: "Checkout button misaligned in dark mode",
    metadata: "Severity: low \u00b7 Component: CheckoutForm",
  },
  {
    id: "act-003",
    type: "friction_created",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    actor: { name: "Carol Wang", avatar: "CW" },
    action: "reported new friction on",
    target: "Table sorting flickers on rapid clicks",
    metadata: "Severity: high \u00b7 Component: DataTable",
    preview: { label: "Reproductions", value: "12 this week" },
  },

  // --- diff_generated (orange) ---
  {
    id: "act-004",
    type: "diff_generated",
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    actor: { name: "AI Engine", avatar: "AI" },
    action: "generated diff for friction",
    target: "#127 \u2014 Navbar overflow on mobile viewport",
    metadata: "+34 lines \u00b7 -12 lines \u00b7 Model: claude-sonnet-4",
    preview: { label: "Confidence", value: "94%" },
  },
  {
    id: "act-005",
    type: "diff_generated",
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    actor: { name: "AI Engine", avatar: "AI" },
    action: "generated diff for friction",
    target: "#124 \u2014 Checkout button alignment",
    metadata: "+8 lines \u00b7 -3 lines \u00b7 Model: gpt-4o",
  },
  {
    id: "act-006",
    type: "diff_generated",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    actor: { name: "AI Engine", avatar: "AI" },
    action: "generated diff for friction",
    target: "#119 \u2014 Table sort flicker fix",
    metadata: "+67 lines \u00b7 -21 lines \u00b7 Model: claude-sonnet-4",
    preview: { label: "Files changed", value: "3" },
  },

  // --- pr_created (purple) ---
  {
    id: "act-007",
    type: "pr_created",
    timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    actor: { name: "David Kim", avatar: "DK" },
    action: "submitted a new PR for",
    target: "SaaS product landing page hero section",
    metadata: "PR #148 \u00b7 +156 lines \u00b7 Status: Open",
    preview: { label: "Reviewers", value: "2 assigned" },
  },
  {
    id: "act-008",
    type: "pr_created",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    actor: { name: "Eva Lindqvist", avatar: "EL" },
    action: "submitted a new PR for",
    target: "Analytics dashboard chart migration",
    metadata: "PR #146 \u00b7 +89 lines \u00b7 Status: In review",
  },
  {
    id: "act-009",
    type: "pr_created",
    timestamp: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    actor: { name: "Frank Okafor", avatar: "FO" },
    action: "submitted a new PR for",
    target: "Onboarding wizard step 3 redesign",
    metadata: "PR #142 \u00b7 +234 lines \u00b7 Status: Draft",
    preview: { label: "Files changed", value: "7" },
  },

  // --- pr_accepted (green) ---
  {
    id: "act-010",
    type: "pr_accepted",
    timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    actor: { name: "Grace Park", avatar: "GP" },
    action: "accepted PR",
    target: "#145 \u2014 Fix pagination edge case",
    metadata: "Merged into main by Grace Park",
    preview: { label: "Merge commit", value: "a3f8c2d" },
  },
  {
    id: "act-011",
    type: "pr_accepted",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    actor: { name: "Hassan Ali", avatar: "HA" },
    action: "accepted PR",
    target: "#140 \u2012 Add export to CSV feature",
    metadata: "Merged into main by Hassan Ali",
  },

  // --- pr_rejected (red) ---
  {
    id: "act-012",
    type: "pr_rejected",
    timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    actor: { name: "Iris Nakamura", avatar: "IN" },
    action: "rejected PR",
    target: "#143 \u2014 Experimental gradient footer",
    metadata: 'Reason: "Does not meet accessibility contrast guidelines"',
    preview: { label: "Feedback", value: "3 comments" },
  },
  {
    id: "act-013",
    type: "pr_rejected",
    timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    actor: { name: "Jack Torres", avatar: "JT" },
    action: "rejected PR",
    target: "#138 \u2014 Remove sidebar collapse animation",
    metadata: 'Reason: "Breaks keyboard navigation flow in screen readers"',
  },

  // --- vote_cast (gray) ---
  {
    id: "act-014",
    type: "vote_cast",
    timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    actor: { name: "Kira Schmidt", avatar: "KS" },
    action: "voted",
    target: "Approve on PR #147",
    metadata: "Vote weight: 1 \u00b7 Total: 5 approve, 1 request changes",
  },
  {
    id: "act-015",
    type: "vote_cast",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    actor: { name: "Leo Vasquez", avatar: "LV" },
    action: "voted",
    target: "Request changes on PR #144",
    metadata: "Vote weight: 1 \u00b7 Total: 3 approve, 2 request changes",
    preview: { label: "Comment", value: "Needs error handling" },
  },

  // --- user_joined (blue) ---
  {
    id: "act-016",
    type: "user_joined",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    actor: { name: "Mia Johansson", avatar: "MJ" },
    action: "joined the team as",
    target: "Designer",
    metadata: "Invited by Alice Chen \u00b7 Plan: Pro",
  },
  {
    id: "act-017",
    type: "user_joined",
    timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    actor: { name: "Noah Patel", avatar: "NP" },
    action: "joined the team as",
    target: "Developer",
    metadata: "Invited by Bob Martinez \u00b7 Plan: Team",
  },

  // --- integration_connected (green) ---
  {
    id: "act-018",
    type: "integration_connected",
    timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    actor: { name: "Olivia Brown", avatar: "OB" },
    action: "connected",
    target: "Slack integration",
    metadata: "Channel: #ui-updates \u00b7 Events: all",
    preview: { label: "Status", value: "Active" },
  },
  {
    id: "act-019",
    type: "integration_connected",
    timestamp: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
    actor: { name: "Paul Novak", avatar: "PN" },
    action: "connected",
    target: "GitHub integration",
    metadata: "Repo: acme/ui-as-code \u00b7 Sync: enabled",
  },

  // --- settings_changed (gray) ---
  {
    id: "act-020",
    type: "settings_changed",
    timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    actor: { name: "Quinn Davis", avatar: "QD" },
    action: "changed notification preferences",
    target: "Email digest frequency",
    metadata: "From: daily \u2192 weekly",
  },
  {
    id: "act-021",
    type: "settings_changed",
    timestamp: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
    actor: { name: "Riley Foster", avatar: "RF" },
    action: "changed notification preferences",
    target: "Slack mention settings",
    metadata: "From: mentions only \u2192 all activity",
  },

  // --- webhook_triggered (purple) ---
  {
    id: "act-022",
    type: "webhook_triggered",
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    actor: { name: "System", avatar: "SY" },
    action: "webhook fired for event",
    target: "pr.accepted",
    metadata: "Endpoint: https://hooks.example.com/deploy \u00b7 Status: 200 OK",
    preview: { label: "Latency", value: "142ms" },
  },
];

/* ------------------------------------------------------------------ */
/* Type configuration                                                  */
/* ------------------------------------------------------------------ */

const TYPE_CONFIG: Record<
  ActivityType,
  {
    label: string;
    dotColor: string;
    dotRingColor: string;
    badgeBg: string;
    badgeText: string;
    icon: React.ReactNode;
  }
> = {
  friction_created: {
    label: "Friction Reported",
    dotColor: "bg-blue-500",
    dotRingColor: "ring-blue-200 dark:ring-blue-800",
    badgeBg: "bg-blue-50 dark:bg-blue-950/40",
    badgeText: "text-blue-700 dark:text-blue-300",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  diff_generated: {
    label: "Diff Generated",
    dotColor: "bg-orange-500",
    dotRingColor: "ring-orange-200 dark:ring-orange-800",
    badgeBg: "bg-orange-50 dark:bg-orange-950/40",
    badgeText: "text-orange-700 dark:text-orange-300",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
  },
  pr_created: {
    label: "PR Created",
    dotColor: "bg-purple-500",
    dotRingColor: "ring-purple-200 dark:ring-purple-800",
    badgeBg: "bg-purple-50 dark:bg-purple-950/40",
    badgeText: "text-purple-700 dark:text-purple-300",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  pr_accepted: {
    label: "PR Accepted",
    dotColor: "bg-emerald-500",
    dotRingColor: "ring-emerald-200 dark:ring-emerald-800",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/40",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  pr_rejected: {
    label: "PR Rejected",
    dotColor: "bg-red-500",
    dotRingColor: "ring-red-200 dark:ring-red-800",
    badgeBg: "bg-red-50 dark:bg-red-950/40",
    badgeText: "text-red-700 dark:text-red-300",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  vote_cast: {
    label: "Vote Cast",
    dotColor: "bg-zinc-400",
    dotRingColor: "ring-zinc-200 dark:ring-zinc-700",
    badgeBg: "bg-zinc-100 dark:bg-zinc-800",
    badgeText: "text-zinc-600 dark:text-zinc-400",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
  },
  user_joined: {
    label: "User Joined",
    dotColor: "bg-sky-500",
    dotRingColor: "ring-sky-200 dark:ring-sky-800",
    badgeBg: "bg-sky-50 dark:bg-sky-950/40",
    badgeText: "text-sky-700 dark:text-sky-300",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
      </svg>
    ),
  },
  integration_connected: {
    label: "Integration Connected",
    dotColor: "bg-green-500",
    dotRingColor: "ring-green-200 dark:ring-green-800",
    badgeBg: "bg-green-50 dark:bg-green-950/40",
    badgeText: "text-green-700 dark:text-green-300",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m10.609-5.214a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757m8.226 8.226l-1.757-1.757" />
      </svg>
    ),
  },
  settings_changed: {
    label: "Settings Changed",
    dotColor: "bg-zinc-400",
    dotRingColor: "ring-zinc-200 dark:ring-zinc-700",
    badgeBg: "bg-zinc-100 dark:bg-zinc-800",
    badgeText: "text-zinc-600 dark:text-zinc-400",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  webhook_triggered: {
    label: "Webhook Triggered",
    dotColor: "bg-violet-500",
    dotRingColor: "ring-violet-200 dark:ring-violet-800",
    badgeBg: "bg-violet-50 dark:bg-violet-950/40",
    badgeText: "text-violet-700 dark:text-violet-300",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
};

/* ------------------------------------------------------------------ */
/* Avatar color helper                                                 */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = [
  "bg-blue-600", "bg-emerald-600", "bg-violet-600", "bg-amber-600",
  "bg-rose-600", "bg-cyan-600", "bg-indigo-600", "bg-teal-600",
  "bg-pink-600", "bg-lime-700", "bg-fuchsia-600", "bg-sky-600",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ------------------------------------------------------------------ */
/* Page component                                                      */
/* ------------------------------------------------------------------ */

export default function ActivityPage() {
  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "yours", label: "Yours" },
    { key: "team", label: "Team" },
    { key: "system", label: "System" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Activity
          </h1>
          <p className="text-base text-zinc-500 dark:text-zinc-400">
            Timeline of everything happening across your workspace &mdash;
            frictions, diffs, pull requests, and more.
          </p>
        </div>

        {/* Filter tabs */}
        <nav className="mt-6" aria-label="Activity filters">
          <fieldset className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
            <legend className="sr-only">Filter activities</legend>
            {filterTabs.map(({ key, label }) => (
              <label
                key={key}
                className={cn(
                  "cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  key === "all"
                    ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800",
                )}
              >
                {label}
                <input
                  type="radio"
                  name="activityFilter"
                  value={key}
                  defaultChecked={key === "all"}
                  className="sr-only"
                />
              </label>
            ))}
          </fieldset>
        </nav>
      </header>

      {/* Timeline */}
      <main>
        <ol className="relative space-y-0">
          {/* Vertical line connecting all dots */}
          <span
            className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-zinc-200 dark:bg-zinc-800"
            aria-hidden="true"
          />

          {entries.map((entry, index) => {
            const config = TYPE_CONFIG[entry.type];
            const isLast = index === entries.length - 1;

            return (
              <li
                key={entry.id}
                className={cn(
                  "relative pb-8 pl-12",
                  isLast && "pb-0",
                )}
              >
                {/* Timeline dot with ring */}
                <div
                  className={cn(
                    "absolute left-2 top-2.5 flex h-4 w-4 items-center justify-center rounded-full text-white",
                    config.dotColor,
                    config.dotRingColor,
                    "ring-2",
                  )}
                  aria-hidden="true"
                >
                  {config.icon}
                </div>

                {/* Card body */}
                <article
                  className={cn(
                    "group rounded-xl border bg-white p-5 transition-colors",
                    entry.type === "pr_rejected"
                      ? "border-red-200 hover:border-red-300 dark:border-red-900/40 dark:hover:border-red-800/50"
                      : entry.type === "pr_accepted"
                        ? "border-emerald-200 hover:border-emerald-300 dark:border-emerald-900/40 dark:hover:border-emerald-800/50"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
                  )}
                >
                  {/* Top row: timestamp + badge + actor */}
                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {/* Relative time */}
                    <time
                      dateTime={entry.timestamp}
                      className="tabular-nums text-xs font-medium text-zinc-400 dark:text-zinc-500"
                    >
                      {formatRelativeTime(entry.timestamp)}
                    </time>

                    {/* Type badge */}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                        config.badgeBg,
                        config.badgeText,
                      )}
                    >
                      {config.icon}
                      {config.label}
                    </span>

                    {/* Actor avatar + name */}
                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white",
                          getAvatarColor(entry.actor.name),
                        )}
                        aria-hidden="true"
                      >
                        {entry.actor.avatar}
                      </span>
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {entry.actor.name}
                      </span>
                    </div>
                  </div>

                  {/* Action description */}
                  <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {entry.action}{" "}
                    {entry.target && (
                      <strong className="font-semibold">{entry.target}</strong>
                    )}
                  </p>

                  {/* Metadata row */}
                  {entry.metadata && (
                    <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {entry.metadata}
                    </p>
                  )}

                  {/* Optional preview pill */}
                  {entry.preview && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-850">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        {entry.preview.label}
                      </span>
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {entry.preview.value}
                      </span>
                    </div>
                  )}

                  {/* Rejection reason highlight */}
                  {entry.type === "pr_rejected" && entry.metadata && (
                    <div className="mt-3 rounded-lg border border-red-100 bg-red-50/60 p-3 dark:border-red-900/30 dark:bg-red-950/20">
                      <p className="text-xs font-medium text-red-700 dark:text-red-400">
                        {entry.metadata}
                      </p>
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      </main>

      {/* Load more */}
      <footer className="mt-8 flex justify-center">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:border-zinc-400 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:border-zinc-600"
        >
          <svg
            className="h-4 w-4 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          Load More Activity
        </button>
      </footer>
    </div>
  );
}
