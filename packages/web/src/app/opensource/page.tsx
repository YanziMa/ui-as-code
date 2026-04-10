"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const stats = [
  { label: "Stars", value: "12.4k", icon: "\u2B50" },
  { label: "Forks", value: "3.1k", icon: "\uE0B0" },
  { label: "Contributors", value: "847", icon: "\u{1F465}" },
  { label: "Releases", value: "42", icon: "\u{1F4E6}" },
];

const howToContribute = [
  {
    title: "Code Contributions",
    description:
      "Submit pull requests, follow our code style guide, and use conventional commit messages. Every line of code helps us build a better product.",
    items: ["PR workflow & review process", "ESLint + Prettier config", "Conventional Commits spec"],
    icon: "{ }",
  },
  {
    title: "Documentation",
    description:
      "Help us keep docs accurate, translate them into your language, or add real-world examples that make onboarding easier for everyone.",
    items: ["Improve existing guides", "Add translations", "Write tutorials & examples"],
    icon: "\u{1F4D4}",
  },
  {
    title: "Design",
    description:
      "Contribute UI improvements, design new icons, or create theme variations. Good design makes open source accessible to all.",
    items: ["UI component polish", "Icon & illustration design", "Theme contributions"],
    icon: "\u{1F3A8}",
  },
];

const contributors = [
  { name: "Sarah Chen", username: "@sarahchen", initials: "SC", color: "#6366f1", type: "Bug Fix", count: 147, area: "Core Engine" },
  { name: "Marcus Rivera", username: "@mrivera", initials: "MR", color: "#8b5cf6", type: "Feature", count: 132, area: "CLI Tools" },
  { name: "Aisha Patel", username: "@aishap", initials: "AP", color: "#ec4899", type: "Docs", count: 98, area: "Documentation" },
  { name: "James Okafor", username: "@jameso", initials: "JO", color: "#f59e0b", type: "Design", count: 86, area: "UI Components" },
  { name: "Yuki Tanaka", username: "@yukitanaka", initials: "YT", color: "#10b981", type: "Feature", count: 81, area: "Plugin System" },
  { name: "Elena Volkov", username: "@elenav", initials: "EV", color: "#ef4444", type: "Bug Fix", count: 74, area: "Runtime" },
  { name: "Rajesh Kumar", username: "@rajeshk", initials: "RK", color: "#06b6d4", type: "Docs", count: 69, area: "API Reference" },
  { name: "Maria Santos", username: "@marias", initials: "MS", color: "#84cc16", type: "Feature", count: 63, area: "Integrations" },
  { name: "Oliver Dubois", username: "@oliverd", initials: "OD", color: "#f97316", type: "Design", count: 58, area: "Brand Assets" },
  { name: "Priya Sharma", username: "@priyas", initials: "PS", color: "#a855f7", type: "Bug Fix", count: 52, area: "Test Suite" },
  { name: "Lucas Mueller", username: "@lucasm", initials: "LM", color: "#14b8a6", type: "Feature", count: 47, area: "Compiler" },
  { name: "Nina Kowalski", username: "@ninak", initials: "NK", color: "#e11d48", type: "Docs", count: 41, area: "Tutorials" },
];

const roadmap = [
  { version: "v0.1", title: "Initial Release", date: "Mar 2024", status: "done", desc: "First public alpha with core rendering engine" },
  { version: "v0.5", title: "Plugin System", date: "Jun 2024", status: "done", desc: "Extensible plugin architecture launched" },
  { version: "v1.0", title: "Stable API", date: "Sep 2024", status: "done", desc: "Production-ready stable release with full docs" },
  { version: "v1.5", title: "Performance Overhaul", date: "Q2 2025", status: "in-progress", desc: "2x faster builds, tree-shaking, SSR optimization" },
  { version: "v2.0", title: "Next-Gen Runtime", date: "Q4 2025", status: "upcoming", desc: "New runtime with incremental compilation & hot reload" },
];

const communityLinks = [
  { name: "Discord", url: "#", description: "Real-time chat with the community", icon: "\u{1F4AC}" },
  { name: "GitHub Discussions", url: "#", description: "Q&A, ideas, and announcements", icon: "\u{1F4AD}" },
  { name: "Twitter / X", url: "#", description: "Follow for updates and highlights", icon: "\u{1F426}" },
  { name: "Dev.to Articles", url: "#", description: "Tutorials and deep-dive posts", icon: "\u{1F4DA}" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function badgeColor(type: string) {
  switch (type) {
    case "Bug Fix":
      return "bg-red-100 text-red-700";
    case "Feature":
      return "bg-indigo-100 text-indigo-700";
    case "Docs":
      return "bg-emerald-100 text-emerald-700";
    case "Design":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "done":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "in-progress":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "upcoming":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "done":
      return "Released";
    case "in-progress":
      return "In Progress";
    case "upcoming":
      return "Planned";
    default:
      return status;
  }
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function OpenSourcePage() {
  const [activeTab, setActiveTab] = useState<"license" | "conduct">("license");

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-white">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-24 pb-16">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
          <div className="absolute top-20 right-0 h-[300px] w-[400px] rounded-full bg-purple-600/15 blur-[100px]" />
          <div className="absolute bottom-0 left-0 h-[250px] w-[350px] rounded-full bg-cyan-500/10 blur-[90px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300 backdrop-blur-sm">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Community Driven
          </div>

          <h1 className="mx-auto max-w-3xl bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Open Source
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-indigo-200/80 sm:text-xl">
            Built by the community, for the community. Every feature, fix, and
            improvement comes from developers like you who believe in building
            better tools together.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-300">
              &#11088; 12.4k GitHub Stars
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
              &#128101; 847 Contributors
            </span>
          </div>
        </div>
      </section>

      {/* ===== QUICK STATS BAR ===== */}
      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/40 hover:bg-white/10"
              >
                <div className="text-3xl">{s.icon}</div>
                <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                  {s.value}
                </p>
                <p className="mt-1 text-sm text-indigo-300/70">{s.label}</p>
                <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl transition-all group-hover:bg-indigo-500/20" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW TO CONTRIBUTE ===== */}
      <section id="contribute" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">How to Contribute</h2>
            <p className="mt-3 text-indigo-300/70 max-w-xl mx-auto">
              There are many ways to help. Pick the one that fits your skills and interests.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {howToContribute.map((card) => (
              <div
                key={card.title}
                className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/40 hover:bg-white/[0.07] hover:shadow-xl hover:shadow-indigo-500/5"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold shadow-lg shadow-indigo-500/25">
                  {card.icon}
                </div>
                <h3 className="mt-5 text-xl font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-indigo-300/70">
                  {card.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {card.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-indigo-200/60">
                      <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  href="#"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                >
                  Get Started &rarr;
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CONTRIBUTOR SPOTLIGHT ===== */}
      <section id="contributors" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold sm:text-4xl">Contributor Spotlight</h2>
              <p className="mt-2 text-indigo-300/70">Meet the people who make this project possible.</p>
            </div>
            <a href="#" className="hidden text-sm font-medium text-indigo-400 hover:text-indigo-300 sm:block">
              View all on GitHub &rarr;
            </a>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {contributors.map((c) => (
              <div
                key={c.username}
                className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/30 hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-md"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-sm">{c.name}</p>
                    <p className="truncate text-xs text-indigo-300/60">{c.username}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor(c.type)}`}>
                    {c.type}
                  </span>
                  <span className="text-xs text-indigo-300/50">
                    {c.count} contributions
                  </span>
                </div>
                <p className="mt-2 text-xs text-indigo-300/40">
                  Top: <span className="text-indigo-300/70">{c.area}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ROADMAP TIMELINE ===== */}
      <section id="roadmap" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Roadmap</h2>
            <p className="mt-2 text-indigo-300/70">Where we&apos;ve been and where we&apos;re headed.</p>
          </div>

          <div className="relative mt-14">
            {/* Timeline line */}
            <div className="absolute top-8 left-0 right-0 hidden h-0.5 bg-gradient-to-r from-indigo-500/40 via-purple-500/40 to-slate-600/30 md:block" />

            <div className="grid gap-6 md:grid-cols-5">
              {roadmap.map((item, i) => (
                <div key={item.version} className="relative">
                  {/* Dot */}
                  <div className="mx-auto mb-4 flex h-5 w-5 items-center justify-center">
                    <div
                      className={`z-10 h-4 w-4 rounded-full border-2 ${
                        item.status === "done"
                          ? "border-emerald-400 bg-emerald-400"
                          : item.status === "in-progress"
                            ? "border-amber-400 bg-amber-400 animate-pulse"
                            : "border-slate-500 bg-slate-700"
                      }`}
                    />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center backdrop-blur-sm transition-all hover:border-indigo-500/30 hover:bg-white/[0.06]">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                    <p className="mt-3 font-mono text-lg font-bold text-indigo-200">{item.version}</p>
                    <p className="mt-1 text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-indigo-300/50">{item.date}</p>
                    <p className="mt-2 text-xs leading-relaxed text-indigo-300/60">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== LICENSE & GOVERNANCE ===== */}
      <section id="governance" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">License &amp; Governance</h2>
            <p className="mt-2 text-indigo-300/70">Open, transparent, and community-led.</p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* License box */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20 text-lg">&#169;</div>
                <h3 className="text-xl font-semibold">MIT License</h3>
              </div>
              <div className="mt-5 space-y-3 text-sm leading-relaxed text-indigo-300/70">
                <p>
                  This project is licensed under the MIT License &mdash; one of the most permissive
                  open-source licenses available.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    Free to use for personal and commercial projects
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    Free to modify, distribute, and sublicense
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    No warranty or liability &mdash; use at your own risk
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    License and copyright notice must be included
                  </li>
                </ul>
              </div>
              <a href="#" className="mt-5 inline-block text-sm font-medium text-indigo-400 hover:text-indigo-300">
                Read full license text &rarr;
              </a>
            </div>

            {/* Governance / CoC tabs */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => setActiveTab("license")}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "license"
                      ? "border-b-2 border-indigo-400 text-indigo-300"
                      : "text-indigo-300/50 hover:text-indigo-300/80"
                  }`}
                >
                  Code of Conduct
                </button>
                <button
                  onClick={() => setActiveTab("conduct")}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "conduct"
                      ? "border-b-2 border-indigo-400 text-indigo-300"
                      : "text-indigo-300/50 hover:text-indigo-300/80"
                  }`}
                >
                  Governance Model
                </button>
              </div>
              <div className="p-8">
                {activeTab === "license" ? (
                  <div className="space-y-3 text-sm leading-relaxed text-indigo-300/70">
                    <p>
                      We are committed to providing a welcoming and inspiring community for all.
                      Our Code of Conduct ensures every participant can contribute in an environment
                      free from harassment and discrimination.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                        Be respectful and considerate in all interactions
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                        Welcome newcomers and help them get started
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                        Focus on what is best for the community
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                        Show empathy towards other community members
                      </li>
                    </ul>
                    <a href="#" className="mt-4 inline-block text-sm font-medium text-indigo-400 hover:text-indigo-300">
                      Read full Code of Conduct &rarr;
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm leading-relaxed text-indigo-300/70">
                    <p>
                      This project follows a meritocratic governance model where influence is earned
                      through consistent, high-quality contributions.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                        <strong className="text-indigo-300/90">Maintainers</strong> &mdash; Core team with merge access
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                        <strong className="text-indigo-300/90">Committers</strong> &mdash; Trusted contributors with write access
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                        <strong className="text-indigo-300/90">Contributors</strong> &mdash; Anyone who submits a PR or issue
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                        <strong className="text-indigo-300/90">Users</strong> &mdash; The entire community using the project
                      </li>
                    </ul>
                    <p className="mt-3 text-xs text-indigo-300/50">
                      Major decisions are made via RFC process with community feedback periods.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== COMMUNITY RESOURCES ===== */}
      <section id="community" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Community Resources</h2>
            <p className="mt-2 text-indigo-300/70">Connect, learn, and grow with the community.</p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {communityLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                className="group rounded-xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/40 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-indigo-500/5"
              >
                <span className="text-3xl">{link.icon}</span>
                <h3 className="mt-4 text-lg font-semibold group-hover:text-indigo-300 transition-colors">{link.name}</h3>
                <p className="mt-1.5 text-sm text-indigo-300/60">{link.description}</p>
                <span className="mt-3 inline-flex text-sm font-medium text-indigo-400 opacity-0 transition-opacity group-hover:opacity-100">
                  Join &rarr;
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/20 via-purple-600/15 to-indigo-900/20 p-12 text-center backdrop-blur-sm">
            {/* Decorative elements */}
            <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-[80px]" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-purple-500/20 blur-[80px]" />

            <div className="relative">
              <h2 className="text-3xl font-bold sm:text-4xl">Ready to Contribute?</h2>
              <p className="mx-auto mt-4 max-w-xl text-indigo-200/70">
                Join thousands of developers building the future of UI-as-code together.
                Your first contribution is just a PR away.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-indigo-950 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/25"
                >
                  &#11088; Star us on GitHub
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-8 py-3.5 text-base font-semibold text-white/90 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10"
                >
                  Read Contributing Guide &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer spacer */}
      <footer className="border-t border-white/10 pb-8 pt-12 text-center text-sm text-indigo-300/40">
        <p>Made with love by the open-source community.</p>
      </footer>
    </main>
  );
}
