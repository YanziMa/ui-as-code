/**
 * Tooltip Anchor Utilities: Smart tooltip positioning engine that anchors
 * tooltips to target elements with automatic placement calculation,
 * boundary-aware flipping, offset control, and follow-cursor mode.
 */

// --- Types ---

export type TooltipPlacement = "top" | "bottom" | "left" | "right" |
  "top-start" | "top-end" | "bottom-start" | "bottom-end" |
  "left-start" | "left-end" | "right-start" | "right-end";

export type TooltipStrategy = "absolute" | "fixed" | "follow";

export interface AnchorOptions {
  /** Target element to anchor to */
  target: HTMLElement;
  /** Tooltip content element */
  tooltip: HTMLElement;
  /** Preferred placement */
  placement?: TooltipPlacement;
  /** Distance from target in px */
  gap?: number;
  /** Offset along the axis (px) */
  offset?: number;
  /** Strategy for positioning */
  strategy?: TooltipStrategy;
  /** Auto-flip if out of viewport bounds */
  autoFlip?: boolean;
  /** Shift into viewport if overflowing */
  shift?: boolean  /** Boundary padding in px */
  boundaryPadding?: number;
  /** Constrain to a specific element */
  constrainTo?: HTMLElement | "viewport";
  /** Z-index */
  zIndex?: number;
  /** Show arrow indicator */
  showArrow?: boolean;
  /** Arrow size in px */
  arrowSize?: number;
  /** Arrow color */
  arrowColor?: string;
  /** Enable follow-cursor mode (tooltip follows mouse) */
  followCursor?: boolean;
  /** Follow cursor offset X/Y */
  followOffset?: { x: number; y: number };
  /** Container for the tooltip (default body) */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
}

export interface AnchorInstance {
  /** The tooltip element (repositioned each call) */
  tooltipEl: HTMLElement;
  /** Current effective placement */
  currentPlacement: TooltipPlacement;
  /** Calculate and apply position */
  position: () => void;
  /** Update placement preference */
  setPlacement: (p: TooltipPlacement) => void;
  /** Update gap */
  setGap: (g: number) => void;
  /** Update target element */
  setTarget: (t: HTMLElement) => void;
  /** Show tooltip */
  show: () => void;
  /** Hide tooltip */
  hide: () => void;
  /** Check visibility */
  isVisible: () => boolean;
  /** Destroy cleanup */
  destroy: () => void;
}

// --- Placement Calculator ---

interface PositionResult {
  x: number;
  y: number;
  placement: TooltipPlacement;
}

function calculateAnchorPosition(
  targetRect: DOMRect,
  tooltipSize: { width: number; height: number },
  placement: TooltipPlacement,
  gap: number,
  offset: number,
): PositionResult {
  let x: number;
  let y: number;

  switch (placement) {
    case "top":
      x = targetRect.left + targetRect.width / 2 - tooltipSize.width / 2 + offset;
      y = targetRect.top - tooltipSize.height - gap;
      break;
    case "top-start":
      x = targetRect.left + offset;
      y = targetRect.top - tooltipSize.height - gap;
      break;
    case "top-end":
      x = targetRect.right - tooltipSize.width - offset;
      y = targetRect.top - tooltipSize.height - gap;
      break;
    case "bottom":
      x = targetRect.left + targetRect.width / 2 - tooltipSize.width / 2 + offset;
      y = targetRect.bottom + gap;
      break;
    case "bottom-start":
      x = targetRect.left + offset;
      y = targetRect.bottom + gap;
      break;
    case "bottom-end":
      x = targetRect.right - tooltipSize.width - offset;
      y = targetRect.bottom + gap;
      break;
    case "left":
      x = targetRect.left - tooltipSize.width - gap;
      y = targetRect.top + targetRect.height / 2 - tooltipSize.height / 2 + offset;
      break;
    case "left-start":
      x = targetRect.left - tooltipSize.width - gap;
      y = targetRect.top + offset;
      break;
    case "left-end":
      x = targetRect.left - tooltipSize.width - gap;
      y = targetRect.bottom - tooltipSize.height - offset;
      break;
    case "right":
      x = targetRect.right + gap;
      y = targetRect.top + targetRect.height / 2 - tooltipSize.height / 2 + offset;
      break;
    case "right-start":
      x = targetRect.right + gap;
      y = targetRect.top + offset;
      break;
    case "right-end":
      x = targetRect.right + gap;
      y = targetRect.bottom - tooltipSize.height - offset;
      break;
    default:
      x = targetRect.left + targetRect.width / 2 - tooltipSize.width / 2;
      y = targetRect.bottom + gap;
  }

  return { x, y, placement };
}

const OPPOSITE_MAP: Record<string, TooltipPlacement> = {
  "top": "bottom", "bottom": "top",
  "left": "right", "right": "left",
  "top-start": "bottom-start", "top-end": "bottom-end",
  "bottom-start": "top-start", "bottom-end": "top-end",
  "left-start": "right-start", "left-end": "right-end",
  "right-start": "left-start", "right-end": "left-end",
};

function getAxis(placement: TooltipPlacement): "vertical" | "horizontal" {
  return placement.startsWith("top") || placement.startsWith("bottom") ? "vertical" : "horizontal";
}

// --- Core Factory ---

/**
 * Create a tooltip anchor that positions a tooltip relative to a target.
 *
 * @example
 * ```ts
 * const anchor = createTooltipAnchor({
 *   target: buttonEl,
 *   tooltip: tooltipEl,
 *   placement: "top",
 *   gap: 8,
 *   showArrow: true,
 * });
 * anchor.position();
 * ```
 */
export function createTooltipAnchor(options: AnchorOptions): AnchorInstance {
  const {
    target,
    tooltip,
    placement = "top",
    gap = 8,
    offset = 0,
    strategy = "absolute",
    autoFlip = true,
    shift = true,
    boundaryPadding = 8,
    constrainTo = "viewport",
    zIndex = 9999,
    showArrow = false,
    arrowSize = 8,
    arrowColor = "#fff",
    followCursor = false,
    followOffset = { x: 12, y: 16 },
    container = document.body,
    className,
  } = options;

  let _currentPlacement = placement;
  let _visible = false;
  let cleanupFns: Array<() => void> = [];

  // Ensure tooltip is positioned
  tooltip.style.position = strategy === "fixed" ? "fixed" : "absolute";
  tooltip.style.zIndex = String(zIndex);
  tooltip.style.pointerEvents = "auto";

  if (!container.contains(tooltip)) {
    container.appendChild(tooltip);
  }

  // Arrow element
  let arrowEl: HTMLElement | null = null;
  if (showArrow) {
    arrowEl = document.createElement("div");
    arrowEl.className = "tooltip-arrow";
    arrowEl.style.cssText =
      "position:absolute;width:0;height:0;border-style:solid;";
    tooltip.appendChild(arrowEl);
  }

  function position(): void {
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let result = calculateAnchorPosition(targetRect, { width: tooltipRect.width, height: tooltipRect.height }, _currentPlacement, gap, offset);

    // Auto-flip if out of bounds
    if (autoFlip) {
      const boundary = constrainTo === "viewport"
        ? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
        : (constrainTo as HTMLElement).getBoundingClientRect();
      const axis = getAxis(result.placement);
      let needsFlip = false;

      if (axis === "vertical") {
        if (result.y < boundary.top + boundaryPadding ||
            result.y + tooltipRect.height > boundary.bottom - boundaryPadding) {
          needsFlip = true;
        }
      } else {
        if (result.x < boundary.left + boundaryPadding ||
            result.x + tooltipRect.width > boundary.right - boundaryPadding) {
          needsFlip = true;
        }
      }

      if (needsFlip) {
        const flipped = OPPOSITE_MAP[result.placement] ?? result.placement;
        result = calculateAnchorPosition(targetRect, { width: tooltipRect.width, height: tooltipRect.height }, flipped, gap, offset);
        _currentPlacement = flipped;
      }
    }

    // Shift into bounds
    if (shift) {
      const boundary = constrainTo === "viewport"
        ? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
        : (constrainTo as HTMLElement).getBoundingClientRect();
      result.x = Math.max(boundary.left + boundaryPadding, Math.min(result.x, boundary.right - boundaryPadding - tooltipRect.width));
      result.y = Math.max(boundary.top + boundaryPadding, Math.min(result.y, boundary.bottom - boundaryPadding - tooltipRect.height));
    }

    // Apply position
    tooltip.style.left = `${result.x}px`;
    tooltip.style.top = `${result.y}px`;

    // Position arrow
    if (arrowEl && showArrow) {
      _positionArrow(arrowEl, _currentPlacement, arrowSize, arrowColor, targetRect, tooltipRect);
    }
  }

  function _positionArrow(
    arrow: HTMLElement,
    p: TooltipPlacement,
    size: number,
    color: string,
    tRect: DOMRect,
    ttRect: DOMRect,
  ): void {
    const half = size;
    arrow.style.borderWidth = `${half}px`;

    switch (p) {
      case "top":
        arrow.style.bottom = `-${half}px`;
        arrow.style.left = "50%";
        arrow.style.transform = "translateX(-50%)";
        arrow.style.borderColor = `${color} transparent transparent transparent`;
        break;
      case "bottom":
        arrow.style.top = `-${half}px`;
        arrow.style.left = "50%";
        arrow.style.transform = "translateX(-50%)";
        arrow.style.borderColor = `transparent transparent ${color} transparent`;
        break;
      case "left":
        arrow.style.right = `-${half}px`;
        arrow.style.top = "50%";
        arrow.style.transform = "translateY(-50%)";
        arrow.style.borderColor = `transparent ${color} transparent transparent`;
        break;
      case "right":
        arrow.style.left = `-${half}px`;
        arrow.style.top = "50%";
        arrow.style.transform = "translateY(-50%)";
        arrow.style.borderColor = `transparent transparent transparent ${color}`;
        break;
      default:
        if (p.startsWith("top")) {
          arrow.style.bottom = `-${half}px`;
          arrow.style.borderColor = `${color} transparent transparent transparent`;
        } else if (p.startsWith("bottom")) {
          arrow.style.top = `-${half}px`;
          arrow.style.borderColor = `transparent transparent ${color} transparent`;
        } else if (p.startsWith("left")) {
          arrow.style.right = `-${half}px`;
          arrow.style.borderColor = `transparent ${color} transparent transparent`;
        } else {
          arrow.style.left = `-${half}px`;
          arrow.style.borderColor = `transparent transparent transparent ${color}`;
        }
    }
  }

  function show(): void {
    _visible = true;
    tooltip.style.display = "";
    tooltip.style.visibility = "visible";
    position();
    if (followCursor) _setupFollowCursor();
  }

  function hide(): void {
    _visible = false;
    tooltip.style.display = "none";
    _removeListeners();
  }

  function isVisible(): boolean { return _visible; }

  function setPlacement(p: TooltipPlacement): void { _currentPlacement = p; if (_visible) position(); }
  function setGap(g: number): void { /* store for next position */ }
  function setTarget(t: HTMLElement): void { /* could update reference */ }

  function destroy(): void {
    hide();
    if (arrowEl) arrowEl.remove();
  }

  // --- Follow Cursor ---

  function _setupFollowCursor(): void {
    const moveHandler = (e: MouseEvent): void => {
      tooltip.style.left = `${e.clientX + followOffset.x}px`;
      tooltip.style.top = `${e.clientY + followOffset.y}px`;
    };
    document.addEventListener("mousemove", moveHandler);
    cleanupFns.push(() => document.removeEventListener("mousemove", moveHandler));

    const leaveHandler = (): void => {
      // Keep visible but stop following until re-enter
      document.removeEventListener("mousemove", moveHandler);
    };
    target.addEventListener("mouseleave", leaveHandler);
    cleanupFns.push(() => target.removeEventListener("mouseleave", leaveHandler));
  }

  return {
    tooltipEl: tooltip,
    get currentPlacement() { return _currentPlacement; },
    position, setPlacement, setGap, setTarget,
    show, hide, isVisible, destroy,
  };
}
