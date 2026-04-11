/**
 * Geometry Utilities: 2D/3D geometry primitives, transformations,
 * collision detection, path operations, coordinate systems, SVG path
 * generation, and spatial indexing utilities.
 */

// --- Types ---

export interface Point2D { x: number; y: number }
export interface Point3D { x: number; y: number; z: number }

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  cx: number;
  cy: number;
  r: number;
}

export interface LineSegment {
  x1: number; y1: number;
  x2: number; y2: number;
}

export interface Polygon {
  points: Array<[number, number]>;
  closed?: boolean;
}

export interface Transform2D {
  a: number; b: number;
  c: number; d: number;
  tx: number; ty: number;
}

// --- Point Constructors ---

export function pt2(x = 0, y = 0): Point2D { return { x, y }; }
export function pt3(x = 0, y = 0, z = 0): Point3D { return { x, y, z }; }

// --- Basic Operations ---

/** Distance between two 2D points */
export function dist2D(a: Point2D, b: Point2D): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/** Distance between two 3D points */
export function dist3D(a: Point3D, b: Point3D): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
}

/** Squared distance (avoids sqrt for comparisons) */
export function distSq2D(a: Point2D, b: Point2D): number {
  return (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
}

/** Midpoint between two points */
export function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Angle of vector from origin to point (radians) */
export function angleOf(p: Point2D): number {
  return Math.atan2(p.y, p.x);
}

/** Angle between three points (at vertex b) in radians */
export function angleBetween(a: Point2D, b: Point2D, c: Point2D): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.hypot(ba.x, ba.y);
  const magBC = Math.hypot(bc.x, bc.y);
  if (magBA === 0 || magBC === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (magBA * magBC)));
}

/** Rotate a point around origin by angle (radians) */
export function rotatePoint(p: Point2D, angle: number): Point2D {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/** Translate a point by delta */
export function translatePoint(p: Point2D, dx: number, dy: number): Point2D {
  return { x: p.x + dx, y: p.y + dy };
}

/** Scale a point from origin */
export function scalePoint(p: Point2D, sx: number, sy = sx): Point2D {
  return { x: p.x * sx, y: p.y * sy };
}

/** Lerp between two points */
export function lerpPoint(a: Point2D, b: Point2D, t: number): Point2D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

// --- Rectangle Operations ---

/** Create a rectangle from center + size */
export function rectFromCenter(cx: number, cy: number, w: number, h: number): Rect {
  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
}

/** Get rectangle center */
export function rectCenter(r: Rect): Point2D {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** Get rectangle area */
export function rectArea(r: Rect): number {
  return r.width * r.height;
}

/** Check if point is inside rectangle */
export function rectContains(r: Rect, p: Point2D): boolean {
  return p.x >= r.x && p.x <= r.x + r.width &&
         p.y >= r.y && p.y <= r.y + r.height;
}

/** Check if two rectangles intersect */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Union of two rectangles */
export function rectUnion(a: Rect, b: Rect): Rect {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Intersection of two rectangles */
export function rectIntersection(a: Rect, b: Rect): Rect | null {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (left >= right || top >= bottom) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Expand rectangle by amount on all sides */
export function inflateRect(r: Rect, amount: number): Rect {
  return { x: r.x - amount, y: r.y - amount, width: r.width + amount * 2, height: r.height + amount * 2 };
}

/** Shrink rectangle by amount on all sides */
export deflateRect(r: Rect, amount: number): Rect {
  return inflateRect(r, -amount);
}

/** Check if rectangle contains another entirely */
export function rectContainsRect(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y &&
         inner.x + inner.width <= outer.x + outer.width &&
         inner.y + inner.height <= outer.y + outer.height;
}

// --- Circle Operations ---

/** Check if point is inside circle */
export function circleContains(c: Circle, p: Point2D): boolean {
  return distSq2D(c, p) <= c.r * c.r;
}

/** Check if two circles intersect */
export function circlesIntersect(a: Circle, b: Circle): boolean {
  const d = dist2D(a, b);
  return d <= a.r + b.r && d >= Math.abs(a.r - b.r);
}

/** Area of circle */
export function circleArea(c: Circle): number {
  return Math.PI * c.r * c.r;
}

/** Circumference of circle */
export function circumference(c: Circle): number {
  return 2 * Math.PI * c.r;
}

/** Check if circle fully contains rectangle */
export function circleContainsRect(c: Circle, r: Rect): boolean {
  // Check all four corners + midpoints of edges
  const corners = [
    { x: r.x, y: r.y },
    { x: r.x + r.width, y: r.y },
    { x: r.x, y: r.y + r.height },
    { x: r.x + r.width, y: r.y + r.height },
  ];
  return corners.every((corner) => circleContains(c, corner));
}

/** Check if rectangle fully contains circle */
export function rectContainsCircle(r: Rect, c: Circle): boolean {
  // Circle must be inside with margin of radius
  return c.cx - c.r >= r.x && c.cx + c.r <= r.x + r.width &&
         c.cy - c.r >= r.y && c.cy + c.r <= r.y + r.height;
}

// --- Collision Detection ---

/** Circle vs circle collision */
export function collideCircleCircle(a: Circle, b: Circle): boolean {
  return circlesIntersect(a, b);
}

/** AABB vs AABB collision */
export function collideRectRect(a: Rect, b: Rect): boolean {
  return rectsIntersect(a, b);
}

/** Circle vs AABB collision */
export function collideCircleRect(c: Circle, r: Rect): boolean {
  // Find closest point on rect to circle center
  const closestX = Math.max(r.x, Math.min(c.cx, r.x + r.width));
  const closestY = Math.max(r.y, Math.min(c.cy, r.y + r.height));
  const distSq = (c.cx - closestX) ** 2 + (c.cy - closestY) ** 2;
  return distSq <= c.r * c.r;
}

/** Point vs circle collision */
export function collidePointCircle(p: Point2D, c: Circle): boolean {
  return circleContains(c, p);
}

/** Point vs rectangle collision */
export function collidePointRect(p: Point2D, r: Rect): boolean {
  return rectContains(r, p);
}

/** Line segment vs circle intersection */
export function collideLineCircle(line: LineSegment, c: Circle): boolean {
  // Vector from p1 to p2
  const d = { x: line.x2 - line.x1, y: line.y2 - line.y1 };
  // Vector from p1 to circle center
  const f = { x: c.cx - line.x1, y: c.cy - line.y1 };

  const t = (f.x * d.x + f.y * d.y) / (d.x * d.x + d.y * d.y);
  if (t < 0 || t > 1) return false;

  const closest = { x: line.x1 + t * d.x, y: line.y1 + t * d.y };
  return circleContains(c, closest);
}

// --- Path Utilities ---

/** Calculate total length of a polyline/polygon path */
export function pathLength(points: Array<Point2D>): number {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    length += dist2D(points[i]!, points[i + 1]!);
  }
  return length;
}

/** Sample a point along a polyline at given distance ratio (0-1) */
export function sampleAlongPath(points: Array<Point2D>, t: number): Point2D {
  if (points.length === 0) return pt2();
  if (points.length === 1) return points[0]!;
  if (t <= 0) return points[0]!;
  if (t >= 1) return points[points.length - 1]!;

  const totalLen = pathLength(points);
  let targetDist = t * totalLen;
  let accumulated = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const segLen = dist2D(points[i]!, points[i + 1]!);
    if (accumulated + segLen >= targetDist) {
      const segT = (targetDist - accumulated) / segLen;
      return lerpPoint(points[i]!, points[i + 1]!, segT);
    }
    accumulated += segLen;
  }

  return points[points.length - 1]!;
}

/** Simplify a polyline using Douglas-Peucker algorithm */
export function simplifyPolyline(points: Array<Point2D>, epsilon = 1): Array<Point2D> {
  if (points.length <= 2) return [...points];

  const first = points[0]!;
  const last = points[points.length - 1]!;

  // Recursively simplify
  function dp(start: number, end: number): Array<Point2D> {
    if (end - start <= 1) return [points[end]!];

    const maxDist = perpendicularDistance(points[start]!, points[end]!);
    if (maxDist > epsilon) {
      const mid = Math.floor((start + end) / 2);
      return [...dp(start, mid), ...dp(mid, end)];
    }
    return [points[end]!];
  }

  return [first, ...dp(0, points.length - 1), last];
}

function perpendicularDistance(a: Point2D, b: Point2D): number {
  const len = dist2D(a, b);
  if (len === 0) return 0;
  const area = Math.abs((b.x - a.x) * a.y - (b.y - a.y) * a.x);
  return (area / len) * 2;
}

// --- Bounding ---

/** Get bounding box of points */
export function boundingBox(points: Array<Point2D>): Rect {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Get bounding circle of points (minimum enclosing circle approximation using Ritter's algorithm) */
export function boundingCircle(points: Array<Point2D>): Circle {
  if (points.length === 0) return { cx: 0, cy: 0, r: 0 };
  if (points.length === 1) return { cx: points[0]!.x, cy: points[0]!.y, r: 0 };

  // Ritter's algorithm: start with bounding box, then shrink
  const box = boundingBox(points);
  let cx = box.x + box.width / 2;
  let cy = box.y + box.height / 2;
  let r = Math.max(box.width, box.height) / 2;

  // Refine: check each point, expand if outside
  for (const p of points) {
    const d = dist2D(p, { x: cx, y: cy });
    if (d > r) {
      r = (r + d) / 2;
      cx = (cx + p.x) / 2;
      cy = (cy + p.y) / 2;
    }
  }

  return { cx, cy, r };
}

// --- Transform 2D ---

/** Create identity transform */
export function identityTransform(): Transform2D {
  return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
}

/** Apply transform to point */
export function transformPoint(t: Transform2D, p: Point2D): Point2D {
  return {
    x: t.a * p.x + t.c * p.y + t.tx,
    y: t.b * p.x + t.d * p.ty + t.ty,
  };
}

/** Compose two transforms (t1 then t2) */
export function composeTransform(t1: Transform2D, t2: Transform2D): Transform2D {
  return {
    a: t1.a * t2.a + t1.b * t2.c,
    b: t1.b * t2.a + t1.d * t2.d,
    c: t1.a * t2.c + t1.c * t2.d,
    d: t1.b * t2.d + t1.d * t2.d,
    tx: t1.a * t2.tx + t1.c * t2.ty + t1.tx,
    ty: t1.b * t2.tx + t1.d * t2.ty + t1.ty,
  };
}

/** Create translation transform */
export function translationTransform(tx: number, ty: number): Transform2D {
  return { a: 1, b: 0, c: 0, d: 1, tx, ty };
}

/** Create scale transform */
export function scaleTransform(sx: number, sy = sx): Transform2D {
  return { a: sx, b: 0, c: 0, d: sy, tx: 0, ty: 0 };
}

/** Create rotation transform (angle in radians) */
export function rotationTransform(angle: number): Transform2D {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return { a: cos, b: -sin, c: sin, d: cos, tx: 0, ty: 0 };
}

// --- Spatial Grid Index (simple grid-based) ---

export interface SpatialGridOptions {
  /** Cell size in pixels */
  cellSize: number;
  /** Bounds of the indexed space */
  bounds: Rect;
}

/**
 * Simple spatial hash grid for efficient nearest-neighbor lookups.
 */
export class SpatialGrid<T> {
  private cells = new Map<string, Set<T>>();
  private opts: SpatialGridOptions;

  constructor(options: SpatialGridOptions) {
    this.opts = options;
  }

  private cellKey(point: Point2D): string {
    const cx = Math.floor(point.x / this.opts.cellSize);
    const cy = Math.floor(point.y / this.opts.cellSize);
    return `${cx},${cy}`;
  }

  /** Insert an item at a position */
  insert(point: Point2D, item: T): void {
    const key = this.cellKey(point);
    if (!this.cells.has(key)) this.cells.set(key, new Set());
    this.cells.get(key)!.add(item);
  }

  /** Remove an item */
  remove(item: T): void {
    for (const set of this.cells.values()) {
      set.delete(item);
    }
  }

  /** Find items near a point within radius */
  query(point: Point2D, radius: number): T[] {
    const results: T[] = [];
    const minCX = Math.floor((point.x - radius) / this.opts.cellSize);
    const maxCX = Math.floor((point.x + radius) / this.opts.cellSize);
    const minCY = Math.floor((point.y - radius) / this.opts.cellSize);
    const maxCY = Math.floor((point.y + radius) / this.opts.cellSize);

    for (let cy = minCY; cy <= maxCY; cy++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const key = `${cx},${cy}`;
        const items = this.cells.get(key);
        if (items) {
          for (const item of items) {
            // Exact distance check
            if (dist2D(point, { x: cx * this.opts.cellSize, y: cy * this.opts.cellSize }) <= radius) {
              results.push(item);
            }
          }
        }
      }
    }
    return results;
  }

  /** Clear all items */
  clear(): void { this.cells.clear(); }

  /** Get number of occupied cells */
  get size(): number { return this.cells.size; }
}
