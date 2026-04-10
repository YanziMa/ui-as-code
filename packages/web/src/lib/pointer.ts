/**
 * Pointer events, gesture recognition, and touch handling utilities.
 */

export interface Point {
  x: number;
  y: number;
}

export interface PointerEvent {
  type: "down" | "move" | "up" | "cancel";
  pointerId: number;
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
  button?: number;
  buttons?: number;
  /** Original DOM event */
  nativeEvent?: MouseEvent | TouchEvent | PointerEvent;
}

/** Convert mouse/touch/pointer event to unified format */
export function normalizePointerEvent(e: MouseEvent | TouchEvent | PointerEvent): PointerEvent {
  const isTouch = "touches" in e && (e as TouchEvent).touches.length > 0;

  if ("pointerId" in e) {
    const pe = e as PointerEvent;
    return {
      type: pe.type === "pointerdown" ? "down" : pe.type === "pointerup" ? "up" : pe.type === "pointercancel" ? "cancel" : "move",
      pointerId: pe.pointerId,
      x: pe.clientX,
      y: pe.clientY,
      pressure: pe.pressure,
      timestamp: Date.now(),
      button: pe.button,
      buttons: pe.buttons,
      nativeEvent: e,
    };
  }

  if (isTouch) {
    const te = e as TouchEvent;
    const touch = te.touches[0] ?? te.changedTouches[0];
    return {
      type: te.type === "touchstart" ? "down" : te.type === "touchend" ? "up" : "touchcancel" ? "cancel" : "move",
      pointerId: touch?.identifier ?? -1,
      x: touch?.clientX ?? 0,
      y: touch?.clientY ?? 0,
      pressure: 1,
      timestamp: Date.now(),
      nativeEvent: e,
    };
  }

  // Mouse fallback
  const me = e as MouseEvent;
  return {
    type: me.type === "mousedown" ? "down" : me.type === "mouseup" ? "up" : "mousemove",
    pointerId: 0,
    x: me.clientX,
    y: me.clientY,
    pressure: me.buttons > 0 ? 1 : 0,
    timestamp: Date.now(),
    button: me.button,
    buttons: me.buttons,
    nativeEvent: e,
  };
}

/** Calculate distance between two points */
export function pointDistance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/** Calculate midpoint */
export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Calculate angle from point A to B in radians */
export function angleBetween(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Rotate point around origin by angle */
export function rotatePoint(p: Point, angle: number, origin?: Point): Point {
  const ox = origin?.x ?? 0;
  const oy = origin?.y ?? 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: ox + (p.x - ox) * cos - (p.y - oy) * sin,
    y: oy + (p.x - ox) * sin + (p.y - oy) * cos,
  };
}

/** Linear interpolation */
export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// --- Gesture Recognition ---

export interface GestureConfig {
  /** Minimum distance (px) for swipe */
  swipeThreshold?: number;
  /** Maximum duration (ms) for tap */
  tapTimeoutMs?: number;
  /** Maximum movement (px) to still count as tap */
  tapMaxMovement?: number;
  /** Minimum distance (px) for long press */
  longPressThresholdMs?: number;
  /** Minimum pinch distance change */
  pinchThreshold?: number;
  /** Angle threshold for rotation (radians) */
  rotationThreshold?: number;
}

export interface SwipeGesture {
  direction: "left" | "right" | "up" | "down";
  distance: number;
  velocity: number; // px/s
  startPoint: Point;
  endPoint: Point;
  duration: number;
}

export interface PinchGesture {
  type: "pinch-in" | "pinch-out";
  distance: number;
  center: Point;
  scale: number;
}

export interface RotationGesture {
  angle: number; // radians
  center: Point;
  velocity: number;
}

export type GestureHandler<T = (gesture: T) => void | boolean;

/** Create a gesture recognizer on an element */
export function createGestureRecognizer(
  element: HTMLElement,
  config: GestureConfig = {},
): GestureController {
  const {
    swipeThreshold = 50,
    tapTimeoutMs = 300,
    tapMaxMovement = 10,
    longPressThresholdMs = 500,
    pinchThreshold = 10,
    rotationThreshold = 0.1,
  } = config;

  let startPoint: Point | null = null;
  let startTime = 0;
  let lastPoint: Point | null = null;
  let isTracking = false;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  const listeners = {
    onTap: new Set<GestureHandler<Point>>(),
    onDoubleTap: new Set<GestureHandler<Point>>(),
    onSwipe: new Set<GestureHandler<SwipeGesture>>(),
    onLongPress: new Set<GestureHandler<Point>>(),
    onPinch: new Set<GestureHandler<PinchGesture>>(),
    onRotate: new Set<GestureHandler<RotationGesture>>(),
    onPanStart: new Set<GestureHandler<Point>>(),
    onPanMove: new Set<GestureHandler<{ start: Point; current: Point; delta: Point }>>(),
    onPanEnd: new Set<GestureHandler<{ start: Point; end: Point }>>(),
  };

  let tapCount = 0;
  let tapTimer: ReturnType<typeof setTimeout> | null = null;

  function handleDown(e: PointerEvent): void {
    if (destroyed) return;
    const p = { x: e.x, y: e.y };
    startPoint = p;
    startTime = e.timestamp;
    lastPoint = p;
    isTracking = true;

    // Long press timer
    longPressTimer = setTimeout(() => {
      if (!destroyed) notify("onLongPress", p);
    }, longPressThresholdMs);

    // Pan start
    notify("onPanStart", p);

    // Clear double-tap timer
    if (tapTimer) clearTimeout(tapTimer);
  }

  function handleMove(e: PointerEvent): void {
    if (!isTracking || !startPoint || destroyed) return;
    const p = { x: e.x, y: e.y };

    if (lastPoint) {
      const delta = { x: p.x - lastPoint!.x, y: p.y - lastPoint!.y };
      notify("onPanMove", { start: startPoint!, current: p, delta });
    }
    lastPoint = p;
  }

  function handleUp(e: PointerEvent): void {
    if (!isTracking || !startPoint || destroyed) return;
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }

    const endPoint = { x: e.x, y: e.y };
    const dist = pointDistance(startPoint, endPoint);
    const duration = e.timestamp - startTime;

    isTracking = false;

    // Pan end
    notify("onPanEnd", { start: startPoint, end: endPoint });

    // Classify gesture
    if (duration < tapTimeoutMs && dist < tapMaxMovement) {
      // Tap
      tapCount++;
      if (tapCount === 1) {
        tapTimer = setTimeout(() => {
          notify("onTap", startPoint!);
          tapCount = 0;
        }, 250); // Window for double-tap
      } else if (tapCount >= 2) {
        clearTimeout(tapTimer!);
        tapCount = 0;
        notify("onDoubleTap", startPoint!);
      }
    } else if (dist >= swipeThreshold) {
      // Swipe
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      let direction: SwipeGesture["direction"];

      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? "right" : "left";
      } else {
        direction = dy > 0 ? "down" : "up";
      }

      const velocity = dist / Math.max(duration, 1); // px/ms

      notify("onSwipe", {
        direction,
        distance: dist,
        velocity: velocity * 1000, // px/s
        startPoint: startPoint!,
        endPoint,
        duration,
      });
    }

    startPoint = null;
    lastPoint = null;
  }

  function handleCancel(): void {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    isTracking = false;
    startPoint = null;
    lastPoint = null;
  }

  function notify<K extends keyof typeof listeners>(
    event: K,
    data: Parameters<NonNullable<(typeof listeners[K]) extends Set<infer T> ? T : never>[0]>,
  ): void {
    const handlerSet = listeners[event];
    if (!handlerSet || handlerSet.size === 0) return;

    for (const handler of handlerSet) {
      try {
        const result = handler(data as any);
        if (result === false) break; // Handler returned false to stop propagation
      } catch {}
    }
  }

  // Attach listeners
  element.addEventListener("pointerdown", handleDown as EventListener);
  element.addEventListener("pointermove", handleMove as EventListener);
  element.addEventListener("pointerup", handleUp as EventListener);
  element.addEventListener("pointercancel", handleCancel as EventListener);

  // Also support touch and mouse for broader compatibility
  element.addEventListener("touchstart", handleDown as EventListener, { passive: true });
  element.addEventListener("touchmove", handleMove as EventListener, { passive: true });
  element.addEventListener("touchend", handleUp as EventListener);
  element.addEventListener("touchcancel", handleCancel as EventListener);

  return {
    onTap: (fn: GestureHandler<Point>) => { listeners.onTap.add(fn); return () => { listeners.onTap.delete(fn); }; },
    onDoubleTap: (fn: GestureHandler<Point>) => { listeners.onDoubleTap.add(fn); return () => { listeners.onDoubleTap.delete(fn); }; },
    onSwipe: (fn: GestureHandler<SwipeGesture>) => { listeners.onSwipe.add(fn); return () => { listeners.onSwipe.delete(fn); }; },
    onLongPress: (fn: GestureHandler<Point>) => { listeners.onLongPress.add(fn); return () => { listeners.onLongPress.delete(fn); }; },
    onPinch: (fn: GestureHandler<PinchGesture>) => { listeners.onPinch.add(fn); return () => { listeners.onPinch.delete(fn); }; },
    onRotate: (fn: GestureHandler<RotationGesture>) => { listeners.onRotate.add(fn); return () => { listeners.onRotate.delete(fn); }; },
    onPanStart: (fn: GestureHandler<Point>) => { listeners.onPanStart.add(fn); return () => { listeners.onPanStart.delete(fn); }; },
    onPanMove: (fn) => { listeners.onPanMove.add(fn); return () => { listeners.onPanMove.delete(fn); }; },
    onPanEnd: (fn) => { listeners.onPanEnd.add(fn); return () => { listeners.onPanEnd.delete(fn); }; },

    destroy(): void {
      destroyed = true;
      if (longPressTimer) clearTimeout(longPressTimer);
      if (tapTimer) clearTimeout(tapTimer);
      element.removeEventListener("pointerdown", handleDown as EventListener);
      element.removeEventListener("pointermove", handleMove as EventListener);
      element.removeEventListener("pointerup", handleUp as EventListener);
      element.removeEventListener("pointercancel", handleCancel as EventListener);
      element.removeEventListener("touchstart", handleDown as EventListener);
      element.removeEventListener("touchmove", handleMove as EventListener);
      element.removeEventListener("touchend", handleUp as EventListener);
      element.removeEventListener("touchcancel", handleCancel as EventListener);
      listeners.onTap.clear(); listeners.onDoubleTap.clear();
      listeners.onSwipe.clear(); listeners.onLongPress.clear();
      listeners.onPinch.clear(); listeners.onRotate.clear();
      listeners.onPanStart.clear(); listeners.onPanMove.clear(); listeners.onPanEnd.clear();
    },
  };
}

export type GestureController = ReturnType<typeof createGestureRecognizer>;

// --- Multi-touch utilities ---

/** Track multiple touch points */
export class TouchTracker {
  private touches = new Map<number, { x: number; y: number; startX: number; startY: number }>();

  update(touches: TouchList): TouchChange[] {
    const changes: TouchChange[] = [];
    const activeIds = new Set<number>();

    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i]!;
      activeIds.add(touch.identifier);
      const prev = this.touches.get(touch.identifier);

      if (prev) {
        changes.push({
          id: touch.identifier,
          x: touch.clientX,
          y: touch.clientY,
          dx: touch.clientX - prev.x,
          dy: touch.clientY - prev.y,
          type: "moved",
        });
      } else {
        this.touches.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
          startX: touch.clientX,
          startY: touch.clientY,
        });
        changes.push({
          id: touch.identifier,
          x: touch.clientX,
          y: touch.clientY,
          dx: 0,
          dy: 0,
          type: "started",
        });
      }
    }

    // Remove ended touches
    for (const [id] of this.touches.keys()) {
      if (!activeIds.has(id)) {
        const t = this.touches.get(id)!;
        changes.push({ id, x: t.x, y: t.y, dx: 0, dy: 0, type: "ended" });
        this.touches.delete(id);
      }
    }

    return changes;
  }

  getActiveTouches(): Array<{ id: number; x: number; y: number }> {
    return Array.from(this.touches.entries()).map(([id, t]) => ({ id, ...t }));
  }

  clear(): void { this.touches.clear(); }
}

export interface TouchChange {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  type: "started" | "moved" | "ended";
}
