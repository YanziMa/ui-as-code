import { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib";

export const metadata: Metadata = {
  title: "Product Roadmap",
  description:
    "What we're building and what's coming next — UI-as-Code product roadmap.",
};

type PhaseStatus = "completed" | "in-progress" | "planned" | "future";

interface RoadmapItem {
  icon: string;
  title: string;
  description: string;
}

interface RoadmapPhase {
  quarter: string;
  label: string;
  status: PhaseStatus;
  statusLabel: string;
  items: RoadmapItem[];
}

const phases: RoadmapPhase[] = [
  {
    quarter: "Q1 2026",
    label: "Foundation",
    status: "completed",
    statusLabel: "Completed",
    items: [
      {
        icon: "\u2699\uFE0F",
        title: "Core diff generation engine",
        description:
          "AI-powered engine that compares UI states and generates unified diffs for any SaaS interface.",
      },
      {
        icon: "\uD83D\uDCF0",
        title: "Browser extension MVP (Chrome)",
        description:
          "Inspect components, capture screenshots, and generate diffs directly in the browser.",
      },
      {
        icon: "\uD83D\uDCC5",
        title: "Basic PR workflow",
        description:
          "Submit, review, vote, and merge community-suggested UI improvements.",
      },
      {
        icon: "\uD83D\uDD12",
        title: "Supabase auth & storage",
        description:
          "Secure OAuth authentication with PostgreSQL-backed data persistence.",
      },
      {
        icon: "\uD83C\uDFE0",
        title: "Landing page",
        description:
          "Public-facing site with product overview, onboarding flow, and feature highlights.",
      },
    ],
  },
  {
    quarter: "Q2 2026",
    label: "Growth",
    status: "in-progress",
    statusLabel: "In Progress",
    items: [
      {
        icon: "\uD83D\uDC65",
        title: "Teams & collaboration workspaces",
        description:
          "Invite members, assign roles, and organize projects into shared workspaces.",
      },
      {
        icon: "\uD83D\uDCBC",
        title: "Sandbox preview with iframe",
        description:
          "Render diffs in an isolated iframe sandbox before applying changes.",
      },
      {
        icon: "\uD83D\uDCE2",
        title: "Webhook system",
        description:
          "Real-time notifications for PR events, diff completions, and team activity.",
      },
      {
        icon: "\uD83D\uDCCA",
        title: "Analytics dashboard",
        description:
          "Visualize friction trends, adoption rates, diff latency, and team productivity.",
      },
      {
        icon: "\u276F\uFE0F",
        title: "CLI tool",
        description:
          "Generate diffs, manage PRs, and configure settings entirely from the terminal.",
      },
      {
        icon: "\uD83C\uDF0D",
        title: "i18n support (EN/ZH/JA)",
        description:
          "Full localization support for English, Chinese, and Japanese interfaces.",
      },
      {
        icon: "\uD83C\uDFAF",
        title: "PWA support",
        description:
          "Installable progressive web app with offline capability and push notifications.",
      },
    ],
  },
  {
    quarter: "Q3 2026",
    label: "Scale",
    status: "planned",
    statusLabel: "Planned",
    items: [
      {
        icon: "\uD83D\uDD25",
        title: "Firefox & Safari extension support",
        description:
          "Cross-browser coverage with full feature parity across all major browsers.",
      },
      {
        icon: "\uD83D\uDD11",
        title: "Enterprise SSO/SAML",
        description:
          "Single sign-on integration with Okta, Azure AD, and custom identity providers.",
      },
      {
        icon: "\uD83E\uDD16",
        title: "Advanced AI (multi-model support)",
        description:
          "Switch between Claude, GPT, Gemini, and local models for diff generation.",
      },
      {
        icon: "\uD83D\uDCF1",
        title: "Mobile app (React Native)",
        description:
          "Native iOS and Android apps to review PRs, track progress, and manage teams on the go.",
      },
      {
        icon: "\u23F1\uFE0F",
        title: "API rate limiting & quotas",
        description:
          "Granular usage controls per API key with configurable limits and burst allowances.",
      },
      {
        icon: "\u270D\uFE0F",
        title: "Custom AI prompt templates",
        description:
          "Define and share reusable prompt templates tailored to specific UI patterns.",
      },
    ],
  },
  {
    quarter: "Q4 2026",
    label: "Platform",
    status: "future",
    statusLabel: "Future",
    items: [
      {
        icon: "\uD83C\uDFEA",
        title: "Marketplace for community diff templates",
        description:
          "Browse, install, and publish reusable diff templates created by the community.",
      },
      {
        icon: "\u2705",
        title: "Automated regression testing for diffs",
        description:
          "Run visual and functional regression tests on every submitted diff automatically.",
      },
      {
        icon: "\uD83D\uDEE1\uFE0F",
        title: "SaaS vendor self-service portal",
        description:
          "Let SaaS vendors onboard themselves, define component schemas, and manage their presence.",
      },
      {
        icon: "\uD83C\uDFF7\uFE0F",
        title: "White-label / embed SDK",
        description:
          "Embed the full diff workflow into your own product with customizable branding.",
      },
      {
        icon: "\uD83D\uDCCA",
        title: "Advanced analytics with ML insights",
        description:
          "Predictive analytics that surface UX friction patterns and suggest proactive fixes.",
      },
    ],
  },
];

const phaseConfig: Record<
  PhaseStatus,
  {
    dotColor: string;
    lineColor: string;
    badgeClass: string;
    badgeText: string;
    cardBorder: string;
    cardBg: string;
    itemIconBg: string;
  }
> = {
  completed: {
    dotColor: "bg-emerald-500",
    lineColor: "border-emerald-300 dark:border-emerald-800",
    badgeClass:
      "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
    badgeText: "Completed \u2705",
    cardBorder:
      "border-emerald-200 dark:border-emerald-900/50",
    cardBg:
      "bg-white dark:bg-zinc-900",
    itemIconBg:
      "bg-emerald-100 dark:bg-emerald-950/40",
  },
  "in-progress": {
    dotColor: "bg-blue-500",
    lineColor: "border-blue-300 dark:border-blue-800",
    badgeClass:
      "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800",
    badgeText: "In Progress \uD83D\uDD04",
    cardBorder:
      "border-blue-200 dark:border-blue-900/50",
    cardBg:
      "bg-white dark:bg-zinc-900",
    itemIconBg:
      "bg-blue-100 dark:bg-blue-950/40",
  },
  planned: {
    dotColor: "bg-zinc-400",
    lineColor: "border-zinc-200 dark:border-zinc-800",
    badgeClass:
      "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    badgeText: "Planned",
    cardBorder:
      "border-zinc-200 dark:border-zinc-800",
    cardBg:
      "bg-white dark:bg-zinc-900",
    itemIconBg:
      "bg-zinc-100 dark:bg-zinc-800",
  },
  future: {
    dotColor: "bg-zinc-300 dark:bg-zinc-600",
    lineColor: "border-zinc-200 dark:border-zinc-800",
    badgeClass:
      "bg-zinc-100 text-zinc-500 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700",
    badgeText: "Future",
    cardBorder:
      "border-zinc-200 dark:border-zinc-800",
    cardBg:
      "bg-white dark:bg-zinc-900",
    itemIconBg:
      "bg-zinc-100 dark:bg-zinc-800",
  },
};

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-10 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Product Roadmap
          </h1>
          <p className="mt-2 text-lg text-zinc-500">
            What we&apos;re building and what&apos;s coming next
          </p>

          {/* Status legend */}
          <nav className="mt-6 flex flex-wrap gap-3 text-sm">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium",
                phaseConfig.completed.badgeClass,
              )}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Completed
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium",
                phaseConfig["in-progress"].badgeClass,
              )}
            >
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              In Progress
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium",
                phaseConfig.planned.badgeClass,
              )}
            >
              <span className="h-2 w-2 rounded-full bg-zinc-400" />
              Planned
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium",
                phaseConfig.future.badgeClass,
              )}
            >
              <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              Future
            </span>
          </nav>
        </div>
      </header>

      {/* Timeline */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <ol className="relative space-y-12">
          {phases.map((phase, index) => {
            const config = phaseConfig[phase.status];
            return (
              <li key={phase.quarter} className="relative pl-8 md:pl-10">
                {/* Connecting line */}
                {index !== phases.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-[11px] top-8 h-[calc(100%-0.5rem)] w-0.5 md:left-[13px]",
                      config.lineColor,
                    )}
                  />
                )}

                {/* Timeline dot */}
                <div
                  className={cn(
                    "absolute left-0 top-1.5 h-[22px] w-[22px] rounded-full border-2 border-white ring-2 ring-zinc-200 dark:border-zinc-950 dark:ring-zinc-800 md:h-[26px] md:w-[26px]",
                    config.dotColor,
                  )}
                />

                {/* Phase header */}
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {phase.quarter} &mdash; {phase.label}
                  </h2>
                  <span
                    className={cn(
                      "rounded-full border px-3 py-0.5 text-xs font-semibold",
                      config.badgeClass,
                    )}
                  >
                    {config.badgeText}
                  </span>
                </div>

                {/* Items grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {phase.items.map((item) => (
                    <div
                      key={item.title}
                      className={cn(
                        "rounded-xl border p-4 transition-colors hover:shadow-sm",
                        config.cardBorder,
                        config.cardBg,
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base",
                            config.itemIconBg,
                          )}
                        >
                          {item.icon}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.title}
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>

        {/* CTA */}
        <section className="mt-16 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-12">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-2xl dark:bg-indigo-950/50">
            \uD83D\uDCA1
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Request a Feature
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Have an idea that could make UI-as-Code better? We&apos;d love to hear it.
            Submit a feature request and help shape the future of the platform.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/pr"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Submit a Request
            </Link>
            <a
              href="https://github.com/yanzima/ui_as-code/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
            >
              Open GitHub Issue
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
