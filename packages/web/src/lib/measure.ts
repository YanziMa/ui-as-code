/**
 * DOM Measurement Utilities: Element dimensions, viewport info, intersection detection,
 * position calculation, size comparison, visibility checks, and responsive breakpoints.
 */

// --- Types ---

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Offset {
  top: number;
  left: number;
}

export interface ViewportInfo {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
  dpr: number; // device pixel ratio
}

export interface ElementInfo {
  rect: Rect;
  size: Size;
  offset: Offset; // relative to viewport
  isVisible: boolean;
  isFullyVisible: boolean;
  scrollParent: HTMLElement | null;
}

// --- Core Measurements ---

/** Get the bounding rectangle of an element */
export function getRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return {
    x: r.left,
    y: r.top,
    width: r.width,
    height: r.height,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    left: r.left,
  };
}

/** Get element dimensions */
export function getSize(el: HTMLElement): Size {
  return { width: el.offsetWidth, height: el.offsetHeight };
}

/** Get element position relative to viewport */
export function getPosition(el: HTMLElement): Position {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top };
}

/** Get element's offset from a parent or document */
export function getOffset(el: HTMLElement, relativeTo?: HTMLElement | null): Offset {
  let top = 0;
  let left = 0;

  if (relativeTo) {
    const elRect = el.getBoundingClientRect();
    const refRect = relativeTo.getBoundingClientRect();
    top = elRect.top - refRect.top + relativeTo.scrollTop;
    left = elRect.left - refRect.left + relativeTo.scrollLeft;
  } else {
    while (el && el !== document.body) {
      top += el.offsetTop || 0;
      left += el.offsetLeft || 0;
      // Handle positioned elements
      const style = getComputedStyle(el);
      if (style.position === "fixed") break;
      el = el.offsetParent as HTMLElement;
      if (!el) break;
    }
  }

  return { top, left };
}

/** Get current viewport information */
export function getViewport(): ViewportInfo {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX || window.pageXOffset,
    scrollY: window.scrollY || window.pageYOffset,
    dpr: window.devicePixelRatio || 1,
  };
}

/** Get comprehensive element info */
export function getElementInfo(el: HTMLElement): ElementInfo {
  const rect = getRect(el);
  const vp = getViewport();

  return {
    rect,
    size: { width: rect.width, height: rect.height },
    offset: { top: rect.top, left: rect.left },
    isVisible: isElementVisible(el),
    isFullyVisible: isElementFullyVisible(el),
    scrollParent: findScrollParent(el),
  };
}

// --- Visibility Checks ---

/** Check if any part of element is visible in viewport */
export function isElementVisible(el: HTMLElement, threshold = 0): boolean {
  const rect = el.getBoundingClientRect();
  const vp = getViewport();

  const visibleHeight = Math.min(rect.bottom, vp.height) - Math.max(rect.top, 0);
  const visibleWidth = Math.min(rect.right, vp.width) - Math.max(rect.left, 0);

  if (threshold > 0) {
    const area = rect.width * rect.height;
    const visibleArea = Math.max(0, visibleWidth) * Math.max(0, visibleHeight);
    return area > 0 && (visibleArea / area) >= threshold;
  }

  return visibleHeight > 0 && visibleWidth > 0;
}

/** Check if element is fully visible in viewport */
export function isElementFullyVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const vp = getViewport();

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= vp.height &&
    rect.right <= vp.width
  );
}

/** Check if element overlaps another element */
export function isOverlapping(a: HTMLElement, b: HTMLElement): boolean {
  const ra = a.getBoundingClientRect();
  const rb = b.getBoundingClientRect();

  return !(
    ra.right < rb.left ||
    ra.left > rb.right ||
    ra.bottom < rb.top ||
    ra.top > rb.bottom
  );
}

/** Check if point is inside element */
export function containsPoint(el: HTMLElement, x: number, y: number): boolean {
  const rect = el.getBoundingClientRect();
  return (
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom
  );
}

/** Check if element contains another element */
export function containsElement(parent: HTMLElement, child: HTMLElement): boolean {
  return parent.contains(child);
}

// --- Scroll Parent ---

/** Find the nearest scrollable ancestor of an element */
export function findScrollParent(el: HTMLElement): HTMLElement | null {
  let parent: HTMLElement | null = el.parentElement;

  while (parent && parent !== document.body) {
    const style = getComputedStyle(parent);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;

    if ((overflowY === "auto" || overflowY === "scroll" || overflowX === "auto" || overflowX === "scroll") &&
        parent.scrollHeight > parent.clientHeight) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
}

/** Scroll element into view with options */
export function scrollIntoView(
  el: HTMLElement,
  options: { behavior?: "smooth" | "instant"; block?: "start" | "center" | "end" | "nearest"; inline?: "start" | "center" | "end" | "nearest" } = {},
): void {
  el.scrollIntoView({
    behavior: options.behavior ?? "smooth",
    block: options.block ?? "nearest",
    inline: options.inline ?? "nearest",
  });
}

// --- Comparison & Math ---

/** Check if two rectangles intersect */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

/** Get the intersection rectangle of two rectangles */
export function getIntersection(a: Rect, b: Rect): Rect | null {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);

  if (left <= right && top <= bottom) {
    return { x: left, y: top, width: right - left, height: bottom - top, top, right, bottom, left };
  }

  return null;
}

/** Calculate distance between two points */
export function distance(p1: Position, p2: Position): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Calculate center point of an element */
export function getCenter(el: HTMLElement): Position {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Calculate aspect ratio of an element */
export function getAspectRatio(el: HTMLElement): number {
  const { width, height } = getSize(el);
  return height > 0 ? width / height : 1;
}

/** Compare two sizes for similarity (returns 0-1 where 1 = identical) */
export function sizeSimilarity(a: Size, b: Size): number {
  const wDiff = Math.abs(a.width - b.width) / Math.max(a.width, b.width, 1);
  const hDiff = Math.abs(a.height - b.height) / Math.max(a.height, b.height, 1);
  return 1 - (wDiff + hDiff) / 2;
}

// --- Responsive Helpers ---

/** Current breakpoint name based on common conventions */
export type BreakpointName = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface BreakpointConfig {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  "2xl"?: number;
}

const DEFAULT_BREAKPOINTS: BreakpointConfig = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

/** Get current breakpoint based on viewport width */
export function getCurrentBreakpoint(config?: BreakpointConfig): BreakpointName {
  const bp = { ...DEFAULT_BREAKPOINTS, ...config };
  const width = window.innerWidth;

  if (width >= (bp["2xl"] ?? 1536)) return "2xl";
  if (width >= (bp.xl ?? 1280)) return "xl";
  if (width >= (bp.lg ?? 1024)) return "lg";
  if (width >= (bp.md ?? 768)) return "md";
  if (width >= (bp.sm ?? 640)) return "sm";
  return "xs";
}

/** Check if viewport matches a breakpoint or above */
export function isMinBreakpoint(name: BreakpointName, config?: BreakpointConfig): boolean {
  const bp = { ...DEFAULT_BREAKPOINTS, ...config };
  return window.innerWidth >= (bp[name] ?? 0);
}

/** Check if viewport matches a breakpoint or below */
export function isMaxBreakpoint(name: BreakpointName, config?: BreakpointConfig): boolean {
  const bp = { ...DEFAULT_BREAKPOINTS, ...config };
  return window.innerWidth <= (bp[name] ?? Infinity);
}

/** Run callback when breakpoint changes (returns unsubscribe function) */
export function onBreakpointChange(
  callback: (breakpoint: BreakpointName) => void,
  config?: BreakpointConfig,
): () => void {
  let lastBp = getCurrentBreakpoint(config);

  const handler = () => {
    const bp = getCurrentBreakpoint(config);
    if (bp !== lastBp) {
      lastBp = bp;
      callback(bp);
    }
  };

  window.addEventListener("resize", handler);

  return () => window.removeEventListener("resize", handler);
}

// --- Observer Utilities ---

/** Observe element size changes */
export function observeSize(
  el: HTMLElement,
  callback: (size: Size) => void,
): ResizeObserver {
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      callback({ width: entry.contentRect.width, height: entry.contentRect.height });
    }
  });
  observer.observe(el);
  return observer;
}

/** Observe element visibility in viewport */
export function observeVisibility(
  el: HTMLElement,
  callback: (isVisible: boolean, ratio: number) => void,
  options?: IntersectionObserverInit,
): IntersectionObserver {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      callback(entry.isIntersecting, entry.intersectionRatio);
    }
  }, {
    threshold: [0, 0.25, 0.5, 0.75, 1],
    ...options,
  });
  observer.observe(el);
  return observer;
}
