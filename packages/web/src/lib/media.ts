/**
 * Media query utilities — match media, breakpoint detection,
 * responsive helpers, and media feature queries.
 */

// --- Types ---

export type BreakpointName = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface Breakpoint {
  name: BreakpointName;
  minWidth: number;
  /** CSS media query string */
  query: string;
}

export interface BreakpointConfig {
  xs?: number;   // default: 0
  sm?: number;   // default: 640
  md?: number;   // default: 768
  lg?: number;   // default: 1024
  xl?: number;   // default: 1280
  "2xl"?: number; // default: 1536
}

export interface MediaQueryOptions {
  /** Media query string */
  query: string;
  /** Callback when query matches */
  onMatch?: () => void;
  /** Callback when query unmatches */
  onUnmatch?: () => void;
  /** Fire callback immediately with current state? */
  immediate?: boolean;
}

export interface MediaQueryInstance {
  /** Current match state */
  matches: boolean;
  /** The media query list */
  mql: MediaQueryList;
  /** Destroy listener */
  destroy: () => void;
}

// --- Default Breakpoints ---

const DEFAULT_BREAKPOINTS: Record<BreakpointName, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

/** Get the default Tailwind-like breakpoints */
export function getBreakpoints(config?: BreakpointConfig): Breakpoint[] {
  const bp = { ...DEFAULT_BREAKPOINTS, ...config };
  const names: BreakpointName[] = ["xs", "sm", "md", "lg", "xl", "2xl"];

  return names.map((name) => ({
    name,
    minWidth: bp[name]!,
    query: name === "xs"
      ? "screen"
      : `(min-width: ${bp[name]}px)`,
  }));
}

/** Get current active breakpoint name */
export function getCurrentBreakpoint(config?: BreakpointConfig): BreakpointName {
  const bps = getBreakpoints(config);
  const width = window.innerWidth;

  let current: BreakpointName = "xs";
  for (const bp of bps) {
    if (width >= bp.minWidth) current = bp.name;
  }

  return current;
}

// --- Media Query Matching ---

/** Check if a media query string currently matches */
export function matchesMedia(query: string): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(query).matches;
}

/** Listen for media query changes */
export function watchMedia(options: MediaQueryOptions): MediaQueryInstance {
  const mql = window.matchMedia(options.query);

  const handler = (e: MediaQueryListEvent | MediaQueryList): void => {
    if ("matches" in e && e.matches) options.onMatch?.();
    else if (!("matches" in e) || !e.matches) options.onUnmatch?.();
  };

  // Modern browsers use addEventListener, older use addListener
  if (mql.addEventListener) {
    mql.addEventListener("change", handler as EventListener);
  } else {
    (mql as any).addListener(handler);
  }

  // Immediate check
  if (options.immediate !== false) {
    handler(mql);
  }

  return {
    get matches() { return mql.matches; },
    mql,
    destroy() {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", handler as EventListener);
      } else {
        (mql as any).removeListener(handler);
      }
    },
  };
}

// --- Common Media Queries ---

/** Is screen width >= sm (640px)? */
export function isMinSm(): boolean { return window.innerWidth >= (DEFAULT_BREAKPOINTS.sm); }

/** Is screen width >= md (768px)? */
export function isMinMd(): boolean { return window.innerWidth >= (DEFAULT_BREAKPOINTS.md); }

/** Is screen width >= lg (1024px)? */
export function isMinLg(): boolean { return window.innerWidth >= (DEFAULT_BREAKPOINTS.lg); }

/** Is screen width >= xl (1280px)? */
export function isMinXl(): boolean { return window.innerWidth >= (DEFAULT_BREAKPOINTS.xl); }

/** Is screen width < sm? */
export function isMaxXs(): boolean { return window.innerWidth < DEFAULT_BREAKPOINTS.sm; }

/** Is screen width < md? */
export function isMaxSm(): boolean { return window.innerWidth < DEFAULT_BREAKPOINTS.md; }

/** Is screen width < lg? */
export function isMaxMd(): boolean { return window.innerWidth < DEFAULT_BREAKPOINTS.lg; }

/** Is it a mobile-sized viewport (< 768px)? */
export function isMobile(): boolean { return window.innerWidth < DEFAULT_BREAKPOINTS.md; }

/** Is it a tablet-sized viewport (768-1023px)? */
export function isTablet(): boolean {
  const w = window.innerWidth;
  return w >= DEFAULT_BREAKPOINTS.md && w < DEFAULT_BREAKPOINTS.lg;
}

/** Is it a desktop-sized viewport (>= 1024px)? */
export function isDesktop(): boolean { return window.innerWidth >= DEFAULT_BREAKPOINTS.lg; }

// --- Responsive Callback System ---

/**
 * Register callbacks that fire when crossing specific breakpoints.
 * Returns cleanup function.
 */
export function onBreakpointChange(
  callbacks: Partial<Record<BreakpointName, (name: BreakpointName) => void>>,
  config?: BreakpointConfig,
): () => void {
  const bps = getBreakpoints(config);
  const listeners: Array<() => void> = [];
  let lastBp = getCurrentBreakpoint(config);

  for (const bp of bps) {
    if (bp.name === "xs") continue; // Base case

    const instance = watchMedia({
      query: bp.query,
      immediate: false,
      onMatch() {
        const current = getCurrentBreakpoint(config);
        if (current !== lastBp && callbacks[bp.name]) {
          callbacks[bp.name]!(current);
          lastBp = current;
        }
      },
    });

    listeners.push(instance.destroy);
  }

  return () => { for (const fn of listeners) fn(); };
}

// --- Print Detection ---

/** Check if page is being printed */
export function isPrinting(): boolean {
  return matchesMedia("print");
}

/** Subscribe to print events */
export function onPrintStart(fn: () => void): () => void {
  return watchMedia({ query: "print", onMatch: fn }).destroy;
}

/** Subscribe to after-print event */
export function onPrintEnd(fn: () => void): () => void {
  // 'print' media query becomes false after printing
  return watchMedia({
    query: "print",
    immediate: true,
    onUnmatch: fn,
  }).destroy;
}

// --- Color Scheme ---

/** Check if user prefers dark mode */
export function isDarkMode(): boolean {
  return matchesMedia("(prefers-color-scheme: dark)");
}

/** Check if user prefers light mode */
export function isLightMode(): boolean {
  return matchesMedia("(prefers-color-scheme: light)");
}

/** Subscribe to color scheme changes */
export function onColorSchemeChange(fn: (isDark: boolean) => void): () => void {
  return watchMedia({
    query: "(prefers-color-scheme: dark)",
    onMatch() { fn(true); },
    onUnmatch() { fn(false); },
    immediate: true,
  }).destroy;
}

// --- Orientation ---

/** Get current orientation */
export function getOrientation(): "portrait" | "landscape" {
  return window.innerHeight > window.width ? "portrait" : "landscape";
}

/** Subscribe to orientation changes */
export function onOrientationChange(fn: (orientation: "portrait" | "landscape") => void): () => void {
  const handler = () => fn(getOrientation());
  window.addEventListener("resize", handler, { passive: true });
  handler(); // Initial call
  return () => window.removeEventListener("resize", handler);
}
