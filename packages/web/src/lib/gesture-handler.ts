/**
 * Gesture Handler: Touch and mouse gesture recognition system supporting
 * tap, double-tap, long-press, swipe (4 directions), pinch-to-zoom,
 * rotate, pan/drag, multi-finger gestures, velocity tracking, and
 * configurable thresholds/dead zones.
 */

// --- Types ---

export type GestureType =
  | "tap"
  | "doubleTap"
  | "longPress"
  | "swipe"
  | "swipeLeft"
  | "swipeRight"
  | "swipeUp"
  | "swipeDown"
  | "pinch"
  | "rotate"
  | "pan"
  | "panStart"
  | "panEnd";

export interface GestureEvent {
  /** Gesture type */
  type: GestureType;
  /** Target element */
  target: Element;
  /** Center point of gesture (client coords) */
  centerX: number;
  centerY: number;
  /** Delta from start for pan/swipe */
  deltaX: number;
  deltaY: number;
  /** Velocity in px/s */
  velocityX: number;
  velocityY: number;
  /** For pinch: scale factor (1 = no change) */
  scale?: number;
  /** For rotate: angle in degrees */
  rotation?: number;
  /** Number of active pointers */
  pointerCount: number;
  /** Timestamp when gesture started */
  startTime: number;
  /** Duration of gesture in ms */
  duration: number;
  /** Original DOM event that triggered this */
  originalEvent: PointerEvent | TouchEvent | MouseEvent;
}

export interface GestureOptions {
  /** Max distance for tap recognition (px, default: 10) */
  tapThreshold?: number;
  /** Max time between taps for double-tap (ms, default: 300) */
  doubleTapDelay?: number;
  /** Time before long-press triggers (ms, default: 500) */
  longPressDelay?: number;
  /** Min distance to qualify as swipe (px, default: 30) */
  swipeThreshold?: number;
  /** Min velocity for swipe (px/s, default: 100) */
  swipeVelocityThreshold?: number;
  /** Min pinch scale change to trigger (default: 0.05) */
  pinchSensitivity?: number;
  /** Min rotation change to trigger (degrees, default: 5) */
  rotationSensitivity?: number;
  /** Enable specific gesture types (default: all enabled) */
  enable?: Partial<Record<GestureType, boolean>>;
  /** Prevent default browser behavior on handled gestures? (default: true) */
  preventDefault?: boolean;
  /** Called on any recognized gesture */
  onGesture?: (event: GestureEvent) => void;
}

export interface GestureHandlerInstance {
  /** Attach to an element */
  attach(element: Element): () => void;
  /** Destroy all listeners */
  destroy(): void;
}

// --- Internal State ---

interface PointerState {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastTime: number;
}

interface GestureSession {
  target: Element;
  pointers: Map<number, PointerState>;
  startTime: number;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  tapCount: number;
  lastTapTime: number;
  isPanning: boolean;
  startDistance: number;
  startAngle: number;
  disposed: boolean;
}

// --- Main Class ---

export class GestureHandler implements GestureHandlerInstance {
  private options: Required<Pick<GestureOptions, "tapThreshold" | "doubleTapDelay" | "longPressDelay" | "swipeThreshold" | "swipeVelocityThreshold" | "pinchSensitivity" | "rotationSensitivity" | "preventDefault">> & Omit<GestureOptions, "tapThreshold" | "doubleTapDelay" | "longPressDelay" | "swipeThreshold" | "swipeVelocityThreshold" | "pinchSensitivity" | "rotationSensitivity" | "preventDefault">;
  private sessions = new WeakMap<Element, GestureSession>();
  private cleanups = new Set<() => void>();
  private destroyed = false;

  constructor(options: GestureOptions = {}) {
    this.options = {
      tapThreshold: options.tapThreshold ?? 10,
      doubleTapDelay: options.doubleTapDelay ?? 300,
      longPressDelay: options.longPressDelay ?? 500,
      swipeThreshold: options.swipeThreshold ?? 30,
      swipeVelocityThreshold: options.swipeVelocityThreshold ?? 100,
      pinchSensitivity: options.pinchSensitivity ?? 0.05,
      rotationSensitivity: options.rotationSensitivity ?? 5,
      preventDefault: options.preventDefault ?? true,
      enable: options.enable ?? {},
      onGesture: options.onGesture ?? (() => {}),
    };
  }

  attach(element: Element): () => void {
    if (this.destroyed) return () => {};

    const session: GestureSession = {
      target: element,
      pointers: new Map(),
      startTime: 0,
      longPressTimer: null,
      tapCount: 0,
      lastTapTime: 0,
      isPanning: false,
      startDistance: 0,
      startAngle: 0,
      disposed: false,
    };

    this.sessions.set(element, session);

    const onPointerDown = (e: PointerEvent) => {
      if (this.destroyed || session.disposed) return;

      const state: PointerState = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        lastTime: Date.now(),
      };

      // If first pointer, reset session
      if (session.pointers.size === 0) {
        session.startTime = Date.now();
        session.isPanning = false;
        session.startDistance = 0;
        session.startAngle = 0;
      }

      session.pointers.set(e.pointerId, state);

      // Start long press timer on single pointer
      if (session.pointers.size === 1 && this.isEnabled("longPress")) {
        session.longPressTimer = setTimeout(() => {
          if (session.pointers.size === 1) {
            const s = session.pointers.get(e.pointerId);
            if (!s) return;
            const dx = s.lastX - s.startX;
            const dy = s.lastY - s.startY;
            if (Math.sqrt(dx * dx + dy * dy) < this.options.tapThreshold) {
              this.emitGesture(session, "longPress", e, { deltaX: 0, deltaY: 0 });
            }
          }
        }, this.options.longPressDelay);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.destroyed || session.disposed) return;

      const state = session.pointers.get(e.pointerId);
      if (!state) return;

      const prevX = state.lastX;
      const prevY = state.lastY;
      const prevTime = state.lastTime;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      state.lastTime = Date.now();

      // Cancel long press if moved too far
      if (session.longPressTimer) {
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;
        if (Math.sqrt(dx * dx + dy * dy) > this.options.tapThreshold) {
          clearTimeout(session.longPressTimer);
          session.longPressTimer = null;
        }
      }

      const ptrCount = session.pointers.size;

      // Single finger: check for pan start / panning
      if (ptrCount === 1) {
        const totalDx = e.clientX - state.startX;
        const totalDy = e.clientY - state.startY;
        const dist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

        if (!session.isPanning && dist > this.options.tapThreshold) {
          session.isPanning = true;
          // Cancel long press
          if (session.longPressTimer) {
            clearTimeout(session.longPressTimer);
            session.longPressTimer = null;
          }
          this.emitGesture(session, "panStart", e, { deltaX: totalDx, deltaY: totalDy });
        }

        if (session.isPanning && this.isEnabled("pan")) {
          const dt = Math.max(1, state.lastTime - prevTime);
          this.emitGesture(session, "pan", e, {
            deltaX: e.clientX - prevX,
            deltaY: e.clientY - prevY,
            velocityX: ((e.clientX - prevX) / dt) * 1000,
            velocityY: ((e.clientY - prevY) / dt) * 1000,
          });
        }
      }

      // Two fingers: pinch + rotate
      if (ptrCount === 2) {
        const pts = Array.from(session.pointers.values());
        const [p1, p2] = pts;
        const dx = p2.lastX - p1.lastX;
        const dy = p2.lastY - p1.lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        if (session.startDistance === 0) {
          session.startDistance = dist;
          session.startAngle = angle;
        } else {
          const scale = dist / session.startDistance;
          const rotation = angle - session.startAngle;

          if (this.isEnabled("pinch") && Math.abs(scale - 1) >= this.options.pinchSensitivity) {
            this.emitGesture(session, "pinch", e, { scale });
          }

          if (this.isEnabled("rotate") && Math.abs(rotation) >= this.options.rotationSensitivity) {
            this.emitGesture(session, "rotate", e, { rotation });
          }
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (this.destroyed || session.disposed) return;

      const state = session.pointers.get(e.pointerId);
      if (!state) return;

      // Cancel long press
      if (session.longPressTimer) {
        clearTimeout(session.longPressTimer);
        session.longPressTimer = null;
      }

      const wasPanning = session.isPanning;
      session.pointers.delete(e.pointerId);

      // End pan if was panning and no more pointers
      if (wasPanning && session.pointers.size === 0 && this.isEnabled("pan")) {
        this.emitGesture(session, "panEnd", e, {
          deltaX: state.lastX - state.startX,
          deltaY: state.lastY - state.startY,
        });
      }

      // Check for tap / double-tap / swipe on final pointer up
      if (session.pointers.size === 0) {
        const dx = state.lastX - state.startX;
        const dy = state.lastY - state.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dt = Math.max(1, Date.now() - session.startTime);
        const velX = (dx / dt) * 1000;
        const velY = (dy / dt) * 1000;
        const vel = Math.sqrt(velX * velX + velY * velY);

        if (!wasPanning && dist < this.options.tapThreshold) {
          // Tap detected
          const now = Date.now();
          const isDoubleTap = now - session.lastTapTime < this.options.doubleTapDelay;

          if (isDoubleTap && this.isEnabled("doubleTap")) {
            this.emitGesture(session, "doubleTap", e, { deltaX: 0, deltaY: 0 });
            session.tapCount = 0;
          } else {
            if (this.isEnabled("tap")) {
              this.emitGesture(session, "tap", e, { deltaX: 0, deltaY: 0 });
            }
            session.tapCount++;
            session.lastTapTime = now;
          }
        } else if (dist >= this.options.swipeThreshold && vel >= this.options.swipeVelocityThreshold) {
          // Swipe detection
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          let swipeType: GestureType = "swipe";

          if (absDx > absDy * 1.5) {
            swipeType = dx > 0 ? "swipeRight" : "swipeLeft";
          } else if (absDy > absDx * 1.5) {
            swipeType = dy > 0 ? "swipeDown" : "swipeUp";
          }

          if (this.isEnabled(swipeType) || this.isEnabled("swipe")) {
            this.emitGesture(session, swipeType, e, { deltaX: dx, deltaY: dy, velocityX: velX, velocityY: velY });
          }
        }

        // Reset session state
        session.isPanning = false;
        session.startDistance = 0;
        session.startAngle = 0;
      }
    };

    const onCancel = () => {
      if (session.longPressTimer) {
        clearTimeout(session.longPressTimer);
        session.longPressTimer = null;
      }
      session.pointers.clear();
      session.isPanning = false;
    };

    element.addEventListener("pointerdown", onPointerDown, { passive: false });
    element.addEventListener("pointermove", onPointerMove, { passive: false });
    element.addEventListener("pointerup", onPointerUp, { passive: false });
    element.addEventListener("pointercancel", onCancel, { passive: false });

    const cleanup = () => {
      session.disposed = true;
      if (session.longPressTimer) clearTimeout(session.longPressTimer);
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onCancel);
      this.sessions.delete(element);
      this.cleanups.delete(cleanup);
    };

    this.cleanups.add(cleanup);
    return cleanup;
  }

  destroy(): void {
    this.destroyed = true;
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups.clear();
  }

  // --- Internal ---

  private isEnabled(type: GestureType): boolean {
    const explicit = this.options.enable[type];
    return explicit !== false; // Default: all enabled unless explicitly disabled
  }

  private emitGesture(
    session: GestureSession,
    type: GestureType,
    originalEvent: PointerEvent | TouchEvent | MouseEvent,
    extra: {
      deltaX?: number;
      deltaY?: number;
      velocityX?: number;
      velocityY?: number;
      scale?: number;
      rotation?: number;
    } = {},
  ): void {
    if (this.options.preventDefault && "preventDefault" in originalEvent) {
      try { (originalEvent as Event).preventDefault(); } catch {}
    }

    // Compute center point
    let cx = 0, cy = 0;
    if (session.pointers.size > 0) {
      for (const p of session.pointers.values()) {
        cx += p.lastX;
        cy += p.lastY;
      }
      cx /= session.pointers.size;
      cy /= session.pointers.size;
    } else if ("clientX" in originalEvent) {
      cx = (originalEvent as PointerEvent).clientX;
      cy = (originalEvent as PointerEvent).clientY;
    }

    const event: GestureEvent = {
      type,
      target: session.target,
      centerX: cx,
      centerY: cy,
      deltaX: extra.deltaX ?? 0,
      deltaY: extra.deltaY ?? 0,
      velocityX: extra.velocityX ?? 0,
      velocityY: extra.velocityY ?? 0,
      scale: extra.scale,
      rotation: extra.rotation,
      pointerCount: session.pointers.size,
      startTime: session.startTime,
      duration: Date.now() - session.startTime,
      originalEvent,
    };

    this.options.onGesture(event);
  }
}

// --- Convenience: Quick Setup ---

/** Attach a gesture handler with callback map */
export function setupGestures(
  element: Element,
  handlers: Partial<Record<GestureType, (event: GestureEvent) => void>>,
  options?: GestureOptions,
): () => void {
  const handler = new GestureHandler({
    ...options,
    onGesture: (event) => {
      const fn = handlers[event.type];
      if (fn) fn(event);
    },
  });
  return handler.attach(element);
}
