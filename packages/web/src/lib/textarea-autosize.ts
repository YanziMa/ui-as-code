/**
 * Textarea Autosize: Automatically resize textarea based on content,
 * with min/max height constraints, smooth transitions, and performance optimization.
 */

// --- Types ---

export interface TextareaAutosizeOptions {
  /** Textarea element or selector */
  element: HTMLTextAreaElement | string;
  /** Minimum height in px (default: auto = current or 60) */
  minHeight?: number | "auto";
  /** Maximum height in px (default: 0 = unlimited) */
  maxHeight?: number;
  /** Enable smooth transition animation (default: true) */
  animate?: boolean;
  /** Transition duration in ms (default: 100) */
  transitionDuration?: number;
  /** Extra bottom padding in px (default: 0) */
  bottomPadding?: number;
  /** Use requestAnimationFrame for measurement (default: true) */
  useRAF?: boolean;
  /** Callback when resize occurs */
  onResize?: (height: number) => void;
  /** Destroy automatically when element is removed from DOM? (default: true) */
  autoDestroy?: boolean;
}

export interface TextareaAutosizeInstance {
  element: HTMLTextAreaElement;
  /** Current computed height */
  getHeight: () => number;
  /** Force a recalculation */
  update: () => void;
  /** Set min height constraint */
  setMinHeight: (h: number) => void;
  /** Set max height constraint */
  setMaxHeight: (h: number) => void;
  /** Temporarily disable autosizing */
  pause: () => void;
  /** Resume autosizing */
  resume: () => void;
  /** Clean up listeners and observers */
  destroy: () => void;
}

// --- Main Factory ---

export function createTextareaAutosize(options: TextareaAutosizeOptions): TextareaAutosizeInstance {
  const el = typeof options.element === "string"
    ? document.querySelector<HTMLTextAreaElement>(options.element)!
    : options.element;

  if (!el) throw new Error("TextareaAutosize: textarea element not found");

  const opts = {
    minHeight: options.minHeight ?? "auto",
    maxHeight: options.maxHeight ?? 0,
    animate: options.animate ?? true,
    transitionDuration: options.transitionDuration ?? 100,
    bottomPadding: options.bottomPadding ?? 0,
    useRAF: options.useRAF ?? true,
    autoDestroy: options.autoDestroy ?? true,
    ...options,
  };

  let destroyed = false;
  let paused = false;
  let currentMinHeight: number = opts.minHeight === "auto"
    ? Math.max(el.offsetHeight, 60)
    : opts.minHeight as number;
  let currentMaxHeight = opts.maxHeight;

  // Store original styles we'll be overriding
  const originalOverflow = el.style.overflow;
  const originalResize = el.style.resize;
  const originalBoxSizing = el.style.boxSizing;
  const originalHeight = el.style.height;

  // Apply base styles needed for autosizing
  function applyBaseStyles(): void {
    el.style.overflowY = "hidden";
    el.style.resize = "none";
    el.style.boxSizing = "border-box";

    if (opts.animate) {
      el.style.transition = `height ${opts.transitionDuration}ms ease`;
    }
  }

  function measure(): number {
    // Reset height to auto to get scrollHeight
    el.style.height = "auto";
    const scrollH = el.scrollHeight + opts.bottomPadding;

    // Apply constraints
    let targetHeight = Math.max(scrollH, currentMinHeight);
    if (currentMaxHeight > 0) {
      targetHeight = Math.min(targetHeight, currentMaxHeight);
    }

    return targetHeight;
  }

  function doResize(immediate = false): void {
    if (destroyed || paused) return;

    const fn = () => {
      const wasAnimated = opts.animate && !immediate;
      if (wasAnimated) {
        // Temporarily disable transition for accurate measurement
        el.style.transition = "none";
      }

      const newHeight = measure();

      if (wasAnimated) {
        // Re-enable transition after setting height
        // Use rAF to ensure the non-animated value is applied first
        el.style.height = `${newHeight}px`;
        requestAnimationFrame(() => {
          if (destroyed) return;
          el.style.transition = `height ${opts.transitionDuration}ms ease`;
          // Restore overflow-y if at max height
          if (currentMaxHeight > 0 && newHeight >= currentMaxHeight) {
            el.style.overflowY = "auto";
          } else {
            el.style.overflowY = "hidden";
          }
        });
      } else {
        el.style.height = `${newHeight}px`;
        if (currentMaxHeight > 0 && newHeight >= currentMaxHeight) {
          el.style.overflowY = "auto";
        } else {
          el.style.overflowY = "hidden";
        }
      }

      opts.onResize?.(newHeight);
    };

    if (opts.useRAF && !immediate) {
      requestAnimationFrame(fn);
    } else {
      fn();
    }
  }

  // Event handlers
  const inputHandler = (): void => doResize();
  const changeHandler = (): void => doResize(true);
  const focusHandler = (): void => doResize();
  const pasteHandler = (): void => {
    // Delay paste handling to allow content to be inserted
    setTimeout(() => doResize(), 0);
  };

  // MutationObserver for programmatic value changes
  const mutationObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "attributes" && (m.attributeName === "value" || m.attributeName === "placeholder")) {
        doResize();
        break;
      }
      if (m.type === "childList") {
        doResize();
        break;
      }
    }
  });

  // Bind events
  el.addEventListener("input", inputHandler);
  el.addEventListener("change", changeHandler);
  el.addEventListener("focus", focusHandler);
  el.addEventListener("paste", pasteHandler);

  // Observe attribute changes
  mutationObserver.observe(el, { attributes: true, childList: true, subtree: true });

  // Auto-destroy on DOM removal
  let removalObserver: MutationObserver | null = null;
  if (opts.autoDestroy) {
    removalObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.removedNodes) {
          if (node === el || (node as Node).contains?.(el)) {
            destroy();
            return;
          }
        }
      }
    });
    removalObserver.observe(el.parentNode ?? document.body, { childList: true, subtree: true });
  }

  // Initialize
  applyBaseStyles();
  doResize(true);

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;

    el.removeEventListener("input", inputHandler);
    el.removeEventListener("change", changeHandler);
    el.removeEventListener("focus", focusHandler);
    el.removeEventListener("paste", pasteHandler);

    mutationObserver.disconnect();
    removalObserver?.disconnect();

    // Restore original styles
    el.style.overflow = originalOverflow;
    el.style.resize = originalResize;
    el.style.boxSizing = originalBoxSizing;
    el.style.height = originalHeight;
    el.style.transition = "";
  }

  const instance: TextareaAutosizeInstance = {
    element: el,

    getHeight() { return el.offsetHeight; },

    update() { doResize(true); },

    setMinHeight(h: number) {
      currentMinHeight = h;
      doResize(true);
    },

    setMaxHeight(h: number) {
      currentMaxHeight = h;
      doResize(true);
    },

    pause() { paused = true; },

    resume() {
      paused = false;
      doResize(true);
    },

    destroy,
  };

  return instance;
}
