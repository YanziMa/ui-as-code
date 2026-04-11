/**
 * Breakpoint Utilities: Responsive breakpoint definitions, matching,
 * container queries, fluid typography scaling, breakpoint-aware
 * value resolution, and responsive grid/column systems.
 */

// --- Types ---

export type BreakpointKey = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface BreakpointDefinition {
  key: BreakpointKey;
  minWidth: number;
  label: string;
}

export interface FluidScaleOptions {
  /** Minimum viewport width (default: 375) */
  minVw?: number;
  /** Maximum viewport width (default: 1440) */
  maxVw?: number;
  /** Unit (default: "px") */
  unit?: string;
  /** Clamp to nearest step? */
  round?: boolean;
}

export interface ResponsiveValue<T> {
  /** Default/base value */
  default: T;
  /** Per-breakpoint overrides */
  values?: Partial<Record<BreakpointKey, T>>;
}

export interface ContainerQueryConfig {
  /** Container name */
  name?: string;
  /** Container type (inline-size or size) */
  type?: "inline-size" | "size";
  /** Min/max widths for named containers */
  minWidth?: number;
  maxWidth?: number;
}

// --- Default Breakpoints ---

const DEFAULT_BREAKPOINTS: BreakpointDefinition[] = [
  { key: "xs", minWidth: 0, label: "Extra Small" },
  { key: "sm", minWidth: 640, label: "Small" },
  { key: "md", minWidth: 768, label: "Medium" },
  { key: "lg", minWidth: 1024, label: "Large" },
  { key: "xl", minWidth: 1280, label: "Extra Large" },
  { key: "2xl", minWidth: 1536, label: "2X Large" },
];

const BREAKPOINT_MAP: Record<BreakpointKey, number> = Object.fromEntries(
  DEFAULT_BREAKPOINTS.map((bp) => [bp.key, bp.minWidth]),
) as Record<BreakpointKey, number>;

/** Ordered list of breakpoints from smallest to largest */
const BREAKPOINT_ORDER: BreakpointKey[] = [...BREAKPOINT_MAP.keys() as BreakpointKey[]];

// --- Breakpoint Resolution ---

/**
 * Get the current active breakpoint based on window width.
 */
export function getActiveBreakpoint(customBps?: Partial<Record<BreakpointKey, number>>): BreakpointDefinition {
  const bps = { ...BREAKPOINT_MAP, ...customBps };
  const w = typeof window !== "undefined" ? window.innerWidth : 1024;

  let matched = DEFAULT_BREAKPOINTS[0]!;
  for (const bp of DEFAULT_BREAKPOINTS) {
    if (w >= (bps[bp.key] ?? bp.minWidth)) {
      matched = bp;
    }
  }
  return matched;
}

/**
 * Check if the viewport is at least a given breakpoint.
 * Mobile-first approach.
 */
export function isAtLeast(key: BreakpointKey): boolean {
  const w = typeof window !== "undefined" ? window.innerWidth : 0;
  return w >= (BREAKPOINT_MAP[key] ?? 0);
}

/**
 * Check if the viewport is at most a given breakpoint.
 * Desktop-first approach.
 */
export function isAtMost(key: BreakpointKey): boolean {
  const w = typeof window !== "undefined" ? window.innerWidth : Infinity;
  // At most means less than the NEXT breakpoint's min width
  const idx = BREAKPOINT_ORDER.indexOf(key);
  if (idx < BREAKPOINT_ORDER.length - 1) {
    const nextKey = BREAKPOINT_ORDER[idx + 1]!;
    return w < (BREAKPOINT_MAP[nextKey] ?? Infinity);
  }
  return true; // Largest breakpoint
}

/**
 * Get all breakpoints that currently match.
 */
export function getMatchingBreakpoints(): BreakpointKey[] {
  const w = typeof window !== "undefined" ? window.innerWidth : 1024;
  return BREAKPOINT_ORDER.filter((key) => w >= (BREAKPOINT_MAP[key] ?? 0));
}

/**
 * Resolve a responsive value for the current viewport.
 * Returns the most specific matching breakpoint value, falling back to default.
 */
export function resolveResponsiveValue<T>(rv: ResponsiveValue<T>): T {
  const matching = getMatchingBreakpoints();
  // Find the most specific (largest) matching override
  for (let i = matching.length - 1; i >= 0; i--) {
    const val = rv.values?.[matching[i]!];
    if (val !== undefined) return val;
  }
  return rv.default;
}

// --- Fluid Typography / Spacing ---

/**
 * Generate a CSS `clamp()` expression for fluid sizing.
 * Scales smoothly between minVw and maxVw.
 *
 * @example
 * fluidClamp(16, 18, 24) → "clamp(1rem, calc(0.875rem + 0.25vw), 1.5rem)"
 */
export function fluidClamp(
  minSize: number,
  preferredSize: number,
  maxSize: number,
  options: FluidScaleOptions = {},
): string {
  const minVw = options.minVw ?? 375;
  const maxVw = options.maxVw ?? 1440;
  const unit = options.unit ?? "px";

  // Convert to rem for output (16px base)
  const toRem = (v: number) => `${(v / 16).toFixed(4)}rem`;

  // Calculate slope and intercept for linear interpolation
  const slope = (preferredSize - minSize) / (maxVw - minVw);
  const intercept = minSize - slope * minVw;

  let preferredStr: string;
  if (Math.abs(slope) < 0.001) {
    preferredStr = toRem(minSize);
  } else {
    const sign = intercept >= 0 ? "+" : "-";
    const absIntercept = Math.abs(intercept).toFixed(4);
    preferredStr = `calc(${toRem(slope * 100)}vw ${sign} ${absIntercept}rem)`;
  }

  return `clamp(${toRem(minSize)}, ${preferredStr}, ${toRem(maxSize)})`;
}

/**
 * Generate a complete set of fluid scale values for common properties.
 */
export function generateFluidScale(
  baseSizes: Record<string, [number, number, number]>, // property → [min, pref, max]
  options?: FluidScaleOptions,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [prop, sizes] of Object.entries(baseSizes)) {
    result[prop] = fluidClamp(sizes[0], sizes[1], sizes[2], options);
  }
  return result;
}

// --- Media Query String Generation ---

/**
 * Build a min-width media query string for a breakpoint.
 */
export function minWQuery(key: BreakpointKey, unit = "px"): string {
  return `(min-width: ${BREAKPOINT_MAP[key]}${unit})`;
}

/**
 * Build a max-width media query string for a breakpoint.
 */
export function maxWQuery(key: BreakpointKey, unit = "px"): string {
  const idx = BREAKPOINT_ORDER.indexOf(key);
  if (idx < BREAKPOINT_ORDER.length - 1) {
    const nextVal = (BREAKPOINT_MAP[BREAKPOINT_ORDER[idx + 1]!] ?? 1536) - 1;
    return `(max-width: ${nextVal}${unit})`;
  }
  return "(min-width: 0px)";
}

/**
 * Build a range media query between two breakpoints.
 */
export function rangeQuery(min: BreakpointKey, max: BreakpointKey, unit = "px"): string {
  return `${minWQuery(min, unit)} and ${maxWQuery(max, unit)}`;
}

// --- Container Query Support ---

/**
 * Generate a container query CSS rule snippet.
 */
export function containerQuery(
  config: ContainerQueryConfig,
  cssContent: string,
): string {
  const type = config.type ?? "inline-size";
  const namePart = config.name ? ` ${config.name}` : "";
  return `@container${namePart} (${type}-width: ${(config.minWidth ?? 0)}px) {\n${cssContent}\n}`;
}

/**
 * Generate a named container definition for an element.
 */
export function containerDefinition(config: ContainerQueryConfig): string {
  const type = config.type ?? "inline-size";
  const namePart = config.name ? ` ${config.name}` : "";
  const parts: string[] = [`container-type: ${type}`];
  if (config.name) parts.push(`container-name: ${config.name}`);
  return `{ ${parts.join("; ")}; }`;
}

// --- Grid System Helpers ---

/**
 * Calculate column count for a given breakpoint in a responsive grid.
 */
export function gridColumns(
  totalColumns: number,
  breakpoint: BreakpointKey,
  columnMap?: Partial<Record<BreakpointKey, number>>,
): number {
  if (columnMap && columnMap[breakpoint] !== undefined) {
    return columnMap[breakpoint]!;
  }
  // Default: fewer columns on smaller screens
  const defaults: Partial<Record<BreakpointKey, number>> = {
    xs: 1,
    sm: 2,
    md: Math.min(totalColumns, 3),
    lg: Math.min(totalColumns, 4),
    xl: totalColumns,
    "2xl": totalColumns,
  };
  return defaults[breakpoint] ?? totalColumns;
}

/**
 * Calculate gutter size for a given breakpoint.
 */
export function gutterSize(
  baseGutter: number,
  breakpoint: BreakpointKey,
  scaleMap?: Partial<Record<BreakpointKey, number>>,
): number {
  if (scaleMap && scaleMap[breakpoint] !== undefined) {
    return baseGutter * (scaleMap[breakpoint]! / 100);
  }
  // Default: smaller gutters on mobile
  const defaults: Partial<Record<BreakpointKey, number>> = {
    xs: 50,
    sm: 75,
    md: 100,
    lg: 100,
    xl: 150,
    "2xl": 200,
  };
  return baseGutter * ((defaults[breakpoint] ?? 100) / 100);
}

// --- Exports ---

export { DEFAULT_BREAKPOINTS, BREAKPOINT_MAP, BREAKPOINT_ORDER };
