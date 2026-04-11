/**
 * React Resize Observer: Element size observation, responsive breakpoints,
 * container queries, resize debouncing, and dimension tracking utilities.
 */

// --- Types ---

export interface SizeInfo {
  width: number;
  height: number;
  /** Width / height ratio */
  aspectRatio: number;
  /** Content rect (excludes borders/padding) */
  contentRect: DOMRectReadOnly;
  /** Border rect (includes borders) */
  borderRect: DOMRectReadOnly;
}

export interface Breakpoint {
  name: string;
  /** Minimum width in px */
  minWidth?: number;
  /** Maximum width in px */
  maxWidth?: number;
  /** Minimum height in px */
  minHeight?: number;
  /** Maximum height in px */
  maxHeight?: number;
}

export interface ResizeObserverOptions {
  /** Debounce interval in ms (0 = no debounce) */
  debounceMs?: number;
  /** Only report when dimensions cross a threshold (px) */
  threshold?: { width?: number; height?: number };
  /** Box model to observe ("content-box" | "border-box" | "device-pixel-content-box") */
  box?: ResizeObserverBoxOptions;
}

// --- Core Resize Observer Wrapper ---

/** Observe element size changes with optional debounce and thresholds */
export function createSizeObserver(
  callback: (size: SizeInfo) => void,
  options: ResizeObserverOptions = {},
): {
  observe: (el: Element) => void;
  unobserve: (el: Element) => void;
  disconnect: () => void;
} {
  const { debounceMs = 0, threshold, box } = options;
  let rafId: number | null = null;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastReported: SizeInfo | null = null;
  let observedElement: Element | null = null;

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const newSize = extractSize(entry);

      // Check threshold
      if (threshold && lastReported) {
        const wDiff = Math.abs(newSize.width - lastReported.width);
        const hDiff = Math.abs(newSize.height - lastReported.height);
        if ((threshold.width && wDiff < threshold.width) &&
            (threshold.height === undefined || hDiff < (threshold.height ?? 0))) {
          continue;
        }
      }

      lastReported = newSize;

      if (debounceMs > 0) {
        if (timerId !== null) clearTimeout(timerId);
        timerId = setTimeout(() => callback(newSize), debounceMs);
      } else if (!rafId) {
        rafId = requestAnimationFrame(() => {
          callback(newSize);
          rafId = null;
        });
      }
    }
  });

  function extractSize(entry: ResizeObserverEntry): SizeInfo {
    return {
      width: entry.contentRect.width,
      height: entry.contentRect.height,
      aspectRatio: entry.contentRect.width / (entry.contentRect.height || 1),
      contentRect: entry.contentRect,
      borderRect: entry.borderBoxSize?.[0]
        ? new DOMRect(0, 0, entry.borderBoxSize[0].inlineSize, entry.borderBoxSize[0].blockSize)
        : entry.contentRect,
    };
  }

  return {
    observe(el: Element): void {
      observedElement = el;
      observer.observe(el, { box: box ?? "border-box" });
    },
    unobserve(el: Element): void {
      observer.unobserve(el);
      if (el === observedElement) observedElement = null;
    },
    disconnect(): void {
      observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (timerId !== null) clearTimeout(timerId);
    },
  };
}

// --- Breakpoint Detection ---

/** Create a breakpoint matcher based on element size */
export function createBreakpointMatcher(
  breakpoints: Breakpoint[],
  options?: ResizeObserverOptions & { onMatch?: (name: string, size: SizeInfo) => void },
): {
  observe: (el: Element) => void;
  unobserve: (el: Element) => void;
  disconnect: () => void;
  getCurrentBreakpoint: () => string | null;
} {
  let currentBreakpoint: string | null = null;

  const observer = createSizeObserver((size) => {
    const match = findMatchingBreakpoint(breakpoints, size);
    if (match !== currentBreakpoint) {
      currentBreakpoint = match;
      options?.onMatch?.(match!, size);
    }
  }, options);

  return {
    ...observer,
    getCurrentBreakpoint: () => currentBreakpoint,
  };
}

function findMatchingBreakpoint(breakpoints: Breakpoint[], size: SizeInfo): string | null {
  for (const bp of breakpoints) {
    if (bp.minWidth !== undefined && size.width < bp.minWidth) continue;
    if (bp.maxWidth !== undefined && size.width > bp.maxWidth) continue;
    if (bp.minHeight !== undefined && size.height < bp.minHeight) continue;
    if (bp.maxHeight !== undefined && size.height > bp.maxHeight) continue;
    return bp.name;
  }
  return null;
}

// --- Predefined Breakpoints ---

/** Common responsive breakpoints matching Tailwind's defaults */
export const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { name: "xs", maxWidth: 475 },
  { name: "sm", minWidth: 476, maxWidth: 639 },
  { name: "md", minWidth: 640, maxWidth: 767 },
  { name: "lg", minWidth: 768, maxWidth: 1023 },
  { name: "xl", minWidth: 1024, maxWidth: 1279 },
  { name: "2xl", minWidth: 1280 },
];

/** Common container breakpoints */
export const CONTAINER_BREAKPOINTS: Breakpoint[] = [
  { name: "narrow", maxWidth: 320 },
  { name: "medium", minWidth: 321, maxWidth: 640 },
  { name: "wide", minWidth: 641 },
];

// --- Dimension Tracking ---

/** Track an element's dimensions over time with history */
export function createDimensionTracker(
  maxHistory = 20,
): {
  start: (el: Element) => void;
  stop: () => void;
  getHistory: () => SizeInfo[];
  getCurrent: () => SizeInfo | null;
  getMin: () => { width: number; height: number } | null;
  getMax: () => { width: number; height: number } | null;
} {
  const history: SizeInfo[] = [];
  let current: SizeInfo | null = null;
  let observer: ReturnType<typeof createSizeObserver> | null = null;

  function start(el: Element): void {
    stop();
    observer = createSizeObserver((size) => {
      current = size;
      history.push({ ...size });
      if (history.length > maxHistory) history.shift();
    });
    observer.observe(el);
  }

  function stop(): void {
    observer?.disconnect();
    observer = null;
  }

  function getHistory(): SizeInfo[] { return [...history]; }

  function getMin(): { width: number; height: number } | null {
    if (history.length === 0) return null;
    let minW = Infinity, minH = Infinity;
    for (const s of history) {
      if (s.width < minW) minW = s.width;
      if (s.height < minH) minH = s.height;
    }
    return { width: minW, height: minH };
  }

  function getMax(): { width: number; height: number } | null {
    if (history.length === 0) return null;
    let maxW = 0, maxH = 0;
    for (const s of history) {
      if (s.width > maxW) maxW = s.width;
      if (s.height > maxH) maxH = s.height;
    }
    return { width: maxW, height: maxH };
  }

  return { start, stop, getHistory, getCurrent: () => current, getMin, getMax };
}

// --- Utility ---

/** Check if ResizeObserver is available in the environment */
export function isResizeObserverAvailable(): boolean {
  return typeof window !== "undefined" && typeof ResizeObserver !== "undefined";
}

/** Get the viewport size as a SizeInfo object */
export function getViewportSize(): SizeInfo {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    aspectRatio: window.innerWidth / window.innerHeight,
    contentRect: new DOMRect(0, 0, window.innerWidth, window.innerHeight),
    borderRect: new DOMRect(0, 0, window.innerWidth, window.innerHeight),
  };
}
