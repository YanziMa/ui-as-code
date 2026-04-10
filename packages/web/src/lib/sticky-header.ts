/**
 * Sticky Header: Scroll-aware header that sticks to top, hides on
 * scroll-down, reveals on scroll-up, with shadow transition,
 * height compensation for content jump, and configurable thresholds.
 */

// --- Types ---

export type StickyBehavior = "always" | "smart" | "hide-on-down" | "show-on-up";
export type StickyShadow = "none" | "scroll" | "always";

export interface StickyHeaderOptions {
  /** Header element or selector */
  header: HTMLElement | string;
  /** Behavior mode */
  behavior?: StickyBehavior;
  /** When to show shadow */
  shadow?: StickyShadow;
  /** Offset from top before sticking (px) */
  offset?: number;
  /** Hide threshold: scroll distance to trigger hide (px) */
  hideThreshold?: number;
  /** Show threshold: scroll distance up to trigger show (px) */
  showThreshold?: number;
  /** Z-index when stuck */
  zIndex?: number;
  /** Background color when stuck (for transparency support) */
  stuckBg?: string;
  /** Transition duration (ms) */
  transitionDuration?: number;
  /** Add a spacer div to prevent content jump? */
  useSpacer?: boolean;
  /** Callback when header becomes stuck */
  onStuck?: () => void;
  /** Callback when header becomes unstuck */
  onUnstuck?: () => void;
  /** Callback when header is hidden (smart mode) */
  onHidden?: () => void;
  /** Callback when header is revealed (smart mode) */
  onRevealed?: () => void;
  /** Custom CSS class when stuck */
  stuckClass?: string;
  /** Custom CSS class when hidden */
  hiddenClass?: string;
}

export interface StickyHeaderInstance {
  element: HTMLElement;
  isStuck: () => boolean;
  isHidden: () => void;
  setBehavior: (behavior: StickyBehavior) => void;
  destroy: () => void;
}

// --- Main Factory ---

export function createStickyHeader(options: StickyHeaderOptions): StickyHeaderInstance {
  const opts = {
    behavior: options.behavior ?? "smart",
    shadow: options.shadow ?? "scroll",
    offset: options.offset ?? 0,
    hideThreshold: options.hideThreshold ?? 40,
    showThreshold: options.showThreshold ?? 20,
    zIndex: options.zIndex ?? 1000,
    stuckBg: options.stuckBg,
    transitionDuration: options.transitionDuration ?? 200,
    useSpacer: options.useSpacer ?? true,
    stuckClass: options.stuckClass ?? "sticky-stuck",
    hiddenClass: options.hiddenClass ?? "sticky-hidden",
    ...options,
  };

  const headerEl = typeof options.header === "string"
    ? document.querySelector<HTMLElement>(options.header)!
    : options.header;

  if (!headerEl) throw new Error("StickyHeader: header element not found");

  // Save original styles
  const originalPosition = getComputedStyle(headerEl).position;
  const originalTop = getComputedStyle(headerEl).top;
  const originalZIndex = getComputedStyle(headerEl).zIndex;
  const originalBg = getComputedStyle(headerEl).background;

  // Create spacer to prevent layout jump
  let spacer: HTMLDivElement | null = null;
  if (opts.useSpacer) {
    spacer = document.createElement("div");
    spacer.className = "sticky-spacer";
    spacer.style.cssText = "display:none;pointer-events:none;";
    headerEl.parentNode?.insertBefore(spacer, headerEl);
  }

  // State
  let isStuckState = false;
  let isHiddenState = false;
  let lastScrollY = window.scrollY;
  let destroyed = false;

  function update(): void {
    if (destroyed) return;

    const scrollY = window.scrollY;
    const headerRect = headerEl.getBoundingClientRect();
    const shouldStick = scrollY > (headerRect.top + scrollY - opts.offset);

    // Stick/unstick
    if (shouldStick && !isStuckState) {
      isStuckState = true;
      applyStuck();
      opts.onStuck?.();
    } else if (!shouldStick && isStuckState) {
      isStuckState = false;
      applyUnstuck();
      opts.onUnstuck?.();
    }

    // Smart hide/show behavior
    if (opts.behavior === "smart" || opts.behavior === "hide-on-down" || opts.behavior === "show-on-up") {
      const delta = scrollY - lastScrollY;

      if (delta > opts.hideThreshold && !isHiddenState && isStuckState && scrollY > 100) {
        // Scrolling down past threshold → hide
        isHiddenState = true;
        applyHidden();
        opts.onHidden?.();
      } else if (delta < -opts.showThreshold && isHiddenState) {
        // Scrolling up past threshold → show
        isHiddenState = false;
        applyRevealed();
        opts.onRevealed?.();
      }
    }

    lastScrollY = scrollY;
  }

  function applyStuck(): void {
    headerEl.style.position = "fixed";
    headerEl.style.top = `${opts.offset}px`;
    headerEl.style.left = "0";
    headerEl.style.right = "0";
    headerEl.style.zIndex = String(opts.zIndex);
    headerEl.style.transition = `transform ${opts.transitionDuration}ms ease, opacity ${opts.transitionDuration}ms ease, background ${opts.transitionDuration}ms ease, box-shadow ${opts.transitionDuration}ms ease`;

    if (opts.stuckBg) headerEl.style.background = opts.stuckBg;
    headerEl.classList.add(opts.stuckClass);

    // Shadow
    if (opts.shadow === "always" || opts.shadow === "scroll") {
      headerEl.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.06)";
    }

    // Spacer
    if (spacer) {
      const h = headerEl.offsetHeight;
      spacer.style.display = "block";
      spacer.style.height = `${h}px`;
    }
  }

  function applyUnstuck(): void {
    headerEl.style.position = originalPosition !== "static" ? originalPosition : "";
    headerEl.style.top = originalTop !== "auto" ? originalTop : "";
    headerEl.style.left = "";
    headerEl.style.right = "";
    headerEl.style.zIndex = originalZIndex !== "auto" ? originalZIndex : "";

    if (opts.stuckBg) headerEl.style.background = originalBg;
    headerEl.classList.remove(opts.stuckClass);

    if (opts.shadow !== "always") {
      headerEl.style.boxShadow = "";
    }

    if (spacer) {
      spacer.style.display = "none";
      spacer.style.height = "0";
    }
  }

  function applyHidden(): void {
    headerEl.style.transform = "translateY(-100%)";
    headerEl.style.opacity = "0";
    headerEl.classList.add(opts.hiddenClass);
  }

  function applyRevealed(): void {
    headerEl.style.transform = "translateY(0)";
    headerEl.style.opacity = "1";
    headerEl.classList.remove(opts.hiddenClass);
  }

  // Scroll listener with rAF throttle
  let ticking = false;
  function onScroll(): void {
    if (!ticking) {
      requestAnimationFrame(() => { update(); ticking = false; });
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  // Initial state
  update();

  return {
    element: headerEl,

    isStuck() { return isStuckState; },

    isHidden() { return isHiddenState; },

    setBehavior(behavior: StickyBehavior) {
      opts.behavior = behavior;
      if (behavior === "always" && isHiddenState) {
        isHiddenState = false;
        applyRevealed();
      }
    },

    destroy() {
      destroyed = true;
      window.removeEventListener("scroll", onScroll);
      headerEl.style.cssText = "";
      headerEl.classList.remove(opts.stuckClass, opts.hiddenClass);
      if (spacer) spacer.remove();
    },
  };
}
