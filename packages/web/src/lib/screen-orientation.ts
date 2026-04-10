/**
 * Screen Orientation: Screen Orientation API wrapper with lock/unlock,
 * orientation change events, type detection, responsive design helpers,
 * media query integration, and cross-browser compatibility.
 */

// --- Types ---

export type OrientationType =
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape-primary"
  | "landscape-secondary"
  | "portrait"
  | "landscape"
  | "any";

export type OrientationLockType =
  | "any"
  | "natural"
  | "landscape"
  | "portrait"
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape-primary"
  | "landscape-secondary";

export interface OrientationState {
  /** Current orientation type */
  type: OrientationType;
  /** Angle in degrees (0, 90, 180, 270) */
  angle: number;
  /** Whether currently locked */
  locked: boolean;
  /** Lock type if locked */
  lockType?: OrientationLockType;
}

export interface ScreenOrientationOptions {
  /** Callback on orientation change */
  onChange?: (state: OrientationState) => void;
  /** Auto-unlock on destroy? (default: true) */
  autoUnlock?: boolean;
  /** Default fallback behavior when API unavailable */
  fallbackBehavior?: "css-only" | "ignore";
}

export interface ScreenOrientationInstance {
  /** Get current orientation state */
  getState: () => OrientationState;
  /** Current orientation type (shorthand) */
  getType: () => OrientationType;
  /** Current angle in degrees (shorthand) */
  getAngle: () => number;
  /** Check if currently in portrait mode */
  isPortrait: () => boolean;
  /** Check if currently in landscape mode */
  isLandscape: () => boolean;
  /** Lock to a specific orientation */
  lock: (type: OrientationLockType) => Promise<void>;
  /** Unlock orientation */
  unlock: () => void;
  /** Check if locking is supported */
  canLock: () => boolean;
  /** Subscribe to orientation changes */
  subscribe: (callback: (state: OrientationState) => void) => () => void;
  /** Toggle between portrait and landscape */
  toggle: () => Promise<void>;
  /** Match media query for orientation */
  matchMedia: (query: string) => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function readOrientation(): OrientationState {
  const screen = typeof screen !== "undefined" ? (screen as unknown as { orientation?: { type: string; angle: number } }) : undefined;

  return {
    type: (screen?.orientation?.type ?? inferOrientation()) as OrientationType,
    angle: screen?.orientation?.angle ?? inferAngle(),
    locked: false,
  };
}

function inferOrientation(): string {
  if (typeof window === "undefined") return "portrait";
  return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
}

function inferAngle(): number {
  if (typeof window === "undefined") return 0;

  // Try screen.orientation.angle first
  const screenObj = screen as unknown as { orientation?: { angle: number } };
  if (screenObj?.orientation?.angle != null) {
    return screenObj.orientation.angle;
  }

  // Fallback based on window dimensions
  const h = window.innerHeight;
  const w = window.innerWidth;
  if (h > w) return 0;   // portrait
  if (w > h) return 90;  // landscape
  return 0;
}

// --- Main Class ---

export class ScreenOrientationManager {
  create(options: ScreenOrientationOptions = {}): ScreenOrientationInstance {
    let destroyed = false;
    let currentState = readOrientation();
    let currentLockType: OrientationLockType | undefined;
    const subscribers = new Set<(state: OrientationState) => void>();
    let changeListener: ((this: ScreenOrientation, ev: Event) => void) | null = null;
    let resizeListener: (() => void) | null = null;
    const autoUnlock = options.autoUnlock ?? true;

    function notifyChange(state: OrientationState): void {
      currentState = state;
      options.onChange?.(state);
      for (const cb of subscribers) cb(state);
    }

    // Set up native listener
    function setupListeners(): void {
      const scr = screen as unknown as {
        orientation?: EventTarget & { type: string; angle: number; unlock?: () => void };
      };

      if (scr?.orientation && typeof scr.orientation.addEventListener === "function") {
        changeListener = (): void => {
          if (destroyed) return;
          const state: OrientationState = {
            type: scr.orientation!.type as OrientationType,
            angle: scr.orientation!.angle,
            locked: !!currentLockType,
            lockType: currentLockType,
          };
          notifyChange(state);
        };
        scr.orientation.addEventListener("change", changeListener);
      } else {
        // Fallback: use window resize
        resizeListener = (): void => {
          if (destroyed) return;
          const newState = readOrientation();
          newState.locked = !!currentLockType;
          newState.lockType = currentLockType;
          if (newState.type !== currentState.type || newState.angle !== currentState.angle) {
            notifyChange(newState);
          }
        };
        window.addEventListener("resize", resizeListener);
      }
    }

    setupListeners();

    async function doLock(type: OrientationLockType): Promise<void> {
      if (destroyed) throw new Error("Manager destroyed");

      const scr = screen as unknown as {
        orientation?: { lock: (type: string) => Promise<void>; unlock?: () => void };
      };

      if (!scr?.orientation || typeof scr.orientation.lock !== "function") {
        throw new Error("Screen orientation lock is not supported on this device/browser");
      }

      try {
        await scr.orientation.lock(type);
        currentLockType = type;
        currentState = { ...currentState, locked: true, lockType: type };
        notifyChange(currentState);
      } catch (err) {
        throw new Error(
          `Failed to lock orientation to "${type}": ${err instanceof Error ? err.message : String(err)}. Note: Orientation lock requires secure context (HTTPS) and user gesture.`,
        );
      }
    }

    function doUnlock(): void {
      const scr = screen as unknown as {
        orientation?: { unlock?: () => void };
      };

      if (scr?.orientation && typeof scr.orientation.unlock === "function") {
        try {
          scr.orientation.unlock();
        } catch { /* ignore */ }
      }
      currentLockType = undefined;
      currentState = { ...currentState, locked: false, lockType: undefined };
      notifyChange(currentState);
    }

    const instance: ScreenOrientationInstance = {

      getState(): OrientationState {
        return { ...currentState };
      },

      getType(): OrientationType {
        return currentState.type;
      },

      getAngle(): number {
        return currentState.angle;
      },

      isPortrait(): boolean {
        return currentState.type.startsWith("portrait");
      },

      isLandscape(): boolean {
        return currentState.type.startsWith("landscape");
      },

      lock: doLock,

      unlock: doUnlock,

      canLock(): boolean {
        const scr = screen as unknown as {
          orientation?: { lock: (type: string) => Promise<void> };
        };
        return !!(scr?.orientation && typeof scr.orientation.lock === "function");
      },

      subscribe(callback): () => void {
        subscribers.add(callback);
        callback(currentState); // Immediate call with current state
        return () => { subscribers.delete(callback); };
      },

      async toggle(): Promise<void> {
        if (instance.isPortrait()) {
          await instance.lock("landscape");
        } else {
          await instance.lock("portrait");
        }
      },

      matchMedia(query: string): boolean {
        if (typeof window === "undefined") return false;
        const mql = window.matchMedia(query);
        return mql.matches;
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;

        const scr = screen as unknown as {
          orientation?: EventTarget;
        };

        if (changeListener && scr?.orientation) {
          scr.orientation.removeEventListener("change", changeListener);
        }
        if (resizeListener) {
          window.removeEventListener("resize", resizeListener);
        }

        if (autoUnlock && currentLockType) {
          doUnlock();
        }

        subscribers.clear();
      },
    };

    return instance;
  }
}

/** Convenience: create a screen orientation manager */
export function createScreenOrientation(options?: ScreenOrientationOptions): ScreenOrientationInstance {
  return new ScreenOrientationManager().create(options);
}

// --- Standalone utilities ---

/** Quick check: are we in portrait mode? */
export function isPortraitMode(): boolean {
  return readOrientation().type.startsWith("portrait");
}

/** Quick check: are we in landscape mode? */
export function isLandscapeMode(): boolean {
  return readOrientation().type.startsWith("landscape");
}

/** Lock screen orientation (one-shot, no manager needed) */
export async function lockOrientation(type: OrientationLockType): Promise<void> {
  const scr = screen as unknown as {
    orientation?: { lock: (t: string) => Promise<void> };
  };
  if (!scr?.orientation) throw new Error("Screen Orientation API not available");
  await scr.orientation.lock(type);
}

/** Unlock screen orientation (one-shot) */
export function unlockOrientation(): void {
  const scr = screen as unknown as {
    orientation?: { unlock?: () => void };
  };
  scr?.orientation?.unlock?.();
}
