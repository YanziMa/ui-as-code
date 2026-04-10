import { PageLoader } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="animate-pulse border-b border-zinc-100 bg-white/80 px-6 py-3 dark:border-zinc-900 dark:bg-black/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="h-6 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex gap-4">
            <div className="h-8 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-8 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-9 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
      <PageLoader />
    </div>
  );
}
