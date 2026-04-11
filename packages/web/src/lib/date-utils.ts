/**
 * Date/Time utilities: formatting, parsing, relative time, timezone helpers,
 * duration formatting, calendar math, and locale-aware display.
 */

// --- Types ---

export interface DateFormatOptions {
  /** Include year? (default: true) */
  year?: boolean;
  /** Include month? (default: true) */
  month?: boolean;
  /** Include day? (default: true) */
  day?: boolean;
  /** Include hours? */
  hours?: boolean;
  /** Include minutes? */
  minutes?: boolean;
  /** Include seconds? */
  seconds?: boolean;
  /** Use 12-hour format? */
  twelveHour?: boolean;
  /** Show weekday name? */
  weekday?: boolean;
  /** Custom separator for date parts (default: "/") */
  dateSeparator?: string;
  /** Locale for formatting (default: system locale) */
  locale?: string;
}

export interface RelativeTimeOptions {
  /** Maximum granularity unit ("minute" | "hour" | "day" | "week" | "month" | "year") */
  maxUnit?: string;
  /** Add "ago" / "in X" suffix? (default: true) */
  addSuffix?: boolean;
  /** Custom labels for units */
  labels?: Record<string, { one: string; other: string; future: string }>;
}

// --- Formatting ---

/** Format a date with flexible options */
export function formatDate(date: Date | number | string, options: DateFormatOptions = {}): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid Date";

  const opts = {
    year: true,
    month: true,
    day: true,
    hours: false,
    minutes: false,
    seconds: false,
    twelveHour: false,
    weekday: false,
    dateSeparator: "/",
    locale: undefined as string | undefined,
    ...options,
  };

  // Use Intl if available and we have a locale
  if (opts.locale || Intl) {
    try {
      const intlOpts: Intl.DateTimeFormatOptions = {};
      if (opts.year) intlOpts.year = "numeric";
      if (opts.month) intlOpts.month = "2-digit";
      if (opts.day) intlOpts.day = "2-digit";
      if (opts.hours) intlOpts.hour = opts.twelveHour ? "numeric" : "2-digit";
      if (opts.minutes) intlOpts.minute = "2-digit";
      if (opts.seconds) intlOpts.second = "2-digit";
      if (opts.weekday) intlOpts.weekday = "short";
      if (opts.twelveHour) intlOpts.hour12 = true;

      return d.toLocaleDateString(opts.locale ?? undefined, intlOpts);
    } catch { /* fall through to manual */ }
  }

  // Manual formatting
  const parts: string[] = [];
  if (opts.year) parts.push(String(d.getFullYear()));
  if (opts.month) parts.push(String(d.getMonth() + 1).padStart(2, "0"));
  if (opts.day) parts.push(String(d.getDate()).padStart(2, "0"));

  let result = parts.join(opts.dateSeparator);

  if (opts.hours || opts.minutes || opts.seconds) {
    result += " ";
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");

    if (opts.twelveHour) {
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      result += `${String(h).padStart(2, "0")}:${m}`;
      if (opts.seconds) result += `:${s}`;
      result += ` ${ampm}`;
    } else {
      result += `${String(h).padStart(2, "0")}:${m}`;
      if (opts.seconds) result += `:${s}`;
    }
  }

  return result;
}

/** Format as ISO date string (YYYY-MM-DD) */
export function toISODate(date: Date | number | string): string {
  return new Date(date).toISOString().split("T")[0]!;
}

/** Format as ISO datetime string (YYYY-MM-DD HH:mm:ss) */
export function toISODatetime(date: Date | number | string): string {
  const d = new Date(date);
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}

/** Format time only (HH:mm or HH:mm:ss) */
export function formatTime(date: Date | number | string, showSeconds = false): string {
  const d = new Date(date);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  if (!showSeconds) return `${h}:${m}`;
  return `${h}:${m}:${String(d.getSeconds()).padStart(2, "0")}`;
}

// --- Relative Time ---

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/** Get human-readable relative time string (e.g., "3 minutes ago", "in 2 days") */
export function relativeTime(date: Date | number | string, options: RelativeTimeOptions = {}): string {
  const d = new Date(date);
  const now = Date.now();
  const diff = now - d.getTime();
  const absDiff = Math.abs(diff);
  const isPast = diff >= 0;

  const { addSuffix = true, labels } = options;

  const defaultLabels: Record<string, { one: string; other: string; future: string }> = {
    second:  { one: "a second ago", other: "seconds ago", future: "in a second" },
    minute:  { one: "a minute ago",  other: "minutes ago", future: "in a minute" },
    hour:    { one: "an hour ago",   other: "hours ago",   future: "in an hour" },
    day:     { one: "yesterday",    other: "days ago",    future: "tomorrow" },
    week:    { one: "a week ago",   other: "weeks ago",   future: "in a week" },
    month:   { one: "a month ago",  other: "months ago",  future: "in a month" },
    year:    { one: "a year ago",   other: "years ago",   future: "in a year" },
  };

  const lbls = labels ?? defaultLabels;

  function pick(unit: string, value: number): string {
    const l = lbls[unit] ?? defaultLabels[unit]!;
    if (value === 1) return isPast ? l.one : l.future;
    return isPast ? `${value} ${l.other}` : `in ${value} ${l.other.replace(" ago", "")}`;
  }

  if (absDiff < MINUTE) {
    const secs = Math.floor(absDiff / SECOND);
    if (secs < 45) return addSuffix ? pick("second", secs) : `${secs}s`;
    return addSuffix ? pick("minute", 1) : "1m";
  }

  if (absDiff < HOUR) {
    return addSuffix ? pick("minute", Math.floor(absDiff / MINUTE)) : `${Math.floor(absDiff / MINUTE)}m`;
  }

  if (absDiff < DAY) {
    return addSuffix ? pick("hour", Math.floor(absDiff / HOUR)) : `${Math.floor(absDiff / HOUR)}h`;
  }

  if (absDiff < WEEK) {
    return addSuffix ? pick("day", Math.floor(absDiff / DAY)) : `${Math.floor(absDiff / DAY)}d`;
  }

  if (absDiff < MONTH) {
    return addSuffix ? pick("week", Math.floor(absDiff / WEEK)) : `${Math.floor(absDiff / WEEK)}w`;
  }

  if (absDiff < YEAR) {
    return addSuffix ? pick("month", Math.floor(absDiff / MONTH)) : `${Math.floor(absDiff / MONTH)}mo`;
  }

  return addSuffix ? pick("year", Math.floor(absDiff / YEAR)) : `${Math.floor(absDiff / YEAR)}y`;
}

/** Short relative time (e.g., "3m", "2h", "1d") */
export function shortRelativeTime(date: Date | number | string): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const absDiff = Math.abs(diff);

  if (absDiff < MINUTE) return "now";
  if (absDiff < HOUR) return `${Math.floor(absDiff / MINUTE)}m`;
  if (absDiff < DAY) return `${Math.floor(absDiff / HOUR)}h`;
  if (absDiff < WEEK) return `${Math.floor(absDiff / DAY)}d`;
  if (absDiff < MONTH) return `${Math.floor(absDiff / WEEK)}w`;
  return formatDate(d, { month: false, day: false });
}

// --- Parsing ---

/** Parse various date string formats into a Date object */
export function parseDate(input: string): Date | null {
  if (!input) return null;

  // Try native Date.parse first
  const native = new Date(input);
  if (!isNaN(native.getTime())) return native;

  // Try common formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,                    // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/,                   // MM/DD/YYYY
    /^(\d{2})\.(\d{2})\.(\d{4})$/,                   // DD.MM.YYYY
    /^(\d{4})\/(\d{2})\/(\d{2})$/,                   // YYYY/MM/DD
  ];

  for (const fmt of formats) {
    const match = input.match(fmt);
    if (match) {
      if (fmt === formats[0] || fmt === formats[3]) {
        // YYYY-MM-DD or YYYY/MM/DD
        return new Date(+match[1]!, +match[2]! - 1, +match[3]!);
      } else if (fmt === formats[1]) {
        // MM/DD/YYYY
        return new Date(+match[3]!, +match[1]! - 1, +match[2]!);
      } else {
        // DD.MM.YYYY
        return new Date(+match[3]!, +match[2]! - 1, +match[1]!);
      }
    }
  }

  return null;
}

// --- Duration ---

/** Format milliseconds into human-readable duration */
export function formatDuration(
  ms: number,
  options: { maxUnits?: number; short?: boolean; showMs?: boolean } = {},
): string {
  const { maxUnits = 2, short = false, showMs = false } = options;
  if (ms < 0) ms = 0;

  const parts: string[] = [];

  const days = Math.floor(ms / DAY);
  ms %= DAY;
  const hours = Math.floor(ms / HOUR);
  ms %= HOUR;
  const minutes = Math.floor(ms / MINUTE);
  ms %= MINUTE;
  const seconds = Math.floor(ms / SECOND);
  ms %= SECOND;

  if (days > 0) parts.push(short ? `${days}d` : `${days} day${days !== 1 ? "s" : ""}`);
  if (hours > 0) parts.push(short ? `${hours}h` : `${hours} hour${hours !== 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(short ? `${minutes}m` : `${minutes} minute${minutes !== 1 ? "s" : ""}`);
  if (seconds > 0 || (parts.length === 0 && !showMs)) {
    parts.push(short ? `${seconds}s` : `${seconds} second${seconds !== 1 ? "s" : ""}`);
  }
  if ((showMs && ms > 0) || parts.length === 0) {
    parts.push(`${ms}ms`);
  }

  return parts.slice(0, maxUnits).join(short ? " " : ", ");
}

/** Parse duration string like "2h 30m" or "1d 5h" into milliseconds */
export function parseDuration(str: string): number {
  const patterns: [RegExp, number][] = [
    [/(\d+)\s*d/i, DAY],
    [/(\d+)\s*h/i, HOUR],
    [/(\d+)\s*m(?:in)?/i, MINUTE],
    [/(\d+)\s*s(?:ec)?/i, SECOND],
    [/(\d+)\s*ms/i, 1],
  ];

  let total = 0;
  for (const [pattern, multiplier] of patterns) {
    const match = str.match(pattern);
    if (match) total += parseInt(match[1]!) * multiplier;
  }

  return total;
}

// --- Calendar Math ---

/** Check if a year is a leap year */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Get days in a given month */
export function daysInMonth(year: number, month: number): number {
  // month is 0-indexed (0 = January)
  return new Date(year, month + 1, 0).getDate();
}

/** Get the day of week for a given date (0 = Sunday) */
export function getDayOfWeek(date: Date | number | string): number {
  return new Date(date).getDay();
}

/** Get week number (ISO 8601) */
export function getWeekNumber(date: Date | number | string): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  // January 4 is always in week 1
  const week1 = new Date(d.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

/** Get quarter of year (1-4) */
export function getQuarter(date: Date | number | string): number {
  return Math.ceil((new Date(date).getMonth() + 1) / 3);
}

/** Check if two dates are on the same day */
export function isSameDay(a: Date | number | string, b: Date | number | string): boolean {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
         da.getMonth() === db.getMonth() &&
         da.getDate() === db.getDate();
}

/** Check if a date is today */
export function isToday(date: Date | number | string): boolean {
  return isSameDay(date, Date.now());
}

/** Check if a date is yesterday */
export function isYesterday(date: Date | number | string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

/** Check if a date is between two dates (inclusive) */
export function isBetween(
  date: Date | number | string,
  start: Date | number | string,
  end: Date | number | string,
): boolean {
  const t = new Date(date).getTime();
  return t >= new Date(start).getTime() && t <= new Date(end).getTime();
}

/** Add/subtract time from a date */
export function addTime(
  date: Date | number | string,
  amount: Partial<{ years: number; months: number; days: number; hours: number; minutes: number; seconds: number; weeks: number }>,
): Date {
  const d = new Date(date);
  if (amount.years) d.setFullYear(d.getFullYear() + amount.years);
  if (amount.months) d.setMonth(d.getMonth() + amount.months);
  if (amount.weeks) d.setDate(d.getDate() + amount.weeks * 7);
  if (amount.days) d.setDate(d.getDate() + amount.days);
  if (amount.hours) d.setHours(d.getHours() + amount.hours);
  if (amount.minutes) d.setMinutes(d.getMinutes() + amount.minutes);
  if (amount.seconds) d.setSeconds(d.getSeconds() + amount.seconds);
  return d;
}

/** Start of day (00:00:00) */
export function startOfDay(date: Date | number | string): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** End of day (23:59:59.999) */
export function endOfDay(date: Date | number | string): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Start of week (Sunday) */
export function startOfWeek(date: Date | number | string): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** End of week (Saturday) */
export function endOfWeek(date: Date | number | string): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + (6 - d.getDay()));
  return endOfDay(d);
}

/** Start of month */
export function startOfMonth(date: Date | number | string): Date {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

/** End of month */
export function endOfMonth(date: Date | number | string): Date {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

// --- Timezone Helpers ---

/** Get the user's timezone name (e.g., "America/New_York") */
export function getTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; }
}

/** Get timezone offset in hours */
export function getTimezoneOffset(date?: Date): number {
  return -(new Date(date ?? Date.now()).getTimezoneOffset() / 60);
}

/** Convert date to another timezone's representation (returns formatted string) */
export function convertToTimezone(
  date: Date | number | string,
  timezone: string,
  format: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", timeZoneName: "short" },
): string {
  return new Date(date).toLocaleString("en-US", { ...format, timeZone: timezone });
}
