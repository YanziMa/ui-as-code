/**
 * Responsive Utilities: Media query management, responsive value selection,
 * container query helpers, image srcset generation, responsive typography,
 * device detection, orientation handling, and adaptive UI patterns.
 */

// --- Types ---

export type BreakpointName = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface BreakpointDefinition {
  name: BreakpointName;
  minWidth: number;
  maxWidth?: number;
}

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  2xl?: T;
  base?: T; // fallback when no breakpoint matches
}

export interface MediaQueryOptions {
  /** Query string */
  query: string;
  /** Callback when match state changes */
  onChange: (matches: boolean) => void;
  /** Fire callback immediately on registration? Default true */
  immediate?: boolean;
}

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  hasHoverCapability: boolean;
  prefersReducedMotion: boolean;
  prefersDarkMode: boolean;
  prefersHighContrast: boolean;
  orientation: "portrait" | "landscape";
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  colorDepth: number;
  connectionType: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean | null;
}

// --- Breakpoint Definitions ---

/** Standard Tailwind-like breakpoint definitions */
export const BREAKPOINTS: Record<BreakpointName, { min: number; max?: number; query: string }> = {
  xs: { min: 0, max: 575, query: "(max-width: 575px)" },
  sm: { min: 576, max: 767, query: "(min-width: 576px) and (max-width: 767px)" },
  md: { min: 768, max: 991, query: "(min-width: 768px) and (max-width: 991px)" },
  lg: { min: 992, max: 1199, query: "(min-width: 992px) and (max-width: 1199px)" },
  xl: { min: 1200, max: 1399, query: "(min-width: 1200px) and (max-width: 1399px)" },
  "2xl": { min: 1400, query: "(min-width: 1400px)" },
};

/** Ordered breakpoint names from smallest to largest */
export const BREAKPOINT_ORDER: BreakpointName[] = ["xs", "sm", "md", "lg", "xl", "2xl"];

// --- Media Query Management ---

/**
 * Subscribe to a media query change with automatic cleanup.
 * Returns unsubscribe function.
 */
export function subscribeMediaQuery(
  query: string,
  callback: (matches: boolean) => void,
  options?: { immediate?: boolean },
): () => void {
  const mql = window.matchMedia(query);
  const immediate = options?.immediate !== false;

  if (immediate) callback(mql.matches);

  // Modern API
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mql.addEventListener?.("change", handler) ??
    mql.addListener?.(handler as unknown as (e: Event) => void);

  return () => {
    mql.removeEventListener?.("change", handler as EventListener) ??
      mql.removeListener?.(handler as unknown as (e: Event) => void);
  };
}

/** Check if a media query currently matches */
export function matchesMediaQuery(query: string): boolean {
  return window.matchMedia(query).matches;
}

/** Get the media query for a specific breakpoint name */
export function getBreakpointQuery(name: BreakpointName): string {
  return BREAKPOINTS[name]?.query ?? `(min-width: ${BREAKPOINTS[name]?.min ?? 0}px)`;
}

/** Check if the current viewport matches or exceeds a given breakpoint */
export function isAtLeast(name: BreakpointName): boolean {
  const bp = BREAKPOINTS[name];
  if (!bp) return false;
  return window.innerWidth >= bp.min;
}

/** Check if the current viewport is at or below a given breakpoint */
export function isAtMost(name: BreakpointName): boolean {
  const bp = BREAKPOINTS[name];
  if (!bp || !bp.max) return false;
  return window.innerWidth <= bp.max;
}

/** Get the current active breakpoint name */
export function getCurrentBreakpoint(): BreakpointName {
  const w = window.innerWidth;
  for (let i = BREAKPOINT_ORDER.length - 1; i >= 0; i--) {
    const name = BREAKPOINT_ORDER[i]!;
    if (w >= BREAKPOINTS[name]!.min) return name;
  }
  return "xs";
}

// --- Responsive Value Resolution ---

/**
 * Resolve a responsive value object to the current breakpoint's value.
 * Falls back to 'base' then to the next smaller matching breakpoint.
 *
 * @example
 * ```ts
 * const fontSize = resolveResponsive({
 *   sm: 14,
 *   md: 16,
 *   lg: 18,
 * }); // Returns 16 on md screen, falls back appropriately
 * ```
 */
export function resolveResponsive<T>(values: ResponsiveValue<T>): T | undefined {
  const current = getCurrentBreakpoint();
  const idx = BREAKPOINT_ORDER.indexOf(current);

  // Try exact match first
  if (values[current] !== undefined) return values[current];

  // Try base fallback
  if (values.base !== undefined) return values.base;

  // Walk down to find nearest defined value
  for (let i = idx; i >= 0; i--) {
    const name = BREAKPOINT_ORDER[i]!;
    if (values[name] !== undefined) return values[name];
  }

  // Walk up
  for (let i = idx + 1; i < BREAKPOINT_ORDER.length; i++) {
    const name = BREAKPOINT_ORDER[i]!;
    if (values[name] !== undefined) return values[name];
  }

  return undefined;
}

/**
 * Create a reactive responsive value that updates on resize.
 * Returns { current, destroy }.
 */
export function createResponsiveValue<T>(
  values: ResponsiveValue<T>,
  onChange?: (value: T | undefined) => void,
): { current: T | undefined; destroy: () => void } {
  let currentValue = resolveResponsive(values);
  onChange?.(currentValue);

  const unsub = subscribeMediaQuery("screen", () => {
    const newValue = resolveResponsive(values);
    if (newValue !== currentValue) {
      currentValue = newValue;
      onChange?.(currentValue);
    }
  });

  return {
    get current() { return currentValue; },
    destroy: unsub,
  };
}

// --- Responsive Typography ---

/** Calculate responsive font size using clamp() CSS function */
export function fluidFontSize(
  minSize: number,
  maxSize: number,
  minViewport = 320,
  maxViewport = 1200,
): string {
  // clamp(minSize, preferredSize, maxSize)
  // preferredSize = minSize + ((maxSize - minSize) / (maxVW - minVW)) * (100vw - minVW)
  const slope = (maxSize - minSize) / (maxViewport - minViewport);
  const intercept = minSize - slope * minViewport;
  return `clamp(${minSize}px, ${intercept}px + ${slope * 100}vw, ${maxSize}px)`;
}

/** Generate responsive font size with step-based scaling */
export function responsiveFontSize(
  baseSize: number,
  scaleSteps: Partial<Record<BreakpointName, number>>,
): ResponsiveValue<string> {
  const result: ResponsiveValue<string> = {};
  for (const [name, scale] of Object.entries(scaleSteps)) {
    result[name as BreakpointName] = `${baseSize * scale!}px`;
  }
  result.base = `${baseSize}px`;
  return result;
}

/** Apply responsive font size to an element that auto-updates on resize */
export function applyResponsiveTypography(
  element: HTMLElement,
  sizes: ResponsiveValue<number | string>,
): () => void {
  const apply = () => {
    const val = resolveResponsive(sizes);
    if (val !== undefined) element.style.fontSize = typeof val === "number" ? `${val}px` : val;
  };

  apply();
  window.addEventListener("resize", apply);
  return () => window.removeEventListener("resize", apply);
}

// --- Image Srcset Generation ---

/** Generate a srcset attribute value from widths */
export function generateSrcSet(
  baseUrl: string,
  widths: number[],
  options?: { format?: string; quality?: number },
): string {
  const format = options?.format ?? "webp";
  const q = options?.quality !== undefined ? `q=${options.quality}` : "";

  return widths
    .map((w) => {
      const url = baseUrl.replace(/\.(?!.*\.)([^/.]+)$/, `.${format}`)
        .replace(/(\.[^.]+)$/, `-${w}w$1`);
      return `${url}${q ? `?${q}` : ""} ${w}w`;
    })
    .join(", ");
}

/** Generate a sizes attribute based on breakpoints */
export function generateSizes(
  sizeMap: Array<{ breakpoint?: BreakpointName; size: string }>,
): string {
  return sizeMap
    .map(({ breakpoint, size }) => {
      if (!breakpoint) return size;
      const bp = BREAKPOINTS[breakpoint];
      if (!bp) return size;
      return `(min-width: ${bp.min}px) ${size}`;
    })
    .reverse()
    .join(", ");
}

/** Pick the best image source for current viewport width */
export function pickBestImageSource(
  sources: Array<{ url: string; minWidth?: number; maxWidth?: number }>,
): string | null {
  const vw = window.innerWidth;

  // Find best matching source
  let best: Array<typeof sources[0]> = [];
  for (const source of sources) {
    if (source.minWidth !== undefined && vw < source.minWidth) continue;
    if (source.maxWidth !== undefined && vw > source.maxWidth) continue;
    best.push(source);
  }

  // Pick the one with smallest range above our viewport (most efficient)
  if (best.length === 0) {
    // Fallback: pick largest maxWidth that covers us
    const fallback = sources.filter((s) => !s.minWidth || s.minWidth <= vw)
      .sort((a, b) => (b.maxWidth ?? Infinity) - (a.maxWidth ?? Infinity));
    return fallback[0]?.url ?? null;
  }

  return best.sort((a, b) => (a.maxWidth ?? Infinity) - (b.maxWidth ?? Infinity))[0]?.url ?? null;
}

// --- Container Query Helpers ---

/**
 * Monitor a container element's width and invoke callbacks at thresholds.
 * Polyfill-style approach using ResizeObserver.
 */
export function createContainerQuery(
  container: HTMLElement,
  thresholds: Array<{ name: string; minWidth: number }>,
  options?: { onChange?: (name: string) => void },
): { current: string; destroy: () => void } {
  let currentName = "";

  const update = () => {
    const w = container.clientWidth;
    let matched = "";
    // Find smallest matching threshold
    for (const t of thresholds.sort((a, b) => b.minWidth - a.minWidth)) {
      if (w >= t.minWidth) {
        matched = t.name;
        break;
      }
    }
    if (matched && matched !== currentName) {
      currentName = matched;
      options?.onChange?.(currentName);
    }
  };

  update();

  const ro = new ResizeObserver(update);
  ro.observe(container);

  return {
    get current() { return currentName; },
    destroy: () => ro.disconnect(),
  };
}

/** Apply inline container-query-style classes based on width */
export function applyContainerClasses(
  element: HTMLElement,
  classMap: Array<{ minWidth: number; className: string }>,
): () => void {
  const sorted = [...classMap].sort((a, b) => b.minWidth - a.minWidth);

  const update = () => {
    const w = element.clientWidth;
    // Remove all managed classes first
    for (const entry of sorted) {
      element.classList.remove(entry.className);
    }
    // Add matching class(es)
    for (const entry of sorted) {
      if (w >= entry.minWidth) {
        element.classList.add(entry.className);
        break;
      }
    }
  };

  update();
  const ro = new ResizeObserver(update);
  ro.observe(element);

  return () => ro.disconnect();
}

// --- Device Detection ---

/** Comprehensive device information snapshot */
export function getDeviceInfo(): DeviceInfo {
  const nav = navigator;
  const conn = (nav as unknown as Record<string, unknown>).connection as
    | { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean; type?: string }
    | undefined;

  return {
    isMobile: window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(nav.userAgent),
    isTablet: window.innerWidth >= 768 && window.innerWidth < 992,
    isDesktop: window.innerWidth >= 992,
    isTouchDevice: "ontouchstart" in window ||
      nav.maxTouchPoints > 0 ||
      (nav as unknown as Record<string, unknown>).msMaxTouchPoints > 0,
    hasHoverCapability: window.matchMedia("(hover: hover)").matches,
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    prefersDarkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
    prefersHighContrast: window.matchMedia("(prefers-contrast: high)").matches,
    orientation: window.innerWidth > window.innerHeight ? "landscape" : "portrait",
    screenWidth: screen.width,
    screenHeight: screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio ?? 1,
    colorDepth: screen.colorDepth,
    connectionType: conn?.type ?? ("type" in (conn ?? {}) ? String(conn.type) : null),
    effectiveType: conn?.effectiveType ?? null,
    downlink: conn?.downlink ?? null,
    rtt: conn?.rtt ?? null,
    saveData: conn?.saveData ?? null,
  };
}

/** Quick check: is this likely a mobile device? */
export function isMobile(): boolean {
  return getDeviceInfo().isMobile;
}

/** Quick check: is touch available? */
export function isTouch(): boolean {
  return getDeviceInfo().isTouchDevice;
}

/** Quick check: does device support hover? */
export function canHover(): boolean {
  return getDeviceInfo().hasHoverCapability;
}

/** Detect if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Detect if user prefers dark mode */
export function prefersDarkMode(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Detect if user prefers light mode */
export function prefersLightMode(): boolean {
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

/** Detect if user prefers high contrast */
export function prefersHighContrast(): boolean {
  return window.matchMedia("(prefers-contrast: high)").matches;
}

/** Watch for color scheme changes */
export function watchColorScheme(
  callback: (isDark: boolean) => void,
): () => void {
  return subscribeMediaQuery("(prefers-color-scheme: dark)", (matches) => callback(matches));
}

// --- Orientation Handling ---

/** Get current orientation */
export function getOrientation(): "portrait" | "landscape" {
  return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
}

/** Watch for orientation changes */
export function watchOrientation(
  callback: (orientation: "portrait" | "landscape") => void,
): () => void {
  const handler = () => callback(getOrientation());
  window.addEventListener("resize", handler);
  window.addEventListener("orientationchange", handler);
  handler(); // Initial call

  return () => {
    window.removeEventListener("resize", handler);
    window.removeEventListener("orientationchange", handler);
  };
}

/** Lock orientation (fullscreen API, may not work in all contexts) */
export async function lockOrientation(
  orientation: "portrait" | "landscape" | "any",
): Promise<boolean> {
  try {
    await (screen.orientation as unknown as { lock: (o: string) => Promise<void> }).lock?.(orientation);
    return true;
  } catch {
    return false;
  }
}

/** Unlock orientation */
export function unlockOrientation(): void {
  (screen.orientation as unknown as { unlock: () => void })?.unlock?.();
}

// --- Adaptive UI Patterns ---

/**
 * Show/hide elements based on breakpoint.
 * Returns destroy function.
 */
export function responsiveVisibility(
  element: HTMLElement,
  showAt: BreakpointName[], // Show only at these breakpoints
): () => void {
  const queries = showAt.map((name) => ({
    name,
    mql: window.matchMedia(BREAKPOINTS[name]!.query),
  }));

  const update = () => {
    const anyMatch = queries.some((q) => q.mql.matches);
    element.style.display = anyMatch ? "" : "none";
  };

  update();

  const unsubs = queries.map((q) =>
    subscribeMediaQuery(q.mql.media, update),
  );

  return () => unsubs.forEach((fn) => fn());
}

/**
 * Swap content between two elements based on breakpoint.
 * Below threshold: show element A. At/above: show element B.
 */
export function responsiveSwap(
  elementA: HTMLElement,
  elementB: HTMLElement,
  swapAt: BreakpointName,
): () => void {
  const query = `(min-width: ${BREAKPOINTS[swapAt]!.min}px)`;

  const update = (matches: boolean) => {
    elementA.style.display = matches ? "none" : "";
    elementB.style.display = matches ? "" : "none";
  };

  return subscribeMediaQuery(query, update);
}

/**
 * Create a responsive column count that adjusts with viewport.
 */
export function responsiveColumns(
  container: HTMLElement,
  config: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number; "2xl"?: number; default?: number },
): () => void {
  const defaults = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5, "2xl": 6, ...config };

  const update = () => {
    const bp = getCurrentBreakpoint();
    const cols = defaults[bp] ?? defaults.default ?? 4;
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  };

  update();
  window.addEventListener("resize", update);
  return () => window.removeEventListener("resize", update);
}
