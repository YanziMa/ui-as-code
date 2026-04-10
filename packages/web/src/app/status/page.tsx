"use client";

import { useState, useEffect } from "react";

interface EndpointCheck {
  name: string;
  method: string;
  path: string;
  status: "checking" | "ok" | "error";
  latency?: number;
  error?: string;
}

const ENDPOINTS = [
  { name: "Health Check", method: "GET", path: "/api/health" },
  { name: "Generate Diff (AI)", method: "POST", path: "/api/generate-diff" },
  { name: "List Frictions", method: "GET", path: "/api/frictions" },
  { name: "Top Pain Points", method: "GET", path: "/api/frictions/top" },
  { name: "Export CSV", method: "GET", path: "/api/frictions/export" },
  { name: "List PRs", method: "GET", path: "/api/pull-requests" },
  { name: "Platform Stats", method: "GET", path: "/api/stats" },
];

export default function StatusPage() {
  const [checks, setChecks] = useState<EndpointCheck[]>(
    ENDPOINTS.map((e) => ({ ...e, status: "checking" }))
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  async function runChecks() {
    setChecks(ENDPOINTS.map((e) => ({ ...e, status: "checking" as const })));
    const start = Date.now();

    const results = await Promise.all(
      ENDPOINTS.map(async (ep) => {
        const t0 = Date.now();
        try {
          const opts: RequestInit = ep.method === "POST"
            ? { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
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
    // Auto-refresh every 60s
    const interval = setInterval(runChecks, 60_000);
    return () => clearInterval(interval);
  }, []);

  const allOk = checks.every((c) => c.status === "ok");
  const avgLatency =
    checks.filter((c): c is EndpointCheck & { latency: number } => c.latency !== undefined)
      .reduce((sum, c) => sum + c.latency!, 0) / checks.length;

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
        {/* Overall status */}
        <div className={`rounded-xl border p-5 ${
          allOk
            ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30"
            : "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30"
        }`}>
          <p className={`font-semibold ${allOk ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
            {allOk ? "All systems operational" : "Some systems are experiencing issues"}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {checks.filter((c) => c.status === "ok").length}/{checks.length} endpoints responding
          </p>
        </div>

        {/* Individual endpoints */}
        <div className="space-y-2">
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
              {/* Status dot */}
              <span className={`shrink-0 h-2.5 w-2.5 rounded-full ${
                check.status === "ok"
                  ? "bg-green-500"
                  : check.status === "checking"
                    ? "bg-yellow-400 animate-pulse"
                    : "bg-red-500"
              }`} />

              {/* Info */}
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

              {/* Latency */}
              {check.latency !== undefined && (
                <span className={`shrink-0 text-xs font-mono ${
                  check.latency < 500 ? "text-green-600" : check.latency < 2000 ? "text-yellow-600" : "text-red-500"
                }`}>
                  {check.latency}ms
                </span>
              )}

              {/* Checking spinner */}
              {check.status === "checking" && (
                <span className="shrink-0 text-xs text-zinc-400">...</span>
              )}
            </div>
          ))}
        </div>

        {/* Environment info */}
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
      </main>
    </div>
  );
}
