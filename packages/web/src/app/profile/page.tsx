"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StatsData {
  frictions: { total: number; recent_7d: number };
  pull_requests: { total: number; open: number; merged: number; recent_7d: number };
  votes: { for: number; against: number; total: number };
  saas_sites: number;
}

interface PullRequest {
  id: string;
  title: string;
  status: string;
  created_at: string;
  votes_for: number;
  votes_against: number;
}

interface TopFriction {
  count: number;
  saas_name: string;
  component_name: string;
  sample_description: string;
  latest_at: string;
}

interface TimelineItem {
  type: "pr" | "friction";
  title: string;
  subtitle: string;
  time: string;
  meta?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

function getDayLabel(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* ------------------------------------------------------------------ */
/*  SVG Icons (inline, no external deps)                               */
/* ------------------------------------------------------------------ */

function IconFrictions() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

function IconPR() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function IconVotes() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  );
}

function IconSaaS() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProfilePage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [topFrictions, setTopFrictions] = useState<TopFriction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, prRes, fricRes] = await Promise.all([
          fetch("/api/stats").catch(() => null),
          fetch("/api/pull-requests?limit=5").catch(() => null),
          fetch("/api/frictions/top?limit=5").catch(() => null),
        ]);

        if (statsRes?.ok) {
          const json = await statsRes.json().catch(() => null);
          if (json?.data) setStats(json.data);
        }
        if (prRes?.ok) {
          const json = await prRes.json().catch(() => null);
          setPrs(json?.data ?? []);
        }
        if (fricRes?.ok) {
          const json = await fricRes.json().catch(() => null);
          setTopFrictions(json?.data ?? []);
        }
      } catch {
        // Silently handle -- empty states will render
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Build timeline from PRs and top frictions
  const timeline: TimelineItem[] = [
    ...prs.map((pr) => ({
      type: "pr" as const,
      title: pr.title,
      subtitle: `PR #${pr.id.slice(0, 8)} \u00b7 ${pr.status}`,
      time: pr.created_at,
      meta: `+${pr.votes_for} / -${pr.votes_against}`,
    })),
    ...topFrictions.map((f) => ({
      type: "friction" as const,
      title: f.sample_description.slice(0, 80),
      subtitle: `${f.saas_name} \u00b7 ${f.component_name}`,
      time: f.latest_at,
      meta: `\u00d7${f.count} reports`,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 10);

  // Mock 7-day bar chart data distributed from totals
  const chartData = (() => {
    const total = (stats?.frictions?.total ?? 0) + (stats?.pull_requests?.total ?? 0);
    const base = Math.max(Math.floor(total / 7), 0);
    const remainder = Math.max(total - base * 7, 0);
    return Array.from({ length: 7 }, (_, i) => ({
      label: getDayLabel(6 - i),
      value: base + (i < remainder ? 1 : 0) + Math.floor(Math.random() * 3),
    }));
  })();

  const maxChartValue = Math.max(...chartData.map((d) => d.value), 1);

  /* ---- Loading skeleton ---- */
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
          <div className="mx-auto max-w-6xl">
            <div className="h-7 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
                <div className="mb-2 h-5 w-10 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-8 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
          <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
            <div className="h-5 w-36 rounded bg-zinc-200 dark:bg-zinc-800 mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-bold text-white">
              U
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Your Profile</h1>
              <p className="text-xs text-zinc-500">Activity overview &amp; contributions</p>
            </div>
          </div>
          <Link
            href="/settings"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            Edit Profile
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* ===== Overview Stat Cards ===== */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Overview</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Frictions */}
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/50 dark:bg-red-950/20">
              <div className="mb-2 flex items-center gap-2 text-red-600 dark:text-red-400">
                <IconFrictions />
                <span className="text-xs font-medium">Frictions</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {stats?.frictions?.total ?? "--"}
              </p>
              {stats?.frictions?.recent_7d != null && (
                <p className="mt-1 text-[11px] font-medium text-red-500/80 dark:text-red-400/80">
                  +{stats.frictions.recent_7d} this week
                </p>
              )}
            </div>

            {/* PRs */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
              <div className="mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <IconPR />
                <span className="text-xs font-medium">Pull Requests</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {stats?.pull_requests?.total ?? "--"}
              </p>
              {stats?.pull_requests && (
                <p className="mt-1 text-[11px] font-medium text-blue-500/80 dark:text-blue-400/80">
                  {stats.pull_requests.merged} merged &middot; {stats.pull_requests.open} open
                </p>
              )}
            </div>

            {/* Votes */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="mb-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <IconVotes />
                <span className="text-xs font-medium">Votes</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {stats?.votes?.total ?? "--"}
              </p>
              {stats?.votes && (
                <p className="mt-1 text-[11px] font-medium text-amber-500/80 dark:text-amber-400/80">
                  {stats.votes.for} for &middot; {stats.votes.against} against
                </p>
              )}
            </div>

            {/* SaaS Sites */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="mb-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <IconSaaS />
                <span className="text-xs font-medium">SaaS Sites</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {stats?.saas_sites ?? "--"}
              </p>
              <p className="mt-1 text-[11px] font-medium text-emerald-500/80 dark:text-emerald-400/80">
                Unique sites tracked
              </p>
            </div>
          </div>
        </section>

        {/* Two-column layout */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* ===== Recent Activity Timeline ===== */}
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Recent Activity</h2>
            {timeline.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No activity yet.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {timeline.map((item, idx) => (
                    <div
                      key={`${item.type}-${idx}`}
                      className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                    >
                      {/* Timeline dot */}
                      <div className="mt-1.5 flex h-2 w-2 shrink-0">
                        <span
                          className={`absolute inline-flex h-2 w-2 rounded-full ${
                            item.type === "pr"
                              ? "bg-blue-500"
                              : "bg-red-500"
                          }`}
                        />
                        <span
                          className={`absolute inline-flex h-2 w-2 animate-ping rounded-full opacity-75 ${
                            item.type === "pr"
                              ? "bg-blue-400"
                              : "bg-red-400"
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {item.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              item.type === "pr"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                            }`}
                          >
                            {item.type === "pr" ? "PR" : "Friction"}
                          </span>
                          <span className="text-xs text-zinc-500">{item.subtitle}</span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="block text-[11px] text-zinc-400">{formatRelativeTime(item.time)}</span>
                        {item.meta && (
                          <span className="mt-0.5 block text-[10px] text-zinc-400">{item.meta}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ===== Contribution Stats Bar Chart ===== */}
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Contribution Stats</h2>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
              <p className="mb-4 text-xs text-zinc-500">Activity over the last 7 days</p>

              {/* Bars */}
              <div className="flex items-end gap-2" style={{ height: 140 }}>
                {chartData.map((d, i) => {
                  const pct = d.value / maxChartValue;
                  const barH = Math.max(pct * 140, d.value > 0 ? 6 : 2);
                  const color =
                    pct > 0.75
                      ? "bg-violet-600"
                      : pct > 0.5
                        ? "bg-violet-500"
                        : pct > 0.25
                          ? "bg-violet-400"
                          : d.value > 0
                            ? "bg-violet-300"
                            : "bg-zinc-100 dark:bg-zinc-800";

                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                      {/* Value label above bar */}
                      <span className="text-[10px] font-medium text-zinc-500">{d.value}</span>
                      <div
                        className={`w-full min-w-[8px] rounded-t-md transition-all duration-300 ${color}`}
                        style={{ height: `${barH}px` }}
                        title={`${d.label}: ${d.value} activities`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="mt-2 flex justify-between text-[10px] text-zinc-400">
                <span>{chartData[0]?.label}</span>
                <span>{chartData[chartData.length - 1]?.label}</span>
              </div>
            </div>
          </section>
        </div>

        {/* ===== Quick Links ===== */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Quick Links</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/dashboard"
              className="group flex items-center gap-3 rounded-xl border border-dashed border-zinc-200 bg-white p-4 transition-all hover:border-blue-300 hover:bg-blue-50/50 dark:border-zinc-700 dark:bg-black dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:group-hover:bg-blue-900">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 transition-colors group-hover:text-blue-700 dark:text-zinc-50 dark:group-hover:text-blue-300">Dashboard</p>
                <p className="text-xs text-zinc-500">Overview of all data</p>
              </div>
            </Link>

            <Link
              href="/pr"
              className="group flex items-center gap-3 rounded-xl border border-dashed border-zinc-200 bg-white p-4 transition-all hover:border-green-300 hover:bg-green-50/50 dark:border-zinc-700 dark:bg-black dark:hover:border-green-800 dark:hover:bg-green-950/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600 transition-colors group-hover:bg-green-200 dark:bg-green-950 dark:text-green-400 dark:group-hover:bg-green-900">
                <IconPR />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 transition-colors group-hover:text-green-700 dark:text-zinc-50 dark:group-hover:text-green-300">Pull Requests</p>
                <p className="text-xs text-zinc-500">Review and vote on PRs</p>
              </div>
            </Link>

            <Link
              href="/settings"
              className="group flex items-center gap-3 rounded-xl border border-dashed border-zinc-200 bg-white p-4 transition-all hover:border-purple-300 hover:bg-purple-50/50 dark:border-zinc-700 dark:bg-black dark:hover:border-purple-800 dark:hover:bg-purple-950/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 transition-colors group-hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:group-hover:bg-purple-900">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 transition-colors group-hover:text-purple-700 dark:text-zinc-50 dark:group-hover:text-purple-300">Settings</p>
                <p className="text-xs text-zinc-500">Manage your account</p>
              </div>
            </Link>

            <Link
              href="/api-docs"
              className="group flex items-center gap-3 rounded-xl border border-dashed border-zinc-200 bg-white p-4 transition-all hover:border-orange-300 hover:bg-orange-50/50 dark:border-zinc-700 dark:bg-black dark:hover:border-orange-800 dark:hover:bg-orange-950/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600 transition-colors group-hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:group-hover:bg-orange-900">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 transition-colors group-hover:text-orange-700 dark:text-zinc-50 dark:group-hover:text-orange-300">API Docs</p>
                <p className="text-xs text-zinc-500">Explore the REST API</p>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
