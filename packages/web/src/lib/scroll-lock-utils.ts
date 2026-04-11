/**
 * Scroll Lock Utilities: Prevent body/element scroll for modals, drawers,
 * and overlays. Handles iOS momentum scrolling, nested scroll containers,
 * scroll position preservation, touch-action management, and multiple
 * concurrent lockers with reference counting.
 */

// --- Types ---

export interface ScrollLockOptions {
  /** Element to lock (default: document.body) */
  target?: HTMLElement;
  /** Reserve space for scrollbar to prevent layout shift */
  reserveScrollBarGap?: boolean;
  /** Allow vertical scroll inside locked area */
  allowVerticalScroll?: boolean;
  /** Allow horizontal scroll inside locked area */
  allowHorizontalScroll?: boolean;
  /** Lock touch action as well */
  lockTouchAction?: boolean;
  /** Called when a scroll attempt is prevented */
  onPreventScroll?: (e: Event) => void;
}

export interface ScrollLockInstance {
  /** The locked element */
  element: HTMLElement;
  /** Original overflow style */
  originalOverflow: string;
  /** Original overflow-y style */
  originalOverflowY: string;
  /** Original padding-right */
  originalPaddingRight: string;
  /** Whether this instance is active */
  active: boolean;
}

// --- Reference Counter ---

const activeLocks = new Set<ScrollLockInstance>();

/** Get the current number of active locks */
export function getActiveLockCount(): number {
  return activeLocks.size;
}

/** Check if any scroll lock is currently active */
export function isScrollLocked(): boolean {
  return activeLocks.size > 0;
}

// --- Core Lock/Unlock ---

/**
 * Lock scroll on an element (defaults to body).
 * Uses reference counting — calling lock() twice requires unlock() twice.
 *
 * @returns An unlock function
 */
export function lockScroll(options: ScrollLockOptions = {}): () => void {
  const {
    target,
    reserveScrollBarGap = true,
    allowVerticalScroll = false,
    allowHorizontalScroll = false,
    lockTouchAction = true,
    onPreventScroll,
  } = options;

  const el = target ?? document.body;

  // Capture original styles
  const instance: ScrollLockInstance = {
    element: el,
    originalOverflow: el.style.overflow,
    originalOverflowY: el.style.overflowY,
    originalPaddingRight: el.style.paddingRight,
    active: true,
  };

  // Calculate scrollbar width if reserving gap
  let scrollbarWidth = 0;
  if (reserveScrollBarGap && el === document.body) {
    scrollbarWidth = getScrollbarWidth();
  }

  // Apply lock styles
  el.style.overflow = "hidden";
  if (!allowVerticalScroll && !allowHorizontalScroll) {
    el.style.overflowY = "hidden";
  } else if (allowVerticalScroll && !allowHorizontalScroll) {
    el.style.overflowY = "auto";
    el.style.overflowX = "hidden";
  } else if (!allowVerticalScroll && allowHorizontalScroll) {
    el.style.overflowY = "hidden";
    el.style.overflowX = "auto";
  }

  // Reserve scrollbar gap to prevent layout shift
  if (scrollbarWidth > 0) {
    const currentPR = parseFloat(getComputedStyle(el).paddingRight) || 0;
    el.style.paddingRight = `${currentPR + scrollbarWidth}px`;
  }

  // Lock touch action on body
  if (lockTouchAction && el === document.body) {
    document.documentElement.style.touchAction = "none";
  }

  // Add touch/mousewheel prevention for iOS
  const preventHandler = (e: Event): void => {
    if (allowVerticalScroll && e.type === "touchmove") return;
    if (allowHorizontalScroll && e.type === "wheel" && (e as WheelEvent).deltaX !== 0) return;

    e.preventDefault();
    onPreventScroll?.(e);
  };

  if (el === document.body) {
    document.addEventListener("touchmove", preventHandler, { passive: false });
    document.addEventListener("wheel", preventHandler, { passive: false });
  }

  activeLocks.add(instance);

  // Return unlock function
  return () => {
    if (!instance.active) return;
    instance.active = false;
    activeLocks.delete(instance);

    // Only restore styles if no other locks exist on this element
    const hasOtherLocks = Array.from(activeLocks).some((l) => l.element === el);

    if (!hasOtherLocks) {
      el.style.overflow = instance.originalOverflow;
      el.style.overflowY = instance.originalOverflowY;
      el.style.paddingRight = instance.originalPaddingRight;

      if (lockTouchAction && el === document.body) {
        document.documentElement.style.touchAction = "";
      }
    }

    // Remove event listeners
    if (el === document.body) {
      document.removeEventListener("touchmove", preventHandler);
      document.removeEventListener("wheel", preventHandler);
    }
  };
}

/**
 * Unlock all active scroll locks. Use with caution — this will unlock
 * locks created by other code too.
 */
export function unlockAllScroll(): void {
  const instances = Array.from(activeLocks);
  for (const inst of instances) {
    inst.active = false;
    inst.element.style.overflow = inst.originalOverflow;
    inst.element.style.overflowY = inst.originalOverflowY;
    inst.element.style.paddingRight = inst.originalPaddingRight;
  }
  activeLocks.clear();

  // Restore touch action
  document.documentElement.style.touchAction = "";
}

// --- Scrollbar Width Detection ---

let cachedScrollbarWidth: number | null = null;

/** Measure the width of the browser's scrollbar */
export function getScrollbarWidth(): number {
  if (cachedScrollbarWidth !== null) return cachedScrollbarWidth;

  if (typeof document === "undefined") return 0;

  // Create a measurement element
  const outer = document.createElement("div");
  outer.style.cssText =
    "position:absolute;top:-9999px;width:100px;height:100px;" +
    "overflow:scroll;visibility:hidden;";
  document.body.appendChild(outer);

  const inner = document.createElement("div");
  inner.style.cssText = "width:100%;height:100%;";
  outer.appendChild(inner);

  const width = outer.offsetWidth - inner.clientWidth;
  outer.remove();

  cachedScrollbarWidth = width;
  return width;
}

/** Clear the cached scrollbar width (call after window resize) */
export function clearScrollbarCache(): void {
  cachedScrollbarWidth = null;
}

// --- Scroll Position Preservation ---

/** Save the current scroll position of window or element */
export function saveScrollPosition(el: HTMLElement | Window = window): { x: number; y: number } {
  if (el === window) {
    return { x: window.scrollX, y: window.scrollY };
  }
  const htmlEl = el as HTMLElement;
  return { x: htmlEl.scrollLeft, y: htmlEl.scrollTop };
}

/** Restore a previously saved scroll position */
export function restoreScrollPosition(
  pos: { x: number; y: number },
  el: HTMLElement | Window = window,
): void {
  if (el === window) {
    window.scrollTo(pos.x, pos.y);
  } else {
    (el as HTMLElement).scrollLeft = pos.x;
    (el as HTMLElement).scrollTop = pos.y;
  }
}

// --- iOS Momentum Scroll Handling ---

/**
 * Lock scroll with special handling for iOS Safari's momentum scrolling.
 * This is needed because iOS doesn't respect `overflow: hidden` on body
 * when the user is in the middle of a momentum scroll.
 */
export function lockScrollIOS(options?: Omit<ScrollLockOptions, "target"> & { target?: HTMLElement }): () => void {
  const unlock = lockScroll({
    ...options,
    target: options?.target ?? document.body,
  });

  // Additional iOS-specific handling
  let startY = 0;
  let startX = 0;

  const touchStart = (e: TouchEvent) => {
    startY = e.touches[0]!.clientY;
    startX = e.touches[0]!.clientX;
  };

  const touchMove = (e: TouchEvent): void => {
    const el = options?.target ?? document.body;
    const target = e.target as HTMLElement;

    // Allow scrolling if the target is a scrollable container
    if (isScrollable(target)) {
      const rect = target.getBoundingClientRect();
      const deltaY = e.touches[0]!.clientY - startY;
      const deltaX = e.touches[0]!.clientX - startX;

      // At top and trying to scroll up
      if (target.scrollTop <= 0 && deltaY > 0) {
        e.preventDefault();
      }
      // At bottom and trying to scroll down
      else if (
        target.scrollTop + target.clientHeight >= target.scrollHeight - 1 &&
        deltaY < 0
      ) {
        e.preventDefault();
      }
      // Horizontal bounds
      else if (target.scrollLeft <= 0 && deltaX > 0) {
        e.preventDefault();
      } else if (
        target.scrollLeft + target.clientWidth >= target.scrollWidth - 1 &&
        deltaX < 0
      ) {
        e.preventDefault();
      }

      return;
    }

    e.preventDefault();
  };

  document.addEventListener("touchstart", touchStart, { passive: true });
  document.addEventListener("touchmove", touchMove, { passive: false });

  return () => {
    unlock();
    document.removeEventListener("touchstart", touchStart);
    document.removeEventListener("touchmove", touchMove);
  };
}

/** Check if an element has scrollable content */
function isScrollable(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  return (
    (style.overflowY === "auto" || style.overflowY === "scroll") &&
    el.scrollHeight > el.clientHeight
  ) || (
    (style.overflowX === "auto" || style.overflowX === "scroll") &&
    el.scrollWidth > el.clientWidth
  );
}
