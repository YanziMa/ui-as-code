/**
 * Coordinate system and geometry utilities: point/rect/box math,
 * collision detection, coordinate transforms, viewport-relative positioning,
 * and 2D geometry calculations.
 */

// --- Types ---

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Circle {
  cx: number;
  cy: number;
  radius: number;
}

export interface Line {
  start: Point2D;
  end: Point2D;
}

// --- Point Math ---

/** Add two points */
export function addPoints(a: Point2D, b: Point2D): Point2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Subtract two points */
export function subPoints(a: Point2D, b: Point2D): Point2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Multiply point by scalar */
export function scalePoint(p: Point2D, s: number): Point2D {
  return { x: p.x * s, y: p.y * s };
}

/** Distance between two points */
export function distance(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Squared distance (avoids sqrt for comparisons) */
export function distanceSquared(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/** Midpoint between two points */
export function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Angle from point A to point B in radians */
export function angleBetween(a: Point2D, b: Point2D): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Angle from point A to point B in degrees */
export function angleBetweenDeg(a: Point2D, b: Point2D): number {
  return angleBetween(a, b) * (180 / Math.PI);
}

/** Rotate a point around origin by radians */
export function rotatePoint(p: Point2D, angle: number): Point2D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/** Rotate a point around a center by radians */
export function rotatePointAround(p: Point2D, center: Point2D, angle: number): Point2D {
  const translated = subPoints(p, center);
  const rotated = rotatePoint(translated, angle);
  return addPoints(rotated, center);
}

/** Linear interpolation between two points */
export function lerpPoint(a: Point2D, b: Point2D, t: number): Point2D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/** Bezier curve point (quadratic) */
export function quadraticBezier(p0: Point2D, p1: Point2D, p2: Point2D, t: number): Point2D {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

/** Bezier curve point (cubic) */
export function cubicBezier(
  p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, t: number,
): Point2D {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
}

// --- Rect Math ---

/** Create rect from center and size */
export function rectFromCenter(center: Point2D, size: Size): Rect {
  return {
    x: center.x - size.width / 2,
    y: center.y - size.height / 2,
    width: size.width,
    height: size.height,
  };
}

/** Convert Rect to Box (left/top/right/bottom) */
export function rectToBox(r: Rect): Box {
  return { left: r.x, top: r.y, right: r.x + r.width, bottom: r.y + r.height };
}

/** Convert Box to Rect */
export function boxToRect(b: Box): Rect {
  return { x: b.left, y: b.top, width: b.right - b.left, height: b.bottom - b.top };
}

/** Get center of a rect */
export function rectCenter(r: Rect): Point2D {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** Get area of a rect */
export function rectArea(r: Rect): number {
  return r.width * r.height;
}

/** Get perimeter of a rect */
export function rectPerimeter(r: Rect): number {
  return 2 * (r.width + r.height);
}

/** Check if point is inside rect */
export function pointInRect(p: Point2D, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

/** Check if point is inside box */
export function pointInBox(p: Point2D, b: Box): boolean {
  return p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
}

/** Check if two rects intersect */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Get intersection rect of two rects */
export function intersectionRect(a: Rect, b: Rect): Rect | null {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  if (x2 < x1 || y2 < y1) return null;

  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/** Get union rect of two rects */
export function unionRect(a: Rect, b: Rect): Rect {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.width, b.x + b.width);
  const y2 = Math.max(a.y + a.height, b.y + b.height);

  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/** Expand rect by amount on all sides */
export function inflateRect(r: Rect, amount: number): Rect {
  return {
    x: r.x - amount,
    y: r.y - amount,
    width: r.width + 2 * amount,
    height: r.height + 2 * amount,
  };
}

/** Shrink rect by amount on all sides */
export function deflateRect(r: Rect, amount: number): Rect {
  return inflateRect(r, -amount);
}

/** Check if rect A fully contains rect B */
export function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

// --- Collision Detection ---

/** Check if two circles collide */
export function circlesCollide(a: Circle, b: Circle): boolean {
  const dist = distance({ x: a.cx, y: a.cy }, { x: b.cx, y: b.cy });
  return dist <= a.radius + b.radius;
}

/** Check if circle and rect collide */
export function circleRectCollide(c: Circle, r: Rect): boolean {
  const closestX = Math.max(r.x, Math.min(c.cx, r.x + r.width));
  const closestY = Math.max(r.y, Math.min(c.cy, r.y + r.height));
  const dx = c.cx - closestX;
  const dy = c.cy - closestY;
  return dx * dx + dy * dy <= c.radius * c.radius;
}

/** Check if point is inside circle */
export function pointInCircle(p: Point2D, c: Circle): boolean {
  return distance(p, { x: c.cx, y: c.cy }) <= c.radius;
}

/** Check if two line segments intersect */
export function linesIntersect(a: Line, b: Line): Point2D | null {
  const d = (b.end.x - b.start.x) * (a.start.y - a.end.y) - (a.end.x - a.start.x) * (b.start.y - b.end.y);
  if (d === 0) return null; // Parallel

  const t = ((b.start.y - a.end.y) * (a.end.x - a.start.x) - (a.end.x - a.start.x) * (b.start.y - a.end.y)) / d;
  const u = ((b.start.y - a.end.y) * (b.end.x - a.start.x) - (a.end.x - a.start.x) * (b.start.y - b.end.y)) / d;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: a.start.x + t * (a.end.x - a.start.x),
      y: a.start.y + t * (a.end.y - a.start.y),
    };
  }

  return null;
}

// -- Coordinate Transforms --

/** Convert page coordinates to viewport coordinates */
export function pageToViewport(point: Point2D): Point2D {
  return {
    x: point.x - window.scrollX,
    y: point.y - window.scrollY,
  };
}

/** Convert viewport coordinates to page coordinates */
export function viewportToPage(point: Point2D): Point2D {
  return {
    x: point.x + window.scrollX,
    y: point.y + window.scrollY,
  };
}

/** Convert client (mouse) coordinates to page coordinates */
export function clientToPage(clientX: number, clientY: number): Point2D {
  // Handle scrolled elements if needed; for document-level this is simple
  return {
    x: clientX + window.scrollX,
    y: clientY + window.scrollY,
  };
}

/** Get element's position relative to viewport */
export function getElementViewportPosition(el: Element): Point2D {
  const rect = el.getBoundingClientRect();
  return { x: rect.left, y: rect.top };
}

/** Get element's position relative to document */
export function getElementPagePosition(el: Element): Point2D {
  const vp = getElementViewportPosition(el);
  return viewportToPage(vp);
}

/** Convert point from one element's coordinate space to another */
export function transformPoint(
  point: Point2D,
  fromEl: Element,
  toEl: Element,
): Point2D {
  const fromPos = getElementPagePosition(fromEl);
  const toPos = getElementPagePosition(toEl);
  return {
    x: point.x + (toPos.x - fromPos.x),
    y: point.y + (toPos.y - fromPos.y),
  };
}

// --- Geometry Helpers ---

/** Calculate area of a polygon given its vertices */
export function polygonArea(vertices: Point2D[]): number {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

/** Check if a point is inside a polygon (ray casting algorithm) */
export function pointInPolygon(point: Point2D, vertices: Point2D[]): boolean {
  let inside = false;
  const n = vertices.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = ((yi > yj) !== (point.y > yj))
      && (point.x < (xj - xi) * (point.y - yj) / (yi - yj) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Get bounding box of multiple points */
export function boundingBox(points: Point2D[]): Box | null {
  if (points.length === 0) return null;

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return { left: minX, top: minY, right: maxX, bottom: maxY };
}

/** Get bounding rect of an element (including scroll) */
export function getBoundingRect(el: Element): Rect {
  const rect = el.getBoundingClientRect();
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
}

/** Clamp a point within a rect */
export function clampPointToRect(p: Point2D, r: Rect): Point2D {
  return {
    x: Math.max(r.x, Math.min(p.x, r.x + r.width)),
    y: Math.max(r.y, Math.min(p.y, r.y + r.height)),
  };
}

/** Normalize an angle to [0, 2π) range */
export function normalizeAngle(rad: number): number {
  rad = rad % (2 * Math.PI);
  if (rad < 0) rad += 2 * Math.PI;
  return rad;
}

/** Convert degrees to radians */
export function degToRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/** Convert radians to degrees */
export function radToDeg(rad: number): number {
  return rad * (180 / Math.PI);
}
