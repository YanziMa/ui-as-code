/**
 * Content Visibility API helper for efficient off-screen content skipping,
 * with auto-toggle based on Intersection Observer, skeleton placeholder support,
 * and scroll position restoration.
 *
 * content-visibility: auto + contain-intrinsic-size can dramatically improve
 * rendering performance for long lists/feeds.
 */

// --- Types ---

export type ContentVisibilityValue = "visible" | "hidden" | "auto";

export interface ContentVisibilityOptions {
  /** Initial visibility value (default: "auto") */
  initial?: ContentVisibilityValue;
  /** Intrinsic size when hidden (format: "W H", e.g., "300 500") */
  intrinsicSize?: string;
  /** Auto-toggle using IntersectionObserver (default: true) */
  autoToggle?: boolean;
  /** Root margin for IntersectionObserver (default: "500px") */
  observerRootMargin?: string;
  /** Threshold for toggling to visible (default: 0) */
  observerThreshold?: number;
  /** Show skeleton/placeholder while content is skipped */
  showSkeleton?: boolean;
  /** Skeleton background color (default: "#f0f0f0") */
  skeletonColor?: string;
  /** Skeleton animation (default: shimmer pulse) */
  skeletonAnimation?: string;
  /** Called when visibility state changes */
  onChange?: (visible: boolean) => void;
  /** Restore scroll position after toggle (default: true) */
  restoreScrollPosition?: boolean;
}

export interface ContentVisibilityInstance {
  /** Target element */
  readonly element: HTMLElement;
  /** Current visibility value */
  readonly current: ContentVisibilityValue;
  /** Whether the element's content is currently being rendered */
  readonly isRendering: boolean;
  /** Manually set visibility */
  set: (value: ContentVisibilityValue) => void;
  /** Force visible (render content) */
  show: () => void;
  /** Hide (skip rendering) */
  hide: () => void;
  /** Toggle auto mode */
  setAuto: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main ---

export function setContentVisibility(
  element: HTMLElement,
  options: ContentVisibilityOptions = {},
): ContentVisibilityInstance {
  const {
    initial = "auto",
    intrinsicSize,
    autoToggle = true,
    observerRootMargin = "500px",
    observerThreshold = 0,
    showSkeleton = false,
    skeletonColor = "#f0f0f0",
    skeletonAnimation,
    onChange,
    restoreScrollPosition = true,
  } = options;

  let destroyed = false;
  let currentValue: ContentVisibilityValue = initial;
  let observer: IntersectionObserver | null = null;
  let skeletonEl: HTMLDivElement | null = null;

  function apply(value: ContentVisibilityValue): void {
    if (destroyed) return;
    currentValue = value;
    element.style.contentVisibility = value;

    if (value === "hidden" && showSkeleton && !skeletonEl) {
      createSkeleton();
    } else if (value !== "hidden" && skeletonEl) {
      removeSkeleton();
    }

    onChange?.(value === "visible" || value === "auto");
  }

  function createSkeleton(): void {
    if (skeletonEl || destroyed) return;
    skeletonEl = document.createElement("div");
    skeletonEl.className = "cv-skeleton-placeholder";
    skeletonEl.style.cssText = `
      position:absolute;top:0;left:0;right:0;bottom:0;
      pointer-events:none;z-index:1;
      background:${skeletonColor};
      ${skeletonAnimation ? `animation:${skeletonAnimation};` : ""}
    `;
    element.style.position = element.style.position || "relative";
    element.appendChild(skeletonEl);
  }

  function removeSkeleton(): void {
    if (skeletonEl) {
      skeletonEl.remove();
      skeletonEl = null;
    }
  }

  function setupObserver(): void {
    if (!autoToggle || destroyed) return;

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            // Save scroll position before potential reflow
            let scrollY = 0;
            if (restoreScrollPosition) {
              scrollY = window.scrollY;
            }

            target.style.contentVisibility = "visible";

            // Restore scroll position
            if (restoreScrollPosition && scrollY !== window.scrollY) {
              window.scrollTo({ top: scrollY });
            }

            onChange?.(true);
          } else {
            target.style.contentVisibility = "hidden";
            if (showSkeleton) createSkeleton();
            onChange?.(false);
          }
        }
      },
      {
        rootMargin: observerRootMargin,
        threshold: observerThreshold,
      },
    );

    observer.observe(element);
  }

  // Initialize
  if (intrinsicSize) {
    element.style.containIntrinsicSize = intrinsicSize;
  }
  apply(initial);
  setupObserver();

  const instance: ContentVisibilityInstance = {
    get element() { return element; },
    get current() { return currentValue; },
    get isRendering() {
      const cv = element.style.contentVisibility ?? getComputedStyle(element).contentVisibility;
      return cv === "visible" || cv === "auto";
    },

    set: apply,
    show() { apply("visible"); },
    hide() { apply("hidden"); },
    setAuto() { apply("auto"); },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (observer) { observer.disconnect(); observer = null; }
      removeSkeleton();
      element.style.contentVisibility = "";
      // Don't clear containIntrinsicSize — user may have set it intentionally
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Apply content-visibility to multiple elements (e.g., list items) */
export function applyContentVisibilityToList(
  container: HTMLElement,
  itemSelector: string,
  options?: Omit<ContentVisibilityOptions, "autoToggle">,
): ContentVisibilityInstance[] {
  const items = container.querySelectorAll<HTMLElement>(itemSelector);
  return Array.from(items).map((item) =>
    setContentVisibility(item, { ...options, autoToggle: true }),
  );
}

/** Check browser support for content-visibility */
export function isContentVisibilitySupported(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.createElement("div");
  return "contentVisibility" in el.style;
}

/** Quick one-shot: make an element skip rendering when off-screen */
export function skipWhenOffscreen(
  element: HTMLElement,
  intrinsicHeight = 500,
): ContentVisibilityInstance {
  return setContentVisibility(element, {
    initial: "auto",
    intrinsicSize: `100% ${intrinsicHeight}`,
    autoToggle: true,
  });
}
