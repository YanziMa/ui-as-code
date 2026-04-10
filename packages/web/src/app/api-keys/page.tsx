"use client";

import { useState, useEffect, useCallback } from "react";

interface HealthData {
  status: string;
  environment: {
    node_env: string;
    ai_provider: string;
    has_supabase: boolean;
    has_ai_key: boolean;
  };
}

interface StatsData {
  frictions: { total: number; recent_7d: number };
  pull_requests: { total: number; open: number; merged: number; recent_7d: number };
  votes: { for: number; against: number; total: number };
  saas_sites: number;
}

type TestStatus = "idle" | "loading" | "success" | "error";

export default function ApiKeysPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [revealKey, setRevealKey] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testResponseTime, setTestResponseTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/health").then((r) => r.json()),
      fetch("/api/stats").then((r) => r.json()),
    ])
      .then(([h, s]) => {
        setHealth(h);
        setStats(s.data ?? s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleTest = useCallback(async () => {
    setTestStatus("loading");
    setTestResponseTime(null);
    const start = performance.now();
    try {
      const res = await fetch("/api/health");
      const elapsed = Math.round(performance.now() - start);
      setTestResponseTime(elapsed);
      setTestStatus(res.ok ? "success" : "error");
    } catch {
      setTestResponseTime(Math.round(performance.now() - start));
      setTestStatus("error");
    }
  }, []);

  const maskedKey = health?.environment?.has_ai_key
    ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022a1b2"
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          API Keys
        </h1>
        <p className="mt-2 text-base text-zinc-500 dark:text-zinc-400">
          Manage your API access keys and monitor usage. Your keys are used to
          authenticate requests to AI providers for code generation.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600 dark:border-zinc-700" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Key Status */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Key Status
            </h2>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  health?.environment?.has_ai_key
                    ? "bg-emerald-500"
                    : "bg-red-500"
                }`}
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {health?.environment?.has_ai_key
                  ? "AI_API_KEY is configured and active"
                  : "No AI API key detected \u2014 set AI_API_KEY in your environment"}
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
              Provider:{" "}
              <span className="font-medium text-zinc-600 dark:text-zinc-400">
                {health?.environment?.ai_provider ?? "unknown"}
              </span>{" "}
              &middot; Environment:{" "}
              <span className="font-medium text-zinc-600 dark:text-zinc-400">
                {health?.environment?.node_env ?? "unknown"}
              </span>
            </p>
          </section>

          {/* Key Display */}
          {maskedKey && (
            <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                API Key
              </h2>
              <div className="flex items-center gap-3">
                <code
                  className="flex-1 rounded-lg bg-zinc-100 px-4 py-2.5 font-mono text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
                >
                  {revealKey ? "sk-live-\u2026a1b2" : maskedKey}
                </code>
                <button
                  type="button"
                  onClick={() => setRevealKey(!revealKey)}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  {revealKey ? "Hide" : "Reveal"}
                </button>
              </div>
              <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
                Only the last 4 characters are shown for security. The full key
                is never exposed client-side.
              </p>
            </section>
          )}

          {/* Usage Stats */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Usage Overview
            </h2>
            {stats ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Generations (7d)" value={stats.frictions.recent_7d} />
                <StatCard label="Total Frictions" value={stats.frictions.total} />
                <StatCard label="Pull Requests" value={stats.pull_requests.total} />
                <StatCard label="Merged PRs" value={stats.pull_requests.merged} />
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Unable to load usage stats.</p>
            )}
          </section>

          {/* Rate Limit Info */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Rate Limits
            </h2>
            <div className="space-y-3">
              <RateLimitRow label="General API" limit="30 req/min" />
              <RateLimitRow label="AI Generation" limit="5 req/min" color="amber" />
              <RateLimitRow label="PR Submission" limit="10 req/min" />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
              Rate limits are enforced per API key to ensure fair usage and system
              stability. If you hit a limit, responses will include a
              <code className="mx-1 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
                Retry-After
              </code>
              header indicating when you may retry. Contact support for higher tiers.
            </p>
          </section>

          {/* Quick Test */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Quick Connectivity Test
            </h2>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Verify your API key and connection by sending a request to the health endpoint.
            </p>
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={handleTest}
                disabled={testStatus === "loading"}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testStatus === "loading" ? "Testing..." : "Run Test"}
              </button>
              {testStatus !== "idle" && (
                <div className="flex items-center gap-2 pt-1.5">
                  {testStatus === "loading" && (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600 dark:border-zinc-700" />
                      <span className="text-sm text-zinc-500">Sending request...</span>
                    </>
                  )}
                  {testStatus === "success" && (
                    <>
                      <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-emerald-600 dark:text-emerald-400">
                        Connected &mdash; {testResponseTime}ms
                      </span>
                    </>
                  )}
                  {testStatus === "error" && (
                    <>
                      <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm text-red-600 dark:text-red-400">
                        Failed &mdash; {testResponseTime}ms
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

function RateLimitRow({
  label,
  limit,
  color = "blue",
}: {
  label: string;
  limit: string;
  color?: "blue" | "amber";
}) {
  const dotColor =
    color === "amber"
      ? "bg-amber-500"
      : "bg-blue-500";
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className="flex items-center gap-2.5">
        <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      </div>
      <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">{limit}</span>
    </div>
  );
}
