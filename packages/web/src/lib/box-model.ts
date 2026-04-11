/**
 * Box Model Utilities: CSS box model measurement and manipulation.
 * Get/set computed box model properties (margin, border, padding,
 * content size), box-sizing helpers, element sizing calculations,
 * outer/inner dimension utilities, and overflow handling.
 */

// --- Types ---

export interface BoxModelValues {
  /** Top margin */
  marginTop: number;
  /** Right margin */
  marginRight: number;
  /** Bottom margin */
  marginBottom: number;
  /** Left margin */
  marginLeft: number;
  /** Top padding */
  paddingTop: number;
  /** Right padding */
  paddingRight: number;
  /** Bottom padding */
  paddingBottom: number;
  /** Left padding */
  paddingLeft: number;
  /** Top border width */
  borderTop: number;
  /** Right border width */
  borderRight: number;
  /** Bottom border width */
  borderBottom: number;
  /** Left border width */
  borderLeft: number;
}

export interface BoxDimensions {
  /** Content width (without padding/border/margin) */
  contentWidth: number;
  /** Content height */
  contentHeight: number;
  /** Padding box width (content + padding) */
  paddingBoxWidth: number;
  /** Padding box height */
  paddingBoxHeight: number;
  /** Border box width (content + padding + border) */
  borderBoxWidth: number;
  /** Border box height */
  borderBoxHeight: number;
  /** Margin box width (border + margin) */
  marginBoxWidth: number;
  /** Margin box height */
  marginBoxHeight: number;
}

export interface BoxSizingOptions {
  /** Box sizing mode */
  boxSizing?: "content-box" | "border-box";
  /** Unit for values (default: "px") */
  unit?: string;
}

// --- Measurement ---

/**
 * Get all computed box model values for an element.
 */
export function getBoxModel(el: HTMLElement): BoxModelValues {
  const cs = getComputedStyle(el);
  return {
    marginTop: parseFloat(cs.marginTop) || 0,
    marginRight: parseFloat(cs.marginRight) || 0,
    marginBottom: parseFloat(cs.marginBottom) || 0,
    marginLeft: parseFloat(cs.marginLeft) || 0,
    paddingTop: parseFloat(cs.paddingTop) || 0,
    paddingRight: parseFloat(cs.paddingRight) || 0,
    paddingBottom: parseFloat(cs.paddingBottom) || 0,
    paddingLeft: parseFloat(cs.paddingLeft) || 0,
    borderTop: parseFloat(cs.borderTopWidth) || 0,
    borderRight: parseFloat(cs.borderRightWidth) || 0,
    borderBottom: parseFloat(cs.borderBottomWidth) || 0,
    borderLeft: parseFloat(cs.borderLeftWidth) || 0,
  };
}

/**
 * Calculate all box dimensions for an element.
 */
export function getBoxDimensions(el: HTMLElement): BoxDimensions {
  const bm = getBoxModel(el);
  const cw = el.offsetWidth - bm.paddingLeft - bm.paddingRight - bm.borderLeft - bm.borderRight;
  const ch = el.offsetHeight - bm.paddingTop - bm.paddingBottom - bm.borderTop - bm.borderBottom;

  return {
    contentWidth: Math.max(0, cw),
    contentHeight: Math.max(0, ch),
    paddingBoxWidth: cw + bm.paddingLeft + bm.paddingRight,
    paddingBoxHeight: ch + bm.paddingTop + bm.paddingBottom,
    borderBoxWidth: el.offsetWidth,
    borderBoxHeight: el.offsetHeight,
    marginBoxWidth: el.offsetWidth + bm.marginLeft + bm.marginRight,
    marginBoxHeight: el.offsetHeight + bm.marginTop + bm.marginBottom,
  };
}

/**
 * Get the outer dimensions of an element (including margin).
 */
export function getOuterSize(el: HTMLElement): { width: number; height: number } {
  const bm = getBoxModel(el);
  return {
    width: el.offsetWidth + bm.marginLeft + bm.marginRight,
    height: el.offsetHeight + bm.marginTop + bm.marginBottom,
  };
}

/**
 * Get the inner/content dimensions of an element (excluding padding and border).
 */
export function getInnerSize(el: HTMLElement): { width: number; height: number } {
  const bm = getBoxModel(el);
  return {
    width: Math.max(0, el.offsetWidth - bm.paddingLeft - bm.paddingRight - bm.borderLeft - bm.borderRight),
    height: Math.max(0, el.offsetHeight - bm.paddingTop - bm.paddingBottom - bm.borderTop - bm.borderBottom),
  };
}

// --- Sizing Helpers ---

/**
 * Set the content-box size of an element (accounts for current box-sizing).
 * The resulting content area will be exactly the specified dimensions.
 */
export function setContentSize(
  el: HTMLElement,
  width: number,
  height: number,
): void {
  const cs = getComputedStyle(el);
  const isBorderBox = cs.boxSizing === "border-box";
  const bm = getBoxModel(el);

  if (isBorderBox) {
    el.style.width = `${width + bm.paddingLeft + bm.paddingRight + bm.borderLeft + bm.borderRight}px`;
    el.style.height = `${height + bm.paddingTop + bm.paddingBottom + bm.borderTop + bm.borderBottom}px`;
  } else {
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
  }
}

/**
 * Set the border-box size of an element (accounts for current box-sizing).
 * The total element size (including border) will be exactly the specified dimensions.
 */
export function setBorderBoxSize(
  el: HTMLElement,
  width: number,
  height: number,
): void {
  const cs = getComputedStyle(el);
  const isBorderBox = cs.boxSizing === "border-box";

  if (!isBorderBox) {
    const bm = getBoxModel(el);
    el.style.width = `${width - bm.paddingLeft - bm.paddingRight - bm.borderLeft - bm.borderRight}px`;
    el.style.height = `${height - bm.paddingTop - bm.paddingBottom - bm.borderTop - bm.borderBottom}px`;
  } else {
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
  }
}

/**
 * Make an element fill its parent's available space.
 */
export function fillParent(el: HTMLElement): void {
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.position = el.parentElement?.style.position ? undefined : "relative";
}

/**
 * Make an element's padding use a percentage of its own width (like CSS does).
 */
export function setPaddingPercent(el: HTMLElement, percent: number): void {
  const w = el.offsetWidth || el.parentElement?.offsetWidth || window.innerWidth;
  const val = (percent / 100) * w;
  el.style.padding = `${val}px`;
}

// --- Margin & Padding Utilities ---

/** Set all margins at once */
export function setMargin(el: HTMLElement, value: number | { t?: number; r?: number; b?: number; l?: number }): void {
  if (typeof value === "number") {
    el.style.margin = `${value}px`;
  } else {
    if (value.t !== undefined) el.style.marginTop = `${value.t}px`;
    if (value.r !== undefined) el.style.marginRight = `${value.r}px`;
    if (value.b !== undefined) el.style.marginBottom = `${value.b}px`;
    if (value.l !== undefined) el.style.marginLeft = `${value.l}px`;
  }
}

/** Set all paddings at once */
export function setPadding(el: HTMLElement, value: number | { t?: number; r?: number; b?: number; l?: number }): void {
  if (typeof value === "number") {
    el.style.padding = `${value}px`;
  } else {
    if (value.t !== undefined) el.style.paddingTop = `${value.t}px`;
    if (value.r !== undefined) el.style.paddingRight = `${value.r}px`;
    if (value.b !== undefined) el.style.paddingBottom = `${value.b}px`;
    if (value.l !== undefined) el.style.paddingLeft = `${value.l}px`;
  }
}

/** Reset all margins to zero */
export function resetMargin(el: HTMLElement): void {
  el.style.margin = "0";
}

/** Reset all padding to zero */
export function resetPadding(el: HTMLElement): void {
  el.style.padding = "0";
}

/** Remove default browser styles from an element (margin reset) */
export function normalizeElement(el: HTMLElement): void {
  el.style.margin = "0";
  el.style.padding = "0";
  el.style.boxSizing = "border-box";
}

// --- Box Sizing ---

/** Force border-box on an element and optionally its children */
export function forceBorderBox(el: HTMLElement, includeChildren = false): void {
  el.style.boxSizing = "border-box";

  if (includeChildren) {
    const all = el.querySelectorAll("*") as NodeListOf<HTMLElement>;
    for (const child of all) {
      child.style.boxSizing = "border-box";
    }
  }
}

/** Check if an element uses border-box */
export function isBorderBox(el: HTMLElement): boolean {
  return getComputedStyle(el).boxSizing === "border-box";
}

// --- Overflow ---

/** Configure overflow behavior */
export function setOverflow(
  el: HTMLElement,
  opts: {
    x?: "visible" | "hidden" | "scroll" | "auto" | "clip";
    y?: "visible" | "hidden" | "scroll" | "auto" | "clip";
  } = {},
): void {
  if (opts.x) el.style.overflowX = opts.x;
  if (opts.y) el.style.overflowY = opts.y;
  if (!opts.x && !opts.y) el.style.overflow = "auto";
}

/** Enable text truncation with ellipsis */
export function truncateText(el: HTMLElement, maxLines = 1): void {
  if (maxLines === 1) {
    el.style.whiteSpace = "nowrap";
    el.style.overflow = "hidden";
    el.style.textOverflow = "ellipsis";
  } else {
    el.style.display = "-webkit-box";
    el.style.webkitLineClamp = String(maxLines);
    el.style.webkitBoxOrient = "vertical";
    el.style.overflow = "hidden";
  }
}

// --- Scrollbar Gutter ---

/** Reserve space for scrollbar to prevent layout shift when content overflows */
export function reserveScrollbarGutter(el: HTMLElement): void {
  el.style.scrollbarGutter = "stable";
}

/** Get the scrollbar width for the current environment */
export function getScrollbarWidth(): number {
  if (typeof document === "undefined") return 0;

  // Cache result
  const cached = (document.documentElement as unknown as { _scrollbarWidth?: number })._scrollbarWidth;
  if (cached) return cached;

  const outer = document.createElement("div");
  outer.style.cssText = "visibility:hidden;width:100px;overflow:scroll;position:absolute;top:-9999px;";
  document.body.appendChild(outer);

  const inner = document.createElement("div");
  inner.style.width = "100%";
  outer.appendChild(inner);

  const width = outer.offsetWidth - inner.offsetWidth;
  outer.parentNode!.removeChild(outer);

  (document.documentElement as unknown as { _scrollbarWidth: number })._scrollbarWidth = width;
  return width;
}

// --- Element Comparison ---

/** Check if two elements have the same box dimensions */
export function sameBoxSize(a: HTMLElement, b: HTMLElement): boolean {
  return a.offsetWidth === b.offsetWidth && a.offsetHeight === b.offsetHeight;
}

/** Get the difference in box model between two elements */
export function diffBoxModel(a: HTMLElement, b: HTMLElement): Partial<BoxModelValues> {
  const am = getBoxModel(a);
  const bm = getBoxModel(b);
  const diff: Partial<BoxModelValues> = {};

  for (const key of Object.keys(am) as (keyof BoxModelValues)[]) {
    const delta = (am[key] ?? 0) - (bm[key] ?? 0);
    if (Math.abs(delta) > 0.5) {
      diff[key] = delta;
    }
  }

  return diff;
}
