"use client";

import { useAuth } from "@/hooks/useAuth";

export function AuthButton() {
  const { user, loading, signInWithOAuth, signOut } = useAuth();

  if (loading) {
    return (
      <button className="rounded-lg bg-zinc-200 px-4 py-2 text-sm dark:bg-zinc-800">
        ...
      </button>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {user.email}
        </span>
        <button
          onClick={signOut}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => signInWithOAuth("github")}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        GitHub
      </button>
      <button
        onClick={() => signInWithOAuth("google")}
        className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        Google
      </button>
    </div>
  );
}
