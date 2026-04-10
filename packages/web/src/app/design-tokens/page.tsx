import type { Metadata } from "next";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const INDIGO_SHADES = [
  { name: "indigo-50",  class: "bg-indigo-50",  hex: "#EEF2FF" },
  { name: "indigo-100", class: "bg-indigo-100", hex: "#E0E7FF" },
  { name: "indigo-200", class: "bg-indigo-200", hex: "#C7D2FE" },
  { name: "indigo-300", class: "bg-indigo-300", hex: "#A5B4FC" },
  { name: "indigo-400", class: "bg-indigo-400", hex: "#818CF8" },
  { name: "indigo-500", class: "bg-indigo-500", hex: "#6366F1" },
  { name: "indigo-600", class: "bg-indigo-600", hex: "#4F46E5" },
  { name: "indigo-700", class: "bg-indigo-700", hex: "#4338CA" },
  { name: "indigo-800", class: "bg-indigo-800", hex: "#3730A3" },
  { name: "indigo-900", class: "bg-indigo-900", hex: "#312E81" },
  { name: "indigo-950", class: "bg-indigo-950", hex: "#1E1B4B" },
] as const;

const SEMANTIC_COLORS = {
  Success: [
    { name: "green-50",  class: "bg-green-50",  hex: "#F0FDF4" },
    { name: "green-100", class: "bg-green-100", hex: "#DCFCE7" },
    { name: "green-200", class: "bg-green-200", hex: "#BBF7D0" },
    { name: "green-300", class: "bg-green-300", hex: "#86EFAC" },
    { name: "green-400", class: "bg-green-400", hex: "#4ADE80" },
    { name: "green-500", class: "bg-green-500", hex: "#22C55E" },
    { name: "green-600", class: "bg-green-600", hex: "#16A34A" },
    { name: "green-700", class: "bg-green-700", hex: "#15803D" },
    { name: "green-800", class: "bg-green-800", hex: "#166534" },
    { name: "green-900", class: "bg-green-900", hex: "#14532D" },
    { name: "green-950", class: "bg-green-950", hex: "#052E16" },
  ],
  Warning: [
    { name: "amber-50",  class: "bg-amber-50",  hex: "#FFFBEB" },
    { name: "amber-100", class: "bg-amber-100", hex: "#FEF3C7" },
    { name: "amber-200", class: "bg-amber-200", hex: "#FDE68A" },
    { name: "amber-300", class: "bg-amber-300", hex: "#FCD34D" },
    { name: "amber-400", class: "bg-amber-400", hex: "#FBBF24" },
    { name: "amber-500", class: "bg-amber-500", hex: "#F59E0B" },
    { name: "amber-600", class: "bg-amber-600", hex: "#D97706" },
    { name: "amber-700", class: "bg-amber-700", hex: "#B45309" },
    { name: "amber-800", class: "bg-amber-800", hex: "#92400E" },
    { name: "amber-900", class: "bg-amber-900", hex: "#78350F" },
    { name: "amber-950", class: "bg-amber-950", hex: "#451A03" },
  ],
  Error: [
    { name: "red-50",  class: "bg-red-50",  hex: "#FEF2F2" },
    { name: "red-100", class: "bg-red-100", hex: "#FEE2E2" },
    { name: "red-200", class: "bg-red-200", hex: "#FECACA" },
    { name: "red-300", class: "bg-red-300", hex: "#FCA5A5" },
    { name: "red-400", class: "bg-red-400", hex: "#F87171" },
    { name: "red-500", class: "bg-red-500", hex: "#EF4444" },
    { name: "red-600", class: "bg-red-600", hex: "#DC2626" },
    { name: "red-700", class: "bg-red-700", hex: "#B91C1C" },
    { name: "red-800", class: "bg-red-800", hex: "#991B1B" },
    { name: "red-900", class: "bg-red-900", hex: "#7F1D1D" },
    { name: "red-950", class: "bg-red-950", hex: "#450A0A" },
  ],
  Info: [
    { name: "blue-50",  class: "bg-blue-50",  hex: "#EFF6FF" },
    { name: "blue-100", class: "bg-blue-100", hex: "#DBEAFE" },
    { name: "blue-200", class: "bg-blue-200", hex: "#BFDBFE" },
    { name: "blue-300", class: "bg-blue-300", hex: "#93C5FD" },
    { name: "blue-400", class: "bg-blue-400", hex: "#60A5FA" },
    { name: "blue-500", class: "bg-blue-500", hex: "#3B82F6" },
    { name: "blue-600", class: "bg-blue-600", hex: "#2563EB" },
    { name: "blue-700", class: "bg-blue-700", hex: "#1D4ED8" },
    { name: "blue-800", class: "bg-blue-800", hex: "#1E40AF" },
    { name: "blue-900", class: "bg-blue-900", hex: "#1E3A8A" },
    { name: "blue-950", class: "bg-blue-950", hex: "#172554" },
  ],
} as const;

const GRAY_SHADES = [
  { name: "gray-50",  class: "bg-gray-50",  hex: "#F9FAFB" },
  { name: "gray-100", class: "bg-gray-100", hex: "#F3F4F6" },
  { name: "gray-200", class: "bg-gray-200", hex: "#E5E7EB" },
  { name: "gray-300", class: "bg-gray-300", hex: "#D1D5DB" },
  { name: "gray-400", class: "bg-gray-400", hex: "#9CA3AF" },
  { name: "gray-500", class: "bg-gray-500", hex: "#6B7280" },
  { name: "gray-600", class: "bg-gray-600", hex: "#4B5563" },
  { name: "gray-700", class: "bg-gray-700", hex: "#374151" },
  { name: "gray-800", class: "bg-gray-800", hex: "#1F2937" },
  { name: "gray-900", class: "bg-gray-900", hex: "#111827" },
  { name: "gray-950", class: "bg-gray-950", hex: "#030712" },
] as const;

const SPACING_SCALE = [
  { token: "0",   value: "0px",     width: "w-0" },
  { token: "1",   value: "4px",     width: "w-1" },
  { token: "2",   value: "8px",     width: "w-2" },
  { token: "3",   value: "12px",    width: "w-3" },
  { token: "4",   value: "16px",    width: "w-4" },
  { token: "5",   value: "20px",    width: "w-5" },
  { token: "6",   value: "24px",    width: "w-6" },
  { token: "8",   value: "32px",    width: "w-8" },
  { token: "10",  value: "40px",    width: "w-10" },
  { token: "12",  value: "48px",    width: "w-12" },
  { token: "16",  value: "64px",    width: "w-16" },
] as const;

const RADIUS_TOKENS = [
  { name: "none",  class: "rounded-none", label: "none / 0px" },
  { name: "sm",    class: "rounded-sm",   label: "sm / 2px" },
  { name: "md",    class: "rounded-md",   label: "md / 6px" },
  { name: "lg",    class: "rounded-lg",   label: "lg / 8px" },
  { name: "xl",    class: "rounded-xl",   label: "xl / 12px" },
  { name: "full",  class: "rounded-full", label: "full / 9999px" },
] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <h2
        id={id}
        className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
      >
        {title}
      </h2>
      <span className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700" />
    </div>
  );
}

function ColorSwatch({
  name,
  className,
  hex,
}: {
  name: string;
  className: string;
  hex: string;
}) {
  const isLight = ["50", "100", "200"].some((s) => name.endsWith(`-${s}`));
  const textColor = isLight ? "text-slate-700" : "text-white";

  return (
    <div className="group relative overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-700/60 dark:bg-slate-850">
      <div
        className={`flex h-20 items-end ${className} p-2.5`}
        role="img"
        aria-label={`${name}: ${hex}`}
      >
        <span
          className={`text-xs font-mono font-medium leading-none ${textColor} drop-shadow-sm`}
        >
          {hex}
        </span>
      </div>
      <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-700/40">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          {name}
        </p>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-6 pb-16 pt-20 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 sm:px-10 sm:pb-24 sm:pt-28">
      {/* Decorative elements */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-200/40 to-violet-200/40 blur-3xl dark:from-indigo-900/20 dark:to-violet-900/20" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-emerald-100/30 blur-3xl dark:bg-emerald-900/15" />

      <div className="relative mx-auto max-w-4xl text-center">
        <span className="mb-4 inline-block rounded-full border border-indigo-200 bg-white/70 px-4 py-1.5 text-sm font-medium tracking-wide text-indigo-600 backdrop-blur-sm dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400">
          Style Guide
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
          Design Tokens
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-500 sm:text-xl dark:text-slate-400">
          UI-as-Code visual language reference
        </p>

        {/* Quick nav */}
        <nav
          aria-label="Token sections"
          className="mt-8 flex flex-wrap items-center justify-center gap-2"
        >
          {["Colors", "Typography", "Spacing", "Border Radius", "Shadows", "Components"].map(
            (label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(" ", "-")}`}
                className="rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-indigo-700 dark:hover:text-indigo-400"
              >
                {label}
              </a>
            ),
          )}
        </nav>
      </div>
    </section>
  );
}

function ColorsSection() {
  return (
    <section id="colors" className="scroll-mt-24">
      <SectionHeading id="colors" title="Colors" />

      {/* Primary - Indigo */}
      <div className="mb-10">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Primary &mdash; Indigo
        </h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11">
          {INDIGO_SHADES.map((swatch) => (
            <ColorSwatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </div>

      {/* Semantic Colors */}
      {(Object.entries(SEMANTIC_COLORS) as [keyof typeof SEMANTIC_COLORS, (typeof SEMANTIC_COLORS)[keyof typeof SEMANTIC_COLORS]][]).map(
        ([label, shades]) => (
          <div key={label} className="mb-10">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Semantic &mdash; {label}
            </h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11">
              {shades.map((swatch) => (
                <ColorSwatch key={swatch.name} {...swatch} />
              ))}
            </div>
          </div>
        ),
      )}

      {/* Neutral - Gray */}
      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Neutral &mdash; Gray Scale
        </h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11">
          {GRAY_SHADES.map((swatch) => (
            <ColorSwatch key={swatch.name} {...swatch} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TypographySection() {
  const headings = [
    { level: "h1", size: "text-4xl font-extrabold tracking-tight sm:text-5xl", sample: "Heading 1" },
    { level: "h2", size: "text-3xl font-bold tracking-tight sm:text-4xl", sample: "Heading 2" },
    { level: "h3", size: "text-2xl font-bold tracking-tight", sample: "Heading 3" },
    { level: "h4", size: "text-xl font-semibold", sample: "Heading 4" },
    { level: "h5", size: "text-lg font-semibold", sample: "Heading 5" },
    { level: "h6", size: "text-base font-semibold", sample: "Heading 6" },
  ] as const;

  const bodySizes = [
    { token: "text-sm",  size: "text-sm",  sample: "Small body text (14px)" },
    { token: "text-base", size: "text-base", sample: "Base body text (16px)" },
    { token: "text-lg",  size: "text-lg",  sample: "Large body text (18px)" },
    { token: "text-xl",  size: "text-xl",  sample: "Extra large body (20px)" },
  ] as const;

  return (
    <section id="typography" className="scroll-mt-24">
      <SectionHeading id="typography" title="Typography" />

      {/* Font Family */}
      <div className="mb-10 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-850">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Font Family Stack
        </h3>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-400">Sans-serif</p>
            <p className="font-[family-name:var(--font-geist-sans)] text-2xl text-slate-800 dark:text-slate-200">
              Geist Sans &mdash; The quick brown fox jumps over the lazy dog.
            </p>
            <code className="mt-1 block text-xs font-mono text-slate-400">
              var(--font-geist-sans)
            </code>
          </div>
          <div className="border-t border-slate-100 pt-4 dark:border-slate-700/50">
            <p className="mb-1 text-xs font-medium text-slate-400">Monospace</p>
            <p className="font-[family-name:var(--font-geist-mono)] text-lg text-slate-800 dark:text-slate-200">
              Geist Mono &mdash; {"{ const hello = 'world'; }"}
            </p>
            <code className="mt-1 block text-xs font-mono text-slate-400">
              var(--font-geist-mono)
            </code>
          </div>
        </div>
      </div>

      {/* Headings */}
      <div className="mb-10 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-850">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Heading Sizes
        </h3>
        <div className="divide-y divide-slate-100 space-y-4 dark:divide-slate-700/50">
          {headings.map(({ level, size, sample }) => (
            <div key={level} className="flex items-baseline justify-between gap-4 pt-4 first:pt-0">
              <span className={`text-slate-900 dark:text-white ${size}`}>
                {sample}
              </span>
              <code className="shrink-0 text-xs font-mono text-slate-400">{level}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Body Text */}
      <div className="mb-10 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-850">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Body Text Sizes
        </h3>
        <div className="space-y-4">
          {bodySizes.map(({ token, size, sample }) => (
            <div key={token} className="flex items-baseline justify-between gap-4">
              <span className={`${size} text-slate-700 dark:text-slate-300`}>
                {sample}
              </span>
              <code className="shrink-0 text-xs font-mono text-slate-400">{token}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Monospace Sample */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-850">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Monospace
        </h3>
        <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm font-mono leading-relaxed text-emerald-400">
{`function generateTokens() {
  const palette = {
    primary: "indigo",
    success: "green",
    warning: "amber",
    error:   "red",
    info:    "blue",
  };
  return Object.fromEntries(
    Object.entries(palette).map(([k, v]) => [k, v])
  );
}`}
        </pre>
      </div>
    </section>
  );
}

function SpacingSection() {
  return (
    <section id="spacing" className="scroll-mt-24">
      <SectionHeading id="spacing" title="Spacing" />

      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-850">
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Tailwind&apos;s default spacing scale. Each unit represents a multiple of the base
          spacing value (4px).
        </p>
        <div className="space-y-3">
          {SPACING_SCALE.map(({ token, value }) => (
            <div key={token} className="flex items-center gap-4">
              <code className="w-10 shrink-0 text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                {token}
              </code>
              <div
                className="h-6 rounded bg-indigo-500 transition-all"
                style={{ width: value }}
              />
              <code className="w-14 shrink-0 text-xs font-mono text-slate-400">
                {value}
              </code>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BorderRadiusSection() {
  return (
    <section id="border-radius" className="scroll-mt-24">
      <SectionHeading id="border-radius" title="Border Radius" />

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
        {RADIUS_TOKENS.map(({ name, className, label }) => (
          <div
            key={name}
            className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-850"
          >
            <div
              className={`flex h-16 w-16 items-center justify-center bg-indigo-500 shadow-sm ${className}`}
            />
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {name}
              </p>
              <p className="mt-0.5 text-[11px] font-mono text-slate-400">
                {label.split(" / ")[1]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ShadowsSection() {
  const shadows = [
    { name: "shadow-sm", class: "shadow-sm", desc: "Subtle elevation" },
    { name: "shadow",    class: "shadow",    desc: "Default elevation" },
    { name: "shadow-md", class: "shadow-md", desc: "Medium elevation" },
    { name: "shadow-lg", class: "shadow-lg", desc: "Large elevation" },
    { name: "shadow-xl", class: "shadow-xl", desc: "Extra large elevation" },
  ] as const;

  return (
    <section id="shadows" className="scroll-mt-24">
      <SectionHeading id="shadows" title="Shadows" />

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
        {shadows.map(({ name, class: shadowClass, desc }) => (
          <div key={name} className="flex flex-col items-center gap-3">
            <div
              className={`flex h-32 w-full items-center justify-center rounded-xl border border-slate-200 bg-white p-4 ${shadowClass} dark:border-slate-700`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                <svg
                  className="h-6 w-6 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
                  />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <code className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                {name}
              </code>
              <p className="mt-0.5 text-[11px] text-slate-400">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ComponentsSection() {
  const buttons = [
    { variant: "primary",   class: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:shadow-indigo-900/30", label: "Primary" },
    { variant: "secondary", class: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700", label: "Secondary" },
    { variant: "outline",   class: "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800", label: "Outline" },
    { variant: "ghost",     class: "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800", label: "Ghost" },
    { variant: "danger",    class: "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-200 dark:bg-red-500 dark:hover:bg-red-600", label: "Danger" },
  ] as const;

  const badges = [
    { color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300", label: "Default" },
    { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", label: "Success" },
    { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", label: "Warning" },
    { color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", label: "Error" },
    { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", label: "Info" },
    { color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", label: "Neutral" },
  ] as const;

  return (
    <section id="components" className="scroll-mt-24">
      <SectionHeading id="components" title="Components Preview" />

      <div className="space-y-10">
        {/* Buttons */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-850">
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Buttons
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            {buttons.map(({ variant, class: btnClass, label }) => (
              <button
                key={variant}
                type="button"
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${btnClass}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-850">
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Badges
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            {badges.map(({ color, label }) => (
              <span
                key={label}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${color}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-850">
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Input Field
          </h3>
          <div className="max-w-md space-y-4">
            <div>
              <label
                htmlFor="dt-email"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Email address
              </label>
              <input
                id="dt-email"
                type="email"
                placeholder="you@example.com"
                defaultValue=""
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-900/30"
              />
            </div>
            <div>
              <label
                htmlFor="dt-password"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <input
                id="dt-password"
                type="password"
                placeholder="Enter your password"
                defaultValue=""
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-900/30"
              />
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-850">
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Card
          </h3>
          <div className="mx-auto max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                  />
                </svg>
              </div>
            </div>
            <div className="p-6">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                Design System Card
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                This card demonstrates the standard card component with a gradient header,
                icon area, and content body using design tokens.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  Component
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Ready
                </span>
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:shadow-indigo-900/30 dark:hover:bg-indigo-600 cursor-pointer"
                >
                  View Details
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Design Tokens | UI-as-Code Style Guide",
  description:
    "Visual language reference for UI-as-Code. Browse color palettes, typography scales, spacing systems, border radius tokens, shadows, and component previews.",
};

export default function DesignTokensPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Hero />

      <div className="mx-auto max-w-6xl space-y-16 px-6 py-14 sm:px-8 sm:py-20">
        <ColorsSection />
        <TypographySection />
        <SpacingSection />
        <BorderRadiusSection />
        <ShadowsSection />
        <ComponentsSection />
      </div>
    </main>
  );
}
