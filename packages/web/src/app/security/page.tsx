import type { Metadata } from "next";
import { STATUS_COLORS } from "@/lib/color";
import { formatRelativeTime, cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Security & Compliance",
  description: "Monitor security posture, review compliance status, and track security events.",
};

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Severity = "Info" | "Warning" | "Critical";
type Priority = "High" | "Medium" | "Low";
type ComplianceStatus = "Compliant" | "Not Applicable";

interface SecurityMetric {
  label: string;
  value: string;
  detail: string;
  color: keyof typeof STATUS_COLORS;
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  eventType: string;
  userOrIp: string;
  severity: Severity;
  status: string;
}

interface ComplianceBadge {
  name: string;
  status: ComplianceStatus;
}

interface Recommendation {
  priority: Priority;
  title: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const SCORE = 87;
const SCORE_LABEL = "Good";

const metrics: SecurityMetric[] = [
  {
    label: "SSL/TLS",
    value: "Valid",
    detail: "Expires in 89 days",
    color: "success",
  },
  {
    label: "CSP Headers",
    value: "Configured",
    detail: "Strict policy active",
    color: "success",
  },
  {
    label: "Data Encryption",
    value: "AES-256 / TLS 1.3",
    detail: "At rest and in transit",
    color: "success",
  },
  {
    label: "Authentication",
    value: "2FA + OAuth",
    detail: "Multi-factor available",
    color: "info",
  },
  {
    label: "API Rate Limiting",
    value: "Enabled",
    detail: "100 req/min per key",
    color: "success",
  },
  {
    label: "Audit Logging",
    value: "Active",
    detail: "Last event 2 min ago",
    color: "success",
  },
];

const events: SecurityEvent[] = [
  {
    id: "sec-001",
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    eventType: "Login",
    userOrIp: "alice@example.com (192.168.1.42)",
    severity: "Info",
    status: "Success",
  },
  {
    id: "sec-002",
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    eventType: "API Access",
    userOrIp: "sk-live-\u2026a3f1 (10.0.0.15)",
    severity: "Info",
    status: "200 OK",
  },
  {
    id: "sec-003",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    eventType: "Permission Change",
    userOrIp: "admin@company.io (172.16.3.101)",
    severity: "Warning",
    status: "Role updated",
  },
  {
    id: "sec-004",
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    eventType: "Failed Auth",
    userOrIp: "unknown (203.0.113.47)",
    severity: "Critical",
    status: "Invalid token",
  },
  {
    id: "sec-005",
    timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    eventType: "Logout",
    userOrIp: "bob@example.com (192.168.2.77)",
    severity: "Info",
    status: "Session ended",
  },
  {
    id: "sec-006",
    timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    eventType: "API Access",
    userOrIp: "sk-live-\u2027b8e2 (10.0.1.200)",
    severity: "Info",
    status: "200 OK",
  },
  {
    id: "sec-007",
    timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    eventType: "Login",
    userOrIp: "carol@team.com (172.16.0.44)",
    severity: "Info",
    status: "Success",
  },
  {
    id: "sec-008",
    timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    eventType: "Failed Auth",
    userOrIp: "unknown (198.51.100.23)",
    severity: "Critical",
    status: "Rate limited",
  },
  {
    id: "sec-009",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    eventType: "Permission Change",
    userOrIp: "admin@company.io (192.168.3.19)",
    severity: "Warning",
    status: "API key scoped",
  },
  {
    id: "sec-010",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    eventType: "API Access",
    userOrIp: "sk-live-\u2026c4d9 (10.0.2.61)",
    severity: "Info",
    status: "200 OK",
  },
];

const badges: ComplianceBadge[] = [
  { name: "SOC 2 Type II", status: "Compliant" },
  { name: "GDPR Ready", status: "Compliant" },
  { name: "CCPA Ready", status: "Compliant" },
  { name: "HIPAA", status: "Not Applicable" },
];

const recommendations: Recommendation[] = [
  {
    priority: "High",
    title: "Enable mandatory 2FA for all admin accounts",
    description:
      "Require two-factor authentication for users with admin or owner roles to prevent unauthorized access from compromised credentials.",
  },
  {
    priority: "Medium",
    title: "Rotate API keys older than 90 days",
    description:
      "3 API keys have not been rotated in over 90 days. Schedule automatic rotation or prompt owners to regenerate their keys.",
  },
  {
    priority: "Low",
    title: "Review CSP report-only mode findings",
    description:
      "Content Security Policy is currently in report-only mode for 2 domains. Evaluate the reports and enforce the policy when ready.",
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const SEVERITY_CONFIG: Record<Severity, { bgClass: string; textClass: string; dotClass: string }> = {
  Info:     { bgClass: STATUS_COLORS.info.bg,     textClass: STATUS_COLORS.info.text,     dotClass: "bg-blue-500" },
  Warning:  { bgClass: STATUS_COLORS.warning.bg,  textClass: STATUS_COLORS.warning.text,  dotClass: "bg-amber-500" },
  Critical: { bgClass: STATUS_COLORS.error.bg,    textClass: STATUS_COLORS.error.text,    dotClass: "bg-red-500" },
};

const PRIORITY_CONFIG: Record<Priority, { bgClass: string; textClass: string }> = {
  High:   { bgClass: STATUS_COLORS.error.bg,   textClass: STATUS_COLORS.error.text },
  Medium: { bgClass: STATUS_COLORS.warning.bg, textClass: STATUS_COLORS.warning.text },
  Low:    { bgClass: STATUS_COLORS.info.bg,    textClass: STATUS_COLORS.info.text },
};

/** Build the SVG circular progress arc for a given score out of 100. */
function scoreCircle(score: number): string {
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return `
    <svg viewBox="0 0 200 200" className="h-48 w-48 -rotate-90" aria-hidden="true">
      <circle cx="100" cy="100" r="${radius}" fill="none" stroke="#e4e4e7" stroke-width="12" class="dark:stroke-zinc-700" />
      <circle
        cx="100" cy="100" r="${radius}"
        fill="none"
        stroke="#22c55e"
        stroke-width="12"
        stroke-linecap="round"
        stroke-darray="${circumference}"
        stroke-dashoffset="${offset}"
        class="transition-all duration-1000"
      />
    </svg>
  `;
}

/* ------------------------------------------------------------------ */
/* Page component                                                      */
/* ------------------------------------------------------------------ */

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Security &amp; Compliance
        </h1>
        <p className="mt-2 text-base text-zinc-500 dark:text-zinc-400">
          Monitor your organization&rsquo;s security posture, review compliance
          certifications, and track recent security events.
        </p>
      </div>

      {/* Score overview + metric cards */}
      <section className="mb-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Circular score indicator */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative flex items-center justify-center">
            <span dangerouslySetInnerHTML={{ __html: scoreCircle(SCORE) }} />
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {SCORE}
              </span>
              <span className="text-sm font-medium text-zinc-400">/ 100</span>
            </div>
          </div>
          <p
            className="mt-4 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
            style={{
              backgroundColor: STATUS_COLORS.success.bg,
              color: STATUS_COLORS.success.text,
            }}
          >
            {SCORE_LABEL}
          </p>
          <p className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Overall security posture based on automated scans and configuration checks.
          </p>
        </div>

        {/* Metric cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => {
            const colors = STATUS_COLORS[metric.color];
            return (
              <div
                key={metric.label}
                className="rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {metric.label}
                    </p>
                    <p
                      className="mt-1 text-base font-semibold"
                      style={{ color: colors.text }}
                    >
                      {metric.value}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                      metric.color === "success"
                        ? "bg-emerald-100 dark:bg-emerald-900/40"
                        : "bg-blue-100 dark:bg-blue-900/40",
                    )}
                  >
                    {metric.color === "success" ? (
                      <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                  {metric.detail}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two-column layout: events table + right sidebar */}
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Recent security events table */}
        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Recent Security Events
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Last 10 security-relevant events across your workspace.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Timestamp
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Event Type
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    User / IP
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Severity
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {events.map((event) => {
                  const sev = SEVERITY_CONFIG[event.severity];
                  return (
                    <tr
                      key={event.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                        <span title={new Date(event.timestamp).toLocaleString()}>
                          {formatRelativeTime(event.timestamp)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {event.eventType}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                        {event.userOrIp}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          )}
                          style={{ backgroundColor: sev.bgClass, color: sev.textClass }}
                        >
                          <span className={cn("inline-block h-1.5 w-1.5 rounded-full", sev.dotClass)} />
                          {event.severity}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                        {event.status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right sidebar: compliance + recommendations */}
        <aside className="space-y-6">
          {/* Compliance badges */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Compliance Status
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Current certification and regulatory alignment.
            </p>
            <ul className="mt-4 space-y-3">
              {badges.map((badge) => {
                const isCompliant = badge.status === "Compliant";
                const colors = isCompliant ? STATUS_COLORS.success : STATUS_COLORS.neutral;
                return (
                  <li
                    key={badge.name}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 px-3.5 py-3 dark:border-zinc-800"
                  >
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {badge.name}
                    </span>
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {badge.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Recommendations */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Recommendations
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Actionable steps to improve your security posture.
            </p>
            <ol className="mt-4 space-y-4">
              {recommendations.map((rec) => {
                const pri = PRIORITY_CONFIG[rec.priority];
                return (
                  <li key={rec.title} className="flex gap-3">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-5 shrink-0 items-center justify-center rounded px-1.5 text-[11px] font-bold uppercase tracking-wider",
                      )}
                      style={{ backgroundColor: pri.bgClass, color: pri.textClass }}
                    >
                      {rec.priority[0]}
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                        {rec.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {rec.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
