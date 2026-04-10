/**
 * Fullscreen API wrapper with cross-browser support, element-level fullscreen,
 * fullscreen change detection, orientation lock, and escape handling.
 */

// --- Types ---

export type FullscreenElement = HTMLElement | null;

export interface FullscreenOptions {
  /** Target element (default: document.documentElement) */
  target?: HTMLElement | string;
  /** Callback when entering fullscreen */
  onEnter?: () => void;
  /** Callback when exiting fullscreen */
  onExit?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Navigation UI visibility (default: "hide") */
  navigationUI?: "show" | "hide" | "auto";
  /** Lock screen orientation on enter? */
  lockOrientation?: OrientationLockType | false;
}

export interface FullscreenInstance {
  /** Current fullscreen element (or null) */
  getElement: () => FullscreenElement;
  /** Check if currently in fullscreen mode */
  isFullscreen: () => boolean;
  /** Request fullscreen for the target element */
  enter: () => Promise<void>;
  /** Exit fullscreen */
  exit: () => Promise<void;
  /** Toggle fullscreen */
  toggle: () => Promise<void>;
  /** Destroy and cleanup listeners */
  destroy: () => void;
}

type OrientationLockType =
  | "any"
  | "landscape"
  | "portrait"
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape-primary"
  | "landscape-secondary";

// --- Browser API Helpers ---

const PREFIXES = ["", "webkit", "moz", "ms"] as const;

function getApi<T>(names: string[]): T | undefined {
  const doc = typeof document !== "undefined" ? document : undefined;
  if (!doc) return undefined;

  for (const prefix of PREFIXES) {
    for (const name of names) {
      const key = prefix
        ? `${prefix}${name.charAt(0).toUpperCase()}${name.slice(1)}`
        : name;
      if ((doc as any)[key] !== undefined) return (doc as any)[key];
    }
  }
  return undefined;
}

function getFn<T extends (...args: any[]) => any>(
  el: HTMLElement,
  names: string[],
): T | undefined {
  for (const prefix of PREFIXES) {
    for (const name of names) {
      const key = prefix
        ? `${prefix}${name.charAt(0).toUpperCase()}${name.slice(1)}`
        : name;
      if (typeof (el as any)[key] === "function") return (el as any)[key];
    }
  }
  return undefined;
}

// --- Main Factory ---

export function createFullscreen(options: FullscreenOptions = {}): FullscreenInstance {
  const opts = {
    navigationUI: options.navigationUI ?? "hide",
    lockOrientation: options.lockOrientation ?? false,
    ...options,
  };

  let targetEl: HTMLElement | null = null;

  if (typeof options.target === "string") {
    targetEl = document.querySelector<HTMLElement>(options.target);
  } else if (options.target instanceof HTMLElement) {
    targetEl = options.target;
  } else {
    targetEl = document.documentElement;
  }

  if (!targetEl) throw new Error("Fullscreen: target element not found");

  let destroyed = false;

  // Resolve the actual requestFullscreen method
  const requestFn = getFn<() => Promise<void>>(targetEl, [
    "requestFullscreen",
    "webkitRequestFullscreen",
    "mozRequestFullScreen",
    "msRequestFullscreen",
  ]);

  // Resolve exitFullscreen
  const exitFn = getFn<() => Promise<void>>(document as unknown as HTMLElement, [
    "exitFullscreen",
    "webkitExitFullscreen",
    "mozCancelFullScreen",
    "msExitFullscreen",
  ]);

  // Resolve fullscreenElement getter
  const fullScreenElGetter = getApi<() => Element | null>([
    "fullscreenElement",
    "webkitFullscreenElement",
    "mozFullScreenElement",
    "msFullscreenElement",
  ]);

  // Event names
  const CHANGE_EVENT =
    ("onfullscreenchange" in document)
      ? "fullscreenchange"
      : "onwebkitfullscreenchange" in document
        ? "webkitfullscreenchange"
        : "onmozfullscreenchange" in document
          ? "mozfullscreenchange"
          : "MSFullscreenChange";

  const ERROR_EVENT =
    ("onfullscreenerror" in document)
      ? "fullscreenerror"
      : "onwebkitfullscreenerror" in document
        ? "webkitfullscreenerror"
        : "mozfullscreenerror";

  // --- Handlers ---

  function handleChange(): void {
    if (destroyed) return;
    if (isFullscreen()) {
      opts.onEnter?.();
      // Lock orientation if requested
      if (opts.lockOrientation && typeof (screen as any)?.lockOrientation === "function") {
        try {
          (screen as any).lockOrientation(opts.lockOrientation);
        } catch {
          // Orientation lock may fail silently
        }
      }
    } else {
      opts.onExit?.();
      // Unlock orientation
      if ((screen as any)?.unlockOrientation) {
        try { (screen as any).unlockOrientation(); } catch {}
      }
    }
  }

  function handleError(e: Event): void {
    opts.onError?.(new Error(`Fullscreen request failed: ${(e as any).message ?? "unknown error"}`));
  }

  // Attach listeners
  document.addEventListener(CHANGE_EVENT, handleChange);
  document.addEventListener(ERROR_EVENT, handleError);

  const instance: FullscreenInstance = {

    getElement(): FullscreenElement {
      const el = fullScreenElGetter?.();
      return el instanceof HTMLElement ? el : null;
    },

    isFullscreen(): boolean {
      return instance.getElement() !== null;
    },

    async enter(): Promise<void> {
      if (destroyed || !requestFn) {
        throw new Error("Fullscreen API is not supported");
      }

      try {
        await requestFn.call(targetEl!, {
          navigationUI: opts.navigationUI,
        });
      } catch (err) {
        opts.onError?.(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },

    async exit(): Promise<void> {
      if (!instance.isFullscreen()) return;
      if (!exitFn) {
        throw new Error("Fullscreen exit API is not supported");
      }
      try {
        await exitFn.call(document);
      } catch (err) {
        opts.onError?.(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },

    async toggle(): Promise<void> {
      if (instance.isFullscreen()) {
        await instance.exit();
      } else {
        await instance.enter();
      }
    },

    destroy() {
      destroyed = true;
      document.removeEventListener(CHANGE_EVENT, handleChange);
      document.removeEventListener(ERROR_EVENT, handleError);
    },
  };

  return instance;
}
