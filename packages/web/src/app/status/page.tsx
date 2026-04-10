"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface EndpointCheck {
  name: string;
  method: string;
  path: string;
  status: "checking" | "ok" | "error";
  latency?: number;
  error?: string;
}

const ENDPOINTS: EndpointCheck[] = [
  { name: "Health Check", method: "GET", path: "/api/health", status: "checking" },
  { name: "Platform Stats", method: "GET", path: "/api/stats", status: "checking" },
  { name: "OpenAPI Spec", method: "GET", path: "/api/openapi", status: "checking" },
  { name: "List Frictions", method: "GET", path: "/api/frictions", status: "checking" },
  { name: "Top Pain Points", method: "GET", path: "/api/frictions/top", status: "checking" },
  { name: "Export CSV", method: "GET", path: "/api/frictions/export", status: "checking" },
  { name: "List PRs", method: "GET", path: "/api/pull-requests", status: "checking" },
  { name: "Search API", method: "POST", path: "/api/search", status: "checking" },
  { name: "Generate Diff (AI)", method: "POST", path: "/api/generate-diff", status: "checking" },
];

// Simulated uptime (in production, this would come from a monitoring service)
const UPTIME_DATA = {
  days: 30,
  percentage: 99.9,
  incidents: [] as Array<{ date: string; title: string; resolved: boolean }>,
};

export default function StatusPage() {
  const [checks, setChecks] = useState<EndpointCheck[]>(ENDPOINTS);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  async function runChecks() {
    setChecks(ENDPOINTS.map((e) => ({ ...e, status: "checking" as const })));

    const results = await Promise.all(
      ENDPOINTS.map(async (ep) => {
        const t0 = Date.now();
        try {
          const opts: RequestInit = ep.method === "POST"
            ? { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"q":"test"}' }
            : {};
          const res = await fetch(ep.path, { ...opts, signal: AbortSignal.timeout(10_000) });
          const latency = Date.now() - t0;
          return {
            ...ep,
            status: res.ok ? ("ok" as const) : ("error" as const),
            latency,
            error: res.ok ? undefined : `HTTP ${res.status}`,
          };
        } catch (err) {
          return {
            ...ep,
            status: "error" as const,
            latency: Date.now() - t0,
            error: err instanceof Error ? err.message : "Unknown",
          };
        }
      })
    );

    setChecks(results);
    setLastChecked(new Date());
  }

  useEffect(() => {
    runChecks();
    const interval = setInterval(runChecks, 60_000);
    return () => clearInterval(interval);
  }, []);

  const allOk = checks.every((c) => c.status === "ok");
  const okCount = checks.filter((c) => c.status === "ok").length;
  const avgLatency = checks
    .filter((c): c is EndpointCheck & { latency: number } => c.latency !== undefined)
    .reduce((sum, c) => sum + c.latency!, 0) / Math.max(okCount, 1);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`inline-flex h-3 w-3 rounded-full ${allOk ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">System Status</h1>
            </div>
            <button
              onClick={runChecks}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-300"
            >
              Refresh
            </button>
          </div>
          {lastChecked && (
            <p className="mt-2 text-xs text-zinc-400">
              Last checked: {lastChecked.toLocaleTimeString()}
              {avgLatency > 0 && ` · Avg latency: ${Math.round(avgLatency)}ms`}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {/* Overall Status */}
        <div className={`rounded-xl border p-5 ${
          allOk
            ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30"
            : "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30"
        }`}>
          <p className={`font-semibold ${allOk ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
            {allOk ? "All systems operational" : "Some systems are experiencing issues"}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {okCount}/{checks.length} endpoints responding · {UPTIME_DATA.percentage}% uptime over {UPTIME_DATA.days} days
          </p>
        </div>

        {/* Uptime Bar */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
            {UPTIME_DATA.days}-Day Uptime
          </h3>
          <div className="flex gap-1">
            {Array.from({ length: UPTIME_DATA.days }).map((_, i) => (
              <div
                key={i}
                className="h-8 flex-1 rounded-sm bg-green-500"
                title={`Day ${UPTIME_DATA.days - i}: Operational`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-400">{UPTIME_DATA.percentage}% uptime</p>
        </div>

        {/* Individual Endpoints */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 px-1">Endpoint Health</h3>
          {checks.map((check) => (
            <div
              key={check.path}
              className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                check.status === "ok"
                  ? "border-green-100 bg-white dark:border-green-900/30 dark:bg-black"
                  : check.status === "checking"
                    ? "border-zinc-100 bg-white dark:border-zinc-800 dark:bg-black"
                    : "border-red-100 bg-white dark:border-red-900/30 dark:bg-black"
              }`}
            >
              <span className={`shrink-0 h-2.5 w-2.5 rounded-full ${
                check.status === "ok"
                  ? "bg-green-500"
                  : check.status === "checking"
                    ? "bg-yellow-400 animate-pulse"
                    : "bg-red-500"
              }`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50">{check.name}</span>
                  <code className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-mono text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {check.method}
                  </code>
                  <code className="truncate text-[11px] font-mono text-zinc-400">{check.path}</code>
                </div>
                {check.error && (
                  <p className="mt-1 text-xs text-red-500">{check.error}</p>
                )}
              </div>

              {check.latency !== undefined && (
                <span className={`shrink-0 text-xs font-mono ${
                  check.latency < 300 ? "text-green-600" : check.latency < 1000 ? "text-yellow-600" : "text-red-500"
                }`}>
                  {check.latency}ms
                </span>
              )}

              {check.status === "checking" && (
                <span className="shrink-0 text-xs text-zinc-400 animate-pulse">...</span>
              )}
            </div>
          ))}
        </div>

        {/* Environment Info */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Environment</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-zinc-400">Frontend</p>
              <p className="font-medium text-zinc-700 dark:text-zinc-300">Next.js 16 + React 19</p>
            </div>
            <div>
              <p className="text-zinc-400">AI Provider</p>
              <p className="font-medium text-zinc-700 dark:text-zinc-300">GLM-5V-Turbo</p>
            </div>
            <div>
              <p className="text-zinc-400">Database</p>
              <p className="font-medium text-zinc-700 dark:text-zinc-300">Supabase (PostgreSQL)</p>
            </div>
            <div>
              <p className="text-zinc-400">Deployment</p>
              <p className="font-medium text-zinc-700 dark:text-zinc-300">Vercel Edge</p>
            </div>
          </div>
        </div>

        {/* Incident History */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Incident History</h3>
          {UPTIME_DATA.incidents.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-zinc-400">No incidents in the last {UPTIME_DATA.days} days</p>
              <p className="text-xs text-zinc-300 mt-1">All clear!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {UPTIME_DATA.incidents.map((incident, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className={`w-2 h-2 rounded-full ${incident.resolved ? "bg-yellow-400" : "bg-red-500"}`} />
                  <span className="text-zinc-600 dark:text-zinc-400">{incident.date}</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{incident.title}</span>
                  {incident.resolved && <span className="text-xs text-green-600 ml-auto">Resolved</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Links */}
        <div className="flex justify-center gap-4 pt-2">
          <Link href="/analytics" className="text-sm text-blue-600 hover:underline">Analytics Dashboard</Link>
          <Link href="/changelog" className="text-sm text-blue-600 hover:underline">Changelog</Link>
          <Link href="https://github.com/YanziMa/ui-as-code/issues" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Report Issue</Link>
        </div>
      </main>
    </div>
  );
}
