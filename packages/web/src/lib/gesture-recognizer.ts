/**
 * Gesture Recognizer: Touch and mouse gesture recognition with velocity tracking,
 * multi-finger support, gesture conflict resolution, configurable thresholds,
 * and debounced/continuous output modes.
 *
 * Supported gestures:
 * - Tap (single tap/click)
 * - Double tap
 * - Long press
 * - Swipe / Pan (4 directions)
 * - Pinch (zoom in/out)
 * - Rotate (2-finger rotation)
 */

// --- Types ---

export type GestureType =
  | "tap"
  | "doubleTap"
  | "longPress"
  | "swipeLeft"
  | "swipeRight"
  | "swipeUp"
  | "swipeDown"
  | "pan"
  | "pinch"
  | "rotate";

export interface Point {
  x: number;
  y: number;
  timestamp: number;
  pressure?: number;
  pointerId?: number;
  pointerType?: "mouse" | "touch" | "pen";
}

export interface GestureEvent {
  type: GestureType;
  /** Center point of the gesture */
  center: Point;
  /** Starting point */
  startPoint: Point;
  /** Current/end point */
  endPoint: Point;
  /** Velocity in px/s */
  velocity: { x: number; y: number };
  /** Total distance traveled */
  distance: number;
  /** Duration of gesture in ms */
  duration: number;
  /** For pinch: scale factor (1 = no change) */
  scale?: number;
  /** For rotate: angle in degrees */
  rotation?: number;
  /** Number of touches/fingers */
  touchCount: number;
  /** Target element under the gesture */
  target: EventTarget;
  /** Original browser event */
  nativeEvent: PointerEvent | TouchEvent | MouseEvent;
}

export interface GestureConfig {
  /** Element to attach gesture recognition to */
  element: HTMLElement | Document | Window;
  /** Which gestures to recognize (default: all) */
  enabledGestures?: Set<GestureType> | GestureType[];
  /** Minimum distance in px to start a swipe (default: 30) */
  swipeThreshold?: number;
  /** Maximum time in ms for a tap (default: 300) */
  tapTimeout?: number;
  /** Time in ms before recognizing long press (default: 500) */
  longPressDelay?: number;
  /** Max time between taps for double-tap (default: 300) */
  doubleTapInterval?: number;
  /** Minimum pinch distance to start (default: 10) */
  pinchThreshold?: number;
  /** Minimum rotation angle to start (default: 15 degrees) */
  rotateThreshold?: number;
  /** Velocity threshold for swipe velocity (px/s, default: 100) */
  minSwipeVelocity?: number;
  /** Prevent default browser behavior (default: true for touch) */
  preventDefault?: boolean;
  /** Stop propagation (default: false) */
  stopPropagation?: boolean;
  /** Debounce gesture callbacks (ms, default: 0) */
  debounceMs?: number;
  /** Output mode: 'end' = only fire on gesture end, 'continuous' = fire during movement */
  outputMode?: "end" | "continuous";
  /** Callback for each recognized gesture */
  onGesture?: (event: GestureEvent) => void;
  /** Called when a gesture starts (but isn't yet recognized) */
  onGestureStart?: (startPoint: Point, touchCount: number) => void;
  /** Called when a potential gesture is cancelled */
  onGestureCancel?: () => void;
  /** Pointer capture mode (default: true for gestures) */
  capturePointer?: boolean;
}

// --- Math Utilities ---

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, timestamp: Math.max(a.timestamp, b.timestamp), pointerType: a.pointerType };
}

function angle(a: Point, b: Point, c: Point): number {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  return Math.atan2(cb.y, cb.x) - Math.atan2(ab.y, ab.x);
}

function calculateVelocity(points: Point[]): { x: number; y: number } {
  if (points.length < 2) return { x: 0, y: 0 };
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const dt = (last.timestamp - first.timestamp) / 1000; // seconds
  if (dt <= 0.001) return { x: 0, y: 0 };
  return {
    x: (last.x - first.x) / dt,
    y: (last.y - first.y) / dt,
  };
}

function getTouchCount(event: PointerEvent | TouchEvent): number {
  if ("pointerType" in event) return 1;
  if ("touches" in event) return (event as TouchEvent).touches.length;
  return 1;
}

function extractPoints(event: PointerEvent | TouchEvent): Point[] {
  if ("pointerType" in event) {
    const e = event as PointerEvent;
    return [{ x: e.clientX, y: e.clientY, timestamp: performance.now(), pressure: e.pressure, pointerId: e.pointerId, pointerType: e.pointerType as "mouse" | "touch" | "pen" }];
  }
  const te = event as TouchEvent;
  const points: Point[] = [];
  for (let i = 0; i < te.touches.length; i++) {
    const t = te.touches[i]!;
    points.push({ x: t.clientX, y: t.clientY, timestamp: performance.now(), identifier: t.identifier as number, pointerType: "touch" as any });
  }
  return points;
}

// --- Gesture State ---

interface InternalState {
  phase: "idle" | "possible" | "tracking" | "recognizing" | "ended";
  startPoint: Point | null;
  currentPoints: Point[];
  allPoints: Point[][]; // Per-pointer trail
  touchCount: number;
  activeGesture: GestureType | null;
  startTime: number;
  lastTapTime: number;
  lastTapTarget: EventTarget | null;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  debounceTimers: Map<GestureType, ReturnType<typeof setTimeout>>;
  pointersDown: Set<number>;
}

// --- Main Recognizer ---

export class GestureRecognizer {
  private config: Required<GestureConfig>;
  private state: InternalState;
  private listeners = new Set<(event: GestureEvent) => void>();
  private boundHandlers: {
    down: (e: Event) => void;
    move: (e: Event) => void;
    up: (e: Event) => void;
    cancel: (e: Event) => void;
  } | null = null;
  private attached = false;

  constructor(config: GestureConfig) {
    this.config = {
      ...config,
      enabledGestures: config.enabledGestures
        ? (Array.isArray(config.enabledGestures) ? new Set(config.enabledGestures) : config.enabledGestures)
        : new Set([
            "tap", "doubleTap", "longPress",
            "swipeLeft", "swipeRight", "swipeUp", "swipeDown",
            "pinch", "rotate", "pan",
          ]),
      swipeThreshold: config.swipeThreshold ?? 30,
      tapTimeout: config.tapTimeout ?? 300,
      longPressDelay: config.longPressDelay ?? 500,
      doubleTapInterval: config.doubleTapInterval ?? 300,
      pinchThreshold: config.pinchThreshold ?? 10,
      rotateThreshold: config.rotateThreshold ?? 15,
      minSwipeVelocity: config.minSwipeVelocity ?? 100,
      preventDefault: config.preventDefault ?? true,
      stopPropagation: config.stopPropagation ?? false,
      debounceMs: config.debounceMs ?? 0,
      outputMode: config.outputMode ?? "end",
      capturePointer: config.capturePointer ?? true,
      onGesture: config.onGesture ?? (() => {}),
      onGestureStart: config.onGestureStart ?? (() => {}),
      onGestureCancel: config.onGestureCancel ?? (() => {}),
    };

    this.state = {
      phase: "idle",
      startPoint: null,
      currentPoints: [],
      allPoints: [],
      touchCount: 0,
      activeGesture: null,
      startTime: 0,
      lastTapTime: 0,
      lastTapTarget: null,
      longPressTimer: null,
      debounceTimers: new Map(),
      pointersDown: new Set(),
    };
  }

  /** Start listening for gestures on the configured element */
  attach(): void {
    if (this.attached) return;
    this.attached = true;

    const target = this.config.element;

    this.boundHandlers = {
      down: (e: Event) => this.handlePointerDown(e as PointerEvent),
      move: (e: Event) => this.handlePointerMove(e as PointerEvent),
      up: (e: Event) => this.handlePointerUp(e as PointerEvent),
      cancel: (e: Event) => this.handlePointerCancel(),
    };

    // Use pointer events for unified mouse/touch handling
    target.addEventListener("pointerdown", this.boundHandlers.down, { passive: false });
    target.addEventListener("pointermove", this.boundHandlers.move, { passive: true });
    target.addEventListener("pointerup", this.boundHandlers.up, { passive: true });
    target.addEventListener("pointercancel", this.boundHandlers.cancel, { passive: true });

    // Also listen to touch events for multi-touch
    if ((target as any).addEventListener) {
      target.addEventListener("touchstart", this.boundHandlers.down as EventListener, { passive: false });
      target.addEventListener("touchmove", this.boundHandlers.move as EventListener, { passive: false });
      target.addEventListener("touchend", this.boundHandlers.up as EventListener, { passive: false });
      target.addEventListener("touchcancel", this.boundHandlers.cancel as EventListener, { passive: true });
    }
  }

  /** Stop listening for gestures */
  detach(): void {
    if (!this.attached || !this.boundHandlers) return;

    const target = this.config.element;
    target.removeEventListener("pointerdown", this.boundHandlers.down);
    target.removeEventListener("pointermove", this.boundHandlers.move);
    target.removeEventListener("pointerup", this.boundHandlers.up);
    target.removeEventListener("pointercancel", this.boundHandlers.cancel);

    try {
      (target as any).removeEventListener("touchstart", this.boundHandlers.down);
      (target as any).removeEventListener("touchmove", this.boundHandlers.move);
      (target as any).removeEventListener("touchend", this.boundHandlers.up);
      (target as any).removeEventListener("touchcancel", this.boundHandlers.cancel);
    } catch {}

    this.cleanup();
    this.attached = false;
  }

  /** Subscribe to gesture events */
  on(listener: (event: GestureEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Private Handlers ---

  private handlePointerDown(e: PointerEvent): void {
    if (this.config.preventDefault) e.preventDefault();
    if (this.config.stopPropagation) e.stopPropagation();

    this.state.pointersDown.add(e.pointerId);
    const points = extractPoints(e);
    this.state.touchCount = points.length;
    this.state.currentPoints = points;
    this.state.startPoint = points[0] ?? null;
    this.state.startTime = performance.now();
    this.state.phase = "possible";

    // Track per-pointer trails
    for (const p of points) {
      const idx = p.pointerId ?? 0;
      if (!this.state.allPoints[idx]) this.state.allPoints[idx] = [];
      this.state.allPoints[idx]!.push(p);
    }

    // Capture pointer for reliable tracking across iframe boundaries
    if (this.config.capturePointer && (e.target as HTMLElement).setPointerCapture) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }

    this.config.onGestureStart(this.state.startPoint!, this.state.touchCount);

    // Start long press timer
    if (this.config.enabledGestures.has("longPress")) {
      this.state.longPressTimer = setTimeout(() => {
        if (this.state.phase === "possible" || this.state.phase === "tracking") {
          this.recognizeGesture("longPress");
        }
      }, this.config.longPressDelay);
    }

    // Clear previous debounce timers for ended gestures
    for (const [, timer] of this.state.debounceTimers) {
      clearTimeout(timer);
    }
    this.state.debounceTimers.clear();
  }

  private handlePointerMove(e: PointerEvent): void {
    if (this.state.phase === "idle" || this.state.pointersDown.size === 0) return;
    if (this.config.preventDefault && this.state.phase !== "idle") e.preventDefault();

    const points = extractPoints(e);
    this.state.currentPoints = points;

    // Update per-pointer trails
    for (const p of points) {
      const idx = p.pointerId ?? 0;
      if (this.state.allPoints[idx]) {
        this.state.allPoints[idx]!.push(p);
      }
    }

    this.state.phase = "tracking";

    if (this.config.outputMode === "continuous") {
      this.analyzeAndEmitContinuous();
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    if (this.config.preventDefault) e.preventDefault();

    this.state.pointersDown.delete(e.pointerId);

    // Release pointer capture
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // If all pointers are up, finalize gesture
    if (this.state.pointersDown.size === 0) {
      this.finalizeGesture();
    }
  }

  private handlePointerCancel(): void {
    this.cleanup();
    this.config.onGestureCancel();
    this.state.phase = "idle";
  }

  // --- Recognition ---

  private finalizeGesture(): void {
    // Cancel long press timer
    if (this.state.longPressTimer) {
      clearTimeout(this.state.longPressTimer);
      this.state.longPressTimer = null;
    }

    if (this.state.phase === "idle" || !this.state.startPoint) return;

    const totalDist = this.state.startPoint
      ? distance(this.state.currentPoints[0] ?? this.state.startPoint, this.state.startPoint)
      : 0;
    const duration = performance.now() - this.state.startTime;
    const velocity = calculateVelocity(this.state.currentPoints.length > 0 ? this.state.currentPoints : [this.state.startPoint!]);

    // Try to recognize based on accumulated data
    this.state.phase = "recognizing";

    // Check double-tap first (needs history)
    if (this.config.enabledGestures.has("doubleTap")) {
      const timeSinceLastTap = performance.now() - this.state.lastTapTime;
      if (timeSinceLastTap < this.config.doubleTapInterval &&
          totalDist < 10 && // Minimal movement = tap
          this.state.startPoint &&
          distance(this.state.currentPoints[0] ?? this.state.startPoint, this.state.startPoint) < 10) {
        this.emitGesture("doubleTap");
        this.cleanup();
        return;
      }
    }

    // Check for tap (quick touch, minimal movement)
    if (this.config.enabledGestures.has("tap") && duration < this.config.tapTimeout && totalDist < 10) {
      // Check it wasn't a long press
      const timeSinceStart = performance.now() - this.state.startTime;
      if (timeSinceStart < this.config.longPressDelay) {
        this.emitGesture("tap");
        this.state.lastTapTime = performance.now();
        this.state.lastTapTarget = this.state.startPoint?.target ?? (e as any).target;
        this.cleanup();
        return;
      }
    }

    // Check for swipe
    if (totalDist > this.config.swipeThreshold) {
      const swipeGesture = this.classifySwipe(velocity, totalDist);
      if (swipeGesture && this.config.enabledGestures.has(swipeGesture)) {
        this.emitGesture(swipeGesture);
        this.cleanup();
        return;
      }
    }

    // Check for pan (movement without meeting swipe threshold)
    if (totalDist > 5 && this.config.enabledGestures.has("pan")) {
      this.emitGesture("pan");
      this.cleanup();
      return;
    }

    // No recognized gesture
    this.cleanup();
  }

  private recognizeGesture(type: GestureType): void {
    if (!this.state.startPoint) return;

    const points = this.state.currentPoints.length > 0
      ? this.state.currentPoints
      : [this.state.startPoint!];
    const velocity = calculateVelocity(points);
    const totalDist = this.state.startPoint
      ? distance(points[points.length - 1] ?? this.state.startPoint, this.state.startPoint)
      : 0;
    const duration = performance.now() - this.state.startTime;

    let scale: number | undefined;
    let rotation: number | undefined;

    // Calculate pinch scale
    if (this.state.touchCount >= 2 && this.state.allPoints[0] && this.state.allPoints[1]) {
      const p0Start = this.state.allPoints[0]![0];
      const p1Start = this.state.allPoints[1]![0];
      const p0End = this.state.allPoints[0]![this.state.allPoints[0].length - 1];
      const p1End = this.state.allPoints[1]![this.state.allPoints[1].length - 1];

      const startDist = distance(p0Start, p1Start);
      const endDist = distance(p0End, p1End);
      if (startDist > 0) {
        scale = endDist / startDist;
      }
    }

    // Calculate rotation
    if (this.state.touchCount >= 2 && this.state.allPoints[0] && this.state.allPoints[1] &&
        this.state.allPoints[0].length >= 2 && this.state.allPoints[1].length >= 2) {
      const p0Now = this.state.allPoints[0]![this.state.allPoints[0].length - 1];
      const p1Now = this.state.allPoints[1]![this.state.allPoints[1].length - 1];
      const p0First = this.state.allPoints[0]![0];
      const p1First = this.state.allPoints[1]![0];
      rotation = angle(p0First, this.state.startPoint!, p1Now) * (180 / Math.PI);
    }

    const event: GestureEvent = {
      type,
      center: midpoint(points[0], points[points.length - 1]),
      startPoint: this.state.startPoint!,
      endPoint: points[points.length - 1],
      velocity,
      distance: totalDist,
      duration,
      scale,
      rotation,
      touchCount: this.state.touchCount,
      target: this.state.startPoint.target ?? (this.config.element as any),
      nativeEvent: e as any, // Will be set properly
    };

    this.emitGesture(type, event);
  }

  private classifySwipe(velocity: { x: number; y: number }, dist: number): GestureType | null {
    if (Math.abs(velocity.x) < this.config.minSwipeVelocity &&
        Math.abs(velocity.y) < this.config.minSwipeVelocity) return null;

    const absX = Math.abs(velocity.x);
    const absY = Math.abs(velocity.y);

    if (absX > absY * 2) {
      return velocity.x > 0 ? "swipeRight" : "swipeLeft";
    }
    if (absY > absX * 2) {
      return velocity.y > 0 ? "swipeDown" : "swipeUp";
    }
    // Diagonal — pick dominant axis
    if (absX > absY) {
      return velocity.x > 0 ? "swipeRight" : "swipeLeft";
    }
    return velocity.y > 0 ? "swipeDown" : "swipeUp";
  }

  private analyzeAndEmitContinuous(): void {
    // Continuous pinch detection
    if (this.state.touchCount >= 2 && this.config.enabledGestures.has("pinch")) {
      const p0Start = this.state.allPoints[0]?.[0];
      const p1Start = this.state.allPoints[1]?.[0];
      const p0Now = this.state.allPoints[0]?.[this.state.allPoints[0]?.length - 1];
      const p1Now = this.state.allPoints[1]?.[this.state.allPoints[1]?.length - 1];

      if (p0Start && p1Start && p0Now && p1Now) {
        const startDist = distance(p0Start, p1Start);
        const currDist = distance(p0Now, p1Now);
        if (Math.abs(currDist / startDist - 1) > 0.1) {
          this.recognizeGesture("pinch");
        }
      }
    }

    // Continuous rotation detection
    if (this.state.touchCount >= 2 && this.config.enabledGestures.has("rotate")) {
      const rot = this.calculateCurrentRotation();
      if (Math.abs(rot) > this.config.rotateThreshold) {
        this.recognizeGesture("rotate");
      }
    }
  }

  private calculateCurrentRotation(): number {
    if (this.state.allPoints[0]?.length >= 2 && this.state.allPoints[1]?.length >= 2) {
      const p0First = this.state.allPoints[0]![0];
      const p1First = this.state.allPoints[1]![0];
      const p0Last = this.state.allPoints[0]![this.state.allPoints[0].length - 1];
      const p1Last = this.state.allPoints[1]![this.state.allPoints[1].length - 1];
      return angle(p0First, this.state.startPoint!, p1Last) * (180 / Math.PI);
    }
    return 0;
  }

  private emitGesture(type: GestureType, overrideEvent?: GestureEvent): void {
    const points = this.state.currentPoints.length > 0
      ? this.state.currentPoints
      : [this.state.startPoint!];
    const velocity = calculateVelocity(points);
    const totalDist = this.state.startPoint
      ? distance(points[points.length - 1] ?? this.state.startPoint, this.state.startPoint)
      : 0;
    const duration = performance.now() - this.state.startTime;

    let scale: number | undefined;
    let rotation: number | undefined;

    if (type === "pinch" && this.state.allPoints[0] && this.state.allPoints[1]) {
      const p0Start = this.state.allPoints[0]![0];
      const p1Start = this.state.allPoints[1]![0];
      const p0End = this.state.allPoints[0]![this.state.allPoints[0].length - 1];
      const p1End = this.state.allPoints[1]![this.state.allPoints[1].length - 1];
      const sd = distance(p0Start, p1Start);
      const ed = distance(p0End, p1End);
      if (sd > 0) scale = ed / sd;
    }

    if (type === "rotate") {
      rotation = this.calculateCurrentRotation();
    }

    const event: GestureEvent = overrideEvent ?? {
      type,
      center: midpoint(points[0], points[points.length - 1]),
      startPoint: this.state.startPoint!,
      endPoint: points[points.length - 1],
      velocity,
      distance: totalDist,
      duration,
      scale,
      rotation,
      touchCount: this.state.touchCount,
      target: this.state.startPoint?.target ?? this.config.element,
      nativeEvent: {} as any,
    };

    // Debounce if configured
    if (this.config.debounceMs > 0) {
      let timer = this.state.debounceTimers.get(type);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        this.config.onGesture(event);
        for (const l of this.listeners) l(event);
      }, this.config.debounceMs);
      this.state.debounceTimers.set(type, timer);
    } else {
      this.config.onGesture(event);
      for (const l of this.listeners) l(event);
    }
  }

  private cleanup(): void {
    if (this.state.longPressTimer) {
      clearTimeout(this.state.longPressTimer);
      this.state.longPressTimer = null;
    }
    for (const [, timer] of this.state.debounceTimers) {
      clearTimeout(timer);
    }
    this.state.debounceTimers.clear();
    this.state.phase = "idle";
    this.state.startPoint = null;
    this.state.currentPoints = [];
    this.state.allPoints = [];
    this.state.touchCount = 0;
    this.state.activeGesture = null;
  }
}
