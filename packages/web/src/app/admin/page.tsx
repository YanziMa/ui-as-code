import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard | UI-as-Code",
  description: "Admin dashboard for the UI-as-Code platform",
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const stats = [
  {
    label: "Total Users",
    value: "1,247",
    delta: "+23 today",
    deltaType: "positive" as const,
  },
  {
    label: "Active Submissions",
    value: "89",
    delta: "12 pending review",
    deltaType: "warning" as const,
  },
  {
    label: "AI API Calls Today",
    value: "3,421",
    delta: "$12.40 cost",
    deltaType: "neutral" as const,
  },
  {
    label: "Acceptance Rate",
    value: "73.2%",
    delta: "+2.1% vs last week",
    deltaType: "positive" as const,
  },
  {
    label: "Error Rate",
    value: "0.03%",
    delta: "-0.01% vs last week",
    deltaType: "positive" as const,
  },
  {
    label: "Uptime",
    value: "99.98%",
    delta: "Last 30 days",
    deltaType: "neutral" as const,
  },
];

const health = [
  { label: "CPU", value: 34, max: 100, unit: "%", color: "bg-emerald-500" },
  {
    label: "Memory",
    value: 4.2,
    max: 8,
    unit: "GB / 8GB",
    color: "bg-amber-500",
  },
  { label: "Disk", value: 67, max: 100, unit: "GB / 100GB", color: "bg-emerald-500" },
  {
    label: "Database Connections",
    value: 23,
    max: 100,
    unit: "/100",
    color: "bg-sky-500",
  },
];

const submissions = [
  {
    id: "SUB-1042",
    user: "alice_chen",
    saasTarget: "Stripe Dashboard",
    status: "approved" as const,
    created: "2026-04-10 09:14",
  },
  {
    id: "SUB-1041",
    user: "marcus_lee",
    saasTarget: "Linear Issues",
    status: "pending" as const,
    created: "2026-04-10 08:47",
  },
  {
    id: "SUB-1040",
    user: "priya_s",
    saasTarget: "Notion Page",
    status: "approved" as const,
    created: "2026-04-09 22:31",
  },
  {
    id: "SUB-1039",
    user: "david_kim",
    saasTarget: "Vercel Deploy",
    status: "rejected" as const,
    created: "2026-04-09 19:05",
  },
  {
    id: "SUB-1038",
    user: "sara_m",
    saasTarget: "GitHub PR",
    status: "approved" as const,
    created: "2026-04-09 16:20",
  },
  {
    id: "SUB-1037",
    user: "james_w",
    saasTarget: "Figma Plugin",
    status: "pending" as const,
    created: "2026-04-09 14:55",
  },
  {
    id: "SUB-1036",
    user: "nina_r",
    saasTarget: "Slack Channel",
    status: "approved" as const,
    created: "2026-04-09 11:33",
  },
  {
    id: "SUB-1035",
    user: "oscar_t",
    saasTarget: "Jira Board",
    status: "rejected" as const,
    created: "2026-04-09 09:18",
  },
];

const aiUsage = [
  { day: "Mon", tokens: 42 },
  { day: "Tue", tokens: 58 },
  { day: "Wed", tokens: 35 },
  { day: "Thu", tokens: 71 },
  { day: "Fri", tokens: 63 },
  { day: "Sat", tokens: 28 },
  { day: "Sun", tokens: 49 },
];

const alerts = [
  {
    severity: "warning" as const,
    message:
      'Rate limit approaching for Claude API key \u2014 current usage at 87% of daily quota.',
  },
  {
    severity: "info" as const,
    message:
      "Scheduled maintenance window in 2 days (Apr 12, 02:00\u201304:00 UTC). Expect brief downtime.",
  },
  {
    severity: "success" as const,
    message:
      "Database backup completed successfully at 03:15 UTC today. All integrity checks passed.",
  },
];

const quickActions = [
  "Clear Cache",
  "Trigger Backup",
  "Run Diagnostics",
  "View Logs",
  "Manage Users",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    approved: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      text: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
    },
    pending: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      text: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    },
    rejected: {
      bg: "bg-red-50 dark:bg-red-950/20",
      text: "text-red-700 dark:text-red-300",
      dot: "bg-red-500",
    },
  };
  const s = map[status] ?? map.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function alertStyle(severity: string) {
  const map: Record<string, { border: string; bg: string; icon: string; label: string }> = {
    warning: {
      border: "border-amber-300 dark:border-amber-700",
      bg: "bg-amber-50 dark:bg-amber-950/20",
      icon: "\u26A0\uFE0F",
      label: "Warning",
    },
    info: {
      border: "border-sky-300 dark:border-sky-700",
      bg: "bg-sky-50 dark:bg-sky-950/20",
      icon: "\u2139\uFE0F",
      label: "Info",
    },
    success: {
      border: "border-emerald-300 dark:border-emerald-700",
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      icon: "\u2705",
      label: "Success",
    },
  };
  return map[severity] ?? map.info;
}

function deltaColor(type: string) {
  switch (type) {
    case "positive":
      return "text-emerald-600 dark:text-emerald-400";
    case "warning":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-gray-500 dark:text-gray-400";
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminDashboardPage() {
  const now = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const maxTokens = Math.max(...aiUsage.map((d) => d.tokens));

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8 dark:bg-gray-950">
      {/* ---- Header ---- */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <span className="inline-flex items-center rounded-full border border-red-300 bg-red-50 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            Admin Only
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Last refreshed: {now}
        </p>
      </div>

      {/* ---- Stats Overview Row (6 cards) ---- */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {s.label}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className={`mt-1 text-xs font-medium ${deltaColor(s.deltaType)}`}>
              {s.delta}
            </p>
          </div>
        ))}
      </section>

      {/* ---- Two-column middle section ---- */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* System Health Panel */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
            System Health
          </h2>
          <div className="space-y-5">
            {health.map((h) => {
              const pct =
                typeof h.value === "number"
                  ? Math.round((h.value / h.max) * 100)
                  : 0;

              // Build display value string from unit
              let displayValue: string;
              if (typeof h.value === "number") {
                const rawStr = h.value % 1 === 0 ? String(h.value) : h.value.toFixed(1);
                if (h.unit.includes("/")) {
                  displayValue = `${rawStr}${h.unit.split("/")[0]} /${h.unit.split("/")[1]}`;
                } else {
                  displayValue = `${rawStr}${h.unit}`;
                }
              } else {
                displayValue = String(h.value);
              }

              return (
                <div key={h.label}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {h.label}
                    </span>
                    <span className="tabular-nums text-gray-500 dark:text-gray-400">
                      {displayValue}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-full rounded-full ${h.color} transition-all`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* AI Usage Chart */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
            AI Token Usage &mdash; Last 7 Days
          </h2>
          <div className="flex h-48 items-end justify-around gap-2 rounded-md bg-gray-50 p-4 dark:bg-gray-800/60">
            {aiUsage.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs tabular-nums text-gray-600 dark:text-gray-400">
                  {d.tokens}k
                </span>
                <div
                  className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-violet-600 to-violet-400 transition-all hover:from-violet-500 hover:to-violet-300"
                  style={{ height: `${(d.tokens / maxTokens) * 140}px` }}
                  title={`${d.day}: ${d.tokens},000 tokens`}
                />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {d.day}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ---- Recent Submissions Table ---- */}
      <section className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Recent Submissions
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-400">
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">SaaS Target</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {submissions.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                >
                  <td className="whitespace-nowrap px-6 py-3.5 font-mono text-xs font-medium text-gray-900 dark:text-gray-100">
                    {row.id}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-gray-700 dark:text-gray-300">
                    {row.user}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-gray-600 dark:text-gray-400">
                    {row.saasTarget}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5">
                    {statusBadge(row.status)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 tabular-nums text-gray-500 dark:text-gray-400">
                    {row.created}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                        View
                      </button>
                      {row.status !== "rejected" && (
                        <button className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50">
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- Bottom row: Quick Actions + Alerts ---- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Actions Panel */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <button
                key={action}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50 hover:shadow active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-750"
              >
                {action}
              </button>
            ))}
          </div>
        </section>

        {/* Alerts / Notifications Panel */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
            Alerts &amp; Notifications
          </h2>
          <div className="space-y-3">
            {alerts.map((a, i) => {
              const style = alertStyle(a.severity);
              return (
                <div
                  key={i}
                  className={`flex gap-3 rounded-md border-l-4 ${style.border} ${style.bg} p-3.5`}
                >
                  <span className="mt-0.5 text-base">{style.icon}</span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {style.label}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                      {a.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
