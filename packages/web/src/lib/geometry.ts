/**
 * Geometry / spatial math utilities for UI calculations.
 */

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

export interface Size {
  width: number;
  height: number;
}

/** Distance between two points */
export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Squared distance (faster, no sqrt) */
export function distanceSquared(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Midpoint between two points */
export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Angle between two points (in radians) */
export function angle(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Convert degrees to radians */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Convert radians to degrees */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Check if point is inside rectangle */
export function pointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/** Get center of rectangle */
export function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Check if two rectangles intersect */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

/** Intersection of two rectangles */
export function rectIntersection(a: Rect, b: Rect): Rect | null {
  if (!rectsIntersect(a, b)) return null;
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.width, b.x + b.width) - x;
  const h = Math.min(a.y + a.height, b.y + b.height) - y;
  return { x, y, width: w, height: h };
}

/** Bounding rectangle of multiple points */
export function boundingRect(points: Point[]): Rect | null {
  if (points.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Scale a rectangle from its center */
export function scaleRect(rect: Rect, scale: number): Rect {
  const newW = rect.width * scale;
  const newH = rect.height * scale;
  return {
    x: rect.x - (newW - rect.width) / 2,
    y: rect.y - (newH - rect.height) / 2,
    width: newW,
    height: newH,
  };
}

/** Clamp point within rectangle bounds */
export function clampPoint(point: Point, bounds: Rect): Point {
  return {
    x: Math.max(bounds.x, Math.min(bounds.x + bounds.width, point.x)),
    y: Math.max(bounds.y, Math.min(bounds.y + bounds.height, point.y)),
  };
}

/** Aspect ratio of a size */
export function aspectRatio(size: Size): number {
  return size.height !== 0 ? size.width / size.height : 1;
}

/** Fit size into container while maintaining aspect ratio */
export function fitSize(inner: Size, outer: Size, mode: "contain" | "cover" = "contain"): Size {
  const innerRatio = aspectRatio(inner);
  const outerRatio = aspectRatio(outer);

  let width: number, height: number;

  if (mode === "contain") {
    width = outerRatio > innerRatio ? outer.width : outer.height * innerRatio;
    height = outerRatio > innerRatio ? outer.width / innerRatio : outer.height;
  } else {
    width = outerRatio < innerRatio ? outer.width : outer.height * innerRatio;
    height = outerRatio < innerRatio ? outer.width / innerRatio : outer.height;
  }

  return { width, height };
}
