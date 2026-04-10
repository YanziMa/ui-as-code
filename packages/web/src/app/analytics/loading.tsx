import { Skeleton, StatCardSkeleton } from "@/components/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <Skeleton className="mb-4 h-5 w-24" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="mb-4 h-5 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <div>
          <Skeleton className="mb-4 h-5 w-44" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </main>
    </div>
  );
}
