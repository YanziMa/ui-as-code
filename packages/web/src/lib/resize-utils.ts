/**
 * Resize Utilities: ResizeObserver wrapper, element resize detection,
 * responsive breakpoints, viewport size tracking, container queries
 * (polyfill-style), resize handles, and responsive design helpers.
 */

// --- Types ---

export interface ResizeEntry {
  /** Target element */
  target: HTMLElement;
  /** New content rect (border-box) */
  contentRect: DOMRectReadOnly;
  /** New border box size */
  borderBoxSize: { inlineSize: number; blockSize: number };
  /** Previous content rect (if available) */
  previousContentRect?: DOMRectReadOnly;
  /** Size delta from previous observation */
  delta: { width: number; height: number };
}

export interface ResizeObserverConfig {
  /** Throttle callbacks (ms). Default 0 */
  throttleMs?: number;
  /** Only fire when size changes exceed threshold (px). Default 0 */
  threshold?: { width?: number; height?: number };
  /** Report on initial observation. Default true */
  reportInitial?: boolean;
  /** Use border-box instead of content-box. Default false */
  box?: "content-box" | "border-box" | "device-pixel-content-box";
}

export interface Breakpoint {
  name: string;
  minWidth: number;
  maxWidth?: number;
}

export interface ViewportState {
  width: number;
  height: number;
  dpr: number; // device pixel ratio
  orientation: "portrait" | "landscape";
  currentBreakpoint: string | null;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export interface ResizeHandleOptions {
  /** Which edges this handle controls */
  edge: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
  /** Minimum size in px */
  minWidth?: number;
  /** Minimum height in px */
  minHeight?: number;
  /** Maximum size in px */
  maxWidth?: number;
  /** Maximum height in px */
  maxHeight?: number;
  /** Snap to grid of N px */
  gridSnap?: number;
  /** Aspect ratio lock (width/height) */
  aspectRatio?: number;
  /** Called during resize */
  onResize?: (size: { width: number; height: number }) => void;
  /** Called when resize ends */
  onResizeEnd?: (size: { width: number; height: number }) => void;
  /** Cursor for the handle */
  cursor?: string;
}

// --- Resize Observer Wrapper ---

/**
 * EnhancedResizeObserver - wraps ResizeObserver with throttling, thresholds,
 * delta tracking, and multi-element support.
 *
 * @example
 * ```ts
 * const observer = new EnhancedResizeObserver((entries) => {
 *   for (const entry of entries) {
 *     console.log(entry.target, entry.contentRect.width);
 *   }
 * }, { threshold: { width: 10 } });
 * observer.observe(element);
 * ```
 */
export class EnhancedResizeObserver {
  private observer: ResizeObserver | null = null;
  private callback: (entries: ResizeEntry[]) => void;
  private config: Required<ResizeObserverConfig>;
  private previousSizes = new Map<HTMLElement, DOMRectReadOnly>();
  private lastFireTime = 0;
  private pendingEntries: ResizeEntry[] = [];
  private rafId: number | null = null;

  constructor(
    callback: (entries: ResizeEntry[]) => void,
    config: ResizeObserverConfig = {},
  ) {
    this.callback = callback;
    this.config = {
      throttleMs: config.throttleMs ?? 0,
      threshold: config.threshold ?? { width: 0, height: 0 },
      reportInitial: config.reportInitial ?? true,
      box: config.box ?? "content-box",
    };
  }

  /** Observe an element */
  observe(element: HTMLElement): void {
    if (!this.observer) {
      this.observer = new ResizeObserver(this._handleEntries.bind(this));
    }
    this.observer.observe(element, { box: this.config.box });
  }

  /** Unobserve an element */
  unobserve(element: HTMLElement): void {
    this.observer?.unobserve(element);
    this.previousSizes.delete(element);
  }

  /** Disconnect and clean up */
  disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.previousSizes.clear();
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  // --- Internal ---

  private _handleEntries(entries: ResizeObserverEntry[]): void {
    const enhanced: ResizeEntry[] = [];

    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      const prev = this.previousSizes.get(el);

      let shouldFire = !prev; // Always fire first time

      if (prev && this.config.threshold.width! > 0) {
        shouldFire ||= Math.abs(entry.contentRect.width - prev.width) >= this.config.threshold.width!;
      }
      if (prev && this.config.threshold.height! > 0) {
        shouldFire ||= Math.abs(entry.contentRect.height - prev.height) >= this.config.threshold.height!;
      }

      if (!shouldFire) continue;

      const bbSize = entry.borderBoxSize?.[0]
        ? { inlineSize: entry.borderBoxSize[0].inlineSize, blockSize: entry.borderBoxSize[0].blockSize }
        : { inlineSize: entry.contentRect.width, blockSize: entry.contentRect.height };

      enhanced.push({
        target: el,
        contentRect: entry.contentRect,
        borderBoxSize: bbSize,
        previousContentRect: prev ?? undefined,
        delta: prev
          ? { width: entry.contentRect.width - prev.width, height: entry.contentRect.height - prev.height }
          : { width: 0, height: 0 },
      });

      this.previousSizes.set(el, entry.contentRect);
    }

    if (enhanced.length === 0) return;

    // Throttle handling
    if (this.config.throttleMs > 0) {
      const now = performance.now();
      if (now - this.lastFireTime < this.config.throttleMs) {
        this.pendingEntries.push(...enhanced);
        if (this.rafId === null) {
          this.rafId = requestAnimationFrame(() => {
            this._firePending();
          });
        }
        return;
      }
      this.lastFireTime = now;
    }

    this.callback(enhanced);
  }

  private _firePending(): void {
    if (this.pendingEntries.length > 0) {
      this.callback(this.pendingEntries);
      this.pendingEntries = [];
    }
    this.rafId = null;
  }
}

// --- Breakpoint System ---

/** Default responsive breakpoints */
export const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { name: "xs", minWidth: 0, maxWidth: 575 },
  { name: "sm", minWidth: 576, maxWidth: 767 },
  { name: "md", minWidth: 768, maxWidth: 991 },
  { name: "lg", minWidth: 992, maxWidth: 1199 },
  { name: "xl", minWidth: 1200, maxWidth: 1399 },
  { name: "2xl", minWidth: 1400 },
];

/**
 * BreakpointTracker - tracks viewport size and matches against breakpoints.
 */
export class BreakpointTracker {
  private breakpoints: Breakpoint[];
  private _currentBreakpoint: string | null = null;
  private listeners = new Set<(name: string | null, prev: string | null) => void>();
  private cleanup: (() => void) | null = null;

  constructor(breakpoints: Breakpoint[] = DEFAULT_BREAKPOINTS) {
    this.breakpoints = breakpoints;
    this._currentBreakpoint = this._matchBreakpoint(window.innerWidth);

    const handler = () => {
      const prev = this._currentBreakpoint;
      this._currentBreakpoint = this._matchBreakpoint(window.innerWidth);
      if (this._currentBreakpoint !== prev) {
        this.listeners.forEach((fn) => fn(this._currentBreakpoint, prev));
      }
    };

    window.addEventListener("resize", handler);
    this.cleanup = () => window.removeEventListener("resize", handler);
  }

  /** Get current breakpoint name */
  getCurrent(): string | null { return this._currentBreakpoint; }

  /** Check if a specific breakpoint is active */
  isActive(name: string): boolean { return this._currentBreakpoint === name; }

  /** Check if viewport is at or above a minimum breakpoint */
  isMin(name: string): boolean {
    const bp = this.breakpoints.find((b) => b.name === name);
    if (!bp) return false;
    return window.innerWidth >= bp.minWidth;
  }

  /** Check if viewport is at or below a maximum breakpoint */
  isMax(name: string): boolean {
    const bp = this.breakpoints.find((b) => b.name === name);
    if (!bp || !bp.maxWidth) return false;
    return window.innerWidth <= bp.maxWidth;
  }

  /** Listen for breakpoint changes */
  onChange(fn: (name: string | null, prev: string | null) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Get all breakpoints that currently match */
  getMatchingBreakpoints(): Breakpoint[] {
    const w = window.innerWidth;
    return this.breakpoints.filter(
      (b) => w >= b.minWidth && (!b.maxWidth || w <= b.maxWidth),
    );
  }

  /** Destroy and remove listener */
  destroy(): void {
    if (this.cleanup) this.cleanup();
    this.listeners.clear();
  }

  private _matchBreakpoint(width: number): string | null {
    for (const bp of this.breakpoints) {
      if (width >= bp.minWidth && (!bp.maxWidth || width <= bp.maxWidth)) {
        return bp.name;
      }
    }
    return null;
  }
}

// --- Viewport Tracker ---

/**
 * ViewportTracker - comprehensive viewport state tracking.
 */
export class ViewportTracker {
  private _state: ViewportState;
  private listeners = new Set<(state: ViewportState) => void>();
  private cleanup: (() => void) | null = null;
  private rafId: number | null = null;
  private dirty = false;

  constructor() {
    this._state = this._measure();

    const handler = () => {
      this.dirty = true;
      if (this.rafId === null) {
        this.rafId = requestAnimationFrame(() => {
          this._flush();
        });
      }
    };

    window.addEventListener("resize", handler);
    window.addEventListener("orientationchange", handler);
    this.cleanup = () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
    };
  }

  /** Get current viewport state snapshot */
  getState(): ViewportState { return { ...this._state }; }

  /** Get viewport width */
  getWidth(): number { return this._state.width; }

  /** Get viewport height */
  getHeight(): number { return this._state.height; }

  /** Get device pixel ratio */
  getDPR(): number { return this._state.dpr; }

  /** Check orientation */
  isPortrait(): boolean { return this._state.orientation === "portrait"; }
  isLandscape(): boolean { return this._state.orientation === "landscape"; }

  /** Listen for any viewport change */
  onChange(fn: (state: ViewportState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Destroy */
  destroy(): void {
    if (this.cleanup) this.cleanup();
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.listeners.clear();
  }

  private _measure(): ViewportState {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return {
      width: w,
      height: h,
      dpr: window.devicePixelRatio ?? 1,
      orientation: w > h ? "landscape" : "portrait",
      currentBreakpoint: null, // Filled by BreakpointTracker if composed
      isMobile: w < 768,
      isTablet: w >= 768 && w < 992,
      isDesktop: w >= 992,
    };
  }

  private _flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.rafId = null;
    this._state = this._measure();
    this.listeners.forEach((fn) => fn(this._state));
  }
}

// --- Resize Handles ---

/**
 * Create a resize handle on an element's edge.
 * Allows users to drag to resize the element.
 *
 * @example
 * ```ts
 * createResizeHandle(container, {
 *   edge: "se",
 *   minWidth: 200,
 *   minHeight: 150,
 *   onResize: (size) => console.log(size),
 * });
 * ```
 */
export function createResizeHandle(
  target: HTMLElement,
  options: ResizeHandleOptions,
): { destroy: () => void } {
  const {
    edge,
    minWidth = 50,
    minHeight = 50,
    maxWidth = Infinity,
    maxHeight = Infinity,
    gridSnap,
    aspectRatio,
    onResize,
    onResizeEnd,
    cursor = _getCursorForEdge(edge),
  } = options;

  const handle = document.createElement("div");
  handle.className = `resize-handle resize-handle-${edge}`;
  handle.style.cssText = `
    position: absolute;
    ${_getEdgePosition(edge)};
    width: 12px;
    height: 12px;
    cursor: ${cursor};
    z-index: 10;
    background: transparent;
  `;
  target.style.position = "relative";
  target.appendChild(handle);

  let isResizing = false;
  let startX = 0, startY = 0;
  let startW = 0, startH = 0;

  const onMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startW = target.offsetWidth;
    startH = target.offsetHeight;

    document.body.style.cursor = cursor;
    document.body.style.userSelect = "none";

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e: MouseEvent): void => {
    if (!isResizing) return;

    let dx = e.clientX - startX;
    let dy = e.clientY - startY;
    let newW = startW;
    let newH = startH;

    // Apply edge-specific deltas
    switch (edge) {
      case "e": case "ne": case "se":
        newW = startW + dx;
        break;
      case "w": case "nw": case "sw":
        newW = startW - dx;
        break;
    }
    switch (edge) {
      case "s": case "se": case "sw":
        newH = startH + dy;
        break;
      case "n": case "ne": case "nw":
        newH = startH - dy;
        break;
    }

    // Clamp to min/max
    newW = clamp(newW, minWidth, maxWidth);
    newH = clamp(newH, minHeight, maxHeight);

    // Aspect ratio lock
    if (aspectRatio) {
      if (edge.includes("e") || edge.includes("w")) {
        newH = newW / aspectRatio;
      } else {
        newW = newH * aspectRatio;
      }
    }

    // Grid snap
    if (gridSnap) {
      newW = Math.round(newW / gridSnap) * gridSnap;
      newH = Math.round(newH / gridSnap) * gridSnap;
    }

    target.style.width = `${newW}px`;
    target.style.height = `${newH}px`;

    onResize?.({ width: newW, height: newH });
  };

  const onMouseUp = (): void => {
    if (!isResizing) return;
    isResizing = false;

    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);

    onResizeEnd?.({ width: target.offsetWidth, height: target.offsetHeight });
  };

  handle.addEventListener("mousedown", onMouseDown);

  return {
    destroy: () => {
      handle.remove();
      handle.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    },
  };
}

function _getCursorForEdge(edge: string): string {
  const cursors: Record<string, string> = {
    n: "ns-resize", s: "ns-resize",
    e: "ew-resize", w: "ew-resize",
    ne: "nesw-resize", nw: "nwse-resize",
    se: "nwse-resize", sw: "nesw-resize",
  };
  return cursors[edge] ?? "move";
}

function _getEdgePosition(edge: string): string {
  const positions: Record<string, string> = {
    n: "top: -6px;left: 50%;transform:translateX(-50%);",
    s: "bottom: -6px;left: 50%;transform:translateX(-50%);",
    e: "right: -6px;top: 50%;transform:translateY(-50%);",
    w: "left: -6px;top: 50%;transform:translateY(-50%);",
    ne: "top: -6px;right: -6px;",
    nw: "top: -6px;left: -6px;",
    se: "bottom: -6px;right: -6px;",
    sw: "bottom: -6px;left: -6px;",
  };
  return positions[edge] ?? "";
}

// --- Utility Functions ---

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Check if ResizeObserver is available */
export function isResizeObserverSupported(): boolean {
  return typeof ResizeObserver !== "undefined";
}

/** Get element's current size (fallback for browsers without ResizeObserver) */
export function getElementSize(element: HTMLElement): { width: number; height: number } {
  return { width: element.offsetWidth, height: element.offsetHeight };
}

/** Check if an element has overflow (scrollable) */
export function hasOverflow(element: HTMLElement): { x: boolean; y: boolean } {
  return {
    x: element.scrollWidth > element.clientWidth,
    y: element.scrollHeight > element.clientHeight,
  };
}

/** Match media query and return result */
export function matchMedia(query: string): boolean {
  return window.matchMedia(query).matches;

/** Listen for media query changes */
export function onMediaChange(query: string, handler: (matches: boolean) => void): () => void {
  const mql = window.matchMedia(query);
  mql.addEventListener?.("change", (e) => handler(e.matches)) ??
    mql.addListener?.((e) => handler(e.matches));
  return () => {
    mql.removeEventListener?.("change", handler as EventListener) ??
      mql.removeListener?.(handler as EventListener);
  };
}
