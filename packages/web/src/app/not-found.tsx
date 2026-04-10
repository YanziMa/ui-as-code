import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {/* Animated 404 */}
      <div className="relative">
        <div className="text-[8rem] font-bold leading-none text-zinc-100 dark:text-zinc-800 select-none">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-4xl">🔍</div>
        </div>
      </div>

      <h1 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Let&apos;s get you back on track.
      </p>

      {/* Quick links */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Dashboard
        </Link>
        <Link
          href="/pr"
          className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          PR Dashboard
        </Link>
        <Link
          href="/api-docs"
          className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          API Docs
        </Link>
      </div>

      {/* Help text */}
      <p className="mt-10 text-xs text-zinc-400">
        If you think this is a bug,{" "}
        <a
          href="https://github.com/YanziMa/ui-as-code/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline hover:text-blue-600"
        >
          open an issue on GitHub
        </a>
      </p>
    </div>
  );
}
