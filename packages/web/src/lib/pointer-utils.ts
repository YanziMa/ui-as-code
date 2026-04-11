/**
 * Pointer Utilities: Unified pointer event abstraction, pointer capture API,
 * coordinate transformations (client/local/page/viewport), multi-pointer management,
 * pressure and tilt data helpers, and device capability detection.
 */

// --- Types ---

export interface PointerState {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  viewportX: number;
  viewportY: number;
  elementX: number;
  elementY: number;
  pressure: number;
  pointerType: "mouse" | "touch" | "pen";
  button: number;
  buttons: number;
  tiltX: number;
  tiltY: number;
  twist: number;
  width: number;
  height: number;
  timestamp: number;
}

export interface PointerConfig {
  /** Target element */
  target: HTMLElement;
  /** Prevent default on down? Default false */
  preventDefault?: boolean;
  /** Stop propagation? Default false */
  stopPropagation?: boolean;
  /** Throttle move events (ms). Default 0 */
  throttleMs?: number;
  /** Capture pointer on down? Default true */
  capture?: boolean;
}

export type PointerHandler = (state: PointerState, event: Event) => void;

// --- Device Detection ---

/** Check if Pointer Events API is available */
export function hasPointerEvents(): boolean {
  return typeof window.PointerEvent !== "undefined";
}

/** Check if touch is available */
export function hasTouch(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

/** Check if pen/stylus input is supported */
export function hasPenSupport(): boolean {
  return typeof window !== "undefined" &&
    (window as unknown as { onpointerdown?: EventListener }).onpointerdown !== undefined &&
    matchMedia("(pointer: fine)").matches;
}

/** Get the primary input mechanism */
export function getPrimaryInput(): "mouse" | "touch" | "pen" | "keyboard" {
  if (typeof window === "undefined") return "keyboard";
  if (matchMedia("(pointer: coarse)").matches) return "touch";
  if (hasPenSupport()) return "pen";
  return "mouse";
}

/** Check if device likely has a mouse */
export function hasMouse(): boolean {
  return typeof window !== "undefined" && matchMedia("(hover: hover)").matches;
}

// --- Coordinate Transforms ---

/** Convert client coordinates to page coordinates (includes scroll offset) */
export function clientToPage(clientX: number, clientY: number): { x: number; y: number } {
  return {
    x: clientX + window.scrollX,
    y: clientY + window.scrollY,
  };
}

/** Convert page coordinates to client coordinates */
export function pageToClient(pageX: number, pageY: number): { x: number; y: number } {
  return {
    x: pageX - window.scrollX,
    y: pageY - window.scrollY,
  };
}

/** Convert client coordinates relative to an element's bounding rect */
export function clientToLocal(
  clientX: number,
  clientY: number,
  element: HTMLElement,
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: clientX - rect.left - element.clientLeft,
    y: clientY - rect.top - element.clientTop,
  };
}

/** Convert local coordinates back to client */
export function localToClient(
  localX: number,
  localY: number,
  element: HTMLElement,
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: localX + rect.left + element.clientLeft,
    y: localY + rect.top + element.clientTop,
  };
}

/** Transform coordinates between two elements' local spaces */
export function transformBetween(
  localX: number,
  localY: number,
  fromEl: HTMLElement,
  toEl: HTMLElement,
): { x: number; y: number } {
  const client = localToClient(localX, localY, fromEl);
  return clientToLocal(client.x, client.y, toEl);
}

/** Get current scroll position */
export function getScrollOffset(): { x: number; y: number } {
  return { x: window.scrollX, y: window.scrollY };
}

// --- Pointer State Extraction ---

/** Extract unified state from a PointerEvent */
export function extractPointerState(event: PointerEvent, target?: HTMLElement): PointerState {
  const el = target ?? (event.target as HTMLElement);
  const rect = el?.getBoundingClientRect();

  const page = clientToPage(event.clientX, event.clientY);
  const local = rect
    ? { x: event.clientX - rect.left, y: event.clientY - rect.top }
    : { x: event.offsetX, y: event.offsetY };

  return {
    x: event.clientX,
    y: event.clientY,
    clientX: event.clientX,
    clientY: event.clientY,
    pageX: page.x,
    pageY: page.y,
    viewportX: event.clientX,
    viewportY: event.clientY,
    elementX: local.x,
    elementY: local.y,
    pressure: event.pressure,
    pointerType: event.pointerType as PointerState["pointerType"],
    button: event.button,
    buttons: event.buttons,
    tiltX: event.tiltX,
    tiltY: event.tiltY,
    twist: event.twist ?? 0,
    width: event.width ?? 1,
    height: event.height ?? 1,
    timestamp: performance.now(),
  };
}

/** Extract state from MouseEvent (fallback for non-pointer devices) */
export function extractMouseState(event: MouseEvent, target?: HTMLElement): PointerState {
  const el = target ?? (event.target as HTMLElement);
  const rect = el?.getBoundingClientRect();

  const page = clientToPage(event.clientX, event.clientY);
  const local = rect
    ? { x: event.clientX - rect.left, y: event.clientY - rect.top }
    : { x: event.offsetX, y: event.offsetY };

  return {
    x: event.clientX,
    y: event.clientY,
    clientX: event.clientX,
    clientY: event.clientY,
    pageX: page.x,
    pageY: page.y,
    viewportX: event.clientX,
    viewportY: event.clientY,
    elementX: local.x,
    elementY: local.y,
    pressure: event.buttons > 0 ? 0.5 : 0,
    pointerType: "mouse",
    button: event.button,
    buttons: event.buttons,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    width: 1,
    height: 1,
    timestamp: performance.now(),
  };
}

/** Extract state from Touch */
export function extractTouchState(touch: Touch, target?: HTMLElement): PointerState {
  const el = target ?? document.documentElement;
  const rect = el.getBoundingClientRect();

  return {
    x: touch.clientX,
    y: touch.clientY,
    clientX: touch.clientX,
    clientY: touch.clientY,
    pageX: touch.clientX + window.scrollX,
    pageY: touch.clientY + window.scrollY,
    viewportX: touch.clientX,
    viewportY: touch.clientY,
    elementX: touch.clientX - rect.left,
    elementY: touch.clientY - rect.top,
    pressure: touch.force,
    pointerType: "touch",
    button: 0,
    buttons: 1,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    width: touch.radiusX * 2,
    height: touch.radiusY * 2,
    timestamp: performance.now(),
  };
}

// --- Unified Pointer Listener ---

/**
 * Create a unified pointer listener that works with Pointer Events API,
 * falling back to Mouse+Touch events on older browsers.
 *
 * @example
 * ```ts
 * const cleanup = createPointerListener(element, {
 *   onDown: (s) => console.log("down at", s.x, s.y),
 *   onMove: (s) => console.log("move to", s.x, s.y),
 *   onUp: (s) => console.log("up"),
 * });
 * ```
 */
export function createPointerListener(
  config: PointerConfig & {
    onDown?: PointerHandler;
    onMove?: PointerHandler;
    onUp?: PointerHandler;
    onCancel?: PointerHandler;
  },
): () => void {
  const { target, preventDefault, stopPropagation, throttleMs, capture } = config;
  let lastMoveTime = 0;

  function dispatch(
    handler: PointerHandler | undefined,
    state: PointerState,
    event: Event,
  ): void {
    if (!handler) return;
    if (preventDefault && (event as Event).cancelable) (event as Event).preventDefault();
    if (stopPropagation) event.stopPropagation();
    handler(state, event);
  }

  // Use native Pointer Events if available
  if (hasPointerEvents()) {
    const onDown = (e: PointerEvent) => {
      if (capture) try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
      dispatch(config.onDown, extractPointerState(e, target), e);
    };

    const onMove = (e: PointerEvent) => {
      if (throttleMs > 0) {
        const now = performance.now();
        if (now - lastMoveTime < throttleMs) return;
        lastMoveTime = now;
      }
      dispatch(config.onMove, extractPointerState(e, target), e);
    };

    const onUp = (e: PointerEvent) => dispatch(config.onUp, extractPointerState(e, target), e);
    const onCancel = (e: PointerEvent) => dispatch(config.onCancel, extractPointerState(e, target), e);

    target.addEventListener("pointerdown", onDown);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onCancel);

    return () => {
      target.removeEventListener("pointerdown", onDown);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onCancel);
    };
  }

  // Fallback: Mouse events
  const onMouseDown = (e: MouseEvent) => dispatch(config.onDown, extractMouseState(e, target), e);
  const onMouseMove = (e: MouseEvent) => {
    if (throttleMs > 0) {
      const now = performance.now();
      if (now - lastMoveTime < throttleMs) return;
      lastMoveTime = now;
    }
    dispatch(config.onMove, extractMouseState(e, target), e);
  };
  const onMouseUp = (e: MouseEvent) => dispatch(config.onUp, extractMouseState(e, target), e);

  target.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);

  return () => {
    target.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };
}

// --- Pointer Capture ---

/** Capture pointer to element so events fire even when pointer leaves bounds */
export function setPointerCapture(element: HTMLElement, pointerId = -1): boolean {
  if (typeof element.setPointerCapture !== "function") return false;
  try { element.setPointerCapture(pointerId); return true; }
  catch { return false; }
}

/** Release pointer capture */
export function releasePointerCapture(element: HTMLElement, pointerId = -1): boolean {
  if (typeof element.releasePointerCapture !== "function") return false;
  try { element.releasePointerCapture(pointerId); return true; }
  catch { return false; }
}

// --- Pointer Lock ---

/** Request pointer lock (raw movement deltas, useful for games/3D) */
export async function requestPointerLock(element?: HTMLElement): Promise<boolean> {
  const el = element ?? document.body;
  try {
    await el.requestPointerLock();
    return true;
  } catch { return false; }
}

/** Exit pointer lock */
export function exitPointerLock(): void {
  document.exitPointerLock?.();
}

export function isPointerLocked(): boolean {
  return !!document.pointerLockElement;
}

/** Get accumulated movement delta since last poll (requires pointer lock) */
export function getMovementDelta(): { dx: number; dy: number } | null {
  if (!document.pointerLockElement) return null;
  return {
    dx: (document as unknown as { movementX?: number }).movementX ?? 0,
    dy: (document as unknown as { movementY?: number }).movementY ?? 0,
  };
}

// --- Pressure Helpers ---

/** Normalize pressure value (handles mouse always returning 0.5) */
export function normalizePressure(pressure: number, type: "mouse" | "touch" | "pen" = "mouse"): number {
  if (type === "mouse") return pressure > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, pressure));
}

/** Classify pressure into low/medium/high categories */
export function classifyPressure(pressure: number): "low" | "medium" | "high" {
  if (pressure < 0.33) return "low";
  if (pressure < 0.67) return "medium";
  return "high";
}
