/**
 * Gesture Utilities: Touch/mouse gesture recognition, swipe, pinch, rotate,
 * long press, tap detection, multi-finger gestures, velocity tracking,
 * and gesture conflict resolution.
 */

// --- Types ---

export interface Point {
  x: number;
  y: number;
  time: number;
}

export interface SwipeGesture {
  type: "swipe";
  direction: "up" | "down" | "left" | "right";
  distance: number;
  duration: number;
  velocity: { x: number; y: number };
  startPoint: Point;
  endPoint: Point;
}

export interface PinchGesture {
  type: "pinch";
  scale: number; // ratio change (e.g., 1.5 = zoomed in 50%)
  centerPoint: Point;
  initialDistance: number;
  currentDistance: number;
}

export interface RotateGesture {
  type: "rotate";
  angle: number; // degrees of rotation
  centerPoint: Point;
  startAngle: number;
  currentAngle: number;
}

export interface TapGesture {
  type: "tap";
  point: Point;
  count: number; // single/double/triple tap
}

export interface LongPressGesture {
  type: "longpress";
  point: Point;
  duration: number;
}

export interface PanGesture {
  type: "pan";
  delta: Point;
  startPoint: Point;
  currentPoint: Point;
  velocity: { x: number; y: number };
}

export type Gesture = SwipeGesture | PinchGesture | RotateGesture | TapGesture | LongPressGesture | PanGesture;

export interface GestureConfig {
  /** Minimum distance in px for a swipe to be recognized. Default 30 */
  swipeThreshold?: number;
  /** Maximum duration in ms for a swipe. Default 500 */
  swipeMaxDuration?: number;
  /** Minimum velocity (px/ms) for swipe. Default 0.3 */
  swipeMinVelocity?: number;
  /** Maximum time between taps for double-tap. Default 300ms */
  doubleTapDelay?: number;
  /** Long press threshold in ms. Default 500 */
  longPressDelay?: number;
  /** Maximum movement during long press before cancel. Default 10px */
  longPressMoveTolerance?: number;
  /** Minimum pinch distance change to trigger. Default 5px */
  pinchThreshold?: number;
  /** Minimum rotation in degrees to trigger. Default 10 */
  rotateThreshold?: number;
  /** Enable mouse fallback for touch gestures. Default true */
  enableMouseFallback?: boolean;
  /** Prevent default browser behavior on touch. Default true */
  preventDefault?: boolean;
  /** Stop propagation of handled events. Default false */
  stopPropagation?: boolean;
}

export interface GestureHandlers {
  onSwipe?: (gesture: SwipeGesture) => void;
  onPinch?: (gesture: PinchGesture) => void;
  onRotate?: (gesture: RotateGesture) => void;
  onTap?: (gesture: TapGesture) => void;
  onLongPress?: (gesture: LongPressGesture) => void;
  onPan?: (gesture: PanGesture) => void;
  onPanStart?: () => void;
  onPanEnd?: () => void;
  onGestureStart?: (event: PointerEvent | TouchEvent) => void;
  onGestureEnd?: (event: PointerEvent | TouchEvent) => void;
}

// --- Velocity Tracker ---

/**
 * Tracks pointer velocity using exponential moving average.
 */
class VelocityTracker {
  private samples: Array<{ x: number; y: number; time: number }> = [];
  private maxSamples = 5;
  private _velocityX = 0;
  private _velocityY = 0;

  record(x: number, y: number): void {
    const now = performance.now();
    this.samples.push({ x, y, time: now });
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
    this._recalculate();
  }

  getVelocity(): { x: number; y: number } {
    return { x: this._velocityX, y: this._velocityY };
  }

  reset(): void {
    this.samples = [];
    this._velocityX = 0;
    this._velocityY = 0;
  }

  private _recalculate(): void {
    if (this.samples.length < 2) return;

    let sumVx = 0;
    let sumVy = 0;
    let count = 0;

    for (let i = 1; i < this.samples.length; i++) {
      const prev = this.samples[i - 1]!;
      const curr = this.samples[i]!;
      const dt = curr.time - prev.time;
      if (dt > 0) {
        sumVx += (curr.x - prev.x) / dt;
        sumVy += (curr.y - prev.y) / dt;
        count++;
      }
    }

    if (count > 0) {
      this._velocityX = sumVx / count;
      this._velocityY = sumVy / count;
    }
  }
}

// --- Gesture Recognizer ---

/**
 * GestureRecognizer - unified touch/mouse gesture recognition.
 *
 * @example
 * ```ts
 * const recognizer = new GestureRecognizer(element, {
 *   onSwipe: (g) => console.log(`Swiped ${g.direction}`),
 *   onTap: (g) => console.log(`Tapped ${g.count}x`),
 *   onPinch: (g) => console.log(`Pinched ${g.scale}x`),
 * });
 * ```
 */
export class GestureRecognizer {
  private element: HTMLElement;
  private config: Required<GestureConfig>;
  private handlers: GestureHandlers;
  private cleanupFns: Array<() => void> = [];

  // State
  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private isTracking = false;
  private tapCount = 0;
  private lastTapTime = 0;
  private lastTapPoint: Point | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressTriggered = false;
  private velocityTracker = new VelocityTracker();

  // Multi-touch
  private touches = new Map<number, Point>();
  private initialPinchDistance = 0;
  private currentPinchDistance = 0;
  private initialRotateAngle = 0;
  private currentRotateAngle = 0;

  constructor(
    element: HTMLElement,
    handlers: GestureHandlers,
    config: GestureConfig = {},
  ) {
    this.element = element;
    this.handlers = handlers;
    this.config = {
      swipeThreshold: config.swipeThreshold ?? 30,
      swipeMaxDuration: config.swipeMaxDuration ?? 500,
      swipeMinVelocity: config.swipeMinVelocity ?? 0.3,
      doubleTapDelay: config.doubleTapDelay ?? 300,
      longPressDelay: config.longPressDelay ?? 500,
      longPressMoveTolerance: config.longPressMoveTolerance ?? 10,
      pinchThreshold: config.pinchThreshold ?? 5,
      rotateThreshold: config.rotateThreshold ?? 10,
      enableMouseFallback: config.enableMouseFallback !== false,
      preventDefault: config.preventDefault !== false,
      stopPropagation: config.stopPropagation ?? false,
    };

    this._bindEvents();
  }

  /** Stop recognizing gestures and remove listeners */
  destroy(): void {
    for (const fn of this.cleanupFns) {
      fn();
    }
    this.cleanupFns = [];
    this._cancelLongPress();
  }

  // --- Private Event Binding ---

  private _bindEvents(): void {
    const el = this.element;

    // Touch events
    const onTouchStart = (e: TouchEvent) => {
      if (this.config.preventDefault && e.cancelable) e.preventDefault();
      if (this.config.stopPropagation) e.stopPropagation();
      this._handleTouchStart(e);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (this.config.preventDefault && e.cancelable) e.preventDefault();
      if (this.config.stopPropagation) e.stopPropagation();
      this._handleTouchMove(e);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (this.config.preventDefault && e.cancelable) e.preventDefault();
      if (this.config.stopPropagation) e.stopPropagation();
      this._handleTouchEnd(e);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });

    this.cleanupFns.push(
      () => el.removeEventListener("touchstart", onTouchStart),
      () => el.removeEventListener("touchmove", onTouchMove),
      () => el.removeEventListener("touchend", onTouchEnd),
      () => el.removeEventListener("touchcancel", onTouchEnd),
    );

    // Mouse fallback
    if (this.config.enableMouseFallback) {
      const onMouseDown = (e: MouseEvent) => {
        if (this.config.stopPropagation) e.stopPropagation();
        this._handleMouseDown(e);
      };

      const onMouseMove = (e: MouseEvent) => {
        if (this.config.stopPropagation) e.stopPropagation();
        this._handleMouseMove(e);
      };

      const onMouseUp = (e: MouseEvent) => {
        if (this.config.stopPropagation) e.stopPropagation();
        this._handleMouseUp(e);
      };

      el.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);

      this.cleanupFns.push(
        () => el.removeEventListener("mousedown", onMouseDown),
        () => window.removeEventListener("mousemove", onMouseMove),
        () => window.removeEventListener("mouseup", onMouseUp),
      );
    }
  }

  // --- Touch Handlers ---

  private _handleTouchStart(e: TouchEvent): void {
    this.handlers.onGestureStart?.(e as unknown as PointerEvent);

    if (e.touches.length === 1) {
      const t = e.touches[0]!;
      const p: Point = { x: t.clientX, y: t.clientY, time: Date.now() };
      this.startPoint = p;
      this.currentPoint = p;
      this.isTracking = true;
      this.longPressTriggered = false;
      this.velocityTracker.reset();
      this.velocityTracker.record(p.x, p.y);

      // Start long press timer
      this.longPressTimer = setTimeout(() => {
        this.longPressTriggered = true;
        this.handlers.onLongPress?.({
          type: "longpress",
          point: { ...p },
          duration: this.config.longPressDelay,
        });
      }, this.config.longPressDelay);
    } else if (e.touches.length === 2) {
      this._cancelLongPress();
      this._initMultiTouch(e);
    }
  }

  private _handleTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1 && this.isTracking && this.startPoint) {
      const t = e.touches[0]!;
      const p: Point = { x: t.clientX, y: t.clientY, time: Date.now() };
      this.currentPoint = p;
      this.velocityTracker.record(p.x, p.y);

      // Cancel long press if moved too far
      if (!this.longPressTriggered) {
        const dx = p.x - this.startPoint.x;
        const dy = p.y - this.startPoint.y;
        if (Math.sqrt(dx * dx + dy * dy) > this.config.longPressMoveTolerance) {
          this._cancelLongPress();
        }
      }

      // Report pan
      if (this.handlers.onPan) {
        const vel = this.velocityTracker.getVelocity();
        this.handlers.onPan({
          type: "pan",
          delta: { x: p.x - this.startPoint.x, y: p.y - this.startPoint.y, time: p.time },
          startPoint: { ...this.startPoint },
          currentPoint: p,
          velocity: vel,
        });
      }
    } else if (e.touches.length === 2) {
      this._updateMultiTouch(e);
    }
  }

  private _handleTouchEnd(e: TouchEvent): void {
    this.handlers.onGestureEnd?.(e as unknown as PointerEvent);

    if (e.touches.length === 0) {
      this._finalizeSingleTouch();
    } else if (e.touches.length === 1) {
      // Transitioned from multi-touch back to single
      this.touches.clear();
    }
  }

  // --- Mouse Handlers ---

  private _handleMouseDown(e: MouseEvent): void {
    const p: Point = { x: e.clientX, y: e.clientY, time: Date.now() };
    this.startPoint = p;
    this.currentPoint = p;
    this.isTracking = true;
    this.longPressTriggered = false;
    this.velocityTracker.reset();
    this.velocityTracker.record(p.x, p.y);

    this.longPressTimer = setTimeout(() => {
      this.longPressTriggered = true;
      this.handlers.onLongPress?.({
        type: "longpress",
        point: { ...p },
        duration: this.config.longPressDelay,
      });
    }, this.config.longPressDelay);
  }

  private _handleMouseMove(e: MouseEvent): void {
    if (!this.isTracking || !this.startPoint) return;

    const p: Point = { x: e.clientX, y: e.clientY, time: Date.now() };
    this.currentPoint = p;
    this.velocityTracker.record(p.x, p.y);

    if (!this.longPressTriggered) {
      const dx = p.x - this.startPoint.x;
      const dy = p.y - this.startPoint.y;
      if (Math.sqrt(dx * dx + dy * dy) > this.config.longPressMoveTolerance) {
        this._cancelLongPress();
      }
    }

    if (this.handlers.onPan) {
      const vel = this.velocityTracker.getVelocity();
      this.handlers.onPan({
        type: "pan",
        delta: { x: p.x - this.startPoint.x, y: p.y - this.startPoint.y, time: p.time },
        startPoint: { ...this.startPoint },
        currentPoint: p,
        velocity: vel,
      });
    }
  }

  private _handleMouseUp(_e: MouseEvent): void {
    this._finalizeSingleTouch();
  }

  // --- Multi-Touch ---

  private _initMultiTouch(e: TouchEvent): void {
    this.touches.clear();
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i]!;
      this.touches.set(t.identifier, { x: t.clientX, y: t.clientY, time: Date.now() });
    }

    const pts = Array.from(this.touches.values());
    this.initialPinchDistance = this._distance(pts[0], pts[1]);
    this.currentPinchDistance = this.initialPinchDistance;
    this.initialRotateAngle = this._angle(pts[0], pts[1]);
    this.currentRotateAngle = this.initialRotateAngle;
  }

  private _updateMultiTouch(e: TouchEvent): void {
    this.touches.clear();
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i]!;
      this.touches.set(t.identifier, { x: t.clientX, y: t.clientY, time: Date.now() });
    }

    const pts = Array.from(this.touches.values());
    if (pts.length >= 2) {
      this.currentPinchDistance = this._distance(pts[0], pts[1]);
      this.currentRotateAngle = this._angle(pts[0], pts[1]);

      const scale = this.currentPinchDistance / this.initialPinchDistance;
      const center = this._midpoint(pts[0], pts[1]);

      if (Math.abs(scale - 1) * this.initialPinchDistance > this.config.pinchThreshold) {
        this.handlers.onPinch?.({
          type: "pinch",
          scale,
          centerPoint: center,
          initialDistance: this.initialPinchDistance,
          currentDistance: this.currentPinchDistance,
        });
      }

      let angleDiff = this.currentRotateAngle - this.initialRotateAngle;
      // Normalize to -180..180
      while (angleDiff > 180) angleDiff -= 360;
      while (angleDiff < -180) angleDiff += 360;

      if (Math.abs(angleDiff) > this.config.rotateThreshold) {
        this.handlers.onRotate?.({
          type: "rotate",
          angle: angleDiff,
          centerPoint: center,
          startAngle: this.initialRotateAngle,
          currentAngle: this.currentRotateAngle,
        });
      }
    }
  }

  // --- Finalization ---

  private _finalizeSingleTouch(): void {
    this._cancelLongPress();

    if (!this.isTracking || !this.startPoint || !this.currentPoint) return;

    const sp = this.startPoint;
    const cp = this.currentPoint;
    const dx = cp.x - sp.x;
    const dy = cp.y - sp.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = cp.time - sp.time;
    const vel = this.velocityTracker.getVelocity();

    // Determine gesture type
    if (dist < 10 && !this.longPressTriggered) {
      // Tap
      const now = Date.now();
      if (
        this.lastTapPoint &&
        now - this.lastTapTime < this.config.doubleTapDelay &&
        this._distance(cp, this.lastTapPoint) < 30
      ) {
        this.tapCount++;
      } else {
        this.tapCount = 1;
      }
      this.lastTapTime = now;
      this.lastTapPoint = { ...cp };

      this.handlers.onTap?.({ type: "tap", point: { ...cp }, count: this.tapCount });
    } else if (
      dist >= this.config.swipeThreshold &&
      duration <= this.config.swipeMaxDuration
    ) {
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      if (speed >= this.config.swipeMinVelocity) {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const direction =
          absDx > absDy
            ? dx > 0 ? "right" : "left"
            : dy > 0 ? "down" : "up";

        this.handlers.onSwipe?.({
          type: "swipe",
          direction,
          distance: dist,
          duration,
          velocity: vel,
          startPoint: sp,
          endPoint: cp,
        });
      }
    }

    if (this.handlers.onPanEnd) this.handlers.onPanEnd();

    // Reset state
    this.isTracking = false;
    this.startPoint = null;
    this.currentPoint = null;
    this.touches.clear();
  }

  // --- Helpers ---

  private _cancelLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private _distance(a: Point | undefined, b: Point | undefined): number {
    if (!a || !b) return 0;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private _midpoint(a: Point | undefined, b: Point | undefined): Point {
    if (!a || !b) return { x: 0, y: 0, time: 0 };
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, time: Date.now() };
  }

  private _angle(a: Point | undefined, b: Point | undefined): number {
    if (!a || !b) return 0;
    return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  }
}

// --- Utility Functions ---

/** Calculate distance between two points */
export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Calculate angle between two points in degrees */
export function angleBetween(a: Point, b: Point): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/** Calculate midpoint between two points */
export function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    time: (a.time + b.time) / 2,
  };
}

/** Get the dominant direction of a vector */
export function getDirection(dx: number, dy: number): "up" | "down" | "left" | "right" {
  return Math.abs(dx) > Math.abs(dy)
    ? dx > 0 ? "right" : "left"
    : dy > 0 ? "down" : "up";
}

/** Check if a point is within a rectangular area */
export function isInsideRect(point: Point, rect: DOMRect): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

/** Check if a point is within an element's bounds */
export function isInsideElement(point: Point, element: HTMLElement): boolean {
  return isInsideRect(point, element.getBoundingClientRect());
}

/** Debounce rapid taps into a single tap event */
export function createTapDebounce(
  callback: (point: Point, count: number) => void,
  delayMs = 300,
): (point: Point) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let count = 0;
  let lastPoint: Point | null = null;

  return (point: Point) => {
    count++;
    lastPoint = point;

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (lastPoint) callback(lastPoint, count);
      count = 0;
      lastPoint = null;
      timer = null;
    }, delayMs);
  };
}

/** Create a simple swipe detector that returns a promise resolving with the direction */
export function detectSwipe(
  element: HTMLElement,
  options?: Partial<GestureConfig>,
): Promise<SwipeGesture> {
  return new Promise<SwipeGesture>((resolve) => {
    const recognizer = new GestureRecognizer(
      element,
      {
        onSwipe: (g) => {
          recognizer.destroy();
          resolve(g);
        },
      },
      options,
    );

    // Auto-destroy after timeout
    setTimeout(() => recognizer.destroy(), 10000);
  });
}
