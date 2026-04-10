/**
 * Number utilities.
 */

/** Round to N decimal places */
export function round(num: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/** Clamp number between min and max */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

/** Linear interpolation between a and b */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Map value from one range to another */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

/** Format bytes with appropriate unit */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i];
}

/** Format large numbers with K/M/B suffixes */
export function formatCompact(num: number): string {
  const abs = Math.abs(num);
  if (abs >= 1e9) return (num / 1e9).toFixed(1) + "B";
  if (abs >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (abs >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return num.toString();
}

/** Percentage of part relative to total */
export function percentOf(part: number, total: number, decimals: number = 1): number {
  if (total === 0) return 0;
  return round((part / total) * 100, decimals);
}

/** Generate random integer in range [min, max] */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Check if number is within epsilon of target */
export function approximately(a: number, b: number, epsilon: number = 0.0001): boolean {
  return Math.abs(a - b) < epsilon;
}

/** Parse a numeric string safely (returns fallback on NaN) */
export function parseNumber(str: string, fallback: number = 0): number {
  const n = parseFloat(str);
  return isNaN(n) ? fallback : n;
}
