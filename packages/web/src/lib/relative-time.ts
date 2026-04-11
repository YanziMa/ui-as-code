/**
 * Relative Time: Human-readable time formatting ("3 minutes ago",
 * "in 2 hours"), auto-updating relative time display, time ago
 * calculation, and locale-aware formatting.
 */

// --- Types ---

export interface RelativeTimeOptions {
  /** Reference time (default: now) */
  from?: Date;
  /** Locale for formatting (default: system locale) */
  locale?: string;
  /** Show suffix ("ago"/"in")? (default: true) */
  showSuffix?: boolean;
  /** Use abbreviated format? (e.g., "3m" vs "3 minutes") */
  abbreviate?: boolean;
  /** Maximum unit to display ("second" | "minute" | "hour" | "day" | "week" | "month" | "year") */
  maxUnit?: TimeUnit;
}

export type TimeUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";

export interface RelativeTimeResult {
  /** Formatted string (e.g., "3 minutes ago") */
  text: string;
  /** Numeric value */
  value: number;
  /** Unit name */
  unit: TimeUnit;
  /** Whether the time is in the future */
  isFuture: boolean;
  /** Absolute difference in milliseconds */
  diffMs: number;
}

// --- Unit Definitions ---

const UNITS: Array<{ name: TimeUnit; ms: number; short: string; long: string }> = [
  { name: "second", ms: 1000, short: "s", long: "second" },
  { name: "minute", ms: 60000, short: "m", long: "minute" },
  { name: "hour", ms: 3600000, short: "h", long: "hour" },
  { name: "day", ms: 86400000, short: "d", long: "day" },
  { name: "week", ms: 604800000, short: "w", long: "week" },
  { name: "month", ms: 2592000000, short: "mo", long: "month" }, // ~30 days
  { name: "year", ms: 31536000000, short: "y", long: "year" },
];

// --- Core Calculation ---

/** Calculate the relative time between two dates */
export function getRelativeTime(
  date: Date | number | string,
  options: RelativeTimeOptions = {},
): RelativeTimeResult {
  const {
    from = new Date(),
    showSuffix = true,
    abbreviate = false,
    maxUnit,
  } = options;

  const targetDate = date instanceof Date ? date : new Date(date);
  const diffMs = targetDate.getTime() - from.getTime();
  const absDiff = Math.abs(diffMs);
  const isFuture = diffMs > 0;

  // Find appropriate unit
  let unit: typeof UNITS[number] = UNITS[0]!;
  for (let i = UNITS.length - 1; i >= 0; i--) {
    if (absDiff >= UNITS[i]!.ms * 0.9) {
      unit = UNITS[i]!;
      break;
    }
  }

  // Respect maxUnit
  if (maxUnit) {
    const maxIdx = UNITS.findIndex((u) => u.name === maxUnit);
    if (maxIdx >= 0 && UNITS.indexOf(unit) > maxIdx) {
      unit = UNITS[maxIdx]!;
    }
  }

  const value = Math.floor(absDiff / unit.ms);
  const suffix = isFuture
    ? (abbreviate ? "" : "from now")
    : (abbreviate ? "" : "ago");

  // Build text
  let text: string;
  if (abbreviate) {
    text = `${value}${unit.short}`;
  } else {
    const unitLabel = value === 1 ? unit.long : unit.long + "s";
    text = `${value} ${unitLabel}`;
  }

  if (showSuffix && !abbreviate) {
    text += ` ${suffix}`;
  }

  return { text, value, unit: unit.name, isFuture, diffMs };
}

// --- Convenience Formatters ---

/** Format as simple "X units ago/in X units" string */
export function formatRelativeTime(
  date: Date | number | string,
  options?: RelativeTimeOptions,
): string {
  return getRelativeTime(date, options).text;
}

/** Format as compact/short form (e.g., "3m ago", "2h") */
export function formatShort(
  date: Date | number | string,
  options?: Omit<RelativeTimeOptions, "abbreviate">,
): string {
  return getRelativeTime(date, { ...options, abbreviate: true }).text;
}

/** Format with just numeric value and unit (no suffix) */
export function formatNumeric(
  date: Date | number | string,
  options?: Omit<RelativeTimeOptions, "showSuffix">,
): string {
  return getRelativeTime(date, { ...options, showSuffix: false }).text;
}

// --- Auto-Updating Display ---

/** Create an auto-updating relative time element */
export function createAutoUpdatingTime(
  container: HTMLElement | string,
  date: Date | number | string,
  options: RelativeTimeOptions & { updateIntervalMs?: number } = {},
): { destroy: () => void; getElement: () => HTMLElement } {
  const el = typeof container === "string"
    ? document.querySelector<HTMLElement>(container)!
    : container;

  if (!el) throw new Error("AutoUpdatingTime: container not found");

  const interval = options.updateIntervalMs ?? getUpdateInterval(date);
  let timerId: ReturnType<typeof setInterval> | null = null;

  function update(): void {
    el.textContent = formatRelativeTime(date, options);
  }

  update();

  if (interval > 0) {
    timerId = setInterval(update, interval);
  }

  return {
    destroy(): void => {
      if (timerId !== null) clearInterval(timerId);
    },
    getElement(): HTMLElement { return el; },
  };
}

/** Determine how often to update based on time distance */
function getUpdateInterval(date: Date | number | string): number {
  const result = getRelativeTime(date);
  switch (result.unit) {
    case "second": return 1000; // Every second
    case "minute": return 15000; // Every 15 seconds
    case "hour": return 60000; // Every minute
    case "day": return 300000; // Every 5 minutes
    default: return 3600000; // Every hour
  }
}

// --- Time Ago / Time In Future ---

/** Get "X time ago" string */
export function timeAgo(date: Date | number | string, options?: Omit<RelativeTimeOptions, "showSuffix">): string {
  const pastDate = new Date(date);
  // Ensure it's in the past
  if (pastDate.getTime() > Date.now()) {
    return formatRelativeTime(new Date(), { ...options, showSuffix: true });
  }
  return formatRelativeTime(pastDate, { ...options, showSuffix: true });
}

/** Get "in X time" string for future dates */
export function timeInFuture(date: Date | number | string, options?: Omit<RelativeTimeOptions, "showSuffix">): string {
  return formatRelativeTime(date, { ...options, showSuffix: true });
}

// --- Duration Formatting ---

/** Format a duration in milliseconds to human-readable string */
export function formatDuration(ms: number, abbreviate = false): string {
  if (ms < 0) ms = 0;

  if (ms < 1000) return `${Math.round(ms)}${abbreviate ? "ms" : " milliseconds"}`;

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}${abbreviate ? "s" : " seconds"}`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const secs = seconds % 60;
    return secs > 0
      ? `${minutes}${abbreviate ? "m" : "min"} ${secs}s`
      : `${minutes}${abbreviate ? "m" : " minutes"}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const mins = minutes % 60;
    return mins > 0
      ? `${hours}${abbreviate ? "h" : "hr"} ${mins}m`
      : `${hours}${abbreviate ? "h" : " hours"}`;
  }

  const days = Math.floor(hours / 24);
  const hrs = hours % 24;
  return hrs > 0
    ? `${days}d ${hrs}h`
    : `${days}${abbreviate ? "" : " days"}`;
}
