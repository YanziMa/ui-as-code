/**
 * Time and date manipulation utilities.
 */

/** Current timestamp in milliseconds */
export function now(): number {
  return Date.now();
}

/** Current timestamp in seconds */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Create a delay/sleep promise */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Measure execution time of a function */
export async function measureTime<T>(fn: () => T | Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  return { result, durationMs };
}

/** Format a date as ISO string */
export function toISOString(date: Date | number): string {
  return new Date(date).toISOString();
}

/** Parse an ISO date string */
export function parseISODate(isoString: string): Date {
  return new Date(isoString);
}

/** Check if a date is today */
export function isToday(date: Date | number): boolean {
  const d = new Date(date);
  const today = new Date();

  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/** Check if a date was yesterday */
export function isYesterday(date: Date | number): boolean {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

/** Check if a date is within the last N days */
export function isWithinLastDays(date: Date | number, days: number): boolean {
  const diffMs = Date.now() - new Date(date).getTime();
  return diffMs <= days * 24 * 60 * 60 * 1000;
}

/** Get relative time string (e.g., "2 hours ago") */
export function timeAgo(date: Date | number, options?: { maxPrecision?: string }): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const absDiff = Math.abs(diffMs);

  if (absDiff < 60000) return "just now";
  if (absDiff < 3600000) return `${Math.floor(absDiff / 60000)} min ago`;
  if (absDiff < 86400000) return `${Math.floor(absDiff / 3600000)}h ago`;
  if (absDiff < 604800000) return `${Math.floor(absDiff / 86400000)}d ago`;
  if (absDiff < 2592000000) return `${Math.floor(absDiff / 604800000)}w ago`;
  return d.toLocaleDateString();
}

/** Get start of day (00:00:00.000) */
export function startOfDay(date?: Date): Date {
  const d = date ?? new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get end of day (23:59:59.999) */
export function endOfDay(date?: Date): Date {
  const d = date ?? new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Get start of week (Monday) */
export function startOfWeek(date?: Date): Date {
  const d = date ?? new Date();
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - diff);
  return startOfDay(d);
}

/** Get end of week (Sunday) */
export function endOfWeek(date?: Date): Date {
  const d = startOfWeek(date ?? new Date());
  d.setDate(d.getDate() + 6);
  return endOfDay(d);
}

/** Get start of month */
export function startOfMonth(date?: Date): Date {
  const d = date ?? new Date();
  d.setDate(1);
  return startOfDay(d);
}

/** Get end of month */
export function endOfMonth(date?: Date): Date {
  const d = date ?? new Date();
  d.setMonth(d.getMonth() + 1, 0);
  return endOfDay(d);
}

/** Add days to a date */
export function addDays(date: Date | number, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Add weeks to a date */
export function addWeeks(date: Date | number, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/** Add months to a date */
export function addMonths(date: Date | number, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Difference in days between two dates */
export function diffDays(a: Date | number, b: Date | number): number {
  const diffMs = new Date(a).getTime() - new Date(b).getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Difference in hours between two dates */
export function diffHours(a: Date | number, b: Date | number): number {
  const diffMs = new Date(a).getTime() - new Date(b).getTime();
  return Math.round(diffMs / (1000 * 60 * 60));
}

/** Check if two dates are the same day */
export function isSameDay(a: Date | number, b: Date | number): boolean {
  const da = new Date(a);
  const db = new Date(b);

  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

/** Format date as locale string */
export function formatDateLocale(
  date: Date | number,
  options?: Intl.DateTimeFormatOptions,
  locale = "en-US",
): string {
  return new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  });
}

/** Format time as locale string */
export function formatTimeLocale(
  date: Date | number,
  options?: Intl.DateTimeFormatOptions,
  locale = "en-US",
): string {
  return new Date(date).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

/** Get timezone offset string (e.g., "+08:00") */
export function getTimezoneOffset(): string {
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = Math.floor(Math.abs(offset) / 60)
    .toString()
    .padStart(2, "0");
  const mins = (Math.abs(offset) % 60).toString().padStart(2, "0");
  return `${sign}${hours}:${mins}`;
}
