import Link from "next/link";

interface Stats {
  total_frictions: number;
  total_prs: number;
  total_votes: number;
  unique_saas_sites: number;
  merged_prs?: number;
  open_prs?: number;
}

interface TopFriction {
  saas_name: string;
  component_name: string;
  count: number;
  rank: number;
}

async function getStats(): Promise<Stats> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://ui-as-code-web.vercel.app"}/api/stats`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { total_frictions: 0, total_prs: 0, total_votes: 0, unique_saas_sites: 0 };
    return res.json();
  } catch {
    return { total_frictions: 0, total_prs: 0, total_votes: 0, unique_saas_sites: 0 };
  }
}

async function getTopFrictions(): Promise<TopFriction[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://ui-as-code-web.vercel.app"}/api/frictions/top?limit=10`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function StatCard({ label, value, icon, color = "text-blue-600" }: { label: string; value: number | string; icon: string; color?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const [stats, topFrictions] = await Promise.all([getStats(), getTopFrictions()]);
  const maxCount = Math.max(...topFrictions.map((f) => f.count), 1);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Analytics</h1>
              <p className="text-muted-foreground mt-1">Platform usage insights and trends</p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Overview Stats */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Frictions" value={stats.total_frictions} icon="📝" color="text-blue-600" />
            <StatCard label="Pull Requests" value={stats.total_prs} icon="🔀" color="text-purple-600" />
            <StatCard label="Total Votes" value={stats.total_votes} icon="🗳️" color="text-green-600" />
            <StatCard label="SaaS Sites" value={stats.unique_saas_sites} icon="🌐" color="text-orange-600" />
          </div>
        </section>

        {/* PR Status Breakdown */}
        {(stats.merged_prs !== undefined || stats.open_prs !== undefined) && (
          <section>
            <h2 className="text-lg font-semibold mb-4">PR Status</h2>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-3xl font-bold text-green-600">{stats.open_prs ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Open</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-600">{stats.merged_prs ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Merged</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-muted-foreground">
                    {stats.total_prs - (stats.merged_prs ?? 0) - (stats.open_prs ?? 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Closed</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Top Frictions */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Top Reported Frictions</h2>
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-semibold">Most reported UI pain points</h3>
            </div>
            <div className="p-6">
              {topFrictions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No friction data yet</p>
              ) : (
                <div className="space-y-3">
                  {topFrictions.map((item) => (
                    <div key={`${item.saas_name}-${item.component_name}`} className="flex items-center gap-4">
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                        {item.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate">
                            {item.saas_name} / {item.component_name}
                          </span>
                          <span className="text-sm text-muted-foreground ml-2 shrink-0">
                            {item.count} reports
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                            style={{ width: `${(item.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/api-docs" className="p-4 rounded-xl border border-zinc-200 hover:border-primary/50 transition-colors bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <p className="font-medium text-sm">API Documentation</p>
              <p className="text-xs text-muted-foreground mt-1">14 endpoints documented</p>
            </Link>
            <Link href="/pr" className="p-4 rounded-xl border border-zinc-200 hover:border-primary/50 transition-colors bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <p className="font-medium text-sm">PR Dashboard</p>
              <p className="text-xs text-muted-foreground mt-1">Browse and vote on PRs</p>
            </Link>
            <Link href="/changelog" className="p-4 rounded-xl border border-zinc-200 hover:border-primary/50 transition-colors bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <p className="font-medium text-sm">Changelog</p>
              <p className="text-xs text-muted-foreground mt-1">Release history</p>
            </Link>
            <Link
              href="https://github.com/YanziMa/ui-as-code#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl border border-zinc-200 hover:border-primary/50 transition-colors bg-white dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="font-medium text-sm">GitHub Repository</p>
              <p className="text-xs text-muted-foreground mt-1">Source code & issues</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
