import {
  formatNumber,
  formatCompact,
  formatDate,
  cn,
} from "@/lib";
import { STATUS_COLORS } from "@/lib/color";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface User {
  name: string;
  email: string;
  plan: string;
  joined: string;
  status: "active" | "suspended" | "pending";
}

interface Alert {
  severity: "critical" | "warning" | "info";
  message: string;
  time: string;
}

interface Metric {
  label: string;
  value: number;
  unit?: string;
  percent: number;
  color: "blue" | "violet" | "amber";
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const users: User[] = [
  { name: "Elena Vasquez",    email: "elena.v@acmecorp.io",   plan: "Enterprise", joined: "2026-04-09T14:22:00Z", status: "active" },
  { name: "Marcus Chen",      email: "mchen@devlab.net",       plan: "Pro",        joined: "2026-04-08T09:15:00Z", status: "active" },
  { name: "Aisha Patel",      email: "aisha.p@startup.co",     plan: "Starter",    joined: "2026-04-07T16:40:00Z", status: "pending" },
  { name: "James O'Brien",    email: "jobrien@mailbox.org",     plan: "Free",       joined: "2026-04-06T11:05:00Z", status: "suspended" },
  { name: "Sofia Lindberg",   email: "sofia.l@nordic.tech",     plan: "Pro",        joined: "2026-04-05T08:30:00Z", status: "active" },
  { name: "Rajesh Kumar",     email: "rkumar@india.io",         plan: "Enterprise", joined: "2026-04-04T13:55:00Z", status: "active" },
  { name: "Lily Zhang",       email: "lily.z@designstudio.com", plan: "Starter",    joined: "2026-04-03T10:10:00Z", status: "pending" },
  { name: "Omar Hassan",      email: "omar.h@cloudsys.me",      plan: "Free",       joined: "2026-04-02T19:45:00Z", status: "active" },
];

const alerts: Alert[] = [
  { severity: "critical", message: "Database replica lag exceeded threshold (12s)", time: "5m ago" },
  { severity: "warning",  message: "High memory usage on worker-node-3 (87%)",     time: "18m ago" },
  { severity: "info",     message: "Scheduled backup completed successfully",       time: "1h ago" },
  { severity: "warning",  message: "Rate-limiting triggered for IP 203.0.113.42",   time: "2h ago" },
  { severity: "info",     message: "New SSL certificate deployed for *.app.io",     time: "3h ago" },
];

const healthMetrics: Metric[] = [
  { label: "CPU",     value: 23, percent: 23, color: "blue" },
  { label: "Memory",  value: 58, percent: 58, color: "violet" },
  { label: "Disk",    value: 41, percent: 41, color: "amber" },
];

const quickActions = [
  { icon: "\u{1F4E2}", label: "Send announcement", desc: "Broadcast a message to all users" },
  { icon: "\u{1F6A7}", label: "Manage feature flags", desc: "Toggle features per environment" },
  { icon: "\u{1F4CB}", label: "View logs",          desc: "Search & filter application logs" },
  { icon: "\u{1F4E5}", label: "Export data",         desc: "Download reports as CSV / JSON" },
];

const stats = [
  { label: "Total Users", value: formatNumber(1247), sub: "+12% from last month" },
  { label: "Active Now",  value: formatNumber(89),   sub: "Real-time count" },
  { label: "Revenue MTD", value: "$4,280",           sub: "+8.3% vs Mar" },
  { label: "Error Rate",  value: "0.3%",             sub: "Below 1% target" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusConfig(status: User["status"]) {
  switch (status) {
    case "active":    return STATUS_COLORS.success;
    case "suspended": return STATUS_COLORS.error;
    case "pending":   return STATUS_COLORS.warning;
  }
}

function alertIcon(severity: Alert["severity"]) {
  switch (severity) {
    case "critical": return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-600 dark:bg-red-950 dark:text-red-400">
        !
      </span>
    );
    case "warning": return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-[11px] font-bold text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
        &#9888;
      </span>
    );
    case "info": return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-400">
        i
      </span>
    );
  }
}

function progressColor(metric: Metric) {
  switch (metric.color) {
    case "blue":   return "bg-blue-500";
    case "violet": return "bg-violet-500";
    case "amber":  return "bg-amber-500";
  }
}

function progressTrackColor(metric: Metric) {
  switch (metric.color) {
    case "blue":   return "bg-blue-100 dark:bg-blue-950";
    case "violet": return "bg-violet-100 dark:bg-violet-950";
    case "amber":  return "bg-amber-100 dark:bg-amber-950";
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Admin Dashboard</h1>
          <a href="/" className="text-sm text-blue-600 hover:text-blue-700">Back to Home</a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Warning Banner */}
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <span aria-hidden="true">&#9888;&#xFE0F;</span>
          Admin Area &mdash; Restricted access
        </div>

        {/* Stats Row */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</p>
              <p className="mt-1 text-[11px] text-zinc-400">{stat.sub}</p>
            </div>
          ))}
        </section>

        {/* Two-column layout */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* ---- Left column: Recent Users (2/3) ---- */}
          <section className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Recent Users</h2>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <th className="px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-400">Name</th>
                      <th className="px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-400">Email</th>
                      <th className="px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-400">Plan</th>
                      <th className="px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-400">Joined</th>
                      <th className="px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-400">Status</th>
                      <th className="px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {users.map((user) => {
                      const sc = statusConfig(user.status);
                      return (
                        <tr
                          key={user.email}
                          className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30"
                        >
                          <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{user.name}</td>
                          <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className="inline-block rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              {user.plan}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">{formatDate(user.joined)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                                `bg-[${sc.bg}]`,
                                `text-[${sc.text}]`,
                              )}
                              style={{ backgroundColor: sc.bg, color: sc.text }}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                                Edit
                              </button>
                              <button className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40">
                                Suspend
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ---- Right column (1/3) ---- */}
          <aside className="space-y-6">
            {/* System Health */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">System Health</h2>
              <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black space-y-4">
                {healthMetrics.map((m) => (
                  <div key={m.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{m.label}</span>
                      <span className="tabular-nums text-zinc-500 dark:text-zinc-400">{m.value}%</span>
                    </div>
                    <div className={cn("h-2 w-full overflow-hidden rounded-full", progressTrackColor(m))}>
                      <div
                        className={cn("h-full rounded-full transition-all", progressColor(m))}
                        style={{ width: `${m.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Quick Actions</h2>
              <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
                <ul className="space-y-1">
                  {quickActions.map((action) => (
                    <li key={action.label}>
                      <button
                        className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                      >
                        <span className="mt-0.5 text-base">{action.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{action.label}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{action.desc}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recent Alerts */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Recent Alerts</h2>
              <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
                <ul className="space-y-3">
                  {alerts.map((alert, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      {alertIcon(alert.severity)}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{alert.message}</p>
                        <p className="mt-0.5 text-[11px] text-zinc-400">{alert.time}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
