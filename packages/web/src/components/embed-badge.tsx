"use client";

import { useState, useEffect } from "react";

/**
 * Embeddable badge showing live UI-as-Code stats.
 * Can be used via: <script src=".../embed.js"></script>
 */
export function EmbedBadge({ compact = false }: { compact?: boolean }) {
  const [stats, setStats] = useState<{ prs: number; frictions: number } | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => d.data && setStats({ prs: d.data.pull_requests.total, frictions: d.data.frictions.total }))
      .catch(() => {});
  }, []);

  if (compact) {
    return (
      <a
        href="https://ui-as-code-web.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 no-underline hover:border-blue-300 hover:text-blue-600 transition-colors dark:border-zinc-800 dark:bg-black dark:text-zinc-400"
      >
        <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
        Powered by UI-as-Code
        {stats && (
          <>
            <span className="text-zinc-300">|</span>
            {stats.prs} PRs · {stats.frictions} reports
          </>
        )}
      </a>
    );
  }

  return (
    <a
      href="https://ui-as-code-web.vercel.app"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block rounded-xl border border-zinc-200 bg-white p-4 no-underline shadow-sm hover:shadow-md transition-shadow dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 text-[10px] font-bold text-white">
          UI
        </div>
        <div>
          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">UI-as-Code</div>
          {stats ? (
            <div className="text-[10px] text-zinc-500">{stats.prs} PRs · {stats.frictions} issues</div>
          ) : (
            <div className="text-[10px] text-zinc-400">Loading...</div>
          )}
        </div>
      </div>
    </a>
  );
}
