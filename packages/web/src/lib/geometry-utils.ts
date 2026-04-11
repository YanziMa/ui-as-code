/**
 * 2D Geometry Utilities: Points, lines, rectangles, circles, polygons,
 * collision detection, transformations, path operations, and spatial queries.
 */

// --- Types ---

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  cx: number;
  cy: number;
  radius: number;
}

export interface Line {
  p1: Point;
  p2: Point;
}

export interface Size {
  width: number;
  height: number;
}

export interface Transform2D {
  a: number; b: number; c: number;
  d: number; e: number; f: number;
}

// --- Point Operations ---

/** Create a point */
export function pt(x: number, y: number): Point { return { x, y }; }

/** Add two points */
export function addPoints(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Subtract point b from a */
export function subPoints(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Scale a point by scalar */
export function scalePoint(p: Point, s: number): Point {
  return { x: p.x * s, y: p.y * s };
}

/** Distance between two points */
export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Squared distance (faster, no sqrt) */
export function distanceSq(a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/** Midpoint between two points */
export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Angle from point a to point b in radians */
export function angleTo(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Linearly interpolate between two points */
export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Rotate a point around an origin */
export function rotatePoint(p: Point, origin: Point, angleRad: number): Point {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

/** Reflect a point across a line defined by two points */
export function reflectPoint(p: Point, lineA: Point, lineB: Point): Point {
  const dx = lineB.x - lineA.x;
  const dy = lineB.y - lineA.y;
  const t = ((p.x - lineA.x) * dx + (p.y - lineA.y) * dy) / (dx * dx + dy * dy);
  const closest = { x: lineA.x + t * dx, y: lineA.y + t * dy };
  return { x: 2 * closest.x - p.x, y: 2 * closest.y - p.y };
}

// --- Rectangle Operations ---

/** Create a rectangle */
export function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, width: w, height: h };
}

/** Get the center of a rectangle */
export function rectCenter(r: Rect): Point {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** Get the four corners of a rectangle */
export function rectCorners(r: Rect): [Point, Point, Point, Point] {
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.width, y: r.y },
    { x: r.x + r.width, y: r.y + r.height },
    { x: r.x, y: r.y + r.height },
  ];
}

/** Check if a point is inside a rectangle */
export function pointInRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.width &&
         p.y >= r.y && p.y <= r.y + r.height;
}

/** Check if two rectangles intersect */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Get intersection rectangle of two rectangles (or null if no overlap) */
export function rectIntersection(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.width, b.x + b.width) - x;
  const h = Math.min(a.y + a.height, b.y + b.height) - y;
  if (w <= 0 || h <= 0) return null;
  return { x, y, width: w, height: h };
}

/** Union of two rectangles (bounding box containing both) */
export function rectUnion(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.width, b.x + b.width);
  const y2 = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: x2 - x, height: y2 - y };
}

/** Inflate a rectangle by amount on all sides */
export function inflateRect(r: Rect, amount: number): Rect {
  return { x: r.x - amount, y: r.y - amount, width: r.width + 2 * amount, height: r.height + 2 * amount };
}

/** Area of a rectangle */
export function rectArea(r: Rect): number { return r.width * r.height; }

/** Perimeter of a rectangle */
export function rectPerimeter(r: Rect): number { return 2 * (r.width + r.height); }

/** Aspect ratio of a rectangle */
export function rectAspectRatio(r: Rect): number { return r.width / r.height; }

/** Check if rectangle contains another rectangle entirely */
export function rectContainsRect(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y &&
         inner.x + inner.width <= outer.x + outer.width &&
         inner.y + inner.height <= outer.y + outer.height;
}

// --- Circle Operations ---

/** Create a circle */
export function circle(cx: number, cy: number, radius: number): Circle {
  return { cx, cy, radius };
}

/** Check if a point is inside a circle */
export function pointInCircle(p: Point, c: Circle): boolean {
  return distanceSq(p, { x: c.cx, y: c.cy }) <= c.radius * c.radius;
}

/** Check if two circles intersect */
export function circlesIntersect(a: Circle, b: Circle): boolean {
  const d = distance({ x: a.cx, y: a.cy }, { x: b.cx, y: b.cy });
  return d <= a.radius + b.radius;
}

/** Intersection points of two circles (0, 1, or 2 points) */
export function circleCircleIntersections(a: Circle, b: Circle): Point[] {
  const d = distance({ x: a.cx, y: a.cy }, { x: b.cx, y: b.cy });
  if (d > a.radius + b.radius || d < Math.abs(a.radius - b.radius)) return [];
  if (d === 0 && a.radius === b.radius) return []; // Coincident

  const a2 = (a.radius * a.radius - b.radius * b.radius + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, a.radius * a.radius - a2 * a2));

  const px = a.cx + a2 * (b.cx - a.cx) / d;
  const py = a.cy + a2 * (b.cy - a.cy) / d;

  if (h < 1e-10) return [{ x: px, y: py }];

  return [
    { x: px + h * (b.cy - a.cy) / d, y: py - h * (b.cx - a.cx) / d },
    { x: px - h * (b.cy - a.cy) / d, y: py + h * (b.cx - a.cx) / d },
  ];
}

/** Area of a circle */
export function circleArea(c: Circle): number { return Math.PI * c.radius * c.radius; }

/** Circumference of a circle */
export function circleCircumference(c: Circle): number { return 2 * Math.PI * c.radius; }

/** Check if circle and rectangle overlap */
export function circleRectOverlap(c: Circle, r: Rect): boolean {
  const closestX = Math.max(r.x, Math.min(c.cx, r.x + r.width));
  const closestY = Math.max(r.y, Math.min(c.cy, r.y + r.height));
  return distanceSq({ x: c.cx, y: c.cy }, { x: closestX, y: closestY }) <= c.radius * c.radius;
}

// --- Line Operations ---

/** Distance from point to line segment */
export function pointToLineDistance(p: Point, line: Line): number {
  const { p1, p2 } = line;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return distance(p, p1);

  let t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const proj = { x: p1.x + t * dx, y: p1.y + t * dy };
  return distance(p, proj);
}

/** Closest point on line segment to given point */
export function closestPointOnLine(p: Point, line: Line): Point {
  const { p1, p2 } = line;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return { ...p1 };

  let t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return { x: p1.x + t * dx, y: p1.y + t * dy };
}

/** Intersection of two line segments (or null if parallel/no intersection) */
export function lineSegmentIntersection(l1: Line, l2: Line): Point | null {
  const { p1: a, p2: b } = l1;
  const { p1: c, p2: d } = l2;

  const denom = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x);
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)) / denom;
  const u = -((a.x - b.x) * (a.y - c.y) - (a.y - b.y) * (a.x - c.x)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  }
  return null;
}

/** Length of a line segment */
export function lineLength(line: Line): number {
  return distance(line.p1, line.p2);
}

/** Get the bounding box of a line segment */
export function lineBoundingBox(line: Line): Rect {
  const minX = Math.min(line.p1.x, line.p2.x);
  const minY = Math.min(line.p1.y, line.p2.y);
  const maxX = Math.max(line.p1.x, line.p2.x);
  const maxY = Math.max(line.p1.y, line.p2.y);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// --- Polygon Operations ---

/** Check if point is inside polygon (ray casting) */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.x, yi = polygon[i]!.y;
    const xj = polygon[j]!.x, yj = polygon[j]!.y;
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/** Polygon area using Shoelace formula (positive = clockwise, negative = counter-clockwise) */
export function polygonArea(polygon: Point[]): number {
  if (polygon.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i]!.x * polygon[j]!.y;
    area -= polygon[j]!.x * polygon[i]!.y;
  }
  return Math.abs(area) / 2;
}

/** Polygon centroid (arithmetic mean of vertices) */
export function polygonCentroid(polygon: Point[]): Point {
  if (polygon.length === 0) return { x: 0, y: 0 };
  let cx = 0, cy = 0;
  for (const p of polygon) { cx += p.x; cy += p.y; }
  return { x: cx / polygon.length, y: cy / polygon.length };
}

/** Bounding box of a polygon */
export function polygonBoundingBox(polygon: Point[]): Rect {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of polygon) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Convex hull of points (Graham scan algorithm) */
export function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return [...points];

  // Find lowest point (by y, then x)
  const sorted = [...points].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
  const pivot = sorted[0]!;

  // Sort by polar angle
  const rest = sorted.slice(1).sort((a, b) => {
    const angA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
    const angB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
    if (angA !== angB) return angA - angB;
    return distance(pivot, a) - distance(pivot, b);
  });

  const stack: Point[] = [pivot];

  for (const p of rest) {
    while (stack.length > 1) {
      const top = stack[stack.length - 1]!;
      const nextToTop = stack[stack.length - 2]!;
      const cross = (top.x - nextToTop.x) * (p.y - nextToTop.y) -
                     (top.y - nextToTop.y) * (p.x - nextToTop.x);
      if (cross <= 0) stack.pop();
      else break;
    }
    stack.push(p);
  }

  return stack;
}

/** Simplify a polyline using Douglas-Peucker algorithm */
export function simplifyPolyline(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return [...points];

  // Find point farthest from line between first and last
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0]!;
  const last = points[points.length - 1]!;

  for (let i = 1; i < points.length - 1; i++) {
    const d = pointToLineDistance(points[i]!, { p1: first, p2: last });
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }

  if (maxDist > epsilon) {
    const left = simplifyPolyline(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyPolyline(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

// --- Collision Detection ---

/** Broad-phase AABB check: do bounding boxes overlap? */
export function aabbOverlap(a: Rect, b: Rect): boolean {
  return rectsIntersect(a, b);
}

/** Check collision between any two shapes (point/circle/rect/polygon) */
export function checkCollision(
  shapeA: { type: "point" | "circle" | "rect" | "polygon"; data: Point | Circle | Rect | Point[] },
  shapeB: { type: "point" | "circle" | "rect" | "polygon"; data: Point | Circle | Rect | Point[] },
): boolean {
  // Point vs ...
  if (shapeA.type === "point") {
    const p = shapeA.data as Point;
    switch (shapeB.type) {
      case "point": return (shapeB.data as Point).x === p.x && (shapeB.data as Point).y === p.y;
      case "circle": return pointInCircle(p, shapeB.data as Circle);
      case "rect": return pointInRect(p, shapeB.data as Rect);
      case "polygon": return pointInPolygon(p, shapeB.data as Point[]);
    }
  }

  // Circle vs ...
  if (shapeA.type === "circle") {
    const c = shapeA.data as Circle;
    switch (shapeB.type) {
      case "circle": return circlesIntersect(c, shapeB.data as Circle);
      case "rect": return circleRectOverlap(c, shapeB.data as Rect);
      case "polygon":
        // Approximate: check against each edge and point-in-polygon
        const poly = shapeB.data as Point[];
        if (pointInPolygon({ x: c.cx, y: c.cy }, poly)) return true;
        for (let i = 0; i < poly.length; i++) {
          if (pointToLineDistance({ x: c.cx, y: c.cy }, { p1: poly[i]!, p2: poly[(i + 1) % poly.length]! }) <= c.radius)
            return true;
        }
        return false;
    }
  }

  // Rect vs ...
  if (shapeA.type === "rect") {
    const r = shapeA.data as Rect;
    switch (shapeB.type) {
      case "rect": return rectsIntersect(r, shapeB.data as Rect);
      case "polygon":
        // SAT-lite: check rect corners inside polygon OR polygon vertices inside rect
        const poly = shapeB.data as Point[];
        const corners = rectCorners(r);
        for (const corner of corners) if (pointInPolygon(corner, poly)) return true;
        for (const vertex of poly) if (pointInRect(vertex, r)) return true;
        return false;
    }
  }

  // Polygon vs polygon (basic check via bounding boxes + point containment)
  if (shapeA.type === "polygon" && shapeB.type === "polygon") {
    const pa = shapeA.data as Point[];
    const pb = shapeB.data as Point[];
    const bbA = polygonBoundingBox(pa);
    const bbB = polygonBoundingBox(pb);
    if (!rectsIntersect(bbA, bbB)) return false;
    for (const v of pa) if (pointInPolygon(v, pb)) return true;
    for (const v of pb) if (pointInPolygon(v, pa)) return true;
    return false;
  }

  return false;
}

// --- Transformations ---

/** Create identity transform matrix (2D affine: a b c d e f) */
export function identityTransform(): Transform2D {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

/** Translate transform */
export function translateTransform(tx: number, ty: number): Transform2D {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
}

/** Scale transform */
export function scaleTransform(sx: number, sy: number): Transform2D {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

/** Rotate transform (radians) */
export function rotateTransform(angleRad: number): Transform2D {
  const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

/** Compose two transforms (apply b then a) */
export function composeTransforms(a: Transform2D, b: Transform2D): Transform2D {
  return {
    a: a.a * b.a + a.c * b.b,
    b: a.b * b.a + a.d * b.b,
    c: a.a * b.c + a.c * b.d,
    d: a.b * b.c + a.d * b.d,
    e: a.a * b.e + a.c * b.f + a.e,
    f: a.b * b.e + a.d * b.f + a.f,
  };
}

/** Apply transform to a point */
export function transformPoint(t: Transform2D, p: Point): Point {
  return {
    x: t.a * p.x + t.c * p.y + t.e,
    y: t.b * p.x + t.d * p.y + t.f,
  };
}

/** Invert a transform */
export function invertTransform(t: Transform2D): Transform2D {
  const det = t.a * t.d - t.c * t.b;
  if (Math.abs(det) < 1e-10) throw new Error("Transform is not invertible");
  return {
    a: t.d / det,
    b: -t.b / det,
    c: -t.c / det,
    d: t.a / det,
    e: (t.c * t.f - t.d * t.e) / det,
    f: -(t.a * t.f - t.b * t.e) / det,
  };
}

// --- Path & SVG Helpers ---

/** Generate an SVG path string from points */
export function pointsToPath(points: Point[], closed = false): string {
  if (points.length === 0) return "";
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i]!.x} ${points[i]!.y}`;
  }
  if (closed) d += " Z";
  return d;
}

/** Generate arc path data for SVG */
export function arcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const startX = cx + radius * Math.cos(startAngle);
  const startY = cy + radius * Math.sin(startAngle);
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy + radius * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
}

/** Generate rounded rectangle path for SVG */
export function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  return `M ${x + rr} ${y}
          L ${x + w - rr} ${y} Q ${x + w} ${y} ${x + w} ${y + rr}
          L ${x + w} ${y + h - rr} Q ${x + w} ${y + h} ${x + w - rr} ${y + h}
          L ${x + rr} ${y + h} Q ${x} ${y + h} ${x} ${y + h - rr}
          L ${x} ${y + rr} Q ${x} ${y} ${x + rr} ${y} Z`;
}

// --- Spatial Queries ---

/** Simple grid-based spatial hash for broad-phase collision detection */
export class SpatialHash {
  private cellSize: number;
  private grid = new Map<string, Set<{ id: string; bounds: Rect }>>();

  constructor(cellSize = 64) {
    this.cellSize = cellSize;
  }

  private key(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }

  /** Insert an item into the spatial hash */
  insert(id: string, bounds: Rect): void {
    const cells = this.getCellKeys(bounds);
    const item = { id, bounds };
    for (const k of cells) {
      if (!this.grid.has(k)) this.grid.set(k, new Set());
      this.grid.get(k)!.add(item);
    }
  }

  /** Remove an item from the spatial hash */
  remove(id: string): void {
    for (const [, set] of this.grid) {
      for (const item of set) {
        if (item.id === id) { set.delete(item); break; }
      }
    }
  }

  /** Query items that might overlap with the given bounds */
  query(bounds: Rect): Array<{ id: string; bounds: Rect }> {
    const result: Array<{ id: string; bounds: Rect }> = [];
    const seen = new Set<string>();
    const cells = this.getCellKeys(bounds);

    for (const k of cells) {
      const set = this.grid.get(k);
      if (!set) continue;
      for (const item of set) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          result.push(item);
        }
      }
    }

    return result;
  }

  /** Clear all entries */
  clear(): void { this.grid.clear(); }

  /** Get total number of stored items (approximate) */
  get size(): number {
    let count = 0;
    for (const [, set] of this.grid) count += set.size;
    return count;
  }

  private getCellKeys(bounds: Rect): string[] {
    const keys: Set<string> = new Set();
    const startX = Math.floor(bounds.x / this.cellSize);
    const startY = Math.floor(bounds.y / this.cellSize);
    const endX = Math.floor((bounds.x + bounds.width) / this.cellSize);
    const endY = Math.floor((bounds.y + bounds.height) / this.cellSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        keys.add(`${x},${y}`);
      }
    }

    return [...keys];
  }
}
