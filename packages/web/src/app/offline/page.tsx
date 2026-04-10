import Link from "next/link";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      {/* WiFi / Signal Icon */}
      <div className="relative mb-8">
        <svg
          className="mx-auto h-32 w-32 text-zinc-300 dark:text-zinc-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
          />
        </svg>
        {/* Slash overlay to indicate "offline" */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-36 w-0.5 rotate-[30deg] bg-red-400 dark:bg-red-500 rounded-full" />
        </div>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        You&apos;re offline
      </h1>

      <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        It looks like you&apos;ve lost your internet connection. Don&apos;t worry —
        UI-as-Code works offline for some features, and your data is safe.
      </p>

      {/* Two-column layout for available vs unavailable features */}
      <div className="mt-12 grid w-full max-w-2xl gap-8 sm:grid-cols-2">
        {/* Available offline */}
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-6 text-left dark:border-green-900/40 dark:bg-green-900/10">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700 dark:bg-green-800/60 dark:text-green-300"
              aria-hidden="true"
            >
              &#10003;
            </span>
            <h2 className="text-sm font-semibold text-green-800 dark:text-green-200">
              Available offline
            </h2>
          </div>
          <ul className="mt-4 space-y-3">
            {[
              "Previously viewed pages (cached)",
              "Your profile information",
              "Draft friction reports",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-green-700 dark:text-green-300">
                <span className="mt-0.5 shrink-0 text-green-500 dark:text-green-400" aria-hidden="true">
                  &bull;
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Needs internet */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 text-left dark:border-amber-900/40 dark:bg-amber-900/10">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-800/60 dark:text-amber-300"
              aria-hidden="true"
            >
              !
            </span>
            <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Needs internet
            </h2>
          </div>
          <ul className="mt-4 space-y-3">
            {[
              "Submitting new frictions",
              "Generating AI diffs",
              "Viewing latest activity",
              "Syncing data",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-amber-700 dark:text-amber-300">
                <span className="mt-0.5 shrink-0 text-amber-500 dark:text-amber-400" aria-hidden="true">
                  &bull;
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Try Again button */}
      <button
        type="button"
        onClick={() => location.reload()}
        className="mt-12 rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Try Again
      </button>

      {/* Cached page links */}
      <div className="mt-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Go to cached pages
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-3" aria-label="Cached navigation">
          <Link
            href="/dashboard"
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Dashboard
          </Link>
          <Link
            href="/frictions"
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Frictions
          </Link>
          <Link
            href="/settings"
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Settings
          </Link>
        </nav>
      </div>

      {/* Footer hint */}
      <p className="mt-12 text-xs text-zinc-400 dark:text-zinc-600">
        Your changes will sync automatically once you&apos;re back online.
      </p>
    </div>
  );
}
