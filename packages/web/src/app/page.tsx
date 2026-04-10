"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Smooth scroll to section
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-32 pb-20 sm:pt-40 sm:pb-28">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/60 blur-3xl dark:bg-blue-900/20" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>
            Now in Beta — Free to use
          </div>

          <h1 className="max-w-3xl mx-auto text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
            Fix your SaaS UI{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">
              without writing code
            </span>
          </h1>

          <p className="mt-6 max-w-xl mx-auto text-lg sm:text-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
            Select any element on a SaaS page, describe what you want changed,
            and AI generates the code diff. Preview it, then submit as a PR.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => scrollTo("how-it-works")}
              className="w-full sm:w-auto rounded-full bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              See How It Works →
            </button>
            <Link
              href="/pr"
              className="w-full sm:w-auto rounded-full border border-zinc-200 bg-white px-8 py-3.5 text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-950"
            >
              Browse PRs →
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center justify-center gap-6 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Open Source
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Chrome Extension
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              AI-Powered
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-zinc-100 bg-zinc-50/80 px-6 py-24 dark:border-zinc-900 dark:bg-zinc-950/80">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">How it works</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              From frustration to fix in 4 steps
            </h2>
            <p className="mt-4 text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
              No coding knowledge required. Just point, describe, and let AI handle the rest.
            </p>
          </div>

          <div className="grid gap-10 lg:gap-12">
            {[
              {
                step: "01",
                title: "Select",
                desc: "Hold Alt and click any element on a SaaS page. Our extension detects React components automatically.",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Describe",
                desc: 'Type what you want changed in plain English — "Make the header bigger" or "Change the button color to green".',
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Preview",
                desc: "AI generates a unified diff. Review it in split view, overlay mode, or raw diff format before committing.",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
              {
                step: "04",
                title: "Submit",
                desc: "Adopt the change and auto-submit as a PR. Other users can vote on it, and SaaS maintainers can merge it.",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <div key={item.step} className="group relative flex gap-6 lg:gap-8">
                {/* Connector line */}
                {i < 3 && (
                  <div className="absolute left-[18px] top-12 hidden h-[calc(100%-2rem)] w-px bg-gradient-to-b from-blue-300 to-transparent lg:block dark:from-blue-800" />
                )}
                {/* Step number */}
                <div className="relative shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-110">
                  {item.icon}
                </div>
                {/* Content */}
                <div className="pt-1 pb-4">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported SaaS */}
      <section className="border-t border-zinc-100 bg-white px-6 py-20 dark:border-zinc-900 dark:bg-black">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-400">Works with</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-50 grayscale">
            {["HubSpot", "Salesforce", "Notion", "Linear", "Jira", "Figma", "Stripe", "Vercel"].map((name) => (
              <span key={name} className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Why UI-as-Code? */}
      <section className="border-t border-zinc-100 bg-zinc-50/80 px-6 py-24 dark:border-zinc-900 dark:bg-zinc-950/80">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Why UI-as-Code?</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              Built differently from day one
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "No Code Required",
                desc: "Describe changes in plain language. AI handles the code generation, diff creation, and PR formatting automatically.",
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                ),
              },
              {
                title: "Real Code Diffs",
                desc: "Not just CSS tweaks — generates actual unified diffs that can be reviewed, tested, and merged into production codebases.",
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                ),
              },
              {
                title: "Community Driven",
                desc: "Changes are voted on by the community. The best improvements rise to the top and get merged by product maintainers.",
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-zinc-200 bg-white p-7 dark:border-zinc-800 dark:bg-black">
                <div className="mb-4 inline-flex rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-zinc-100 bg-zinc-50/80 px-6 py-24 dark:border-zinc-900 dark:bg-zinc-950/80">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Pricing</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              Start free, scale when ready
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                description: "For individuals exploring UI improvements",
                features: [
                  "5 AI generations / month",
                  "Public PR submissions",
                  "Community voting access",
                  "Chrome extension",
                ],
                cta: "Get Started Free",
                ctaStyle: "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-50 dark:hover:bg-zinc-900",
              },
              {
                name: "Pro",
                price: "$19",
                period: "/month",
                description: "For power users who modify UIs daily",
                features: [
                  "Unlimited AI generations",
                  "Private PR submissions",
                  "Priority processing queue",
                  "Email support",
                  "Usage analytics dashboard",
                ],
                highlight: true,
                cta: "Start Pro Trial",
                ctaStyle: "bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5",
              },
              {
                name: "Team",
                price: "$49",
                period: "/seat/month",
                description: "For teams collaborating on UI improvements",
                features: [
                  "Everything in Pro",
                  "Team workspace & sharing",
                  "Pain point analytics",
                  "Slack & webhook integrations",
                  "Dedicated account manager",
                ],
                cta: "Contact Sales",
                ctaStyle: "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-50 dark:hover:bg-zinc-900",
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 ${
                  plan.highlight
                    ? "border-2 border-blue-600 bg-white shadow-xl ring-1 ring-blue-600/20 dark:bg-zinc-900"
                    : "border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{plan.name}</h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{plan.description}</p>
                <p className="mt-4">
                  <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">{plan.price}</span>
                  <span className="text-sm text-zinc-500">{plan.period}</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`mt-8 w-full rounded-xl py-3 text-sm font-semibold transition-all ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-zinc-100 px-6 py-24 dark:border-zinc-900">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Does this work with any website?",
                a: "UI-as-Code works with any SaaS application built with React. It detects React component boundaries automatically, and falls back to DOM element selection for non-React pages.",
              },
              {
                q: "Is my data secure?",
                a: "Yes. Component code is analyzed locally by AI and sent only to our API for diff generation. We don't store your page content — only the friction reports and PRs you explicitly submit.",
              },
              {
                q: "What happens after I submit a PR?",
                a: "Your change is submitted as a pull request that other users can vote on. When enough people support it, the SaaS maintainer can merge it, and the improvement benefits everyone using that product.",
              },
              {
                q: "Do I need to know how to code?",
                a: "Not at all! That's the whole point. You describe what you want in plain language (e.g., \"make the button bigger\"), and AI generates the code changes for you to preview and approve.",
              },
              {
                q: "Is it really free?",
                a: "The free tier includes 5 AI generations per month, which is plenty for casual use. Pro and Team plans offer unlimited generations and additional features.",
              },
              {
                q: "How is this different from browser DevTools?",
                a: "DevTools lets you temporarily modify styles but those changes disappear on refresh. UI-as-Code generates real code diffs that can be submitted as permanent improvements through the PR process.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-zinc-200 bg-white transition-colors hover:border-blue-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-800"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-left font-medium text-zinc-900 dark:text-zinc-50">
                  {item.q}
                  <svg className="h-5 w-5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="px-6 pb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Install CTA */}
      <section id="install" className="border-t border-zinc-100 bg-gradient-to-b from-blue-600 to-blue-700 px-6 py-24 text-center dark:from-blue-800 dark:to-blue-900">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to fix your SaaS?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Install the Chrome extension and start modifying interfaces in under a minute.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/YanziMa/ui-as-code"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-blue-700 shadow-lg transition-all hover:bg-blue-50 hover:-translate-y-0.5"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              View on GitHub
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
            >
              Go to Dashboard →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
