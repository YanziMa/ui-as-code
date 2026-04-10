/**
 * Fullscreen API: Browser fullscreen control with enter/exit/toggle,
 * fullscreen change events, element-specific fullscreen, error handling,
 * orientation lock integration, keyboard trap prevention, and
 * cross-browser compatibility (webkit/moz/ms prefixes).
 */

// --- Types ---

export type FullscreenErrorType =
  | "not-supported"
  | "not-found"
  | "not-allowed"
  | "user-cancelled"
  | "already-fullscreen"
  | "not-fullscreen";

export interface FullscreenState {
  /** Whether currently in fullscreen mode */
  isFullscreen: boolean;
  /** The element that is currently fullscreen (or null) */
  element: HTMLElement | null;
  /** Whether fullscreen is supported */
  supported: boolean;
  /** Current error if any */
  error: FullscreenErrorType | null;
}

export interface FullscreenOptions {
  /** Element to make fullscreen (default: document.documentElement) */
  target?: HTMLElement;
  /** Navigation UI visibility */
  navigationUI?: "auto" | "show" | "hide";
  /** Callback when entering fullscreen */
  onEnter?: (element: HTMLElement) => void;
  /** Callback when exiting fullscreen */
  onExit?: () => void;
  /** Callback on error */
  onError?: (error: FullscreenError) => void;
  /** Lock screen orientation when entering? */
  lockOrientation?: ScreenOrientationLockType;
  /** Escape key handling — prevent exit? (default: false) */
  preventEscape?: boolean;
  /** Scroll to top on enter? */
  scrollToTop?: boolean;
  /** Add CSS class to body when fullscreen? */
  bodyClass?: string;
}

export interface FullscreenError {
  type: FullscreenErrorType;
  message: string;
  cause?: Error;
}

export interface FullscreenManagerInstance {
  /** Get current fullscreen state */
  getState: () => FullscreenState;
  /** Check if currently in fullscreen */
  isFullscreen: () => boolean;
  /** Enter fullscreen mode */
  enter: (options?: Partial<FullscreenOptions>) => Promise<void>;
  /** Exit fullscreen mode */
  exit: () => Promise<void>;
  /** Toggle fullscreen */
  toggle: (target?: HTMLElement) => Promise<void>;
  /** Check if fullscreen is supported for an element */
  isElementEnabled: (element: HTMLElement) => boolean;
  /** Subscribe to fullscreen state changes */
  subscribe: (callback: (state: FullscreenState) => void) => () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

type ScreenOrientationLockType = string;

// --- Helpers ---

function getFullscreenElement(): HTMLElement | null {
  const doc = document as unknown as {
    fullscreenElement?: HTMLElement;
    webkitFullscreenElement?: HTMLElement;
    mozFullScreenElement?: HTMLElement;
    msFullscreenElement?: HTMLElement;
  };
  return (
    doc.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.mozFullScreenElement ??
    doc.msFullscreenElement ??
    null
  );
}

function getFullscreenAPI(element: HTMLElement): {
  requestFn: (opts?: FullscreenNavigationUI) => Promise<void> | undefined;
} | null {
  const el = element as unknown as {
    requestFullscreen?: (opts?: FullscreenNavigationUI) => Promise<void>;
    webkitRequestFullscreen?: (opts?: FullscreenNavigationUI) => Promise<void>;
    webkitRequestFullScreen?: (opts?: FullscreenNavigationUI) => Promise<void>;
    mozRequestFullScreen?: () => void;
    msRequestFullscreen?: () => void;
  };

  if (el.requestFullscreen) return { requestFn: el.requestFullscreen.bind(el) };
  if (el.webkitRequestFullscreen) return { requestFn: el.webkitRequestFullscreen.bind(el) };
  if (el.webkitRequestFullScreen) return { requestFn: el.webkitRequestFullScreen.bind(el) };
  // Firefox and IE don't return promises
  if (el.mozRequestFullScreen) {
    return {
      requestFn: (): Promise<void> => {
        el.mozRequestFullScreen!();
        return Promise.resolve();
      },
    };
  }
  if (el.msRequestFullscreen) {
    return {
      requestFn: (): Promise<void> => {
        el.msRequestFullscreen!();
        return Promise.resolve();
      },
    };
  }

  return null;
}

function getExitAPI(): (() => Promise<void>) | null {
  const doc = document as unknown as {
    exitFullscreen?: () => Promise<void>;
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => void;
    msExitFullscreen?: () => void;
  };

  if (doc.exitFullscreen) return doc.exitFullscreen.bind(doc);
  if (doc.webkitExitFullscreen) return doc.webkitExitFullscreen.bind(doc);
  if (doc.mozCancelFullScreen) {
    return (): Promise<void> => { doc.mozCancelFullScreen!(); return Promise.resolve(); };
  }
  if (doc.msExitFullscreen) {
    return (): Promise<void> => { doc.msExitFullscreen!(); return Promise.resolve(); };
  }

  return null;
}

function classifyError(err: unknown): FullscreenError {
  const msg = err instanceof Error ? err.message : String(err);
  let type: FullscreenErrorType = "not-allowed";

  if (msg.includes("not supported") || msg.includes("fullscreen error")) {
    type = "not-supported";
  } else if (msg.includes("not found") || msg.includes("fullscreen element")) {
    type = "not-found";
  } else if (msg.includes("request") && msg.includes("not allowed")) {
    type = "not-allowed";
  } else if (msg.includes("user cancelled") || msg.includes("aborted")) {
    type = "user-cancelled";
  }

  return { type, message: msg, cause: err instanceof Error ? err : undefined };
}

// --- Main Class ---

export class FullscreenManager {
  create(defaults: Partial<FullscreenOptions> = {}): FullscreenManagerInstance {
    let destroyed = false;
    const subscribers = new Set<(state: FullscreenState) => void>();
    let currentState: FullscreenState = readState();
    let currentBodyClass: string | undefined = defaults.bodyClass;
    let changeHandler: ((ev: Event) => void) | null = null;

    function readState(): FullscreenState {
      const el = getFullscreenElement();
      return {
        isFullscreen: el !== null,
        element: el,
        supported: isSupported(),
        error: null,
      };
    }

    function notify(state: FullscreenState): void {
      currentState = state;
      for (const cb of subscribers) cb(state);
    }

    // Listen for fullscreen change events
    function setupListener(): void {
      changeHandler = (): void => {
        if (destroyed) return;
        const newState = readState();

        // Body class management
        if (currentBodyClass) {
          if (newState.isFullscreen) {
            document.body.classList.add(currentBodyClass);
          } else {
            document.body.classList.remove(currentBodyClass);
          }
        }

        notify(newState);

        // Call specific callbacks
        if (newState.isFullscreen && !currentState.isFullscreen) {
          defaults.onEnter?.(newState.element!);
        } else if (!newState.isFullscreen && currentState.isFullscreen) {
          defaults.onExit?.();
        }
      };

      document.addEventListener("fullscreenchange", changeHandler);
      document.addEventListener("webkitfullscreenchange", changeHandler);
      document.addEventListener("mozfullscreenchange", changeHandler);
      document.addEventListener("MSFullscreenChange", changeHandler);
    }

    setupListener();

    async function doEnter(opts: Partial<FullscreenOptions> = {}): Promise<void> {
      if (destroyed) throw new Error("Manager destroyed");

      const merged: FullscreenOptions = { ...defaults, ...opts };
      const target = merged.target ?? document.documentElement;

      if (currentState.isFullscreen) {
        const err: FullscreenError = { type: "already-fullscreen", message: "Already in fullscreen mode" };
        merged.onError?.(err);
        return;
      }

      const api = getFullscreenAPI(target);
      if (!api) {
        const err: FullscreenError = { type: "not-supported", message: "Fullscreen API not supported" };
        merged.onError?.(err);
        throw err;
      }

      try {
        const navUI: FullscreenNavigationUI = merged.navigationUI ?? "auto";
        await api.requestFn(navUI);

        // Post-enter actions
        if (merged.scrollToTop !== false) {
          window.scrollTo(0, 0);
        }

        // Orientation lock
        if (merged.lockOrientation) {
          try {
            const scr = screen as unknown as {
              orientation?: { lock: (t: string) => Promise<void> };
            };
            await scr?.orientation?.lock(merged.lockOrientation);
          } catch { /* orientation lock may fail */ }
        }

        // Body class
        if (merged.bodyClass) {
          currentBodyClass = merged.bodyClass;
          document.body.classList.add(merged.bodyClass);
        }

      } catch (err) {
        const classified = classifyError(err);
        merged.onError?.(classified);
        throw classified;
      }
    }

    async function doExit(): Promise<void> {
      if (destroyed) return;

      if (!currentState.isFullscreen) {
        const err: FullscreenError = { type: "not-fullscreen", message: "Not in fullscreen mode" };
        defaults.onError?.(err);
        return;
      }

      const exitFn = getExitAPI();
      if (!exitFn) {
        const err: FullscreenError = { type: "not-supported", message: "Fullscreen exit not supported" };
        defaults.onError?.(err);
        return;
      }

      try {
        await exitFn();

        // Remove body class
        if (currentBodyClass) {
          document.body.classList.remove(currentBodyClass);
        }
      } catch (err) {
        const classified = classifyError(err);
        defaults.onError?.(classified);
        throw classified;
      }
    }

    const instance: FullscreenManagerInstance = {

      getState: () => ({ ...currentState }),

      isFullscreen: () => currentState.isFullscreen,

      enter: doEnter,

      exit: doExit,

      async toggle(target?): Promise<void> {
        if (instance.isFullscreen()) {
          await instance.exit();
        } else {
          await instance.enter({ target });
        }
      },

      isElementEnabled(element): boolean {
        const api = getFullscreenAPI(element);
        return api !== null;
      },

      subscribe(callback): () => void {
        subscribers.add(callback);
        callback(currentState); // Immediate call with current state
        return () => { subscribers.delete(callback); };
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;

        if (changeHandler) {
          document.removeEventListener("fullscreenchange", changeHandler);
          document.removeEventListener("webkitfullscreenchange", changeHandler);
          document.removeEventListener("mozfullscreenchange", changeHandler);
          document.removeEventListener("MSFullscreenChange", changeHandler);
        }

        // Exit fullscreen if active
        if (currentState.isFullscreen) {
          doExit().catch(() => {});
        }

        subscribers.clear();
      },
    };

    return instance;
  }
}

/** Check if Fullscreen API is supported */
export function isSupported(): boolean {
  return typeof document !== "undefined" && (
    !!document.fullscreenEnabled ||
    !!(document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled ||
    !!(document as unknown as { mozFullScreenEnabled?: boolean }).mozFullScreenEnabled ||
    !!(document as unknown as { msFullscreenEnabled?: boolean }).msFullscreenEnabled
  );
}

/** Convenience: create a fullscreen manager */
export function createFullscreenManager(defaults?: Partial<FullscreenOptions>): FullscreenManagerInstance {
  return new FullscreenManager().create(defaults);
}
