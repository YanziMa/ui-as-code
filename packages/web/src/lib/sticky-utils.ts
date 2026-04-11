/**
 * Sticky Utilities: Enhanced sticky positioning with scroll-aware behavior,
 * sticky headers/footers, container-constrained sticking, z-index stacking,
 * sticky state callbacks, and polyfill-style fallback for older browsers.
 */

// --- Types ---

export type StickyPosition = "top" | "bottom";
export type StickyBehavior = "native" | "fixed" | "hybrid";

export interface StickyOptions {
  /** The element to make sticky */
  target: HTMLElement;
  /** Stick to top or bottom. Default "top" */
  position?: StickyPosition;
  /** Offset from viewport edge in px. Default 0 */
  offset?: number;
  /** Container element for constrained sticking (null = viewport) */
  container?: HTMLElement | null;
  /** Z-index when stuck. Default 100 */
  zIndex?: number;
  /** Class added when stuck */
  stuckClass?: string;
  /** Class added when unstuck */
  unstuckClass?: string;
  /** Use native position:sticky, JS fixed, or hybrid. Default "hybrid" */
  behavior?: StickyBehavior;
  /** Minimum width when stuck (px) */
  minWidth?: number;
  /** Called when element becomes stuck */
  onStuck?: () => void;
  /** Called when element becomes unstuck */
  onUnstuck?: () => void;
  /** Called on every scroll with current state */
  onScroll?: (isStuck: boolean, scrollY: number) => void;
}

export interface StickyInstance {
  /** The target element */
  target: HTMLElement;
  /** Check if currently stuck */
  isStuck: () => boolean;
  /** Force recalculation */
  update: () => void;
  /** Change offset dynamically */
  setOffset: (offset: number) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

/**
 * Create a sticky element with enhanced scroll-aware behavior.
 *
 * @example
 * ```ts
 * const sticky = createSticky({
 *   target: headerEl,
 *   position: "top",
 *   offset: 60,
 *   container: sidebarEl,
 *   onStuck: () => console.log("Header stuck!"),
 * });
 * ```
 */
export function createSticky(options: StickyOptions): StickyInstance {
  const {
    target,
    position = "top",
    offset = 0,
    container = null,
    zIndex = 100,
    stuckClass = "is-stuck",
    unstuckClass = "",
    behavior = "hybrid",
    minWidth,
    onStuck,
    onUnstuck,
    onScroll,
  } = options;

  let _isStuck = false;
  let _currentOffset = offset;
  let cleanupFns: Array<() => void> = [];
  let rafId: number | null = null;

  // Save original styles
  const originalStyles = {
    position: target.style.position,
    top: target.style.top,
    bottom: target.style.bottom,
    left: target.style.left,
    width: target.style.width,
    zIndex: target.style.zIndex,
    transition: target.style.transition,
  };

  // Check if browser supports position:sticky natively
  const supportsSticky = CSS.supports?.("position", "sticky") ?? false;

  // --- Detection Logic ---

  function checkSticky(): boolean {
    if (!target.isConnected) return false;

    const rect = target.getBoundingClientRect();
    const viewH = window.innerHeight;

    if (position === "top") {
      // Stuck when element's top reaches the offset from viewport top
      if (container && container !== document.body) {
        const containerRect = container.getBoundingClientRect();
        return rect.top <= (_currentOffset + containerRect.top);
      }
      return rect.top <= _currentOffset;
    } else {
      // Bottom-stuck when element's bottom reaches offset from viewport bottom
      if (container && container !== document.body) {
        const containerRect = container.getBoundingClientRect();
        return rect.bottom >= (containerRect.bottom - _currentOffset);
      }
      return rect.bottom >= (viewH - _currentOffset);
    }
  }

  function applyStuck(): void {
    if (_isStuck) return;
    _isStuck = true;

    if (behavior === "native" && supportsSticky) {
      // Native sticky — just add class
      target.classList.add(stuckClass);
      if (unstuckClass) target.classList.remove(unstuckClass);
      target.style.zIndex = String(zIndex);
    } else {
      // Fixed/hybrid mode — apply fixed positioning
      target.style.position = "fixed";

      if (position === "top") {
        target.style.top = `${_currentOffset}px`;
        target.style.bottom = "";
      } else {
        target.style.bottom = `${_currentOffset}px`;
        target.style.top = "";
      }

      target.style.left = ""; // Will be set by width calc
      target.style.zIndex = String(zIndex);

      // Match width to original or container
      if (minWidth) {
        target.style.minWidth = `${minWidth}px`;
      }

      target.classList.add(stuckClass);
      if (unstuckClass) target.classList.remove(unstuckClass);
    }

    onStuck?.();
  }

  function applyUnstuck(): void {
    if (!_isStuck) return;
    _isStuck = false;

    if (behavior === "native" && supportsSticky) {
      target.classList.remove(stuckClass);
      if (unstuckClass) target.classList.add(unstuckClass);
    } else {
      // Restore original positioning
      target.style.position = originalStyles.position || "";
      target.style.top = originalStyles.top || "";
      target.style.bottom = originalStyles.bottom || "";
      target.style.left = originalStyles.left || "";
      target.style.width = originalStyles.width || "";
      target.style.zIndex = originalStyles.zIndex || "";

      target.classList.remove(stuckClass);
      if (unstuckClass) target.classList.add(unstuckClass);
    }

    onUnstuck?.();
  }

  // --- Scroll Handler ---

  const handleScroll = (): void => {
    if (rafId !== null) return; // Already scheduled

    rafId = requestAnimationFrame(() => {
      rafId = null;
      const shouldStick = checkSticky();

      if (shouldStick && !_isStuck) {
        applyStuck();
      } else if (!shouldStick && _isStuck) {
        applyUnstuck();
      }

      onScroll?.(_isStuck, window.scrollY);
    });
  };

  // --- Setup ---

  function setup(): void {
    if (behavior === "native" && supportsSticky) {
      // Use CSS position:sticky as base
      target.style.position = "sticky";
      if (position === "top") {
        target.style.top = `${_currentOffset}px`;
      } else {
        target.style.bottom = `${_currentOffset}px`;
      }
      target.style.zIndex = String(zIndex);
    }

    // Always listen for scroll for state tracking + callbacks
    window.addEventListener("scroll", handleScroll, { passive: true });
    cleanupFns.push(() => window.removeEventListener("scroll", handleScroll));

    // Also observe container scroll if provided
    if (container && container !== document.body) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      cleanupFns.push(() => container.removeEventListener("scroll", handleScroll));
    }

    // Initial check
    handleScroll();
  }

  setup();

  // --- API ---

  function isStuck(): boolean { return _isStuck; }

  function update(): void {
    handleScroll();
  }

  function setOffset(newOffset: number): void {
    _currentOffset = newOffset;
    if (behavior === "native" && supportsSticky) {
      if (position === "top") {
        target.style.top = `${_currentOffset}px`;
      } else {
        target.style.bottom = `${_currentOffset}px`;
      }
    }
    update();
  }

  function destroy(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
    if (rafId !== null) cancelAnimationFrame(rafId);

    // Restore original styles
    target.style.position = originalStyles.position || "";
    target.style.top = originalStyles.top || "";
    target.style.bottom = originalStyles.bottom || "";
    target.style.left = originalStyles.left || "";
    target.style.width = originalStyles.width || "";
    target.style.zIndex = originalStyles.zIndex || "";
    target.classList.remove(stuckClass, unstuckClass);
  }

  return { target, isStuck, update, setOffset, destroy };
}

// --- Stack Manager ---

/**
 * Manage multiple sticky elements with proper z-index stacking.
 * Ensures that later stickies stack above earlier ones correctly.
 *
 * @example
 * ```ts
 * const manager = createStickyStack({ baseZIndex: 100 });
 * manager.add(header1, { position: "top", offset: 0 });
 * manager.add(header2, { position: "top", offset: 50 });
 * ```
 */
export interface StickyStackOptions {
  /** Base z-index for the first sticky */
  baseZIndex?: number;
  /** Gap between stacked z-indices */
  zIndexGap?: number;
}

export interface StickyStackInstance {
  /** Add a sticky element to the stack */
  add: (target: HTMLElement, opts?: Partial<StickyOptions>) => StickyInstance;
  /** Remove a sticky element from the stack */
  remove: (target: HTMLElement) => void;
  /** Get all managed instances */
  getInstances: () => StickyInstance[];
  /** Destroy all */
  destroyAll: () => void;
}

export function createStickyStack(options: StickyStackOptions = {}): StickyStackInstance {
  const { baseZIndex = 100, zIndexGap = 10 } = options;
  const instances = new Map<HTMLElement, StickyInstance>();

  function add(target: HTMLElement, opts?: Partial<StickyOptions>): StickyInstance {
    // Remove existing if any
    remove(target);

    const idx = instances.size;
    const instance = createSticky({
      target,
      ...opts,
      zIndex: (opts?.zIndex ?? baseZIndex) + idx * zIndexGap,
    });

    instances.set(target, instance);
    return instance;
  }

  function remove(target: HTMLElement): void {
    const existing = instances.get(target);
    if (existing) {
      existing.destroy();
      instances.delete(target);
    }
  }

  function getInstances(): StickyInstance[] {
    return Array.from(instances.values());
  }

  function destroyAll(): void {
    for (const inst of instances.values()) inst.destroy();
    instances.clear();
  }

  return { add, remove, getInstances, destroyAll };
}
