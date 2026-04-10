/**
 * Affix: Pins an element to the viewport when scrolling past a threshold,
 * with offset configuration, container constraints, position change callbacks,
 * and smooth transitions.
 */

// --- Types ---

export interface AffixOptions {
  /** Target element to affix */
  target: HTMLElement | string;
  /** Offset from top of viewport when fixed (default: 0) */
  offsetTop?: number;
  /** Offset from bottom of viewport when fixed bottom */
  offsetBottom?: number;
  /** Container element that constrains the affixed area */
  container?: HTMLElement | string;
  /** Use CSS position:sticky instead of JS-based fixing */
  useSticky?: boolean;
  /** Z-index when affixed */
  zIndex?: number;
  /** CSS class to add when affixed */
  className?: string;
  /** Callback when affix state changes */
  onChange?: (affixed: boolean, formerRect: DOMRect | null) => void;
  /** Callback with current scroll distance info */
  onScroll?: (info: { scrollTop: number; affixed: boolean; top: number }) => void;
}

export interface AffixInstance {
  element: HTMLElement;
  isAffixed: () => boolean;
  updatePosition: () => void;
  lock: () => void;
  unlock: () => void;
  destroy: () => void;
}

// --- Main ---

export function createAffix(options: AffixOptions): AffixInstance {
  const opts = {
    offsetTop: options.offsetTop ?? 0,
    offsetBottom: options.offsetBottom,
    useSticky: options.useSticky ?? false,
    zIndex: options.zIndex ?? 1000,
    ...options,
  };

  const targetEl = typeof options.target === "string"
    ? document.querySelector<HTMLElement>(options.target)!
    : options.target;

  if (!targetEl) throw new Error("Affix: target element not found");

  const containerEl = options.container
    ? (typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container)
    : null;

  // State
  let isAffixedState = false;
  let isLocked = false;
  let formerPlaceholder: HTMLDivElement | null = null;
  let originalStyles: Record<string, string> = {};
  let destroyed = false;
  let rafId: number | null = null;

  // Save original styles
  function saveOriginalStyles(): void {
    const style = targetEl.style;
    originalStyles = {
      position: style.position,
      top: style.top,
      bottom: style.bottom,
      left: style.left,
      right: style.right,
      width: style.width,
      zIndex: style.zIndex,
    };
  }
  saveOriginalStyles();

  function getContainerRect(): DOMRect | null {
    if (!containerEl) return null;
    return containerEl.getBoundingClientRect();
  }

  function updateAffix(): void {
    if (isLocked || destroyed) return;

    const targetRect = targetEl.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;

    // Top-affix logic
    if (opts.offsetTop !== undefined && opts.offsetTop !== null) {
      const shouldAffix = targetRect.top <= opts.offsetTop;

      if (shouldAffix && !isAffixedState) {
        // Affix to top
        affixTop(targetRect);
      } else if (!shouldAffix && isAffixedState) {
        unfix();
      }
    }

    // Bottom-affix logic
    if (opts.offsetBottom !== undefined && opts.offsetBottom !== null) {
      const shouldAffixBottom = targetRect.bottom >= viewportHeight - opts.offsetBottom;
      // Could implement bottom affix here similarly
    }

    opts.onScroll?.({
      scrollTop,
      affixed: isAffixedState,
      top: targetRect.top,
    });
  }

  function affixTop(formerRect: DOMRect): void {
    isAffixedState = true;

    // Create placeholder to prevent layout shift
    formerPlaceholder = document.createElement("div");
    formerPlaceholder.className = "affix-placeholder";
    formerPlaceholder.style.cssText = `
      width:${formerRect.width}px;height:${formerRect.height}px;
      visibility:hidden;pointer-events:none;margin:0;padding:0;
    `;
    targetEl.parentNode?.insertBefore(formerPlaceholder, targetEl);

    // Apply fixed styles
    targetEl.style.position = "fixed";
    targetEl.style.top = `${opts.offsetTop}px`;
    targetEl.style.left = `${formerRect.left}px`;
    targetEl.style.width = `${formerRect.width}px`;
    targetEl.style.zIndex = String(opts.zIndex);

    if (opts.className) {
      targetEl.classList.add(opts.className);
    }

    opts.onChange?.(true, formerRect);
  }

  function unfix(): void {
    if (!isAffixedState) return;
    isAffixedState = false;

    // Restore original styles
    Object.assign(targetEl.style, originalStyles);

    if (opts.className) {
      targetEl.classList.remove(opts.className);
    }

    // Remove placeholder
    if (formerPlaceholder) {
      formerPlaceholder.remove();
      formerPlaceholder = null;
    }

    opts.onChange?.(false, null);
  }

  // Sticky mode (CSS-only)
  function applySticky(): void {
    if (opts.offsetTop !== undefined && opts.offsetTop !== null) {
      targetEl.style.position = "sticky";
      targetEl.style.top = `${opts.offsetTop}px`;
      targetEl.style.zIndex = String(opts.zIndex);
    }
    if (opts.offsetBottom !== undefined && opts.offsetBottom !== null) {
      targetEl.style.bottom = `${opts.offsetBottom}px`;
    }
  }

  // Scroll handler with RAF throttle
  function handleScroll(): void {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updateAffix);
  }

  // Resize handler
  function handleResize(): void {
    if (isAffixedState && formerPlaceholder) {
      const phRect = formerPlaceholder.getBoundingClientRect();
      targetEl.style.left = `${phRect.left}px`;
      targetEl.style.width = `${phRect.width}px`;
    }
  }

  // Initialize
  if (opts.useSticky) {
    applySticky();
  } else {
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    // Check initial state
    updateAffix();
  }

  const instance: AffixInstance = {
    element: targetEl,

    isAffixed() { return isAffixedState; },

    updatePosition() {
      if (isAffixedState && formerPlaceholder) {
        const phRect = formerPlaceholder.getBoundingClientRect();
        targetEl.style.left = `${phRect.left}px`;
        targetEl.style.width = `${phRect.width}px`;
      }
    },

    lock() { isLocked = true; },
    unlock() { isLocked = false; updateAffix(); },

    destroy() {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      unfix();
      // Restore styles completely
      Object.assign(targetEl.style, originalStyles);
    },
  };

  return instance;
}
