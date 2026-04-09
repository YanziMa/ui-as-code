"use client";

import { useState, useEffect } from "react";
import type { PullRequest, Friction } from "@/types";

export default function DashboardPage() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [frictions, setFrictions] = useState<Friction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [prRes, fricRes] = await Promise.all([
          fetch("/api/pull-requests"),
          fetch("/api/frictions"),
        ]);
        const prData = await prRes.json();
        const fricData = await fricRes.json();
        setPrs(prData.data || []);
        setFrictions(fricData.data || []);
      } catch {
        // ignore errors for now
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  const totalSubmissions = frictions.length;
  const adoptedCount = prs.filter((pr) => pr.status === "merged").length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Dashboard
          </h1>
          <a
            href="/"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Back to Home
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <StatCard label="Total Submissions" value={totalSubmissions} />
          <StatCard label="PRs Created" value={prs.length} />
          <StatCard label="Adopted & Merged" value={adoptedCount} accent />
        </div>

        {/* Recent submissions */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Recent Submissions
          </h2>
          {frictions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
              <p className="text-zinc-500 dark:text-zinc-400">
                No submissions yet. Install the extension to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {frictions.map((f) => (
                <div
                  key={f.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                          {f.saas_name}
                        </span>
                        <span className="text-xs text-zinc-400">{f.component_name}</span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                        {f.description}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-zinc-400">
                      {new Date(f.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        accent
          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black"
      }`}
    >
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}
