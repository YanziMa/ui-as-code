/**
 * Anchor/Popover Positioning Engine: Smart placement with collision detection,
 * arrow positioning, flip behavior, boundary constraints, virtual element API,
 * and automatic best-fit selection.
 */

// --- Types ---

export type Placement =
  | "top" | "bottom" | "left" | "right"
  | "top-start" | "top-end"
  | "bottom-start" | "bottom-end"
  | "left-start" | "left-end"
  | "right-start" | "right-end";

export type Alignment = "start" | "center" | "end";

export interface VirtualElement {
  /** Reference element (the anchor) */
  ref: HTMLElement;
  /** Preferred placement */
  placement?: Placement;
  /** Fallback placements in order */
  fallbackPlacements?: Placement[];
  /** Offset from anchor (px) */
  offset?: { x: number; y: number };
  /** Gap between popover and anchor (px) */
  gap?: number;
  /** Padding inside the boundary container */
  padding?: number;
  /** Boundary element (default: viewport) */
  boundary?: HTMLElement | "clippingParents" | "viewport";
  /** Whether to flip to opposite side on overflow */
  flip?: boolean;
  /** Shift along axis to stay in bounds */
  shift?: boolean;
  /** Arrow/pointer size (0 = no arrow) */
  arrowSize?: number;
  /** Match width of anchor */
  matchWidth?: boolean;
  /** Custom positioning function override */
  customPosition?: (anchor: Rect, popup: Rect) => { x: number; y: number } | null;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PositionResult {
  x: number;
  y: number;
  placement: Placement;
  /** The actual computed rect of the positioned element */
  rect: Rect;
  /** Arrow position (if applicable) */
  arrow?: { x: number; y: number; angle: number };
  /** Whether the position was flipped from preferred */
  flipped: boolean;
}

// --- Helpers ---

function getRect(el: HTMLElement): Rect {
  return el.getBoundingClientRect();
}

function getViewportRect(): Rect {
  return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
}

function getParentClippingRect(el: HTMLElement): Rect {
  let parent = el.parentElement;
  while (parent && parent !== document.body) {
    const style = getComputedStyle(parent);
    if (style.overflow !== "visible" && style.overflow !== "clip") {
      return parent.getBoundingClientRect();
    }
    parent = parent.parentElement;
  }
  return getViewportRect();
}

function resolveBoundary(boundary: VirtualElement["boundary"], ref: HTMLElement): Rect {
  if (!boundary) return getViewportRect();
  if (boundary === "viewport") return getViewportRect();
  if (boundary === "clippingParents") return getParentClippingRect(ref);
  return (boundary as HTMLElement).getBoundingClientRect();
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
}

function isRectInside(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

// --- Placement Resolution ---

const PLACEMENT_CONFIGS: Record<string, { main: "top" | "bottom" | "left" | "right"; align: Alignment }> = {
  top:          { main: "top", align: "center" },
  "top-start":   { main: "top", align: "start" },
  "top-end":     { main: "top", align: "end" },
  bottom:       { main: "bottom", align: "center" },
  "bottom-start": { main: "bottom", align: "start" },
  "bottom-end":  { main: "bottom", align: "end" },
  left:         { main: "left", align: "center" },
  "left-start":  { main: "left", align: "start" },
  "left-end":    { main: "left", align: "end" },
  right:        { main: "right", align: "center" },
  "right-start":  { main: "right", align: "start" },
  "right-end":   { main: "right", align: "end" },
};

const OPPOSITE: Record<Placement, Placement> = {
  top: "bottom", bottom: "top",
  left: "right", right: "left",
  "top-start": "bottom-start", "top-end": "bottom-end",
  "bottom-start": "top-start", "bottom-end": "top-end",
  "left-start": "right-start", "left-end": "right-end",
  "right-start": "left-start", "right-end": "left-end",
};

/** Calculate position for a given placement */
function computePlacement(
  anchor: Rect,
  popup: { width: number; height: number },
  placement: Placement,
  gap: number,
  offset: { x: number; y: number } = { x: 0, y: 0 },
): { x: number; y: number } {
  const config = PLACEMENT_CONFIGS[placement];
  let x: number;
  let y: number;

  switch (config.main) {
    case "top":
      y = anchor.y - popup.height - gap;
      break;
    case "bottom":
      y = anchor.y + anchor.height + gap;
      break;
    case "left":
      x = anchor.x - popup.width - gap;
      break;
    case "right":
      x = anchor.x + anchor.width + gap;
      break;
  }

  switch (config.align) {
    case "start":
      if (config.main === "top" || config.main === "bottom") x = anchor.x + offset.x;
      else y = anchor.y + offset.y;
      break;
    case "end":
      if (config.main === "top" || config.main === "bottom") x = anchor.x + anchor.width - popup.width + offset.x;
      else y = anchor.y + anchor.height - popup.height + offset.y;
      break;
    case "center":
    default:
      if (config.main === "top" || config.main === "bottom") x = anchor.x + (anchor.width - popup.width) / 2 + offset.x;
      else y = anchor.y + (anchor.height - popup.height) / 2 + offset.y;
      break;
  }

  return { x, y };
}

/** Calculate arrow position and rotation angle */
function computeArrow(
  anchor: Rect,
  popupRect: Rect,
  placement: Placement,
  arrowSize: number,
): { x: number; y: number; angle: number } {
  const config = PLACEMENT_CONFIGS[placement];
  let ax: number;
  let ay: number;
  let angle: number;

  // Position arrow at the edge facing the anchor
  switch (config.main) {
    case "top":
      ay = popupRect.y + popupRect.height - arrowSize / 2;
      angle = 180;
      break;
    case "bottom":
      ay = popupRect.y + arrowSize / 2;
      angle = 0;
      break;
    case "left":
      ax = popupRect.x + popupRect.width - arrowSize / 2;
      angle = 90;
      break;
    case "right":
      ax = popupRect.x + arrowSize / 2;
      angle = -90;
      break;
  }

  // Align horizontally or vertically
  switch (config.align) {
    case "start":
      if (config.main === "top" || config.main === "bottom") ax = Math.max(popupRect.x, Math.min(anchor.x + anchor.width / 2 - arrowSize, anchor.x));
      else ay = Math.max(popupRect.y, Math.min(anchor.y + anchor.height / 2 - arrowSize, anchor.y));
      break;
    case "end":
      if (config.main === "top" || config.main === "bottom") ax = Math.min(popupRect.x + popupRect.width - arrowSize, Math.max(anchor.x + anchor.width / 2, anchor.x));
      else ay = Math.min(popupRect.y + popupRect.height - arrowSize, Math.max(anchor.y + anchor.height / 2, anchor.y));
      break;
    default:
      if (config.main === "top" || config.main === "bottom") ax = (popupRect.x + popupRect.width / 2);
      else ay = (popupRect.y + popupRect.height / 2);
      break;
  }

  return { x: ax ?? 0, y: ay ?? 0, angle };
}

// --- Main API ---

/**
 * Compute the optimal position for a popup/popover relative to an anchor element.
 * Supports auto-flip, boundary constraints, arrow positioning, and custom overrides.
 */
export function computePosition(virtualEl: VirtualElement, popupSize: { width: number; height: number }): PositionResult {
  const anchor = getRect(virtualEl.ref);
  const gap = virtualEl.gap ?? 8;
  const padding = virtualEl.padding ?? 8;
  const arrowSize = virtualEl.arrowSize ?? 0;
  const offset = virtualEl.offset ?? { x: 0, y: 0 };

  // Try custom position first
  if (virtualEl.customPosition) {
    const custom = virtualEl.customPosition(anchor, { ...popupSize });
    if (custom) {
      const popupRect = { x: custom.x, y: custom.y, width: popupSize.width, height: popupSize.height };
      return {
        x: custom.x,
        y: custom.y,
        placement: virtualEl.placement ?? "top",
        rect: popupRect,
        arrow: arrowSize > 0 ? computeArrow(anchor, popupRect, virtualEl.placement ?? "top", arrowSize) : undefined,
        flipped: false,
      };
    }
  }

  const preferred = virtualEl.placement ?? "top";
  const boundary = resolveBoundary(virtualEl.boundary, virtualEl.ref);

  // Apply padding to boundary
  const paddedBoundary = {
    x: boundary.x + padding,
    y: boundary.y + padding,
    width: boundary.width - padding * 2,
    height: boundary.height - padding * 2,
  };

  // Build ordered list of placements to try
  const placementsToTry: Placement[] = [preferred];

  if (virtualEl.flip !== false) {
    // Add opposite as first fallback
    placementsToTry.push(OPPOSITE[preferred]!);
  }

  if (virtualEl.fallbackPlacements) {
    for (const fb of virtualEl.fallbackPlacements) {
      if (fb !== preferred && !placementsToTry.includes(fb)) {
        placementsToTry.push(fb);
      }
    }
  }

  // Try each placement until one fits
  for (const placement of placementsToTry) {
    const pos = computePlacement(anchor, popupSize, placement, gap, offset);
    const popupRect = { x: pos.x, y: pos.y, width: popupSize.width, height: popupSize.height };

    // Check if within boundary
    if (isRectInside(popupRect, paddedBoundary)) {
      // Apply shift if enabled
      if (virtualEl.shift) {
        if (pos.x < paddedBoundary.x) pos.x = paddedBoundary.x;
        else if (pos.x + popupSize.width > paddedBoundary.x + paddedBoundary.width) {
          pos.x = paddedBoundary.x + paddedBoundary.width - popupSize.width;
        }
        if (pos.y < paddedBoundary.y) pos.y = paddedBoundary.y;
        else if (pos.y + popupSize.height > paddedBoundary.y + paddedBoundary.height) {
          pos.y = paddedBoundary.y + paddedBoundary.height - popupSize.height;
        }
        popupRect.x = pos.x;
        popupRect.y = pos.y;
      }

      return {
        x: pos.x,
        y: pos.y,
        placement,
        rect: popupRect,
        arrow: arrowSize > 0 ? computeArrow(anchor, popupRect, placement, arrowSize) : undefined,
        flipped: placement !== preferred,
      };
    }
  }

  // If nothing fits, use preferred placement clamped to boundary
  const fallbackPos = computePlacement(anchor, popupSize, preferred, gap, offset);
  const fallbackRect = { x: fallbackPos.x, y: fallbackPos.y, width: popupSize.width, height: popupSize.height };

  // Clamp to boundary
  let finalX = Math.max(paddedBoundary.x, Math.min(fallbackPos.x, paddedBoundary.x + paddedBoundary.width - popupSize.width));
  let finalY = Math.max(paddedBoundary.y, Math.min(fallbackPos.y, paddedBoundary.y + paddedBoundary.height - popupSize.height));

  return {
    x: finalX,
    y: finalY,
    placement: preferred,
    rect: { x: finalX, y: finalY, width: popupSize.width, height: popupSize.height },
    arrow: arrowSize > 0 ? computeArrow(anchor, { x: finalX, y: finalY, width: popupSize.width, height: popupSize.height }, preferred, arrowSize) : undefined,
    flipped: false,
  };
}

/**
 * Create CSS styles for a positioned element (arrow, transform origin).
 */
export function createArrowStyles(result: PositionResult, arrowSize: number): string {
  if (!result.arrow) return "";

  const { x, y, angle } = result.arrow!;
  const half = arrowSize / 2;

  // Arrow is a rotated square (CSS triangle using borders)
  return `
    .popover-arrow {
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${arrowSize}px;
      height: ${arrowSize}px;
      pointer-events: none;
    }
    .popover-arrow::before {
      content: "";
      position: absolute;
      left: ${half}px;
      top: ${half}px;
      border-width: ${half}px ${half}px 0 0;
      border-style: solid;
      border-color: #fff transparent transparent transparent;
      transform: rotate(${angle}deg);
    }
  `;
}

/**
 * Convenience: position a DOM element relative to an anchor.
 */
export function positionElement(
  element: HTMLElement,
  anchor: HTMLElement,
  options: Partial<VirtualElement> & { width?: number; height?: number },
): PositionResult {
  const size = { width: options.width ?? element.offsetWidth, height: options.height ?? element.offsetHeight };
  const result = computePosition({ ref: anchor, ...options }, size);

  element.style.position = "absolute";
  element.style.left = `${result.x}px`;
  element.style.top = `${result.y}px`;

  if (options.matchWidth) {
    element.style.width = `${anchor.offsetWidth}px`;
  }

  return result;
}
