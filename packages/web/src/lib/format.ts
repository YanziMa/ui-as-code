/**
 * Formatting utilities: number, date, currency, file size, relative time,
 * pluralization, and string templating with locale awareness.
 */

// --- Number Formatting ---

/** Format a number with commas (e.g., 1234 → "1,234") */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/** Format as currency */
export function formatCurrency(
  value: number,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency,
    currency,
  }).format(value);
}

/** Format as percentage */
export function formatPercent(
  value: number,
  decimals = 1,
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/** Format bytes to human-readable size */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, units.length - 1);

  return `${(bytes / Math.pow(k, idx)).toFixed(decimals)} ${units[idx]}`;
}

/** Format large numbers with abbreviations (1.2K, 3.5M, etc.) */
export function formatCompact(value: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

// --- Date/Time Formatting ---

export interface DateFormatOptions {
  /** Date style: 'full', 'long', 'medium', 'short' */
  dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
  /** Time style */
  timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
  /** Custom pattern (not all locales support this) */
  pattern?: string;
  /** Locale (default: auto-detect or en-US) */
  locale?: string;
}

/** Format a date/time */
export function formatDate(
  value: Date | string | number,
  options: DateFormatOptions = {},
): string {
  const date = value instanceof Date ? value : new Date(value);

  if (options.pattern) {
    try {
      return new Intl.DateTimeFormat(options.locale ?? undefined, {
        // @ts-expect-error — pattern is valid in some implementations
        pattern: options.pattern,
      } as any).format(date);
    } catch {
      // Fallback
    }
  }

  return new Intl.DateTimeFormat(options.locale, {
    dateStyle: options.dateStyle ?? "medium",
    timeStyle: options.timeStyle,
  } as Intl.DateTimeFormatOptions).format(date);
}

/** Format as relative time (e.g., "3 minutes ago") */
export function formatRelativeTime(
  value: Date | string | number,
  locale = "en-US",
): string {
  const now = Date.now();
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absSec < 60) return rtf.format(-diffSec, "second");
  if (absSec < 3600) return rtf.format(-Math.floor(diffSec / 60), "minute");
  if (absSec < 86400) return rtf.format(-Math.floor(diffSec / 3600), "hour");
  if (absSec < 2592000) return rtf.format(-Math.floor(diffSec / 86400), "day");
  if (absSec < 31536000) return rtf.format(-Math.floor(diffSec / 2592000), "month");
  return rtf.format(-Math.floor(diffSec / 31536000), "year");
}

/** Format as ISO date string (YYYY-MM-DD) */
export function formatIsoDate(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split("T")[0]!;
}

/** Format as time only (HH:mm:ss or HH:mm) */
export function formatTime(
  value: Date | string | number,
  withSeconds = false,
  locale = "en-US",
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: false,
  }).format(date);
}

/** Format duration in ms to human-readable string */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;

  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000) % 24;
  const days = Math.floor(ms / 86400000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}

// --- String Formatting ---

/**
 * Simple template engine using {{key}} syntax.
 * Supports nested property access via dot notation.
 *
 * @example
 * template("Hello {{name}}, you have {{count}} messages", { name: "Alice", count: 5 })
 * → "Hello Alice, you have 5 messages"
 */
export function template(str: string, data: Record<string, unknown>): string {
  return str.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, keyPath) => {
    const value = resolvePath(data, keyPath);
    return value != null ? String(value) : _match;
  });
}

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/** Pluralize a word based on count */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/** Truncate text to max length with ellipsis */
export function truncate(text: string, maxLength: number, suffix = "..."): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/** Capitalize first letter */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Convert to title case (each word capitalized) */
export function titleCase(text: string): string {
  return text.replace(/\b\w+/g, (word) => capitalize(word));
}

/** Kebab-case: "helloWorld" → "hello-world" */
export function kebabCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/** Snake_case: "helloWorld" → "hello_world" */
export function snakeCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

/** CamelCase: "hello-world" → "helloWorld" */
export function camelCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[-_\s]+(.)?/g, (_, c) => c.toUpperCase());
}

/** Mask sensitive data (e.g., credit card: ****-****-1234) */
export function maskString(value: string, visibleChars = 4, maskChar = "*"): string {
  if (value.length <= visibleChars) return value;
  const start = value.slice(0, visibleChars - Math.ceil(visibleChars / 2));
  const end = value.slice(-Math.floor(visibleChars / 2));
  const maskedLen = value.length - start.length - end.length;
  return start + maskChar.repeat(maskedLen) + end;
}
