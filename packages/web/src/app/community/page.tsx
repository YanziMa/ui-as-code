import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community",
  description:
    "Join the UI-as-Code community — connect with thousands of users, share diffs, and help make the web better together.",
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const stats = [
  { value: "1,247", label: "members" },
  { value: "4,521", label: "frictions reported" },
  { value: "1,847", label: "PRs submitted" },
];

const discordTopics = [
  "Sharing & reviewing diffs",
  "Tips & best practices",
  "Feature requests & ideas",
  "Bug reports & troubleshooting",
  "General chat & networking",
];

const discussionTopics = [
  { title: "How to write better diff descriptions?", replies: 23 },
  { title: "Best AI provider for complex UI changes?", replies: 18 },
  { title: "Proposal: Template marketplace for common SaaS patterns", replies: 45 },
  { title: "Browser extension performance tips", replies: 12 },
  { title: "Welcome thread — introduce yourself!", replies: 89 },
];

const spotlightContributors = [
  {
    name: "Sarah Chen",
    avatar: "SC",
    prs: 34,
    color: "bg-violet-500",
  },
  {
    name: "Marcus Rivera",
    avatar: "MR",
    prs: 28,
    color: "bg-blue-500",
  },
  {
    name: "Aiko Tanaka",
    avatar: "AT",
    prs: 22,
    color: "bg-emerald-500",
  },
];

const topContributors = [
  {
    name: "Sarah Chen",
    handle: "@sarahchen",
    avatar: "SC",
    prs: 34,
    badge: "Top Contributor",
    badgeColor:
      "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
    color: "bg-violet-500",
  },
  {
    name: "Marcus Rivera",
    handle: "@marcusdev",
    avatar: "MR",
    prs: 28,
    badge: "Rising Star",
    badgeColor:
      "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800",
    color: "bg-blue-500",
  },
  {
    name: "Aiko Tanaka",
    handle: "@aikotanaka",
    avatar: "AT",
    prs: 22,
    badge: "Rising Star",
    badgeColor:
      "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800",
    color: "bg-emerald-500",
  },
  {
    name: "James Okafor",
    handle: "@jamesokafor",
    avatar: "JO",
    prs: 19,
    badge: "Active",
    badgeColor:
      "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
    color: "bg-orange-500",
  },
  {
    name: "Priya Sharma",
    handle: "@priyasharma",
    avatar: "PS",
    prs: 16,
    badge: "Active",
    badgeColor:
      "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
    color: "bg-pink-500",
  },
  {
    name: "Lucas Mueller",
    handle: "@lucasm",
    avatar: "LM",
    prs: 14,
    badge: "Newcomer",
    badgeColor:
      "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    color: "bg-cyan-500",
  },
];

const guidelines = [
  {
    icon: "\uD83D\uDE4C",
    title: "Be Respectful",
    description:
      "Treat everyone with kindness. Disagree constructively, never attack personally.",
  },
  {
    icon: "\uD83D\uDCDD",
    title: "No Spam or Self-Promotion",
    description:
      "Keep discussions on-topic. Unsolicited promotions and repetitive posts will be removed.",
  },
  {
    icon: "\uD83E\uDDE0",
    title: "Help Others Grow",
    description:
      "Share knowledge, answer questions, and mentor newcomers. We all started somewhere.",
  },
  {
    icon: "\uD83C\uDF89",
    title: "Have Fun!",
    description:
      "Building a better web should be enjoyable. Celebrate wins, big and small, together.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* ===== Hero ===== */}
      <header className="border-b border-zinc-200 bg-white px-6 py-10 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400">
            <span className="text-base">&#x1F91D;</span>
            Community Hub
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
            Community
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
            Join thousands of users making the web better, one diff at a time.
          </p>

          {/* Stats row */}
          <nav className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {stat.value}
                </span>
                <span className="mt-0.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
                  {stat.label}
                </span>
              </div>
            ))}
          </nav>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* ---- 3-column grid ---- */}
        <section
          aria-label="Community channels"
          className="grid gap-6 lg:grid-cols-3"
        >
          {/* --- Discord Card --- */}
          <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-2xl dark:bg-indigo-950/50">
                &#x1F3AE;
              </span>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Discord
                </h2>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  890 online now
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Our Discord server is the heart of the community. Chat in real
              time, get instant feedback on your diffs, and meet fellow builders
              from around the world.
            </p>

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Topics discussed
              </p>
              <ul className="space-y-1.5">
                {discordTopics.map((topic) => (
                  <li
                    key={topic}
                    className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    <span className="mt-1 text-zinc-300 dark:text-zinc-600">&#x2022;</span>
                    {topic}
                  </li>
                ))}
              </ul>
            </div>

            <a
              href="https://discord.gg/ui-as-code"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              &#x1F3AE; Join Discord
            </a>
          </article>

          {/* --- GitHub Discussions Card --- */}
          <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-2xl dark:bg-zinc-800">
                &#x1F419;
              </span>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  GitHub Discussions
                </h2>
                <span className="text-xs text-zinc-400">Long-form conversations</span>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Dive deeper into topics that matter. Share detailed proposals, ask
              technical questions, and build a searchable knowledge base for the
              entire community.
            </p>

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Recent topics
              </p>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {discussionTopics.map((topic) => (
                  <li
                    key={topic.title}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                      {topic.title}
                    </span>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {topic.replies} replies
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <a
              href="https://github.com/yanzima/ui-as-code/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
            >
              &#x1F419; Browse Discussions
            </a>
          </article>

          {/* --- Contributor Spotlight Card --- */}
          <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-2xl dark:bg-amber-950/50">
                &#x2B50;
              </span>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Contributor Spotlight
                </h2>
                <span className="text-xs text-zinc-400">This month&apos;s top 3</span>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Every month we celebrate the people who go above and beyond to
              improve the platform. These contributors shape what UI-as-Code
              becomes.
            </p>

            <ol className="mt-5 space-y-3">
              {spotlightContributors.map((contributor, i) => (
                <li
                  key={contributor.name}
                  className="flex items-center gap-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {i + 1}
                  </span>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${contributor.color}`}
                  >
                    {contributor.avatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {contributor.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {contributor.prs} PRs this month
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <Link
              href="/leaderboard"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
            >
              &#x2B50; View Full Leaderboard
            </Link>
          </article>
        </section>

        {/* ---- Community Guidelines ---- */}
        <section
          aria-label="Community guidelines"
          className="mt-16 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-10"
        >
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Community Guidelines
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Simple rules to keep our community welcoming and productive for
              everyone.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {guidelines.map((rule) => (
              <div
                key={rule.title}
                className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-800/50"
              >
                <span className="text-2xl">{rule.icon}</span>
                <h3 className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {rule.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {rule.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Top Contributors This Month (horizontal scrollable) ---- */}
        <section
          aria-label="Top contributors this month"
          className="mt-16"
        >
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Top Contributors This Month
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Recognizing the people who make UI-as-Code amazing.
              </p>
            </div>
            <Link
              href="/leaderboard"
              className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              See full leaderboard &rarr;
            </Link>
          </div>

          {/* Scrollable row */}
          <div className="-mx-6 overflow-x-auto px-6 pb-4 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent dark:scrollbar-thumb-zinc-800 sm:mx-0 sm:px-0">
            <div className="flex gap-4" style={{ minWidth: "min-content" }}>
              {topContributors.map((contributor) => (
                <div
                  key={contributor.handle}
                  className="w-64 shrink-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${contributor.color}`}
                    >
                      {contributor.avatar}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {contributor.name}
                      </p>
                      <p className="truncate text-xs text-zinc-400">
                        {contributor.handle}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {contributor.prs}
                      </p>
                      <p className="text-xs text-zinc-400">PRs merged</p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${contributor.badgeColor}`}
                    >
                      {contributor.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- CTA Footer ---- */}
        <section
          aria-label="Contribute call-to-action"
          className="mt-16 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-8 text-center shadow-lg sm:p-14"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl backdrop-blur-sm">
            &#x1F680;
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Want to contribute?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-indigo-100">
            Whether you are submitting your first diff or shipping your hundredth
            PR, there is a place for you here. Get started in minutes.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/getting-started"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3 text-sm font-bold text-indigo-700 shadow-sm transition-all hover:bg-indigo-50 hover:shadow-md"
            >
              Get Started Guide
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/pr"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Submit Your First Diff
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
