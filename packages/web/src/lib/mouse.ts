/**
 * Mouse, touch, and pointer event utilities: position tracking,
 * click-outside detection, drag handling, long press, scroll direction,
 * and pointer capture management.
 */

// --- Types ---

export interface Point {
  x: number;
  y: number;
}

export interface MousePosition {
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  screenX: number;
  screenY: number;
  movementX: number;
  movementY: number;
  target: EventTarget | null;
  timestamp: number;
}

export interface ClickOutsideOptions {
  /** Element(s) to watch */
  element: HTMLElement | HTMLElement[];
  /** Callback when clicking outside */
  handler: () => void;
  /** Also trigger on Escape key? */
  escapeKey?: boolean;
  /** Ignore clicks on these elements/selector(s) */
  ignore?: Element | string | (Element | string)[];
  /** Enable/disable */
  enabled?: boolean;
}

export interface DragOptions {
  /** Element to make draggable */
  element: HTMLElement;
  /** Handle element (if different from draggable) */
  handle?: HTMLElement | string;
  /** Axis constraint: "x", "y", or "both" */
  axis?: "x" | "y" | "both";
  /** Constrain within parent? */
  constrainToParent?: boolean;
  /** Custom bounds */
  bounds?: { left?: number; top?: number; right?: number; bottom?: number };
  /** Grid snap size */
  grid?: number;
  /** On drag start */
  onStart?: (position: Point, event: PointerEvent) => void;
  /** On drag move */
  onMove?: (position: Point, delta: Point, event: PointerEvent) => void;
  /** On drag end */
  onEnd?: (position: Point, event: PointerEvent) => void;
  /** Prevent default during drag? */
  preventDefault?: boolean;
  /** Cursor style while dragging */
  cursor?: string;
}

export interface DragInstance {
  /** Current position */
  getPosition: () => Point;
  /** Set position programmatically */
  setPosition: (pos: Point) => void;
  /** Enable/disable dragging */
  setEnabled: (enabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

export interface LongPressOptions {
  /** Target element */
  element: HTMLElement;
  /** Delay before triggering (ms) */
  delay?: number;
  /** Move threshold to cancel (px) */
  threshold?: number;
  /** On long press triggered */
  onPress: (event: PointerEvent) => void;
  /** Prevent context menu? */
  preventContextMenu?: boolean;
}

export interface ScrollDirectionInfo {
  direction: "up" | "down" | "left" | "right" | "none";
  deltaX: number;
  deltaY: number;
  velocityX: number;
  velocityY: number;
  isAtTop: boolean;
  isAtBottom: boolean;
  isAtLeft: boolean;
  isAtRight: boolean;
}

// --- Position Tracking ---

/** Get current mouse/touch position relative to viewport */
export function getPointerPosition(event: MouseEvent | TouchEvent | PointerEvent): Point {
  if ("clientX" in event) {
    return { x: event.clientX, y: event.clientY };
  }
  const touch = (event as TouchEvent).touches[0] ?? (event as TouchEvent).changedTouches[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : { x: 0, y: 0 };
}

/** Track mouse position globally */
export function createPositionTracker(): {
  getPosition: () => MousePosition | null;
  subscribe: (callback: (pos: MousePosition) => void) => () => void;
  destroy: () => void;
} {
  let currentPosition: MousePosition | null = null;
  const listeners = new Set<(pos: MousePosition) => void>();

  function handleMove(e: MouseEvent): void {
    currentPosition = {
      clientX: e.clientX,
      clientY: e.clientY,
      pageX: e.pageX,
      pageY: e.pageY,
      screenX: e.screenX,
      screenY: e.screenY,
      movementX: e.movementX,
      movementY: e.movementY,
      target: e.target,
      timestamp: Date.now(),
    };
    for (const cb of listeners) cb(currentPosition);
  }

  document.addEventListener("mousemove", handleMove);

  return {
    getPosition: () => currentPosition,
    subscribe(callback) {
      listeners.add(callback);
      if (currentPosition) callback(currentPosition);
      return () => { listeners.delete(callback); };
    },
    destroy() {
      document.removeEventListener("mousemove", handleMove);
      listeners.clear();
    },
  };
}

// --- Click Outside ---

/** Detect clicks outside an element */
export function onClickOutside(options: ClickOutsideOptions): () => void {
  const elements = Array.isArray(options.element) ? options.element : [options.element];
  const ignores = Array.isArray(options.ignore)
    ? options.ignore
    : options.ignore ? [options.ignore] : [];
  let enabled = options.enabled ?? true;

  function handleClick(e: MouseEvent): void {
    if (!enabled) return;

    const target = e.target as Node;

    // Check if click is inside any watched element
    for (const el of elements) {
      if (el.contains(target)) return;
    }

    // Check if click should be ignored
    for (const ignore of ignores) {
      const el = typeof ignore === "string" ? document.querySelector(ignore) : ignore;
      if (el?.contains(target)) return;
    }

    options.handler();
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (!enabled || !options.escapeKey) return;
    if (e.key === "Escape") options.handler();
  }

  document.addEventListener("mousedown", handleClick);
  if (options.escapeKey) {
    document.addEventListener("keydown", handleKeyDown);
  }

  return () => {
    document.removeEventListener("mousedown", handleClick);
    document.removeEventListener("keydown", handleKeyDown);
  };
}

// --- Drag ---

/** Make an element draggable */
export function makeDraggable(options: DragOptions): DragInstance {
  const {
    element,
    axis = "both",
    constrainToParent = false,
    grid,
    preventDefault = true,
    cursor = "grabbing",
  } = options;

  let handleEl: HTMLElement = element;
  if (typeof options.handle === "string") {
    handleEl = element.querySelector(options.handle) ?? element;
  } else if (options.handle) {
    handleEl = options.handle;
  }

  let isDragging = false;
  let startPos: Point = { x: 0, y: 0 };
  let startMouse: Point = { x: 0, y: 0 };
  let currentPos: Point = { x: 0, y: 0 };
  let enabled = true;

  // Read initial transform
  const initialTransform = element.style.transform;
  const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(initialTransform);
  if (match) {
    currentPos.x = parseFloat(match[1]) || 0;
    currentPos.y = parseFloat(match[2]) || 0;
  }

  function applyTransform(pos: Point): void {
    const x = axis === "y" ? 0 : pos.x;
    const y = axis === "x" ? 0 : pos.y;
    element.style.transform = `translate(${x}px, ${y}px)`;
  }

  function clampToBounds(pos: Point): Point {
    if (constrainToParent && element.parentElement) {
      const parentRect = element.parentElement.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      pos.x = Math.max(-rect.left + parentRect.left, Math.min(pos.x, parentRect.right - parentRect.left - rect.width));
      pos.y = Math.max(-rect.top + parentRect.top, Math.min(pos.y, parentRect.bottom - parentRect.top - rect.height));
    }
    if (options.bounds) {
      if (options.bounds.left !== undefined) pos.x = Math.max(pos.x, options.bounds.left);
      if (options.bounds.top !== undefined) pos.y = Math.max(pos.y, options.bounds.top);
      if (options.bounds.right !== undefined) pos.x = Math.min(pos.x, options.bounds.right);
      if (options.bounds.bottom !== undefined) pos.y = Math.min(pos.y, options.bounds.bottom);
    }
    return pos;
  }

  function snapToGrid(pos: Point): Point {
    if (!grid) return pos;
    return {
      x: Math.round(pos.x / grid) * grid,
      y: Math.round(pos.y / grid) * grid,
    };
  }

  function handleDown(e: PointerEvent): void {
    if (!enabled || e.button !== 0) return;
    if (e.target !== handleEl && !handleEl.contains(e.target as Node)) return;

    isDragging = true;
    startPos = { ...currentPos };
    startMouse = { x: e.clientX, y: e.clientY };

    if (preventDefault) e.preventDefault();

    element.setPointerCapture(e.pointerId);

    handleEl.style.cursor = cursor;
    options.onStart?.(currentPos, e);
  }

  function handleMove(e: PointerEvent): void {
    if (!isDragging) return;

    const dx = e.clientX - startMouse.x;
    const dy = e.clientY - startMouse.y;

    let newPos = {
      x: axis === "y" ? currentPos.x : startPos.x + dx,
      y: axis === "x" ? currentPos.y : startPos.y + dy,
    };

    newPos = clampToBounds(newPos);
    newPos = snapToGrid(newPos);

    const delta = { x: newPos.x - currentPos.x, y: newPos.y - currentPos.y };
    currentPos = newPos;
    applyTransform(currentPos);

    options.onMove?.(currentPos, delta, e);
  }

  function handleUp(e: PointerEvent): void {
    if (!isDragging) return;
    isDragging = false;

    try { element.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    handleEl.style.cursor = "";

    options.onEnd?.(currentPos, e);
  }

  handleEl.addEventListener("pointerdown", handleDown);
  element.addEventListener("pointermove", handleMove);
  element.addEventListener("pointerup", handleUp);
  element.addEventListener("pointercancel", handleUp);

  return {
    getPosition: () => ({ ...currentPos }),
    setPosition(pos: Point) {
      currentPos = pos;
      applyTransform(currentPos);
    },
    setEnabled(e: boolean) { enabled = e; },
    destroy() {
      handleEl.removeEventListener("pointerdown", handleDown);
      element.removeEventListener("pointermove", handleMove);
      element.removeEventListener("pointerup", handleUp);
      element.removeEventListener("pointercancel", handleUp);
    },
  };
}

// --- Long Press ---

/** Detect long press on an element */
export function onLongPress(options: LongPressOptions): () => void {
  const { element, delay = 500, threshold = 10 } = options;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let startPoint: Point | null = null;
  let active = true;

  function handleStart(e: PointerEvent): void {
    if (!active) return;
    startPoint = { x: e.clientX, y: e.clientY };
    timer = setTimeout(() => {
      timer = null;
      options.onPress(e);
    }, delay);
  }

  function handleMove(e: PointerEvent): void {
    if (!timer || !startPoint) return;
    const dx = e.clientX - startPoint.x;
    const dy = e.clientY - startPoint.y;
    if (Math.sqrt(dx * dx + dy * dy) > threshold) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function handleEnd(): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    startPoint = null;
  }

  element.addEventListener("pointerdown", handleStart);
  element.addEventListener("pointermove", handleMove);
  element.addEventListener("pointerup", handleEnd);
  element.addEventListener("pointercancel", handleEnd);
  if (options.preventContextMenu ?? true) {
    element.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  return () => {
    active = false;
    element.removeEventListener("pointerdown", handleStart);
    element.removeEventListener("pointermove", handleMove);
    element.removeEventListener("pointerup", handleEnd);
    element.removeEventListener("pointercancel", handleEnd);
    if (timer) clearTimeout(timer);
  };
}

// --- Scroll Direction ---

/** Track scroll direction and velocity */
export function trackScrollDirection(
  element: HTMLElement | Window = window,
): {
  getInfo: () => ScrollDirectionInfo;
  subscribe: (info: ScrollDirectionInfo) => void;
  destroy: () => void;
} {
  let lastScrollLeft = 0;
  let lastScrollTop = 0;
  let lastTime = performance.now();
  let currentInfo: ScrollDirectionInfo = {
    direction: "none",
    deltaX: 0,
    deltaY: 0,
    velocityX: 0,
    velocityY: 0,
    isAtTop: true,
    isAtBottom: false,
    isAtLeft: true,
    isAtRight: false,
  };
  const listeners = new Set<(info: ScrollDirectionInfo) => void>();

  function getScrollPos(): { left: number; top: number; scrollWidth: number; scrollHeight: number; clientWidth: number; clientHeight: number } {
    if (element instanceof Window) {
      return {
        left: window.scrollX,
        top: window.scrollY,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientWidth: window.innerWidth,
        clientHeight: window.innerHeight,
      };
    }
    return {
      left: element.scrollLeft,
      top: element.scrollTop,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
    };
  }

  function update(): void {
    const pos = getScrollPos();
    const now = performance.now();
    const dt = now - lastTime;

    const dX = pos.left - lastScrollLeft;
    const dY = pos.top - lastScrollTop;

    currentInfo = {
      direction:
        Math.abs(dY) > Math.abs(dX)
          ? (dY > 0 ? "down" : "up")
          : (dX > 0 ? "right" : "left"),
      deltaX: dX,
      deltaY: dY,
      velocityX: dt > 0 ? dX / dt : 0,
      velocityY: dt > 0 ? dY / dt : 0,
      isAtTop: pos.top <= 1,
      isAtBottom: pos.top + pos.clientHeight >= pos.scrollHeight - 1,
      isAtLeft: pos.left <= 1,
      isAtRight: pos.left + pos.clientWidth >= pos.scrollWidth - 1,
    };

    lastScrollLeft = pos.left;
    lastScrollTop = pos.top;
    lastTime = now;

    for (const cb of listeners) cb(currentInfo);
  }

  element.addEventListener("scroll", update, { passive: true });

  // Initial state
  update();

  return {
    getInfo: () => currentInfo,
    subscribe(cb) {
      listeners.add(cb);
      cb(currentInfo);
      return () => { listeners.delete(cb); };
    },
    destroy() {
      element.removeEventListener("scroll", update);
      listeners.clear();
    },
  };
}

// --- Pointer Capture Helpers ---

/** Request pointer lock on an element */
export async function requestPointerLock(el: HTMLElement): Promise<boolean> {
  try {
    await el.requestPointerLock();
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
  return document.pointerLockElement !== null;
}

// --- Utility ---

/** Calculate distance between two points */
export function pointDistance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Calculate angle between two points in degrees */
export function pointAngle(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

/** Check if point is inside a rectangle */
export function pointInRect(point: Point, rect: DOMRect): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}
