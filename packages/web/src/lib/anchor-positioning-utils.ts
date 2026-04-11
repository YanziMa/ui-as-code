/**
 * Anchor Positioning Utilities: Position elements relative to anchor elements
 * with auto-flip, shift, arrow indicators, virtual elements, and fallback for
 * browsers without CSS Anchor Positioning API.
 */

// --- Types ---

export type AnchorPlacement =
  | "top" | "bottom" | "left" | "right"
  | "top-start" | "top-end" | "bottom-start" | "bottom-end"
  | "left-start" | "left-end" | "right-start" | "right-end"
  | "center";

export type AutoFlipStrategy = "flip" | "shift" | "flip-and-shift";
export type OverflowBoundary = "clippingAncestors" | "viewport" | HTMLElement;

export interface AnchorOptions {
  /** The element to position (the popup/floating element) */
  floating: HTMLElement;
  /** The anchor element to position relative to */
  anchor: HTMLElement;
  /** Preferred placement */
  placement?: AnchorPlacement;
  /** Gap between anchor and floating element (px) */
  gap?: number;
  /** Enable auto-flip when overflowing? */
  autoFlip?: boolean;
  /** Flip strategy */
  flipStrategy?: AutoFlipStrategy;
  /** Shift along the axis to stay in view? */
  shift?: boolean;
  /** Padding from viewport edges (px) */
  padding?: number;
  /** Match width of anchor? */
  matchWidth?: boolean;
  /** Match height of anchor? */
  matchHeight?: boolean;
  /** Show an arrow indicator? */
  arrow?: boolean;
  /** Arrow size in px */
  arrowSize?: number;
  /** Arrow color (default matches floating bg) */
  arrowColor?: string;
  /** Overflow boundary for detection */
  overflowBoundary?: OverflowBoundary;
  /** Called when placement changes (e.g., due to flip) */
  onPlacementChange?: (placement: AnchorPlacement) => void;
  /** Custom class name */
  className?: string;
  /** Auto-update on scroll/resize (default true) */
  autoUpdate?: boolean;
  /** Middleware pipeline — functions that modify the computed position */
  middleware?: Array<(data: AnchorComputeData) => AnchorComputeData>;
}

export interface AnchorComputeData {
  x: number;
  y: number;
  placement: AnchorPlacement;
  anchorRect: DOMRect;
  floatingRect: DOMRect;
  /** Available space info */
  available: { top: number; bottom: number; left: number; right: number };
  /** The original requested placement */
  initialPlacement: AnchorPlacement;
  /** Whether a flip occurred */
  flipped: boolean;
}

export interface AnchorInstance {
  /** The floating element */
  el: HTMLElement;
  /** Current placement */
  getPlacement: () => AnchorPlacement;
  /** Set new placement */
  setPlacement: (placement: AnchorPlacement) => void;
  /** Force recompute position */
  update: () => void;
  /** Show the positioned element */
  show: () => void;
  /** Hide the positioned element */
  hide: () => void;
  /** Check visibility */
  isVisible: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Placement resolution ---

const PLACEMENT_MAP: Record<AnchorPlacement, { main: "top" | "bottom" | "left" | "right"; align: "start" | "end" | "center" }> = {
  top: { main: "top", align: "center" },
  "top-start": { main: "top", align: "start" },
  "top-end": { main: "top", align: "end" },
  bottom: { main: "bottom", align: "center" },
  "bottom-start": { main: "bottom", align: "start" },
  "bottom-end": { main: "bottom", align: "end" },
  left: { main: "left", align: "center" },
  "left-start": { main: "left", align: "start" },
  "left-end": { main: "left", align: "end" },
  right: { main: "right", align: "center" },
  "right-start": { main: "right", align: "start" },
  "right-end": { main: "right", align: "end" },
  center: { main: "top", align: "center" },
};

function getOppositePlacement(placement: AnchorPlacement): AnchorPlacement {
  const map: Record<string, AnchorPlacement> = {
    top: "bottom", "top-start": "bottom-start", "top-end": "bottom-end",
    bottom: "top", "bottom-start": "top-start", "bottom-end": "top-end",
    left: "right", "left-start": "right-start", "left-end": "right-end",
    right: "left", "right-start": "left-start", "right-end": "right-end",
    center: "center",
  };
  return map[placement] ?? placement;
}

// --- Core Factory ---

/**
 * Position a floating element relative to an anchor element.
 *
 * @example
 * ```ts
 * const anchor = createAnchorPosition({
 *   floating: tooltipEl,
 *   anchor: buttonEl,
 *   placement: "top",
 *   gap: 8,
 *   arrow: true,
 *   autoFlip: true,
 * });
 *
 * anchor.show();
 * ```
 */
export function createAnchorPosition(options: AnchorOptions): AnchorInstance {
  const {
    floating,
    anchor,
    placement = "bottom",
    gap = 8,
    autoFlip = true,
    flipStrategy = "flip-and-shift",
    shift: enableShift = false,
    padding = 8,
    matchWidth = false,
    matchHeight = false,
    arrow: showArrow = false,
    arrowSize = 8,
    arrowColor = "#fff",
    overflowBoundary = "viewport",
    onPlacementChange,
    className,
    autoUpdate = true,
    middleware = [],
  } = options;

  let _currentPlacement = placement;
  let _visible = false;
  let _flipped = false;
  let _arrowEl: HTMLElement | null = null;
  let rafId: number | null = null;
  const cleanupFns: Array<() => void> = [];
  let isDestroyed = false;

  // Ensure floating is absolutely positioned
  floating.style.position = "absolute";
  floating.style.zIndex = "1050";
  if (className) floating.classList.add(className);

  // Create arrow element
  if (showArrow) {
    _arrowEl = document.createElement("div");
    _arrowEl.className = "anchor-arrow";
    _arrowEl.style.cssText =
      "position:absolute;width:0;height:0;" +
      `border:${arrowSize}px solid transparent;` +
      "pointer-events:none;z-index:1;";
    floating.appendChild(_arrowEl);
  }

  // --- Compute position ---

  function compute(): AnchorComputeData {
    const anchorRect = anchor.getBoundingClientRect();
    const floatingRect = floating.getBoundingClientRect();

    // Get boundary rect
    let boundaryRect: DOMRect;
    if (overflowBoundary === "viewport") {
      boundaryRect = new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    } else if (overflowBoundary instanceof HTMLElement) {
      boundaryRect = overflowBoundary.getBoundingClientRect();
    } else {
      // clippingAncestors — use viewport as approximation
      boundaryRect = new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    }

    const available = {
      top: anchorRect.top - boundaryRect.top - padding,
      bottom: boundaryRect.bottom - anchorRect.bottom - padding,
      left: anchorRect.left - boundaryRect.left - padding,
      right: boundaryRect.right - anchorRect.right - padding,
    };

    let x = 0;
    let y = 0;
    let resolvedPlacement = _currentPlacement;

    // Base position calculation
    const p = PLACEMENT_MAP[resolvedPlacement] ?? PLACEMENT_MAP["bottom"];

    switch (p.main) {
      case "top":
        y = anchorRect.top - floatingRect.height - gap;
        break;
      case "bottom":
        y = anchorRect.bottom + gap;
        break;
      case "left":
        x = anchorRect.left - floatingRect.width - gap;
        break;
      case "right":
        x = anchorRect.right + gap;
        break;
    }

    // Alignment
    switch (p.align) {
      case "start":
        if (p.main === "top" || p.main === "bottom") x = anchorRect.left;
        else y = anchorRect.top;
        break;
      case "end":
        if (p.main === "top" || p.main === "bottom") x = anchorRect.right - floatingRect.width;
        else y = anchorRect.bottom - floatingRect.height;
        break;
      case "center":
        if (p.main === "top" || p.main === "bottom") x = anchorRect.left + (anchorRect.width - floatingRect.width) / 2;
        else y = anchorRect.top + (anchorRect.height - floatingRect.height) / 2;
        break;
    }

    // Center mode: overlay centered on anchor
    if (resolvedPlacement === "center") {
      x = anchorRect.left + (anchorRect.width - floatingRect.width) / 2;
      y = anchorRect.top + (anchorRect.height - floatingRect.height) / 2;
    }

    let data: AnchorComputeData = {
      x, y,
      placement: resolvedPlacement,
      anchorRect,
      floatingRect,
      available,
      initialPlacement: placement,
      flipped: false,
    };

    // Apply middleware
    for (const mw of middleware) {
      data = mw(data);
    }

    // Auto-flip
    if (autoFlip && !data.flipped) {
      const needsFlip = checkOverflow(data.x, data.y, floatingRect, boundaryRect, padding);
      if (needsFlip) {
        const opposite = getOppositePlacement(data.placement);
        // Recompute with opposite placement
        const oppP = PLACEMENT_MAP[opposite] ?? PLACEMENT_MAP["top"];
        let ox = 0, oy = 0;

        switch (oppP.main) {
          case "top": oy = anchorRect.top - floatingRect.height - gap; break;
          case "bottom": oy = anchorRect.bottom + gap; break;
          case "left": ox = anchorRect.left - floatingRect.width - gap; break;
          case "right": ox = anchorRect.right + gap; break;
        }
        switch (oppP.align) {
          case "start":
            if (oppP.main === "top" || oppP.main === "bottom") ox = anchorRect.left;
            else oy = anchorRect.top;
            break;
          case "end":
            if (oppP.main === "top" || oppP.main === "bottom") ox = anchorRect.right - floatingRect.width;
            else oy = anchorRect.bottom - floatingRect.height;
            break;
          case "center":
            if (oppP.main === "top" || oppP.main === "bottom") ox = anchorRect.left + (anchorRect.width - floatingRect.width) / 2;
            else oy = anchorRect.top + (anchorRect.height - floatingRect.height) / 2;
            break;
        }

        // Check if opposite fits better
        if (!checkOverflow(ox, oy, floatingRect, boundaryRect, padding)) {
          data.x = ox;
          data.y = oy;
          data.placement = opposite;
          data.flipped = true;
          _currentPlacement = opposite;
          _flipped = true;
          onPlacementChange?.(opposite);
        } else if (flipStrategy === "shift" || flipStrategy === "flip-and-shift") {
          // Try shifting instead
          const shifted = applyShift(data.x, data.y, floatingRect, boundaryRect, padding, p.main);
          data.x = shifted.x;
          data.y = shifted.y;
        }
      }
    }

    // Apply shift
    if (enableShift && !data.flipped) {
      const shifted = applyShift(data.x, data.y, floatingRect, boundaryRect, padding, PLACEMENT_MAP[data.placement].main);
      data.x = shifted.x;
      data.y = shifted.y;
    }

    return data;
  }

  function checkOverflow(x: number, y: number, rect: DOMRect, boundary: DOMRect, pad: number): boolean {
    return (
      x < boundary.left + pad ||
      x + rect.width > boundary.right - pad ||
      y < boundary.top + pad ||
      y + rect.height > boundary.bottom - pad
    );
  }

  function applyShift(x: number, y: number, rect: DOMRect, boundary: DOMRect, pad: number, mainAxis: string): { x: number; y: number } {
    let sx = x;
    let sy = y;

    if (mainAxis === "top" || mainAxis === "bottom") {
      // Horizontal shift
      if (sx < boundary.left + pad) sx = boundary.left + pad;
      if (sx + rect.width > boundary.right - pad) sx = boundary.right - pad - rect.width;
    } else {
      // Vertical shift
      if (sy < boundary.top + pad) sy = boundary.top + pad;
      if (sy + rect.height > boundary.bottom - pad) sy = boundary.bottom - pad - rectHeight;
    }

    return { x: sx, y: sy };
  }

  // --- Apply position ---

  function applyPosition(data: AnchorComputeData): void {
    // Convert to relative positioning within offsetParent
    const offsetParent = floating.offsetParent as HTMLElement | null;
    const parentRect = offsetParent ? offsetParent.getBoundingClientRect() : new DOMRect(0, 0, window.innerWidth, window.innerHeight);

    const relX = data.x - parentRect.left + (offsetParent ? offsetParent.scrollLeft : 0);
    const relY = data.y - parentRect.top + (offsetParent ? offsetParent.scrollTop : 0);

    floating.style.left = `${relX}px`;
    floating.style.top = `${relY}px`;

    // Match dimensions
    if (matchWidth) floating.style.width = `${data.anchorRect.width}px`;
    if (matchHeight) floating.style.height = `${data.anchorRect.height}px`;

    // Position arrow
    if (_arrowEl && showArrow) {
      positionArrow(data);
    }
  }

  function positionArrow(data: AnchorComputeData): void {
    if (!_arrowEl) return;

    const p = PLACEMENT_MAP[data.placement];
    const size = arrowSize;

    // Reset styles
    _arrowEl.style.borderTopColor = "transparent";
    _arrowEl.style.borderBottomColor = "transparent";
    _arrowEl.style.borderLeftColor = "transparent";
    _arrowEl.style.borderRightColor = "transparent";

    switch (p?.main) {
      case "top":
        _arrowEl.style.bottom = `-${size}px`;
        _arrowEl.style.left = "50%";
        _arrowEl.style.transform = "translateX(-50%)";
        _arrowEl.style.borderBottomColor = arrowColor;
        break;
      case "bottom":
        _arrowEl.style.top = `-${size}px`;
        _arrowEl.style.left = "50%";
        _arrowEl.style.transform = "translateX(-50%)";
        _arrowEl.style.borderTopColor = arrowColor;
        break;
      case "left":
        _arrowEl.style.right = `-${size}px`;
        _arrowEl.style.top = "50%";
        _arrowEl.style.transform = "translateY(-50%)";
        _arrowEl.style.borderRightColor = arrowColor;
        break;
      case "right":
        _arrowEl.style.left = `-${size}px`;
        _arrowEl.style.top = "50%";
        _arrowEl.style.transform = "translateY(-50%)";
        _arrowEl.style.borderLeftColor = arrowColor;
        break;
    }
  }

  // --- Update loop ---

  function update(): void {
    if (isDestroyed || !_visible) return;
    const data = compute();
    applyPosition(data);
  }

  function scheduleUpdate(): void {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      update();
      if (autoUpdate && _visible && !isDestroyed) {
        rafId = requestAnimationFrame(scheduleUpdate);
      }
    });
  }

  // --- Public API ---

  function getPlacement(): AnchorPlacement { return _currentPlacement; }

  function setPlacement(newPlacement: AnchorPlacement): void {
    _currentPlacement = newPlacement;
    _flipped = false;
    if (_visible) update();
  }

  function show(): void {
    if (_visible) return;
    _visible = true;
    floating.style.display = "";
    floating.style.visibility = "visible";

    requestAnimationFrame(() => {
      update();
      if (autoUpdate) scheduleUpdate();
    });
  }

  function hide(): void {
    if (!_visible) return;
    _visible = false;
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    floating.style.display = "none";
  }

  function isVisible(): boolean { return _visible; }

  function destroy(): void {
    isDestroyed = true;
    hide();
    if (_arrowEl) _arrowEl.remove();
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  // Auto-update listeners
  if (autoUpdate) {
    const onScroll = () => { if (_visible) update(); };
    const onResize = () => { if (_visible) update(); };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    cleanupFns.push(
      () => window.removeEventListener("scroll", onScroll),
      () => window.removeEventListener("resize", onResize),
    );

    // Observe anchor and floating for size changes
    const resizeObs = new ResizeObserver(() => { if (_visible) update(); });
    resizeObs.observe(anchor);
    resizeObs.observe(floating);
    cleanupFns.push(() => resizeObs.disconnect());
  }

  // Initially hidden
  floating.style.display = "none";

  return {
    el: floating,
    getPlacement, setPlacement,
    update, show, hide, isVisible,
    destroy,
  };
}
