/**
 * Advanced Math Utilities: Statistical functions, interpolation,
 * curve fitting, matrix operations, number theory helpers,
 * geometry calculations, random distributions, and unit conversions.
 */

// --- Types ---

export interface StatisticsResult {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number[];
  variance: number;
  standardDeviation: number;
  min: number;
  max: number;
  range: number;
  q1: number; // First quartile
  q3: number; // Third quartile
  iqr: number; // Interquartile range
  skewness: number;
  kurtosis: number;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number; // Coefficient of determination
  predict: (x: number) => number;
}

export interface Matrix {
  rows: number;
  cols: number;
  data: number[][];
}

export interface Point2D { x: number; y: number; }
export interface Point3D { x: number; y: number; z: number; }
export interface Rect { x: number; y: number; width: number; height: number; }
export interface Circle { cx: number; cy: number; radius: number; }

export type InterpolationMethod = "linear" | "step" | "cubic" | "monotone";
export type EasingFunction = (t: number) => number;

export type DistributionType = "uniform" | "normal" | "exponential" | "poisson" | "beta";

export interface DistributionOptions {
  mean?: number;
  stdDev?: number;
  lambda?: number; // For exponential/poisson
  alpha?: number; // For beta
  beta?: number; // For beta
  min?: number;
  max?: number;
}

// --- Statistics ---

/**
 * Compute comprehensive statistics for a numeric array.
 */
export function computeStats(values: number[]): StatisticsResult {
  if (values.length === 0) {
    return {
      count: 0, sum: 0, mean: 0, median: 0, mode: [],
      variance: 0, standardDeviation: 0, min: 0, max: 0, range: 0,
      q1: 0, q3: 0, iqr: 0, skewness: 0, kurtosis: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((s, v) => s + v, 0);
  const mean = sum / n;

  // Median
  const mid = Math.floor(n / 2);
  const median = n % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;

  // Mode
  const freq = new Map<number, number>();
  for (const v of sorted) freq.set(v, (freq.get(v) ?? 0) + 1);
  const maxFreq = Math.max(...freq.values());
  const mode = [...freq.entries()].filter(([, f]) => f === maxFreq && f > 1).map(([v]) => v);

  // Variance & Std Dev
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  // Quartiles
  const q1Idx = Math.floor(n * 0.25);
  const q3Idx = Math.floor(n * 0.75);
  const q1 = sorted[q1Idx]!;
  const q3 = sorted[q3Idx]!;
  const iqr = q3 - q1;

  // Skewness (Pearson's)
  const skewness = stdDev > 0
    ? sorted.reduce((s, v) => s + ((v - mean) / stdDev) ** 3, 0) / n
    : 0;

  // Kurtosis (excess)
  const kurtosis = stdDev > 0
    ? sorted.reduce((s, v) => s + ((v - mean) / stdDev) ** 4, 0) / n - 3
    : 0;

  return {
    count: n, sum, mean, median, mode, variance, standardDeviation,
    min: sorted[0]!, max: sorted[n - 1]!, range: sorted[n - 1]! - sorted[0]!,
    q1, q3, iqr, skewness, kurtosis,
  };
}

/** Percentile of a value in a dataset */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (idx - lo) * (sorted[hi]! - sorted[lo]!);
}

/** Z-score normalization */
export function zScore(value: number, mean: number, stdDev: number): number {
  return stdDev === 0 ? 0 : (value - mean) / stdDev;
}

/** Normalize array to [0, 1] range */
export function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

/** Min-max scaling to custom range */
export function scaleToRange(values: number[], newMin: number, newMax: number): number[] {
  const norm = normalize(values);
  return norm.map((v) => newMin + v * (newMax - newMin));
}

// --- Linear Regression ---

/**
 * Simple linear regression (least squares).
 */
export function linearRegression(xVals: number[], yVals: number[]): RegressionResult {
  const n = Math.min(xVals.length, yVals.length);
  if (n < 2) return { slope: 0, intercept: 0, r2: 0, predict: (_x) => 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
  for (let i = 0; i < n; i++) {
    const x = xVals[i]!;
    const y = yVals[i]!;
    sumX += x; sumY += y; sumXY += x * y; sumXX += x * x; sumYY += y * y;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0, predict: (_x) => sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xVals[i]! + intercept;
    ssRes += (yVals[i]! - predicted) ** 2;
    ssTot += (yVals[i]! - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2, predict: (x) => slope * x + intercept };
}

/** Pearson correlation coefficient */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const mx = x.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const my = y.slice(0, n).reduce((s, v) => s + v, 0) / n;

  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i]! - mx;
    const yi = y[i]! - my;
    num += xi * yi;
    dx += xi * xi;
    dy += yi * yi;
  }

  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}

// --- Interpolation ---

/**
 * Interpolate between data points.
 */
export function interpolate(
  points: Point2D[],
  method: InterpolationMethod = "linear",
): (x: number) => number {
  if (points.length < 2) return () => points[0]?.y ?? 0;

  const sorted = [...points].sort((a, b) => a.x - b.x);

  switch (method) {
    case "linear":
      return (x: number) => {
        if (x <= sorted[0]!.x) return sorted[0]!.y;
        if (x >= sorted[sorted.length - 1]!.x) return sorted[sorted.length - 1]!.y;
        for (let i = 0; i < sorted.length - 1; i++) {
          const p0 = sorted[i]!;
          const p1 = sorted[i + 1]!;
          if (x >= p0.x && x <= p1.x) {
            const t = (x - p0.x) / (p1.x - p0.x);
            return p0.y + t * (p1.y - p0.y);
          }
        }
        return sorted[sorted.length - 1]!.y;
      };

    case "step":
      return (x: number) => {
        if (x <= sorted[0]!.x) return sorted[0]!.y;
        for (let i = 0; i < sorted.length - 1; i++) {
          if (x < sorted[i + 1]!.x) return sorted[i]!.y;
        }
        return sorted[sorted.length - 1]!.y;
      };

    case "cubic": {
      // Catmull-Rom spline
      return (x: number) => {
        if (x <= sorted[0]!.x) return sorted[0]!.y;
        if (x >= sorted[sorted.length - 1]!.x) return sorted[sorted.length - 1]!.y;

        for (let i = 0; i < sorted.length - 1; i++) {
          const p0 = sorted[Math.max(0, i - 1)]!;
          const p1 = sorted[i]!;
          const p2 = sorted[Math.min(sorted.length - 1, i + 1)]!;
          const p3 = sorted[Math.min(sorted.length - 1, i + 2)]!;

          if (x >= p1.x && x <= p2.x) {
            const t = (x - p1.x) / (p2.x - p1.x || 1);
            const t2 = t * t;
            const t3 = t2 * t;
            return 0.5 * (
              (2 * p1.y) +
              (-p0.y + p2.y) * t +
              (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
              (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
            );
          }
        }
        return sorted[sorted.length - 1]!.y;
      };
    }

    case "monotone": {
      // Monotone cubic interpolation (preserves monotonicity)
      const tangents = computeMonotoneTangents(sorted);
      return (x: number) => {
        if (x <= sorted[0]!.x) return sorted[0]!.y;
        if (x >= sorted[sorted.length - 1]!.x) return sorted[sorted.length - 1]!.y;

        for (let i = 0; i < sorted.length - 1; i++) {
          const p0 = sorted[i]!;
          const p1 = sorted[i + 1]!;
          if (x >= p0.x && x <= p1.x) {
            const h = p1.x - p0.x;
            const t = h === 0 ? 0 : (x - p0.x) / h;
            const m0 = tangents[i]!;
            const m1 = tangents[i + 1]!;
            return HermiteInterpolate(p0.y, m0, p1.y, m1, t);
          }
        }
        return sorted[sorted.length - 1]!.y;
      };
    }

    default:
      return interpolate(points, "linear");
  }
}

function computeMonotoneTangents(points: Point2D[]): number[] {
  const n = points.length;
  const d = new Array(n).fill(0);
  const m = new Array(n).fill(0);

  // Delta y / delta x
  for (let i = 0; i < n - 1; i++) {
    d[i] = (points[i + 1]!.y - points[i]!.y) / (points[i + 1]!.x - points[i]!.x || 1);
  }
  d[n - 1] = d[n - 2] ?? 0;

  // Initial tangent estimates
  m[0] = d[0]!;
  for (let i = 1; i < n; i++) {
    m[i] = (d[i - 1]! + d[i]!) / 2;
  }
  m[n - 1] = d[n - 2] ?? 0;

  // Enforce monotonicity (Fritsch-Carlson)
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i]! / d[i]!;
      const beta = m[i + 1]! / d[i]!;
      const sq = Math.sqrt(alpha * alpha + beta * beta);
      if (sq > 3) {
        const tau = 3 / sq;
        m[i] = tau * alpha * d[i]!;
        m[i + 1] = tau * beta * d[i]!;
      }
    }
  }

  return m;
}

function HermiteInterpolate(y0: number, m0: number, y1: number, m1: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * y0 + h10 * m0 + h01 * y1 + h11 * m1;
}

// --- Easing Functions ---

export const easings: Record<string, EasingFunction> = {
  linear: (t) => t,

  // Quadratic
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // Quartic
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),

  // Elastic
  easeInElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  },
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  },
  easeInOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    t *= 2;
    if (t < 1) return -0.5 * Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
    return 0.5 * Math.pow(2, -10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI) + 1;
  },

  // Bounce
  easeOutBounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  easeInBounce: (t) => 1 - easings.easeOutBounce(1 - t),
  easeInOutBounce: (t) =>
    t < 0.5 ? easings.easeInBounce(t * 2) * 0.5 : easings.easeOutBounce(t * 2 - 1) * 0.5 + 0.5,

  // Back
  easeInBack: (t) => {
    const c = 1.70158;
    return t * t * ((c + 1) * t - c);
  },
  easeOutBack: (t) => {
    const c = 1.70158;
    return (--t) * t * ((c + 1) * t + c) + 1;
  },
  easeInOutBack: (t) => {
    const c = 1.70158 * 1.525;
    if ((t *= 2) < 1) return 0.5 * (t * t * ((c + 1) * t - c));
    return 0.5 * ((t -= 2) * t * ((c + 1) * t + c) + 2);
  },

  // Exponential
  easeInExpo: (t) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t) => {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },

  // Sine
  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Circ
  easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t) => Math.sqrt(1 - (--t) * t),
  easeInOutCirc: (t) =>
    t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
};

/** Get an easing function by name */
export function getEasing(name: string): EasingFunction {
  return easings[name] ?? easings.linear;
}

// --- Matrix Operations ---

/** Create a matrix filled with zeros */
export function createMatrix(rows: number, cols: number): Matrix {
  const data: number[][] = [];
  for (let r = 0; r < rows; r++) data.push(new Array(cols).fill(0));
  return { rows, cols, data };
}

/** Create identity matrix */
export function identityMatrix(size: number): Matrix {
  const m = createMatrix(size, size);
  for (let i = 0; i < size; i++) m.data[i]![i] = 1;
  return m;
}

/** Matrix addition */
export function matAdd(a: Matrix, b: Matrix): Matrix {
  if (a.rows !== b.rows || a.cols !== b.cols) throw new Error("Matrix dimensions must match");
  const result = createMatrix(a.rows, a.cols);
  for (let r = 0; r < a.rows; r++)
    for (let c = 0; c < a.cols; c++)
      result.data[r]![c] = a.data[r]![c]! + b.data[r]![c]!;
  return result;
}

/** Matrix multiplication */
export function matMul(a: Matrix, b: Matrix): Matrix {
  if (a.cols !== b.rows) throw new Error(`Cannot multiply ${a.rows}x${a.cols} with ${b.rows}x${b.cols}`);
  const result = createMatrix(a.rows, b.cols);
  for (let r = 0; r < a.rows; r++)
    for (let c = 0; c < b.cols; c++) {
      let sum = 0;
      for (let k = 0; k < a.cols; k++) sum += a.data[r]![k]! * b.data[k]![c]!;
      result.data[r]![c] = sum;
    }
  return result;
}

/** Scalar multiplication */
export function matScale(m: Matrix, scalar: number): Matrix {
  const result = createMatrix(m.rows, m.cols);
  for (let r = 0; r < m.rows; r++)
    for (let c = 0; c < m.cols; c++)
      result.data[r]![c] = m.data[r]![c]! * scalar;
  return result;
}

/** Matrix transpose */
export function matTranspose(m: Matrix): Matrix {
  const result = createMatrix(m.cols, m.rows);
  for (let r = 0; r < m.rows; r++)
    for (let c = 0; c < m.cols; c++)
      result.data[c]![r] = m.data[r]![c]!;
  return result;
}

/** Determinant (recursive, for square matrices) */
export function matDeterminant(m: Matrix): number {
  if (m.rows !== m.cols) throw new Error("Determinant requires square matrix");
  if (m.rows === 1) return m.data[0]![0]!;
  if (m.rows === 2) return m.data[0]![0]! * m.data[1]![1]! - m.data[0]![1]! * m.data[1]![0]!;

  let det = 0;
  for (let c = 0; c < m.cols; c++) {
    const sub = minor(m, 0, c);
    det += (c % 2 === 0 ? 1 : -1) * m.data[0]![c]! * matDeterminant(sub);
  }
  return det;
}

/** Get minor matrix (remove row r, col c) */
function minor(m: Matrix, row: number, col: number): Matrix {
  const result = createMatrix(m.rows - 1, m.cols - 1);
  let ri = 0;
  for (let r = 0; r < m.rows; r++) {
    if (r === row) continue;
    let ci = 0;
    for (let c = 0; c < m.cols; c++) {
      if (c === col) continue;
      result.data[ri]![ci] = m.data[r]![c]!;
      ci++;
    }
    ri++;
  }
  return result;
}

/** Matrix inverse (via adjugate) */
export function matInverse(m: Matrix): Matrix {
  if (m.rows !== m.cols) throw new Error("Inverse requires square matrix");
  const det = matDeterminant(m);
  if (det === 0) throw new Error("Matrix is singular (no inverse)");

  const adj = adjugate(m);
  return matScale(adj, 1 / det);
}

/** Adjugate (transpose of cofactor matrix) */
function adjugate(m: Matrix): Matrix {
  const n = m.rows;
  const result = createMatrix(n, n);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const sign = (r + c) % 2 === 0 ? 1 : -1;
      result.data[c]![r] = sign * matDeterminant(minor(m, r, c));
    }
  return result;
}

/** Convert to string representation */
export function matToString(m: Matrix, precision = 2): string {
  const maxLen = Math.max(...m.data.flat().map((v) => v.toFixed(precision).length));
  return m.data.map((row) =>
    row.map((v) => v.toFixed(precision).padStart(maxLen)).join("  ")
  ).join("\n");
}

// --- Geometry ---

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

/** Angle from point A to point B (in radians) */
export function angleBetween(from: Point2D, to: Point2D): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Midpoint between two 2D points */
export function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Check if point is inside rectangle */
export function pointInRect(pt: Point2D, rect: Rect): boolean {
  return pt.x >= rect.x && pt.x <= rect.x + rect.width &&
         pt.y >= rect.y && pt.y <= rect.y + rect.height;
}

/** Check if point is inside circle */
export function pointInCircle(pt: Point2D, circle: Circle): boolean {
  return distance2D(pt, { x: circle.cx, y: circle.cy }) <= circle.radius;
}

/** Line-circle intersection points */
export function lineCircleIntersection(
  start: Point2D,
  end: Point2D,
  circle: Circle,
): Point2D[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const fx = start.x - circle.cx;
  const fy = start.y - circle.cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - circle.radius * circle.radius;

  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];

  discriminant = Math.sqrt(discriminant);
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);

  const results: Point2D[] = [];
  if (t1 >= 0 && t1 <= 1) results.push({ x: start.x + t1 * dx, y: start.y + t1 * dy });
  if (t2 >= 0 && t2 <= 1) results.push({ x: start.x + t2 * dx, y: start.y + t2 * dy });
  return results;
}

/** Rectangle intersection */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Rectangle union */
export function rectUnion(a: Rect, b: Rect): Rect {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.width, b.x + b.width);
  const y2 = Math.max(a.y + a.height, b.y + b.height);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/** Rectangle intersection area */
export function rectIntersection(a: Rect, b: Rect): Rect | null {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return null;
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/** Convex hull (Graham scan) */
export function convexHull(points: Point2D[]): Point2D[] {
  if (points.length < 3) return [...points];

  // Find lowest point (by y, then x)
  let pivot = points[0]!;
  for (const pt of points) {
    if (pt.y < pivot.y || (pt.y === pivot.y && pt.x < pivot.x)) pivot = pt;
  }

  // Sort by polar angle
  const sorted = [...points].sort((a, b) => {
    const angA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
    const angB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
    return angA - angB || distance2D(pivot, a) - distance2D(pivot, b);
  });

  const hull: Point2D[] = [pivot];
  for (let i = 1; i < sorted.length; i++) {
    while (hull.length > 1 && crossProduct(hull[hull.length - 2]!, hull[hull.length - 1]!, sorted[i]!) <= 0) {
      hull.pop();
    }
    hull.push(sorted[i]!);
  }

  return hull;
}

function crossProduct(o: Point2D, a: Point2D, b: Point2D): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** Polygon area (Shoelace formula) */
export function polygonArea(vertices: Point2D[]): number {
  if (vertices.length < 3) return 0;
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i]!.x * vertices[j]!.y;
    area -= vertices[j]!.x * vertices[i]!.y;
  }
  return Math.abs(area) / 2;
}

/** Centroid of polygon */
export function polygonCentroid(vertices: Point2D[]): Point2D {
  if (vertices.length === 0) return { x: 0, y: 0 };
  if (vertices.length === 1) return vertices[0]!;
  if (vertices.length === 2) return midpoint(vertices[0]!, vertices[1]!);

  let cx = 0, cy = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const factor = vertices[i]!.x * vertices[j]!.y - vertices[j]!.x * vertices[i]!.y;
    cx += (vertices[i]!.x + vertices[j]!.x) * factor;
    cy += (vertices[i]!.y + vertices[j]!.y) * factor;
  }
  const area = polygonArea(vertices) * 6; // signed area * 6
  if (area === 0) return midpoint(vertices[0]!, vertices[Math.floor(n / 2)]!);
  return { x: cx / area, y: cy / area };
}

// --- Number Theory ---

/** Greatest common divisor (Euclidean algorithm) */
export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b !== 0) { [a, b] = [b, a % b]; }
  return a;
}

/** Least common multiple */
export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

/** Prime factorization */
export function primeFactors(n: number): number[] {
  n = Math.abs(Math.round(n));
  if (n < 2) return [];
  const factors: number[] = [];
  let d = 2;
  while (d * d <= n) {
    while (n % d === 0) { factors.push(d); n /= d; }
    d++;
  }
  if (n > 1) factors.push(n);
  return factors;
}

/** Check if prime (Miller-Rabin deterministic for 32-bit) */
export function isPrime(n: number): boolean {
  n = Math.abs(Math.round(n));
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;

  // Deterministic witnesses for 32-bit integers
  const witnesses = [2, 7, 61];
  const d = n - 1;
  let s = 0;
  while (d % 2 === 0) { s++; d /= 2; }

  for (const a of witnesses) {
    if (a >= n) continue;
    let x = modPow(a, d, n);
    if (x === 1 || x === n - 1) continue;
    let composite = true;
    for (let r = 0; r < s - 1; r++) {
      x = (x * x) % n;
      if (x === n - 1) { composite = false; break; }
    }
    if (composite) return false;
  }
  return true;
}

/** Modular exponentiation (fast pow) */
export function modPow(base: number, exp: number, mod: number): number {
  base %= mod;
  let result = 1;
  while (exp > 0) {
    if (exp & 1) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1;
  }
  return result;
}

/** Generate primes up to limit (Sieve of Eratosthenes) */
export function sieveOfEratosthenes(limit: number): number[] {
  if (limit < 2) return [];
  const sieve = new Array(limit + 1).fill(true);
  sieve[0] = sieve[1] = false;
  for (let i = 2; i * i <= limit; i++) {
    if (sieve[i]) {
      for (let j = i * i; j <= limit; j += i) sieve[j] = false;
    }
  }
  return sieve.map((isP, idx) => isP ? idx : -1).filter((v) => v >= 0);
}

/** Fibonacci (iterative, O(n)) */
export function fibonacci(n: number): number {
  n = Math.round(n);
  if (n < 0) throw new Error("Fibonacci not defined for negative numbers");
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}

/** Factorial */
export function factorial(n: number): number {
  n = Math.round(n);
  if (n < 0) throw new Error("Factorial not defined for negative numbers");
  if (n > 170) return Infinity; // Number.MAX_VALUE overflow
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/** Combinations (n choose k) */
export function combinations(n: number, k: number): number {
  n = Math.round(n); k = Math.round(k);
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n - k) k = n - k;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return Math.round(result);
}

/** Permutations (nPk) */
export function permutations(n: number, k: number): number {
  n = Math.round(n); k = Math.round(k);
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 0; i < k; i++) result *= (n - i);
  return result;
}

// --- Random Distributions ---

/** Seeded pseudo-random number generator (Mulberry32) */
export class SeededRNG {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed;
  }

  /** Next float in [0, 1) */
  next(): number {
    this.state |= 0;
    let t = (this.state += 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Next integer in [min, max] */
  nextInt(min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Shuffle an array in place (Fisher-Yates) */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }

  /** Pick random element */
  pick<T>(arr: T[]): T | undefined {
    return arr.length > 0 ? arr[this.nextInt(0, arr.length - 1)] : undefined;
  }

  /** Pick N unique elements */
  pickN<T>(arr: T[], count: number): T[] {
    const copy = [...arr];
    this.shuffle(copy);
    return copy.slice(0, Math.min(count, copy.length));
  }

  /** Weighted random selection */
  weightedPick<T>(items: T[], weights: number[]): T | undefined {
    if (items.length === 0) return undefined;
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    if (totalWeight <= 0) return items[this.nextInt(0, items.length - 1)];
    let r = this.next() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i]!;
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  /** Boolean with probability */
  chance(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /** Reset state */
  reset(seed: number): void {
    this.state = seed;
  }
}

/**
 * Generate random value from a distribution.
 */
export function randomFromDistribution(type: DistributionType, options: DistributionOptions = {}): number {
  const rng = new SeededRNG();
  switch (type) {
    case "uniform":
      return options.min ?? 0 + rng.next() * ((options.max ?? 1) - (options.min ?? 0));

    case "normal": {
      // Box-Muller transform
      const u1 = Math.max(rng.next(), 1e-10);
      const u2 = rng.next();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return (options.mean ?? 0) + z * (options.stdDev ?? 1);
    }

    case "exponential":
      return -Math.log(Math.max(rng.next(), 1e-10)) / (options.lambda ?? 1);

    case "poisson": {
      const L = Math.exp(-(options.lambda ?? 1));
      let k = 0, p = 1;
      do { k++; p *= rng.next(); } while (p > L);
      return k - 1;
    }

    case "beta": {
      const alpha = options.alpha ?? 1;
      const betaParam = options.beta ?? 1;
      // Simple approximation using gamma distribution
      const x = gammaSample(alpha, rng);
      const y = gammaSample(betaParam, rng);
      if (x + y === 0) return 0;
      return (options.min ?? 0) + (x / (x + y)) * ((options.max ?? 1) - (options.min ?? 0));
    }

    default:
      return rng.next();
  }
}

function gammaSample(alpha: number, rng: SeededRNG): number {
  if (alpha < 1) {
    return gammaSample(alpha + 1, rng) * Math.pow(rng.next(), 1 / alpha);
  }
  // Marsaglia and Tsang's method
  const d = alpha - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = rng.nextGaussian?.() ?? normalRandom(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng.next();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function normalRandom(rng: SeededRNG): number {
  const u1 = Math.max(rng.next(), 1e-10);
  const u2 = rng.next();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// --- Unit Conversions ---

/** Length conversions */
export const lengthUnits: Record<string, number> = {
  mm: 1, cm: 10, m: 1000, km: 1_000_000,
  inch: 25.4, ft: 304.8, yard: 914.4, mile: 1_609_344,
};

export function convertLength(value: number, from: string, to: string): number {
  const mmValue = value * (lengthUnits[from.toLowerCase()] ?? 1);
  return mmValue / (lengthUnits[to.toLowerCase()] ?? 1);
}

/** Weight conversions */
export const weightUnits: Record<string, number> = {
  mg: 1, g: 1000, kg: 1_000_000,
  oz: 28_349.523125, lb: 453_592.37,
};

export function convertWeight(value: number, from: string, to: string): number {
  const mgValue = value * (weightUnits[from.toLowerCase()] ?? 1);
  return mgValue / (weightUnits[to.toLowerCase()] ?? 1);
}

/** Temperature conversions */
export function convertTemperature(value: number, from: "C" | "F" | "K", to: "C" | "F" | "K"): number {
  if (from === to) return value;
  let celsius: number;
  switch (from) {
    case "C": celsius = value; break;
    case "F": celsius = (value - 32) * 5 / 9; break;
    case "K": celsius = value - 273.15; break;
  }
  switch (to) {
    case "C": return celsius;
    case "F": return celsius * 9 / 5 + 32;
    case "K": return celsius + 273.15;
  }
}

/** Data size conversions */
export const dataUnits: Record<string, number> = {
  B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776,
};

export function formatDataSize(bytes: number, precision = 2): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(precision)} ${units[i]}`;
}

/** Angle conversions */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

// --- Misc Math Helpers ---

/** Clamp value to range */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Linear mapping from one range to another */
export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/** Round to decimal places */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Round to nearest step (e.g., roundToStep(17, 5) -> 15) */
export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Check if approximately equal (within epsilon) */
export function approxEqual(a: number, b: number, epsilon = 1e-9): boolean {
  return Math.abs(a - b) < epsilon;
}

/** Lerp (linear interpolation) */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Inverse lerp */
export function invLerp(a: number, b: number, value: number): number {
  return (value - a) / (b - a);
}

/** Smooth step (Hermite interpolation) */
export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = clamp(invLerp(edge0, edge1, x), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Smoother step (Ken Perlin's) */
export function smootherStep(edge0: number, edge1: number, x: number): number {
  const t = clamp(invLerp(edge0, edge1, x), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Sum of array */
export function sum(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0);
}

/** Product of array */
export function product(arr: number[]): number {
  return arr.reduce((s, v) => s * v, 1);
}

/** Arithmetic mean */
export function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : sum(arr) / arr.length;
}

/** Geometric mean */
export function geometricMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.pow(product(arr), 1 / arr.length);
}

/** Harmonic mean */
export function harmonicMean(arr: number[]): number {
  if (arr.some((v) => v === 0)) return 0;
  return arr.length / arr.reduce((s, v) => s + 1 / v, 0);
}

/** Root mean square */
export function rms(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.sqrt(mean(arr.map((v) => v * v)));
}

/** Moving average (simple) */
export function movingAverage(values: number[], windowSize: number): number[] {
  if (windowSize <= 0) return [...values];
  const result: number[] = [];
  const window: number[] = [];
  for (let i = 0; i < values.length; i++) {
    window.push(values[i]!);
    if (window.length > windowSize) window.shift();
    result.push(sum(window) / window.length);
  }
  return result;
}

/** Exponential moving average */
export function ema(values: number[], alpha: number = 0.3): number[] {
  if (values.length === 0) return [];
  const result: number[] = [values[0]!];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i]! + (1 - alpha) * result[i - 1]!);
  }
  return result;
}
