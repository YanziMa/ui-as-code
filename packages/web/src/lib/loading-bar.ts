/**
 * Loading Bar / Progress Bar: Top-of-page loading indicator (like NProgress/YouTube)
 * with smooth animation, color variants, manual/automatic control,
 * increment steps, trickle simulation, and easing.
 */

// --- Types ---

export type LoadingBarColor = "blue" | "green" | "red" | "purple" | "orange" | string;

export interface LoadingBarOptions {
  /** Container element (default: document.body) */
  parent?: HTMLElement;
  /** Color of the bar */
  color?: LoadingBarColor;
  /** Height in px (default: 3) */
  height?: number;
  /** Z-index (default: 99999) */
  zIndex?: number;
  /** Easing function for CSS transition */
  easing?: string;
  /** Minimum duration in ms (default: 100) */
  minimum?: number;
  /** Use shadow/glow effect? */
  shadow?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Callback when bar starts */
  onStart?: () => void;
  /** Callback when bar completes */
  onDone?: () => void;
}

export interface LoadingBarInstance {
  element: HTMLDivElement;
  /** Start the loading bar */
  start: () => void;
  /** Set progress to specific value (0-1) */
  set: (progress: number) => void;
  /** Increment by a small amount */
  inc: (amount?: number) => void;
  /** Complete the loading bar (animate to 100% then hide) */
  done: () => void;
  /** Force complete immediately without animation */
  forceDone: () => void;
  /** Get current progress value (0-1) */
  getProgress: () => number;
  /** Check if currently active */
  isActive: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Color Map ---

const COLOR_MAP: Record<string, string> = {
  blue: "#4338ca",
  green: "#22c55e",
  red: "#ef4444",
  purple: "#a855f7",
  orange: "#f97316",
};

// --- Main Class ---

export class LoadingBarManager {
  create(options: LoadingBarOptions = {}): LoadingBarInstance {
    const opts = {
      parent: options.parent ?? document.body,
      color: options.color ?? "blue",
      height: options.height ?? 3,
      zIndex: options.zIndex ?? 99999,
      easing: options.easing ?? "linear",
      minimum: options.minimum ?? 100,
      shadow: options.shadow ?? true,
      className: options.className ?? "",
      ...options,
    };

    let progress = 0;
    let isActiveState = false;
    let destroyed = false;
    let trickleTimer: ReturnType<typeof setInterval> | null = null;
    let doneTimer: ReturnType<typeof setTimeout> | null = null;

    // Resolve color
    const resolvedColor = typeof opts.color === "string" && COLOR_MAP[opts.color]
      ? COLOR_MAP[opts.color]
      : typeof opts.color === "string"
        ? opts.color
        : "#4338ca";

    // Bar container
    const container = document.createElement("div");
    container.className = `loading-bar ${opts.className}`;
    container.style.cssText = `
      position:fixed;top:0;left:0;right:0;z-index:${opts.zIndex};
      pointer-events:none;overflow:hidden;width:100%;
      opacity:0;transition:opacity ${opts.easing} 300ms;
    `;

    // The actual bar
    const bar = document.createElement("div");
    bar.className = "loading-bar-inner";
    bar.style.cssText = `
      position:absolute;top:0;left:0;height:${opts.height}px;
      width:0%;background:${resolvedColor};
      transition:width ${opts.easing} 500ms ease-out;
      will-change:width,transform;
      ${opts.shadow ? `box-shadow:0 0 10px ${resolvedColor}66, 0 0 5px ${resolvedColor}33;` : ""}
    `;
    container.appendChild(bar);

    // Spinner (optional shimmer effect)
    const shimmer = document.createElement("div");
    shimmer.className = "loading-bar-shimmer";
    shimmer.style.cssText = `
      position:absolute;top:0;left:0;height:100%;width:50px;
      background:linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      opacity:0;transition:opacity 200ms;
    `;
    bar.appendChild(shimmer);

    opts.parent.appendChild(container);

    function updateBar(): void {
      bar.style.width = `${Math.min(progress, 99.9)}%`;
    }

    function startTrickle(): void {
      stopTrickle();
      trickleTimer = setInterval(() => {
        if (progress < 95) {
          // Slower as we approach completion
          const base = (100 - progress) / 20;
          const amount = Math.random() * base + 0.5;
          progress = Math.min(progress + amount, 95);
          updateBar();
        }
      }, 500);
    }

    function stopTrickle(): void {
      if (trickleTimer) { clearInterval(trickleTimer); trickleTimer = null; }
    }

    function stopDoneTimer(): void {
      if (doneTimer) { clearTimeout(doneTimer); doneTimer = null; }
    }

    const instance: LoadingBarInstance = {
      element: container,

      start(): void {
        if (destroyed || isActiveState) return;
        isActiveState = true;
        progress = 0;

        container.style.opacity = "1";
        bar.style.width = "0%";
        bar.style.transition = "none";

        // Jump to initial position
        requestAnimationFrame(() => {
          progress = 10;
          updateBar();
          bar.style.transition = `width ${opts.easing} 500ms ease-out`;
          shimmer.style.opacity = "1";

          startTrickle();
          opts.onStart?.();
        });
      },

      set(value: number): void {
        if (destroyed) return;
        progress = Math.max(0, Math.min(100, value));
        updateBar();

        if (value >= 100) {
          instance.done();
        }
      },

      inc(amount?: number): void {
        if (destroyed) return;
        const n = amount ?? (progress < 80 ? Math.random() * 10 : Math.random() * 2);
        progress = Math.min(progress + n, 98);
        updateBar();
      },

      done(): void {
        if (!isActiveState || destroyed) return;
        stopTrickle();
        stopDoneTimer();

        progress = 100;
        updateBar();
        shimmer.style.opacity = "0";

        // Wait for animation then hide
        doneTimer = setTimeout(() => {
          container.style.opacity = "0";
          setTimeout(() => {
            progress = 0;
            bar.style.width = "0%";
            isActiveState = false;
            opts.onDone?.();
          }, 300);
        }, 400);
      },

      forceDone(): void {
        if (destroyed) return;
        stopTrickle();
        stopDoneTimer();
        progress = 100;
        bar.style.transition = "none";
        bar.style.width = "100%";
        container.style.opacity = "0";
        isActiveState = false;
        setTimeout(() => {
          progress = 0;
          bar.style.width = "0%";
          bar.style.transition = `width ${opts.easing} 500ms ease-out`;
          opts.onDone?.();
        }, 300);
      },

      getProgress(): number {
        return progress;
      },

      isActive(): boolean {
        return isActiveState;
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        stopTrickle();
        stopDoneTimer();
        container.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a loading bar */
export function createLoadingBar(options?: LoadingBarOptions): LoadingBarInstance {
  return new LoadingBarManager().create(options);
}

// --- Global singleton ---

let globalLoadingBar: LoadingBarInstance | null = null;

/** Get or create global loading bar singleton */
export function getGlobalLoadingBar(options?: LoadingBarOptions): LoadingBarInstance {
  if (!globalLoadingBar || globalLoadingBar.isActive()) {
    if (globalLoadingBar && !globalLoadingBar.isActive()) {
      globalLoadingBar.destroy();
    }
    globalLoadingBar = createLoadingBar(options);
  }
  return globalLoadingBar;
}

/** Quick start global loading bar */
export function startLoading(color?: LoadingBarColor): LoadingBarInstance {
  const bar = getGlobalLoadingBar({ color });
  bar.start();
  return bar;
}

/** Quick complete global loading bar */
export function doneLoading(): void {
  if (globalLoadingBar?.isActive()) {
    globalLoadingBar.done();
  }
}
