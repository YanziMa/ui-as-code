/**
 * Advanced formatting utilities for data display.
 */

/** Format a file size with appropriate unit */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  // Show up to 1 decimal place, but drop .0
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[i]}`;
}

/** Format a duration in ms to human-readable string */
export function formatDurationHuman(ms: number): string {
  if (ms < 0) ms = 0;

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  if (seconds > 0) return `${seconds}s`;
  return `${ms}ms`;
}

/** Format a number as an ordinal (1st, 2nd, 3rd, 4th, etc.) */
export function formatOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Format a list as natural language ("A, B and C") */
export function formatListNatural(items: string[], conjunction = "and"): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return items.join(` ${conjunction} `);
  return [...items.slice(0, -1).join(", "), items[items.length - 1]].join(`, ${conjunction} `);
}

/** Truncate text with ellipsis in the middle (for long IDs/paths) */
export function truncateId(id: string, startLen = 6, endLen = 4): string {
  if (id.length <= startLen + endLen + 3) return id;
  return `${id.slice(0, startLen)}...${id.slice(-endLen)}`;
}

/** Format a percentage change with +/- prefix */
export function formatChange(value: number, decimals = 1): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/** Format a ratio as "X / Y" or "X of Y" */
export function formatRatio(part: number, total: number, label?: string): string {
  const pct = total > 0 ? ((part / total) * 100).toFixed(1) : "0";
  if (label) return `${part.toLocaleString()} ${label} of ${total.toLocaleString()} (${pct}%)`;
  return `${part.toLocaleString()} / ${total.toLocaleString()} (${pct}%)`;
}

/** Format a phone number (basic US/Intl formatting) */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone; // Return as-is for international numbers
}

/** Format credit card number (show last 4) */
export function maskCardNumber(card: string): string {
  const cleaned = card.replace(/\s/g, "");
  if (cleaned.length < 8) return "****";
  return `****-****-****-${cleaned.slice(-4)}`;
}

/** Format an address object to multi-line string */
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export function formatAddress(addr: Address, separator = "\n"): string {
  const parts = [
    addr.street,
    [addr.city, addr.state].filter(Boolean).join(", "),
    addr.postalCode,
    addr.country,
  ].filter(Boolean);

  return parts.join(separator);
}

/** Format a version number with optional prefix */
export function formatVersion(version: string, prefix = "v"): string {
  const cleaned = version.replace(/^v/i, "");
  return `${prefix}${cleaned}`;
}

/** Format a diff stat line like "+12 -3" */
export function formatDiffStats(added: number, removed: number): string {
  const parts: string[] = [];
  if (added > 0) parts.push(`+${added}`);
  if (removed > 0) parts.push(`-${removed}`);
  if (parts.length === 0) return "no changes";
  return parts.join(" ");
}
