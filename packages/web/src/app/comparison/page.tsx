"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CellValue = "yes" | "no" | "partial" | string;

interface FeatureRow {
  label: string;
  uiAsCode: CellValue;
  manualCoding: CellValue;
  figmaToCode: CellValue;
  visualBuilders: CellValue;
  inHouseDev: CellValue;
}

interface RoleCard {
  role: string;
  emoji: string;
  headline: string;
  body: string;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const COLUMNS = [
  { key: "uiAsCode" as const, label: "UI-as-Code", highlight: true },
  { key: "manualCoding" as const, label: "Manual Coding", highlight: false },
  { key: "figmaToCode" as const, label: "Figma-to-Code Tools", highlight: false },
  { key: "visualBuilders" as const, label: "Visual Builders", highlight: false },
  { key: "inHouseDev" as const, label: "In-House Dev Team", highlight: false },
] as const;

const FEATURES: FeatureRow[] = [
  { label: "Natural language input", uiAsCode: "yes", manualCoding: "no", figmaToCode: "no", visualBuilders: "no", inHouseDev: "no" },
  { label: "No coding required", uiAsCode: "yes", manualCoding: "no", figmaToCode: "partial", visualBuilders: "yes", inHouseDev: "no" },
  { label: "Works on any SaaS site", uiAsCode: "yes", manualCoding: "yes", figmaToCode: "no", visualBuilders: "no", inHouseDev: "yes" },
  { label: "Real browser preview", uiAsCode: "yes", manualCoding: "yes", figmaToCode: "partial", visualBuilders: "yes", inHouseDev: "yes" },
  { label: "One-click deployment", uiAsCode: "yes", manualCoding: "no", figmaToCode: "no", visualBuilders: "yes", inHouseDev: "no" },
  { label: "AI-powered diff generation", uiAsCode: "yes", manualCoding: "no", figmaToCode: "partial", visualBuilders: "no", inHouseDev: "no" },
  { label: "Component-level targeting", uiAsCode: "yes", manualCoding: "yes", figmaToCode: "no", visualBuilders: "partial", inHouseDev: "yes" },
  { label: "Version control integration", uiAsCode: "yes", manualCoding: "yes", figmaToCode: "no", visualBuilders: "no", inHouseDev: "yes" },
  { label: "Team collaboration", uiAsCode: "yes", manualCoding: "partial", figmaToCode: "partial", visualBuilders: "partial", inHouseDev: "yes" },
  { label: "Custom branding support", uiAsCode: "yes", manualCoding: "yes", figmaToCode: "no", visualBuilders: "partial", inHouseDev: "yes" },
  { label: "Analytics & insights", uiAsCode: "yes", manualCoding: "no", figmaToCode: "no", visualBuilders: "partial", inHouseDev: "no" },
  { label: "Enterprise SSO", uiAsCode: "yes", manualCoding: "no", figmaToCode: "no", visualBuilders: "partial", inHouseDev: "no" },
  { label: "API access", uiAsCode: "yes", manualCoding: "yes", figmaToCode: "partial", visualBuilders: "partial", inHouseDev: "yes" },
  { label: "Free tier available", uiAsCode: "yes", manualCoding: "yes", figmaToCode: "partial", visualBuilders: "partial", inHouseDev: "no" },
  { label: "Setup time", uiAsCode: "< 2 min", manualCoding: "Hours+", figmaToCode: "30+ min", visualBuilders: "1-2 hrs", inHouseDev: "Weeks" },
  { label: "Learning curve", uiAsCode: "Minimal", manualCoding: "Steep", figmaToCode: "Moderate", visualBuilders: "Low-Moderate", inHouseDev: "N/A (hire)" },
];

const DIFFERENTIATORS = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
    title: "AI-Powered Diff Generation",
    description:
      "Describe what you want in plain English and our AI produces clean, reviewable code diffs — no IDE required. Every change is traceable and merge-ready.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: "Works on Any Live Site",
    description:
      "No need to clone repos or set up environments. Point UI-as-Code at any SaaS application and start modifying components directly in the browser.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    title: "One-Click to Production",
    description:
      "Ship changes via PR or deploy instantly. Built-in version control, rollback support, and audit trails mean you're always in control.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: "Built for Teams",
    description:
      "Role-based permissions, comment threads, approval workflows, and shared component libraries keep everyone aligned without stepping on each other's toes.",
  },
];

const ROLE_CARDS: RoleCard[] = [
  {
    role: "PM",
    emoji: "\u{1F4CB}",
    headline: "Ship faster, skip the dev queue",
    body: "Prototype and ship UI changes yourself using natural language. No more writing specs and waiting for engineering sprints. Validate ideas in minutes, not weeks.",
  },
  {
    role: "Designer",
    emoji: "\u{1F3A8}",
    headline: "From design to production, no handoff gap",
    body: "Make pixel-perfect tweaks directly on live pages. Your changes generate clean diffs that developers actually want to review — no more zombie Figma files.",
  },
  {
    role: "Developer",
    emoji: "\u{1F4BB}",
    headline: "Stop being the UI change bottleneck",
    body: "Review AI-generated diffs instead of building from scratch. Every change comes with context, tests, and a clear diff. Merge with confidence.",
  },
  {
    role: "Founder",
    emoji: "\u{1F680}",
    headline: "Move at startup speed",
    body: "Iterate on your product's look and feel without hiring a front-end team. Get to market faster with a fraction of the cost and overhead.",
  },
  {
    role: "Customer Success",
    emoji: "\u{1F91D}",
    headline: "Turn feedback into action instantly",
    body: "When customers ask for UI tweaks, make them on the spot. Demonstrate responsiveness and close the feedback loop without filing tickets.",
  },
];

const TRUST_BADGES = [
  "Acme Corp",
  "Globex Inc",
  "Initech",
  "Umbrella Co",
  "Stark Industries",
  "Wayne Enterprises",
  "Oscorp",
  "Cyberdyne",
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function Cell({ value, highlighted }: { value: CellValue; highlighted: boolean }) {
  if (value === "yes") {
    return (
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
          highlighted ? "bg-white/30 text-white" : "bg-emerald-100 text-emerald-700"
        }`}
      >
        &#10003;
      </span>
    );
  }
  if (value === "no") {
    return (
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-light shrink-0 ${
          highlighted ? "text-white/40" : "bg-gray-100 text-gray-300"
        }`}
      >
        &#10005;
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
          highlighted ? "bg-white/20 text-white/90" : "bg-amber-100 text-amber-700"
        }`}
      >
        &#9678;
      </span>
    );
  }
  return (
    <span className={`text-sm font-medium ${highlighted ? "text-white/90" : "text-gray-700"}`}>
      {value}
    </span>
  );
}

function RoleButton({
  role,
  active,
  onClick,
}: {
  role: string;
  active: boolean;
  onClick: () => void;
}) {
  const card = ROLE_CARDS.find((r) => r.role === role)!;
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 px-5 py-4 transition-all duration-200 ${
        active
          ? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <span className="text-2xl">{card.emoji}</span>
      <span
        className={`text-sm font-semibold ${
          active ? "text-indigo-700" : "text-gray-700 group-hover:text-gray-900"
        }`}
      >
        {card.role}
      </span>
      {active && (
        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
          &#10003;
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ComparisonPage() {
  const [activeRole, setActiveRole] = useState<string>("PM");

  const activeCard = ROLE_CARDS.find((r) => r.role === activeRole) ?? ROLE_CARDS[0];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ====== HERO ====== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-purple-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 text-center">
          <span className="mb-4 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white/90 backdrop-blur-sm">
            Competitor Analysis
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Why UI-as-Code?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-indigo-100 sm:text-xl">
            Choosing the right UI modification platform can save your team hundreds of hours.
            See how we stack up against every approach out there.
          </p>
        </div>
      </section>

      {/* ====== COMPARISON TABLE ====== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Feature comparison</h2>
          <p className="mt-2 text-gray-500">Side-by-side across the most important capabilities</p>
        </div>

        <div className="overflow-x-auto rounded-2xl shadow-xl ring-1 ring-gray-200">
          <table className="min-w-full divide-y divide-gray-200 bg-white text-left">
            <thead>
              <tr>
                <th className="px-6 py-5 text-sm font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/80">
                  Feature
                </th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-6 py-5 text-center text-sm font-bold uppercase tracking-wider ${
                      col.highlight
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                        : "bg-gray-50/80 text-gray-600"
                    }`}
                  >
                    <span className="flex flex-col items-center gap-1">
                      {col.label}
                      {col.highlight && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                          &#11088; Recommended
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {FEATURES.map((row, idx) => (
                <tr
                  key={row.label}
                  className={
                    idx % 2 === 0
                      ? "bg-white transition-colors hover:bg-gray-50/60"
                      : "bg-gray-50/50 transition-colors hover:bg-gray-50/80"
                  }
                >
                  <td className="whitespace-nowrap px-6 py-3.5 text-sm font-medium text-gray-800">
                    {row.label}
                  </td>
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`px-6 py-3.5 text-center ${
                        col.highlight
                          ? "bg-indigo-50/60"
                          : ""
                      }`}
                    >
                      <Cell value={row[col.key]} highlighted={col.highlight} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">&#10003;</span>{" "}
            Full support
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">&#9678;</span>{" "}
            Partial / Limited
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-sm font-light text-gray-300">&#10005;</span>{" "}
            Not available
          </span>
        </div>
      </section>

      {/* ====== KEY DIFFERENTIATORS ====== */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">What sets us apart</h2>
            <p className="mt-2 text-gray-500">Four capabilities you won't find anywhere else</p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {DIFFERENTIATORS.map((d) => (
              <article
                key={d.title}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-8 transition-shadow hover:shadow-lg"
              >
                <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-indigo-100 p-3 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                  {d.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{d.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{d.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ====== USE CASE MATCHER ====== */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-gray-900">Find your fit</h2>
            <p className="mt-2 text-gray-500">Select your role to see why UI-as-Code is built for you</p>
          </div>

          {/* Role selector */}
          <div className="mb-10 flex flex-wrap justify-center gap-3">
            {ROLE_CARDS.map((r) => (
              <RoleButton
                key={r.role}
                role={r.role}
                active={activeRole === r.role}
                onClick={() => setActiveRole(r.role)}
              />
            ))}
          </div>

          {/* Active card */}
          <div className="mx-auto max-w-2xl rounded-2xl border border-indigo-200 bg-white p-8 shadow-lg shadow-indigo-50 sm:p-10">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-3xl">{activeCard.emoji}</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
                  For {activeCard.role}s
                </p>
                <h3 className="text-xl font-bold text-gray-900">{activeCard.headline}</h3>
              </div>
            </div>
            <p className="mt-3 leading-relaxed text-gray-600">{activeCard.body}</p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="/getting-started"
                className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
              >
                Get started free
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="ml-2 h-4 w-4" aria-hidden="true">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="/pricing" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                View pricing &rarr;
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ====== SOCIAL PROOF ====== */}
      <section className="border-y border-gray-200 bg-white py-12">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-8 text-sm font-semibold uppercase tracking-widest text-gray-400">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {TRUST_BADGES.map((name) => (
              <span
                key={name}
                className="rounded-lg border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-bold text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CTA ====== */}
      <section className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700">
        <div className="pointer-events-none absolute -top-16 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-26 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready to try it?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-indigo-200">
            Join thousands of teams shipping UI changes faster than ever.
            Start free today &mdash; no credit card required.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/pricing"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/30 bg-white/10 px-8 py-3.5 text-base font-bold text-white backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/20"
            >
              View pricing plans
            </a>
            <a
              href="/getting-started"
              className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3.5 text-base font-bold text-indigo-700 shadow-lg transition-all hover:bg-indigo-50 hover:shadow-xl"
            >
              Start free trial
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="ml-2 h-5 w-5" aria-hidden="true">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
          </div>

          <p className="mt-6 text-sm text-indigo-200/80">
            Free forever for individuals &middot; Pro plan starts at $12/mo &middot; Cancel anytime
          </p>
        </div>
      </section>
    </main>
  );
}
