/**
 * Enhanced Resize Observer v2 with debounced/throttled callbacks, dimension
 * diff reporting, breakpoint detection, aspect-ratio monitoring, and
 * element-size history tracking.
 */

// --- Types ---

export interface ResizeV2Entry {
  /** Target element */
  target: HTMLElement;
  /** New content rect dimensions */
  size: { width: number; height: number };
  /** Previous dimensions (or null on first observation) */
  previousSize: { width: number; height: number } | null;
  /** Dimension changes (delta) */
  delta: { width: number; height: number };
  /** Aspect ratio (width / height) */
  aspectRatio: number;
  /** Whether this crossed a registered breakpoint */
  breakpointCrossed: string | null;
  /** Border box size (if available) */
  borderBoxSize?: { inlineSize: number; blockSize: number };
  /** Content box size (if available) */
  contentBoxSize?: { inlineSize: number; blockSize: number };
  /** Device pixel ratio adjusted sizes */
  dprAdjusted: { width: number; height: number };
  /** Timestamp */
  timestamp: number;
}

export interface Breakpoint {
  name: string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

export interface ResizeObserverV2Options {
  /** Debounce callbacks (ms, default: 0 = no debounce) */
  debounceMs?: number;
  /** Throttle callbacks (ms, takes priority over debounce if both set) */
  throttleMs?: number;
  /** Report border box size (default: true) */
  reportBorderBox?: boolean;
  /** Report content box size (default: false) */
  reportContentBox?: boolean;
  /** Custom breakpoints to monitor */
  breakpoints?: Breakpoint[];
  /** Called on every resize event */
  onResize?: (entry: ResizeV2Entry) => void;
  /** Called only when width changes */
  onWidthChange?: (target: HTMLElement, width: number, delta: number) => void;
  /** Called only when height changes */
  onHeightChange?: (target: HTMLElement, height: number, delta: number) => void;
  /** Called when a breakpoint is crossed */
  onBreakpoint?: (target: HTMLElement, breakpointName: string, entered: boolean) => void;
  /** Leading-edge trigger for throttle (default: true) */
  throttleLeading?: boolean;
  /** Trailing-edge trigger for throttle (default: true) */
  throttleTrailing?: boolean;
}

export interface ResizeObserverV2Instance {
  /** Observe an element */
  observe: (element: HTMLElement) => void;
  /** Unobserve an element */
  unobserve: (element: HTMLElement) => void;
  /** Disconnect all observations */
  disconnect: () => void;
  /** Get current size of an observed element */
  getSize: (element: HTMLElement) => { width: number; height: number } | null;
  /** Get current aspect ratio of an observed element */
  getAspectRatio: (element: HTMLElement) => number | null;
  /** Check which breakpoint(s) an element is currently in */
  getCurrentBreakpoints: (element: HTMLElement) => string[];
  /** Add breakpoints dynamically */
  addBreakpoints: (breakpoints: Breakpoint[]) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main ---

export function createResizeObserverV2(options: ResizeObserverV2Options = {}): ResizeObserverV2Instance {
  const {
    debounceMs = 0,
    throttleMs = 0,
    reportBorderBox = true,
    reportContentBox = false,
    breakpoints = [],
    onResize,
    onWidthChange,
    onHeightChange,
    onBreakpoint,
    throttleLeading = true,
    throttleTrailing = true,
  } = options;

  let destroyed = false;
  const sizes = new Map<HTMLElement, { width: number; height: number }>();
  const activeBreakpoints = new Map<HTMLElement, Set<string>>();
  const throttleTimers = new Map<HTMLElement, ReturnType<typeof setTimeout> | null>();
  const debounceTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
  let allBreakpoints = [...breakpoints];
  let pendingThrottle = new Map<HTMLElement, ResizeV2Entry>();

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  function checkBreakpoint(bp: Breakpoint, w: number, h: number): boolean {
    if (bp.minWidth !== undefined && w < bp.minWidth) return false;
    if (bp.maxWidth !== undefined && w > bp.maxWidth) return false;
    if (bp.minHeight !== undefined && h < bp.minHeight) return false;
    if (bp.maxHeight !== undefined && h > bp.maxHeight) return false;
    return true;
  }

  function checkBreakpointsForTarget(target: HTMLElement, w: number, h: number): string[] {
    const current = new Set<string>();
    for (const bp of allBreakpoints) {
      if (checkBreakpoint(bp, w, h)) current.add(bp.name);
    }

    const prev = activeBreakpoints.get(target) ?? new Set<string>();
    const crossed: string[] = [];

    // Entered new breakpoints
    for (const name of current) {
      if (!prev.has(name)) {
        crossed.push(name);
        onBreakpoint?.(target, name, true);
      }
    }
    // Left breakpoints
    for (const name of prev) {
      if (!current.has(name)) {
        onBreakpoint?.(target, name, false);
      }
    }

    activeBreakpoints.set(target, current);
    return Array.from(current);
  }

  function handleEntries(entries: ResizeObserverEntry[]): void {
    if (destroyed) return;

    for (const raw of entries) {
      const target = raw.target as HTMLElement;
      const prev = sizes.get(target) ?? null;
      const w = raw.contentRect.width;
      const h = raw.contentRect.height;

      const entry: ResizeV2Entry = {
        target,
        size: { width: w, height: h },
        previousSize: prev,
        delta: {
          width: prev ? w - prev.width : w,
          height: prev ? h - prev.height : h,
        },
        aspectRatio: h > 0 ? w / h : 0,
        breakpointCrossed: null,
        borderBoxSize: reportBorderBox && raw.borderBoxSize?.[0]
          ? { inlineSize: raw.borderBoxSize[0].inlineSize, blockSize: raw.borderBoxSize[0].blockSize }
          : undefined,
        contentBoxSize: reportContentBox && raw.contentBoxSize?.[0]
          ? { inlineSize: raw.contentBoxSize[0].inlineSize, blockSize: raw.contentBoxSize[0].blockSize }
          : undefined,
        dprAdjusted: { width: w * dpr, height: h * dpr },
        timestamp: Date.now(),
      };

      // Check breakpoints
      if (allBreakpoints.length > 0) {
        const crossed = checkBreakpointsForTarget(target, w, h);
        entry.breakpointCrossed = crossed.length > 0 ? crossed[crossed.length - 1] : null;
      }

      sizes.set(target, { width: w, height: h });

      // Throttle or debounce or immediate
      if (throttleMs > 0) {
        pendingThrottle.set(target, entry);
        const existingTimer = throttleTimers.get(target);
        if (existingTimer !== null) {
          // Already have a pending throttle — wait for trailing
          return;
        }
        // Leading edge
        if (throttleLeading) dispatch(entry);

        const timer = setTimeout(() => {
          throttleTimers.set(target, null);
          // Trailing edge — dispatch latest pending
          const latest = pendingThrottle.get(target);
          if (latest && throttleTrailing) {
            dispatch(latest);
          }
          pendingThrottle.delete(target);
        }, throttleMs);
        throttleTimers.set(target, timer);
      } else if (debounceMs > 0) {
        const existing = debounceTimers.get(target);
        if (existing) clearTimeout(existing);
        debounceTimers.set(target, setTimeout(() => {
          dispatch(entry);
          debounceTimers.delete(target);
        }, debounceMs));
      } else {
        dispatch(entry);
      }
    }
  }

  function dispatch(entry: ResizeV2Entry): void {
    onResize?.(entry);

    if (entry.delta.width !== 0) {
      onWidthChange?.(entry.target, entry.size.width, entry.delta.width);
    }
    if (entry.delta.height !== 0) {
      onHeightChange?.(entry.target, entry.size.height, entry.delta.height);
    }
  }

  // Create native observer
  const observer = new ResizeObserver(handleEntries);

  const instance: ResizeObserverV2Instance = {
    observe(element: HTMLElement) {
      if (destroyed) return;
      observer.observe(element);
    },

    unobserve(element: HTMLElement) {
      if (destroyed) return;
      observer.unobserve(element);
      sizes.delete(element);
      activeBreakpoints.delete(element);
      const dt = debounceTimers.get(element);
      if (dt) { clearTimeout(dt); debounceTimers.delete(element); }
      const tt = throttleTimers.get(element);
      if (tt) { clearTimeout(tt); throttleTimers.delete(element); }
      pendingThrottle.delete(element);
    },

    disconnect() {
      observer.disconnect();
      sizes.clear();
      activeBreakpoints.clear();
      for (const [, t] of debounceTimers) clearTimeout(t);
      debounceTimers.clear();
      for (const [, t] of throttleTimers) if (t) clearTimeout(t);
      throttleTimers.clear();
      pendingThrottle.clear();
    },

    getSize(element: HTMLElement) {
      const s = sizes.get(element);
      return s ? { ...s } : null;
    },

    getAspectRatio(element: HTMLElement) {
      const s = sizes.get(element);
      return s ? (s.height > 0 ? s.width / s.height : 0) : null;
    },

    getCurrentBreakpoints(element: HTMLElement) {
      return Array.from(activeBreakpoints.get(element) ?? []);
    },

    addBreakpoints(newBps: Breakpoint[]) {
      allBreakpoints = [...allBreakpoints, ...newBps];
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      instance.disconnect();
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Quick one-shot: watch element size changes */
export function watchSize(
  element: HTMLElement,
  callback: (size: { width: number; height: number }) => void,
  debounceMs = 0,
): () => void {
  const obs = createResizeObserverV2({
    debounceMs,
    onResize(entry) { callback(entry.size); },
  });
  obs.observe(element);
  return () => obs.destroy();
}

/** Responsive component helper: returns current responsive breakpoint name */
export function useResponsiveSize(
  element: HTMLElement,
  breakpoints: Breakpoint[],
  onChange: (name: string) => void,
): () => void {
  const obs = createResizeObserverV2({
    breakpoints,
    onBreakpoint(_target, name, entered) {
      if (entered) onChange(name);
    },
  });
  obs.observe(element);
  return () => obs.destroy();
}
