/**
 * Math Utilities: Statistics, linear algebra (vectors, matrices), geometry,
 * interpolation, number theory, unit conversions, random distributions,
 * numeric utilities.
 */

// --- Statistics ---

/** Calculate arithmetic mean of numbers */
export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Calculate median of numbers */
export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/** Calculate mode(s) — most frequent value(s) */
export function mode(values: number[]): number[] {
  if (values.length === 0) return [];
  const freq = new Map<number, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  const maxFreq = Math.max(...freq.values());
  return [...freq.entries()].filter(([, f]) => f === maxFreq).map(([v]) => v);
}

/** Calculate variance (population by default, pass true for sample) */
export function variance(values: number[], sample = false): number {
  if (values.length <= (sample ? 1 : 0)) return NaN;
  const m = mean(values);
  const sumSq = values.reduce((s, v) => s + (v - m) ** 2, 0);
  return sumSq / (values.length - (sample ? 1 : 0));
}

/** Calculate standard deviation */
export function stddev(values: number[], sample = false): number {
  return Math.sqrt(variance(values, sample));
}

/** Calculate covariance between two arrays */
export function covariance(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return NaN;
  const ma = mean(a), mb = mean(b);
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i]! - ma) * (b[i]! - mb);
  return sum / a.length;
}

/** Pearson correlation coefficient */
export function correlation(a: number[], b: number[]): number {
  const cov = covariance(a, b);
  const sa = stddev(a), sb = stddev(b);
  if (sa === 0 || sb === 0) return 0;
  return cov / (sa * sb);
}

/** Linear regression: returns { slope, intercept, r2 } */
export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  const n = x.length;
  if (n < 2 || n !== y.length) { return { slope: NaN, intercept: NaN, r2: NaN }; }
  const mx = mean(x), my = mean(y);
  let ssxx = 0, ssxy = 0, ssyy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i]! - mx, dy = y[i]! - my;
    ssxx += dx * dx; ssxy += dx * dy; ssyy += dy * dy;
  }
  const slope = ssxx === 0 ? 0 : ssxy / ssxx;
  const intercept = my - slope * mx;
  const r2 = ssyy === 0 ? 1 : (ssxy ** 2) / (ssxx * ssyy);
  return { slope, intercept, r2 };
}

/** Percentile calculation (linear interpolation method) */
export function percentile(values: number[], p: number): number {
  if (values.length === 0 || p < 0 || p > 100) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (idx - lo) * (sorted[hi]! - sorted[lo]!);
}

// --- Vectors ---

export interface Vector2D { x: number; y: number; }
export interface Vector3D { x: number; y: number; z: number; }

export class Vec2 implements Vector2D {
  constructor(public x = 0, public y = 0) {}

  static fromAngle(angle: number, length = 1): Vec2 {
    return new Vec2(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  clone(): Vec2 { return new Vec2(this.x, this.y); }

  add(v: Vec2): Vec2 { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v: Vec2): Vec2 { return new Vec2(this.x - v.x, this.y - v.y); }
  mul(scalar: number): Vec2 { return new Vec2(this.x * scalar, this.y * scalar); }
  div(scalar: number): Vec2 { return scalar !== 0 ? new Vec2(this.x / scalar, this.y / scalar) : new Vec2(NaN, NaN); }

  dot(v: Vec2): number { return this.x * v.x + this.y * v.y; }
  cross(v: Vec2): number { return this.x * v.y - this.y * v.x; } // 2D cross product (scalar)

  get length(): number { return Math.sqrt(this.x * this.x + this.y * this.y); }
  get lengthSq(): number { return this.x * this.x + this.y * this.y; }

  normalize(): Vec2 { const l = this.length; return l > 0 ? this.div(l) : new Vec2(); }
  get angle(): number { return Math.atan2(this.y, this.x); }

  distanceTo(v: Vec2): number { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2); }

  lerp(v: Vec2, t: number): Vec2 {
    return new Vec2(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t);
  }

  rotate(angle: number): Vec2 {
    const c = Math.cos(angle), s = Math.sin(angle);
    return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
  }

  /** Reflect off a normal vector */
  reflect(normal: Vec2): Vec2 {
    const d = 2 * this.dot(normal);
    return new Vec2(this.x - d * normal.x, this.y - d * normal.y);
  }

  toArray(): [number, number] { return [this.x, this.y]; }
  toString(): string { return `Vec2(${this.x}, ${this.y})`; }
}

export class Vec3 implements Vector3D {
  constructor(public x = 0, public y = 0, public z = 0) {}

  clone(): Vec3 { return new Vec3(this.x, this.y, this.z); }

  add(v: Vec3): Vec3 { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
  sub(v: Vec3): Vec3 { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
  mul(s: number): Vec3 { return new Vec3(this.x * s, this.y * s, this.z * s); }

  dot(v: Vec3): number { return this.x * v.x + this.y * v.y + this.z * v.z; }
  cross(v: Vec3): Vec3 {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x,
    );
  }

  get length(): number { return Math.sqrt(this.dot(this)); }
  normalize(): Vec3 { const l = this.length; return l > 0 ? this.mul(1 / l) : new Vec3(); }

  distanceTo(v: Vec3): number { return this.sub(v).length; }
  lerp(v: Vec3, t: number): Vec3 {
    return new Vec3(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t,
    );
  }

  toArray(): [number, number, number] { return [this.x, this.y, this.z]; }
}

// --- Matrix Operations ---

/**
 * Simple matrix class for 2D arrays of numbers.
 * Supports basic operations: add, subtract, multiply, transpose, determinant, inverse.
 */
export class Matrix {
  constructor(public data: number[][]) {}

  get rows(): number { return this.data.length; }
  get cols(): number { return this.data[0]?.length ?? 0; }

  get(row: number, col: number): number { return this.data[row]?.[col] ?? 0; }

  set(row: number, col: number, value: number): void {
    if (!this.data[row]) this.data[row] = [];
    this.data[row][col] = value;
  }

  static identity(n: number): Matrix {
    const data: number[][] = [];
    for (let i = 0; i < n; i++) {
      data[i] = [];
      for (let j = 0; j < n; j++) data[i][j] = i === j ? 1 : 0;
    }
    return new Matrix(data);
  }

  static zeros(rows: number, cols: number): Matrix {
    return new Matrix(Array.from({ length: rows }, () => Array(cols).fill(0)));
  }

  add(other: Matrix): Matrix {
    const result: number[][] = [];
    for (let i = 0; i < this.rows; i++) {
      result[i] = [];
      for (let j = 0; j < this.cols; j++) result[i][j] = this.get(i, j) + other.get(i, j);
    }
    return new Matrix(result);
  }

  multiply(other: Matrix | number): Matrix {
    if (typeof other === "number") {
      // Scalar multiplication
      return new Matrix(this.data.map((row) => row.map((v) => v * other)));
    }
    // Matrix multiplication
    if (this.cols !== other.rows) throw new Error("Matrix dimension mismatch");
    const result: number[][] = [];
    for (let i = 0; i < this.rows; i++) {
      result[i] = [];
      for (let j = 0; j < other.cols; j++) {
        let sum = 0;
        for (let k = 0; k < this.cols; k++) sum += this.get(i, k) * other.get(k, j);
        result[i][j] = sum;
      }
    }
    return new Matrix(result);
  }

  transpose(): Matrix {
    const result: number[][] = [];
    for (let j = 0; j < this.cols; j++) {
      result[j] = [];
      for (let i = 0; i < this.rows; i++) result[j][i] = this.get(i, j);
    }
    return new Matrix(result);
  }

  /** Determinant (recursive cofactor expansion) */
  determinant(): number {
    if (this.rows !== this.cols) throw new Error("Determinant requires square matrix");
    const n = this.rows;
    if (n === 1) return this.get(0, 0);
    if (n === 2) return this.get(0, 0) * this.get(1, 1) - this.get(0, 1) * this.get(1, 0);

    let det = 0;
    for (let j = 0; j < n; j++) {
      det += ((j % 2 === 0) ? 1 : -1) * this.get(0, j) * this.minor(0, j).determinant();
    }
    return det;
  }

  /** Get minor matrix (remove row r and column c) */
  private minor(r: number, c: number): Matrix {
    const result: number[][] = [];
    for (let i = 0; i < this.rows; i++) {
      if (i === r) continue;
      const row: number[] = [];
      for (let j = 0; j < this.cols; j++) if (j !== c) row.push(this.get(i, j));
      result.push(row);
    }
    return new Matrix(result);
  }

  /** Inverse via adjugate method */
  inverse(): Matrix {
    if (this.rows !== this.cols) throw new Error("Inverse requires square matrix");
    const det = this.determinant();
    if (det === 0) throw new Error("Matrix is singular (determinant is zero)");

    const n = this.rows;
    const result: number[][] = [];

    for (let i = 0; i < n; i++) {
      result[i] = [];
      for (let j = 0; j < n; j++) {
        const sign = ((i + j) % 2 === 0) ? 1 : -1;
        result[i][j] = sign * this.minor(j, i).determinant() / det; // Note transposed indices
      }
    }
    return new Matrix(result);
  }

  toArray(): number[][] { return this.data.map((row) => [...row]); }
  toString(): string { return this.data.map((row) => row.join("\t")).join("\n"); }
}

// --- Geometry ---

/** Distance between two 2D points */
export function dist2D(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}

/** Distance between two 3D points */
export function dist3D(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2);
}

/** Angle between three points (at vertex b) in radians */
export function angleBetweenPoints(a: [number, number], b: [number, number], c: [number, number]): number {
  const ba = [a[0] - b[0], a[1] - b[1]] as [number, number];
  const bc = [c[0] - b[0], c[1] - b[1]] as [number, number];
  const dot = ba[0] * bc[0] + ba[1] * bc[1];
  const magBA = Math.sqrt(ba[0] ** 2 + ba[1] ** 2);
  const magBC = Math.sqrt(bc[0] ** 2 + bc[1] ** 2);
  if (magBA === 0 || magBC === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (magBA * magBC))));
}

/** Check if point is inside polygon (ray casting algorithm) */
export function pointInPolygon(point: [number, number], polygon: Array<[number, number]>): boolean {
  let inside = false;
  const [px, py] = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]!;
    const [xj, yj] = polygon[j]!;

    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/** Polygon area (Shoelace formula) */
export function polygonArea(polygon: Array<[number, number]>): number {
  if (polygon.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i]![0] * polygon[j]![1];
    area -= polygon[j]![0] * polygon[i]![1];
  }
  return Math.abs(area) / 2;
}

/** Polygon centroid */
export function polygonCentroid(polygon: Array<[number, number]>): [number, number] {
  if (polygon.length === 0) return [0, 0];
  if (polygon.length === 1) return polygon[0]!;
  let cx = 0, cy = 0;
  for (const [x, y] of polygon) { cx += x; cy += y; }
  return [cx / polygon.length, cy / polygon.length];
}

/** Bounding box of points */
export function boundingBox(points: Array<[number, number]>): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

/** Line-line intersection point (or null if parallel) */
export function lineIntersection(
  p1: [number, number], p2: [number, number],
  p3: [number, number], p4: [number, number],
): [number, number] | null {
  const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
  if (Math.abs(d) < 1e-10) return null; // Parallel
  const t = ((p1[0] - p3[0]) * (p3[1] - p4[1]) - (p1[1] - p3[1]) * (p3[0] - p4[0])) / d;
  return [
    p1[0] + t * (p2[0] - p1[0]),
    p1[1] + t * (p2[1] - p1[1]),
  ];
}

// --- Interpolation ---

/** Linear interpolation between a and b at t (0..1) */
export function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Map value from one range to another */
export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/** Smooth step (Hermite interpolation) */
export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Quadratic bezier curve point */
export function bezierQuad(p0: number, p1: number, p2: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

/** Cubic bezier curve point */
export function bezierCubic(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt ** 3 * p0 + 3 * mt ** 2 * t * p1 + 3 * mt * t ** 2 * p2 + t ** 3 * p3;
}

/** Catmull-Rom spline interpolation */
export function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

// --- Number Theory ---

/** Greatest common divisor */
export function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

/** Least common multiple */
export function lcm(a: number, b: number): number { return Math.abs(a * b) / gcd(a, b); }

/** Check if number is prime (deterministic trial division up to sqrt(n)) */
export function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

/** Sieve of Eratosthenes: generate all primes up to limit */
export function sieveOfEratosthenes(limit: number): number[] {
  if (limit < 2) return [];
  const sieve = new Uint8Array(limit + 1);
  const primes: number[] = [];
  for (let i = 2; i <= limit; i++) {
    if (!sieve[i]) {
      primes.push(i);
      for (let j = i * i; j <= limit; j += i) sieve[j] = 1;
    }
  }
  return primes;
}

/** Factorial (iterative, handles up to ~170 before Infinity) */
export function factorial(n: number): number {
  if (n < 0) return NaN;
  if (n > 170) return Infinity;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/** Fibonacci sequence: nth number (iterative O(n)) */
export function fibonacci(n: number): number {
  if (n < 0) return NaN;
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) { [a, b] = [b, a + b]; }
  return b;
}

/** Generate first n Fibonacci numbers */
export function fibonacciSequence(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  const seq = [0, 1];
  while (seq.length < count) seq.push(seq[seq.length - 1]! + seq[seq.length - 2]!);
  return seq;
}

/** Number of combinations: C(n, k) */
export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < k; i++) result = result * (n - i) / (i + 1);
  return Math.round(result);
}

/** Number of permutations: P(n, k) */
export function permutations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 0; i < k; i++) result *= n - i;
  return result;
}

/** Modular exponentiation: base^exp mod m (fast pow) */
export function modPow(base: number, exp: number, mod: number): number {
  let result = 1;
  base %= mod;
  while (exp > 0) {
    if (exp & 1) result = (result * base) % mod;
    exp >>= 1;
    base = (base * base) % mod;
  }
  return result;
}

// --- Unit Conversions ---

/** Angle conversions */
export const angle = {
  degToRad: (deg: number) => deg * (Math.PI / 180),
  radToDeg: (rad: number) => rad * (180 / Math.PI),
  normalizeDeg: (deg: number) => ((deg % 360) + 360) % 360,
  normalizeRad: (rad: number) => ((rad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI),
};

/** Temperature conversions */
export const temperature = {
  celsiusToFahrenheit: (c: number) => c * 9 / 5 + 32,
  fahrenheitToCelsius: (f: number) => (f - 32) * 5 / 9,
  celsiusToKelvin: (c: number) => c + 273.15,
  kelvinToCelsius: (k: number) => k - 273.15,
};

/** Length conversions (base unit: meters) */
export const length = {
  metersToFeet: (m: number) => m * 3.28084,
  feetToMeters: (ft: number) => ft * 0.3048,
  metersToMiles: (m: number) => m * 0.000621371,
  milesToMeters: (mi: number) => mi * 1609.344,
  kmToMiles: (km: number) => km * 0.621371,
  milesToKm: (mi: number) => mi * 1.60934,
  cmToInches: (cm: number) => cm * 0.393701,
  inchesToCm: (inches: number) => inches * 2.54,
};

/** Weight conversions (base unit: kg) */
export const weight = {
  kgToLbs: (kg: number) => kg * 2.20462,
  lbsToKg: (lbs: number) => lbs * 0.453592,
  kgToOunces: (kg: number) => kg * 35.274,
  ouncesToKg: (oz: number) => oz * 0.0283495,
};

// --- Random Distributions ---

/** Normal distribution random using Box-Muller transform */
export function randomNormal(mean = 0, stddev = 1): number {
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z * stddev + mean;
}

/** Uniform random within range [min, max) */
export function randomUniform(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Random integer within [min, max] inclusive */
export function randomInt(min: number, max: number): number {
  return Math.floor(randomUniform(min, max + 1));
}

/** Random element from array */
export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Shuffle array in place (Fisher-Yates) */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Weighted random selection */
export function weightedRandom<T>(items: Array<{ item: T; weight: number }>): T {
  const totalWeight = items.reduce((sum, it) => sum + it.weight, 0);
  let r = Math.random() * totalWeight;
  for (const entry of items) {
    r -= entry.weight;
    if (r <= 0) return entry.item;
  }
  return items[items.length - 1]!.item;
}
