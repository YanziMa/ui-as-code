/**
 * Math Helpers: Extended numeric utilities including interpolation,
 * clamping, rounding, randomization, statistics, geometry,
 * number formatting, easing curves, and matrix operations.
 */

// --- Basic Operations ---

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation from a to b by t (0-1) */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/** Inverse lerp: given value between a and b, return t (0-1) */
export function inverseLerp(a: number, b: number, value: number): number {
  const range = b - a;
  return range === 0 ? 0 : clamp((value - a) / range, 0, 1);
}

/** Map value from one range to another */
export function mapRange(
  inMin: number, inMax: number,
  outMin: number, outMax: number,
  value: number,
): number {
  return lerp(outMin, outMax, inverseLerp(inMin, inMax, value));
}

/** Round to specified decimal places */
export function roundTo(value: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Round to nearest multiple of step */
export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Snap to grid (alias for roundToStep) */
export function snapToGrid(value: number, gridSize: number): number {
  return roundToStep(value, gridSize);
}

/** Check if value is approximately equal to target within epsilon */
export function approxEqual(a: number, b: number, epsilon = 1e-6): boolean {
  return Math.abs(a - b) <= epsilon;
}

/** Check if value is within range [min, max] */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/** Get sign of number (-1, 0, or 1) */
export function sign(n: number): number {
  if (n > 0) return 1;
  if (n < 0) return -1;
  return 0;
}

// --- Random ---

/** Random float in [min, max) */
export function randomFloat(min = 0, max = 1): number {
  return Math.random() * (max - min) + min;
}

/** Random integer in [min, max] inclusive */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random element from array */
export function randomPick<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[randomInt(0, arr.length - 1)] : undefined;
}

/** Shuffle array in place (Fisher-Yates) */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Return shuffled copy of array */
export function shuffled<T>(arr: T[]): T[] {
  return shuffle([...arr]);
}

/** Weighted random selection */
export function weightedRandom<T>(items: { item: T; weight: number }[]): T | undefined {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  let r = Math.random() * totalWeight;
  for (const entry of items) {
    r -= entry.weight;
    if (r <= 0) return entry.item;
  }
  return items[items.length - 1]?.item;
}

/** Generate unique random integers in range */
export function uniqueRandomInts(count: number, min: number, max: number): number[] {
  const range = max - min + 1;
  if (count > range) throw new Error(`Cannot generate ${count} unique ints in range [${min}, ${max}]`);
  const pool = Array.from({ length: range }, (_, i) => i + min);
  shuffle(pool);
  return pool.slice(0, count);
}

/** Seeded pseudo-random number generator (Mulberry32) */
export function createSeededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Statistics ---

/** Calculate mean of numbers */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Calculate median of numbers */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Calculate mode (most frequent value(s)) */
export function mode(values: number[]): number[] {
  if (values.length === 0) return [];
  const freq = new Map<number, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  const maxFreq = Math.max(...freq.values());
  return [...freq.entries()].filter(([, f]) => f === maxFreq).map(([v]) => v);
}

/** Calculate standard deviation (population) */
export function stdDev(values: number[], sample = false): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (sample ? values.length - 1 : values.length);
  return Math.sqrt(variance);
}

/** Calculate variance */
export function variance(values: number[], sample = false): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (sample ? values.length - 1 : values.length);
}

/** Calculate percentiles */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (idx - lower);
}

/** Sum of array */
export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/** Product of array */
export function product(values: number[]): number {
  return values.reduce((a, b) => a * b, 1);
}

/** Min and max simultaneously */
export function minMax(values: number[]): { min: number; max: number } | null {
  if (values.length === 0) return null;
  let min = values[0]!;
  let max = values[0]!;
  for (let i = 1; i < values.length; i++) {
    if (values[i]! < min) min = values[i]!;
    if (values[i]! > max) max = values[i]!;
  }
  return { min, max };
}

/** Normalize values to [0, 1] range */
export function normalize(values: number[]): number[] {
  const result = minMax(values);
  if (!result || result.min === result.max) return values.map(() => 0.5);
  const range = result.max - result.min;
  return values.map((v) => (v - result.min) / range);
}

// --- Geometry ---

export interface Point2D { x: number; y: number }
export interface Point3D { x: number; y: number; z: number }

/** Distance between two 2D points */
export function distance2D(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Distance between two 3D points */
export function distance3D(a: Point3D, b: Point3D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Angle (in degrees) between two 2D vectors from origin */
export function angleBetween(a: Point2D, b: Point2D): number {
  const dot = a.x * b.x + a.y * b.y;
  const magA = Math.sqrt(a.x * a.x + a.y * a.y);
  const magB = Math.sqrt(b.x * b.x + b.y * b.y);
  if (magA === 0 || magB === 0) return 0;
  return Math.acos(clamp(dot / (magA * magB), -1, 1)) * (180 / Math.PI);
}

/** Midpoint between two 2D points */
export function midpoint2D(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Rotate point around origin by angle (radians) */
export function rotatePoint(point: Point2D, angleRad: number, origin?: Point2D): Point2D {
  const ox = origin?.x ?? 0;
  const oy = origin?.y ?? 0;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = point.x - ox;
  const dy = point.y - oy;
  return {
    x: ox + dx * cos - dy * sin,
    y: oy + dx * sin + dy * cos,
  };
}

/** Check if point is inside rectangle */
export function pointInRect(point: Point2D, rect: { x: number; y: number; width: number; height: number }): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/** Check if point is inside circle */
export function pointInCircle(point: Point2D, center: Point2D, radius: number): boolean {
  return distance2D(point, center) <= radius;
}

/** Area of polygon using Shoelace formula */
export function polygonArea(points: Point2D[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i]!.x * points[j]!.y;
    area -= points[j]!.x * points[i]!.y;
  }
  return Math.abs(area) / 2;
}

/** Centroid of polygon */
export function polygonCentroid(points: Point2D[]): Point2D {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { ...points[0]! };
  const area = polygonArea(points);
  if (area === 0) return midpoint2D(points[0]!, points[Math.floor(points.length / 2)]!);

  let cx = 0, cy = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const factor = points[i]!.x * points[j]!.y - points[j]!.x * points[i]!.y;
    cx += (points[i]!.x + points[j]!.x) * factor;
    cy += (points[i]!.y + points[j]!.y) * factor;
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

/** Bounding box of points */
export function boundingBox(points: Point2D[]): { x: number; y: number; width: number; height: number } | null {
  if (points.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// --- Number Formatting ---

/** Format number with commas as thousands separator */
export function formatNumber(num: number, options?: { decimals?: number; separator?: string }): string {
  const { decimals, separator = "," } = options ?? {};
  const parts = (decimals !== undefined ? num.toFixed(decimals) : String(num)).split(".");
  parts[0] = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return parts.join(".");
}

/** Abbreviate large numbers (e.g., 1500 → "1.5K", 1200000 → "1.2M") */
export function abbreviateNumber(num: number): string {
  if (Math.abs(num) < 1000) return String(num);
  const suffixes = ["", "K", "M", "B", "T"];
  const tier = Math.floor(Math.log10(Math.abs(num)) / 3);
  const suffix = suffixes[tier] ?? "";
  const scale = Math.pow(10, tier * 3);
  const scaled = num / scale;
  return `${scaled.toFixed(tier > 0 ? 1 : 0)}${suffix}`;
}

/** Parse a formatted number string back to number */
export function parseFormattedNumber(str: string): number {
  return parseFloat(str.replace(/,/g, ""));
}

/** Convert bytes to human-readable string */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(decimals)} ${units[i]}`;
}

/** Convert milliseconds to human-readable duration */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

// --- Interpolation & Curves ---

/** Smooth step interpolation (Hermite) */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp(inverseLerp(edge0, edge1, x), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Smoother step (quintic Hermite) */
export function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = clamp(inverseLerp(edge0, edge1, x), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Catmull-Rom spline interpolation through control points */
export function catmullRomSpline(
  points: Point2D[],
  t: number,
  tension = 0.5,
): Point2D {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 };

  const n = points.length - 1;
  const segment = Math.min(Math.floor(t * n), n - 1);
  const localT = (t * n) - segment;

  const p0 = points[Math.max(segment - 1, 0)]!;
  const p1 = points[segment]!;
  const p2 = points[Math.min(segment + 1, n)]!;
  const p3 = points[Math.min(segment + 2, n)]!;

  const t2 = localT * localT;
  const t3 = t2 * localT;

  return {
    x: ((2 * p1.x) +
      (-p0.x + p2.x) * tension * localT +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tension * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * tension * t3),
    y: ((2 * p1.y) +
      (-p0.y + p2.y) * tension * localT +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tension * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * tension * t3),
  };
}

/** Bezier curve evaluation (cubic) */
export function cubicBezier(
  p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D,
  t: number,
): Point2D {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

/** Quadratic Bezier curve */
export function quadraticBezier(p0: Point2D, p1: Point2D, p2: Point2D, t: number): Point2D {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

/** Linear Bezier (just lerp on both axes) */
export function linearBezier(a: Point2D, b: Point2D, t: number): Point2D {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

// --- Matrix Operations (2x2 and 3x3) ---

export type Matrix2x2 = [[number, number], [number, number]];
export type Matrix3x3 = [[number, number, number], [number, number, number], [number, number, number]];

/** Multiply two 2x2 matrices */
export function mat2Multiply(a: Matrix2x2, b: Matrix2x2): Matrix2x2 {
  return [
    [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
    [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]],
  ];
}

/** Multiply two 3x3 matrices */
export function mat3Multiply(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
  const result: Matrix3x3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

/** Create identity 3x3 matrix */
export function mat3Identity(): Matrix3x3 {
  return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
}

/** Create 2D translation matrix */
export function mat3Translate(tx: number, ty: number): Matrix3x3 {
  return [[1, 0, tx], [0, 1, ty], [0, 0, 1]];
}

/** Create 2D scale matrix */
export function mat3Scale(sx: number, sy: number): Matrix3x3 {
  return [[sx, 0, 0], [0, sy, 0], [0, 0, 1]];
}

/** Create 2D rotation matrix (radians) */
export function mat3Rotate(angleRad: number): Matrix3x3 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}

/** Transform a 2D point with a 3x3 affine matrix */
export function transformPoint(mat: Matrix3x3, point: Point2D): Point2D {
  return {
    x: mat[0][0] * point.x + mat[0][1] * point.y + mat[0][2],
    y: mat[1][0] * point.x + mat[1][1] * point.y + mat[1][2],
  };
}

/** Determinant of 2x2 matrix */
export function det2(m: Matrix2x2): number {
  return m[0][0] * m[1][1] - m[0][1] * m[1][0];
}

/** Determinant of 3x3 matrix */
export function det3(m: Matrix3x3): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

/** Inverse of 2x2 matrix */
export function invert2(m: Matrix2x2): Matrix2x2 | null {
  const d = det2(m);
  if (d === 0) return null;
  return [
    [m[1][1] / d, -m[0][1] / d],
    [-m[1][0] / d, m[0][0] / d],
  ];
}

// --- Constants ---

export const TAU = Math.PI * 2;
export const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio
export const EPSILON = Number.EPSILON || 2.220446049250313e-16;
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

/** Convert degrees to radians */
export function degToRad(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

/** Convert radians to degrees */
export function radToDeg(radians: number): number {
  return radians * RAD_TO_DEG;
}
