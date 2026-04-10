/**
 * Responsive / Breakpoint Detection: Media query matching, breakpoint tracking,
 * orientation detection, device type inference, pixel density, and
 * viewport dimension utilities with change event support.
 */

// --- Types ---

export interface Breakpoint {
  name: string;
  minWidth: number;
  /** Query string (auto-generated) */
  query?: string;
}

/** Standard breakpoints */
export const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { name: "xs", minWidth: 0 },
  { name: "sm", minWidth: 640 },
  { name: "md", minWidth: 768 },
  { name: "lg", minWidth: 1024 },
  { name: "xl", minWidth: 1280 },
  { name: "2xl", minWidth: 1536 },
];

export interface ResponsiveOptions {
  /** Custom breakpoints (default: DEFAULT_BREAKPOINTS) */
  breakpoints?: Breakpoint[];
  /** Callback when current breakpoint changes */
  onBreakpointChange?: (breakpoint: Breakpoint) => void;
  /** Callback on any media query match change */
  onChange?: (info: ResponsiveInfo) => void;
  /** Initial check immediately? (default: true) */
  immediate?: boolean;
}

export interface ResponsiveInfo {
  /** Current breakpoint name */
  breakpoint: string;
  /** Current breakpoint object */
  currentBreakpoint: Breakpoint;
  /** Viewport width in px */
  width: number;
  /** Viewport height in px */
  height: number;
  /** Device pixel ratio */
  dpr: number;
  /** Orientation */
  orientation: "portrait" | "landscape";
  /** Is touch device? */
  isTouch: boolean;
  /** Is mobile-sized? (below md) */
  isMobile: boolean;
  /** Is tablet-sized? (md to lg) */
  isTablet: boolean;
  /** Is desktop-sized? (lg and above) */
  isDesktop: boolean;
  /** All active breakpoints (from smallest to current) */
  activeBreakpoints: string[];
}

type ChangeListener = (info: ResponsiveInfo) => void;

// --- Main Class ---

export class ResponsiveManager {
  private breakpoints: Breakpoint[];
  private listeners = new Set<ChangeListener>();
  private mqls: MediaQueryList[] = [];
  private destroyed = false;

  constructor(options: ResponsiveOptions = {}) {
    this.breakpoints = options.breakpoints ?? [...DEFAULT_BREAKPOINTS];

    // Build media queries for each breakpoint
    for (const bp of this.breakpoints) {
      bp.query = `(min-width: ${bp.minWidth}px)`;
      const mql = window.matchMedia(bp.query);
      this.mqls.push(mql);

      mql.addEventListener("change", () => this.evaluate());
    }

    // Also listen for orientation and size changes
    window.matchMedia("(orientation: portrait)").addEventListener("change", () => this.evaluate());

    if (options.onBreakpointChange || options.onChange) {
      this.subscribe(options.onChange ?? (() => {}));
    }

    if (options.immediate !== false) {
      // Emit initial state
      const info = this.getInfo();
      options.onBreakpointChange?.(info.currentBreakpoint);
      options.onChange?.(info);
    }
  }

  /** Get full responsive info snapshot */
  getInfo(): ResponsiveInfo {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const orientation = w > h ? "landscape" : "portrait";

    // Find current breakpoint (largest matching)
    let currentBreakpoint = this.breakpoints[0]!;
    for (const bp of this.breakpoints) {
      if (w >= bp.minWidth) currentBreakpoint = bp;
    }

    const activeBreakpoints = this.breakpoints
      .filter((bp) => w >= bp.minWidth)
      .map((bp) => bp.name);

    return {
      breakpoint: currentBreakpoint.name,
      currentBreakpoint,
      width: w,
      height: h,
      dpr,
      orientation,
      isTouch: this.detectTouch(),
      isMobile: w < 768,
      isTablet: w >= 768 && w < 1024,
      isDesktop: w >= 1024,
      activeBreakpoints,
    };
  }

  /** Get current breakpoint name */
  getBreakpoint(): string {
    return this.getInfo().breakpoint;
  }

  /** Check if a specific breakpoint matches */
  matches(name: string): boolean {
    const info = this.getInfo();
    return info.activeBreakpoints.includes(name);
  }

  /** Check if viewport is at least as wide as a given breakpoint */
  minMatch(name: string): boolean {
    const bp = this.breakpoints.find((b) => b.name === name);
    if (!bp) return false;
    return window.innerWidth >= bp.minWidth;
  }

  /** Check if viewport is narrower than a given breakpoint */
  maxMatch(name: string): boolean {
    const bp = this.breakpoints.find((b) => b.name === name);
    if (!bp) return false;
    return window.innerWidth < bp.minWidth;
  }

  /** Subscribe to responsive changes */
  subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.getInfo()); // Emit initial
    return () => this.listeners.delete(listener);
  }

  /** Destroy all listeners */
  destroy(): void {
    this.destroyed = true;
    for (const mql of this.mqls) {
      // Can't easily remove addEventListener-based handlers; just flag as destroyed
    }
    this.mqls = [];
    this.listeners.clear();
  }

  // --- Private ---

  private evaluate(): void {
    if (this.destroyed) return;
    const info = this.getInfo();
    for (const listener of this.listeners) {
      try { listener(info); } catch {}
    }
  }

  private detectTouch(): boolean {
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error — MS-specific
      navigator.msMaxTouchPoints > 0
    );
  }
}

// --- Convenience Factory ---

let globalResponsive: ResponsiveManager | null = null;

/** Get or create the global responsive manager */
export function getResponsiveManager(options?: ResponsiveOptions): ResponsiveManager {
  if (!globalResponsive) {
    globalResponsive = new ResponsiveManager(options);
  }
  return globalResponsive;
}

// --- Standalone Utilities ---

/** Check if a single media query matches right now */
export function matchesMedia(query: string): boolean {
  return window.matchMedia(query).matches;
}

/** Subscribe to a media query change */
export function watchMedia(
  query: string,
  callback: (matches: boolean) => void,
): () => void {
  const mql = window.matchMedia(query);
  const handler = (e: MediaQueryListEvent) => callback(e.matches);

  mql.addEventListener("change", handler);
  callback(mql.matches); // Initial call

  return () => mql.removeEventListener("change", handler);
}

/** Get safe area insets (for notch devices) */
export function getSafeAreaInsets(): { top: number; right: number; bottom: number; left: number } {
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue("env(safe-area-inset-top)") || "0", 10),
    right: parseInt(style.getPropertyValue("env(safe-area-inset-right)") || "0", 10),
    bottom: parseInt(style.getPropertyValue("env(safe-area-inset-bottom)") || "0", 10),
    left: parseInt(style.getPropertyValue("env(safe-area-inset-left)") || "0", 10),
  };
}

/** Get viewport dimensions accounting for scrollbar */
export function getViewportSize(): { width: number; height: number } {
  return {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  };
}
