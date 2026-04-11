/**
 * Touch Utilities: Touch event helpers, gesture prevention, touch target detection,
 * multi-touch management, tap/click abstraction, and touch device capability queries.
 */

// --- Types ---

export interface TouchPoint {
  identifier: number;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  radiusX: number;
  radiusY: number;
  force: number;
  rotationAngle: number;
}

export interface TouchConfig {
  /** Target element */
  target: HTMLElement;
  /** Prevent default browser handling (scrolling, zooming)? Default true for touch */
  preventDefault?: boolean;
  /** Prevent passive listener warning? Default true (uses { passive: false }) */
  nonPassive?: boolean;
  /** Minimum distance (px) to distinguish tap from scroll. Default 10 */
  tapThreshold?: number;
  /** Maximum time (ms) for a tap. Default 300 */
  tapMaxDuration?: number;
  /** Maximum movement during tap to still count as tap. Default 20 */
  tapMoveTolerance?: number;
  /** Double-tap delay in ms. Default 300 */
  doubleTapDelay?: number;
  /** Long press duration in ms. Default 500 */
  longPressDelay?: number;
}

export type TouchHandler = (
  touches: TouchPoint[],
  event: TouchEvent,
) => void;

// --- Device Detection ---

/** Check if the device supports touch input */
export function isTouchDevice(): boolean {
  return "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as unknown as { msMaxTouchPoints?: number }).msMaxTouchPoints > 0;
}

/** Get max simultaneous touch points supported */
export function getMaxTouchPoints(): number {
  return navigator.maxTouchPoints ?? 0;
}

/** Check if device supports force/pressure (3D Touch / Apple Force Touch) */
export function hasForceTouch(): boolean {
  return typeof window !== "undefined" &&
    "ontouchstart" in window &&
    // Check if Touch constructor exists with force property
    typeof Touch !== "undefined" &&
    "force" in Touch.prototype;
}

/** Check if device supports touch rotation angle (e.g., stylus pens on some devices) */
export function hasRotationTouch(): boolean {
  return typeof window !== "undefined" &&
    "ontouchstart" in window &&
    typeof Touch !== "undefined" &&
    "rotationAngle" in Touch.prototype;
}

// ---

/** Get the number of active touch points on an element's current touch event */
export function getTouchCount(event: TouchEvent): number {
  return event.touches.length;
}

/** Extract normalized touch points from a TouchEvent */
export function extractTouches(event: TouchEvent, target?: HTMLElement): TouchPoint[] {
  const el = target ?? document.documentElement;
  const rect = el.getBoundingClientRect();

  return Array.from(event.touches).map((t) => ({
    identifier: t.identifier,
    clientX: t.clientX,
    clientY: t.clientY,
    pageX: t.clientX + window.scrollX,
    pageY: t.clientY + window.scrollY,
    radiusX: t.radiusX ?? 0,
    radiusY: t.radiusY ?? 0,
    force: t.force ?? 0.5,
    rotationAngle: t.rotationAngle ?? 0,
  }));
}

/** Extract changed touches (for touchend/touchcancel) */
export function extractChangedTouches(event: TouchEvent, target?: HTMLElement): TouchPoint[] {
  const el = target ?? document.documentElement;
  const rect = el.getBoundingClientRect();

  return Array.from(event.changedTouches).map((t) => ({
    identifier: t.identifier,
    clientX: t.clientX,
    clientY: t.clientY,
    pageX: t.clientX + window.scrollX,
    pageY: t.clientY + window.scrollY,
    radiusX: t.radiusX ?? 0,
    radiusY: t.radiusY ?? 0,
    force: t.force ?? 0.5,
    rotationAngle: t.rotationAngle ?? 0,
  }));
}

// --- Unified Touch Listener ---

/**
 * Create a unified touch listener with tap, long press, and move support.
 *
 * @example
 * ```ts
 * createTouchListener(element, {
 *   onTouchStart: (touches) => console.log("start", touches.length),
 *   onTouchMove: (touches) => console.log("move", touches[0]?.clientX),
 *   onTap: (touch) => console.log("tap!"),
 *   onLongPress: (touch) => console.log("long press!"),
 * });
 * ```
 */
export function createTouchListener(
  config: TouchConfig & {
    onTouchStart?: TouchHandler;
    onTouchMove?: TouchHandler;
    onTouchEnd?: TouchHandler;
    onCancel?: TouchHandler;
    onTap?: (point: TouchPoint) => void;
    onDoubleTap?: (point: TouchPoint) => void;
    onLongPress?: (point: TouchPoint) => void;
  },
): () => void {
  const {
    target,
    preventDefault = true,
    tapThreshold = 10,
    tapMaxDuration = 300,
    tapMoveTolerance = 20,
    doubleTapDelay = 300,
    longPressDelay = 500,
    ...rest
  } = config;

  let startPoint: TouchPoint | null = null;
  let startTime = 0;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let lastTapTime = 0;
  let lastTapPoint: TouchPoint | null = null;

  function cancelLongPress(): void {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }

  function resetTapState(): void {
    startPoint = null;
    startTime = 0;
    lastTapTime = 0;
    lastTapPoint = null;
  }

  const onStart = (e: TouchEvent) => {
    if (preventDefault && e.cancelable) e.preventDefault();

    const touches = extractTouches(e, target);
    rest.onTouchStart?.(touches, e);

    if (touches.length === 1) {
      startPoint = touches[0];
      startTime = Date.now();
      longPressTimer = setTimeout(() => {
        rest.onLongPress?.(startPoint!);
        longPressTimer = null;
      }, longPressDelay);
    } else {
      cancelLongPress();
      resetTapState();
    }
  };

  const onMove = (e: TouchEvent) => {
    if (preventDefault && e.cancelable) e.preventDefault();
    const touches = extractTouches(e, target);
    rest.onTouchMove?.(touches, e);

    // Cancel long press if moved too far
    if (startPoint && touches.length === 1) {
      const dx = touches[0].clientX - startPoint.clientX;
      const dy = touches[0].clientY - startPoint.clientY;
      if (Math.sqrt(dx * dx + dy * dy) > tapMoveTolerance) {
        cancelLongPress();
        resetTapState();
      }
    }
  };

  const onEnd = (e: TouchEvent) => {
    if (preventDefault && e.cancelable) e.preventDefault();
    cancelLongPress();

    const changed = extractChangedTouches(e, target);
    rest.onTouchEnd?.(changed, e);

    // Detect tap
    if (startPoint && changed.length >= 1) {
      const end = changed[0];
      const dx = end.clientX - startPoint!.clientX;
      const dy = end.clientY - startPoint!.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const duration = Date.now() - startTime;

      if (dist <= tapThreshold && duration <= tapMaxDuration) {
        const now = Date.now();

        // Double tap detection
        if (
          lastTapPoint &&
          now - lastTapTime < doubleTapDelay &&
          Math.abs(end.clientX - lastTapPoint.clientX) < tapThreshold &&
          Math.abs(end.clientY - lastTapPoint.clientY) < tapThreshold
        ) {
          rest.onDoubleTap?.(end);
        } else {
          rest.onTap?.(end);
        }

        lastTapTime = now;
        lastTapPoint = end;
      }

      resetTapState();
    }

    rest.onCancel?.(extractTouches(e), e);
  };

  const opts = preventDefault ? { passive: false } : {};
  target.addEventListener("touchstart", onStart, opts);
  target.addEventListener("touchmove", onMove, opts);
  target.addEventListener("touchend", onEnd, opts);
  target.addEventListener("touchcancel", onEnd, opts);

  return () => {
    clearTimeout(longPressTimer);
    target.removeEventListener("touchstart", onStart);
    target.removeEventListener("touchmove", onMove);
    target.removeEventListener("touchend", onEnd);
    target.removeEventListener("touchcancel", onEnd);
  };
}

// --- Gesture Prevention ---

/**
 * Prevent pinch-to-zoom on an element (common for canvas apps and maps).
 * Returns cleanup function.
 */
export function disablePinchZoom(element: HTMLElement): () => {
  element.addEventListener(
    "touchstart",
    (e) => { if (e.touches.length > 1) e.preventDefault(); },
    { passive: false },
  );

  // Also prevent the gesture via CSS where possible
  element.style.touchAction = "none";

  return () => {
    element.removeEventListener("touchstart", arguments as unknown as EventListener);
    element.style.touchAction = "";
  };
};

/**
 * Prevent context menu (right-click / long press) on mobile.
 * Useful for custom context menus or games.
 */
export function preventContextMenu(element: HTMLElement): () => {
  handler = (e: Event) => e.preventDefault();
  element.addEventListener("contextmenu", handler);
  element.addEventListener("touchstart", (e: Event) => {
    if ((e as TouchEvent).touches.length === 2) e.preventDefault();
  }, { passive: false });

  let handler: EventListener;
  return () => {
    element.removeEventListener("contextmenu", handler);
    element.removeEventListener("touchstart", arguments.callee as unknown as EventListener);
  };
};

// ---

/** Get the centroid (average position) of multiple touch points */
export function getTouchCentroid(touches: TouchPoint[]): { x: number; y: number } | null {
  if (touches.length === 0) return null;
  let sumX = 0, sumY = 0;
  for (const t of touches) {
    sumX += t.clientX;
    sumY += t.clientY;
  }
  return { x: sumX / touches.length, y: sumY / touches.length };
}

/** Calculate distance between two touch points */
export function touchDistance(a: TouchPoint, b: TouchPoint): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Calculate initial distance between two touches (for pinch detection) */
export function initialTouchDistance(touches: TouchPoint[]): number {
  if (touches.length < 2) return 0;
  return touchDistance(touches[0], touches[1]);
}

/** Calculate current distance between two touches (for pinch scale) */
export function currentTouchDistance(touches: TouchPoint[]): number {
  if (touches.length < 2) return 0;
  return touchDistance(touches[0], touches[1]);
}

/** Calculate pinch scale factor from initial and current distances */
export function getPinchScale(initial: number, current: number): number {
  if (initial === 0) return 1;
  return current / initial;
}
