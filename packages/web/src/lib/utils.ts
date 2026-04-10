/**
 * General utility functions used across the app.
 */

/** Format a date as relative time (e.g., "2 minutes ago") */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return date.toLocaleDateString();
}

/** Truncate text to max length with ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "\u2026";
}

/** Generate a short unique ID (non-crypto, for display) */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Debounce a function */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Classnames utility (join truthy values) */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Check if we're running in the browser */
export const isBrowser = typeof window !== "undefined";

/** Check if code is running on server side */
export const isServer = !isBrowser;

/** Get base URL for API calls */
export function getBaseUrl(): string {
  if (isServer) {
    return process.env.NEXT_PUBLIC_APP_URL || "https://ui-as-code-web.vercel.app";
  }
  return window.location.origin || "https://ui-as-code-web.vercel.app";
}

/** Simple pluralization */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || singular + "s");
}
