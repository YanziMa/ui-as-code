import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Widgets & Embeds | UI-as-Code",
  description:
    "Add UI-as-Code badges and widgets to your site. Embed profile badges, activity feeds, SaaS status indicators, and submission buttons.",
};

/* ------------------------------------------------------------------ */
/*  Data definitions (pure constants, no client-side state)           */
/* ------------------------------------------------------------------ */

interface WidgetConfigOption {
  label: string;
  type: "select" | "toggle" | "text" | "number";
  defaultValue: string;
  options?: string[];
}

interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  configOptions: WidgetConfigOption[];
  embedCode: string;
  previewJsx: React.ReactNode;
}

const widgets: WidgetDefinition[] = [
  {
    id: "profile-badge",
    name: "Profile Badge",
    description:
      "Display a contributor's stats directly on your site — PRs submitted, acceptance rate, and more — in a compact, visually rich badge.",
    icon: "\u{1F465}",
    configOptions: [
      {
        label: "Theme",
        type: "select",
        defaultValue: "light",
        options: ["light", "dark"],
      },
      {
        label: "Size",
        type: "select",
        defaultValue: "md",
        options: ["sm", "md", "lg"],
      },
      { label: "Show Avatar", type: "toggle", defaultValue: "true" },
      { label: "Show Stats", type: "toggle", defaultValue: "true" },
    ],
    embedCode: `<div data-uac-widget="profile-badge"
     data-theme="light"
     data-size="md"
     data-show-avatar="true"
     data-show-stats="true">
</div>`,
    previewJsx: (
      <div className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white shadow-inner">
          JD
        </div>
        {/* Info */}
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-gray-900">
            Jane Doe
          </span>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <svg
                className="h-3.5 w-3.5 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 11l5-5m0 0l5 5m-5-5v12"
                />
              </svg>
              47 PRs
            </span>
            <span className="inline-flex items-center gap-1">
              <svg
                className="h-3.5 w-3.5 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              94% accepted
            </span>
          </div>
        </div>
        {/* Branding */}
        <span className="ml-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">
          UI-as-Code
        </span>
      </div>
    ),
  },

  {
    id: "activity-feed",
    name: "Activity Feed",
    description:
      "Embed a real-time timeline of recent contributions so visitors can see the latest UI improvements being submitted.",
    icon: "\u{1F4CB}",
    configOptions: [
      {
        label: "Max Items",
        type: "number",
        defaultValue: "5",
        options: ["5", "10", "15", "20"],
      },
      { label: "Show Timestamps", type: "toggle", defaultValue: "true" },
      { label: "Compact Mode", type: "toggle", defaultValue: "false" },
    ],
    embedCode: `<div data-uac-widget="activity-feed"
     data-max-items="5"
     data-show-timestamps="true"
     data-compact="false">
</div>`,
    previewJsx: (
      <div className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative space-y-3 pl-5">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-300 via-violet-200 to-transparent" />

          {[
            {
              title: 'Fixed navbar overflow on mobile',
              time: '2h ago',
              color: 'bg-green-100 text-green-700',
              dotColor: 'bg-green-500',
            },
            {
              title: 'Added dark mode toggle to settings',
              time: '5h ago',
              color: 'bg-blue-100 text-blue-700',
              dotColor: 'bg-blue-500',
            },
            {
              title: 'Improved form validation UX',
              time: '1d ago',
              color: 'bg-amber-100 text-amber-700',
              dotColor: 'bg-amber-500',
            },
            {
              title: 'Updated color tokens for accessibility',
              time: '2d ago',
              color: 'bg-purple-100 text-purple-700',
              dotColor: 'bg-purple-500',
            },
            {
              title: 'Refactored button component API',
              time: '3d ago',
              color: 'bg-rose-100 text-rose-700',
              dotColor: 'bg-rose-500',
            },
          ].map((item, i) => (
            <div key={i} className="relative flex items-start gap-3">
              {/* Dot */}
              <div
                className={`absolute -left-5 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white ${item.dotColor} shadow-sm`}
              />
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-snug text-gray-800 truncate">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">{item.time}</p>
              </div>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${item.color}`}
              >
                PR#{1047 - i}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  {
    id: "saas-status",
    name: "SaaS Status",
    description:
      "Show whether a specific SaaS product is supported by UI-as-Code, helping users know they can submit fixes for it.",
    icon: "\u{2705}",
    configOptions: [
      {
        label: "Product",
        type: "select",
        defaultValue: "linear",
        options: [
          "linear",
          "notion",
          "figma",
          "slack",
          "github",
          "vercel",
          "stripe",
        ],
      },
      {
        label: "Style",
        type: "select",
        defaultValue: "badge",
        options: ["badge", "banner", "button"],
      },
    ],
    embedCode: `<div data-uac-widget="saas-status"
     data-product="linear"
     data-style="badge">
</div>`,
    previewJsx: (
      <div className="flex flex-col gap-3">
        {/* Badge style */}
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
          <svg
            className="h-4 w-4 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs font-semibold text-emerald-800">
            Supported by UI-as-Code
          </span>
        </div>

        {/* Banner style */}
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm text-sm font-bold text-emerald-600">
              L
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">Linear</p>
              <p className="text-[11px] text-emerald-600 font-medium">
                Supported \u2014 Submit UI Fixes
              </p>
            </div>
          </div>
          <svg
            className="h-5 w-5 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Button style */}
        <button
          type="button"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Check Support Status
        </button>
      </div>
    ),
  },

  {
    id: "submission-button",
    name: "Submission Button",
    description:
      "A call-to-action button that opens the friction reporter, letting your users report UI issues directly from any page.",
    icon: "\u{1F4E7}",
    configOptions: [
      {
        label: "Button Style",
        type: "select",
        defaultValue: "primary",
        options: ["primary", "secondary", "outline"],
      },
      {
        label: "Size",
        type: "select",
        defaultValue: "md",
        options: ["sm", "md", "lg"],
      },
      {
        label: "Button Text",
        type: "text",
        defaultValue: "Report UI Issue",
      },
      {
        label: "Target SaaS (pre-fill)",
        type: "select",
        defaultValue: "",
        options: [
          "(none)",
          "linear",
          "notion",
          "figma",
          "slack",
          "github",
          "vercel",
          "stripe",
        ],
      },
    ],
    embedCode: `<button data-uac-widget="submission-button"
        data-style="primary"
        data-size="md"
        data-text="Report UI Issue"
        data-saas="">
  Report UI Issue
</button>`,
    previewJsx: (
      <div className="flex flex-wrap items-center gap-3">
        {/* Primary */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition-all hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-300 active:scale-[0.98]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          Report UI Issue
        </button>

        {/* Secondary */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-800 transition-all hover:bg-gray-200 active:scale-[0.98]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          Report UI Issue
        </button>

        {/* Outline */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-violet-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 transition-all hover:bg-violet-50 active:scale-[0.98]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          Report UI Issue
        </button>
      </div>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Helper components (all server-safe)                                */
/* ------------------------------------------------------------------ */

function ConfigControl({ option }: { option: WidgetConfigOption }) {
  if (option.type === "select" && option.options) {
    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-600">
          {option.label}
        </label>
        <div className="relative">
          <select
            defaultValue={option.defaultValue}
            className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pr-8 text-xs font-medium text-gray-800 outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100 cursor-pointer"
          >
            {option.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (option.type === "toggle") {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5">
        <span className="text-xs font-medium text-gray-700">
          {option.label}
        </span>
        <div
          role="switch"
          aria-checked={option.defaultValue === "true"}
          tabIndex={0}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 ${
            option.defaultValue === "true"
              ? "bg-violet-500"
              : "bg-gray-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
              option.defaultValue === "true"
                ? "translate-x-4"
                : "translate-x-0"
            }`}
          />
        </div>
      </div>
    );
  }

  if (option.type === "text") {
    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-600">
          {option.label}
        </label>
        <input
          type="text"
          defaultValue={option.defaultValue}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-800 outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </div>
    );
  }

  if (option.type === "number" && option.options) {
    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-600">
          {option.label}
        </label>
        <div className="flex gap-1.5">
          {option.options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                opt === option.defaultValue
                  ? "bg-violet-600 text-white shadow-sm"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-950">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900/60 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        </div>
        <span className="text-[11px] font-mono text-gray-500">HTML</span>

        {/* Copy button (visual only for server component) */}
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md bg-gray-800 px-2.5 py-1 text-[11px] font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy
        </button>
      </div>

      {/* Code content */}
      <pre className="overflow-x-auto p-4 text-left">
        <code className="text-[13px] leading-relaxed font-mono text-gray-300 whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}

function WidgetCard({ widget }: { widget: WidgetDefinition }) {
  return (
    <section
      id={widget.id}
      className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Colored accent bar at top */}
      <div className="h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

      <div className="p-6 space-y-5">
        {/* ---- Header ---- */}
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-lg">
            {widget.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-gray-900 tracking-tight">
              {widget.name}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              {widget.description}
            </p>
          </div>
        </div>

        {/* ---- Preview Area ---- */}
        <div className="rounded-xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50/80 to-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-md bg-gray-200/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Live Preview
            </span>
          </div>
          <div className="flex items-center justify-center min-h-[80px]">
            {widget.previewJsx}
          </div>
        </div>

        {/* ---- Configuration Options ---- */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Configuration Options
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {widget.configOptions.map((opt, idx) => (
              <ConfigControl key={idx} option={opt} />
            ))}
          </div>
        </div>

        {/* ---- Embed Code ---- */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            Embed Code
          </h4>
          <CodeBlock code={widget.embedCode} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function WidgetsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-violet-50/30">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
        {/* ============================================================ */}
        {/*  PAGE HEADER                                                 */}
        {/* ============================================================ */}
        <header className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5">
            <svg
              className="h-4 w-4 text-violet-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
              />
            </svg>
            <span className="text-xs font-semibold text-violet-700">
              Embeddable Components
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            Widgets &amp; Embeds
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500 leading-relaxed">
            Add UI-as-Code badges and widgets to your site. Copy the embed
            code, paste it into your HTML, and let your visitors interact with
            the friction-reporting ecosystem.
          </p>
        </header>

        {/* ============================================================ */}
        {/*  WIDGET GRID                                                  */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {widgets.map((widget) => (
            <WidgetCard key={widget.id} widget={widget} />
          ))}
        </div>

        {/* ============================================================ */}
        {/*  FOOTER / SCRIPT TAG NOTICE                                   */}
        {/* ============================================================ */}
        <footer className="mt-14">
          <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-yellow-50/50 to-amber-50 p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
              {/* Icon + Text */}
              <div className="flex items-start gap-4 sm:flex-1">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shadow-sm">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Required Script Tag
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    All widgets require the UI-as-Code embed script to be loaded
                    once on your page. Place this{" "}
                    <code className="rounded bg-amber-100/70 px-1.5 py-0.5 text-xs font-mono font-semibold text-amber-800">
                      &lt;script&gt;
                    </code>{" "}
                    tag in the{" "}
                    <code className="rounded bg-amber-100/70 px-1.5 py-0.5 text-xs font-mono font-semibold text-amber-800">
                      &lt;head&gt;
                    </code>{" "}
                    or before the closing{" "}
                    <code className="rounded bg-amber-100/70 px-1.5 py-0.5 text-xs font-mono font-semibold text-amber-800">
                      &lt;/body&gt;
                    </code>{" "}
                    tag of your document.
                  </p>
                </div>
              </div>

              {/* Script code block */}
              <div className="sm:w-[420px] shrink-0">
                <div className="group relative overflow-hidden rounded-lg border border-amber-200/80 bg-gray-950">
                  <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900/60 px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-[11px] font-mono text-gray-500">
                      HTML
                    </span>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-md bg-gray-800 px-2.5 py-1 text-[11px] font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy
                    </button>
                  </div>
                  <pre className="overflow-x-auto p-4">
                    <code className="text-[13px] leading-relaxed font-mono text-gray-300 whitespace-pre">
                      {`<script src="https://ui-as-code-web.vercel.app/embed.js"></script>`}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Additional notes below the banner */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                title: "Zero Dependencies",
                desc: "The embed script is self-contained. No jQuery, no React, no framework lock-in.",
                icon: (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                ),
              },
              {
                title: "Auto-Updates",
                desc: "Widgets pull the latest styles and behavior from our CDN automatically.",
                icon: (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                ),
              },
              {
                title: "Privacy First",
                desc: "No tracking cookies or analytics. We only load what is needed for each widget.",
                icon: (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                ),
              },
            ].map((note) => (
              <div
                key={note.title}
                className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-500">
                  {note.icon}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">
                    {note.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                    {note.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
