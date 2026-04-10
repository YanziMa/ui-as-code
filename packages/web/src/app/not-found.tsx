import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl font-bold text-zinc-200 dark:text-zinc-800">404</div>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
      >
        Back to Home
      </Link>
    </div>
  );
}
