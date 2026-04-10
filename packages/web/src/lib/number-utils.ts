/**
 * Advanced number formatting and calculation utilities.
 */

/** Clamp a number between min and max */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation between two values */
export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * clampNumber(t, 0, 1);
}

/** Map a value from one range to another */
export function mapRangeNumber(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

/** Round to specified decimal places */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Round to nearest multiple */
export function roundToMultiple(value: number, multiple: number): number {
  return Math.round(value / multiple) * multiple;
}

/** Floor to nearest multiple */
export function floorToMultiple(value: number, multiple: number): number {
  return Math.floor(value / multiple) * multiple;
}

/** Ceil to nearest multiple */
export function ceilToMultiple(value: number, multiple: number): number {
  return Math.ceil(value / multiple) * multiple;
}

/** Format bytes as human-readable string with auto unit selection */
export function formatBytesAuto(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  if (bytes === 0) return "0 B";

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  const unit = units[Math.min(i, units.length - 1)];

  // Show decimal for non-whole numbers under 100
  return value < 100 ? `${value.toFixed(1)} ${unit}` : `${Math.round(value)} ${unit}`;
}

/** Format large numbers with abbreviations (K, M, B, T) */
export function formatCompactNumber(num: number): string {
  if (Math.abs(num) >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toString();
}

/** Format number with thousand separators */
export function formatWithSeparators(
  num: number,
  separator = ",",
  locale?: string,
): string {
  try {
    return num.toLocaleString(locale ?? undefined);
  } catch {
    // Fallback manual implementation
    const parts = Math.abs(num).toString().split(".");
    parts[0] = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return (num < 0 ? "-" : "") + parts.join(".");
  }
}

/** Calculate percentage change between two values */
export function percentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : newValue > 0 ? Infinity : -Infinity;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/** Check if two numbers are approximately equal within tolerance */
export function approximatelyEqual(a: number, b: number, epsilon = 0.0001): boolean {
  return Math.abs(a - b) < epsilon;
}

/** Generate a random integer in range [min, max] inclusive */
export function randomIntInRange(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generate a random float in range [min, max) */
export function randomFloatInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/** Normalize an angle to [0, 360) degrees */
export function normalizeAngleDeg(degrees: number): number {
  const result = degrees % 360;
  return result < 0 ? result + 360 : result;
}

/** Normalize an angle to [0, 2π) radians */
export function normalizeAngleRad(radians: number): number {
  const result = radians % (2 * Math.PI);
  return result < 0 ? result + 2 * Math.PI : result;
}

/** Convert degrees to radians */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/** Convert radians to degrees */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/** Calculate the greatest common divisor of two numbers */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);

  while (b !== 0) {
    [a, b] = [b, a % b];
  }

  return a;
}

/** Calculate the least common multiple of two numbers */
export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

/** Check if a number is within a range (inclusive) */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/** Wrap a number to stay within a range (useful for circular values) */
export function wrapNumber(value: number, min: number, max: number): number {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}
