import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API Documentation",
  description: "UI-as-Code REST API reference",
};

const BASE_URL = "https://ui-as-code-web.vercel.app";

const endpoints = [
  {
    method: "POST",
    path: "/api/generate-diff",
    description: "Generate a unified diff from a natural language description",
    body: {
      component_code: "string (required)",
      description: "string (required)",
      component_types: "string?",
      design_tokens: "object?",
      screenshot_base64: "string?",
    },
    response: "{ diff, success }",
    rateLimit: "5 req/min",
  },
  {
    method: "POST",
    path: "/api/frictions",
    description: "Record a new friction/pain point",
    body: {
      saas_name: "string (required)",
      component_name: "string (required)",
      description: "string (required)",
      screenshot_url: "string?",
    },
    response: "{ id, saas_name, ... }",
    rateLimit: "30 req/min",
  },
  {
    method: "GET",
    path: "/api/frictions",
    description: "List all friction records (latest 100)",
    response: "Friction[]",
    cache: "15s SWR",
  },
  {
    method: "GET",
    path: "/api/frictions/top",
    description: "Get top pain points grouped by SaaS + component",
    response: "{ count, saas_name, ... }[]",
    cache: "30s SWR",
  },
  {
    method: "GET",
    path: "/api/frictions/export",
    description: "Export all frictions as CSV file",
    response: "text/csv download",
  },
  {
    method: "POST",
    path: "/api/pull-requests",
    description: "Create a new PR from a diff",
    body: {
      diff_id: "string?",
      description: "string (required)",
      saas_name: "string?",
      component_name: "string?",
    },
    response: "{ id, status, votes_for, ... }",
    rateLimit: "30 req/min",
  },
  {
    method: "GET",
    path: "/api/pull-requests",
    description: "List all PRs (latest 100)",
    response: "PullRequest[]",
    cache: "15s SWR",
  },
  {
    method: "POST",
    path: "/api/pr/[id]/vote",
    description: "Vote on a PR (for or against)",
    body: { vote_type: '"for" | "against"' },
    response: "updated PullRequest",
  },
  {
    method: "POST",
    path: "/api/pr/[id]/merge",
    description: "Merge an open PR",
    response: "merged PullRequest",
  },
  {
    method: "GET",
    path: "/api/health",
    description: "Health check with database latency",
    response: "{ status, latency_ms }",
  },
];

const methodColors: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📡</span>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">API Documentation</h1>
          </div>
          <p className="text-sm text-zinc-500">
            REST API reference for UI-as-Code. Base URL:{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">{BASE_URL}</code>
          </p>
          <nav className="mt-3 flex gap-3 text-sm">
            <Link href="/" className="text-blue-600 hover:text-blue-700">Home</Link>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">Dashboard</Link>
            <Link href="/pr" className="text-blue-600 hover:text-blue-700">PR Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {/* Quick Start */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Quick Start</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Generate a Diff</p>
              <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm text-zinc-100">
                <code>{"curl -X POST " + BASE_URL + "/api/generate-diff -H 'Content-Type: application/json' -d '{\"component_code\":\"...\",\"description\":\"...\"}'"}</code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">List PRs</p>
              <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm text-zinc-100">
                <code>curl {BASE_URL}/api/pull-requests</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Endpoints */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Endpoints</h2>
          <div className="space-y-4">
            {endpoints.map((ep) => (
              <div
                key={ep.path}
                className="rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-black"
              >
                <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className={`inline-block rounded-md px-2 py-1 text-xs font-bold ${methodColors[ep.method] || ""}`}>
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-zinc-800 dark:text-zinc-200">{ep.path}</code>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{ep.description}</p>
                  {ep.body && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Request Body</p>
                      <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                        <ul className="space-y-1 text-xs font-mono text-zinc-700 dark:text-zinc-300">
                          {Object.entries(ep.body).map(([key, desc]) => (
                            <li key={key} className="flex gap-2">
                              <span className="font-semibold text-blue-600 shrink-0">{key}</span>
                              <span className="text-zinc-500">{desc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      Response: <code className="font-mono">{ep.response}</code>
                    </span>
                    {ep.rateLimit && (
                      <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                        Rate: {ep.rateLimit}
                      </span>
                    )}
                    {ep.cache && (
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-600 dark:bg-green-950 dark:text-green-400">
                        Cache: {ep.cache}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Error Responses */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Error Responses</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[
                  [400, "Bad request — validation failed"],
                  [401, "Authentication required"],
                  [422, "Unprocessable input"],
                  [429, "Rate limit exceeded"],
                  [500, "Internal server error"],
                  [502, "AI service unavailable"],
                ].map(([code, meaning]) => (
                  <tr key={String(code)}>
                    <td className="px-3 py-2 font-mono text-red-600">{code}</td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
