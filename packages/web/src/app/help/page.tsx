import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "Find answers to common questions about UI-as-Code, browser extension usage, AI code generation, billing, and troubleshooting.",
};

/* ------------------------------------------------------------------ */
/*  FAQ data                                                           */
/* ------------------------------------------------------------------ */

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  name: string;
  icon: string;
  items: FaqItem[];
}

const faqCategories: FaqCategory[] = [
  {
    name: "Getting Started",
    icon: "\u{1F680}",
    items: [
      {
        question: "How do I install the UI-as-Code browser extension?",
        answer:
          'Install the extension from the Chrome Web Store. Open Chrome, navigate to the Chrome Web Store, search for "UI-as-Code", and click "Add to Chrome." Once installed, you will see the UI-as-Code icon in your toolbar. Pin it for quick access by clicking the puzzle-piece icon in the toolbar and selecting the pin icon next to UI-as-Code. The extension works on any Chromium-based browser (Chrome, Edge, Brave, Arc) that supports Manifest V3 extensions.',
      },
      {
        question: "What do I need to do before using UI-as-Code for the first time?",
        answer:
          "Before your first use, sign in with your GitHub or Google account via OAuth. This links your extension activity to your dashboard and lets you submit PRs, vote on changes, and track your contribution history. After signing in, open any SaaS page you want to modify, click the extension icon, and follow the onboarding flow which takes roughly 30 seconds. You can also configure your preferred AI provider and default settings from the Settings panel inside the extension popup.",
      },
      {
        question: "How do I set up my account and connect a repository?",
        answer:
          "After signing in via OAuth, navigate to Settings > Repository Connection. You can link one or more GitHub repositories where generated diffs will be submitted as pull requests. We support both public and private repositories (private repos require the GitHub App installation with appropriate permissions). Team accounts can share a single connected repository or each member can link their own fork for independent contributions.",
      },
      {
        question: "Which SaaS products does UI-as-Code work with?",
        answer:
          "UI-as-Code works with any web-based SaaS product built with React, Vue, Angular, or plain HTML/CSS/JS. This includes popular tools like Notion, Linear, Figma, Slack, Stripe Dashboard, Vercel, Netlify, Supabase Console, and hundreds more. The extension inspects the live DOM, so it is not limited to a specific whitelist of supported apps. Some Single Page Applications (SPAs) with heavy client-side rendering may require a brief moment after page load before the inspector becomes fully functional.",
      },
      {
        question: "Is there a CLI alternative if I don't want to use the browser extension?",
        answer:
          "Yes! UI-as-Code provides a full-featured CLI (`uac`) that you can install via npm: `npm install -g @ui-as-code/cli`. The CLI accepts screenshots or HTML snippets as input and generates diffs through the same AI pipeline. Run `uac init` to authenticate, then `uac diff --screenshot ./screenshot.png --description \"make the button blue\"` to generate a change. All CLI-generated diffs appear in your dashboard alongside extension-created ones.",
      },
    ],
  },
  {
    name: "Browser Extension",
    icon: "\u{1F5A5}\uFE0F",
    items: [
      {
        question: "How does Alt+Click (or Option+Click) component selection work?",
        answer:
          "Hold the Alt key (Option on Mac) and click anywhere on a webpage element. The extension highlights the nearest React component boundary and shows an inspector overlay with the component name, file path (when available from source maps), props summary, and a screenshot capture option. If source maps are available, we display the exact source file and line number. Without source maps, we infer the component tree from the DOM structure and React fiber nodes. You can adjust the selection granularity by pressing Alt+Click multiple times to expand or contract the selected subtree.",
      },
      {
        question: "What information does the inspector panel show me?",
        answer:
          "The inspector panel displays: (1) Component name and hierarchy path, (2) Detected framework (React/Vue/Angular/vanilla), (3) Current styles applied to the element (computed CSS), (4) Accessibility attributes (ARIA roles, labels, contrast ratio), (5) A screenshot thumbnail of the selected area, (6) Estimated complexity score based on nested depth and DOM node count, and (7) A one-click button to copy the extracted component source code to your clipboard. All data stays local until you explicitly trigger a diff generation.",
      },
      {
        question: "How do I take and use screenshots for my modification request?",
        answer:
          "After selecting a component with Alt+Click, click the camera icon in the inspector panel. The extension captures a high-resolution screenshot of the selected area (up to 4x device pixel ratio). You can then type a natural language description of what you want changed — for example, \"Increase the padding and make the primary action button green.\" The screenshot is sent alongside your description to the AI model, which uses visual context alongside the code to produce a more accurate diff. Screenshots are processed in-memory and not persisted to our servers unless you submit the resulting diff as a PR.",
      },
      {
        question: "The extension icon is grayed out — what does that mean?",
        answer:
          "The extension icon turns gray (inactive) when the current page is not a valid target. This happens on: (1) chrome:// URLs and other browser-internal pages, (2) pages where content security policies block extension scripts, (3) PDF viewer tabs, (4) new tab pages, or (5) pages loaded in incognito mode if you have not explicitly allowed the extension there. Navigate to any regular HTTPS webpage and the icon should become active (colored). If it remains grayed out unexpectedly, try refreshing the page or checking that the extension has permission for the site under chrome://extensions.",
      },
      {
        question: "Can I use UI-as-Code on localhost or staging environments?",
        answer:
          "Absolutely. The extension works on any URL, including `localhost`, `127.0.0.1`, `.local`, `.test`, `.dev`, and custom internal domains. In fact, testing on staging or local builds is often better because source maps are typically enabled in development builds, giving the inspector richer component information. Just be aware that diffs generated against non-production URLs may reference development-only class names or IDs that differ from what ships to production.",
      },
    ],
  },
  {
    name: "AI & Diffs",
    icon: "\u{1F9E0}",
    items: [
      {
        question: "How does the AI generate code diffs from my description?",
        answer:
          "When you submit a modification request, the system sends three inputs to the AI model: (1) the extracted component source code (HTML, CSS, JS/TS), (2) your natural language description, and (3) optionally a screenshot. Our prompt engineering pipeline structures these into a carefully crafted context that instructs the model to output a unified diff format (the same format used by `git diff`). The AI analyzes the existing code structure, understands your intent from the description, applies design-system-aware conventions (matching existing patterns like spacing scales, color tokens, and naming conventions), and outputs only the changed lines. The entire process typically completes in 5–15 seconds depending on complexity and model choice.",
      },
      {
        question: "How accurate are the generated diffs? Can I trust them?",
        answer:
          "Our models achieve approximately 85–92% acceptance rate on first-generation diffs for common UI modifications (color changes, layout adjustments, text updates, spacing tweaks). For more complex refactors (component restructuring, state logic changes, responsive breakpoints), the rate is around 70–80%. Every diff goes through a multi-stage validation pipeline: syntax checking, import verification, style conflict detection, and a sandbox preview render. You always review the diff in a side-by-side preview before adopting it. Think of the AI as a very fast junior developer — excellent at routine tasks, but complex changes benefit from your review.",
      },
      {
        question: "What AI models are available, and how do they differ?",
        answer:
          "UI-as-Code supports four providers: GLM (default, balanced speed and quality), Claude (best for complex component restructuring), OpenAI GPT (strong at following detailed multi-step instructions), and DeepSeek (most cost-effective for high-volume usage). Free tier users get GLM by default. Pro and Team plans can switch between all four providers in Settings. Each provider has different latency profiles: GLM averages ~5s, Claude ~8s, OpenAI ~7s, DeepSeek ~6s. Quality benchmarks show Claude slightly ahead on complex tasks, while GLM leads on simple cosmetic changes due to specialized fine-tuning.",
      },
      {
        question: "Can I retry or refine a diff if the result isn't quite right?",
        answer:
          "Yes. After viewing the initial diff, you have several options: (1) Click \"Regenerate\" to ask the AI to try again with the same input (sometimes it produces a better version on the second attempt), (2) Add a refinement comment like \"also increase the border radius\" and click \"Refine,\" which appends your feedback to the conversation context, (3) Edit the diff manually in our built-in diff editor before submitting, or (4) Start over with a new description. Refinement history is preserved so you can backtrack. Each regeneration counts toward your plan's monthly generation limit.",
      },
      {
        question: "Does the AI learn from my corrections and rejections?",
        answer:
          "When you reject a diff or edit it before submission, that feedback signal is anonymized and aggregated into our training improvement pipeline. We never use your specific code or descriptions to train models in a way that could reproduce them. Instead, we extract pattern-level insights: for example, \"users frequently correct padding values when modifying card components.\" These aggregate signals help us improve prompt templates and model fine-tuning over time. On Team plans, you can opt into a private adaptation mode where the model learns your team's coding patterns (naming conventions, preferred libraries) without sharing data outside your organization.",
      },
    ],
  },
  {
    name: "Billing & Plans",
    icon: "\u{1F4B3}",
    items: [
      {
        question: "What is included in the free tier?",
        answer:
          "The free tier includes: 20 AI diff generations per month, access to the browser extension with full inspector capabilities, community dashboard viewing, voting on public PRs, CLI access with authentication, and email support with 48-hour response time. Free tier users use the GLM AI provider. There is no credit card required. The free tier is ideal for individual contributors who want to explore the tool and occasionally submit improvements to open-source SaaS interfaces.",
      },
      {
        question: "How do I upgrade to Pro or Team? What are the differences?",
        answer:
          "Navigate to /billing in the dashboard and select your plan. Pro ($19/month) includes 200 generations/month, all four AI providers, priority email support (4-hour response), private repository connections, exportable analytics CSV, and API access (30 req/min). Team ($49/user/month) adds unlimited generations (fair-use policy applies), shared team workspaces, role-based permissions, SSO/SAML authentication, dedicated Slack/Discord webhook notifications, custom AI model fine-tuning on your team's patterns, SLA-backed uptime (99.9%), and phone support. Both plans include a 14-day free trial with full feature access.",
      },
      {
        question: "What happens if I hit my monthly generation limit?",
        answer:
          "When you reach your generation limit, the extension will still let you inspect components and capture screenshots, but diff generation will be paused. You will see a clear banner indicating your limit has been reached with options to: (1) upgrade your plan for immediate access, (2) wait until your limit resets on the 1st of the next month, or (3) purchase additional generation packs (100 extra generations for $5, one-time purchase). Generation packs roll over for up to 2 months if unused. Team plans with fair-use policies receive a soft warning at 80% capacity and a hard stop only at extreme volumes (10x the typical user average).",
      },
      {
        question: "Can I cancel or change my plan at any time?",
        answer:
          "Yes. You can downgrade or cancel anytime from the Billing page. When downgrading, you retain your current plan features until the end of the paid billing period. Upon cancellation, your account reverts to the free tier immediately but you keep access to all previously generated data, PRs, and dashboard history for 90 days. After 90 days, historical data is archived and available upon request. We do not offer prorated refunds for partial months, but the 14-day trial period is fully refundable if you cancel within the trial window. Enterprise annual contracts have separate terms outlined in your service agreement.",
      },
    ],
  },
  {
    name: "Troubleshooting",
    icon: "\u{1F6A7}",
    items: [
      {
        question: "The extension says \"Cannot detect React Fiber\" — how do I fix this?",
        answer:
          "This error means the page does not expose React's internal fiber nodes, which our inspector uses to identify component boundaries. Common causes: (1) The site uses a non-React framework (Vue, Angular, Svelte) — switch to DOM-based inspection mode in extension Settings, (2) React is loaded in production mode without dev tools hooks — try enabling the extension's fallback DOM analyzer, (3) The site uses a Content Security Policy that blocks our injection script — check the console for CSP errors, (4) The page uses Server Components exclusively with minimal client hydration — wait for full hydration or use manual region selection. Most cases resolve by toggling \"Fallback Mode\" in Settings > Inspector.",
      },
      {
        question: "My diff generation is failing with a timeout or server error.",
        answer:
          "Generation timeouts usually indicate one of these issues: (1) The component source code is extremely large (over 50KB) — try selecting a smaller sub-component, (2) Your description is ambiguous or too long — simplify to one clear instruction per generation, (3) The AI provider is experiencing high load — try switching providers in Settings or waiting a few minutes, (4) Network connectivity issues between your browser and our API — check your connection and any corporate proxy/firewall rules. If errors persist, check the /status page for known incidents, or copy the error ID from the notification and include it when contacting support.",
      },
      {
        question: "The sandbox preview doesn't look like the original page.",
        answer:
          "The sandbox preview renders your modified component in an isolated iframe environment. Differences from the original page are expected because: (1) External stylesheets, fonts, and CDN assets may not load in the sandbox (we inject detected inline styles but cannot replicate the full page context), (2) JavaScript state (user session data, dynamic content) is not present in the sandbox, (3) Some CSS properties depend on parent container dimensions that differ in isolation. To get a closer preview, enable \"Full Page Context\" in Settings, which loads the entire page in the sandbox and patches only the targeted component. This mode is slower but produces visually faithful previews.",
      },
      {
        question: "I'm seeing CORS or authentication errors when using the CLI.",
        answer:
          "CLI authentication errors typically mean your token has expired or is missing. Run `uac auth refresh` to obtain a fresh token. For CORS errors during API calls, ensure you are using the latest CLI version (run `uac --version` and compare with npm). Older versions used direct browser-style requests; newer versions route through our API proxy which handles CORS automatically. If you are behind a corporate firewall, set the `UAC_API_BASE` environment variable to your organization's proxy endpoint. Check that your API key (from /api-keys) is correctly configured by running `uac auth status`.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* ---- Header ---- */}
      <header className="border-b border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">\u{2753}</span>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Help &amp; FAQ
            </h1>
          </div>
          <p className="text-sm text-zinc-500">
            Find answers, learn best practices, and get unstuck.
          </p>
          <nav className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              Home
            </Link>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              Dashboard
            </Link>
            <Link
              href="/getting-started"
              className="text-blue-600 hover:text-blue-700"
            >
              Getting Started Guide
            </Link>
            <Link href="/api-docs" className="text-blue-600 hover:text-blue-700">
              API Docs
            </Link>
            <Link href="/changelog" className="text-blue-600 hover:text-blue-700">
              Changelog
            </Link>
            <Link href="/status" className="text-blue-600 hover:text-blue-700">
              Status
            </Link>
          </nav>
        </div>
      </header>

      {/* ---- Hero / Search ---- */}
      <section className="bg-white px-6 pb-10 pt-8 dark:bg-black">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            How can we help you?
          </h2>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Search our knowledge base or browse the categories below.
          </p>

          {/* Search input */}
          <div className="relative mt-6">
            <label htmlFor="faq-search" className="sr-only">
              Search FAQs
            </label>
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              id="faq-search"
              type="search"
              placeholder="Search questions… (e.g., \"install extension\", \"billing\")"
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50 py-3.5 pl-12 pr-4 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
              // Using native search + details/summary means filtering requires JS.
              // The input is present for UX completeness; real-time filtering
              // would need a client wrapper. Users can also Ctrl+F.
            />
          </div>

          {/* Quick links */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              "Install extension",
              "Alt+Click",
              "AI accuracy",
              "Free tier",
              "Timeout error",
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-blue-800 dark:hover:text-blue-400"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---- FAQ Categories ---- */}
      <main className="mx-auto max-w-3xl px-6 py-10 space-y-10">
        {faqCategories.map((category) => (
          <section key={category.name}>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="text-xl" aria-hidden="true">
                {category.icon}
              </span>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {category.name}
              </h2>
              <span className="ml-auto rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {category.items.length} articles
              </span>
            </div>

            <div className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
              {category.items.map((item, idx) => (
                <details
                  key={idx}
                  className="group"
                  style={{ boxSizing: "border-box" }}
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-zinc-900 outline-none transition hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/50 [&::-webkit-details-marker]:hidden">
                    <span className="leading-snug">{item.question}</span>
                    <svg
                      className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </summary>
                  <div className="px-5 pb-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* ---- Contact Support ---- */}
      <section className="border-t border-zinc-200 bg-white px-6 py-14 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-3xl" aria-hidden="true">
            \u{1F4E7}
          </span>
          <h2 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Still need help?
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Can&apos;t find what you&apos;re looking for? Our support team is here
            for you.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {/* Email */}
            <a
              href="mailto:support@ui-as-code.dev"
              className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-5 transition hover:border-blue-300 hover:bg-blue-50/50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
            >
              <svg
                className="h-7 w-7 text-zinc-400 transition group-hover:text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Email Us
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                support@ui-as-code.dev
              </span>
            </a>

            {/* GitHub Issues */}
            <a
              href="https://github.com/YanziMa/ui-as-code/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-5 transition hover:border-blue-300 hover:bg-blue-50/50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
            >
              <svg
                className="h-7 w-7 text-zinc-400 transition group-hover:text-blue-500"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                GitHub Issues
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Report bugs &amp; request features
              </span>
            </a>

            {/* Community */}
            <a
              href="https://github.com/YanziMa/ui-as-code/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-5 transition hover:border-blue-300 hover:bg-blue-50/50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
            >
              <svg
                className="h-7 w-7 text-zinc-400 transition group-hover:text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                />
              </svg>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Community
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Ask the community on Discussions
              </span>
            </a>
          </div>

          <p className="mt-8 text-xs text-zinc-400 dark:text-zinc-500">
            Pro &amp; Team plans include priority support with guaranteed{" "}
            <strong className="font-medium text-zinc-500 dark:text-zinc-400">
              4-hour response time
            </strong>{" "}
            during business hours. Enterprise customers have access to a dedicated
            Slack channel and named technical account manager.
          </p>
        </div>
      </section>
    </div>
  );
}
