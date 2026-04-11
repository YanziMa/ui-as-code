/**
 * Pointer Utilities: Unified pointer event abstraction (mouse/touch/pen),
 * pointer capture, pressure/tilt/twist support, multi-pointer tracking,
 * coordinate transformation, and pointer type detection.
 */

// --- Types ---

export interface PointerData {
  /** Unique pointer ID */
  pointerId: number;
  /** Pointer type: mouse, touch, pen */
  pointerType: "mouse" | "touch" | "pen";
  /** Current position relative to viewport */
  x: number;
  y: number;
  /** Position relative to target element */
  localX: number;
  localY: number;
  /** Pressure (0-1). Mouse: 0.5 when pressed. */
  pressure: number;
  /** Tilt of pen in degrees (0-90) */
  tiltX: number;
  tiltY: number;
  /** Rotation of pen in degrees (0-359) */
  twist: number;
  /** Width of contact area */
  width: number;
  /** Height of contact area */
  height: number;
  /** Current button state (0=none, 1=primary, etc.) */
  button: number;
  /** Buttons bitmask */
  buttons: number;
  /** Modifier keys state */
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  /** Timestamp */
  timestamp: number;
}

export interface PointerEventInfo {
  type: "down" | "move" | "up" | "cancel" | "over" | "out" | "enter" | "leave";
  data: PointerData;
  originalEvent: globalThis.PointerEvent;
}

export interface PointerTrackerConfig {
  /** Prevent default on pointer events. Default false */
  preventDefault?: boolean;
  /** Convert touch events to pointer events for older browsers. Default true */
  polyfillTouch?: boolean;
  /** Only track pointers within this element's bounds? */
  constrainToElement?: boolean;
  /** Throttle move events (ms). Default 0 (no throttle) */
  throttleMs?: number;
  /** Debounce end events to avoid jitter. Default 0 */
  debounceEndMs?: number;
}

export interface PointerRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data?: unknown;
}

// --- Pointer Data Extraction ---

/** Extract normalized pointer data from a PointerEvent */
export function extractPointerData(event: globalThis.PointerEvent, target?: HTMLElement): PointerData {
  const el = target ?? (event.target as HTMLElement);
  const rect = el?.getBoundingClientRect();

  return {
    pointerId: event.pointerId,
    pointerType: event.pointerType as "mouse" | "touch" | "pen",
    x: event.clientX,
    y: event.clientY,
    localX: rect ? event.clientX - rect.left : event.offsetX,
    localY: rect ? event.clientY - rect.top : event.offsetY,
    pressure: event.pressure,
    tiltX: event.tiltX,
    tiltY: event.tiltY,
    twist: event.twist ?? 0,
    width: event.width,
    height: event.height,
    button: event.button,
    buttons: event.buttons,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    timestamp: Date.now(),
  };
}

/** Extract pointer data from a MouseEvent (fallback) */
export function extractMouseData(event: MouseEvent, target?: HTMLElement): PointerData {
  const el = target ?? (event.target as HTMLElement);
  const rect = el?.getBoundingClientRect();

  return {
    pointerId: 1,
    pointerType: "mouse",
    x: event.clientX,
    y: event.clientY,
    localX: rect ? event.clientX - rect.left : event.offsetX,
    localY: rect ? event.clientY - rect.top : event.offsetY,
    pressure: event.buttons > 0 ? 0.5 : 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    width: 1,
    height: 1,
    button: event.button,
    buttons: event.buttons,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    timestamp: Date.now(),
  };
}

/** Extract pointer data from a Touch (fallback) */
export function extractTouchData(touch: Touch, target?: HTMLElement): PointerData {
  const el = target ?? document.documentElement;
  const rect = el.getBoundingClientRect();

  return {
    pointerId: touch.identifier,
    pointerType: "touch",
    x: touch.clientX,
    y: touch.clientY,
    localX: touch.clientX - rect.left,
    localY: touch.clientY - rect.top,
    pressure: touch.force,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    width: touch.radiusX * 2,
    height: touch.radiusY * 2,
    button: 0,
    buttons: 1,
    altKey: false,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    timestamp: Date.now(),
  };
}

// --- Pointer Type Detection ---

/** Check if the device supports pointer events natively */
export function isPointerEventsSupported(): boolean {
  return typeof window.PointerEvent !== "undefined";
}

/** Check if the device supports touch input */
export function isTouchDevice(): boolean {
  return (
    typeof window !== "undefined" &&
    ("ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as unknown as { msMaxTouchPoints?: number }).msMaxTouchPoints > 0)
  );
}

/** Check if the device likely has a precision pointer (pen/mouse vs finger only) */
export function isPrecisionInput(): boolean {
  return (
    typeof window !== "undefined" &&
    navigator.maxTouchPoints === 0 &&
    matchMedia("(pointer: fine)").matches
  );
}

/** Get the primary input mechanism type */
export function getPrimaryInputType(): "mouse" | "touch" | "pen" | "unknown" {
  if (typeof window === "undefined") return "unknown";

  // Check CSS media query first (most reliable)
  if (matchMedia("(pointer: fine)").matches) return "mouse";
  if (matchMedia("(pointer: coarse)").matches) return "touch";
  if (matchMedia("(any-pointer: fine)").matches) return "mouse";

  return "unknown";
}

// --- Pointer Tracker ---

/**
 * PointerTracker - tracks all active pointers on an element.
 * Provides unified callbacks for down/move/up/cancel with throttling support.
 *
 * @example
 * ```ts
 * const tracker = new PointerTracker(element, {
 *   onPointerDown: (data) => console.log("Down", data.pointerId),
 *   onPointerMove: (data) => console.log("Move", data.x, data.y),
 *   onPointerUp: (data) => console.log("Up", data.pointerId),
 * });
 * ```
 */
export class PointerTracker {
  private element: HTMLElement;
  private config: Required<PointerTrackerConfig>;
  private activePointers = new Map<number, PointerData>();
  private cleanupFns: Array<() => void> = [];
  private lastMoveTime = 0;
  private pendingUpTimer: ReturnType<typeof setTimeout> | null = null;

  // Callbacks
  onPointerDown?: (info: PointerEventInfo) => void;
  onPointerMove?: (info: PointerEventInfo) => void;
  onPointerUp?: (info: PointerEventInfo) => void;
  onPointerCancel?: (info: PointerEventInfo) => void;

  constructor(
    element: HTMLElement,
    handlers: Partial<{
      onPointerDown: (info: PointerEventInfo) => void;
      onPointerMove: (info: PointerEventInfo) => void;
      onPointerUp: (info: PointerEventInfo) => void;
      onPointerCancel: (info: PointerEventInfo) => void;
    }>,
    config: PointerTrackerConfig = {},
  ) {
    this.element = element;
    this.config = {
      preventDefault: config.preventDefault ?? false,
      polyfillTouch: config.polyfillTouch !== false,
      constrainToElement: config.constrainToElement ?? false,
      throttleMs: config.throttleMs ?? 0,
      debounceEndMs: config.debounceEndMs ?? 0,
    };

    Object.assign(this, handlers);
    this._bindEvents();
  }

  /** Get currently active pointer data by ID */
  getPointer(id: number): PointerData | undefined {
    return this.activePointers.get(id);
  }

  /** Get all active pointers */
  getActivePointers(): PointerData[] {
    return Array.from(this.activePointers.values());
  }

  /** Get count of active pointers */
  getActiveCount(): number {
    return this.activePointers.size;
  }

  /** Check if a specific pointer is active */
  isActive(pointerId: number): boolean {
    return this.activePointers.has(pointerId);
  }

  /** Get the centroid (average position) of all active pointers */
  getCentroid(): { x: number; y: number } | null {
    const pointers = this.getActivePointers();
    if (pointers.length === 0) return null;

    let sumX = 0, sumY = 0;
    for (const p of pointers) {
      sumX += p.localX;
      sumY += p.localY;
    }
    return { x: sumX / pointers.length, y: sumY / pointers.length };
  }

  /** Destroy and remove listeners */
  destroy(): void {
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
    this.activePointers.clear();
    if (this.pendingUpTimer) clearTimeout(this.pendingUpTimer);
  }

  // --- Private ---

  private _bindEvents(): void {
    const el = this.element;

    if (isPointerEventsSupported()) {
      // Native pointer events
      const onDown = (e: globalThis.PointerEvent) => this._handleEvent(e, "down");
      const onMove = (e: globalThis.PointerEvent) => this._handleEvent(e, "move");
      const onUp = (e: globalThis.PointerEvent) => this._handleEvent(e, "up");
      const onCancel = (e: globalThis.PointerEvent) => this._handleEvent(e, "cancel");

      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onCancel);

      // Also listen on window for move/up to track outside element
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);

      this.cleanupFns.push(
        () => el.removeEventListener("pointerdown", onDown),
        () => el.removeEventListener("pointermove", onMove),
        () => el.removeEventListener("pointerup", onUp),
        () => el.removeEventListener("pointercancel", onCancel),
        () => window.removeEventListener("pointermove", onMove),
        () => window.removeEventListener("pointerup", onUp),
      );
    } else if (this.config.polyfillTouch) {
      // Fallback: mouse + touch events
      const onMouseDown = (e: MouseEvent) => {
        const data = extractMouseData(e, el);
        this.activePointers.set(data.pointerId, data);
        this.onPointerDown?.({ type: "down", data, originalEvent: e as unknown as globalThis.PointerEvent });
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!this.isActive(1)) return;
        const data = extractMouseData(e, el);
        this.activePointers.set(data.pointerId, data);
        this._throttledMove({ type: "move", data, originalEvent: e as unknown as globalThis.PointerEvent });
      };

      const onMouseUp = (e: MouseEvent) => {
        if (!this.isActive(1)) return;
        const data = extractMouseData(e, el);
        this._debouncedUp({ type: "up", data, originalEvent: e as unknown as globalThis.PointerEvent });
        this.activePointers.delete(data.pointerId);
      };

      el.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);

      // Touch fallback
      const onTouchStart = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i]!;
          const data = extractTouchData(t, el);
          this.activePointers.set(data.pointerId, data);
          this.onPointerDown?.({ type: "down", data, originalEvent: e as unknown as globalThis.PointerEvent });
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i]!;
          const data = extractTouchData(t, el);
          if (this.isActive(data.pointerId)) {
            this.activePointers.set(data.pointerId, data);
            this._throttledMove({ type: "move", data, originalEvent: e as unknown as globalThis.PointerEvent });
          }
        }
      };

      const onTouchEnd = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i]!;
          const data = extractTouchData(t, el);
          if (this.isActive(data.pointerId)) {
            this._debouncedUp({ type: "up", data, originalEvent: e as unknown as globalThis.PointerEvent });
            this.activePointers.delete(data.pointerId);
          }
        }
      };

      el.addEventListener("touchstart", onTouchStart, { passive: true });
      el.addEventListener("touchmove", onTouchMove, { passive: true });
      el.addEventListener("touchend", onTouchEnd, { passive: true });

      this.cleanupFns.push(
        () => el.removeEventListener("mousedown", onMouseDown),
        () => window.removeEventListener("mousemove", onMouseMove),
        () => window.removeEventListener("mouseup", onMouseUp),
        () => el.removeEventListener("touchstart", onTouchStart),
        () => el.removeEventListener("touchmove", onTouchMove),
        () => el.removeEventListener("touchend", onTouchEnd),
      );
    }
  }

  private _handleEvent(event: globalThis.PointerEvent, type: PointerEventInfo["type"]): void {
    if (this.config.preventDefault && event.cancelable) event.preventDefault();

    const data = extractPointerData(event, this.element);

    switch (type) {
      case "down":
        this.activePointers.set(data.pointerId, data);
        this.onPointerDown?.({ type, data, originalEvent: event });
        break;

      case "move":
        if (!this.isActive(data.pointerId)) return;
        this.activePointers.set(data.pointerId, data);
        this._throttledMove({ type, data, originalEvent: event });
        break;

      case "up":
      case "cancel":
        if (!this.isActive(data.pointerId)) return;
        this.activePointers.delete(data.pointerId);
        if (type === "cancel") {
          this.onPointerCancel?.({ type, data, originalEvent: event });
        } else {
          this._debouncedUp({ type, data, originalEvent: event });
        }
        break;
    }
  }

  private _throttledMove(info: PointerEventInfo): void {
    if (this.config.throttleMs <= 0) {
      this.onPointerMove?.(info);
      return;
    }

    const now = performance.now();
    if (now - this.lastMoveTime >= this.config.throttleMs) {
      this.lastMoveTime = now;
      this.onPointerMove?.(info);
    }
  }

  private _debouncedUp(info: PointerEventInfo): void {
    if (this.config.debounceEndMs <= 0) {
      this.onPointerUp?.(info);
      return;
    }

    if (this.pendingUpTimer) clearTimeout(this.pendingUpTimer);
    this.pendingUpTimer = setTimeout(() => {
      this.pendingUpTimer = null;
      this.onPointerUp?.(info);
    }, this.config.debounceEndMs);
  }
}

// --- Pointer Capture ---

/** Capture pointer to an element (follows pointer outside bounds) */
export function capturePointer(
  element: HTMLElement,
  pointerId?: number,
): boolean {
  try {
    if (typeof element.setPointerCapture === "function") {
      element.setPointerCapture(pointerId ?? -1);
      return true;
    }
  } catch {
    // Pointer not in active capture list or already captured
  }
  return false;
}

/** Release pointer capture */
export function releasePointerCapture(
  element: HTMLElement,
  pointerId?: number,
): boolean {
  try {
    if (typeof element.releasePointerCapture === "function") {
      element.releasePointerCapture(pointerId ?? -1);
      return true;
    }
  } catch {}
  return false;
}

/** Check if an element has pointer capture */
export function hasPointerCapture(element: HTMLElement, pointerId?: number): boolean {
  return typeof element.hasPointerCapture === "function" &&
    element.hasPointerCapture(pointerId ?? -1);
}

// --- Coordinate Transforms ---

/** Transform client coordinates to element-local coordinates */
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

/** Transform element-local coordinates to client coordinates */
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

/** Transform coordinates between two elements */
export function transformCoordinates(
  x: number,
  y: number,
  fromElement: HTMLElement,
  toElement: HTMLElement,
): { x: number; y: number } {
  const client = localToClient(x, y, fromElement);
  return clientToLocal(client.x, client.y, toElement);
}

/** Get the page scroll offset */
export function getPageScrollOffset(): { x: number; y: number } {
  return {
    x: window.pageXOffset || document.documentElement.scrollLeft || 0,
    y: window.pageYOffset || document.documentElement.scrollTop || 0,
  };
}

/** Convert page coordinates to viewport coordinates */
export function pageToViewport(pageX: number, pageY: number): { x: number; y: number } {
  const scroll = getPageScrollOffset();
  return { x: pageX - scroll.x, y: pageY - scroll.y };
}

/** Convert viewport coordinates to page coordinates */
export function viewportToPage(viewportX: number, viewportY: number): { x: number; y: number } {
  const scroll = getPageScrollOffset();
  return { x: viewportX + scroll.x, y: viewportY + scroll.y };
}

// --- Region Hit Testing ---

/** Create a pointer region for hit testing */
export function createPointerRegion(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  data?: unknown,
): PointerRegion {
  return { id, x, y, width, height, data };
}

/** Test which region(s) a point falls within */
export function hitTestRegions(
  x: number,
  y: number,
  regions: readonly PointerRegion[],
): PointerRegion[] {
  return regions.filter((r) =>
    x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height,
  );
}

/** Find the topmost (last matching) region at a point */
export function hitTestTopmost(
  x: number,
  y: number,
  regions: readonly PointerRegion[],
): PointerRegion | undefined {
  const hits = hitTestRegions(x, y, regions);
  return hits[hits.length - 1];
}

// --- Cursor Utilities ---

/** Set cursor style on an element */
export function setCursor(element: HTMLElement, cursor: string): void {
  element.style.cursor = cursor;
}

/** Hide the default cursor on an element */
export function hideCursor(element: HTMLElement): () => void {
  element.style.cursor = "none";
  return () => { element.style.cursor = ""; };
}

/** Lock cursor to an element (Pointer Lock API) */
export async function requestPointerLock(
  element: HTMLElement,
): Promise<boolean> {
  try {
    await element.requestPointerLock();
    return true;
  } catch {
    return false;
  }
}

/** Exit pointer lock */
export function exitPointerLock(): void {
  if (document.exitPointerLock) {
    document.exitPointerLock();
  }
}

/** Check if pointer lock is active */
export function isPointerLocked(): boolean {
  return !!document.pointerLockElement;
}

/** Get pointer lock movement deltas since last poll */
export function getPointerLockMovement(): { dx: number; dy: number; dz: number } | null {
  if (!document.pointerLockElement) return null;
  return {
    dx: (document as unknown as { movementX?: number }).movementX ?? 0,
    dy: (document as unknown as { movementY?: number }).movementY ?? 0,
    dz: 0,
  };
}
