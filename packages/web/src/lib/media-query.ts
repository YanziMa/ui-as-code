/**
 * Media Query Manager: Programmatic media query creation/evaluation,
 * breakpoint definitions (mobile/tablet/desktop), responsive state tracking,
 * custom media queries, matchMedia wrapper with change subscriptions,
 * and responsive design utilities.
 */

// --- Types ---

export type BreakpointName = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface Breakpoint {
  name: BreakpointName;
  /** Minimum width in px */
  minWidth: number;
  /** Maximum width in px (undefined = no max) */
  maxWidth?: number;
  /** Media query string */
  query: string;
}

export interface BreakpointConfig {
  /** Custom breakpoint definitions */
  breakpoints?: Partial<Record<BreakpointName, number>>;
  /** Unit for breakpoints (default: "px") */
  unit?: string;
  /** Default mobile-first or desktop-first? */
  strategy?: "mobile-first" | "desktop-first";
}

export interface MediaQueryOptions {
  /** The media query string to evaluate */
  query: string;
  /** Callback when match status changes */
  onChange?: (matches: boolean, mql: MediaQueryList) => void;
  /** Fire callback immediately with current state? */
  immediate?: boolean;
}

export interface MediaQueryInstance {
  /** Current match status */
  matches: () => boolean;
  /** The underlying MediaQueryList object */
  getMql: () => MediaQueryList;
  /** Subscribe to changes */
  subscribe: (callback: (matches: boolean) => void) => () => void;
  /** Unsubscribe all and cleanup */
  destroy: () => void;
}

export interface ResponsiveManagerInstance {
  /** Current active breakpoint name */
  currentBreakpoint: () => BreakpointName;
  /** Check if at least a given breakpoint (mobile-first) */
  isMin: (name: BreakpointName) => boolean;
  /** Check if at most a given breakpoint (desktop-first) */
  isMax: (name: BreakpointName) => boolean;
  /** Check if between two breakpoints */
  isBetween: (min: BreakpointName, max: BreakpointName) => boolean;
  /** Check if currently mobile-sized */
  isMobile: () => boolean;
  /** Check if currently tablet-sized */
  isTablet: () => boolean;
  /** Check if currently desktop-sized */
  isDesktop: () => boolean;
  /** Check if in portrait orientation */
  isPortrait: () => boolean;
  /** Check if in landscape orientation */
  isLandscape: () => boolean;
  /** Check if touch device */
  isTouch: () => boolean;
  /** Check if retina/high-DPI display */
  isRetina: () => boolean;
  /** Check if prefers reduced motion */
  prefersReducedMotion: () => boolean;
  /** Check if prefers color scheme dark */
  prefersDark: () => boolean;
  /** Get window dimensions */
  getWindowSize: () => { width: number; height: number };
  /** Create a custom media query watcher */
  watch: (query: string) => MediaQueryInstance;
  /** Subscribe to breakpoint changes */
  onBreakpointChange: (callback: (from: BreakpointName, to: BreakpointName) => void) => () => void;
  /** Get all defined breakpoints */
  getBreakpoints: () => Breakpoint[];
  /** Destroy */
  destroy: () => void;
}

// --- Default breakpoints ---

const DEFAULT_BREAKPOINTS: Record<BreakpointName, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

// --- Helpers ---

function buildBreakpointQuery(
  name: BreakpointName,
  value: number,
  unit: string,
  strategy: "mobile-first" | "desktop-first",
): string {
  if (strategy === "mobile-first") {
    return `(min-width:${value}${unit})`;
  }
  // Desktop-first
  const bpNames = (Object.keys(DEFAULT_BREAKPOINTS) as BreakpointName[]).sort(
    (a, b) => DEFAULT_BREAKPOINTS[b]! - DEFAULT_BREAKPOINTS[a]!,
  );
  const idx = bpNames.indexOf(name);
  // Max width is the next breakpoint - 1
  if (idx < bpNames.length - 1) {
    const nextVal = DEFAULT_BREAKPOINTS[bpNames[idx + 1]!]! - 1;
    return `(max-width:${nextVal}${unit})`;
  }
  return `(min-width:${value}${unit})`; // Largest has no upper bound
}

// --- Main Class ---

export class ResponsiveManager {
  create(config: BreakpointConfig = {}): ResponsiveManagerInstance {
    let destroyed = false;

    const breakpoints = { ...DEFAULT_BREAKPOINTS, ...config.breakpoints };
    const unit = config.unit ?? "px";
    const strategy = config.strategy ?? "mobile-first";

    // Build breakpoint objects
    const bpList: Breakpoint[] = (Object.keys(breakpoints) as BreakpointName[])
      .map((name) => ({
        name,
        minWidth: breakpoints[name]!,
        query: buildBreakpointQuery(name, breakpoints[name]!, unit, strategy),
      }))
      .sort((a, b) => a.minWidth - b.minWidth);

    // State
    let currentBp: BreakpointName = detectBreakpoint();
    const breakpointListeners = new Set<(from: BreakpointName, to: BreakpointName) => void>();
    const watchers = new Set<MediaQueryInstance>();

    function detectBreakpoint(): BreakpointName {
      const w = window.innerWidth;
      // Find largest breakpoint that fits
      let matched: BreakpointName = "xs";
      for (const bp of bpList) {
        if (w >= bp.minWidth) matched = bp.name;
      }
      return matched;
    }

    function handleResize(): void {
      if (destroyed) return;
      const newBp = detectBreakpoint();
      if (newBp !== currentBp) {
        const oldBp = currentBp;
        currentBp = newBp;
        for (const cb of breakpointListeners) cb(oldBp, newBp);
      }
    }

    // Resize listener
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(document.documentElement);
    } else {
      window.addEventListener("resize", handleResize);
    }

    const instance: ResponsiveManagerInstance = {

      currentBreakpoint: () => currentBp,

      isMin(name): boolean {
        return window.innerWidth >= (breakpoints[name] ?? 0);
      },

      isMax(name): boolean {
        return window.innerWidth <= (breakpoints[name] ?? Infinity);
      },

      isBetween(min, max): boolean {
        const w = window.innerWidth;
        return w >= (breakpoints[min] ?? 0) && w <= (breakpoints[max] ?? Infinity);
      },

      isMobile(): boolean {
        return instance.isMax("sm");
      },

      isTablet(): boolean {
        return instance.isMin("sm") && instance.isMax("lg");
      },

      isDesktop(): boolean {
        return instance.isMin("lg");
      },

      isPortrait(): boolean {
        return window.matchMedia("(orientation: portrait)").matches;
      },

      isLandscape(): boolean {
        return window.matchMedia("(orientation: landscape)").matches;
      },

      isTouch(): boolean {
        return (
          "ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          (navigator as unknown as { msMaxTouchPoints?: number }).msMaxTouchPoints > 0
        );
      },

      isRetina(): boolean {
        return window.devicePixelRatio > 1 || (
          window.matchMedia &&
          window.matchMedia("(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)").matches
        );
      },

      prefersReducedMotion(): boolean {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      },

      prefersDark(): boolean {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      },

      getWindowSize: () => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }),

      watch(query: string): MediaQueryInstance {
        const mql = window.matchMedia(query);
        const listeners = new Set<(matches: boolean) => void>();

        const handler = (): void => {
          for (const cb of listeners) cb(mql.matches);
        };

        // Modern browsers use addEventListener
        if (typeof mql.addEventListener === "function") {
          mql.addEventListener("change", handler);
        } else {
          // Legacy fallback
          mql.addListener(handler);
        }

        const mqInstance: MediaQueryInstance = {
          matches: () => mql.matches,
          getMql: () => mql,
          subscribe(callback): () => void {
            listeners.add(callback);
            callback(mql.matches); // Immediate call
            return () => listeners.delete(callback);
          },
          destroy(): void {
            if (typeof mql.removeEventListener === "function") {
              mql.removeEventListener("change", handler);
            } else {
              mql.removeListener(handler);
            }
            listeners.clear();
            watchers.delete(mqInstance);
          },
        };

        watchers.add(mqInstance);
        return mqInstance;
      },

      onBreakpointChange(callback): () => void {
        breakpointListeners.add(callback);
        return () => { breakpointListeners.delete(callback); };
      },

      getBreakpoints: () => [...bpList],

      destroy(): void {
        if (destroyed) return;
        destroyed = true;

        if (resizeObserver) {
          resizeObserver.disconnect();
        } else {
          window.removeEventListener("resize", handleResize);
        }

        for (const w of watchers) w.destroy();
        watchers.clear();
        breakpointListeners.clear();
      },
    };

    return instance;
  }
}

/** Convenience: create a responsive/media-query manager */
export function createResponsiveManager(config?: BreakpointConfig): ResponsiveManagerInstance {
  return new ResponsiveManager().create(config);
}

// --- Standalone utilities ---

/** Evaluate a single media query string synchronously */
export function matchesQuery(query: string): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(query).matches;
}

/** Quick breakpoint check — returns current breakpoint name */
export function getCurrentBreakpoint(customBps?: Partial<Record<BreakpointName, number>>): BreakpointName {
  const bps = { ...DEFAULT_BREAKPOINTS, ...customBps };
  const w = window.innerWidth;
  let matched: BreakpointName = "xs";
  for (const [name, val] of Object.entries(bps)) {
    if (w >= val!) matched = name as BreakpointName;
  }
  return matched;
}
