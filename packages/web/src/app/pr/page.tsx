"use client";

import { useState, useEffect, useCallback } from "react";
import type { PullRequest } from "@/types";
import { useToast } from "@/components/toast";
import { TableSkeleton } from "@/components/skeleton";

export default function PRDashboardPage() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "merged" | "closed">("all");
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetch("/api/pull-requests")
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setPrs(data.data || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load PRs");
        addToast({
          type: "error",
          title: "Failed to load PRs",
          message: err instanceof Error ? err.message : undefined,
        });
      })
      .finally(() => setLoading(false));
  }, [addToast]);

  const filtered =
    filter === "all" ? prs : prs.filter((pr) => pr.status === filter);

  const handleVote = useCallback(async (id: string, direction: "for" | "against") => {
    try {
      const res = await fetch(`/api/pr/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote_type: direction }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setPrs((prev) =>
          prev.map((pr) => (pr.id === id ? data.data : pr))
        );
        addToast({ type: "success", title: "Vote recorded" });
      } else {
        throw new Error(data.error || "Vote failed");
      }
    } catch (err) {
      addToast({
        type: "error",
        title: "Vote failed",
        message: err instanceof Error ? err.message : undefined,
      });
    }
  }, [addToast]);

  const handleMerge = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/pr/${id}/merge`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.data) {
        setPrs((prev) =>
          prev.map((pr) => (pr.id === id ? data.data : pr))
        );
        addToast({ type: "success", title: "PR merged successfully!" });
      } else {
        throw new Error(data.error || "Merge failed");
      }
    } catch (err) {
      addToast({
        type: "error",
        title: "Merge failed",
        message: err instanceof Error ? err.message : undefined,
      });
    }
  }, [addToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
          <div className="mx-auto max-w-6xl flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                PR Review Dashboard
              </h1>
              <div className="mt-1 h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">
          <div className="mb-6 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-16 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
          <TableSkeleton rows={5} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              PR Review Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Review and manage community UI improvement proposals
            </p>
          </div>
          <a href="/" className="text-sm text-blue-600 hover:text-blue-700">
            Back to Home
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Filters */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {(["all", "open", "merged", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {f} ({f === "all" ? prs.length : prs.filter((p) => p.status === f).length})
            </button>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* PR List */}
        {filtered.length === 0 && !error ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
            <p className="text-zinc-500 dark:text-zinc-400">
              No PRs yet. They will appear here when users submit improvements.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((pr) => (
              <PRCard
                key={pr.id}
                pr={pr}
                onVote={handleVote}
                onMerge={handleMerge}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function PRCard({
  pr,
  onVote,
  onMerge,
}: {
  pr: PullRequest;
  onVote: (id: string, d: "for" | "against") => void;
  onMerge: (id: string) => void;
}) {
  const statusColors: Record<string, string> = {
    open: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900",
    merged: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900",
    closed: "bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-black dark:hover:border-zinc-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[pr.status]}`}
            >
              #{String(pr.id).slice(0, 6)} &middot; {pr.status}
            </span>
            <span className="text-xs text-zinc-400">
              {new Date(pr.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            {pr.description}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
            <span>{pr.affected_users} affected</span>
            <span className="text-green-600 font-medium">+{pr.votes_for}</span>
            <span className="text-red-500 font-medium">-{pr.votes_against}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="ml-4 flex flex-col gap-2 shrink-0">
          {pr.status === "open" && (
            <>
              <button
                onClick={() => onVote(pr.id, "for")}
                className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:border-green-900 dark:hover:bg-green-950 transition-colors"
              >
                + Vote For
              </button>
              <button
                onClick={() => onMerge(pr.id)}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Merge
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
