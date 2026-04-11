/**
 * Anchor Positioning: Smart positioning engine for popovers, tooltips, dropdowns,
 * and floating panels. Auto-flip to stay in viewport, boundary constraints,
 * offset calculations, arrow/pointer alignment, and collision detection.
 */

// --- Types ---

export type Placement =
  | "top" | "bottom" | "left" | "right"
  | "top-start" | "top-end"
  | "bottom-start" | "bottom-end"
  | "left-start" | "left-end"
  | "right-start" | "right-end";

export type Alignment = "start" | "center" | "end";

export interface PositionResult {
  /** Left position relative to viewport */
  x: number;
  /** Top position relative to viewport */
  y: number;
  /** The placement that was actually used (may differ from requested if flipped) */
  placement: Placement;
  /** Whether the element was flipped due to overflow */
  flipped: boolean;
}

export interface AnchorOptions {
  /** Reference/anchor element */
  anchor: HTMLElement;
  /** Floating element to position */
  floating: HTMLElement;
  /** Preferred placement */
  placement?: Placement;
  /** Offset in px from anchor (default: 8) */
  offset?: number;
  /** Additional x offset */
  offsetX?: number;
  /** Additional y offset */
  offsetY?: number;
  /** Boundary container (default: viewport) */
  boundary?: HTMLElement | Window;
  /** Padding inside boundary (default: 4) */
  padding?: number;
  /** Enable auto-flip when overflowing */
  autoFlip?: boolean;
  /** Fallback placements in order */
  fallbackPlacements?: Placement[];
  /** Match width to anchor? */
  matchWidth?: boolean;
  /** Constrain size within boundary? */
  constrainSize?: boolean;
  /** Arrow/pointer size for offset adjustment */
  arrowSize?: number;
  /** Use fixed positioning instead of absolute? */
  strategy?: "absolute" | "fixed";
  /** Shift along the axis to fit in boundary */
  shift?: boolean;
}

export interface ArrowPosition {
  /** X coordinate of arrow tip */
  x: number;
  /** Y coordinate of arrow tip */
  y: number;
  /** Rotation angle in degrees */
  rotation: number;
}

// --- Placement mappings ---

const FLIP_MAP: Record<string, string> = {
  top: "bottom", bottom: "top", left: "right", right: "left",
  "top-start": "bottom-start", "top-end": "bottom-end",
  "bottom-start": "top-start", "bottom-end": "top-end",
  "left-start": "right-start", "left-end": "right-end",
  "right-start": "left-start", "right-end": "left-end",
};

function getMainAxis(placement: Placement): "vertical" | "horizontal" {
  return placement.startsWith("top") || placement.startsWith("bottom") ? "vertical" : "horizontal";
}

function getAlignment(placement: Placement): Alignment {
  if (placement.includes("start")) return "start";
  if (placement.includes("end")) return "end";
  return "center";
}

function getOppositePlacement(placement: Placement): Placement {
  return (FLIP_MAP[placement] ?? placement) as Placement;
}

// --- Core positioning ---

export function computePosition(options: AnchorOptions): PositionResult {
  const {
    anchor,
    floating,
    placement = "bottom",
    offset = 8,
    offsetX = 0,
    offsetY = 0,
    padding = 4,
    autoFlip = true,
    fallbackPlacements,
    matchWidth = false,
    constrainSize = true,
    arrowSize = 0,
    strategy = "absolute",
    shift = true,
  } = options;

  const boundaryEl = options.boundary ?? window;

  const anchorRect = anchor.getBoundingClientRect();
  const floatRect = floating.getBoundingClientRect();

  const boundaryRect = boundaryEl instanceof Element
    ? boundaryEl.getBoundingClientRect()
    : { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth };

  // Try each placement option
  const placementsToTry: Placement[] = [placement];
  if (fallbackPlacements) {
    placementsToTry.push(...fallbackPlacements);
  } else if (autoFlip) {
    placementsToTry.push(getOppositePlacement(placement));
  }

  for (const tryPlacement of placementsToTry) {
    const result = tryPlace(tryPlacement);
    if (!result.overflow || !autoFlip) {
      return result;
    }
  }

  // If all placements overflow, use the original anyway
  return tryPlace(placement);

  function tryPlace(p: Placement): PositionResult & { overflow: boolean } {
    const mainAxis = getMainAxis(p);
    const align = getAlignment(p);

    let x: number, y: number;

    if (mainAxis === "vertical") {
      // Top or bottom
      const isTop = p.startsWith("top");
      const baseY = isTop ? anchorRect.top - floatRect.height - offset : anchorRect.bottom + offset;

      switch (align) {
        case "start":
          x = anchorRect.left + offsetX;
          break;
        case "end":
          x = anchorRect.right - floatRect.width + offsetX;
          break;
        default:
          x = anchorRect.left + (anchorRect.width - floatRect.width) / 2 + offsetX;
          break;
      }
      y = baseY + offsetY;
    } else {
      // Left or right
      const isLeft = p.startsWith("left");
      const baseX = isLeft ? anchorRect.left - floatRect.width - offset : anchorRect.right + offset;

      x = baseX + offsetX;
      switch (align) {
        case "start":
          y = anchorRect.top + offsetY;
          break;
        case "end":
          y = anchorRect.bottom - floatRect.height + offsetY;
          break;
        default:
          y = anchorRect.top + (anchorRect.height - floatRect.height) / 2 + offsetY;
          break;
      }
    }

    // Apply boundary constraints
    let overflow = false;
    const maxX = boundaryRect.right - padding - floatRect.width;
    const maxY = boundaryRect.bottom - padding - floatRect.height;
    const minX = boundaryRect.left + padding;
    const minY = boundaryRect.top + padding;

    if (x < minX) { x = minX; overflow = true; }
    if (x > maxX) { x = Math.max(minX, x); overflow = true; }
    if (y < minY) { y = minY; overflow = true; }
    if (y > maxY) { y = Math.max(minY, y); overflow = true; }

    // Match width
    if (matchWidth) {
      const w = Math.min(anchorRect.width, maxX - minX);
      floating.style.width = `${w}px`;
      x = anchorRect.left + offsetX;
    }

    // Constrain size
    if (constrainSize) {
      const maxW = boundaryRect.right - boundaryRect.left - padding * 2;
      const maxH = boundaryRect.bottom - boundaryRect.top - padding * 2;
      if (floatRect.width > maxW) floating.style.width = `${maxW}px`;
      if (floatRect.height > maxH) floating.style.height = `${maxH}px`;
    }

    return { x, y, placement: p, flipped: p !== placement, overflow };
  }
}

/** Calculate arrow/pointer position for a positioned element */
export function computeArrowPosition(
  anchor: HTMLElement,
  floating: HTMLElement,
  placement: Placement,
  arrowSize: number = 8,
): ArrowPosition {
  const anchorRect = anchor.getBoundingClientRect();
  const floatRect = floating.getBoundingClientRect();
  const mainAxis = getMainAxis(placement);

  let x: number, y: number, rotation: number;

  if (mainAxis === "vertical") {
    // Arrow points up (from bottom of popover to anchor)
    x = anchorRect.left + anchorRect.width / 2;
    y = placement.startsWith("top")
      ? floatRect.bottom
      : anchorRect.top;
    rotation = 0;
  } else {
    // Arrow points left (from right of popover to anchor)
    x = placement.startsWith("left")
      ? floatRect.right
      : anchorRect.left;
    y = anchorRect.y + anchorRect.height / 2;
    rotation = 90;
  }

  return { x, y, rotation };
}

/** Update position reactively (e.g., on scroll/resize) */
export function createPositionObserver(
  anchor: HTMLElement,
  floating: HTMLElement,
  options: Omit<AnchorOptions, "anchor" | "floating">,
): { update: () => void; destroy: () => void } {
  let rafId: number | null = null;
  let destroyed = false;

  function update(): void {
    if (destroyed) return;
    const pos = computePosition({ anchor, floating, ...options });
    const s = options.strategy ?? "absolute";

    floating.style.position = s;
    floating.style.left = `${pos.x}px`;
    floating.style.top = `${pos.y}px`;

    if (options.onUpdate) options.onUpdate(pos);
  }

  // Auto-update on scroll/resize
  const scrollEl = getScrollParent(anchor);
  scrollEl.addEventListener("scroll", () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(update);
  }, { passive: true });

  const resizeObs = new ResizeObserver(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(update);
  });
  resizeObs.observe(anchor);
  resizeObs.observe(floating);
  if (options.boundary && options.boundary instanceof Element) {
    resizeObs.observe(options.boundary);
  }

  // Initial
  update();

  return {
    update,
    destroy() {
      destroyed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      scrollEl.removeEventListener("scroll", () => {});
      resizeObs.disconnect();
    },
  };
}

/** Get the nearest scrollable parent */
function getScrollParent(el: HTMLElement): HTMLElement | Window {
  if (el === document.body) return window;

  const style = getComputedStyle(el);
  if (/(auto|scroll|overlay|hidden)/.test(style.overflowY)) {
    return el;
  }
  return el.parentElement ? getScrollParent(el.parentElement as HTMLElement) : window;
}
