/**
 * Anchor Utilities: Positioning engine for anchoring elements (popovers,
 * tooltips, dropdowns) to target elements with smart boundary detection,
 * flip behavior, offset handling, and arrow positioning.
 */

// --- Types ---

export type AnchorPlacement = "top" | "bottom" | "left" | "right" |
  "top-start" | "top-end" | "bottom-start" | "bottom-end" |
  "left-start" | "left-end" | "right-start" | "right-end";

export type AnchorAlignment = "start" | "center" | "end";

export type FlipBehavior = "none" | "flip" | "boundary-flip";

export interface AnchorOptions {
  /** The element being positioned (the popup/tooltip) */
  element: HTMLElement;
  /** The target element to anchor to */
  target: HTMLElement;
  /** Preferred placement */
  placement?: AnchorPlacement;
  /** Allow flipping to opposite side? */
  flip?: boolean;
  /** Offset from target (px) */
  offset?: number | { x: number; y: number };
  /** Gap between element and target (px) */
  gap?: number;
  /** Boundary constraint */
  boundary?: HTMLElement | "viewport" | "parent";
  /** Padding inside boundary (px) */
  padding?: number;
  /** Keep within scroll parent? */
  scrollIntoView?: boolean;
  /** Arrow size (0 = no arrow) */
  arrowSize?: number;
  /** Match widths? */
  matchWidth?: boolean;
  /** Called after position is calculated */
  onPositioned?: (result: AnchorResult) => void;
}

export interface AnchorResult {
  /** Final placement used */
  placement: AnchorPlacement;
  /** Whether the placement was flipped */
  flipped: boolean;
  /** Calculated x position */
  x: number;
  /** Calculated y position */
  y: number;
  /** Element rect (after positioning) */
  rect: DOMRect;
  /** Target rect */
  targetRect: DOMRect;
}

export interface AnchorInstance {
  /** Current result */
  getResult(): AnchorResult;
  /** Calculate and apply position */
  position(): AnchorResult;
  /** Update options dynamically */
  update(options: Partial<AnchorOptions>): void;
  /** Set placement */
  setPlacement(placement: AnchorPlacement): void;
  /** Destroy cleanup */
  destroy(): void;
}

// --- Core Factory ---

/**
 * Create an anchor that positions an element relative to a target.
 *
 * @example
 * ```ts
 * const anchor = createAnchor({
 *   element: popoverEl,
 *   target: buttonEl,
 *   placement: "bottom-start",
 *   flip: true,
 *   offset: 4,
 *   arrowSize: 8,
 * });
 *
 * // Update position when needed
 * anchor.position();
 * ```
 */
export function createAnchor(options: AnchorOptions): AnchorInstance {
  const {
    element,
    target,
    placement = "bottom",
    flip = true,
    offset = 0,
    gap = 4,
    boundary = "viewport",
    padding = 8,
    scrollIntoView = false,
    arrowSize = 0,
    matchWidth = false,
    onPositioned,
  } = options;

  let _placement = placement;
  let _flipped = false;
  let _currentResult: AnchorResult | null = null;

  function getBoundaryRect(): DOMRect {
    if (boundary === "viewport") {
      return { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight } as DOMRect;
    }
    if (boundary === "parent") {
      const p = target.parentElement ?? target;
      return p.getBoundingClientRect();
    }
    return (boundary as HTMLElement).getBoundingClientRect();
  }

  function calculatePosition(desiredPlacement?: AnchorPlacement): AnchorResult {
    const place = desiredPlacement ?? _placement;
    const targetRect = target.getBoundingClientRect();
    const elRect = element.getBoundingClientRect();

    let x: number, y: number;
    const [main, align] = parsePlacement(place);
    const offX = typeof offset === "number" ? 0 : (offset?.x ?? 0);
    const offY = typeof offset === "number" ? offset : (offset?.y ?? 0);
    const numOffset = typeof offset === "number" ? offset : 0;

    switch (main) {
      case "top":
        y = targetRect.top - elRect.height - gap - numOffset + offY;
        x = alignX(targetRect, elRect, align) + offX;
        break;
      case "bottom":
        y = targetRect.bottom + gap + numOffset + offY;
        x = alignX(targetRect, elRect, align) + offX;
        break;
      case "left":
        x = targetRect.left - elRect.width - gap - numOffset + offX;
        y = alignY(targetRect, elRect, align) + offY;
        break;
      case "right":
        x = targetRect.right + gap + numOffset + offX;
        y = alignY(targetRect, elRect, align) + offY;
        break;
      default:
        y = targetRect.bottom + gap + numOffset;
        x = alignX(targetRect, elRect, align);
    }

    // Apply boundary constraint
    const bounds = getBoundaryRect();
    let didFlip = false;
    let finalPlace = place;

    if (flip) {
      const flippedPlace = getOpposite(place);
      const [fMain] = parsePlacement(flippedPlace);

      // Check if out of bounds
      if ((fMain === "top" || fMain === "bottom") && (y < bounds.top - padding || y + elRect.height > bounds.bottom + padding)) {
        // Try flipping
        const newY = fMain === "top"
          ? targetRect.bottom + gap + numOffset
          : targetRect.top - elRect.height - gap - numOffset;
        if (newY >= bounds.top - padding && newY + elRect.height <= bounds.bottom + padding) {
          y = newY;
          finalPlace = flippedPlace;
          didFlip = true;
        }
      } else if ((fMain === "left" || fMain === "right") && (x < bounds.left - padding || x + elRect.width > bounds.right + padding)) {
        const newX = fMain === "left"
          ? targetRect.right + gap + numOffset
          : targetRect.left - elRect.width - gap - numOffset;
        if (newX >= bounds.left - padding && newX + elRect.width <= bounds.right + padding) {
          x = newX;
          finalPlace = flippedPlace;
          didFlip = true;
        }
      }
    }

    // Clamp to boundary
    x = Math.max(bounds.left + padding, Math.min(x, bounds.right - elRect.width - padding));
    y = Math.max(bounds.top + padding, Math.min(y, bounds.bottom - elRect.height - padding));

    // Apply position
    element.style.position = "absolute";
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;

    if (matchWidth) {
      element.style.width = `${targetRect.width}px`;
    }

    // Position arrow if present
    if (arrowSize > 0) {
      positionArrow(finalPlace, targetRect, { x, y }, elRect, arrowSize);
    }

    _flipped = didFlip;
    _placement = finalPlace;

    const result: AnchorResult = {
      placement: finalPlace,
      flipped: didFlip,
      x, y,
      rect: new DOMRect(x, y, elRect.width, elRect.height),
      targetRect,
    };

    _currentResult = result;
    onPositioned?.(result);

    return result;
  }

  function position(): AnchorResult { return calculatePosition(); }

  function update(newOpts: Partial<AnchorOptions>): void {
    Object.assign(options, newOpts);
    if (newOpts.placement) _placement = newOpts.placement;
  }

  function setPlacement(p: AnchorPlacement): void { _placement = p; }

  function destroy(): void {
    // Remove inline styles added by anchor
    element.style.position = "";
    element.style.left = "";
    element.style.top = "";
    element.style.width = "";
  }

  return {
    getResult() { return _currentResult!; },
    position, update, setPlacement, destroy,
  };
}

// --- Helpers ---

function parsePlacement(p: AnchorPlacement): [string, AnchorAlignment] {
  const parts = p.split("-");
  const main = parts[0] as string;
  const align = (parts[1] ?? "center") as AnchorAlignment;
  return [main, align];
}

function alignX(tr: DOMRect, er: DOMRect, align: AnchorAlignment): number {
  switch (align) {
    case "start": return tr.left;
    case "end": return tr.right - er.width;
    default: return tr.left + (tr.width - er.width) / 2;
  }
}

function alignY(tr: DOMRect, er: DOMRect, align: AnchorAlignment): number {
  switch (align) {
    case "start": return tr.top;
    case "end": return tr.bottom - er.height;
    default: return tr.top + (tr.height - er.height) / 2;
  }
}

function getOpposite(p: AnchorPlacement): AnchorPlacement {
  const map: Record<string, string> = {
    "top": "bottom", "bottom": "top", "left": "right", "right": "left",
    "top-start": "bottom-start", "top-end": "bottom-end",
    "bottom-start": "top-start", "bottom-end": "top-end",
    "left-start": "right-start", "left-end": "right-end",
    "right-start": "left-start", "right-end": "left-end",
  };
  return (map[p] ?? p) as AnchorPlacement;
}

function positionArrow(
  place: AnchorPlacement,
  tr: DOMRect,
  pos: { x: number; y: number },
  er: DOMRect,
  size: number,
): void {
  const half = size / 2;
  const arrowEl = element.querySelector(".anchor-arrow") as HTMLElement | null ||
    (() => {
      const a = document.createElement("div");
      a.className = "anchor-arrow";
      a.style.cssText =
        `position:absolute;width:${size}px;height:${size}px;background:inherit;` +
        "transform:rotate(45deg);z-index:-1;";
      element.appendChild(a);
      return a;
    })();

  const [main] = parsePlacement(place);

  switch (main) {
    case "top":
      arrowEl.style.bottom = `-${half}px`;
      arrowEl.style.left = `${tr.left + tr.width / 2 - pos.x - half}px`;
      break;
    case "bottom":
      arrowEl.style.top = `-${half}px`;
      arrowEl.style.left = `${tr.left + tr.width / 2 - pos.x - half}px`;
      break;
    case "left":
      arrowEl.style.right = `-${half}px`;
      arrowEl.style.top = `${tr.top + tr.height / 2 - pos.y - half}px`;
      break;
    case "right":
      arrowEl.style.left = `-${half}px`;
      arrowEl.style.top = `${tr.top + tr.height / 2 - pos.y - half}px`;
      break;
  }
}
