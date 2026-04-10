"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type PhaseStatus = "completed" | "in-progress" | "planned";

interface FeatureItem {
  title: string;
  description: string;
}

interface RoadmapPhase {
  quarter: string;
  label: string;
  status: PhaseStatus;
  statusLabel: string;
  dateRange: string;
  items: FeatureItem[];
}

interface VoteFeature {
  id: string;
  title: string;
  votes: number;
  status: "under-review" | "planned" | "backlog";
}

interface ChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
}

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

const phases: RoadmapPhase[] = [
  {
    quarter: "Q1 2026",
    label: "Foundation",
    status: "completed",
    statusLabel: "Completed",
    dateRange: "Jan - Mar 2026",
    items: [
      {
        title: "Core inspector + diff generation pipeline",
        description:
          "AI-powered engine that compares UI states and generates unified diffs for any SaaS interface.",
      },
      {
        title: "Basic sandbox preview",
        description:
          "Render diffs in an isolated iframe sandbox before applying changes to production.",
      },
      {
        title: "User auth + onboarding",
        description:
          "Secure OAuth authentication with guided onboarding flow for new users.",
      },
      {
        title: "Chrome extension MVP",
        description:
          "Inspect components, capture screenshots, and generate diffs directly in the browser.",
      },
    ],
  },
  {
    quarter: "Q2 2026",
    label: "Growth",
    status: "in-progress",
    statusLabel: "In Progress",
    dateRange: "Apr - Jun 2026",
    items: [
      {
        title: "Multi-SaaS support (HubSpot, Salesforce, Notion)",
        description:
          "Expand coverage beyond initial targets with adapters for major SaaS platforms.",
      },
      {
        title: "Team collaboration features",
        description:
          "Invite members, assign roles, comment on diffs, and organize shared workspaces.",
      },
      {
        title: "PR workflow for SaaS vendors",
        description:
          "Let vendors receive, review, and merge community-suggested UI improvements.",
      },
      {
        title: "Analytics dashboard",
        description:
          "Visualize friction trends, adoption rates, diff latency, and team productivity metrics.",
      },
    ],
  },
  {
    quarter: "Q3 2026",
    label: "Scale",
    status: "planned",
    statusLabel: "Planned",
    dateRange: "Jul - Sep 2026",
    items: [
      {
        title: "Enterprise SSO/SAML",
        description:
          "Single sign-on integration with Okta, Azure AD, and custom identity providers.",
      },
      {
        title: "Custom AI model fine-tuning",
        description:
          "Fine-tune models on your own UI patterns for higher accuracy and domain-specific diffs.",
      },
      {
        title: "API rate limits and usage billing",
        description:
          "Granular usage controls per API key with configurable limits and transparent billing.",
      },
      {
        title: "Webhook integrations",
        description:
          "Real-time notifications for PR events, diff completions, and team activity via webhooks.",
      },
    ],
  },
  {
    quarter: "Q4 2026",
    label: "Platform",
    status: "planned",
    statusLabel: "Planned",
    dateRange: "Oct - Dec 2026",
    items: [
      {
        title: "Plugin marketplace",
        description:
          "Browse, install, and publish reusable plugins and diff templates created by the community.",
      },
      {
        title: "CLI tool for developers",
        description:
          "Generate diffs, manage PRs, and configure settings entirely from the terminal.",
      },
      {
        title: "Self-hosted option",
        description:
          "Deploy UI-as-Code on your own infrastructure with full data control.",
      },
      {
        title: "Mobile companion app",
        description:
          "Native iOS and Android apps to review PRs, track progress, and manage teams on the go.",
      },
    ],
  },
];

const voteFeatures: VoteFeature[] = [
  { id: "figma", title: "Figma plugin integration", votes: 234, status: "under-review" },
  { id: "realtime", title: "Real-time collaboration", votes: 189, status: "planned" },
  { id: "darkmode", title: "Dark mode for extension", votes: 156, status: "backlog" },
  { id: "patches", title: "Export diffs as patches", votes: 142, status: "backlog" },
  { id: "branding", title: "Custom branding", votes: 98, status: "backlog" },
  { id: "mobile", title: "Mobile app", votes: 87, status: "planned" },
];

const changelogEntries: ChangelogEntry[] = [
  {
    version: "v1.4.0",
    date: "Mar 28, 2026",
    highlights: [
      "Chrome extension MVP with inspector panel",
      "Sandbox preview with iframe isolation",
      "OAuth sign-in with GitHub & Google",
    ],
  },
  {
    version: "v1.3.0",
    date: "Feb 14, 2026",
    highlights: [
      "Diff generation pipeline v2 (30% faster)",
      "Onboarding wizard for new users",
      "Public API documentation",
    ],
  },
  {
    version: "v1.2.0",
    date: "Jan 7, 2026",
    highlights: [
      "Initial core inspector release",
      "Basic diff rendering engine",
      "Landing page and docs site",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

const phaseConfig: Record<
  PhaseStatus,
  {
    dotColor: string;
    lineColor: string;
    badgeClass: string;
    cardBorder: string;
    cardBg: string;
    itemIconClass: string;
  }
> = {
  completed: {
    dotColor: "bg-emerald-500",
    lineColor: "border-emerald-300 dark:border-emerald-800",
    badgeClass:
      "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
    cardBorder: "border-emerald-200 dark:border-emerald-900/50",
    cardBg: "bg-white dark:bg-zinc-900",
    itemIconClass: "text-emerald-600 dark:text-emerald-400",
  },
  "in-progress": {
    dotColor: "bg-blue-500",
    lineColor: "border-blue-300 dark:border-blue-800",
    badgeClass:
      "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800",
    cardBorder: "border-blue-200 dark:border-blue-900/50",
    cardBg: "bg-white dark:bg-zinc-900",
    itemIconClass: "text-blue-600 dark:text-blue-400",
  },
  planned: {
    dotColor: "bg-zinc-400",
    lineColor: "border-zinc-200 dark:border-zinc-800",
    badgeClass:
      "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    cardBorder: "border-zinc-200 dark:border-zinc-800",
    cardBg: "bg-white dark:bg-zinc-900",
    itemIconClass: "text-zinc-400 dark:text-zinc-500",
  },
};

const voteStatusConfig: Record<VoteFeature["status"], string> = {
  "under-review": "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  planned: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  backlog: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const voteStatusLabel: Record<VoteFeature["status"], string> = {
  "under-review": "Under Review",
  planned: "Planned",
  backlog: "Backlog",
};

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.295a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L7.5 12.586l7.292-7.292a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function DotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <circle cx="10" cy="10" r="3" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function RoadmapPage() {
  const [viewMode, setViewMode] = useState<"timeline" | "board">("timeline");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [votes, setVotes] = useState<Record<string, number>>(
    Object.fromEntries(voteFeatures.map((f) => [f.id, f.votes]))
  );
  const [votedFor, setVotedFor] = useState<Set<string>>(new Set());

  function handleVote(id: string) {
    if (votedFor.has(id)) return;
    setVotedFor((prev) => new Set(prev).add(id));
    setVotes((prev) => ({ ...prev, [id]: prev[id] + 1 }));
  }

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* ================================================================== */}
      {/*  HERO SECTION                                                       */}
      {/* ================================================================== */}
      <header className="border-b border-zinc-200 bg-white px-6 py-14 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Product Roadmap
              </h1>
              <p className="mt-3 max-w-xl text-lg text-zinc-500 dark:text-zinc-400">
                What we&apos;re building next. Track our progress, vote on features,
                and stay up to date with every release.
              </p>
            </div>

            {/* View toggle */}
            <div className="flex shrink-0 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  viewMode === "timeline"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                )}
              >
                Timeline View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("board")}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  viewMode === "board"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                )}
              >
                Board View
              </button>
            </div>
          </div>

          {/* Status legend */}
          <nav className="mt-8 flex flex-wrap gap-3 text-sm">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1 font-medium",
                phaseConfig.completed.badgeClass,
              )}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Completed
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1 font-medium",
                phaseConfig["in-progress"].badgeClass,
              )}
            >
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              In Progress
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1 font-medium",
                phaseConfig.planned.badgeClass,
              )}
            >
              <span className="h-2 w-2 rounded-full bg-zinc-400" />
              Planned
            </span>
          </nav>
        </div>
      </header>

      {/* ================================================================== */}
      {/*  RELEASE TIMELINE                                                   */}
      {/* ================================================================== */}
      <main className="mx-auto max-w-7xl px-6 py-14">
        {viewMode === "timeline" ? (
          /* ---- Timeline view ---- */
          <ol className="relative space-y-14">
            {phases.map((phase, index) => {
              const config = phaseConfig[phase.status];
              const isCompleted = phase.status === "completed";

              return (
                <li key={phase.quarter} className="relative pl-10 md:pl-12">
                  {/* Connecting line */}
                  {index !== phases.length - 1 && (
                    <div
                      className={cn(
                        "absolute left-[13px] top-9 h-[calc(100%-0.5rem)] w-0.5 md:left-[15px]",
                        config.lineColor,
                      )}
                    />
                  )}

                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "absolute left-0 top-2 h-[26px] w-[26px] rounded-full border-2 border-white ring-2 ring-zinc-200 dark:border-zinc-950 dark:ring-zinc-800 md:h-[30px] md:w-[30px]",
                      config.dotColor,
                    )}
                  />

                  {/* Phase header */}
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                      {phase.quarter}
                      <span className="ml-2 text-zinc-400">&mdash;</span>{" "}
                      <span className="text-zinc-600 dark:text-zinc-300">{phase.label}</span>
                    </h2>
                    <span
                      className={cn(
                        "rounded-full border px-3.5 py-1 text-xs font-semibold uppercase tracking-wide",
                        config.badgeClass,
                      )}
                    >
                      {phase.statusLabel}
                    </span>
                    <span className="text-sm text-zinc-400">{phase.dateRange}</span>
                  </div>

                  {/* Feature list */}
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {phase.items.map((item) => (
                      <li
                        key={item.title}
                        className={cn(
                          "group rounded-xl border p-4 transition-all hover:shadow-md",
                          config.cardBorder,
                          config.cardBg,
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                              isCompleted
                                ? "bg-emerald-100 dark:bg-emerald-950/40"
                                : "bg-zinc-100 dark:bg-zinc-800",
                              config.itemIconClass,
                            )}
                          >
                            {isCompleted ? (
                              <CheckIcon className="h-3 w-3" />
                            ) : (
                              <DotIcon className="h-2 w-2" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                              {item.title}
                            </h3>
                            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        ) : (
          /* ---- Board view (kanban-style columns) ---- */
          <div className="grid gap-8 lg:grid-cols-3">
            {(["completed", "in-progress", "planned"] as const).map((status) => {
              const config = phaseConfig[status];
              const label =
                status === "completed"
                  ? "Completed"
                  : status === "in-progress"
                    ? "In Progress"
                    : "Planned";
              const columnPhases = phases.filter((p) => p.status === status);

              return (
                <div key={status}>
                  <div className="mb-4 flex items-center gap-3">
                    <span
                      className={cn(
                        "h-3 w-3 rounded-full",
                        status === "completed"
                          ? "bg-emerald-500"
                          : status === "in-progress"
                            ? "bg-blue-500"
                            : "bg-zinc-400",
                      )}
                    />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {label}
                    </h2>
                    <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {columnPhases.reduce((sum, p) => sum + p.items.length, 0)}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {columnPhases.map((phase) =>
                      phase.items.map((item) => (
                        <div
                          key={`${phase.quarter}-${item.title}`}
                          className={cn(
                            "rounded-xl border p-4 transition-shadow hover:shadow-md",
                            config.cardBorder,
                            config.cardBg,
                          )}
                        >
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                            {phase.quarter}
                          </p>
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.title}
                          </h3>
                          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                            {item.description}
                          </p>
                        </div>
                      )),
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================================================================== */}
        {/*  FEATURE VOTING SECTION                                            */}
        {/* ================================================================== */}
        <section className="mt-24">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Upcoming Features
            </h2>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              Vote for features you want to see built. The most requested ideas get prioritized.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {voteFeatures
              .sort((a, b) => votes[b.id] - votes[a.id])
              .map((feature) => {
                const hasVoted = votedFor.has(feature.id);
                return (
                  <div
                    key={feature.id}
                    className={cn(
                      "group rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {feature.title}
                      </h3>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          voteStatusConfig[feature.status],
                        )}
                      >
                        {voteStatusLabel[feature.status]}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleVote(feature.id)}
                        disabled={hasVoted}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                          hasVoted
                            ? "cursor-default border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "border-zinc-200 text-zinc-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400",
                        )}
                      >
                        <ArrowUpIcon className="h-3.5 w-3.5" />
                        {hasVoted ? "Voted" : "Upvote"}
                      </button>

                      <span className="text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                        {votes[feature.id].toLocaleString()}
                        <span className="ml-1 text-xs font-normal text-zinc-400">votes</span>
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* ================================================================== */}
        {/*  CHANGELOG PREVIEW                                                 */}
        {/* ================================================================== */}
        <section className="mt-24">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Recent Releases
              </h2>
              <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                Latest updates and what changed in each version.
              </p>
            </div>
            <Link
              href="/changelog"
              className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              View full changelog &rarr;
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {changelogEntries.map((entry) => (
              <div
                key={entry.version}
                className="rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-block rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400">
                    {entry.version}
                  </span>
                  <time className="text-xs text-zinc-400">{entry.date}</time>
                </div>
                <ul className="mt-4 space-y-2">
                  {entry.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                    >
                      <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================== */}
        {/*  SUBSCRIBE TO UPDATES                                              */}
        {/* ================================================================== */}
        <section className="mt-24">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-indigo-50 to-white p-10 shadow-sm dark:border-zinc-800 dark:from-indigo-950/30 dark:to-zinc-900 sm:p-14">
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-2xl dark:bg-indigo-950/50">
                &#128276;
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Stay in the Loop
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Get notified when we ship new features or update the roadmap.
                No spam, unsubscribe anytime.
              </p>

              {subscribed ? (
                <div className="mt-6 rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/30">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    You&apos;re subscribed! We&apos;ll keep you posted.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="mt-6 flex gap-3">
                  <label htmlFor="roadmap-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="roadmap-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-indigo-400"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
                  >
                    Notify Me
                  </button>
                </form>
              )}

              <p className="mt-3 text-xs text-zinc-400">
                Join 1,200+ builders tracking our progress.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
