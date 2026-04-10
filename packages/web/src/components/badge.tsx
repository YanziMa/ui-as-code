"use client";

import { useState, useEffect } from "react";

interface StatsData {
  pull_requests: { total: number };
  frictions: { total: number };
}

interface BadgeProps {
  variant?: "inline" | "card" | "minimal";
  showStats?: boolean;
}

const SITE_URL = "https://ui-as-code-web.vercel.app";

/**
 * Embeddable status badge for UI-as-Code.
 * Variants: inline (default), card, minimal.
 */
export function Badge({ variant = "inline", showStats = true }: BadgeProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!showStats) { setLoading(false); return; }
    let cancelled = false;
    fetch("/api/stats")
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d) => { if (!cancelled && d?.data) setStats(d.data as StatsData); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showStats]);

  const prCount = stats?.pull_requests.total ?? (error ? "N/A" : null);
  const issueCount = stats?.frictions.total ?? (error ? "N/A" : null);

  const baseLink =
    "inline-flex items-center no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950";

  /* ── minimal ──────────────────────────────────────── */

  if (variant === "minimal") {
    return (
      <a href={SITE_URL} target="_blank" rel="noopener noreferrer"
        className={`${baseLink} rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:border-blue-300 hover:text-blue-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-300`}>
        UI-as-Code
      </a>
    );
  }

  /* ── card ─────────────────────────────────────────── */

  if (variant === "card") {
    return (
      <a href={SITE_URL} target="_blank" rel="noopener noreferrer"
        className={`${baseLink} block w-[280px] rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow dark:border-zinc-800 dark:bg-zinc-900`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 text-xs font-bold text-white shadow-sm">UI</div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-900 truncate dark:text-zinc-50">UI-as-Code</div>
            <div className="text-xs text-zinc-500 truncate dark:text-zinc-400">Turn UI friction into code changes</div>
          </div>
        </div>
        {showStats && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: "Pull Requests", value: prCount },
              { label: "Issues Found", value: issueCount },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-zinc-50 px-3 py-2.5 text-center dark:bg-zinc-800/60">
                <div className="text-lg font-bold text-zinc-900 tabular-nums dark:text-zinc-100">{loading ? "\u2014" : item.value}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{item.label}</div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />Live data</span>
          <span>View dashboard &rarr;</span>
        </div>
      </a>
    );
  }

  /* ── inline (default) ─────────────────────────────── */

  return (
    <a href={SITE_URL} target="_blank" rel="noopener noreferrer"
      className={`${baseLink} group rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-blue-300 hover:text-blue-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-300`}
      title={
        showStats && !loading
          ? `UI-as-Code \u2014 ${prCount} PRs generated, ${issueCount} issues detected`
          : "UI-as-Code \u2014 Turn UI friction into code changes"
      }>
      <span className="mr-1">\u26A1</span>UI-as-Code
      {showStats && !loading && (
        <>
          <span className="mx-1.5 text-zinc-300 group-hover:text-blue-300 dark:text-zinc-700">|</span>
          <span className="tabular-nums">{issueCount} issues</span>
          <span className="mx-1 text-zinc-300 group-hover:text-blue-300 dark:text-zinc-700">|</span>
          <span className="tabular-nums">{prCount} PRs</span>
        </>
      )}
      {showStats && loading && <span className="ml-1.5 text-zinc-400 animate-pulse">Loading\u2026</span>}
    </a>
  );
}

export default Badge;
