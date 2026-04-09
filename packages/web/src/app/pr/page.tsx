"use client";

import { useState, useEffect } from "react";
import type { PullRequest } from "@/types";

export default function PRDashboardPage() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "merged" | "closed">("all");

  useEffect(() => {
    fetch("/api/pull-requests")
      .then((res) => res.json())
      .then((data) => {
        setPrs(data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all" ? prs : prs.filter((pr) => pr.status === filter);

  const handleVote = async (id: string, direction: "for" | "against") => {
    try {
      const res = await fetch(`/api/pr/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrs((prev) =>
          prev.map((pr) => (pr.id === id ? data.data : pr))
        );
      }
    } catch (err) {
      console.error("Vote failed:", err);
    }
  };

  const handleMerge = async (id: string) => {
    try {
      const res = await fetch(`/api/pr/${id}/merge`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPrs((prev) =>
          prev.map((pr) => (pr.id === id ? data.data : pr))
        );
      }
    } catch (err) {
      console.error("Merge failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <p className="text-zinc-500">Loading...</p>
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
        <div className="mb-6 flex gap-2">
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

        {/* PR List */}
        {filtered.length === 0 ? (
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
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-black">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[pr.status]}`}
            >
              #{String(pr.id).slice(0, 6)} · {pr.status}
            </span>
            <span className="text-xs text-zinc-400">
              {new Date(pr.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            {pr.description}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
            <span>👥 {pr.affected_users} affected</span>
            <span>✅ {pr.votes_for} votes for</span>
            <span>❌ {pr.votes_against} against</span>
          </div>
        </div>

        {/* Actions */}
        <div className="ml-4 flex flex-col gap-2">
          {pr.status === "open" && (
            <>
              <button
                onClick={() => onVote(pr.id, "for")}
                className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:border-green-900 dark:hover:bg-green-950"
              >
                👍 Vote
              </button>
              <button
                onClick={() => onMerge(pr.id)}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
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
