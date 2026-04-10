/**
 * Number utilities v2: advanced math, statistics, number formatting,
 * ranges, interpolation, random generation, unit conversions.
 */

// --- Advanced Math ---

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation between two values */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smooth step (Hermite interpolation) */
export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Map value from one range to another */
export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

/** Round to decimal places */
export function roundTo(value: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Round to nearest multiple */
export function roundToMultiple(value: number, multiple: number): number {
  return Math.round(value / multiple) * multiple;
}

/** Round up to nearest multiple */
export function ceilToMultiple(value: number, multiple: number): number {
  return Math.ceil(value / multiple) * multiple;
}

/** Round down to nearest multiple */
export function floorToMultiple(value: number, multiple: number): number {
  return Math.floor(value / multiple) * multiple;
}

/** Check if value is approximately equal to target */
export function approxEqual(a: number, b: number, epsilon = 1e-6): boolean {
  return Math.abs(a - b) < epsilon;
}

/** Check if value is within range (inclusive) */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/** Wrap value within range (modular wrapping) */
export function wrap(value: number, min: number, max: number): number {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

/** Normalize angle to 0-2π or -π to π */
export function normalizeAngle(radians: number): number {
  const TWO_PI = Math.PI * 2;
  return ((radians % TWO_PI) + TWO_PI) % TWO_PI;
}

/** Convert degrees to radians */
export function degToRad(degrees: number): number { return degrees * (Math.PI / 180); }

/** Convert radians to degrees */
export function radToDeg(radians: number): number { return radians * (180 / Math.PI); }

// --- Statistics ---

/** Calculate mean of numbers */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Calculate median */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Calculate mode (most frequent value) */
export function mode(values: number[]): number[] {
  if (values.length === 0) return [];
  const freq = new Map<number, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  const maxFreq = Math.max(...freq.values());
  return Array.from(freq.entries()).filter(([, f]) => f === maxFreq).map(([v]) => v!);
}

/** Calculate variance (population) */
export function variance(values: number[], population = true): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const divisor = population ? values.length : values.length - 1;
  return values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / divisor;
}

/** Calculate standard deviation */
export function stdev(values: number[], population = true): number {
  return Math.sqrt(variance(values, population));
}

/** Calculate percentile */
export function percentile(values: number[], p: number): number {
  if (values.length === 0 || p < 0 || p > 100) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.min(lower + 1, sorted.length - 1);
  if (lower === upper) return sorted[lower]!;
  // Linear interpolation between the two values
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (idx - lower);
}

/** Get quartiles (Q1, Q2/median, Q3) */
export function quartiles(values: number[]): { q1: number; q2: number; q3: number } {
  return { q1: percentile(values, 25), q2: percentile(values, 50), q3: percentile(values, 75) };
}

/** Interquartile range */
export function iqr(values: number[]): number {
  const { q1, q3 } = quartiles(values);
  return q3 - q1;
}

/** Identify outliers using IQR method */
export function findOutliers(values: number[], multiplier = 1.5): { mild: number[]; extreme: number[] } {
  const { q1, q3 } = quartiles(values);
  const range = iqr(values) * multiplier;
  const lower = q1 - range;
  const upper = q3 + range;

  return {
    mild: values.filter((v) => (v < lower || v > upper)),
    extreme: values.filter((v) => (v < q1 - 2 * range || v > q3 + 2 * range)),
  };
}

/** Covariance between two arrays */
export function covariance(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  const mx = mean(x), my = mean(y);
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += (x[i]! - mx) * (y[i]! - my);
  return sum / x.length;
}

/** Pearson correlation coefficient */
export function correlation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  const sx = stdev(x), sy = stdev(y);
  if (sx === 0 || sy === 0) return 0;
  return covariance(x, y) / (sx * sy);
}

// --- Ranges & Intervals ---

export interface NumericRange {
  min: number;
  max: number;
}

/** Check if two ranges overlap */
export function rangesOverlap(a: NumericRange, b: NumericRange): boolean {
  return a.min <= b.max && b.min <= a.max;
}

/** Get intersection of two ranges */
export function rangeIntersection(a: NumericRange, b: NumericRange): NumericRange | null {
  const start = Math.max(a.min, b.min);
  const end = Math.min(a.max, b.max);
  return start <= end ? { min: start, max: end } : null;
}

/** Get union of two ranges */
export function rangeUnion(a: NumericRange, b: NumericRange): NumericRange {
  return { min: Math.min(a.min, b.min), max: Math.max(a.max, b.max) };
}

/** Check if value is in any of the given ranges */
export function inAnyRange(value: number, ranges: NumericRange[]): boolean {
  return ranges.some((r) => value >= r.min && value <= r.max);
}

/** Merge overlapping ranges */
export function mergeRanges(ranges: NumericRange[]): NumericRange[] {
  if (ranges.length <= 1) return [...ranges];
  const sorted = [...ranges].sort((a, b) => a.min - b.min);
  const merged: NumericRange[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const current = merged[merged.length - 1]!;
    const next = sorted[i]!;
    if (next.min <= current.max) {
      current.max = Math.max(current.max, next.max);
    } else {
      merged.push({ ...next });
    }
  }

  return merged;
}

/** Subtract ranges (get parts of A not covered by B) */
export function subtractRanges(base: NumericRange[], remove: NumericRange[]): NumericRange[] {
  let result = [...base];
  for (const r of remove) {
    const newResult: NumericRange[] = [];
    for (const existing of result) {
      if (!rangesOverlap(existing, r)) {
        newResult.push(existing);
      } else {
        if (existing.min < r.min) newResult.push({ min: existing.min, max: r.min });
        if (existing.max > r.max) newResult.push({ min: r.max, max: existing.max });
      }
    }
    result = newResult;
  }
  return result;
}

// --- Random Generation ---

/** Seeded pseudo-random number generator (Mulberry32) */
export class SeededRNG {
  private state: number;

  constructor(seed?: number) {
    this.state = seed ?? Date.now() ^ (Math.random() * 0xffffffff);
  }

  /** Next random float in [0, 1) */
  next(): number {
    this.state |= 0;
    this.state += 0x6D2B79F5;
    let t = Math.imul(this.state ^ (this.state >>> 15), this.state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t ^ (t >>> 19));
    return (t >>> 0) / 4294967295;
  }

  /** Random integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Random float in [min, max) */
  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** Pick random element from array */
  pick<T>(arr: T[]): T | undefined {
    return arr.length > 0 ? arr[this.int(0, arr.length - 1)] : undefined;
  }

  /** Shuffle array in place (Fisher-Yates) */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }

  /** Weighted random pick */
  weightedPick<T>(items: Array<{ item: T; weight: number }>): T | undefined {
    const totalWeight = items.reduce((s, i) => s + i.weight, 0);
    let random = this.float(0, totalWeight);
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) return item.item;
    }
    return items[items.length - 1]?.item;
  }

  /** Generate random string */
  string(length = 16, charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"): string {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += charset[this.int(0, charset.length - 1)];
    }
    return result;
  }

  /** Boolean with probability */
  bool(probability = 0.5): boolean { return this.next() < probability; }
}

/** Global RNG instance (auto-seeded) */
export const rng = new SeededRNG();

/** Convenience: random integer */
export function randInt(min = 0, max = 10): number { return rng.int(min, max); }

/** Convenience: random float */
export function randFloat(min = 0, max = 1): number { return rng.float(min, max); }

/** Convenience: pick random element */
export function randPick<T>(arr: T[]): T | undefined { return rng.pick(arr); }

/** Convenience: shuffle array */
export function shuffle<T>(arr: T[]): T[] { return rng.shuffle([...arr]); }

/** Generate UUID v4 */
export function uuid(): string {
  const hex = () => rng.string(4, "0123456789abcdef");
  return `${hex()}${hex()}-${hex(4)}${"89ab"[randInt(0, 3)]}${hex(4)}-${hex(4)}${"ab"[randInt(0, 3)]}${hex(4)}-${hex()}${hex()}${hex()}`;
}

// --- Number Formatting ---

/** Format number with commas (e.g., 1234567 → "1,234,567") */
export function formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
  try {
    return num.toLocaleString("en-US", options);
  } catch {
    return String(num);
  }
}

/** Format as compact number (e.g., 1500 → "1.5K", 1500000 → "1.5M") */
export function formatCompact(num: number): string {
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return String(Math.round(num));
}

/** Format bytes as human-readable */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i] ?? "B"}`;
}

/** Format percentage */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format currency */
export function formatCurrency(amount: number, currency = "USD", locale = "en-US"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Parse formatted number string back to number */
export function parseFormattedNumber(str: string): number | null {
  const cleaned = str.replace(/[^0-9.\-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

// --- Unit Conversions ---

/** Temperature conversions */
export function celsiusToFahrenheit(c: number): number { return c * 9 / 5 + 32; }
export function fahrenheitToCelsius(f: number): number { return (f - 32) * 5 / 9; }
export function celsiusToKelvin(c: number): number { return c + 273.15; }
export function kelvinToCelsius(k: number): number { return k - 273.15; }

/** Length conversions (meters base) */
export function metersToFeet(m: number): number { return m * 3.28084; }
export function feetToMeters(ft: number): number { return ft / 3.28084; }
export function metersToMiles(m: number): number { return m * 0.000621371; }
export function milesToMeters(mi: number): number { return mi / 0.000621371; }
export function kmToMiles(km: number): number { return km * 0.621371; }
export function milesToKm(mi: number): number { return mi * 1.60934; }

/** Weight conversions (kg base) */
export function kgToPounds(kg: number): number { return kg * 2.20462; }
export function poundsToKg(lb: number): number { return lb / 2.20462; }

/** Time conversions */
export function msToSeconds(ms: number): number { return ms / 1000; }
export function secondsToMs(s: number): number { return s * 1000; }
export function minutesToMs(min: number): number { return min * 60000; }
export function hoursToMs(h: number): number { return h * 3600000; }
export function daysToMs(d: number): number { return d * 86400000; }
export function msToReadable(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}
