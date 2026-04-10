/**
 * Formatting utilities: number/currency/date formatting, relative time, file sizes,
 * pluralization, byte units, and internationalized display helpers.
 */

// --- Number Formatting ---

/** Format a number with commas as thousands separator */
export function formatNumber(value: number, options?: { decimals?: number; locale?: string }): string {
  return value.toLocaleString(options?.locale ?? "en-US", {
    minimumFractionDigits: options?.decimals,
    maximumFractionDigits: options?.decimals ?? 0,
  });
}

/** Format as currency */
export function formatCurrency(
  amount: number,
  currency = "USD",
  options?: { locale?: string; style?: "symbol" | "code" | "name" },
): string {
  return amount.toLocaleString(options?.locale ?? "en-US", {
    style: options?.style ?? "symbol",
    currency,
  });
}

/** Format as percentage */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Compact large numbers (1000 → 1K, 1000000 → 1M) */
export function compactNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

// --- Date/Time Formatting ---

export type RelativeTimeStyle = "short" | "long" | "numeric";

/** Format a date to locale string */
export function formatDate(date: Date | number | string, options?: Intl.DateTimeFormatOptions & { locale?: string }): string {
  const d = typeof date === "string" ? new Date(date) : typeof date === "number" ? new Date(date) : date;
  return d.toLocaleDateString(options?.locale ?? "en-US", options as Intl.DateTimeFormatOptions);
}

/** Format a time to locale string */
export function formatTime(date: Date | number | string, options?: Intl.DateTimeFormatOptions & { locale?: string; hour12?: boolean }): string {
  const d = typeof date === "string" ? new Date(date) : typeof date === "number" ? new Date(date) : date;
  return d.toLocaleTimeString(options?.locale ?? "en-US", {
    hour12: options?.hour12 ?? false,
    ...options as Intl.DateTimeFormatOptions,
  });
}

/** Format as relative time (e.g., "2 hours ago") */
export function formatRelativeTime(date: Date | number | string, style: RelativeTimeStyle = "long"): string {
  const d = typeof date === "string" ? new Date(date) : typeof date === "number" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: style === "numeric" ? "always" : "auto" });

  try { return rtf.format(d, { numeric: "auto" }); }
  catch { return fallbackRelative(diffSec); }
}

function fallbackRelative(seconds: number): string {
  const absSec = Math.abs(seconds);
  if (absSec < 60) return "just now";
  if (absSec < 3600) return `${Math.floor(absSec / 60)} minutes ago`;
  if (absSec < 86400) return `${Math.floor(absSec / 3600)} hours ago`;
  if (absSec < 604800) return `${Math.floor(absSec / 86400)} days ago`;
  return formatDate(d);
}

/** Format as ISO 8601 string */
export function formatISO(date: Date | number | string): string {
  const d = typeof date === "string" ? new Date(date) : typeof date === "number" ? new Date(date) : date;
  return d.toISOString();
}

/** Format as local datetime string */
export function formatDateTime(date: Date | number | string, options?: { locale?: string }): string {
  const d = typeof date === "string" ? new Date(date) : typeof date === "number" ? new Date(date) : date;
  return d.toLocaleString(options?.locale ?? "en-US");
}

// --- File Size Formatting ---

/** Format bytes into human-readable size (B, KB, MB, GB, TB) */
export function formatFileSize(bytes: number, precision = 2): string {
  if (bytes === 0) return "0 B";
  const units = [
    { label: "TB", size: 1024 ** 4 },
    { label: "GB", size: 1024 ** 3 },
    { label: "MB", size: 1024 ** 2 },
    { label: "KB", size: 1024 },
    { label: "B", size: 1 },
  ];
  for (const unit of units) {
    if (bytes >= unit.size) {
      return `${(bytes / unit.size).toFixed(precision)} ${unit.label}`;
    }
  }
  return `${bytes} B`;
}

/** Format bits into human-readable size */
export function formatBitSize(bits: number, precision = 2): string {
  return formatFileSize(Math.ceil(bits / 8), precision);
}

// --- Duration Formatting ---

/** Format milliseconds into human-readable duration */
export function formatDuration(ms: number, options?: { maxParts?: number; style?: "short" | "long" }): string {
  const absMs = Math.abs(ms);
  const isNegative = ms < 0;

  const parts: string[] = [];
  let remaining = Math.round(absMs);

  const maxParts = options?.maxParts ?? 4;

  if (remaining >= 86400000) {
    const days = Math.floor(remaining / 86400000);
    parts.push(`${days}d`);
    remaining %= 86400000;
  }
  if (remaining >= 3600000 && parts.length < maxParts) {
    const hours = Math.floor(remaining / 3600000);
    parts.push(`${hours}h`);
    remaining %= 3600000;
  }
  if (remaining >= 60000 && parts.length < maxParts) {
    const mins = Math.floor(remaining / 60000);
    parts.push(`${mins}m`);
    remaining %= 60000;
  }
  if (remaining >= 1000 && parts.length < maxParts) {
    const secs = Math.floor(remaining / 1000);
    parts.push(`${secs}s`);
    remaining %= 1000;
  }
  if (remaining > 0 && parts.length < maxParts) {
    parts.push(`${remaining}ms`);
  }

  let result = parts.join(" ") || "0ms";
  if (isNegative) result = `-${result}`;
  return result;
}

// --- Pluralization ---

/** Simple English pluralizer */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/** Get ordinal suffix (1st, 2nd, 3rd, etc.) */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[0]}`;
}

// --- Byte Utilities ---

/** Convert bytes to human-readable unit */
export function bytesForHuman(bytes: number): string {
  return formatFileSize(bytes);
}

/** Parse a size string like "5MB" back to bytes */
export function parseSizeString(size: string): number {
  const match = size.trim().match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = (match[2] ?? "B").toUpperCase();
  const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
  return num * (multipliers[unit] ?? 1);
}

// --- Masking ---

/** Mask a string for display (e.g., credit card: ****-****-****-1234) */
export function maskString(str: string, visibleChars = 4, maskChar = "*"): string {
  if (str.length <= visibleChars) return str;
  return str.slice(0, visibleChars) + maskChar.repeat(str.length - visibleChars);
}

/** Mask an email address */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return maskString(email);
  return `${maskString(local, 2)}@${domain}`;
}

/** Mask a phone number */
export function maskPhone(phone: string, visibleStart = 3, visibleEnd = 4): string {
  if (phone.length <= visibleStart + visibleEnd) return phone;
  return phone.slice(0, visibleStart) + "*".repeat(phone.length - visibleStart - visibleEnd) + phone.slice(-visibleEnd);
}
