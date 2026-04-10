import { Skeleton } from "@/components/skeleton";

export default function WebhooksLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 space-y-8 max-w-4xl">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </main>
    </div>
  );
}
