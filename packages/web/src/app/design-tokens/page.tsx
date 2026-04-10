/**
 * Design Tokens / Style Guide reference page.
 */

const INDIGO_SHADES = [
  { name: "50", hex: "#eef2ff" }, { name: "100", hex: "#e0e7ff" }, { name: "200", hex: "#c7d2fe" },
  { name: "300", hex: "#a5b4fc" }, { name: "400", hex: "#818cf8" }, { name: "500", hex: "#6366f1" },
  { name: "600", hex: "#4f46e5" }, { name: "700", hex: "#4338ca" }, { name: "800", hex: "#3730a3" },
  { name: "900", hex: "#312e81" }, { name: "950", hex: "#1e1b4b" },
];

const SEMANTIC_COLORS = [
  { name: "Success", hex: "#22c55e", bg: "#f0fdf4", text: "#166534" },
  { name: "Warning", hex: "#f59e0b", bg: "#fffbeb", text: "#92400e" },
  { name: "Error", hex: "#ef4444", bg: "#fef2f2", text: "#991b1b" },
  { name: "Info", hex: "#3b82f6", bg: "#eff6ff", text: "#1d4ed8" },
];

const GRAY_SHADES = [
  { name: "50", hex: "#f9fafb" }, { name: "100", hex: "#f3f4f6" }, { name: "200", hex: "#e5e7eb" },
  { name: "300", hex: "#d1d5db" }, { name: "400", hex: "#9ca3af" }, { name: "500", hex: "#6b7280" },
  { name: "600", hex: "#4b5563" }, { name: "700", hex: "#374151" }, { name: "800", hex: "#1f2937" },
  { name: "900", hex: "#111827" }, { name: "950", hex: "#030712" },
];

const SPACING = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16];
const RADIUS = [
  { name: "none", value: "0px" }, { name: "sm", value: "4px" }, { name: "md", value: "8px" },
  { name: "lg", value: "12px" }, { name: "xl", value: "16px" }, { name: "full", value: "9999px" },
];

export default function DesignTokensPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Design Tokens</h1>
        <p className="text-gray-500 dark:text-gray-400">UI-as-Code visual language reference</p>
      </header>

      {/* Colors - Primary (Indigo) */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Primary Colors</h2>
        <div className="grid grid-cols-5 sm:grid-cols-11 gap-2">
          {INDIGO_SHADES.map((s) => (
            <div key={s.name} className="group">
              <div className="w-full aspect-square rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:scale-105 transition-transform" style={{ backgroundColor: s.hex }} />
              <p className="text-xs text-center mt-1.5 font-mono text-gray-600 dark:text-gray-400">{s.hex}</p>
              <p className="text-[10px] text-center text-gray-400">indigo-{s.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Semantic Colors */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Semantic Colors</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {SEMANTIC_COLORS.map((c) => (
            <div key={c.name} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="h-16 flex items-center justify-center" style={{ backgroundColor: c.hex }}>
                <span className="text-white font-bold text-lg shadow-sm">{c.name[0]}</span>
              </div>
              <div className="p-3">
                <p className="font-medium text-sm text-gray-900 dark:text-white">{c.name}</p>
                <p className="font-mono text-xs text-gray-500">{c.hex}</p>
                <div className="flex gap-1 mt-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: c.bg, color: c.text }}>bg</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: c.hex, color: c.hex }}>border</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gray Scale */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Neutral Scale</h2>
        <div className="grid grid-cols-5 sm:grid-cols-11 gap-2">
          {GRAY_SHADES.map((s) => (
            <div key={s.name} className="group">
              <div className="w-full aspect-square rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ backgroundColor: s.hex }} />
              <p className="text-xs text-center mt-1.5 font-mono text-gray-600 dark:text-gray-400">{s.hex}</p>
              <p className="text-[10px] text-center text-gray-400">gray-{s.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Typography</h2>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          {[
            { size: "text-4xl", label: "Heading 1 (2.25rem)", sample: "The quick brown fox" },
            { size: "text-3xl", label: "Heading 2 (1.875rem)", sample: "The quick brown fox" },
            { size: "text-2xl", label: "Heading 3 (1.5rem)", sample: "The quick brown fox" },
            { size: "text-xl", label: "Heading 4 (1.25rem)", sample: "The quick brown fox" },
            { size: "text-lg", label: "Large (1.125rem)", sample: "The quick brown fox jumps over the lazy dog." },
            { size: "text-base", label: "Body (1rem)", sample: "The quick brown fox jumps over the lazy dog." },
            { size: "text-sm", label: "Small (0.875rem)", sample: "The quick brown fox jumps over the lazy dog." },
            { size: "text-xs", label: "XSmall (0.75rem)", sample: "The quick brown fox jumps over the lazy dog." },
          ].map((t) => (
            <div key={t.label} className="flex items-baseline gap-4 pb-3 border-b border-gray-100 dark:border-gray-700/50 last:border-0 last:pb-0">
              <span className={`${t.size} font-semibold text-gray-900 dark:text-white shrink-0 w-48`}>{t.sample}</span>
              <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">{t.label}</span>
            </div>
          ))}
          <div className="pt-2">
            <p className="font-mono text-sm text-gray-500"><span className="text-gray-400">mono:</span> const greeting = &quot;Hello, World!&quot;;</p>
          </div>
        </div>
      </section>

      {/* Spacing */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Spacing Scale</h2>
        <div className="space-y-2">
          {SPACING.map((s) => (
            <div key={s} className="flex items-center gap-4">
              <span className="w-12 text-right text-sm font-mono text-gray-500">{s === 0 ? "0" : `${s * 4}px`}</span>
              <span className="w-8 text-sm text-gray-400">sp-{s}</span>
              <div className="flex-1 h-6 rounded bg-indigo-100 dark:bg-indigo-900/30" style={{ width: `${Math.max(s * 5, 4)}%` }} />
            </div>
          ))}
        </div>
      </section>

      {/* Border Radius */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Border Radius</h2>
        <div className="flex flex-wrap gap-6">
          {RADIUS.map((r) => (
            <div key={r.name} className="text-center">
              <div className="w-20 h-20 bg-indigo-500 mx-auto mb-2" style={{ borderRadius: r.value }} />
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.name}</p>
              <p className="text-[10px] font-mono text-gray-400">{r.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Shadows */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Shadows</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: "sm", shadow: "shadow-sm" },
            { name: "md", shadow: "shadow-md" },
            { name: "lg", shadow: "shadow-lg" },
            { name: "xl", shadow: "shadow-xl" },
          ].map((s) => (
            <div key={s.name} className={`bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 ${s.shadow}`}>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Card</p>
              <p className="text-xs text-gray-500">Shadow: {s.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Component Previews */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Component Examples</h2>
        <div className="space-y-6">
          {/* Buttons */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-3">Buttons</p>
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Primary</button>
              <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">Secondary</button>
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">Outline</button>
              <button className="px-4 py-2 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20">Ghost</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">Danger</button>
            </div>
          </div>
          {/* Badges */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-3">Badges</p>
            <div className="flex flex-wrap gap-2">
              {["Default", "Success", "Warning", "Error", "Info"].map((b) => (
                <span key={b} className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  b === "Default" ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" :
                  b === "Success" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                  b === "Warning" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                  b === "Error" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                }`}>{b}</span>
              ))}
            </div>
          </div>
          {/* Input */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-3">Input</p>
            <input type="text" placeholder="Enter your email..." className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-72 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
          </div>
        </div>
      </section>
    </div>
  );
}
