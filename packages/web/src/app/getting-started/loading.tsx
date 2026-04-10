import { Skeleton } from "@/components/skeleton";

export default function GettingStartedLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-4 w-20 mb-4" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-10">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="ml-11 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
