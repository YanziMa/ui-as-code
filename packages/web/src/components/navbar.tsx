"use client";

import Link from "next/link";
import { AuthButton } from "./auth-button";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-100 bg-white/80 backdrop-blur-md dark:border-zinc-900 dark:bg-black/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
          <span className="text-blue-600">UI</span>asCode
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/#how-it-works"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            How it Works
          </Link>
          <Link
            href="/pr"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            PR Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            My Dashboard
          </Link>
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
