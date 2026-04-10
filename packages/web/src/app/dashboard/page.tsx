"use client";

import { useState, useEffect } from "react";
import type { PullRequest, Friction } from "@/types";
import { useToast } from "@/components/toast";
import {
  StatCardSkeleton,
  CardSkeleton,
  PageLoader,
} from "@/components/skeleton";

interface TopFriction {
  count: number;
  saas_name: string;
  component_name: string;
  sample_description: string;
  latest_at: string;
}

export default function DashboardPage() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [frictions, setFrictions] = useState<Friction[]>([]);
  const [topFrictions, setTopFrictions] = useState<TopFriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        const [prRes, fricRes, topRes] = await Promise.all([
          fetch("/api/pull-requests"),
          fetch("/api/frictions"),
          fetch("/api/frictions/top"),
        ]);

        if (!prRes.ok || !fricRes.ok) throw new Error("Failed to load data");

        const [prData, fricData, topData] = await Promise.all([
          prRes.json(),
          fricRes.json(),
          topRes.json().catch(() => ({ data: [] })),
        ]);
        setPrs(prData.data || []);
        setFrictions(fricData.data || []);
        setTopFrictions(topData.data || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        addToast({ type: "error", title: "Failed to load dashboard", message });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [addToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
          <div className="mx-auto max-w-6xl flex items-center justify-between">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <CardSkeleton />
          <CardSkeleton />
        </main>
      </div>
    );
  }

  if (error && frictions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalSubmissions = frictions.length;
  const adoptedCount = prs.filter((pr) => pr.status === "merged").length;
  const openPRCount = prs.filter((pr) => pr.status === "open").length;
  const totalVotes = prs.reduce((sum, pr) => sum + pr.votes_for + pr.votes_against, 0);
  const uniqueSaaS = [...new Set(frictions.map((f) => f.saas_name))].length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
          <a href="/" className="text-sm text-blue-600 hover:text-blue-700">Back to Home</a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-10">
          <StatCard label="Submissions" value={totalSubmissions} icon="📝" />
          <StatCard label="PRs Created" value={prs.length} icon="🔀" accent />
          <StatCard label="Merged" value={adoptedCount} icon="✅" success />
          <StatCard label="Open PRs" value={openPRCount} icon="📌" />
          <StatCard label="Total Votes" value={totalVotes} icon="🗳" />
          <StatCard label="SaaS Sites" value={uniqueSaaS} icon="🌐" />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Top Pain Points */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                🔥 Top Pain Points
              </h2>
              <span className="text-xs text-zinc-400">Most reported issues</span>
            </div>
            {topFrictions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No pain point data yet. Start using the extension!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {topFrictions.slice(0, 8).map((item, i) => (
                  <div
                    key={`${item.saas_name}-${item.component_name}`}
                    className="group rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-red-200 hover:shadow-sm dark:border-zinc-800 dark:bg-black dark:hover:border-red-900"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600 dark:bg-red-950 dark:text-red-400">
                          {i + 1}
                        </span>
                        <div>
                          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {item.saas_name}
                          </span>
                          <span className="ml-1.5 text-xs text-zinc-400">{item.component_name}</span>
                        </div>
                      </div>
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 dark:bg-red-950 dark:text-red-400">
                        ×{item.count}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500 line-clamp-2 dark:text-zinc-400">
                      {item.sample_description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Submissions */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                📋 Recent Submissions
              </h2>
              <span className="text-xs text-zinc-400">Latest activity</span>
            </div>
            {frictions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No submissions yet. Install the extension to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {frictions.slice(0, 8).map((f) => (
                  <div
                    key={f.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-black dark:hover:border-zinc-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                            {f.saas_name}
                          </span>
                          <span className="text-xs text-zinc-400">{f.component_name}</span>
                        </div>
                        <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
                          {f.description}
                        </p>
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-xs text-zinc-400">
                        {formatRelativeTime(f.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Quick Actions */}
        <div className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">⚡ Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="/pr"
              className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-zinc-700 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
            >
              <span className="text-lg">🔀</span>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Review PRs</p>
                <p className="text-xs text-zinc-500">Vote & merge community PRs</p>
              </div>
            </a>
            <a
              href="https://github.com/YanziMa/ui-as-code"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-200 p-4 transition-colors hover:border-green-300 hover:bg-green-50/50 dark:border-zinc-700 dark:hover:border-green-800 dark:hover:bg-green-950/30"
            >
              <span className="text-lg">📦</span>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">View Source</p>
                <p className="text-xs text-zinc-500">GitHub repository</p>
              </div>
            </a>
            <a
              href="#install"
              onClick={(e) => {
                e.preventDefault();
                if (window.location.pathname !== "/") window.location.href = "/#install";
                else document.getElementById("install")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-200 p-4 transition-colors hover:border-purple-300 hover:bg-purple-50/50 dark:border-zinc-700 dark:hover:border-purple-800 dark:hover:bg-purple-950/30"
            >
              <span className="text-lg">🧩</span>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Install Extension</p>
                <p className="text-xs text-zinc-500">Get the Chrome extension</p>
              </div>
            </a>
            <a
              href="/api/frictions/export"
              className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-200 p-4 transition-colors hover:border-orange-300 hover:bg-orange-50/50 dark:border-zinc-700 dark:hover:border-orange-800 dark:hover:bg-orange-950/30"
            >
              <span className="text-lg">📥</span>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Export Data</p>
                <p className="text-xs text-zinc-500">Download frictions as CSV</p>
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  success,
}: {
  label: string;
  value: number | string;
  icon?: string;
  accent?: boolean;
  success?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        success
          ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30"
          : accent
            ? "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30"
            : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black"
      }`}
    >
      {icon && <span className="text-lg mb-1 block">{icon}</span>}
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
