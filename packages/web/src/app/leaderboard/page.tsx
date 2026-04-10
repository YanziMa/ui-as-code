import { formatCompact } from "@/lib/formatters";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Contributor {
  rank: number;
  name: string;
  handle: string;
  avatar: string;
  prsAccepted: number;
  prsSubmitted: number;
  acceptanceRate: number; // 0-100
  badges: string[];
  totalVotes: number;
}

interface StatsSummary {
  totalContributors: number;
  prsThisMonth: number;
  acceptanceRate: number;
}

/* ------------------------------------------------------------------ */
/*  Sample data                                                        */
/* ------------------------------------------------------------------ */

const statsSummary: StatsSummary = {
  totalContributors: 1247,
  prsThisMonth: 234,
  acceptanceRate: 61,
};

const contributors: Contributor[] = [
  {
    rank: 1,
    name: "Sarah Chen",
    handle: "@sarahchen",
    avatar: "SC",
    prsAccepted: 87,
    prsSubmitted: 94,
    acceptanceRate: 92.6,
    badges: ["Top Contributor", "UI Expert", "Mentor"],
    totalVotes: 1243,
  },
  {
    rank: 2,
    name: "Marcus Rivera",
    handle: "@mrivera",
    avatar: "MR",
    prsAccepted: 72,
    prsSubmitted: 81,
    acceptanceRate: 88.9,
    badges: ["Bug Hunter", "Fast Shipper"],
    totalVotes: 987,
  },
  {
    rank: 3,
    name: "Aisha Patel",
    handle: "@aishap",
    avatar: "AP",
    prsAccepted: 64,
    prsSubmitted: 73,
    acceptanceRate: 87.7,
    badges: ["Rising Star", "Accessibility"],
    totalVotes: 856,
  },
  {
    rank: 4,
    name: "James Okafor",
    handle: "@jameso",
    avatar: "JO",
    prsAccepted: 58,
    prsSubmitted: 68,
    acceptanceRate: 85.3,
    badges: ["Code Reviewer"],
    totalVotes: 721,
  },
  {
    rank: 5,
    name: "Elena Volkov",
    handle: "@elenav",
    avatar: "EV",
    prsAccepted: 51,
    prsSubmitted: 62,
    acceptanceRate: 82.3,
    badges: ["First PR", "Consistent"],
    totalVotes: 634,
  },
  {
    rank: 6,
    name: "Rajesh Kumar",
    handle: "@rajeshk",
    avatar: "RK",
    prsAccepted: 47,
    prsSubmitted: 58,
    acceptanceRate: 81.0,
    badges: ["Performance"],
    totalVotes: 556,
  },
  {
    rank: 7,
    name: "Mia Thompson",
    handle: "@miat",
    avatar: "MT",
    prsAccepted: 43,
    prsSubmitted: 54,
    acceptanceRate: 79.6,
    badges: ["Documentation"],
    totalVotes: 489,
  },
  {
    rank: 8,
    name: "Lucas Ferreira",
    handle: "@lucasf",
    avatar: "LF",
    prsAccepted: 39,
    prsSubmitted: 50,
    acceptanceRate: 78.0,
    badges: ["Test Coverage"],
    totalVotes: 432,
  },
  {
    rank: 9,
    name: "Yuki Tanaka",
    handle: "@yukit",
    avatar: "YT",
    prsAccepted: 35,
    prsSubmitted: 46,
    acceptanceRate: 76.1,
    badges: ["i18n Champion"],
    totalVotes: 398,
  },
  {
    rank: 10,
    name: "Olivia Santos",
    handle: "@olivias",
    avatar: "OS",
    prsAccepted: 31,
    prsSubmitted: 42,
    acceptanceRate: 73.8,
    badges: ["Newcomer"],
    totalVotes: 367,
  },
  {
    rank: 11,
    name: "David Kim",
    handle: "@davidk",
    avatar: "DK",
    prsAccepted: 28,
    prsSubmitted: 38,
    acceptanceRate: 73.7,
    badges: [],
    totalVotes: 312,
  },
  {
    rank: 12,
    name: "Nina Mueller",
    handle: "@ninam",
    avatar: "NM",
    prsAccepted: 25,
    prsSubmitted: 35,
    acceptanceRate: 71.4,
    badges: [],
    totalVotes: 287,
  },
];

const yourRank: Contributor = {
  rank: 42,
  name: "You",
  handle: "@you",
  avatar: "YO",
  prsAccepted: 12,
  prsSubmitted: 18,
  acceptanceRate: 66.7,
    badges: ["Getting Started"],
  totalVotes: 89,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function badgeColor(badge: string): string {
  const map: Record<string, string> = {
    "Top Contributor": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "UI Expert": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    Mentor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "Bug Hunter": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    "Fast Shipper": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    "Rising Star": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    Accessibility: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    "Code Reviewer": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    "First PR": "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    Consistent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    Performance: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    Documentation: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    "Test Coverage": "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300",
    "i18n Champion": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    Newcomer: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    "Getting Started": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  };
  return map[badge] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
}

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const hues = [
    "from-blue-500 to-blue-600",
    "from-emerald-500 to-emerald-600",
    "from-violet-500 to-violet-600",
    "from-rose-500 to-rose-600",
    "from-amber-500 to-amber-600",
    "from-teal-500 to-teal-600",
    "from-indigo-500 to-indigo-600",
    "from-fuchsia-500 to-fuchsia-600",
    "from-cyan-500 to-cyan-600",
    "from-orange-500 to-orange-600",
  ];
  return hues[Math.abs(hash) % hues.length];
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LeaderboardPage() {
  const top3 = contributors.slice(0, 3);
  const rest = contributors.slice(3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-black dark:to-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm px-6 py-4 dark:border-zinc-800 dark:bg-black/80">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Leaderboard</h1>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Updated 2 hours ago</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Hero */}
        <section className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400 mb-4">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Community Rankings
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
            Contributor Leaderboard
          </h2>
          <p className="mt-3 text-lg text-zinc-500 dark:text-zinc-400">
            Top contributors making SaaS products better
          </p>
        </section>

        {/* Controls */}
        <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Period tabs */}
          <nav className="inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900" aria-label="Time period">
            {["All Time", "This Month", "This Week"].map((tab) => (
              <button
                key={tab}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  tab === "All Time"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          {/* Sort dropdown */}
          <div className="relative inline-block">
            <select
              className="appearance-none rounded-lg border border-zinc-200 bg-white px-4 py-2 pl-3.5 pr-9 text-sm font-medium text-zinc-700 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
              defaultValue="accepted"
            >
              <option value="accepted">Most Accepted</option>
              <option value="submitted">Most Submitted</option>
              <option value="votes">Most Votes</option>
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              fill="none"
              viewBox="0 0 20 20"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </section>

        {/* Stats Summary Bar */}
        <section className="mb-10 grid grid-cols-3 gap-3 sm:gap-4">
          {[
            {
              label: "Total Contributors",
              value: formatCompact(statsSummary.totalContributors),
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              ),
            },
            {
              label: "PRs This Month",
              value: formatCompact(statsSummary.prsThisMonth),
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              ),
            },
            {
              label: "Acceptance Rate",
              value: `${statsSummary.acceptanceRate}%`,
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-5"
            >
              <span className="text-zinc-400 dark:text-zinc-500">{stat.icon}</span>
              <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {stat.value}
              </p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {stat.label}
              </p>
            </div>
          ))}
        </section>

        {/* Podium */}
        <section className="mb-10" aria-label="Top 3 contributors">
          {/* #1 - Center / Large */}
          <div className="mx-auto mb-4 max-w-md">
            <PodiumCard contributor={top3[0]} tier="gold" />
          </div>

          {/* #2 and #3 - Side by side */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl mx-auto">
            <PodiumCard contributor={top3[1]} tier="silver" />
            <PodiumCard contributor={top3[2]} tier="bronze" />
          </div>
        </section>

        {/* Ranks 4-10 Table */}
        <section className="mb-10" aria-label="Ranks 4 through 10">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
            Full Rankings
          </h3>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/30">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <th className="px-5 py-3 font-semibold text-zinc-400 dark:text-zinc-500">#</th>
                  <th className="px-5 py-3 font-semibold text-zinc-400 dark:text-zinc-500">Contributor</th>
                  <th className="px-5 py-3 text-right font-semibold text-zinc-400 dark:text-zinc-500 hidden sm:table-cell">PRs Accepted</th>
                  <th className="px-5 py-3 text-right font-semibold text-zinc-400 dark:text-zinc-500 hidden md:table-cell">Acceptance</th>
                  <th className="px-5 py-3 text-right font-semibold text-zinc-400 dark:text-zinc-500 hidden lg:table-cell">Badges</th>
                  <th className="px-5 py-3 text-right font-semibold text-zinc-400 dark:text-zinc-500">Votes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {rest.map((c) => (
                  <tr
                    key={c.rank}
                    className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/20"
                  >
                    <td className="px-5 py-3.5">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {c.rank}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarColor(c.avatar)} text-xs font-bold text-white shadow-sm`}
                          aria-hidden="true"
                        >
                          {c.avatar}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{c.name}</p>
                          <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">{c.handle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300 hidden sm:table-cell">
                      {formatCompact(c.prsAccepted)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums hidden md:table-cell">
                      <span
                        className={
                          c.acceptanceRate >= 85
                            ? "font-semibold text-green-600 dark:text-green-400"
                            : c.acceptanceRate >= 70
                              ? "font-medium text-amber-600 dark:text-amber-400"
                              : "text-zinc-500 dark:text-zinc-400"
                        }
                      >
                        {c.acceptanceRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                      <div className="flex flex-wrap justify-end gap-1">
                        {c.badges.map((b) => (
                          <span
                            key={b}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight ${badgeColor(b)}`}
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                      <span className="inline-flex items-center gap-1">
                        <svg className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {formatCompact(c.totalVotes)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Your Rank Card */}
        <section aria-label="Your ranking">
          <div className="overflow-hidden rounded-2xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-6 dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/20">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <span
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${avatarColor(yourRank.avatar)} text-base font-bold text-white shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/40`}
                    aria-hidden="true"
                  >
                    {yourRank.avatar}
                  </span>
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm">
                    #{yourRank.rank}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{yourRank.name}</p>
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      Your Rank
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{yourRank.handle}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 sm:gap-8">
                <div className="text-center">
                  <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatCompact(yourRank.prsAccepted)}
                  </p>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Accepted
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {yourRank.acceptanceRate.toFixed(0)}%
                  </p>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Rate
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatCompact(yourRank.totalVotes)}
                  </p>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Votes
                  </p>
                </div>
              </div>
            </div>

            {/* Progress bar toward top 10 */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {formatCompact(10 - yourRank.prsAccepted)} more accepted PRs to reach top 10
                </p>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Rank #{yourRank.rank} of {formatCompact(statsSummary.totalContributors)}
                </p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                  style={{ width: `${Math.max(4, ((statsSummary.totalContributors - yourRank.rank) / statsSummary.totalContributors) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Podium Card sub-component                                          */
/* ------------------------------------------------------------------ */

function PodiumCard({
  contributor,
  tier,
}: {
  contributor: Contributor;
  tier: "gold" | "silver" | "bronze";
}) {
  const isGold = tier === "gold";

  const borderStyles: Record<string, string> = {
    gold:
      "border-2 border-transparent bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 p-[2px] [background-clip:padding-box,border-box] [background-origin:padding-box,border-box]",
    silver:
      "border-2 border-transparent bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 p-[2px] [background-clip:padding-box,border-box] [background-origin:padding-box,border-box]",
    bronze:
      "border-2 border-transparent bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 p-[2px] [background-clip:padding-box,border-box] [background-origin:padding-box,border-box]",
  };

  const innerBg =
    tier === "gold"
      ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30"
      : tier === "silver"
        ? "bg-gradient-to-br from-gray-50 to-zinc-100 dark:from-zinc-800/60 dark:to-zinc-800/40"
        : "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20";

  const rankBadgeStyles: Record<string, string> = {
    gold:
      "bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-200 dark:shadow-amber-900/40",
    silver:
      "bg-gradient-to-r from-gray-300 to-gray-400 text-white shadow-lg shadow-gray-200 dark:shadow-gray-800/40",
    bronze:
      "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-200 dark:shadow-amber-900/40",
  };

  const crownIcon =
    tier === "gold" ? (
      <svg className="h-5 w-5 text-amber-400 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
      </svg>
    ) : null;

  return (
    <div className={`rounded-2xl ${borderStyles[tier]}`}>
      <div className={`rounded-[14px] ${innerBg} ${isGold ? "p-6 sm:p-8" : "p-5"}`}>
        {/* Header row */}
        <div className={`flex items-start gap-4 ${isGold ? "" : "sm:gap-3"}`}>
          {/* Rank badge + Avatar */}
          <div className="relative shrink-0">
            <span
              className={`inline-flex ${isGold ? "h-14 w-14" : "h-11 w-11"} items-center justify-center rounded-full ${rankBadgeStyles[tier]} ${isGold ? "text-lg" : "text-sm"} font-extrabold`}
              aria-label={`Rank ${contributor.rank}`}
            >
              #{contributor.rank}
            </span>
            <span
              className={`absolute -bottom-1 -right-1 ${isGold ? "h-10 w-10 -mr-1 -mb-1 text-xs" : "h-8 w-8 -mr-0.5 -mb-0.5 text-[10px]"} inline-flex items-center justify-center rounded-full bg-gradient-to-br ${avatarColor(contributor.avatar)} font-bold text-white shadow-md ring-2 ring-white dark:ring-zinc-900`}
              aria-hidden="true"
            >
              {contributor.avatar}
            </span>
          </div>

          {/* Name & handle */}
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`${isGold ? "text-xl" : "text-base"} font-extrabold text-zinc-900 dark:text-zinc-50`}
              >
                {contributor.name}
              </h3>
              {crownIcon}
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{contributor.handle}</p>

            {/* Badges */}
            {isGold && contributor.badges.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {contributor.badges.map((b) => (
                  <span
                    key={b}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold leading-tight ${badgeColor(b)}`}
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div
          className={`mt-4 grid ${
            isGold
              ? "grid-cols-3 gap-4"
              : "grid-cols-3 gap-2 sm:gap-3"
          }`}
        >
          <StatPill label="Accepted" value={formatCompact(contributor.prsAccepted)} />
          <StatPill label="Submitted" value={formatCompact(contributor.prsSubmitted)} />
          <StatPill label="Rate" value={`${contributor.acceptanceRate.toFixed(0)}%`} highlight={contributor.acceptanceRate >= 90} />
        </div>

        {/* Vote count (prominent on gold) */}
        {isGold && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 dark:bg-zinc-800/40">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Votes Received</span>
            <span className="flex items-center gap-1.5 text-lg font-bold text-amber-600 dark:text-amber-400">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {formatCompact(contributor.totalVotes)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Pill sub-component                                            */
/* ------------------------------------------------------------------ */

function StatPill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/70 px-3 py-2.5 text-center shadow-sm dark:bg-zinc-800/50">
      <p
        className={`text-lg font-bold tabular-nums ${
          highlight
            ? "text-green-600 dark:text-green-400"
            : "text-zinc-800 dark:text-zinc-200"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
    </div>
  );
}
