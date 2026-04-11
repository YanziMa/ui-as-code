/**
 * Mouse gesture detection: drag directions, click patterns,
 * multi-touch gesture recognition, swipe detection, and
 * pinch/zoom simulation.
 */

// --- Types ---

export type Direction = "up" | "down" | "left" | "right" | "none";
export type GestureType =
  | "tap"
  | "double-tap"
  | "long-press"
  | "drag"
  | "swipe"
  | "pinch"
  | "rotate"
  | "scroll";

export interface Point {
  x: number;
  y: number;
  time: number;
}

export interface GestureEvent {
  type: GestureType;
  /** Primary direction for drag/swipe */
  direction?: Direction;
  /** Start point */
  start: Point;
  /** End point */
  end: Point;
  /** Delta from start to end */
  delta: { x: number; y: number };
  /** Total distance traveled */
  distance: number;
  /** Duration in ms */
  duration: number;
  /** Velocity (px/ms) */
  velocity: { x: number; y: number };
  /** Number of taps (for tap events) */
  tapCount?: number;
  /** Center point (for multi-touch) */
  center?: Point;
  /** Scale change (for pinch, 1.0 = no change) */
  scale?: number;
  /** Rotation angle in degrees (for rotate) */
  rotation?: number;
  /** Original DOM event */
  originalEvent: MouseEvent | TouchEvent | PointerEvent;
}

export interface GestureOptions {
  /** Minimum distance in px to register as drag (default: 5) */
  dragThreshold?: number;
  /** Minimum velocity (px/ms) to register as swipe (default: 0.3) */
  swipeThreshold?: number;
  /** Maximum duration for a tap (ms, default: 300) */
  tapTimeout?: number;
  /** Duration before long-press fires (ms, default: 500) */
  longPressDelay?: number;
  /** Max interval between double-tap clicks (ms, default: 300) */
  doubleTapInterval?: number;
  /** Element to attach listeners to */
  target: HTMLElement;
  /** Callback when a gesture is recognized */
  onGesture?: (event: GestureEvent) => void;
  /** Callback on gesture start */
  onStart?: (point: Point) => void;
  /** Callback on gesture move */
  onMove?: (point: Point, event: GestureEvent) => void;
  /** Callback on gesture end */
  onEnd?: (event: GestureEvent) => void;
  /** Prevent default context menu on long press? */
  preventContextMenu?: boolean;
  /** Enable multi-touch gestures? */
  enableMultiTouch?: boolean;
}

// --- Direction Detection ---

/** Determine the primary direction of movement */
export function getDirection(deltaX: number, deltaY: number): Direction {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX < 3 && absY < 3) return "none";
  if (absX > absY) return deltaX > 0 ? "right" : "left";
  return deltaY > 0 ? "down" : "up";
}

/** Calculate Euclidean distance between two points */
export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Calculate midpoint between two points */
export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, time: (a.time + b.time) / 2 };
}

/** Calculate angle between two points (in degrees) */
export function angleBetween(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);
}

// --- Gesture Recognizer ---

export class GestureRecognizer {
  private options: Required<Pick<GestureOptions, "dragThreshold" | "swipeThreshold" | "tapTimeout" | "longPressDelay" | "doubleTapInterval">> & Omit<GestureOptions, "dragThreshold" | "swipeThreshold" | "tapTimeout" | "longPressDelay" | "doubleTapInterval">;

  // State
  private startPoint: Point | null = null;
  private lastPoint: Point | null = null;
  private startTime = 0;
  private lastTapTime = 0;
  private tapCount = 0;
  private tapTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private isDragging = false;
  private isLongPressed = false;

  // Multi-touch
  private touches: Map<number, Point> = new Map();
  private initialPinchDistance = 0;
  private initialAngle = 0;

  // Cleanup
  private boundHandlers: Record<string, EventListener> = {};
  private destroyed = false;

  constructor(options: GestureOptions) {
    this.options = {
      dragThreshold: 5,
      swipeThreshold: 0.3,
      tapTimeout: 300,
      longPressDelay: 500,
      doubleTapInterval: 300,
      preventContextMenu: true,
      enableMultiTouch: true,
      ...options,
    };

    this.attachListeners();
  }

  private attachListeners(): void {
    const el = this.options.target;

    this.boundHandlers["pointerdown"] = this.handlePointerDown.bind(this);
    this.boundHandlers["pointermove"] = this.handlePointerMove.bind(this);
    this.boundHandlers["pointerup"] = this.handlePointerUp.bind(this);
    this.boundHandlers["pointercancel"] = this.handlePointerUp.bind(this);
    this.boundHandlers["contextmenu"] = (e: Event) => {
      if (this.options.preventContextMenu && this.isLongPressed) e.preventDefault();
    };

    el.addEventListener("pointerdown", this.boundHandlers["pointerdown"]);
    el.addEventListener("pointermove", this.boundHandlers["pointermove"]);
    el.addEventListener("pointerup", this.boundHandlers["pointerup"]);
    el.addEventListener("pointercancel", this.boundHandlers["pointercancel"]);
    el.addEventListener("contextmenu", this.boundHandlers["contextmenu"]);

    if (this.options.enableMultiTouch) {
      this.boundHandlers["touchstart"] = this.handleTouchStart.bind(this);
      this.boundHandlers["touchmove"] = this.handleTouchMove.bind(this);
      this.boundHandlers["touchend"] = this.handleTouchEnd.bind(this);
      el.addEventListener("touchstart", this.boundHandlers["touchstart"], { passive: false });
      el.addEventListener("touchmove", this.boundHandlers["touchmove"], { passive: false });
      el.addEventListener("touchend", this.boundHandlers["touchend"]);
    }
  }

  private makePoint(clientX: number, clientY: number): Point {
    return { x: clientX, y: clientY, time: performance.now() };
  }

  private buildEvent(type: GestureType, originalEvent: MouseEvent | TouchEvent | PointerEvent): GestureEvent {
    const start = this.startPoint!;
    const end = this.lastPoint ?? start;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dur = end.time - start.time;

    const evt: GestureEvent = {
      type,
      direction: getDirection(dx, dy),
      start,
      end,
      delta: { x: dx, y: dy },
      distance: distance(start, end),
      duration: dur,
      velocity: dur > 0 ? { x: dx / dur, y: dy / dur } : { x: 0, y: 0 },
      originalEvent,
    };

    if (type === "tap" || type === "double-tap") {
      evt.tapCount = this.tapCount;
    }

    return evt;
  }

  // --- Pointer Events ---

  private handlePointerDown(e: PointerEvent): void {
    if (this.destroyed) return;

    this.startPoint = this.makePoint(e.clientX, e.clientY);
    this.lastPoint = this.startPoint;
    this.startTime = performance.now();
    this.isDragging = false;
    this.isLongPressed = false;

    this.options.onStart?.(this.startPoint);

    // Long press timer
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    this.longPressTimer = setTimeout(() => {
      if (!this.isDragging && !this.destroyed) {
        this.isLongPressed = true;
        const evt = this.buildEvent("long-press", e);
        this.options.onGesture?.(evt);
      }
    }, this.options.longPressDelay);
  }

  private handlePointerMove(e: PointerEvent): void {
    if (this.destroyed || !this.startPoint) return;

    const current = this.makePoint(e.clientX, e.clientY);
    this.lastPoint = current;

    const dist = distance(this.startPoint, current);

    // Cancel long press if moved beyond threshold
    if (dist > this.options.dragThreshold && !this.isLongPressed) {
      if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
    }

    if (dist > this.options.dragThreshold && !this.isDragging) {
      this.isDragging = true;
    }

    if (this.isDragging) {
      const evt = this.buildEvent("drag", e);
      this.options.onMove?.(current, evt);
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    if (this.destroyed || !this.startPoint) return;

    if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }

    const current = this.makePoint(e.clientX, e.clientY);
    this.lastPoint = current;
    const dist = distance(this.startPoint, current);
    const dur = current.time - this.startTime;

    if (this.isDragging) {
      // Check if it was a swipe (fast movement)
      const vel = Math.sqrt(
        ((current.x - this.startPoint.x) / dur) ** 2 +
        ((current.y - this.startPoint.y) / dur) ** 2,
      );

      if (vel > this.options.swipeThreshold) {
        const evt = this.buildEvent("swipe", e);
        this.options.onGesture?.(evt);
      } else {
        const evt = this.buildEvent("drag", e);
        this.options.onGesture?.(evt);
      }
      this.options.onEnd?.(this.buildEvent("drag", e));
    } else if (!this.isLongPressed && dur < this.options.tapTimeout) {
      // It's a tap
      this.tapCount++;
      const now = performance.now();

      if (now - this.lastTapTime < this.options.doubleTapInterval) {
        // Double tap
        if (this.tapTimer) { clearTimeout(this.tapTimer); this.tapTimer = null; }
        const evt = this.buildEvent("double-tap", e);
        this.options.onGesture?.(evt);
        this.tapCount = 0;
      } else {
        // Potential single tap (wait to see if it becomes double)
        this.lastTapTime = now;
        this.tapTimer = setTimeout(() => {
          if (!this.destroyed) {
            const evt = this.buildEvent("tap", e);
            this.options.onGesture?.(evt);
          }
          this.tapCount = 0;
        }, this.options.doubleTapInterval);
      }
    }

    this.resetState();
  }

  // --- Multi-Touch Events ---

  private handleTouchStart(e: TouchEvent): void {
    if (this.destroyed) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]!;
      this.touches.set(touch.identifier, this.makePoint(touch.clientX, touch.clientY));
    }

    if (this.touches.size === 2) {
      const pts = Array.from(this.touches.values());
      this.initialPinchDistance = distance(pts[0]!, pts[1]!);
      this.initialAngle = angleBetween(pts[0]!, pts[1]!);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (this.destroyed || this.touches.size < 2) return;

    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]!;
      this.touches.set(touch.identifier, this.makePoint(touch.clientX, touch.clientY));
    }

    if (this.touches.size >= 2) {
      const pts = Array.from(this.touches.values());
      const currentDistance = distance(pts[0]!, pts[1]!);
      const currentAngle = angleBetween(pts[0]!, pts[1]!);
      const center = midpoint(pts[0]!, pts[1]!);

      const scale = currentDistance / this.initialPinchDistance;
      let rotation = currentAngle - this.initialAngle;
      if (rotation > 180) rotation -= 360;
      if (rotation < -180) rotation += 360;

      if (Math.abs(scale - 1) > 0.05) {
        this.options.onGesture?.({
          type: "pinch",
          center,
          scale,
          start: this.startPoint!,
          end: center,
          delta: { x: 0, y: 0 },
          distance: currentDistance,
          duration: performance.now() - this.startTime,
          velocity: { x: 0, y: 0 },
          originalEvent: e,
        });
      }

      if (Math.abs(rotation) > 5) {
        this.options.onGesture?.({
          type: "rotate",
          center,
          rotation,
          start: this.startPoint!,
          end: center,
          delta: { x: 0, y: 0 },
          distance: currentDistance,
          duration: performance.now() - this.startTime,
          velocity: { x: 0, y: 0 },
          originalEvent: e,
        });
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      this.touches.delete(e.changedTouches[i]!.identifier);
    }
  }

  private resetState(): void {
    this.startPoint = null;
    this.lastPoint = null;
    this.isDragging = false;
    this.isLongPressed = false;
    this.touches.clear();
  }

  /** Clean up all event listeners */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    const el = this.options.target;
    for (const [event, handler] of Object.entries(this.boundHandlers)) {
      el.removeEventListener(event, handler);
    }

    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    if (this.tapTimer) clearTimeout(this.tapTimer);
    this.resetState();
  }
}

// --- Swipe Detector (standalone) ---

export interface SwipeOptions {
  element: HTMLElement;
  /** Minimum swipe distance in px (default: 30) */
  minDistance?: number;
  /** Maximum time for a swipe in ms (default: 500) */
  maxTime?: number;
  /** Minimum velocity (default: 0.1) */
  minVelocity?: number;
  /** Lock scroll during swipe? */
  lockAxis?: "x" | "y" | "both" | "none";
  onSwipe?: (direction: Direction, event: GestureEvent) => void;
  onSwipeUp?: (event: GestureEvent) => void;
  onSwipeDown?: (event: GestureEvent) => void;
  onSwipeLeft?: (event: GestureEvent) => void;
  onSwipeRight?: (event: GestureEvent) => void;
}

/** Simple swipe detector for common horizontal/vertical swipe patterns */
export function createSwipeDetector(options: SwipeOptions): { destroy: () => void } {
  let startX = 0, startY = 0, startTime = 0;
  let captured = false;

  const minDist = options.minDistance ?? 30;
  const maxTime = options.maxTime ?? 500;
  const minVel = options.minVelocity ?? 0.1;

  const handleStart = (e: PointerEvent) => {
    startX = e.clientX;
    startY = e.clientY;
    startTime = performance.now();
    captured = true;
  };

  const handleEnd = (e: PointerEvent) => {
    if (!captured) return;
    captured = false;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const dt = performance.now() - startTime;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const vel = dist / dt;

    if (dist >= minDist && dt <= maxTime && vel >= minVel) {
      const dir = getDirection(dx, dy);
      const evt: GestureEvent = {
        type: "swipe",
        direction: dir,
        start: { x: startX, y: startY, time: startTime },
        end: { x: e.clientX, y: e.clientY, time: performance.now() },
        delta: { x: dx, y: dy },
        distance: dist,
        duration: dt,
        velocity: { x: dx / dt, y: dy / dt },
        originalEvent: e,
      };

      options.onSwipe?.(dir, evt);
      if (dir === "up") options.onSwipeUp?.(evt);
      if (dir === "down") options.onSwipeDown?.(evt);
      if (dir === "left") options.onSwipeLeft?.(evt);
      if (dir === "right") options.onSwipeRight?.(evt);
    }
  };

  options.element.addEventListener("pointerdown", handleStart);
  options.element.addEventListener("pointerup", handleEnd);
  options.element.addEventListener("pointercancel", handleEnd);

  return {
    destroy: () => {
      options.element.removeEventListener("pointerdown", handleStart);
      options.element.removeEventListener("pointerup", handleEnd);
      options.element.removeEventListener("pointercancel", handleEnd);
    },
  };
}
