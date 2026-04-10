/**
 * Loading states / spinners.
 */

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizes = { sm: "w-4 h-4", md: "w-8 h-8", lg: "w-12 h-12" };
  return (
    <div
      role="status"
      className={cn(
        "animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600",
        sizes[size],
        className,
      )}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface LoadingDotsProps {
  className?: string;
}

export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <div role="status" className={cn("flex gap-1 items-center", className)}>
      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:300ms]" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("animate-pulse rounded-md bg-gray-200 dark:bg-gray-700", className)}
        />
      ))}
    </>
  );
}

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = "Loading..." }: PageLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
