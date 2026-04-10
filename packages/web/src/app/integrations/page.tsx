"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Status = "Available" | "Coming Soon" | "Beta";
type Difficulty = "Easy" | "Medium" | "Advanced";

interface Category {
  name: string;
  icon: string;
  count: number;
}

interface FeaturedIntegration {
  name: string;
  logo: string;
  description: string;
  features: string[];
  difficulty: Difficulty;
  status: Status;
  color: string;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const CATEGORIES: Category[] = [
  { name: "Version Control", icon: "\u{1F4BB}", count: 3 },
  { name: "Project Management", icon: "\u{1F4CB}", count: 4 },
  { name: "Communication", icon: "\u{1F4E7}", count: 3 },
  { name: "Design", icon: "\u{1F3A8}", count: 3 },
  { name: "CI/CD", icon: "\u26A1", count: 4 },
  { name: "Monitoring", icon: "\u{1F4C8}", count: 3 },
];

const FEATURED_INTEGRATIONS: FeaturedIntegration[] = [
  {
    name: "GitHub",
    logo: "GH",
    description:
      "Sync repositories, pull requests, and branches with UI-as-Code components.",
    features: [
      "Auto-import PR diffs into component reviews",
      "Branch-based environment previews",
      "Commit-level change tracking",
    ],
    difficulty: "Easy",
    status: "Available",
    color: "bg-gray-900",
  },
  {
    name: "Slack",
    logo: "S",
    description:
      "Receive real-time notifications and interact with UI-as-Code from your Slack workspace.",
    features: [
      "Channel-based deployment alerts",
      "Inline component preview sharing",
      "Slash commands for quick actions",
    ],
    difficulty: "Easy",
    status: "Available",
    color: "bg-[#4A154B]",
  },
  {
    name: "Linear",
    logo: "LN",
    description:
      "Link UI components and design tokens directly to Linear issues and projects.",
    features: [
      "Bidirectional issue sync",
      "Component status tied to issue state",
      "Automated changelog entries",
    ],
    difficulty: "Medium",
    status: "Available",
    color: "bg-[#5E6AD2]",
  },
  {
    name: "Jira",
    logo: "JR",
    description:
      "Connect Jira projects to track UI changes alongside engineering work.",
    features: [
      "Epic-to-component mapping",
      "Sprint burndown with UI metrics",
      "Custom field integration",
    ],
    difficulty: "Medium",
    status: "Available",
    color: "bg-[#0052CC]",
  },
  {
    name: "Vercel",
    logo: "V",
    description:
      "Deploy accepted UI changes instantly to Vercel with zero configuration.",
    features: [
      "One-click production deploys",
      "Preview deployments per component",
      "Automatic domain assignment",
    ],
    difficulty: "Easy",
    status: "Available",
    color: "bg-black",
  },
  {
    name: "Figma",
    logo: "Fi",
    description:
      "Import designs from Figma and keep them in sync with your codebase.",
    features: [
      "Design token extraction",
      "Component property mapping",
      "Real-time design-to-code bridge",
    ],
    difficulty: "Advanced",
    status: "Beta",
    color: "bg-[#A259FF]",
  },
  {
    name: "Datadog",
    logo: "DD",
    description:
      "Monitor the performance impact of every UI change across your applications.",
    features: [
      "Core Web Vitals tracking per component",
      "Regression detection on deploy",
      "Custom dashboard widgets",
    ],
    difficulty: "Medium",
    status: "Available",
    color: "bg-[#632CA6]",
  },
  {
    name: "Discord",
    logo: "Di",
    description:
      "Engage your community with rich embeds showing live component previews.",
    features: [
      "Rich embed cards for updates",
      "Role-based notification routing",
      "Threaded review discussions",
    ],
    difficulty: "Easy",
    status: "Coming Soon",
    color: "bg-[#5865F2]",
  },
  {
    name: "Notion",
    logo: "Nt",
    description:
      "Document your design system and component library directly inside Notion.",
    features: [
      "Live component documentation blocks",
      "Token table auto-generation",
      "Team wiki synchronization",
    ],
    difficulty: "Medium",
    status: "Coming Soon",
    color: "bg-white border border-zinc-200 text-zinc-900",
  },
  {
    name: "Sentry",
    logo: "Se",
    description:
      "Correlate frontend errors with specific component versions and releases.",
    features: [
      "Component-level error attribution",
      "Release-to-component mapping",
      "Performance breadcrumb enrichment",
    ],
    difficulty: "Medium",
    status: "Beta",
    color: "bg-[#362D59]",
  },
];

const STATUS_STYLES: Record<Status, string> = {
  Available:
    "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950 dark:text-green-400",
  "Coming Soon":
    "bg-zinc-100 text-zinc-500 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400",
  Beta: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-400",
};

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  Easy: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
  Medium:
    "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950",
  Advanced:
    "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
};

const API_SNIPPET = `curl -X POST https://api.uiascode.dev/v1/integrations \\
  -H "Authorization: Bearer $UIAC_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "integration": "github",
    "config": {
      "repo": "acme/design-system",
      "branch": "main",
      "sync_tokens": true
    }
  }'`;

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function IntegrationsPage() {
  const [toolName, setToolName] = useState("");
  const [email, setEmail] = useState("");
  const [useCase, setUseCase] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      {/* ====== Hero Section ====== */}
      <section className="relative overflow-hidden px-6 pb-20 pt-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.12),transparent)]" />
        <div className="mx-auto max-w-7xl text-center">
          <span className="inline-block rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
            Ecosystem
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-zinc-50">
            Connect Your Stack
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Seamless integrations with tools your team already uses. From version
            control to monitoring, plug UI-as-Code into your workflow in minutes &mdash; not days.
          </p>
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-zinc-500 dark:text-zinc-400">
            <span>
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">40+</strong> integrations
            </span>
            <span className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
            <span>
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">6</strong> categories
            </span>
            <span className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
            <span>
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">REST</strong> + Webhook APIs
            </span>
          </div>
        </div>
      </section>

      {/* ====== Integration Categories Grid ====== */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Browse by Category</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Find the right integration for every part of your development lifecycle.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <a
                key={cat.name}
                href={`#${cat.name.toLowerCase().replace(/\s+/g, "-")}`}
                className="group flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md hover:shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:shadow-zinc-900/30"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-2xl dark:from-indigo-950 dark:to-violet-950">
                  {cat.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-zinc-900 transition-colors group-hover:text-indigo-600 dark:text-zinc-50 dark:group-hover:text-indigo-400">
                    {cat.name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {cat.count} integration{cat.count !== 1 ? "s" : ""} available
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    Explore
                    <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ====== Featured Integrations (Horizontal Scroll) ====== */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Featured Integrations</h2>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">Deep-dive into our most popular connections.</p>
            </div>
            <span className="hidden text-sm text-zinc-400 sm:inline-block dark:text-zinc-500">Scroll to explore &rarr;</span>
          </div>
          <div className="relative mt-10">
            <div className="-mx-6 flex gap-6 overflow-x-auto px-6 pb-4 scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent dark:scrollbar-thumb-zinc-700">
              {FEATURED_INTEGRATIONS.map((integration) => (
                <article
                  key={integration.name}
                  className="group flex w-[380px] shrink-0 flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:shadow-zinc-900/30"
                >
                  {/* Header: Logo + Name + Status */}
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${integration.color} text-sm font-bold text-white`} aria-hidden="true">
                      {integration.logo}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">{integration.name}</h3>
                        <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[integration.status]}`}>
                          {integration.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Description */}
                  <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{integration.description}</p>
                  {/* Features */}
                  <ul className="mt-4 space-y-2">
                    {integration.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {/* Footer: Difficulty + Connect */}
                  <div className="mt-auto flex items-center justify-between pt-5 border-t border-zinc-100 dark:border-zinc-800">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${DIFFICULTY_STYLES[integration.difficulty]}`}>
                      {integration.difficulty}
                    </span>
                    <a
                      href="#"
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        integration.status === "Coming Soon"
                          ? "cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                          : "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                      }`}
                    >
                      {integration.status === "Coming Soon" ? "Notify Me" : "Connect"}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====== API Section ====== */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div>
              <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">Developer Tools</span>
              <h2 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Powerful API &amp; Webhooks</h2>
              <p className="mt-3 text-zinc-600 leading-relaxed dark:text-zinc-400">
                Build custom workflows with our full-featured REST API. Manage integrations programmatically,
                subscribe to events via webhooks, and automate your entire pipeline.
              </p>
              <dl className="mt-8 space-y-4">
                {[
                  { icon: "M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5", label: "REST API", desc: "CRUD operations for integrations, tokens, components, and environments. Full OpenAPI spec available.", bg: "indigo" },
                  { icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z", label: "Webhooks", desc: "Real-time event delivery for component changes, deployments, reviews, and more. Retry logic included.", bg: "emerald" },
                  { icon: "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z", label: "SDKs", desc: "Official TypeScript, Python, and Go SDKs for rapid integration development.", bg: "amber" },
                ].map(({ icon, label, desc, bg }) => (
                  <div key={label} className="flex items-start gap-3">
                    <dt className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-${bg}-50 text-${bg}-600 dark:bg-${bg}-950 dark:text-${bg}-400`}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
                    </dt>
                    <dd>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{label}</p>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{desc}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex items-stretch">
              <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-lg dark:border-zinc-800">
                <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
                  <span className="h-3 w-3 rounded-full bg-red-500/80" /><span className="h-3 w-3 rounded-full bg-yellow-500/80" /><span className="h-3 w-3 rounded-full bg-green-500/80" />
                  <span className="ml-2 text-xs font-mono text-zinc-500">terminal</span>
                </div>
                <pre className="overflow-x-auto p-5 text-sm leading-relaxed text-zinc-300"><code>{API_SNIPPET}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== Build Your Own Integration ====== */}
      <section className="border-y border-zinc-200 bg-zinc-50 px-6 py-20 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-7xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-sm font-medium text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.93 18.75A2.652 2.652 0 0 1 17.25 21l-5.877-5.877" /></svg>
            For Developers
          </span>
          <h2 className="mt-6 text-3xl font-bold text-zinc-900 sm:text-4xl dark:text-zinc-50">Build Your Own Integration</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Don&apos;t see what you need? Our developer platform gives you everything to build,
            publish, and share custom integrations.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { title: "Developer Docs", desc: "Comprehensive guides, API references, and architecture patterns for building integrations.", link: "/docs/integrations", linkText: "Read the docs", icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z", color: "indigo" },
              { title: "API Keys", desc: "Generate scoped API keys with fine-grained permissions for your integration.", link: "/api-keys", linkText: "Manage keys", icon: "M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z", color: "emerald" },
              { title: "Webhook Endpoints", desc: "Subscribe to 20+ event types including component changes, reviews, and deployments.", link: "/webhooks", linkText: "Configure webhooks", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z", color: "amber" },
            ].map(({ title, desc, link, linkText, icon, color }) => (
              <div key={title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${color}-50 text-${color}-600 dark:bg-${color}-950 dark:text-${color}-400`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{desc}</p>
                <a href={link} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                  {linkText}
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== Request an Integration Form ====== */}
      <section className="px-6 pb-24 pt-20">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-lg sm:p-12 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-zinc-50">Request an Integration</h2>
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                Tell us which tool you&apos;d like to see integrated and our team will reach out with a timeline.
              </p>
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="mt-10 space-y-6">
              <div>
                <label htmlFor="tool-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Tool Name</label>
                <select id="tool-name" value={toolName} onChange={(e) => setToolName(e.target.value)}
                  className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                  <option value="">Select a tool...</option>
                  <option value="asana">Asana</option><option value="bitbucket">Bitbucket</option>
                  <option value="circleci">CircleCI</option><option value="gitlab">GitLab</option>
                  <option value="netlify">Netlify</option><option value="new-relic">New Relic</option>
                  <option value="sketch">Sketch</option><option value="adobe-xd">Adobe XD</option>
                  <option value="ms-teams">Microsoft Teams</option><option value="other">Other (specify below)</option>
                </select>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Your Email</label>
                <input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
              </div>
              <div>
                <label htmlFor="use-case" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Use Case Description</label>
                <textarea id="use-case" rows={4} placeholder="Describe how you'd like this integration to work..." value={useCase} onChange={(e) => setUseCase(e.target.value)}
                  className="mt-2 block w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
              </div>
              <button type="submit"
                className="w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-600">
                Submit Request
              </button>
              <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">We typically respond within 48 hours. No spam, ever.</p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
