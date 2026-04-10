"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {error.message || "An unexpected error occurred. We've been notified."}
        </p>
        {error.digest && (
          <p className="text-xs text-zinc-400 font-mono mb-4">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-4 py-2 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            Go Home
          </Link>
        </div>
        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">
            Need help?{" "}
            <Link href="https://github.com/YanziMa/ui-as-code/issues" target="_blank" rel="noopener noreferrer" className="underline">
              Report this issue
            </Link>{" "}
            or check the{" "}
            <Link href="/status" className="underline">status page</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
