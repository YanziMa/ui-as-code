/**
 * Gesture Recognition: Swipe, pinch, tap, long-press, double-tap detection
 * with velocity tracking, threshold configuration, pointer abstraction,
 * and passive event handling.
 */

// --- Types ---

export type GestureType =
  | "tap"
  | "double-tap"
  | "long-press"
  | "swipe"
  | "pinch"
  | "pan";

export type SwipeDirection = "up" | "down" | "left" | "right";

export interface Point {
  x: number;
  y: number;
}

export interface GestureConfig {
  /** Element or selector to attach gesture recognition */
  element: HTMLElement | string;
  /** Enable specific gestures */
  gestures?: Partial<Record<GestureType, boolean | GestureHandlerConfig>>;
  /** Global config applied to all enabled gestures */
  swipeThreshold?: number;       // px (default: 30)
  swipeVelocityThreshold?: number; // px/ms (default: 0.3)
  tapThreshold?: number;         // ms (default: 200) - max duration for a tap
  longPressDelay?: number;       // ms (default: 500)
  doubleTapGap?: number;         // ms between taps (default: 300)
  pinchThreshold?: number;       // scale change (default: 0.05)
  panThreshold?: number;         // px before pan starts (default: 8)
  /** Prevent default browser behavior (touch actions, etc.) */
  preventDefault?: boolean;
  /** Stop propagation of gesture events */
  stopPropagation?: boolean;
  /** Use passive event listeners where possible */
  passive?: boolean;
}

export interface GestureHandlerConfig {
  /** Handler callback */
  handler: (gesture: GestureEvent) => void;
  /** Threshold override for this specific gesture */
  threshold?: number;
  /** Enabled? */
  enabled?: boolean;
}

export interface GestureEvent {
  type: GestureType;
  /** Starting point */
  startPoint: Point;
  /** Current/ending point */
  point: Point;
  /** Delta from start */
  delta: Point;
  /** Velocity (px/ms) */
  velocity: { x: number; y: number };
  /** For swipe: direction */
  direction?: SwipeDirection;
  /** For pinch: scale (ratio of distances) */
  scale?: number;
  /** For pinch: center point */
  center?: Point;
  /** Duration of gesture (ms) */
  duration: number;
  /** Number of touches */
  touches: number;
  /** Original DOM event */
  originalEvent: PointerEvent | TouchEvent;
  /** Timestamp */
  timestamp: number;
}

export interface GestureInstance {
  element: HTMLElement;
  /** Destroy and remove all listeners */
  destroy: () => void;
  /** Dynamically enable/disable a gesture type */
  setGestureEnabled(type: GestureType, enabled: boolean): void;
  /** Update config */
  updateConfig: (config: Partial<GestureConfig>) => void;
}

// --- Internal State ---

interface PointerState {
  pointers: Map<number, Point>;
  startTime: number;
  startPoint: Point;
  prevPoint: Point;
  prevTime: number;
  startDistance: number;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  tapCount: number;
  lastTapTime: number;
  isPanning: boolean;
  isLongPressTriggered: boolean;
}

// --- Helpers ---

function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function velocity(a: Point, b: Point, dt: number): { x: number; y: number } {
  if (dt <= 0) return { x: 0, y: 0 };
  return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
}

function resolveElement(el: HTMLElement | string): HTMLElement | null {
  return typeof el === "string" ? document.querySelector(el) : el;
}

// --- Main Class ---

export class GestureManager {
  create(config: GestureConfig): GestureInstance {
    const element = resolveElement(config.element);
    if (!element) throw new Error("Gesture: element not found");

    const cfg = {
      swipeThreshold: config.swipeThreshold ?? 30,
      swipeVelocityThreshold: config.swipeVelocityThreshold ?? 0.3,
      tapThreshold: config.tapThreshold ?? 200,
      longPressDelay: config.longPressDelay ?? 500,
      doubleTapGap: config.doubleTapGap ?? 300,
      pinchThreshold: config.pinchThreshold ?? 0.05,
      panThreshold: config.panThreshold ?? 8,
      preventDefault: config.preventDefault ?? true,
      stopPropagation: config.stopPropagation ?? false,
      passive: config.passive ?? true,
      ...config,
    };

    const state: PointerState = {
      pointers: new Map(),
      startTime: 0,
      startPoint: { x: 0, y: 0 },
      prevPoint: { x: 0, y: 0 },
      prevTime: 0,
      startDistance: 0,
      longPressTimer: null,
      tapCount: 0,
      lastTapTime: 0,
      isPanning: false,
      isLongPressTriggered: false,
    };

    let destroyed = false;

    function getCenterPoint(): Point {
      if (state.pointers.size === 1) {
        const [p] = state.pointers.values();
        return p!;
      }
      // For multi-touch, use centroid
      let sumX = 0, sumY = 0;
      for (const p of state.pointers.values()) {
        sumX += p.x;
        sumY += p.y;
      }
      return { x: sumX / state.pointers.size, y: sumY / state.pointers.size };
    }

    function getCurrentPoint(e: PointerEvent | TouchEvent): Point {
      if ("clientX" in e) {
        return { x: e.clientX, y: e.clientY };
      }
      const touch = (e as TouchEvent).touches[0];
      return touch ? { x: touch.clientX, y: touch.clientY } : state.prevPoint;
    }

    function makeGestureEvent(
      type: GestureType,
      point: Point,
      e: PointerEvent | TouchEvent,
    ): GestureEvent {
      const now = Date.now();
      const center = getCenterPoint();
      return {
        type,
        startPoint: state.startPoint,
        point,
        delta: { x: point.x - state.startPoint.x, y: point.y - state.startPoint.y },
        velocity: velocity(state.prevPoint, point, now - state.prevTime),
        center,
        duration: now - state.startTime,
        touches: state.pointers.size,
        originalEvent: e,
        timestamp: now,
      };
    }

    function dispatch(type: GestureType, point: Point, e: PointerEvent | TouchEvent): void {
      const gestureCfg = cfg.gestures?.[type];
      if (gestureCfg === false) return; // explicitly disabled

      if (typeof gestureCfg === "object" && !gestureCfg.enabled) return;

      const evt = makeGestureEvent(type, point, e);

      // Type-specific processing
      if (type === "swipe") {
        const dx = evt.delta.x;
        const dy = evt.delta.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (Math.max(absDx, absDy) < cfg.swipeThreshold) return;

        const vel = Math.sqrt(evt.velocity.x ** 2 + evt.velocity.y ** 2);
        if (vel < cfg.swipeVelocityThreshold) return;

        if (absDx > absDy) {
          evt.direction = dx > 0 ? "right" : "left";
        } else {
          evt.direction = dy > 0 ? "down" : "up";
        }
      }

      if (type === "pinch" && state.pointers.size >= 2) {
        const pts = Array.from(state.pointers.values());
        const currentDist = distance(pts[0]!, pts[1]!);
        evt.scale = currentDist / state.startDistance;
        evt.center = midpoint(pts[0]!, pts[1]!);

        if (Math.abs(evt.scale - 1) < cfg.pinchThreshold) return;
      }

      // Call handler
      if (typeof gestureCfg === "object" && gestureCfg.handler) {
        gestureCfg.handler(evt);
      }
    }

    function handlePointerDown(e: PointerEvent): void {
      if (destroyed) return;
      if (cfg.preventDefault) e.preventDefault();
      if (cfg.stopPropagation) e.stopPropagation();

      const point = { x: e.clientX, y: e.clientY };
      state.pointers.set(e.pointerId, point);

      if (state.pointers.size === 1) {
        // First touch down
        state.startTime = Date.now();
        state.startPoint = point;
        state.prevPoint = point;
        state.prevTime = Date.now();
        state.isPanning = false;
        state.isLongPressTriggered = false;

        // Start long press timer
        if (cfg.gestures?.["long-press"] !== false) {
          state.longPressTimer = setTimeout(() => {
            state.isLongPressTriggered = true;
            dispatch("long-press", point, e);
          }, cfg.longPressDelay);
        }

        // Clear double-tap window check
        const now = Date.now();
        if (now - state.lastTapTime < cfg.doubleTapGap) {
          state.tapCount++;
        } else {
          state.tapCount = 1;
        }
      } else if (state.pointers.size === 2) {
        // Second touch - record for pinch
        const pts = Array.from(state.pointers.values());
        state.startDistance = distance(pts[0]!, pts[1]!);
      }

      element.setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: PointerEvent): void {
      if (destroyed || state.pointers.size === 0) return;

      const point = { x: e.clientX, y: e.clientY };
      state.pointers.set(e.pointerId, point);

      const now = Date.now();
      const dt = now - state.prevTime;

      // Cancel long press if moved too much
      if (state.longPressTimer && !state.isLongPressTriggered) {
        const moved = distance(point, state.startPoint);
        if (moved > 10) {
          clearTimeout(state.longPressTimer);
          state.longPressTimer = null;
        }
      }

      // Pan detection
      if (!state.isPanning && state.pointers.size === 1) {
        const moved = distance(point, state.startPoint);
        if (moved >= cfg.panThreshold) {
          state.isPanning = true;
          dispatch("pan", point, e);
        }
      } else if (state.isPanning) {
        dispatch("pan", point, e);
      }

      // Pinch detection
      if (state.pointers.size >= 2) {
        dispatch("pinch", point, e);
      }

      state.prevPoint = point;
      state.prevTime = now;
    }

    function handlePointerUp(e: PointerEvent): void {
      if (destroyed) return;

      const hadPointer = state.pointers.has(e.pointerId);
      state.pointers.delete(e.pointerId);

      if (!hadPointer) return;

      // Cancel long press timer
      if (state.longPressTimer) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
      }

      if (state.pointers.size === 0) {
        // All pointers up - finalize gesture
        const now = Date.now();
        const totalDuration = now - state.startTime;
        const point = state.prevPoint;
        const moved = distance(point, state.startPoint);

        if (state.isLongPressTriggered) {
          // Long press already dispatched
        } else if (moved < 10 && totalDuration < cfg.tapThreshold) {
          // It's a tap!
          if (state.tapCount === 2 && (now - state.lastTapTime) < cfg.doubleTapGap * 2) {
            dispatch("double-tap", point, e);
          } else {
            dispatch("tap", point, e);
          }
          state.lastTapTime = now;
        } else if (moved >= cfg.swipeThreshold) {
          // It might be a swipe
          dispatch("swipe", point, e);
        }

        state.isPanning = false;
        state.isLongPressTriggered = false;
      }

      try { element.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }

    // Attach listeners
    element.addEventListener("pointerdown", handlePointerDown);
    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerup", handlePointerUp);
    element.addEventListener("pointercancel", handlePointerUp);

    // Prevent context menu on long press
    element.addEventListener("contextmenu", (e: Event) => {
      if (cfg.gestures?.["long-press"]) e.preventDefault();
    });

    const instance: GestureInstance = {
      element,

      destroy() {
        if (destroyed) return;
        destroyed = true;
        element.removeEventListener("pointerdown", handlePointerDown);
        element.removeEventListener("pointermove", handlePointerMove);
        element.removeEventListener("pointerup", handlePointerUp);
        element.removeEventListener("pointercancel", handlePointerUp);
        if (state.longPressTimer) clearTimeout(state.longPressTimer);
      },

      setGestureEnabled(type: GestureType, enabled: boolean) {
        if (!cfg.gestures) cfg.gestures = {};
        if (enabled) {
          cfg.gestures[type] = { handler: () => {}, enabled: true };
        } else {
          cfg.gestures[type] = false;
        }
      },

      updateConfig(newCfg: Partial<GestureConfig>) {
        Object.assign(cfg, newCfg);
      },
    };

    return instance;
  }
}

/** Convenience: create a gesture recognizer */
export function createGesture(config: GestureConfig): GestureInstance {
  return new GestureManager().create(config);
}

// --- Pre-built gesture configs ---

/** Common swipe gestures for mobile navigation */
export const swipeGestures: Record<SwipeDirection, GestureHandlerConfig> = {
  left:  { handler: () => {} },   // replace handler
  right: { handler: () => {} },
  up:    { handler: () => {} },
  down:  { handler: () => {} },
};

/** Common tap gesture */
export const tapGesture: GestureHandlerConfig = {
  handler: () => {},
};
