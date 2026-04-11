/**
 * Layout Utilities: Element positioning, alignment, measurement,
 * responsive layout helpers, grid/flex utilities, viewport calculations,
 * and DOM geometry helpers.
 */

// --- Types ---

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Alignment {
  horizontal: "start" | "center" | "end" | "stretch";
  vertical: "start" | "center" | "end" | "stretch";
}

export interface LayoutMetrics {
  /** Element's bounding rect relative to viewport */
  viewportRect: Rect;
  /** Element's bounding rect relative to document */
  documentRect: Rect;
  /** Element's offset from its offset parent */
  offsetPosition: Position;
  /** Scroll position of the nearest scrollable ancestor */
  scrollParentOffset: Position;
  /** Available space around element */
  availableSpace: { top: number; right: number; bottom: number; left: number };
  /** Whether element is fully visible in viewport */
  isFullyVisible: boolean;
  /** Percentage visible (0-100) */
  visibilityPercent: number;
}

// --- Measurement ---

/** Get element's bounding rectangle as a plain object */
export function getRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

/** Get element's position relative to the document */
export function getPositionInDocument(el: Element): Position {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
  };
}

/** Get element's offset position (like offsetLeft/offsetTop but accounts for positioned ancestors) */
export function getOffsetPosition(el: HTMLElement): Position {
  let x = 0;
  let y = 0;
  let current: HTMLElement | null = el;

  while (current && current !== document.body) {
    x += current.offsetLeft;
    y += current.offsetTop;
    current = current.offsetParent as HTMLElement;
  }

  return { x, y };
}

/** Comprehensive layout metrics for an element */
export function getLayoutMetrics(el: HTMLElement): LayoutMetrics {
  const viewportRect = getRect(el);
  const docPos = getPositionInDocument(el);
  const offsetPos = getOffsetPosition(el);

  // Find scroll parent
  const scrollParent = findScrollParent(el);
  const scrollParentOffset = scrollParent
    ? { x: scrollParent.scrollLeft, y: scrollParent.scrollTop }
    : { x: 0, y: 0 };

  // Available space
  const top = viewportRect.y;
  const right = window.innerWidth - viewportRect.x - viewportRect.width;
  const bottom = window.innerHeight - viewportRect.y - viewportRect.height;
  const left = viewportRect.x;

  // Visibility
  const isFullyVisible =
    viewportRect.x >= 0 &&
    viewportRect.y >= 0 &&
    viewportRect.x + viewportRect.width <= window.innerWidth &&
    viewportRect.y + viewportRect.height <= window.innerHeight;

  const visibleWidth = Math.max(0, Math.min(
    viewportRect.x + viewportRect.width, window.innerWidth,
  ) - Math.max(viewportRect.x, 0));
  const visibleHeight = Math.max(0, Math.min(
    viewportRect.y + viewportRect.height, window.innerHeight,
  ) - Math.max(viewportRect.y, 0));
  const totalArea = viewportRect.width * viewportRect.height || 1;
  const visibleArea = visibleWidth * visibleHeight;

  return {
    viewportRect,
    documentRect: { ...docPos, width: viewportRect.width, height: viewportRect.height },
    offsetPosition: offsetPos,
    scrollParentOffset,
    availableSpace: { top, right, bottom, left },
    isFullyVisible,
    visibilityPercent: Math.round((visibleArea / totalArea) * 100),
  };
}

// --- Positioning ---

/** Position an element relative to a target with smart boundary detection */
export function positionElement(
  target: HTMLElement,
  anchor: HTMLElement | Rect,
  placement: "top" | "bottom" | "left" | "right" | "top-start" | "top-end" | "bottom-start" | "bottom-end" | "left-start" | "left-end" | "right-start" | "right-end",
  options?: { gap?: number; flip?: boolean; constrainToViewport?: boolean },
): void {
  const { gap = 4, flip = true, constrainToViewport = true } = options ?? {};

  const anchorRect = anchor instanceof HTMLElement ? getRect(anchor) : anchor;
  const targetRect = getRect(target);

  let x: number;
  let y: number;

  // Calculate base position
  switch (placement) {
    case "top":
      x = anchorRect.x + anchorRect.width / 2 - targetRect.width / 2;
      y = anchorRect.y - targetRect.height - gap;
      break;
    case "bottom":
      x = anchorRect.x + anchorRect.width / 2 - targetRect.width / 2;
      y = anchorRect.y + anchorRect.height + gap;
      break;
    case "left":
      x = anchorRect.x - targetRect.width - gap;
      y = anchorRect.y + anchorRect.height / 2 - targetRect.height / 2;
      break;
    case "right":
      x = anchorRect.x + anchorRect.width + gap;
      y = anchorRect.y + anchorRect.height / 2 - targetRect.height / 2;
      break;
    case "top-start":
      x = anchorRect.x;
      y = anchorRect.y - targetRect.height - gap;
      break;
    case "top-end":
      x = anchorRect.x + anchorRect.width - targetRect.width;
      y = anchorRect.y - targetRect.height - gap;
      break;
    case "bottom-start":
      x = anchorRect.x;
      y = anchorRect.y + anchorRect.height + gap;
      break;
    case "bottom-end":
      x = anchorRect.x + anchorRect.width - targetRect.width;
      y = anchorRect.y + anchorRect.height + gap;
      break;
    case "left-start":
      x = anchorRect.x - targetRect.width - gap;
      y = anchorRect.y;
      break;
    case "left-end":
      x = anchorRect.x - targetRect.width - gap;
      y = anchorRect.y + anchorRect.height - targetRect.height;
      break;
    case "right-start":
      x = anchorRect.x + anchorRect.width + gap;
      y = anchorRect.y;
      break;
    case "right-end":
      x = anchorRect.x + anchorRect.width + gap;
      y = anchorRect.y + anchorRect.height - targetRect.height;
      break;
    default:
      x = anchorRect.x;
      y = anchorRect.y + anchorRect.height + gap;
  }

  // Flip if out of bounds
  if (flip) {
    if ((placement.startsWith("top") || placement.startsWith("bottom")) &&
        (y < 0 || y + targetRect.height > window.innerHeight)) {
      if (placement.startsWith("top")) {
        y = anchorRect.y + anchorRect.height + gap;
      } else {
        y = anchorRect.y - targetRect.height - gap;
      }
    }
    if ((placement.startsWith("left") || placement.startsWith("right")) &&
        (x < 0 || x + targetRect.width > window.innerWidth)) {
      if (placement.startsWith("left")) {
        x = anchorRect.x + anchorRect.width + gap;
      } else {
        x = anchorRect.x - targetRect.width - gap;
      }
    }
  }

  // Constrain to viewport
  if (constrainToViewport) {
    x = Math.max(0, Math.min(x, window.innerWidth - targetRect.width));
    y = Math.max(0, Math.min(y, window.innerHeight - targetRect.height));
  }

  target.style.position = "fixed";
  target.style.left = `${x}px`;
  target.style.top = `${y}px`;
}

/** Center an element within a container or viewport */
export function centerElement(
  element: HTMLElement,
  container?: HTMLElement | null,
): void {
  const containerEl = container ?? null;
  const containerRect = containerEl ? getRect(containerEl) : {
    x: 0, y: 0, width: window.innerWidth, height: window.innerHeight,
  };

  const elRect = getRect(element);
  const x = containerRect.x + (containerRect.width - elRect.width) / 2;
  const y = containerRect.y + (containerRect.height - elRect.height) / 2;

  if (containerEl) {
    element.style.position = "absolute";
    element.style.left = `${x - containerRect.x}px`;
    element.style.top = `${y - containerRect.y}px`;
  } else {
    element.style.position = "fixed";
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  }
}

// --- Alignment ---

/** Apply flex-like alignment to children of a container */
export function alignChildren(
  container: HTMLElement,
  alignment: Partial<Alignment>,
): void {
  const h = alignment.horizontal ?? "start";
  const v = alignment.vertical ?? "start";

  const justifyContentMap: Record<string, string> = {
    start: "flex-start", center: "center", end: "flex-end", stretch: "stretch",
  };
  const alignItemsMap: Record<string, string> = {
    start: "flex-start", center: "center", end: "flex-end", stretch: "stretch",
  };

  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.justifyContent = justifyContentMap[h];
  container.style.alignItems = alignItemsMap[v];
}

// --- Viewport & Scrolling ---

/** Get the current viewport dimensions */
export function getViewportSize(): { width: number; height: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/** Get the visual viewport size (accounts for mobile zoom/keyboard) */
export function getVisualViewport(): { width: number; height: number } | null {
  if (!window.visualViewport) return null;
  return { width: window.visualViewport.width, height: window.visualViewport.height };
}

/** Check if an element is in the viewport */
export function isInViewport(el: Element, threshold = 0): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= -threshold &&
    rect.left >= -threshold &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + threshold &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) + threshold
  );
}

/** Find the nearest scrollable ancestor element */
export function findScrollParent(element: HTMLElement): HTMLElement | null {
  if (!element) return null;

  let current: HTMLElement | null = element.parentElement;
  const excludeTags = new Set(["HTML", "BODY"]);

  while (current && !excludeTags.has(current.tagName)) {
    const style = getComputedStyle(current);
    if (
      (style.overflow === "auto" || style.overflow === "scroll" ||
       style.overflowY === "auto" || style.overflowY === "scroll" ||
       style.overflowX === "auto" || style.overflowX === "scroll") &&
      (current.scrollHeight > current.clientHeight || current.scrollWidth > current.clientWidth)
    ) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

/** Scroll an element into view with smooth behavior and optional padding */
export function scrollIntoViewIfNeeded(
  element: HTMLElement,
  options?: { padding?: number; behavior?: "auto" | "smooth" | "instant"; block?: "start" | "center" | "end" | "nearest" },
): void {
  const { padding = 16, behavior = "smooth", block = "nearest" } = options ?? {};

  if (!isInViewport(element, padding)) {
    element.scrollIntoView({ behavior, block });
  }
}

// --- Grid Helpers ---

/** Calculate CSS grid template columns for equal-width items */
export function gridTemplateColumns(
  itemCount: number,
  minItemWidth = 200,
  gap = 16,
): string {
  const viewportWidth = window.innerWidth;
  const maxColumns = Math.floor((viewportWidth + gap) / (minItemWidth + gap));
  const columns = Math.min(itemCount, Math.max(1, maxColumns));

  return `repeat(${columns}, minmax(${minItemWidth}px, 1fr))`;
}

/** Apply masonry-like layout using CSS columns */
export function applyMasonryLayout(
  container: HTMLElement,
  columnCount = 3,
  gap = 16,
): void {
  container.style.columnCount = String(columnCount);
  container.style.columnGap = `${gap}px`;

  for (const child of Array.from(container.children) as HTMLElement[]) {
    child.style.breakInside = "avoid";
    child.style.marginBottom = `${gap}px`;
  }
}

// --- Size Constraints ---

/** Constrain an element's size to fit within bounds while maintaining aspect ratio */
export function constrainToContainer(
  element: HTMLElement,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const naturalWidth = element.naturalWidth ?? element.offsetWidth;
  const naturalHeight = element.naturalHeight ?? element.offsetHeight;

  if (naturalWidth <= maxWidth && naturalHeight <= maxHeight) {
    return { width: naturalWidth, height: naturalHeight };
  }

  const aspectRatio = naturalWidth / naturalHeight;
  let width: number;
  let height: number;

  if (maxWidth / aspectRatio <= maxHeight) {
    width = maxWidth;
    height = maxWidth / aspectRatio;
  } else {
    height = maxHeight;
    width = maxHeight * aspectRatio;
  }

  element.style.width = `${width}px`;
  element.style.height = `${height}px`;

  return { width, height };
}

/** Make an element fill its remaining available space in a flex/grid context */
export function fillRemainingSpace(element: HTMLElement): void {
  element.style.flexGrow = "1";
  element.style.flexShrink = "1";
  element.style.flexBasis = "0%";
  element.style.minWidth = "0";
  element.style.minHeight = "0";
  element.style.overflow = "auto";
}

// --- Responsive Helpers ---

/** Match element's computed styles against breakpoints and return active breakpoint */
export function getElementBreakpoint(
  element: HTMLElement,
  breakpoints: Record<string, number> = { sm: 640, md: 768, lg: 1024, xl: 1280 },
): string {
  const width = element.offsetWidth;
  const sortedBps = Object.entries(breakpoints).sort((a, b) => b[1] - a[1]);

  for (const [name, minWidth] of sortedBps) {
    if (width >= minWidth) return name;
  }
  return "xs";
}

/** Set element display property based on breakpoint */
export function setResponsiveDisplay(
  element: HTMLElement,
  displays: Record<string, "block" | "none" | "inline-block" | "flex" | "grid">,
  breakpoints: Record<string, number> = { sm: 640, md: 768, lg: 1024, xl: 1280 },
): void {
  const bp = getElementBreakpoint(element, breakpoints);
  element.style.display = displays[bp] ?? displays["lg"] ?? "block";
}
