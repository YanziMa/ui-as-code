/**
 * Time utilities: advanced date/time manipulation, duration parsing/formatting,
 * cron-like scheduling, countdown/stopwatch, rate limiting, debounce/throttle,
 * timezone helpers, and calendar arithmetic.
 */

// --- Duration Parsing & Formatting ---

export interface ParsedDuration {
  milliseconds: number;
  seconds: number;
  minutes: number;
  hours: days: number;
  weeks: number;
  months: number; // Approximate (30 days)
  years: number;  // Approximate (365 days)
  totalMs: number;
}

/** Parse a human-readable duration string like "2h 30m", "1d 4h", "500ms" */
export function parseDuration(str: string): ParsedDuration {
  const result: ParsedDuration = {
    milliseconds: 0, seconds: 0, minutes: 0,
    hours: 0, days: 0, weeks: 0, months: 0, years: 0,
    totalMs: 0,
  };

  const patterns: Array<[RegExp, keyof ParsedDuration, number]> = [
    [/(\d+)\s*ms/i, "milliseconds", 1],
    [/(\d+)\s*s(?:ec(?:ond)?s?)?/i, "seconds", 1000],
    [/(\d+)\s*m(?:in(?:ute)?s?)?/i, "minutes", 60_000],
    [/(\d+)\s*h(?:ours?)?/i, "hours", 3_600_000],
    [/(\d+)\s*d(?:ays?)?/i, "days", 86_400_000],
    [/(\d+)\s*w(?:eeks?)?/i, "weeks", 604_800_000],
    [/(\d)\s*mo(?:nths?)?/i, "months", 2_592_000_000], // ~30 days
    [/(\d+)\s*y(?:ears?)?/i, "years", 31_536_000_000], // ~365 days
  ];

  for (const [pattern, key, multiplier] of patterns) {
    const match = str.match(pattern);
    if (match) {
      const val = parseInt(match[1]!, 10);
      (result as Record<string, number>)[key] = val;
      result.totalMs += val * multiplier;
    }
  }

  // If no pattern matched, try parsing as plain number (assumed ms)
  if (result.totalMs === 0) {
    const num = parseFloat(str);
    if (!isNaN(num)) result.totalMs = num;
  }

  return result;
}

/** Format milliseconds into human-readable duration */
export function formatDuration(ms: number, options?: { maxParts?: number; short?: boolean }): string {
  const { maxParts = 3, short = false } = options ?? {};
  const absMs = Math.abs(ms);
  const isNegative = ms < 0;

  const units: Array<[number, string, string]> = [
    [31_536_000_000, "year", "y"],
    [2_592_000_000, "month", "mo"],
    [604_800_000, "week", "w"],
    [86_400_000, "day", "d"],
    [3_600_000, "hour", "h"],
    [60_000, "minute", "m"],
    [1000, "second", "s"],
    [1, "ms", "ms"],
  ];

  const parts: string[] = [];
  let remaining = Math.round(absMs);

  for (const [sizeMs, longLabel, shortLabel] of units) {
    if (remaining >= sizeMs && parts.length < maxParts) {
      const count = Math.floor(remaining / sizeMs);
      parts.push(short ? `${count}${shortLabel}` : `${count} ${longLabel}${count !== 1 ? "s" : ""}`);
      remaining %= sizeMs;
    }
  }

  if (parts.length === 0) parts.push("0ms");

  return isNegative ? `-${parts.join(" ")}` : parts.join(" ");
}

/** Format duration as compact string (e.g., "2:30:15") */
export function formatDurationCompact(ms: number): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// --- Countdown Timer ---

export interface CountdownOptions {
  /** Callback every tick (default interval: 1000ms) */
  onTick?: (remaining: number) => void;
  /** Callback when countdown reaches zero */
  onComplete?: () => void;
  /** Tick interval in ms */
  interval?: number;
  /** Auto-start? */
  autoStart?: boolean;
}

export class CountdownTimer {
  private endTime: number;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private _remaining: number;
  private options: Required<Pick<CountdownOptions, "interval">> & Omit<CountdownOptions, "interval">;
  private _running = false;

  constructor(durationMs: number, options: CountdownOptions = {}) {
    this._remaining = durationMs;
    this.endTime = Date.now() + durationMs;
    this.options = {
      onTick: options.onTick,
      onComplete: options.onComplete,
      interval: options.interval ?? 1000,
      autoStart: options.autoStart ?? true,
    };

    if (this.options.autoStart) this.start();
  }

  get remaining(): number { return this._remaining; }
  get running(): boolean { return this._running; }
  get progress(): number { return 1 - this._remaining / (this.endTime - this._remaining + Date.now() - Date.now()); } // Simplified

  start(): void {
    if (this._running) return;
    this._running = true;
    this.endTime = Date.now() + this._remaining;
    this.timerId = setInterval(() => this.tick(), this.options.interval);
  }

  pause(): void {
    if (!this._running) return;
    this._running = false;
    if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
  }

  reset(newDuration?: number): void {
    this.pause();
    this._remaining = newDuration ?? (this.endTime - Date.now());
    if (this._remaining < 0) this._remaining = 0;
  }

  addTime(ms: number): void { this._remaining += ms; }
  subtractTime(ms: number): void { this._remaining = Math.max(0, this._remaining - ms); }

  destroy(): void { this.reset(); }

  private tick(): void {
    this._remaining = Math.max(0, this.endTime - Date.now());
    this.options.onTick?.(this._remaining);
    if (this._remaining <= 0) {
      this.pause();
      this.options.onComplete?.();
    }
  }
}

// --- Stopwatch ---

export interface StopwatchLap {
  lapNumber: number;
  time: number;       // Absolute time at lap
  split: number;      // Duration since last lap
  total: number;      // Total elapsed time
}

export class Stopwatch {
  private startTime: number | null = null;
  private accumulated = 0;
  private laps: StopwatchLap[] = [];
  private lastLapTime: number | null = null;
  private _running = false;

  get running(): boolean { return this._running; }
  get elapsed(): number {
    if (!this.startTime) return this.accumulated;
    return this.accumulated + (Date.now() - this.startTime);
  }

  get lapCount(): number { return this.laps.length; }
  get lastLap(): StopwatchLap | undefined { return this.laps[this.laps.length - 1]; }

  start(): void {
    if (this._running) return;
    this._running = true;
    this.startTime = Date.now();
  }

  stop(): number {
    if (!this._running) return this.elapsed;
    this._running = false;
    this.accumulated += Date.now() - (this.startTime ?? 0);
    this.startTime = null;
    return this.elapsed;
  }

  reset(): void {
    this.stop();
    this.accumulated = 0;
    this.laps = [];
    this.lastLapTime = null;
  }

  lap(): StopwatchLap {
    const now = this.elapsed;
    const split = this.lastLapTime !== null ? now - this.lastLapTime : now;
    const lapEntry: StopwatchLap = {
      lapNumber: this.laps.length + 1,
      time: now,
      split,
      total: now,
    };
    this.laps.push(lapEntry);
    this.lastLapTime = now;
    return lapEntry;
  }

  getLaps(): StopwatchLap[] { return [...this.laps]; }
  clearLaps(): void { this.laps = []; this.lastLapTime = null; }
}

// --- Rate Limiter ---

export interface RateLimitResult {
  allowed: boolean;
  waitTime: number;   // Ms until next request is allowed
  remaining: number;  // Requests remaining in window
  resetAt: number;    // Timestamp when window resets
}

/**
 * Token bucket rate limiter.
 * Allows burst requests up to capacity, then refills at a steady rate.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxRequests: number,
    private windowMs: number,
    initialTokens?: number,
  ) {
    this.tokens = initialTokens ?? maxRequests;
    this.lastRefill = Date.now();
  }

  tryAcquire(count = 1): RateLimitResult {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return {
        allowed: true,
        waitTime: 0,
        remaining: Math.floor(this.tokens),
        resetAt: this.lastRefill + this.windowMs,
      };
    }

    const deficit = count - this.tokens;
    const waitTime = Math.ceil((deficit / this.maxRequests) * this.windowMs);

    return {
      allowed: false,
      waitTime,
      remaining: 0,
      resetAt: this.lastRefill + this.windowMs,
    };
  }

  acquire(count = 1): Promise<void> {
    const result = this.tryAcquire(count);
    if (result.allowed) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, result.waitTime));
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / this.windowMs) * this.maxRequests;
    this.tokens = Math.min(this.maxRequests, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  get availableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  reset(): void {
    this.tokens = this.maxRequests;
    this.lastRefill = Date.now();
  }
}

/** Fixed-window rate limiter (simpler, resets at fixed intervals) */
export class FixedWindowRateLimiter {
  private count = 0;
  private windowStart = Date.now();

  constructor(private maxRequests: number, private windowMs: number) {}

  tryAcquire(): RateLimitResult {
    const now = Date.now();

    // Reset window if expired
    if (now - this.windowStart >= this.windowMs) {
      this.count = 0;
      this.windowStart = now;
    }

    if (this.count < this.maxRequests) {
      this.count++;
      return {
        allowed: true,
        waitTime: 0,
        remaining: this.maxRequests - this.count,
        resetAt: this.windowStart + this.windowMs,
      };
    }

    return {
      allowed: false,
      waitTime: this.windowStart + this.windowMs - now,
      remaining: 0,
      resetAt: this.windowStart + this.windowMs,
    };
  }

  reset(): void { this.count = 0; this.windowStart = Date.now(); }
}

// --- Debounce & Throttle (time-based) ---

/** Debounce: delay execution until after wait ms of silence */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  waitMs: number,
  options?: { leading?: boolean; trailing?: boolean },
): (...args: Parameters<T>) => void {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  const { leading = false, trailing = true } = options ?? {};

  function debounced(...args: Parameters<T>): void {
    lastArgs = args;

    if (leading && !timerId) {
      fn(...args);
    }

    if (timerId) clearTimeout(timerId);

    timerId = setTimeout(() => {
      if (trailing && lastArgs) fn(...lastArgs);
      timerId = null;
      lastArgs = null;
    }, waitMs);
  }

  debounced.cancel = () => {
    if (timerId) { clearTimeout(timerId); timerId = null; }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timerId && lastArgs) {
      clearTimeout(timerId);
      fn(...lastArgs);
      timerId = null;
      lastArgs = null;
    }
  };

  return debounced as unknown as (...args: Parameters<T>) => void;
}

/** Throttle: execute at most once per interval */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  intervalMs: number,
  options?: { leading?: boolean; trailing?: boolean },
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  const { leading = true, trailing = true } = options ?? {};

  function throttled(...args: Parameters<T>): void {
    const now = Date.now();
    lastArgs = args;

    if (leading && now - lastCall >= intervalMs) {
      lastCall = now;
      fn(...args);
      return;
    }

    if (trailing && !timerId) {
      timerId = setTimeout(() => {
        lastCall = Date.now();
        if (lastArgs) fn(...lastArgs);
        timerId = null;
        lastArgs = null;
      }, intervalMs - (now - lastCall));
    }
  }

  throttled.cancel = () => {
    if (timerId) { clearTimeout(timerId); timerId = null; }
    lastArgs = null;
  };

  return throttled as unknown as (...args: Parameters<T>) => void;
}

// --- Calendar & Date Arithmetic ---

/** Add/subtract time units from a date */
export function addTime(date: Date, amount: number, unit: "years" | "months" | "weeks" | "days" | "hours" | "minutes" | "seconds" | "milliseconds"): Date {
  const d = new Date(date.getTime());
  switch (unit) {
    case "years": d.setFullYear(d.getFullYear() + amount); break;
    case "months": d.setMonth(d.getMonth() + amount); break;
    case "weeks": d.setDate(d.getDate() + amount * 7); break;
    case "days": d.setDate(d.getDate() + amount); break;
    case "hours": d.setHours(d.getHours() + amount); break;
    case "minutes": d.setMinutes(d.getMinutes() + amount); break;
    case "seconds": d.setSeconds(d.getSeconds() + amount); break;
    case "milliseconds": d.setMilliseconds(d.getMilliseconds() + amount); break;
  }
  return d;
}

/** Get the difference between two dates in specified units */
export function diffDates(a: Date, b: Date, unit: "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "weeks" | "months" | "years" = "milliseconds"): number {
  const diffMs = b.getTime() - a.getTime();
  switch (unit) {
    case "milliseconds": return diffMs;
    case "seconds": return Math.floor(diffMs / 1000);
    case "minutes": return Math.floor(diffMs / 60_000);
    case "hours": return Math.floor(diffMs / 3_600_000);
    case "days": return Math.floor(diffMs / 86_400_000);
    case "weeks": return Math.floor(diffMs / 604_800_000);
    case "months":
      const monthDiff = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) - (b.getDate() < a.getDate() ? 1 : 0);
      return monthDiff;
    case "years":
      return b.getFullYear() - a.getFullYear() -
        ((b.getMonth() < a.getMonth() || (b.getMonth() === a.getMonth() && b.getDate() < a.getDate())) ? 1 : 0);
  }
}

/** Check if two dates are the same day */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

/** Check if a date is today */
export function isToday(date: Date): boolean { return isSameDay(date, new Date()); }

/** Check if a date is yesterday */
export function isYesterday(date: Date): boolean {
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

/** Check if a date is tomorrow */
export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
}

/** Get the day of year (1-366) */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

/** Get week number in year (ISO 8601) */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** Get quarter of year (1-4) */
export function getQuarter(date: Date): number { return Math.floor(date.getMonth() / 3) + 1; }

/** Get start of day (00:00:00.000) */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get end of day (23:59:59.999) */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Get start of week (Monday or Sunday based on locale) */
export function startOfWeek(date: Date, startOnMonday = true): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = startOnMonday ? (day === 0 ? -6 : 1 - day) : -day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get end of week */
export function endOfWeek(date: Date, startOnMonday = true): Date {
  const start = startOfWeek(date, startOnMonday);
  return addTime(start, 6, "days");
}

/** Get start of month */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/** Get end of month */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** Get number of days in month */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Check if a year is a leap year */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/** Generate array of dates for a given month */
export function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const numDays = daysInMonth(year, month);
  for (let d = 1; d <= numDays; d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

/** Format date range for display (e.g., "Jan 1 - 5, 2024" or "Dec 28 - Jan 3, 2025") */
export function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const fmtYear = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric" });

  if (isSameDay(start, end)) return fmt(start);

  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth && sameYear) {
    return `${fmt(start)} - ${end.getDate()}, ${fmtYear(end)}`;
  }
  if (sameYear) {
    return `${fmt(start)} - ${fmt(end)}, ${fmtYear(end)}`;
  }
  return `${fmt(start)}, ${fmtYear(start)} - ${fmt(end)}, ${fmtYear(end)}`;
}

// --- Timezone Helpers ---

/** Get the user's IANA timezone identifier */
export function getUserTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
  catch { return "UTC"; }
}

/** Get timezone offset in minutes for a given timezone */
export function getTimezoneOffset(timezone: string, date = new Date()): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const parts = formatter.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";

    const tzDate = new Date(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`);
    return (date.getTime() - tzDate.getTime()) / (60 * 1000);
  } catch {
    return 0;
  }
}

/** Convert date to another timezone's formatted string */
export function toTimezone(date: Date, timezone: string, format?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleString("en-US", { ...format, timeZone: timezone });
}

/** List common timezone abbreviations with offsets */
export const TIMEZONE_ALIASES: Record<string, string> = {
  UTC: "UTC",
  GMT: "Europe/London",
  EST: "America/New_York",
  EDT: "America/New_York",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  MST: "America/Denver",
  MDT: "America/Denver",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  JST: "Asia/Tokyo",
  CST_CHINA: "Asia/Shanghai",
  IST: "Asia/Kolkata",
  CET: "Europe/Paris",
  BST: "Europe/London",
  AEST: "Australia/Sydney",
  AEDT: "Australia/Sydney",
};

// --- Scheduling Helpers ---

/** Schedule a callback to run at a specific future time */
export function scheduleAt(timestamp: number, callback: () => void): () => void {
  const delay = timestamp - Date.now();
  if (delay <= 0) { callback(); return () => {}; }
  const id = setTimeout(callback, delay);
  return () => clearTimeout(id);
}

/** Run a callback at regular intervals with ability to pause/resume */
export class IntervalScheduler {
  private timerId: ReturnType<typeof setInterval> | null = null;
  private pausedAt: number | null = null;
  private _paused = false;
  private elapsedSinceLastTick = 0;

  constructor(
    private callback: () => void,
    private intervalMs: number,
    options?: { immediate?: boolean },
  ) {
    if (options?.immediate) {
      callback();
    }
    this.start();
  }

  get paused(): boolean { return this._paused; }

  start(): void {
    if (this.timerId) return;
    this._paused = false;
    this.timerId = setInterval(() => this.callback(), this.intervalMs);
  }

  pause(): void {
    if (!this.timerId || this._paused) return;
    clearInterval(this.timerId);
    this.timerId = null;
    this._paused = true;
    this.pausedAt = Date.now();
  }

  resume(): void {
    if (!this._paused) return;
    this._paused = false;
    this.pausedAt = null;
    this.start();
  }

  changeInterval(newIntervalMs: number): void {
    this.intervalMs = newIntervalMs;
    if (this.timerId && !this._paused) {
      clearInterval(this.timerId);
      this.start();
    }
  }

  destroy(): void {
    if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
    this._paused = false;
  }
}
