/**
 * Formatting utilities for display.
 */

/** Format number with commas (e.g., 1,234) */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

/** Format bytes as human-readable (e.g., 1.2 MB) */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/** Format duration in ms to human-readable (e.g., "2.5s", "1m 30s") */
export function formatDuration(ms: number): string {
  if (ms < 1000) return ms + "ms";
  if (ms < 60_000) return (ms / 1000).toFixed(1) + "s";
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  if (minutes < 60) return seconds > 0 ? minutes + "m " + seconds + "s" : minutes + "m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? hours + "h " + mins + "m" : hours + "h";
}

/** Format date as ISO-like but readable */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format percentage */
export function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return ((value / total) * 100).toFixed(1) + "%";
}
