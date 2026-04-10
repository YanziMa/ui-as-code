import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Diff Preview",
  description: "Preview AI-generated diffs before accepting changes",
};

/* ------------------------------------------------------------------ */
/*  Sample data — in production this would come from API / DB params   */
/* ------------------------------------------------------------------ */

const originalLines = [
  { num: 1, text: 'import React, { useState } from "react";' },
  { num: 2, text: "" },
  { num: 3, text: "interface ContactFormProps {" },
  { num: 4, text: "  onSubmit: (data: Record<string, string>) => void;" },
  { num: 5, text: "  loading?: boolean;" },
  { num: 6, text: "}" },
  { num: 7, text: "" },
  { num: 8, text: "export function ContactForm({ onSubmit, loading }: ContactFormProps) {" },
  { num: 9, text: '  const [formData, setFormData] = useState<Record<string, string>>({});' },
  { num: 10, text: "" },
  { num: 11, text: "  const handleChange = (" },
  { num: 12, text: "    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>" },
  { num: 13, text: "  ) => {" },
  { num: 14, text: '    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));' },
  { num: 15, text: "  };" },
  { num: 16, text: "" },
  { num: 17, text: "  const handleSubmit = (e: React.FormEvent) => {" },
  { num: 18, text: "    e.preventDefault();" },
  { num: 19, text: "    onSubmit(formData);" },
  { num: 20, text: "  };" },
  { num: 21, text: "" },
  { num: 22, text: "  return (" },
  { num: 23, text: '    <form onSubmit={handleSubmit} className="space-y-4">' },
  { num: 24, text: '      <div>' },
  { num: 25, text: '        <label htmlFor="name" className="block text-sm font-medium">Name</label>' },
  { num: 26, text: '        <input' },
  { num: 27, text: '          id="name"' },
  { num: 28, text: '          name="name"' },
  { num: 29, text: '          type="text"' },
  { num: 30, text: '          onChange={handleChange}' },
  { num: 31, text: '          className="mt-1 w-full rounded border px-3 py-1.5"' },
  { num: 32, text: "        />" },
  { num: 33, text: "      </div>" },
  { num: 34, text: "" },
  { num: 35, text: '      <div>' },
  { num: 36, text: '        <label htmlFor="email" className="block text-sm font-medium">Email</label>' },
  { num: 37, text: '        <input' },
  { num: 38, text: '          id="email"' },
  { num: 39, text: '          name="email"' },
  { num: 40, text: '          type="email"' },
  { num: 41, text: '          onChange={handleChange}' },
  { num: 42, text: '          className="mt-1 w-full rounded border px-3 py-1.5"' },
  { num: 43, text: "        />" },
  { num: 44, text: "      </div>" },
  { num: 45, text: "" },
  { num: 46, text: '      <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">' },
  { num: 47, text: "        Submit" },
  { num: 48, text: "      </button>" },
  { num: 49, text: "    </form>" },
  { num: 50, text: "  );" },
  { num: 51, text: "}" },
];

const modifiedLines = [
  { num: 1, text: 'import React, { useState } from "react";', type: "unchanged" as const },
  { num: 2, text: "", type: "unchanged" as const },
  { num: 3, text: "interface ContactFormProps {", type: "unchanged" as const },
  { num: 4, text: "  onSubmit: (data: Record<string, string>) => void;", type: "unchanged" as const },
  { num: 5, text: "  loading?: boolean;", type: "unchanged" as const },
  { num: 6, text: "}", type: "unchanged" as const },
  { num: 7, text: "", type: "unchanged" as const },
  { num: 8, text: "export function ContactForm({ onSubmit, loading }: ContactFormProps) {", type: "unchanged" as const },
  { num: 9, text: '  const [formData, setFormData] = useState<Record<string, string>>({});', type: "unchanged" as const },
  { num: null, text: "", type: "added" as const },
  { num: null, text: '  // Track form submission state', type: "added" as const },
  { num: null, text: "  const [isSubmitting, setIsSubmitting] = useState(false);", type: "added" as const },
  { num: null, text: "", type: "added" as const },
  { num: 10, text: "  const handleChange = (", type: "unchanged" as const },
  { num: 11, text: "    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>", type: "unchanged" as const },
  { num: 12, text: "  ) => {", type: "unchanged" as const },
  { num: 13, text: '    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));', type: "unchanged" as const },
  { num: 14, text: "  };", type: "unchanged" as const },
  { num: 15, text: "", type: "unchanged" as const },
  { num: 16, text: "  const handleSubmit = async (e: React.FormEvent) => {", type: "changed" as const },
  { num: 17, text: "    e.preventDefault();", type: "unchanged" as const },
  { num: null, text: "    setIsSubmitting(true);", type: "added" as const },
  { num: null, text: "    try {", type: "added" as const },
  { num: 18, text: "      await onSubmit(formData);", type: "changed" as const },
  { num: null, text: "    } finally {", type: "added" as const },
  { num: null, text: "      setIsSubmitting(false);", type: "added" as const },
  { num: null, text: "    }", type: "added" as const },
  { num: null, text: "  };", type: "removed" as const },
  { num: 19, text: "  };", type: "unchanged" as const },
  { num: 20, text: "", type: "unchanged" as const },
  { num: 21, text: "  return (", type: "unchanged" as const },
  { num: 22, text: '    <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl border shadow-sm">', type: "changed" as const },
  { num: 23, text: "      <div>", type: "unchanged" as const },
  { num: 24, text: '        <label htmlFor="name" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Full Name</label>', type: "changed" as const },
  { num: 25, text: "        <input", type: "unchanged" as const },
  { num: 26, text: '          id="name"', type: "unchanged" as const },
  { num: 27, text: '          name="name"', type: "unchanged" as const },
  { num: 28, text: '          type="text"', type: "unchanged" as const },
  { num: 29, text: "          onChange={handleChange}", type: "unchanged" as const },
  { num: 30, text: '          className="mt-1.5 w-full rounded-lg border-zinc-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"', type: "changed" as const },
  { num: 31, text: "        />", type: "unchanged" as const },
  { num: 32, text: "      </div>", type: "unchanged" as const },
  { num: 33, text: "", type: "unchanged" as const },
  { num: 34, text: "      <div>", type: "unchanged" as const },
  { num: 35, text: '        <label htmlFor="email" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Email Address</label>', type: "changed" as const },
  { num: 36, text: "        <input", type: "unchanged" as const },
  { num: 37, text: '          id="email"', type: "unchanged" as const },
  { num: 38, text: '          name="email"', type: "unchanged" as const },
  { num: 39, text: '          type="email"', type: "unchanged" as const },
  { num: 40, text: "          onChange={handleChange}", type: "unchanged" as const },
  { num: 41, text: '          className="mt-1.5 w-full rounded-lg border-zinc-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"', type: "changed" as const },
  { num: 42, text: "        />", type: "unchanged" as const },
  { num: 43, text: "      </div>", type: "unchanged" as const },
  { num: 44, text: "", type: "unchanged" as const },
  { num: null, text: '      {/* Message field */}', type: "added" as const },
  { num: null, text: "      <div>", type: "added" as const },
  { num: null, text: '        <label htmlFor="message" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Message</label>', type: "added" as const },
  { num: null, text: "        <textarea", type: "added" as const },
  { num: null, text: '          id="message"', type: "added" as const },
  { num: null, text: '          name="message"', type: "added" as const },
  { num: null, text: '          rows={3}', type: "added" as const },
  { num: null, text: "          onChange={handleChange}", type: "added" as const },
  { num: null, text: '          className="mt-1.5 w-full resize-none rounded-lg border-zinc-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"', type: "added" as const },
  { num: null, text: "        />", type: "added" as const },
  { num: null, text: "      </div>", type: "added" as const },
  { num: null, text: "", type: "added" as const },
  { num: 45, text: '      <button', type: "removed" as const },
  { num: 46, text: '        type="submit"', type: "removed" as const },
  { num: 47, text: '        className="rounded bg-blue-600 px-4 py-2 text-white"', type: "removed" as const },
  { num: 48, text: "      >", type: "removed" as const },
  { num: 49, text: "        Submit", type: "removed" as const },
  { num: 50, text: "      </button>", type: "removed" as const },
  { num: null, text: '      <button', type: "added" as const },
  { num: null, text: '        type="submit"', type: "added" as const },
  { num: null, text: '        disabled={isSubmitting || loading}', type: "added" as const },
  { num: null, text: '        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"', type: "added" as const },
  { num: null, text: "      >", type: "added" as const },
  { num: null, text: "        {isSubmitting ? (", type: "added" as const },
  { num: null, text: '          <>', type: "added" as const },
  { num: null, text: '            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">', type: "added" as const },
  { num: null, text: '              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />', type: "added" as const },
  { num: null, text: '              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />', type: "added" as const },
  { num: null, text: "            </svg>", type: "added" as const },
  { num: null, text: '            Submitting...', type: "added" as const },
  { num: null, text: "          </>", type: "added" as const },
  { num: null, text: "        ) : (", type: "added" as const },
  { num: null, text: "          \"Submit\"", type: "added" as const },
  { num: null, text: "        )}", type: "added" as const },
  { num: null, text: "      </button>", type: "added" as const },
  { num: 51, text: "    </form>", type: "unchanged" as const },
  { num: 52, text: "  );", type: "unchanged" as const },
  { num: 53, text: "}", type: "unchanged" as const },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DiffSandboxPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* ===== Header ===== */}
      <header className="border-b border-zinc-200 bg-white px-6 py-5 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-7xl">
          {/* Breadcrumb */}
          <nav className="mb-2 flex items-center gap-1.5 text-sm">
            <Link
              href="/"
              className="text-zinc-500 hover:text-zinc-700 transition-colors dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Frictions
            </Link>
            <svg
              className="h-3.5 w-3.5 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <Link
              href="/pr"
              className="text-zinc-500 hover:text-zinc-700 transition-colors dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              #123
            </Link>
            <svg
              className="h-3.5 w-3.5 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Preview
            </span>
          </nav>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Diff Preview
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Ready to review
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <span className="flex items-center gap-1.5">
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
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  Export Diff
                </span>
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <span className="flex items-center gap-1.5">
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
                      d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                    />
                  </svg>
                  Share
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* ---- Left column: diff panels + actions ---- */}
          <div className="space-y-6">
            {/* File header bar */}
            <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-zinc-200 bg-zinc-100 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2.5">
                <svg
                  className="h-4 w-4 text-zinc-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  src/components/ContactForm.tsx
                </span>
              </div>
              <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-[11px] font-mono font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                TypeScript React
              </span>
            </div>

            {/* Two-panel diff viewer */}
            <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-b-xl border border-zinc-200 dark:border-zinc-800">
              {/* --- Original panel --- */}
              <div className="border-r border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900/80">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Original
                  </span>
                  <span className="ml-auto text-[11px] text-zinc-400">
                    {originalLines.length} lines
                  </span>
                </div>
                <div className="overflow-x-auto bg-[#fafafa] p-0 dark:bg-[#0d0d0d]">
                  <table className="w-full border-collapse text-left font-mono text-[13px] leading-6">
                    <tbody>
                      {originalLines.map((line) => (
                        <tr key={`orig-${line.num}`} className="group hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
                          <td className="select-none pr-3 pl-4 text-right align-top tabular-nums text-xs text-zinc-400 w-10 pt-0 pb-0">
                            {line.num}
                          </td>
                          <td className="whitespace-pre px-3 pt-0 pb-0 text-zinc-700 dark:text-zinc-300">
                            {line.text || " "}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* --- Modified panel --- */}
              <div>
                <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900/80">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Modified
                  </span>
                  <span className="ml-auto text-[11px] text-zinc-400">
                    {modifiedLines.length} lines
                  </span>
                </div>
                <div className="overflow-x-auto bg-[#fafafa] p-0 dark:bg-[#0d0d0d]">
                  <table className="w-full border-collapse text-left font-mono text-[13px] leading-6">
                    <tbody>
                      {modifiedLines.map((line, i) => {
                        const bgClass =
                          line.type === "added"
                            ? "bg-emerald-50/70 dark:bg-emerald-950/30"
                            : line.type === "removed"
                              ? "bg-red-50/70 dark:bg-red-950/30"
                              : line.type === "changed"
                                ? "bg-amber-50/70 dark:bg-amber-950/30"
                                : "";
                        const prefix =
                          line.type === "added"
                            ? "+"
                            : line.type === "removed"
                              ? "-"
                              : " ";
                        const prefixColor =
                          line.type === "added"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : line.type === "removed"
                              ? "text-red-600 dark:text-red-400"
                              : "text-transparent";

                        return (
                          <tr
                            key={`mod-${i}`}
                            className={`${bgClass} group`}
                          >
                            <td className="select-none pr-2 pl-4 text-right align-top tabular-nums text-xs text-zinc-400 w-10 pt-0 pb-0">
                              {line.num ?? ""}
                            </td>
                            <td className={`select-none w-5 align-top pt-0 pb-0 ${prefixColor}`}>
                              {prefix}
                            </td>
                            <td
                              className={`whitespace-pre px-2 pt-0 pb-0 ${
                                line.type === "added"
                                  ? "text-emerald-800 dark:text-emerald-300"
                                  : line.type === "removed"
                                    ? "text-red-800 dark:text-red-300 line-through decoration-red-400/50"
                                    : line.type === "changed"
                                      ? "text-amber-900 dark:text-amber-200"
                                      : "text-zinc-700 dark:text-zinc-300"
                              }`}
                            >
                              {line.text || " "}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ===== Diff Stats Bar ===== */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-3.5 dark:border-zinc-800 dark:bg-black">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  23 lines added
                </span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-red-500 dark:text-red-400">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                  </svg>
                  8 lines removed
                </span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
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
                      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                    />
                  </svg>
                  2 files changed
                </span>
              </div>
              <div className="ml-auto hidden sm:block h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
              <span className="ml-auto text-xs text-zinc-400 sm:ml-0">
                Generated at{" "}
                {new Date().toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* ===== Action Buttons ===== */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800"
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
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                Accept &amp; Create PR
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                  />
                </svg>
                Request Changes
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
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
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
                Discard
              </button>
            </div>
          </div>

          {/* ---- Right sidebar: AI context + component info ---- */}
          <aside className="space-y-5">
            {/* AI Context Card */}
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
              <div className="border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
                    <svg
                      className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    AI Context
                  </h2>
                </div>
              </div>

              <div className="space-y-5 px-5 py-4">
                {/* Prompt used */}
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Prompt Used
                  </p>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                    &ldquo;Make the submit button larger and add a loading state&rdquo;
                  </div>
                </div>

                {/* Confidence score */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Confidence Score
                    </p>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      94%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                      style={{ width: "94%" }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-400">
                    High confidence -- changes are safe to apply
                  </p>
                </div>

                {/* Divider */}
                <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                {/* Model info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      AI Model
                    </p>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      Claude Sonnet 4
                    </p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Generated In
                    </p>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      2.3s
                    </p>
                  </div>
                </div>

                {/* Token usage */}
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Token Usage
                  </p>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>
                      Input:{" "}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        1,248
                      </span>
                    </span>
                    <span>
                      Output:{" "}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        892
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Component Info Card */}
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
              <div className="border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                    <svg
                      className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                      />
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Component Info
                  </h2>
                </div>
              </div>

              <div className="space-y-4 px-5 py-4">
                {/* Component name + badge */}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      HubSpot ContactForm
                    </p>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                      React
                    </span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-zinc-50 px-3 py-2.5 text-center dark:bg-zinc-900">
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      245
                    </p>
                    <p className="text-[10px] text-zinc-500">Lines</p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 px-3 py-2.5 text-center dark:bg-zinc-900">
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      6
                    </p>
                    <p className="text-[10px] text-zinc-500">Props</p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 px-3 py-2.5 text-center dark:bg-zinc-900">
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      3
                    </p>
                    <p className="text-[10px] text-zinc-500">Hooks</p>
                  </div>
                </div>

                {/* Source path */}
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Source Path
                  </p>
                  <code className="block break-all rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                    hubspot-webapp/src/components/forms/ContactForm.tsx
                  </code>
                </div>

                {/* Detected framework features */}
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Detected Features
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "useState",
                      "TypeScript",
                      "Form Handling",
                      "Controlled Inputs",
                      "Async Submit",
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick tips card */}
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900/50">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Tip:
                </span>{" "}
                Review each changed line carefully. Green lines are additions,
                red lines are removals, and yellow highlights indicate modified
                content.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
