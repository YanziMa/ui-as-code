"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type StatusLevel = "operational" | "degraded" | "partial" | "major";

interface Service {
  name: string;
  icon: string;
  status: StatusLevel;
  uptime: string;
  responseTime: number;
}

interface Incident {
  id: string;
  severity: "investigating" | "identified" | "monitoring" | "resolved";
  title: string;
  services: string[];
  startedAt: string;
  endedAt?: string;
  duration?: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/*  Sample data                                                        */
/* ------------------------------------------------------------------ */

const SERVICES: Service[] = [
  { name: "API", icon: "\u{1F5A5}\uFE0F", status: "operational", uptime: "99.98%", responseTime: 42 },
  { name: "Web App", icon: "\u{1F310}", status: "operational", uptime: "99.95%", responseTime: 118 },
  { name: "Diff Generator", icon: "\u{1F4D6}", status: "degraded", uptime: "99.72%", responseTime: 340 },
  { name: "AI Pipeline", icon: "\u{1F9E0}", status: "operational", uptime: "99.91%", responseTime: 890 },
  { name: "Database", icon: "\u{1F4BE}", status: "operational", uptime: "99.99%", responseTime: 3 },
  { name: "CDN", icon: "\u{1F30D}", status: "operational", uptime: "99.97%", responseTime: 22 },
  { name: "Authentication", icon: "\u{1F512}", status: "operational", uptime: "100.00%", responseTime: 65 },
  { name: "Email Service", icon: "\u{2709}\uFE0F", status: "operational", uptime: "99.94%", responseTime: 180 },
  { name: "Webhook Processing", icon: "\u{1F4E8}\uFE0F", status: "operational", uptime: "99.89%", responseTime: 95 },
  { name: "Browser Extension API", icon: "\u{1F383}", status: "operational", uptime: "99.96%", responseTime: 55 },
];

const INCIDENTS: Incident[] = [
  {
    id: "inc-001",
    severity: "resolved",
    title: "Diff Generator experiencing elevated latency",
    services: ["Diff Generator"],
    startedAt: "2026-04-09T14:22:00Z",
    endedAt: "2026-04-09T16:47:00Z",
    duration: "2h 25m",
    description:
      "Our Diff Generator service experienced elevated latency due to a surge in concurrent diff processing requests. We scaled the worker pool and added rate limiting to prevent future occurrences.",
  },
  {
    id: "inc-002",
    severity: "resolved",
    title: "Intermittent authentication failures for SSO users",
    services: ["Authentication"],
    startedAt: "2026-04-03T08:15:00Z",
    endedAt: "2026-04-03T10:02:00Z",
    duration: "1h 47m",
    description:
      "A misconfigured OAuth token rotation policy caused intermittent 401 errors for SSO users. The policy was reverted and a validation gate was added to future deployments.",
  },
  {
    id: "inc-003",
    severity: "resolved",
    title: "CDN cache invalidation delay in APAC region",
    services: ["CDN"],
    startedAt: "2026-03-28T01:40:00Z",
    endedAt: "2026-03-28T04:15:00Z",
    duration: "2h 35m",
    description:
      "Cache invalidation propagation to APAC edge nodes was delayed by up to 12 minutes following a configuration drift incident. Edge sync intervals have been tightened.",
  },
  {
    id: "inc-004",
    severity: "resolved",
    title: "Database replica lag under write-heavy workload",
    services: ["Database"],
    startedAt: "2026-03-21T17:00:00Z",
    endedAt: "2026-03-21T18:30:00Z",
    duration: "1h 30m",
    description:
      "Primary-to-replica replication lag spiked during a bulk migration job, causing stale reads on some endpoints. Read queries were temporarily routed to the primary.",
  },
  {
    id: "inc-005",
    severity: "resolved",
    title: "Webhook delivery retries queue backlog",
    services: ["Webhook Processing"],
    startedAt: "2026-03-14T11:20:00Z",
    endedAt: "2026-03-14T13:45:00Z",
    duration: "2h 25m",
    description:
      "A downstream consumer endpoint returned sustained 5xx errors, causing our webhook retry queue to back up. The failing consumer was identified and paused; deliveries resumed after the consumer recovered.",
  },
  {
    id: "inc-006",
    severity: "resolved",
    title: "AI Pipeline inference timeouts for large payloads",
    services: ["AI Pipeline"],
    startedAt: "2026-03-07T06:50:00Z",
    endedAt: "2026-03-07T09:10:00Z",
    duration: "2h 20m",
    description:
      "Requests with payloads exceeding 2 MB triggered GPU memory pressure and timed out. Request size limits were enforced at the gateway layer and auto-scaling thresholds were adjusted.",
  },
  {
    id: "inc-007",
    severity: "resolved",
    title: "Email service delivery delays for transactional mail",
    services: ["Email Service"],
    startedAt: "2026-02-27T22:10:00Z",
    endedAt: "2026-02-28T00:55:00Z",
    duration: "2h 45m",
    description:
      "An upstream SMTP provider outage caused delivery delays of up to 30 minutes for transactional emails. Failover to a secondary provider has been configured.",
  },
  {
    id: "inc-008",
    severity: "resolved",
    title: "Partial API outage — degraded error rates on /v2 endpoints",
    services: ["API"],
    startedAt: "2026-02-18T13:05:00Z",
    endedAt: "2026-02-18T14:20:00Z",
    duration: "1h 15m",
    description:
      "A faulty canary release introduced a regression in request parsing for v2 API routes. The canary was rolled back within 8 minutes and full service was restored.",
  },
  {
    id: "inc-009",
    severity: "resolved",
    title: "Browser Extension API rate limit exhaustion",
    services: ["Browser Extension API"],
    startedAt: "2026-02-10T16:30:00Z",
    endedAt: "2026-02-10T17:45:00Z",
    duration: "1h 15m",
    description:
      "A coordinated burst of requests from a subset of extension users exhausted shared rate-limit buckets. Per-user quotas have been implemented to isolate impact.",
  },
  {
    id: "inc-010",
    severity: "resolved",
    title: "Web App deployment rollback due to routing bug",
    services: ["Web App"],
    startedAt: "2026-02-02T04:18:00Z",
    endedAt: "2026-02-02T05:42:00Z",
    duration: "1h 24m",
    description:
      "A frontend deployment introduced a client-side routing regression that broke deep-link navigation for authenticated pages. Rolled back to previous stable build; additional e2e coverage added.",
  },
];

/* Generate pseudo-random 90-day uptime segments (deterministic) */
function generateUptimeBars(): { color: string; width: string }[][] {
  const rows: { color: string; width: string }[][] = [];
  const seed = 42;
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647), s / 2147483647);
  for (let d = 0; d < 90; d++) {
    const r = rand();
    if (r > 0.92) {
      // red day
      rows.push([{ color: "bg-red-500", width: "100%" }]);
    } else if (r > 0.84) {
      // partial yellow
      const split = Math.floor(rand() * 70 + 10);
      rows.push([
        { color: "bg-green-500", width: `${split}%` },
        { color: "bg-yellow-400", width: `${100 - split}%` },
      ]);
    } else {
      rows.push([{ color: "bg-green-500", width: "100%" }]);
    }
  }
  return rows;
}

const UPTIME_BARS = generateUptimeBars();

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusConfig(level: StatusLevel) {
  switch (level) {
    case "operational":
      return { label: "Operational", dot: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" };
    case "degraded":
      return { label: "Degraded Performance", dot: "bg-yellow-400", text: "text-yellow-600", bg: "bg-yellow-50" };
    case "partial":
      return { label: "Partial Outage", dot: "bg-orange-500", text: "text-orange-600", bg: "bg-orange-50" };
    case "major":
      return { label: "Major Outage", dot: "bg-red-500", text: "text-red-600", bg: "bg-red-50" };
  }
}

function severityConfig(sev: Incident["severity"]) {
  switch (sev) {
    case "investigating":
      return { label: "Investigating", cls: "bg-red-100 text-red-700 ring-red-600/20" };
    case "identified":
      return { label: "Identified", cls: "bg-orange-100 text-orange-700 ring-orange-600/20" };
    case "monitoring":
      return { label: "Monitoring", cls: "bg-yellow-100 text-yellow-700 ring-yellow-600/20" };
    case "resolved":
      return { label: "Resolved", cls: "bg-emerald-100 text-emerald-700 ring-emerald-600/20" };
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function StatusPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Determine overall status from worst service
  const overallStatus: StatusLevel = (() => {
    if (SERVICES.some((s) => s.status === "major")) return "major";
    if (SERVICES.some((s) => s.status === "partial")) return "partial";
    if (SERVICES.some((s) => s.status === "degraded")) return "degraded";
    return "operational";
  })();

  const overall = statusConfig(overallStatus);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubscribed(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ---------- Overall status banner ---------- */}
      <section className={`border-b ${overall.bg}`}>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-3 rounded-full border px-5 py-2 bg-white shadow-sm mb-6">
            <span className={`relative flex h-3 w-3`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${overall.dot} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${overall.dot}`} />
            </span>
            <span className={`font-semibold ${overall.text}`}>{overall.label}</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Systems Status
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            Real-time operational status for all UI-as-Code services
          </p>

          <div className="mt-6 flex items-center justify-center gap-8 text-sm text-gray-500">
            <div>
              <span className="font-medium text-gray-900">99.9%</span> uptime over last 90 days
            </div>
            <div>
              Last checked{" "}
              <span className="font-medium text-gray-900">
                {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-12">

        {/* ---------- Uptime timeline bar ---------- */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
            90-Day Uptime
          </h2>
          <div className="rounded-xl border bg-white p-4 shadow-sm overflow-hidden">
            <div className="flex gap-[2px]">
              {UPTIME_BARS.map((segments, i) => (
                <div key={i} className="flex-1 h-8 rounded-sm overflow-hidden group relative" title={`Day ${i + 1}`}>
                  {segments.map((seg, j) => (
                    <div key={j} className={`h-full ${seg.color}`} style={{ width: seg.width }} />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <span>90 days ago</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" /> Operational</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-400" /> Degraded</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" /> Outage</span>
              </div>
              <span>Today</span>
            </div>
          </div>
        </section>

        {/* ---------- Service grid ---------- */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Services
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {SERVICES.map((svc) => {
              const cfg = statusConfig(svc.status);
              return (
                <div
                  key={svc.name}
                  className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">{svc.icon}</span>
                    <span className="font-semibold text-gray-900 text-sm">{svc.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                    <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{svc.uptime} uptime</span>
                    <span>{svc.responseTime} ms</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------- Incident timeline ---------- */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Incident History &mdash; Past 90 Days
          </h2>
          <div className="space-y-4">
            {INCIDENTS.map((inc) => {
              const sev = severityConfig(inc.severity);
              const open = expandedId === inc.id;
              return (
                <article
                  key={inc.id}
                  className="rounded-xl border bg-white shadow-sm overflow-hidden"
                >
                  {/* Header row — clickable */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : inc.id)}
                    className="w-full text-left px-6 py-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${sev.cls}`}
                        >
                          {sev.label}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                            {inc.title}
                          </h3>
                          <p className="mt-1 text-xs text-gray-500 truncate">
                            Affected: {inc.services.join(", ")} &middot; Started {fmtDate(inc.startedAt)}
                            {inc.duration && ` \u00B7 Duration ${inc.duration}`}
                          </p>
                        </div>
                      </div>
                      <svg
                        className={`shrink-0 h-5 w-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Collapsible detail body */}
                  {open && (
                    <div className="border-t px-6 py-5 bg-gray-50/60">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm mb-4">
                        <div>
                          <dt className="text-gray-500">Started</dt>
                          <dd className="font-medium text-gray-900">{fmtDate(inc.startedAt)}</dd>
                        </div>
                        {inc.endedAt && (
                          <div>
                            <dt className="text-gray-500">Resolved</dt>
                            <dd className="font-medium text-gray-900">{fmtDate(inc.endedAt)}</dd>
                          </div>
                        )}
                        {inc.duration && (
                          <div>
                            <dt className="text-gray-500">Duration</dt>
                            <dd className="font-medium text-gray-900">{inc.duration}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-gray-500">Affected Services</dt>
                          <dd className="font-medium text-gray-900">{inc.services.join(", ")}</dd>
                        </div>
                      </dl>
                      <div>
                        <dt className="text-sm text-gray-500 mb-1">Details</dt>
                        <p className="text-sm text-gray-700 leading-relaxed">{inc.description}</p>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* ---------- Subscribe section ---------- */}
        <section className="rounded-2xl border bg-white p-8 shadow-sm text-center">
          <h2 className="text-lg font-semibold text-gray-900">Stay informed</h2>
          <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
            Get notified when incidents occur or are resolved.
          </p>

          {!subscribed ? (
            <form onSubmit={handleSubscribe} className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
              <label htmlFor="status-email" className="sr-only">Email address</label>
              <input
                id="status-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full sm:w-72 rounded-lg border-gray-300 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="w-full sm:w-auto rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
              >
                Subscribe
              </button>
            </form>
          ) : (
            <p className="mt-5 text-sm font-medium text-emerald-600">
              You&apos;re subscribed! Check your inbox for a confirmation email.
            </p>
          )}

          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
            <a href="/status/rss" className="hover:text-indigo-600 underline underline-offset-2">
              RSS Feed
            </a>
            <span aria-hidden="true">&middot;</span>
            <a href="/status/json" className="hover:text-indigo-600 underline underline-offset-2">
              JSON Endpoint
            </a>
            <span aria-hidden="true">&middot;</span>
            <a href="/status/history" className="hover:text-indigo-600 underline underline-offset-2">
              Full History
            </a>
          </div>
        </section>

        {/* ---------- Footer metrics ---------- */}
        <footer className="border-t pt-8 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="rounded-xl bg-white p-5 shadow-sm border">
              <p className="text-2xl font-bold text-gray-900">78 ms</p>
              <p className="text-xs text-gray-500 mt-1">Avg Response Time (30d)</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm border">
              <p className="text-2xl font-bold text-gray-900">{INCIDENTS.length}</p>
              <p className="text-xs text-gray-500 mt-1">Incidents This Month</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm border">
              <p className="text-2xl font-bold text-gray-900">1h 52m</p>
              <p className="text-xs text-gray-500 mt-1">Mean Time to Resolve</p>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-gray-400">
            UI-as-Code Status Page &middot; Data refreshes automatically every 60 seconds.
          </p>
        </footer>
      </main>
    </div>
  );
}
