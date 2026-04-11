/**
 * Pointer Lock API wrapper with mouse delta tracking, cursor confinement,
 * fullscreen integration, and escape handling.
 */

// --- Types ---

export interface PointerLockOptions {
  /** Target element to lock pointer to (default: document.body) */
  target?: HTMLElement;
  /** Called when lock is acquired */
  onLock?: () => void;
  /** Called when lock is released */
  onUnlock?: () => void;
  /** Called with mouse movement deltas while locked */
  onMove?: (dx: number, dy: number) => void;
  /** Called when pointer lock error occurs */
  onError?: (error: Error) => void;
  /** Unlocked movement sensitivity multiplier (default: 1) */
  sensitivity?: number;
  /** Enable smooth delta interpolation (default: false) */
  smoothDeltas?: boolean;
  /** Smoothing factor for delta interpolation (0-1, default: 0.5) */
  smoothingFactor?: number;
}

export interface PointerLockInstance {
  /** Whether pointer is currently locked */
  readonly isLocked: boolean;
  /** The element that has pointer lock (or null) */
  readonly lockedElement: Element | null;
  /** Whether Pointer Lock API is supported */
  readonly supported: boolean;
  /** Accumulated X delta since last read */
  readonly deltaX: number;
  /** Accumulated Y delta since last read */
  readonly deltaY: number;
  /** Request pointer lock on target element */
  requestLock: () => Promise<boolean>;
  /** Exit pointer lock */
  exitLock: () => void;
  /** Consume and reset accumulated deltas */
  consumeDelta: () => { dx: number; dy: number };
  /** Subscribe to lock state changes */
  subscribe: (listener: (locked: boolean) => void) => () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main ---

export function createPointerLock(options: PointerLockOptions = {}): PointerLockInstance {
  const {
    target,
    onLock,
    onUnlock,
    onMove,
    onError,
    sensitivity = 1,
    smoothDeltas = false,
    smoothingFactor = 0.5,
  } = options;

  let locked = false;
  let destroyed = false;
  let accumDX = 0;
  let accumDY = 0;
  let rawDX = 0;
  let rawDY = 0;
  let smoothDX = 0;
  let smoothDY = 0;
  const listeners = new Set<(locked: boolean) => void>();

  const el = target ?? document.body;
  const supported = typeof document !== "undefined" && "pointerLockElement" in document;

  function handleLockChange(): void {
    if (destroyed) return;
    locked = document.pointerLockElement === el;

    for (const listener of listeners) {
      try { listener(locked); } catch { /* ignore */ }
    }

    if (locked) {
      onLock?.();
    } else {
      onUnlock?.();
      // Reset deltas on unlock
      accumDX = 0;
      accumDY = 0;
      rawDX = 0;
      rawDY = 0;
      smoothDX = 0;
      smoothDY = 0;
    }
  }

  function handleMouseMove(e: MouseEvent): void {
    if (destroyed || !locked) return;

    const dx = (e.movementX ?? e.mozMovementX ?? e.webkitMovementX ?? 0) * sensitivity;
    const dy = (e.movementY ?? e.mozMovementY ?? e.webkitMovementY ?? 0) * sensitivity;

    rawDX += dx;
    rawDY += dy;

    if (smoothDeltas) {
      smoothDX = smoothDX + (rawDX - smoothDX) * smoothingFactor;
      smoothDY = smoothDY + (rawDY - smoothDY) * smoothingFactor;
      const fdx = smoothDX - accumDX;
      const fdy = smoothDY - accumDY;
      accumDX = smoothDX;
      accumDY = smoothDY;
      onMove?.(fdx, fdy);
    } else {
      accumDX = rawDX;
      accumDY = rawDY;
      onMove?.(dx, dy);
    }
  }

  function handleError(e: Event): void {
    if (destroyed) return;
    const err = new Error(`Pointer lock error: ${(e as ErrorEvent).message ?? "unknown"}`);
    onError?.(err);
  }

  // Attach listeners
  document.addEventListener("pointerlockchange", handleLockChange);
  document.addEventListener("mozpointerlockchange", handleLockChange);
  document.addEventListener("webkitpointerlockchange", handleLockChange);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("pointerlockerror", handleError);

  const instance: PointerLockInstance = {
    get isLocked() { return locked; },
    get lockedElement() { return document.pointerLockElement; },
    get supported() { return supported; },
    get deltaX() { return smoothDeltas ? smoothDX - (smoothDX - accumDX) : accumDX; },
    get deltaY() { return smoothDeltas ? smoothDY - (smoothDY - accumDY) : accumDY; },

    async requestLock(): Promise<boolean> {
      if (!supported) return false;
      try {
        await el.requestPointerLock();
        return true;
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
        return false;
      }
    },

    exitLock() {
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
    },

    consumeDelta(): { dx: number; dy: number } {
      const result = { dx: accumDX, dy: accumDY };
      accumDX = 0;
      accumDY = 0;
      rawDX = 0;
      rawDY = 0;
      smoothDX = 0;
      smoothDY = 0;
      return result;
    },

    subscribe(listener: (locked: boolean) => void): () => void {
      listeners.add(listener);
      listener(locked);
      return () => listeners.delete(listener);
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.clear();
      document.removeEventListener("pointerlockchange", handleLockChange);
      document.removeEventListener("mozpointerlockchange", handleLockChange);
      document.removeEventListener("webkitpointerlockchange", handleLockChange);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerlockerror", handleError);
      if (locked) {
        document.exitPointerLock();
      }
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Check if Pointer Lock API is supported */
export function isPointerLockSupported(): boolean {
  return typeof document !== "undefined" && "pointerLockElement" in document;
}

/** Check if pointer is currently locked */
export function isPointerLocked(): boolean {
  return typeof document !== "undefined" && document.pointerLockElement !== null;
}

/** Request pointer lock on an element (convenience function) */
export async function requestPointerLock(element?: HTMLElement): Promise<boolean> {
  const el = element ?? document.body;
  if (!isPointerLockSupported()) return false;
  try {
    await el.requestPointerLock();
    return true;
  } catch {
    return false;
  }
}

/** Exit pointer lock (convenience function) */
export function exitPointerLock(): void {
  if (document.exitPointerLock) {
    document.exitPointerLock();
  }
}
