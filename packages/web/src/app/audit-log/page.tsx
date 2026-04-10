import type { Metadata } from "next";
import { formatRelativeTime, cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Audit Log",
  description: "View and filter activity logs across your workspace.",
};

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type ActionType = "Login" | "API" | "Diff" | "PR" | "Settings" | "Security";

interface AuditEntry {
  id: string;
  timestamp: string;
  user: { name: string; avatar: string };
  actionType: ActionType;
  targetResource: string;
  details: string;
  ipAddress: string;
}

type DateRange = "today" | "7d" | "30d" | "all";

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const entries: AuditEntry[] = [
  {
    id: "evt-001",
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    user: { name: "Alice Chen", avatar: "AC" },
    actionType: "Login",
    targetResource: "/auth/login",
    details: "Successful login via SSO (Okta)",
    ipAddress: "192.168.1.42",
  },
  {
    id: "evt-002",
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    user: { name: "Bob Martinez", avatar: "BM" },
    actionType: "API",
    targetResource: "POST /api/v1/generate",
    details: 'Generated diff for "Fix navbar overflow on mobile"',
    ipAddress: "10.0.0.15",
  },
  {
    id: "evt-003",
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    user: { name: "Carol Wang", avatar: "CW" },
    actionType: "Diff",
    targetResource: "diff:a7f3c2e",
    details: 'Reviewed diff on "Stripe checkout page" — approved',
    ipAddress: "172.16.3.101",
  },
  {
    id: "evt-004",
    timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    user: { name: "David Kim", avatar: "DK" },
    actionType: "PR",
    targetResource: "PR #142",
    details: 'Merged PR "Refactor auth middleware" into main',
    ipAddress: "192.168.2.77",
  },
  {
    id: "evt-005",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    user: { name: "Eva Lindqvist", avatar: "EL" },
    actionType: "Settings",
    targetResource: "workspace/settings",
    details: "Changed default branch from master to main",
    ipAddress: "10.10.5.33",
  },
  {
    id: "evt-006",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    user: { name: "Frank Okafor", avatar: "FO" },
    actionType: "Security",
    targetResource: "/auth/2fa",
    details: "Enabled TOTP two-factor authentication",
    ipAddress: "192.168.1.88",
  },
  {
    id: "evt-007",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    user: { name: "Grace Park", avatar: "GP" },
    actionType: "API",
    targetResource: "GET /api/v1/frictions",
    details: "Queried friction list (page 3, 20 results)",
    ipAddress: "172.16.0.44",
  },
  {
    id: "evt-008",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    user: { name: "Hassan Ali", avatar: "HA" },
    actionType: "Login",
    targetResource: "/auth/login",
    details: "Successful login via email + password",
    ipAddress: "10.0.1.200",
  },
  {
    id: "evt-009",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    user: { name: "Iris Nakamura", avatar: "IN" },
    actionType: "Diff",
    targetResource: "diff:b9d4f11",
    details: 'Created new diff for "Update pricing table layout"',
    ipAddress: "192.168.3.19",
  },
  {
    id: "evt-010",
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    user: { name: "Jack Torres", avatar: "JT" },
    actionType: "PR",
    targetResource: "PR #138",
    details: 'Opened PR "Add dark mode toggle to sidebar"',
    ipAddress: "10.0.2.61",
  },
  {
    id: "evt-011",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    user: { name: "Kira Schmidt", avatar: "KS" },
    actionType: "Settings",
    targetResource: "webhook/settings",
    details: "Added new webhook endpoint: https://hooks.example.com/build",
    ipAddress: "172.16.4.12",
  },
  {
    id: "evt-012",
    timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    user: { name: "Leo Vasquez", avatar: "LV" },
    actionType: "Security",
    targetResource: "api-key/rotate",
    details: "Rotated API key sk-live-\u2026e4f9",
    ipAddress: "192.168.0.55",
  },
  {
    id: "evt-013",
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    user: { name: "Mia Johansson", avatar: "MJ" },
    actionType: "API",
    targetResource: "POST /api/v1/generate",
    details: 'Generated diff for "Align form labels consistently"',
    ipAddress: "10.10.1.90",
  },
  {
    id: "evt-014",
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    user: { name: "Noah Patel", avatar: "NP" },
    actionType: "Diff",
    targetResource: "diff:c2e8a03",
    details: 'Requested changes on "Footer link spacing" — comment added',
    ipAddress: "172.16.2.30",
  },
  {
    id: "evt-015",
    timestamp: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    user: { name: "Olivia Brown", avatar: "OB" },
    actionType: "PR",
    targetResource: "PR #129",
    details: 'Closed PR "Experiment: gradient hero banner" as stale',
    ipAddress: "192.168.4.8",
  },
  {
    id: "evt-016",
    timestamp: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
    user: { name: "Paul Novak", avatar: "PN" },
    actionType: "Login",
    targetResource: "/auth/login",
    details: "Successful login via GitHub OAuth",
    ipAddress: "10.0.3.112",
  },
  {
    id: "evt-017",
    timestamp: new Date(Date.now() - 144 * 60 * 60 * 1000).toISOString(),
    user: { name: "Quinn Davis", avatar: "QD" },
    actionType: "Settings",
    targetResource: "team/members",
    details: "Invited user riley@example.com as Viewer role",
    ipAddress: "172.16.5.67",
  },
  {
    id: "evt-018",
    timestamp: new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString(),
    user: { name: "Riley Foster", avatar: "RF" },
    actionType: "Security",
    targetResource: "session/revoke",
    details: "Revoked 3 active sessions (all devices except current)",
    ipAddress: "192.168.1.201",
  },
];

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */

const ACTION_TYPE_CONFIG: Record<ActionType, { label: string; bgClass: string; textClass: string }> = {
  Login:     { label: "Login",     bgClass: "bg-emerald-100 dark:bg-emerald-900/40", textClass: "text-emerald-700 dark:text-emerald-300" },
  API:       { label: "API",       bgClass: "bg-blue-100 dark:bg-blue-900/40",       textClass: "text-blue-700 dark:text-blue-300" },
  Diff:      { label: "Diff",      bgClass: "bg-orange-100 dark:bg-orange-900/40",   textClass: "text-orange-700 dark:text-orange-300" },
  PR:        { label: "PR",        bgClass: "bg-purple-100 dark:bg-purple-900/40",   textClass: "text-purple-700 dark:text-purple-300" },
  Settings:  { label: "Settings",  bgClass: "bg-zinc-100 dark:bg-zinc-800",          textClass: "text-zinc-700 dark:text-zinc-300" },
  Security:  { label: "Security",  bgClass: "bg-red-100 dark:bg-red-900/40",         textClass: "text-red-700 dark:text-red-300" },
};

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

function buildCsv(entries: AuditEntry[]): string {
  const header = ["Timestamp", "User", "Action Type", "Target Resource", "Details", "IP Address"];
  const rows = entries.map((e) => [
    e.timestamp,
    e.user.name,
    e.actionType,
    e.targetResource,
    `"${e.details.replace(/"/g, '""')}"`,
    e.ipAddress,
  ]);
  return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/* ------------------------------------------------------------------ */
/* Page component                                                      */
/* ------------------------------------------------------------------ */

export default function AuditLogPage() {
  /* In a real app these would come from searchParams; here we render
     the full dataset server-side with all filters shown for the UI. */

  const totalEntries = entries.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Audit Log
          </h1>
          <p className="mt-2 text-base text-zinc-500 dark:text-zinc-400">
            Track every action across your workspace, including logins, API
            calls, diffs, pull requests, and configuration changes.
          </p>
        </div>

        {/* Export button */}
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(buildCsv(entries))}`}
          download="audit-log.csv"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          {/* Download icon */}
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" />
          </svg>
          Export CSV
        </a>
      </div>

      {/* Filter bar */}
      <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date range */}
          <fieldset className="flex items-center gap-1.5 rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
            <legend className="sr-only">Date range</legend>
            {(
              [
                { key: "today" as DateRange, label: "Today" },
                { key: "7d" as DateRange, label: "7 days" },
                { key: "30d" as DateRange, label: "30 days" },
                { key: "all" as DateRange, label: "All" },
              ] as const
            ).map(({ key, label }) => (
              <label
                key={key}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  key === "all"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200",
                )}
              >
                {label}
                <input type="radio" name="dateRange" value={key} defaultChecked={key === "all"} className="sr-only" />
              </label>
            ))}
          </fieldset>

          {/* Action type */}
          <fieldset className="flex items-center gap-1.5 rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
            <legend className="sr-only">Action type</legend>
            {(["All", "Login", "API", "Diff", "PR", "Settings", "Security"] as const).map((type) => (
              <label
                key={type}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  type === "All"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200",
                )}
              >
                {type}
                <input type="radio" name="actionType" value={type} defaultChecked={type === "All"} className="sr-only" />
              </label>
            ))}
          </fieldset>

          {/* User filter */}
          <div className="relative ml-auto min-w-[200px]">
            <label htmlFor="userFilter" className="sr-only">Filter by user</label>
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="userFilter"
              type="text"
              placeholder="Search by user..."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>
      </section>

      {/* Activity table */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Timestamp
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  User
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Action
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Target Resource
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Details
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {entries.map((entry) => {
                const config = ACTION_TYPE_CONFIG[entry.actionType];
                return (
                  <tr
                    key={entry.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  >
                    {/* Timestamp */}
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                      <span title={new Date(entry.timestamp).toLocaleString()}>
                        {formatRelativeTime(entry.timestamp)}
                      </span>
                    </td>

                    {/* User */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white",
                            getAvatarColor(entry.user.name),
                          )}
                          aria-hidden="true"
                        >
                          {entry.user.avatar}
                        </span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {entry.user.name}
                        </span>
                      </div>
                    </td>

                    {/* Action type badge */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          config.bgClass,
                          config.textClass,
                        )}
                      >
                        {config.label}
                      </span>
                    </td>

                    {/* Target resource */}
                    <td className="max-w-[200px] truncate px-4 py-3.5">
                      <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {entry.targetResource}
                      </code>
                    </td>

                    {/* Details */}
                    <td className="max-w-[320px] px-4 py-3.5">
                      <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {entry.details}
                      </p>
                    </td>

                    {/* IP address */}
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <code className="text-xs font-mono text-zinc-500 dark:text-zinc-500">
                        {entry.ipAddress}
                      </code>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pagination footer */}
      <footer className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row sm:gap-0">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Showing{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">1</span>
          {"\u2013"}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{totalEntries}</span>{" "}
          of{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{totalEntries}</span>{" "}
          entries
        </p>

        <nav className="flex items-center gap-1" aria-label="Pagination">
          <span className="inline-flex cursor-not-allowed items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-600">
            Previous
          </span>
          <span className="inline-flex items-center rounded-lg bg-zinc-900 px-3.5 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
            1
          </span>
          <span className="inline-flex cursor-not-allowed items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-600">
            Next
          </span>
        </nav>
      </footer>
    </div>
  );
}
