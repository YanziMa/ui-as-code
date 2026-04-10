import { Skeleton } from "@/components/skeleton";

export default function ApiKeysLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 space-y-6 max-w-3xl">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </main>
    </div>
  );
}
