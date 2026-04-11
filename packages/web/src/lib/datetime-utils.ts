/**
 * DateTime Utilities: Date/time formatting, parsing, manipulation,
 * relative time, duration formatting, timezone helpers, calendar math,
 * and i18n-aware date utilities.
 */

// --- Types ---

export type DateUnit = "year" | "month" | "week" | "day" | "hour" | "minute" | "second" | "ms";

export interface Duration {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  ms?: number;
}

export interface DateFormatOptions {
  /** Locale for formatting */
  locale?: string;
  /** Include time? */
  includeTime?: boolean;
  /** Include seconds? */
  includeSeconds?: boolean;
  /** Custom format string */
  format?: string;
  /** Use relative time? */
  relative?: boolean;
  /** Relative time threshold (seconds) */
  relativeThreshold?: number;
}

// --- Constants ---

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --- Core Functions ---

/**
 * Format a date according to options or a custom format string.
 *
 * Supports: yyyy, yy, MMMM, MMM, MM, M, dddd, ddd, dd, d,
 * HH, H, hh, h, mm, m, ss, s, A/a (AM/PM)
 */
export function formatDate(date: Date | number | string, options: DateFormatOptions = {}): string {
  const d = toDate(date);
  const { locale, includeTime, includeSeconds, format } = options;

  if (format) return formatWithPattern(d, format);

  if (options.relative) {
    const rel = getRelativeTime(d, options.relativeThreshold);
    if (rel !== null) return rel;
  }

  let result = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

  if (includeTime) {
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = includeSeconds ? `:${String(d.getSeconds()).padStart(2, "0")}` : "";
    const period = h >= 12 ? " PM" : " AM";
    const h12 = h % 12 || 12;
    result += `, ${h12}:${m}${s}${period}`;
  }

  return result;
}

/** Parse a date from various input formats */
export function parseDate(input: string | Date | number): Date {
  if (input instanceof Date) return new Date(input);
  if (typeof input === "number") return new Date(input);

  // ISO 8601
  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})?)?$/);
  if (isoMatch) {
    const [, y, mo, d, h = "0", mi = "0", s = "0"] = isoMatch;
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}.000`);
  }

  // Try native Date.parse
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) return parsed;

  // Fallback to now
  return new Date();
}

/** Get human-readable relative time string */
export function getRelativeTime(date: Date | number | string, thresholdSeconds: number = 86400 * 30): string | null {
  const d = toDate(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.abs(diffMs) / 1000;

  // Future or past
  const suffix = diffMs < 0 ? "from now" : "ago";
  const absSec = Math.floor(diffSec);

  if (absSec < 45) return `just now`;
  if (absSec < 90) return `1 minute ${suffix}`;
  if (absSec < 2700) return `${Math.round(absSec / 60)} minutes ${suffix}`;
  if (absSec < 5400) return `1 hour ${suffix}`;
  if (absSec < 86400) return `${Math.round(absSec / 3600)} hours ${suffix}`;
  if (absSec < 172800) return `yesterday ${formatTime(d)}`;
  if (absSec < 604800) return `${Math.round(absSec / 86400)} days ${suffix}`;

  if (diffSec > thresholdSeconds) return null; // Use absolute date

  if (absSec < 2629800) return `${Math.round(absSec / 604800)} weeks ${suffix}`;
  if (absSec < 31557600) return `${Math.round(absSec / 2629800)} months ${suffix}`;
  return `${Math.round(absSec / 31557600)} years ${suffix}`;
}

// --- Date Arithmetic ---

/** Add units to a date, returns a new Date */
export function addDate(date: Date | number | string, amount: number, unit: DateUnit): Date {
  const d = toDate(date);
  switch (unit) {
    case "year": d.setFullYear(d.getFullYear() + amount); break;
    case "month": d.setMonth(d.getMonth() + amount); break;
    case "week": d.setDate(d.getDate() + amount * 7); break;
    case "day": d.setDate(d.getDate() + amount); break;
    case "hour": d.setHours(d.getHours() + amount); break;
    case "minute": d.setMinutes(d.getMinutes() + amount); break;
    case "second": d.setSeconds(d.getSeconds() + amount); break;
    case "ms": d.setMilliseconds(d.getMilliseconds() + amount); break;
  }
  return d;
}

/** Subtract units from a date */
export function subDate(date: Date | number | string, amount: number, unit: DateUnit): Date {
  return addDate(date, -amount, unit);
}

/** Get the difference between two dates in the specified unit */
export function diffDates(a: Date | number | string, b: Date | number | string, unit: DateUnit = "ms"): number {
  const da = toDate(a).getTime();
  const db = toDate(b).getTime();
  const diff = da - db;

  switch (unit) {
    case "year": return toDate(a).getFullYear() - toDate(b).getFullYear();
    case "month":
      return (toDate(a).getFullYear() - toDate(b).getFullYear()) * 12 +
        (toDate(a).getMonth() - toDate(b).getMonth());
    case "week": return Math.round(diff / MS_PER_WEEK);
    case "day": return Math.round(diff / MS_PER_DAY);
    case "hour": return Math.round(diff / MS_PER_HOUR);
    case "minute": return Math.round(diff / MS_PER_MINUTE);
    case "second": return Math.round(diff / MS_PER_SECOND);
    default: return diff;
  }
}

/** Check if two dates are on the same day */
export function isSameDay(a: Date | number | string, b: Date | number | string): boolean {
  const da = toDate(a), db = toDate(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

/** Check if a date is today */
export function isToday(date: Date | number | string): boolean { return isSameDay(date, new Date()); }

/** Check if a date is between two other dates (inclusive) */
export function isBetween(
  date: Date | number | string,
  start: Date | number | string,
  end: Date | number | string,
): boolean {
  const t = toDate(date).getTime();
  return t >= toDate(start).getTime() && t <= toDate(end).getTime();
}

/** Get start of day (00:00:00.000) */
export function startOfDay(date: Date | number | string): Date {
  const d = toDate(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get end of day (23:59:59.999) */
export function endOfDay(date: Date | number | string): Date {
  const d = toDate(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Get start of week (configurable first day) */
export function startOfWeek(date: Date | number | string, firstDayOfWeek: number = 0): Date {
  const d = toDate(date);
  const day = d.getDay();
  const diff = (day - firstDayOfWeek + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get start of month */
export function startOfMonth(date: Date | number | string): Date {
  const d = toDate(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get end of month */
export function endOfMonth(date: Date | number | string): Date {
  const d = toDate(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Get days in month */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Check if a year is a leap year */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Get ISO week number */
export function getWeekNumber(date: Date | number | string): number {
  const d = toDate(date);
  const target = new Date(d.valueOf());
  target.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  // January 4 is always in week 1
  const week1 = new Date(target.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1
  return 1 + Math.round(((target.getTime() - week1.getTime()) / 86400000 - 3 +
    ((week1.getDay() + 6) % 7)) / 7);
}

/** Get quarter (1-4) for a date */
export function getQuarter(date: Date | number | string): number {
  return Math.ceil((toDate(date).getMonth() + 1) / 3);
}

// --- Duration Formatting ---

/** Convert milliseconds to a Duration object */
export function msToDuration(ms: number): Duration {
  const absMs = Math.abs(ms);
  return {
    years: Math.floor(absMs / 31557600000),
    months: Math.floor((absMs % 31557600000) / 2629800000),
    weeks: Math.floor((absMs % 2629800000) / 604800000),
    days: Math.floor((absMs % 604800000) / 86400000),
    hours: Math.floor((absMs % 86400000) / 3600000),
    minutes: Math.floor((absMs % 3600000) / 60000),
    seconds: Math.floor((absMs % 60000) / 1000),
    ms: absMs % 1000,
  };
}

/** Format duration as human-readable string */
export function formatDuration(duration: Duration | number, style: "short" | "long" | "verbose" = "long"): string {
  const dur: Duration = typeof duration === "number" ? msToDuration(duration) : duration;
  const parts: string[] = [];

  const labels: Record<keyof Duration, { short: string; long: string }> = {
    years: { short: "y", long: "yr" },
    months: { short: "mo", long: "mo" },
    weeks: { short: "w", long: "wk" },
    days: { short: "d", long: "day" },
    hours: { short: "h", long: "hr" },
    minutes: { short: "m", long: "min" },
    seconds: { short: "s", long: "sec" },
    ms: { short: "ms", long: "ms" },
  };

  const order: (keyof Duration)[] = ["years", "months", "weeks", "days", "hours", "minutes", "seconds", "ms"];

  for (const key of order) {
    const val = dur[key];
    if (!val && val !== 0) continue;
    if (style === "verbose") parts.push(`${val} ${labels[key].long}${val !== 1 ? "s" : ""}`);
    else parts.push(`${val}${labels[key][style]}`);
  }

  return parts.length > 0 ? parts.join(" ") : "0s";
}

/** Format milliseconds as HH:MM:SS or similar */
export function formatTimeElapsed(ms: number, showMs: boolean = false): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let result = "";

  if (hours > 0) result += `${String(hours).padStart(2, "0")}:`;
  result += `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  if (showMs) result += `.${String(Math.abs(ms) % 1000).padStart(3, "0")}`;

  return ms < 0 ? `-${result}` : result;
}

// --- Time Formatting ---

/** Format just the time portion of a date */
export function formatTime(date: Date | number | string, showSeconds: boolean = false): string {
  const d = toDate(date);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = showSeconds ? `:${String(d.getSeconds()).padStart(2, "0")}` : "";
  return `${String(h).padStart(2, "0")}:${m}${s}`;
}

/** Format as 12-hour time with AM/PM */
export function formatTime12h(date: Date | number | string, showSeconds: boolean = false): string {
  const d = toDate(date);
  const h12 = d.getHours() % 12 || 12;
  const period = d.getHours() >= 12 ? "PM" : "AM";
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = showSeconds ? `:${String(d.getSeconds()).padStart(2, "0")}` : "";
  return `${h12}:${m}${s} ${period}`;
}

// --- Calendar Helpers ---

/** Generate an array of dates for a given month's calendar grid */
export function generateCalendarMonth(year: number, month: number, firstDayOfWeek: number = 0): Array<{ date: Date; isCurrentMonth: boolean }> {
  const result: Array<{ date: Date; isCurrentMonth: boolean }> = [];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInThisMonth = daysInMonth(year, month);
  const daysInPrevMonth = daysInMonth(year, month - 1);

  const startOffset = (firstDay - firstDayOfWeek + 7) % 7;

  // Previous month's trailing days
  for (let i = startOffset - 1; i >= 0; i--) {
    result.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
  }

  // Current month's days
  for (let d = 1; d <= daysInThisMonth; d++) {
    result.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }

  // Next month's leading days (fill to complete last row)
  const remaining = (42 - result.length) % 7 === 0 ? 0 : 7 - (result.length % 7);
  for (let d = 1; d <= remaining; d++) {
    result.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
  }

  return result;
}

/** Get the day name for a given date */
export function getDayName(date: Date | number | string, short: boolean = false): string {
  const idx = toDate(date).getDay();
  return short ? DAY_SHORT[idx] : DAY_NAMES[idx];
}

/** Get the month name for a given date */
export function getMonthName(monthIndex: number, short: boolean = false): string {
  const idx = Math.max(0, Math.min(11, monthIndex));
  return short ? MONTH_SHORT[idx] : MONTH_NAMES[idx];
}

// --- Internal Helpers ---

function toDate(input: Date | number | string): Date {
  if (input instanceof Date) return new Date(input);
  if (typeof input === "number") return new Date(input);
  return parseDate(input);
}

function formatWithPattern(date: Date, pattern: string): string {
  const h = date.getHours();
  const h12 = h % 12 || 12;
  const replacements: Record<string, string> = {
    "yyyy": String(date.getFullYear()),
    "yy": String(date.getFullYear()).slice(-2),
    "MMMM": MONTH_NAMES[date.getMonth()],
    "MMM": MONTH_SHORT[date.getMonth()],
    "MM": String(date.getMonth() + 1).padStart(2, "0"),
    "M": String(date.getMonth() + 1),
    "dddd": DAY_NAMES[date.getDay()],
    "ddd": DAY_SHORT[date.getDay()],
    "dd": String(date.getDate()).padStart(2, "0"),
    "d": String(date.getDate()),
    "HH": String(h).padStart(2, "0"),
    "H": String(h),
    "hh": String(h12).padStart(2, "0"),
    "h": String(h12),
    "mm": String(date.getMinutes()).padStart(2, "0"),
    "m": String(date.getMinutes()),
    "ss": String(date.getSeconds()).padStart(2, "0"),
    "s": String(date.getSeconds()),
    "A": h >= 12 ? "PM" : "AM",
    "a": h >= 12 ? "pm" : "am",
  };

  let result = pattern;
  // Sort by key length descending to replace longer patterns first
  const keys = Object.keys(replacements).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    result = result.replace(new RegExp(key, "g"), replacements[key]);
  }
  return result;
}
