/**
 * Popover Utilities: Positionable popover/tooltip component with smart
 * placement, auto-flip, arrow indicator, boundary detection, portal rendering,
 * virtual element support, and lifecycle management.
 */

// --- Types ---

export type PopoverPlacement = "top" | "bottom" | "left" | "right" |
  "top-start" | "top-end" | "bottom-start" | "bottom-end" |
  "left-start" | "left-end" | "right-start" | "right-end";

export type PopoverTrigger = "click" | "hover" | "focus" | "manual";

export interface VirtualElement {
  getBoundingClientRect: DOMRectReadOnly;
}

export interface PopoverOptions {
  /** Trigger element or virtual element */
  trigger: HTMLElement | VirtualElement;
  /** Content (HTMLElement or HTML string) */
  content: HTMLElement | string;
  /** Preferred placement */
  placement?: PopoverPlacement;
  /** How to trigger open/close */
  triggerMode?: PopoverTrigger;
  /** Show delay for hover mode (ms) */
  showDelay?: number;
  /** Hide delay for hover mode (ms) */
  hideDelay?: number;
  /** Offset from trigger (px) */
  offset?: number;
  /** Show arrow indicator */
  arrow?: boolean;
  /** Arrow size (px) */
  arrowSize?: number;
  /** Boundary constraint element (default: viewport) */
  boundary?: HTMLElement | "viewport" | "window";
  /** Flip to opposite side if out of bounds */
  flip?: boolean;
  /** Shift to stay within bounds */
  shift?: boolean;
  /** Padding inside boundary (px) */
  boundaryPadding?: number;
  /** Portal target (default: body) */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
  /** Z-index */
  zIndex?: number;
  /** Close on click outside */
  closeOnClickOutside?: boolean;
  /** Close on escape */
  closeOnEscape?: boolean;
  /** Called when popover opens */
  onOpen?: () => void;
  /** Called when popover closes */
  onClose?: () => void;
  /** Update position on scroll/resize */
  updateOnScroll?: boolean;
}

export interface PopoverInstance {
  /** The popover element */
  el: HTMLElement;
  /** Current placement (may differ from requested due to flip) */
  currentPlacement: PopoverPlacement;
  /** Open the popover */
  show: () => void;
  /** Hide the popover */
  hide: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Update content */
  setContent: (content: HTMLElement | string) => void;
  /** Recalculate position */
  updatePosition: () => void;
  /** Update trigger reference */
  setTrigger: (trigger: HTMLElement | VirtualElement) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Positioning Engine ---

interface PositionResult {
  x: number;
  y: number;
  placement: PopoverPlacement;
}

function calculatePosition(
  triggerRect: DOMRect,
  popoverSize: { width: number; height: number },
  placement: PopoverPlacement,
  offset: number,
): PositionResult {
  let x: number;
  let y: number;

  switch (placement) {
    case "top":
      x = triggerRect.left + triggerRect.width / 2 - popoverSize.width / 2;
      y = triggerRect.top - popoverSize.height - offset;
      break;
    case "top-start":
      x = triggerRect.left;
      y = triggerRect.top - popoverSize.height - offset;
      break;
    case "top-end":
      x = triggerRect.right - popoverSize.width;
      y = triggerRect.top - popoverSize.height - offset;
      break;
    case "bottom":
      x = triggerRect.left + triggerRect.width / 2 - popoverSize.width / 2;
      y = triggerRect.bottom + offset;
      break;
    case "bottom-start":
      x = triggerRect.left;
      y = triggerRect.bottom + offset;
      break;
    case "bottom-end":
      x = triggerRect.right - popoverSize.width;
      y = triggerRect.bottom + offset;
      break;
    case "left":
      x = triggerRect.left - popoverSize.width - offset;
      y = triggerRect.top + triggerRect.height / 2 - popoverSize.height / 2;
      break;
    case "left-start":
      x = triggerRect.left - popoverSize.width - offset;
      y = triggerRect.top;
      break;
    case "left-end":
      x = triggerRect.left - popoverSize.width - offset;
      y = triggerRect.bottom - popoverSize.height;
      break;
    case "right":
      x = triggerRect.right + offset;
      y = triggerRect.top + triggerRect.height / 2 - popoverSize.height / 2;
      break;
    case "right-start":
      x = triggerRect.right + offset;
      y = triggerRect.top;
      break;
    case "right-end":
      x = triggerRect.right + offset;
      y = triggerRect.bottom - popoverSize.height;
      break;
    default:
      x = triggerRect.left + triggerRect.width / 2 - popoverSize.width / 2;
      y = triggerRect.bottom + offset;
  }

  return { x, y, placement };
}

/** Get the opposite placement for flipping */
function getOppositePlacement(placement: PopoverPlacement): PopoverPlacement {
  const map: Record<string, PopoverPlacement> = {
    "top": "bottom", "bottom": "top",
    "left": "right", "right": "left",
    "top-start": "bottom-start", "top-end": "bottom-end",
    "bottom-start": "top-start", "bottom-end": "top-end",
    "left-start": "right-start", "left-end": "right-end",
    "right-start": "left-start", "right-end": "left-end",
  };
  return map[placement] ?? placement;
}

/** Get the axis of a placement ("vertical" or "horizontal") */
function getPlacementAxis(placement: PopoverPlacement): "vertical" | "horizontal" {
  if (placement.startsWith("top") || placement.startsWith("bottom")) return "vertical";
  return "horizontal";
}

// --- Core Factory ---

/**
 * Create a positionable popover with smart auto-flip and boundary detection.
 *
 * @example
 * ```ts
 * const popover = createPopover({
 *   trigger: buttonEl,
 *   content: "<div>Popover content</div>",
 *   placement: "bottom",
 *   triggerMode: "click",
 * });
 * popover.show();
 * ```
 */
export function createPopover(options: PopoverOptions): PopoverInstance {
  const {
    trigger,
    content,
    placement = "bottom",
    triggerMode = "click",
    showDelay = 0,
    hideDelay = 100,
    offset = 8,
    arrow = false,
    arrowSize = 8,
    boundary = "viewport",
    flip = true,
    shift = true,
    boundaryPadding = 8,
    container = document.body,
    className,
    zIndex,
    closeOnClickOutside = true,
    closeOnEscape = true,
    onOpen,
    onClose,
    updateOnScroll = true,
  } = options;

  let _visible = false;
  let _currentPlacement = placement;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let cleanupFns: Array<() => void> = [];

  // Create popover element
  const popoverEl = document.createElement("div");
  popoverEl.className = `popover ${className ?? ""}`.trim();
  popoverEl.style.cssText =
    "position:absolute;top:0;left:0;z-index:auto;" +
    "pointer-events:none;opacity:0;transition:opacity 0.15s ease;" +
    `z-index:${zIndex ?? getNextZIndex()};`;

  // Arrow element
  let arrowEl: HTMLElement | null = null;
  if (arrow) {
    arrowEl = document.createElement("div");
    arrowEl.className = "popover-arrow";
    arrowEl.style.cssText =
      "position:absolute;width:0;height:0;border-style:solid;";
    popoverEl.appendChild(arrowEl);
  }

  // Content wrapper
  const contentWrapper = document.createElement("div");
  contentWrapper.className = "popover-content";
  contentWrapper.style.cssText = "pointer-events:auto;";
  if (typeof content === "string") {
    contentWrapper.innerHTML = content;
  } else {
    contentWrapper.appendChild(content);
  }
  popoverEl.appendChild(contentWrapper);

  // Initially hidden
  container.appendChild(popoverEl);

  // --- Positioning ---

  function updatePosition(): void {
    const triggerRect = _getTriggerRect();
    const popoverRect = popoverEl.getBoundingClientRect();

    let result = calculatePosition(triggerRect, { width: popoverRect.width, height: popoverRect.height }, _currentPlacement, offset);

    // Flip check
    if (flip) {
      const boundaryRect = _getBoundaryRect();
      const axis = getPlacementAxis(result.placement);
      let needsFlip = false;

      if (axis === "vertical") {
        if (result.y < boundaryRect.top + boundaryPadding ||
            result.y + popoverRect.height > boundaryRect.bottom - boundaryPadding) {
          needsFlip = true;
        }
      } else {
        if (result.x < boundaryRect.left + boundaryPadding ||
            result.x + popoverRect.width > boundaryRect.right - boundaryPadding) {
          needsFlip = true;
        }
      }

      if (needsFlip) {
        const flipped = getOppositePlacement(result.placement);
        result = calculatePosition(triggerRect, { width: popoverRect.width, height: popoverRect.height }, flipped, offset);
        _currentPlacement = flipped;
      }
    }

    // Shift check
    if (shift) {
      const boundaryRect = _getBoundaryRect();
      if (result.x < boundaryRect.left + boundaryPadding) {
        result.x = boundaryRect.left + boundaryPadding;
      } else if (result.x + popoverRect.width > boundaryRect.right - boundaryPadding) {
        result.x = boundaryRect.right - boundaryPadding - popoverRect.width;
      }
      if (result.y < boundaryRect.top + boundaryPadding) {
        result.y = boundaryRect.top + boundaryPadding;
      } else if (result.y + popoverRect.height > boundaryRect.bottom - boundaryPadding) {
        result.y = boundaryRect.bottom - boundaryPadding - popoverRect.height;
      }
    }

    // Apply position
    popoverEl.style.left = `${result.x}px`;
    popoverEl.style.top = `${result.y}px`;

    // Position arrow
    if (arrowEl && arrow) {
      _positionArrow(arrowEl, _currentPlacement, arrowSize, triggerRect, popoverRect);
    }
  }

  function _positionArrow(
    arrow: HTMLElement,
    p: PopoverPlacement,
    size: number,
    triggerRect: DOMRect,
    popoverRect: DOMRect,
  ): void {
    const half = size;
    const color = "#fff"; // Could be made configurable

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
        // For start/end variants, use base direction
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

  function _getTriggerRect(): DOMRect {
    if ("getBoundingClientRect" in trigger && typeof trigger.getBoundingClientRect === "function") {
      return trigger.getBoundingClientRect();
    }
    return new DOMRect(0, 0, 0, 0);
  }

  function _getBoundaryRect(): DOMRect {
    if (boundary === "viewport" || boundary === "window") {
      return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight, x: 0, y: 0, toJSON() {} } as DOMRect;
    }
    return (boundary as HTMLElement).getBoundingClientRect();
  }

  // --- Show/Hide ---

  function show(): void {
    if (_visible) return;

    clearTimeout(hideTimer!);
    if (showDelay > 0) {
      showTimer = setTimeout(_doShow, showDelay);
      return;
    }
    _doShow();
  }

  function _doShow(): void {
    _visible = true;
    popoverEl.style.pointerEvents = "auto";
    popoverEl.style.opacity = "1";
    updatePosition();

    // Setup event listeners
    _setupListeners();

    onOpen?.();
  }

  function hide(): void {
    if (!_visible) return;

    clearTimeout(showTimer!);
    if (hideDelay > 0) {
      hideTimer = setTimeout(_doHide, hideDelay);
      return;
    }
    _doHide();
  }

  function _doHide(): void {
    _visible = false;
    popoverEl.style.pointerEvents = "none";
    popoverEl.style.opacity = "0";

    _removeListeners();
    onClose?.();
  }

  function toggle(): void { _visible ? hide() : show(); }
  function isVisible(): boolean { return _visible; }

  function setContent(newContent: HTMLElement | string): void {
    contentWrapper.innerHTML = "";
    if (typeof newContent === "string") {
      contentWrapper.innerHTML = newContent;
    } else {
      contentWrapper.appendChild(newContent);
    }
    if (_visible) updatePosition();
  }

  function setTrigger(newTrigger: HTMLElement | VirtualElement): void {
    // Can't reassign const, but we can store it differently
    (options as PopoverOptions).trigger = newTrigger;
    if (_visible) updatePosition();
  }

  function destroy(): void {
    if (_visible) _doHide();
    clearTimeout(showTimer!);
    clearTimeout(hideTimer!);
    _removeListeners();
    popoverEl.remove();
  }

  // --- Event Listeners ---

  function _setupListeners(): void {
    // Click outside
    if (closeOnClickOutside) {
      const handler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const triggerEl = "getBoundingClientRect" in trigger ? trigger as HTMLElement : null;
        if (!popoverEl.contains(target) && (!triggerEl || !triggerEl.contains(target))) {
          hide();
        }
      };
      document.addEventListener("mousedown", handler);
      cleanupFns.push(() => document.removeEventListener("mousedown", handler));
    }

    // Escape
    if (closeOnEscape) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") hide();
      };
      document.addEventListener("keydown", handler);
      cleanupFns.push(() => document.removeEventListener("keydown", handler));
    }

    // Scroll/resize updates
    if (updateOnScroll) {
      const scrollHandler = (): void => { if (_visible) updatePosition(); };
      const resizeHandler = (): void => { if (_visible) updatePosition(); };
      window.addEventListener("scroll", scrollHandler, true);
      window.addEventListener("resize", resizeHandler);
      cleanupFns.push(() => window.removeEventListener("scroll", scrollHandler, true));
      cleanupFns.push(() => window.removeEventListener("resize", resizeHandler));
    }

    // Trigger events
    if (triggerMode !== "manual" && "addEventListener" in trigger) {
      const trigEl = trigger as HTMLElement;

      if (triggerMode === "click") {
        trigEl.addEventListener("click", toggle);
        cleanupFns.push(() => trigEl.removeEventListener("click", toggle));
      } else if (triggerMode === "hover") {
        trigEl.addEventListener("mouseenter", show);
        trigEl.addEventListener("mouseleave", hide);
        popoverEl.addEventListener("mouseenter", show);
        popoverEl.addEventListener("mouseleave", hide);
        cleanupFns.push(() => { trigEl.removeEventListener("mouseenter", show); trigEl.removeEventListener("mouseleave", hide); });
        cleanupFns.push(() => { popoverEl.removeEventListener("mouseenter", show); popoverEl.removeEventListener("mouseleave", hide); });
      } else if (triggerMode === "focus") {
        trigEl.addEventListener("focus", show);
        trigEl.addEventListener("blur", hide);
        cleanupFns.push(() => { trigEl.removeEventListener("focus", show); trigEl.removeEventListener("blur", hide); });
      }
    }
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return {
    el: popoverEl,
    get currentPlacement() { return _currentPlacement; },
    show, hide, toggle, isVisible,
    setContent, updatePosition, setTrigger, destroy,
  };
}

// --- Re-export z-index helper ---
import { getNextZIndex } from "./overlay-utils";
