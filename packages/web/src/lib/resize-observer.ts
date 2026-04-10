/**
 * Resize Observer: Element size change detection with content-box/border-box,
 * throttle/debounce, multi-element observation, dimension filtering, and
 * auto-disconnect.
 */

// --- Types ---

export type ResizeBox = "content-box" | "border-box" | "device-pixel-content-box" | "device-pixel-border-box";

export interface ResizeObserverOptions {
  /** Element(s) to observe */
  target: HTMLElement | HTMLElement[];
  /** Box model for sizing (default: content-box) */
  box?: ResizeBox;
  /** Throttle notifications (ms, 0 = no throttle) */
  throttleMs?: number;
  /** Debounce final notification (ms, 0 = no debounce) */
  debounceMs?: number;
  /** Only report when dimensions exceed threshold? */
  minChange?: { width?: number; height?: number };
  /** Callback on resize */
  onResize?: (entry: ResizeObserverEntry) => void;
  /** Callback specifically on width change */
  onWidthChange?: (entry: ResizeObserverEntry) => void;
  /** Callback specifically on height change */
  onHeightChange?: (entry: ResizeObserverEntry) => void;
  /** Initial notification without waiting for resize? */
  initialNotify?: boolean;
}

export interface ResizeObserverEntry {
  target: HTMLElement;
  width: number;
  height: number;
  contentWidth: number;
  contentHeight: number;
  borderBoxWidth: number;
  borderBoxHeight: number;
  devicePixelContentWidth: number;
  devicePixelContentHeight: number;
  devicePixelBorderBoxWidth: number;
  devicePixelBorderBoxHeight: number;
  deltaWidth: number;
  deltaHeight: number;
  deltaContentWidth: number;
  deltaContentHeight: number;
  timestamp: number;
}

export interface ResizeObserverInstance {
  /** The raw browser ResizeObserver */
  observer: ResizeObserver;
  /** Get last known sizes for all targets */
  getSizes: () => Map<HTMLElement, { width: number; height: number }>;
  /** Get size for a specific target */
  getSize: (target: HTMLElement) => { width: number; height: number } | undefined;
  /** Manually trigger a check */
  check: () => void;
  /** Observe additional targets */
  observe: (target: HTMLElement | HTMLElement[]) => void;
  /** Unobserve specific targets */
  unobserve: (target: HTMLElement | HTMLElement[]) => void;
  /** Disconnect all observations */
  disconnect: () => void;
  /** Destroy completely */
  destroy: () => void;
}

// --- Helpers ---

interface SizeState {
  width: number;
  height: number;
  contentWidth: number;
  contentHeight: number;
  borderBoxWidth: number;
  borderBoxHeight: number;
}

function getElementSize(el: HTMLElement): SizeState {
  return {
    width: el.offsetWidth,
    height: el.offsetHeight,
    contentWidth: el.clientWidth,
    contentHeight: el.clientHeight,
    borderBoxWidth: el.scrollWidth,
    borderBoxHeight: el.scrollHeight,
  };
}

function boxOptionToEnum(box: ResizeBox): ResizeObserverBoxSizeOptions["box"] {
  switch (box) {
    case "content-box": return "content-box";
    case "border-box": return "border-box";
    case "device-pixel-content-box": return "device-pixel-content-box";
    case "device-pixel-border-box": return "device-pixel-border-box";
    default: return "content-box";
  }
}

// --- Main Class ---

export class ResizeWatcher {
  create(options: ResizeObserverOptions): ResizeObserverInstance {
    const sizes = new Map<HTMLElement, SizeState>();
    let destroyed = false;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingEntry: ResizeObserverEntry | null = null;

    // Resolve options
    const box = options.box ?? "content-box";
    const throttleMs = options.throttleMs ?? 0;
    const debounceMs = options.debounceMs ?? 0;

    // Build observer callback
    const callback = (entries: ResizeObserverEntry[], _obs: ResizeObserverV2) => {
      if (destroyed) return;

      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const newSize = getElementSize(el);
        const prevState = sizes.get(el);

        // Store new size
        sizes.set(el, newSize);

        // Skip first observation (unless initialNotify requested)
        if (!prevState) {
          if (options.initialNotify) {
            const publicEntry = buildPublicEntry(el, newSize, prevState, 0, 0);
            options.onResize?.(publicEntry);
          }
          continue;
        }

        // Calculate deltas
        const dw = newSize.width - prevState!.width;
        const dh = newSize.height - prevState!.height;
        dcw = newSize.contentWidth - prevState!.contentWidth;
        dch = newSize.contentHeight - prevState!.contentHeight;

        // Min change filter
        if (options.minChange) {
          if (Math.abs(dw) < (options.minChange.width ?? 0) &&
              Math.abs(dh) < (options.minChange.height ?? 0)) {
            continue;
          }
        }

        const publicEntry = buildPublicEntry(el, newSize, prevState!, dw, dh);

        // Width-specific callback
        if (dw !== 0) options.onWidthChange?.(publicEntry);

        // Height-specific callback
        if (dh !== 0) options.onHeightChange?.(publicEntry);

        // General callback
        if (dw !== 0 || dh !== 0) {
          // Throttling
          if (throttleMs > 0) {
            pendingEntry = publicEntry;
            if (!throttleTimer) {
              throttleTimer = setTimeout(() => {
                flushPending();
              }, throttleMs);
            }
            continue;
          }

          // Debouncing
          if (debounceMs > 0) {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              options.onResize?.(publicEntry);
            }, debounceMs);
            continue;
          }

          // Immediate
          options.onResize?.(publicEntry);
        }
      }
    };

    function flushPending(): void {
      if (pendingEntry) {
        options.onResize?.(pendingEntry);
        pendingEntry = null;
      }
      throttleTimer = null;
    }

    // Create the actual observer
    const observerOptions: ResizeObserverOptions = {
      box: boxOptionToEnum(box) as ResizeObserverBoxSizeOptions["box"],
    };

    const observer = new ResizeObserver(callback);

    // Add initial targets
    const initialTargets = Array.isArray(options.target) ? options.target : [options.target];
    for (const t of initialTargets) {
      if (t) {
        observer.observe(t);
        const size = getElementSize(t);
        sizes.set(t, size);
      }
    }

    const instance: ResizeObserverInstance = {
      observer,

      getSizes() {
        // Return a copy of current sizes
        const copy = new Map<HTMLElement, { width: number; height: number }>();
        for (const [el, s] of sizes) {
          copy.set(el, { width: s.width, height: s.height });
        }
        return copy;
      },

      getSize(target: HTMLElement) {
        const s = sizes.get(target);
        return s ? { width: s.width, height: s.height } : undefined;
      },

      check() {
        observer.disconnect();
        // Re-observe all current targets
        for (const [el] of sizes) {
          observer.observe(el);
        }
        // This triggers the callback synchronously for current sizes
      },

      observe(newTargets: HTMLElement | HTMLElement[]) {
        const arr = Array.isArray(newTargets) ? newTargets : [newTargets];
        for (const t of arr) {
          if (t && !sizes.has(t)) {
            observer.observe(t);
            sizes.set(t, getElementSize(t));
          }
        }
      },

      unobserve(targetsToRemove: HTMLElement | HTMLElement[]) {
        const arr = Array.isArray(targetsToRemove) ? targetsToRemove : [targetsToRemove];
        for (const t of arr) {
          if (sizes.has(t)) {
            observer.unobserve(t);
            sizes.delete(t);
          }
        }
      },

      disconnect() {
        observer.disconnect();
        sizes.clear();
        if (throttleTimer) { clearTimeout(throttleTimer); throttleTimer = null; }
        if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
        pendingEntry = null;
      },

      destroy() {
        if (destroyed) return;
        destroyed = true;
        instance.disconnect();
      },
    };

    // Initial notify if requested
    if (options.initialNotify) {
      for (const [el, size] of sizes) {
        const pub = buildPublicEntry(el, size, size, 0, 0);
        options.onResize?.(pub);
      }
    }

    return instance;
  }
}

/** Build a public-facing entry from internal state */
function buildPublicEntry(
  el: HTMLElement,
  current: SizeState,
  prev: SizeState | undefined,
  dw: number,
  dh: number,
): ResizeObserverEntry {
  return {
    target: el,
    width: current.width,
    height: current.height,
    contentWidth: current.contentWidth,
    contentHeight: current.contentHeight,
    borderBoxWidth: current.borderBoxWidth,
    borderBoxHeight: current.borderBoxHeight,
    devicePixelContentWidth: el.clientWidth * (window.devicePixelRatio || 1),
    devicePixelContentHeight: el.clientHeight * (window.devicePixelRatio || 1),
    devicePixelBorderBoxWidth: el.scrollWidth * (window.devicePixelRatio || 1),
    devicePixelBorderBoxHeight: el.scrollHeight * (window.devicePixelRatio || 1),
    deltaWidth: dw,
    deltaHeight: dh,
    deltaContentWidth: current.contentWidth - (prev?.contentWidth ?? 0),
    deltaContentHeight: current.contentHeight - (prev?.contentHeight ?? 0),
    timestamp: Date.now(),
  };
}

/** Convenience: create a resize observer */
export function createResizeObserver(options: ResizeObserverOptions): ResizeObserverInstance {
  return new ResizeWatcher().create(options);
}

// --- Convenience: match element size to parent ---

/** Make an element match its parent's width (or height) */
export function matchParentSize(
  element: HTMLElement,
  dimension: "width" | "height" | "both",
  options?: { parent?: HTMLElement; offset?: number },
): ResizeObserverInstance {
  const parent = options?.parent ?? element.parentElement;
  if (!parent) throw new Error("matchParentSize: no parent found");

  return createResizeObserver({
    target: element,
    box: "content-box",
    onResize: (entry) => {
      if (dimension === "width" || dimension === "both") {
        element.style.width = `${entry.contentWidth}px`;
      }
      if (dimension === "height" || dimension === "both") {
        element.style.height = `${entry.contentHeight}px`;
      }
    },
  });
}

/** Observe element and return promise that resolves when it exceeds a size */
export function whenSizeExceeds(
  element: HTMLElement,
  minWidth?: number,
  minHeight?: number,
  options?: { timeout?: number },
): Promise<{ width: number; height: number }> {
  const { timeout = 30000 } = options ?? {};

  return new Promise((resolve, reject) => {
    const obs = createResizeObserver({
      target: element,
      onResize: (entry) => {
        const wOk = !minWidth || entry.width >= minWidth;
        const hOk = !minHeight || entry.height >= minHeight;
        if (wOk && hOk) {
          obs.destroy();
          resolve({ width: entry.width, height: entry.height });
        }
      },
    });

    setTimeout(() => {
      obs.destroy();
      reject(new Error("Timeout"));
    }, timeout);
  });
}
