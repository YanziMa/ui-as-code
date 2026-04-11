/**
 * Lazy Load Utilities: Lazy-load images, iframes, and custom elements
 * using IntersectionObserver with configurable thresholds, placeholder
 * support, error handling, and preloading strategies.
 */

// --- Types ---

export type LazyLoadState = "idle" | "loading" | "loaded" | "error";

export interface LazyLoadTarget {
  /** The element to lazy load */
  el: HTMLElement;
  /** Data attribute name holding the real src. Default "data-src" */
  srcAttr?: string;
  /** Data attribute for srcset */
  srcsetAttr?: string;
  /** Custom load handler (for non-img elements) */
  loader?: (el: HTMLElement) => Promise<void>;
  /** Placeholder HTML or element shown while loading */
  placeholder?: HTMLElement | string;
  /** Error fallback content */
  errorContent?: HTMLElement | string;
  /** Root margin for IO */
  rootMargin?: string;
  /** Threshold for triggering load */
  threshold?: number;
}

export interface LazyLoadOptions {
  /** Targets to lazy load */
  targets: LazyLoadTarget[];
  /** Global root margin for IO. Default "200px" */
  rootMargin?: string;
  /** Global threshold. Default 0 */
  threshold?: number;
  /** Global default data-src attribute. Default "data-src" */
  srcAttr?: string;
  /** Preload visible elements immediately? Default true */
  preloadVisible?: boolean;
  /** Disconnect after all loaded? Default false */
  disconnectOnComplete?: boolean;
  /** Called when an element starts loading */
  onLoadStart?: (el: HTMLElement, index: number) => void;
  /** Called when an element finishes loading */
  onLoadComplete?: (el: HTMLElement, index: number) => void;
  /** Called when loading fails */
  onLoadError?: (el: HTMLElement, index: number, err: unknown) => void;
  /** Called when all elements have been loaded (or errored) */
  onComplete?: (results: Map<number, LazyLoadState>) => void;
}

export interface LazyLoadInstance {
  /** Load a specific target by index */
  load: (index: number) => Promise<void>;
  /** Load all targets immediately */
  loadAll: () => Promise<void>;
  /** Get state of a specific target */
  getState: (index: number) => LazyLoadState;
  /** Get states of all targets */
  getAllStates: () => Map<number, LazyLoadState>;
  /** Add a new target dynamically */
  addTarget: (target: LazyLoadTarget) => number;
  /** Remove a target by index */
  removeTarget: (index: number) => void;
  /** Force re-observe all unloaded targets */
  refresh: () => void;
  /** Destroy and disconnect observer */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a lazy-loading manager using IntersectionObserver.
 *
 * @example
 * ```ts
 * const lazy = createLazyLoad({
 *   targets: [
 *     { el: imgEl1, srcAttr: "data-src" },
 *     { el: iframeEl, srcAttr: "data-src" },
 *   ],
 *   rootMargin: "300px",
 * });
 * ```
 */
export function createLazyLoad(options: LazyLoadOptions): LazyLoadInstance {
  const {
    targets,
    rootMargin = "200px",
    threshold = 0,
    srcAttr = "data-src",
    preloadVisible = true,
    disconnectOnComplete = false,
    onLoadStart,
    onLoadComplete,
    onLoadError,
    onComplete,
  } = options;

  let _targets = [...targets];
  const _states = new Map<number, LazyLoadState>();
  _targets.forEach((_, i) => _states.set(i, "idle"));

  let observer: IntersectionObserver | null = null;
  let _complete = false;
  const cleanupFns: Array<() => void> = [];

  // Initialize states
  function initState(index: number): void {
    _states.set(index, "idle");
  }

  // --- Loading Logic ---

  async function doLoad(index: number): Promise<void> {
    const target = _targets[index];
    if (!target) return;
    if (_states.get(index) === "loaded" || _states.get(index) === "loading") return;

    const attrSrc = target.srcAttr ?? srcAttr;
    const attrSrcset = target.srcsetAttr ?? "data-srcset";
    const el = target.el;

    _states.set(index, "loading");
    onLoadStart?.(el, index);

    try {
      // Show placeholder
      if (target.placeholder) {
        const ph = typeof target.placeholder === "string"
          ? (() => { const d = document.createElement("div"); d.innerHTML = target.placeholder as string; return d; })()
          : target.placeholder;
        el.setAttribute("data-lazy-placeholder", "true");
        // For images, set placeholder before loading
        if (el instanceof HTMLImageElement) {
          el.style.background = "#f3f4f6";
        }
      }

      if (target.loader) {
        await target.loader(el);
      } else if (el instanceof HTMLImageElement) {
        await loadImage(el, attrSrc, attrSrcset);
      } else if (el instanceof HTMLIFrameElement || el instanceof HTMLVideoElement) {
        loadMediaElement(el, attrSrc);
      } else {
        // Generic: set src/data-src
        const src = el.getAttribute(attrSrc);
        if (src) {
          if (el.tagName.toLowerCase() === "img" || el.tagName.toLowerCase() === "iframe" || el.tagName.toLowerCase() === "video") {
            (el as HTMLImageElement).src = src;
          } else {
            el.setAttribute("src", src);
          }
        }
      }

      _states.set(index, "loaded");
      onLoadComplete?.(el, index);
      checkComplete();
    } catch (err) {
      _states.set(index, "error");

      // Show error content
      if (target.errorContent) {
        const errEl = typeof target.errorContent === "string"
          ? (() => { const d = document.createElement("div"); d.innerHTML = target.errorContent as string; return d; })()
          : target.errorContent;
        el.appendChild(errEl);
      }

      onLoadError?.(el, index, err);
      checkComplete();
    }
  }

  function loadImage(img: HTMLImageElement, srcA: string, srcsetA: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const src = img.getAttribute(srcA);
      const srcset = img.getAttribute(srcsetA);

      if (!src && !srcset) { resolve(); return; }

      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));

      if (srcset) img.srcset = srcset;
      if (src) img.src = src;
    });
  }

  function loadMediaElement(el: HTMLElement, srcA: string): void {
    const src = el.getAttribute(srcA);
    if (src) {
      (el as HTMLIFrameElement).src = src;
    }
  }

  function checkComplete(): void {
    if (_complete) return;
    const allDone = [..._states.values()].every(
      (s) => s === "loaded" || s === "error",
    );
    if (allDone) {
      _complete = true;
      onComplete?.(_states);
      if (disconnectOnComplete && observer) {
        observer.disconnect();
      }
    }
  }

  // --- Setup Observer ---

  function setupObserver(): void {
    if (typeof IntersectionObserver === "undefined") {
      // Fallback: load everything
      loadAll();
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = _targets.findIndex((t) => t.el === entry.target);
            if (idx >= 0) {
              doLoad(idx);
              // Unobserve after triggering
              observer?.unobserve(entry.target);
            }
          }
        });
      },
      { rootMargin, threshold },
    );

    _targets.forEach((t, idx) => {
      if (_states.get(idx) !== "loaded" && _states.get(idx) !== "error") {
        observer!.observe(t.el);
      }
    });
  }

  // --- API ---

  async function load(index: number): Promise<void> {
    await doLoad(index);
  }

  async function loadAll(): Promise<void> {
    const promises = _targets.map((_, i) => doLoad(i));
    await Promise.allSettled(promises);
  }

  function getState(index: number): LazyLoadState {
    return _states.get(index) ?? "idle";
  }

  function getAllStates(): Map<number, LazyLoadState> {
    return new Map(_states);
  }

  function addTarget(target: LazyLoadTarget): number {
    const index = _targets.length;
    _targets.push(target);
    _states.set(index, "idle");
    if (observer) observer.observe(target.el);
    return index;
  }

  function removeTarget(index: number): void {
    if (index < 0 || index >= _targets.length) return;
    if (observer) observer.unobserve(_targets[index]!.el);
    _targets.splice(index, 1);
    // Rebuild states map
    const newStates = new Map<number, LazyLoadState>();
    _targets.forEach((_, i) => {
      newStates.set(i, _states.get(i) ?? "idle");
    });
    _states.clear();
    newStates.forEach((v, k) => _states.set(k, v));
  }

  function refresh(): void {
    if (observer) observer.disconnect();
    _targets.forEach((t, idx) => {
      if (_states.get(idx) !== "loaded" && _states.get(idx) !== "error") {
        _states.set(idx, "idle");
      }
    });
    setupObserver();
  }

  function destroy(): void {
    if (observer) observer.disconnect();
    observer = null;
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  // Init
  setupObserver();

  if (preloadVisible) {
    // Immediately check what's already visible
    requestAnimationFrame(() => {
      _targets.forEach((t, idx) => {
        const rect = t.el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          doLoad(idx);
        }
      });
    });
  }

  return { load, loadAll, getState, getAllStates, addTarget, removeTarget, refresh, destroy };
}
