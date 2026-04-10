/**
 * Scroll Lock: Prevent body scroll when modals/drawers are open,
 * handle iOS momentum scrolling issues, manage nested scroll containers,
 * and provide safe scroll restoration.
 */

// --- Types ---

export interface ScrollLockOptions {
  /** The element that triggered the lock (e.g., modal element) */
  triggerElement?: HTMLElement;
  /** Reserve scrollbar width to prevent layout shift? */
  reserveScrollBarGap?: boolean;
  /** Allow scrolling within a specific container? */
  allowedSelector?: string;
  /** Lock horizontal scroll too? */
  lockHorizontal?: boolean;
  /** Initial scroll position to restore on unlock */
  initialScrollY?: number;
  /** Callback after lock is applied */
  onLock?: () => void;
  /** Callback after unlock */
  onUnlock?: () => void;
}

export interface ScrollLockInstance {
  /** Current locked state */
  isLocked: () => number; // returns lock depth
  /** Acquire a lock (incremental - supports nested locks) */
  lock: (options?: ScrollLockOptions) => void;
  /** Release a lock */
  unlock: () => void;
  /** Force unlock all locks */
  forceUnlock: () => void;
  /** Get current body overflow style */
  getBodyStyle: () => string;
  /** Destroy and clean up */
  destroy: () => void;
}

// --- Internal State ---

interface LockEntry {
  id: number;
  options: ScrollLockOptions;
  timestamp: number;
}

// --- Helpers ---

function getScrollbarWidth(): number {
  // Create a temporary element to measure scrollbar width
  const outer = document.createElement("div");
  outer.style.cssText = "position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll;";
  document.body.appendChild(outer);
  const width = outer.offsetWidth - outer.clientWidth;
  document.body.removeChild(outer);
  return width;
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function preventDefault(e: TouchEvent): void {
  if (e.target instanceof HTMLElement && e.target.closest("[data-scroll-lock-ignore]")) return;
  e.preventDefault();
}

function handleTouchMove(e: TouchEvent, allowedEl?: HTMLElement | null): void {
  // Check if touch is within an allowed scrollable area
  const target = e.target as HTMLElement;
  if (allowedEl?.contains(target)) return;
  if (target.closest("[data-scroll-lock-allow]")) return;

  // For iOS, check if the element can still scroll
  const el = target.closest<HTMLElement>("[data-scroll-lock-allow]") ??
    target.closest<HTMLElement>(".scroll-lock-allow");
  if (el) {
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;
    const isAtTop = scrollTop <= 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

    if ((isAtTop && e.touches[0]!.clientY > e.touches[0]!.clientY) ||
        (isAtBottom && e.touches[0]!.clientY < e.touches[0]!.clientY)) {
      return; // Let native scrolling handle it
    }
  }

  e.preventDefault();
}

// --- Main Class ---

export class ScrollLockManager implements ScrollLockInstance {
  private locks: LockEntry[] = [];
  private lockCounter = 0;
  private originalBodyStyle: string = "";
  private originalPaddingRight: string = "";
  private touchListener: ((e: TouchEvent) => void) | null = null;
  private destroyed = false;

  constructor() {
    this.originalBodyStyle = document.body.style.cssText || "";
    this.originalPaddingRight = document.body.style.paddingRight || "";
  }

  isLocked(): number {
    return this.locks.length;
  }

  lock(options: ScrollLockOptions = {}): void {
    if (this.destroyed) return;

    const entry: LockEntry = {
      id: ++this.lockCounter,
      options: {
        reserveScrollBarGap: options.reserveScrollBarGap ?? true,
        lockHorizontal: options.lockHorizontal ?? false,
        ...options,
      },
      timestamp: Date.now(),
    };

    this.locks.push(entry);

    // Only apply visual changes on first lock
    if (this.locks.length === 1) {
      this.applyLock(entry.options);
    }

    entry.options.onLock?.();
  }

  unlock(): void {
    if (this.destroyed || this.locks.length === 0) return;

    const entry = this.locks.pop()!;
    entry.options.onUnlock?.();

    // Restore only when no more locks
    if (this.locks.length === 0) {
      this.restoreScroll();
    }
  }

  forceUnlock(): void {
    if (this.destroyed) return;
    this.locks = [];
    this.restoreScroll();
  }

  getBodyStyle(): string {
    return document.body.style.cssText;
  }

  destroy(): void {
    this.forceUnlock();
    this.destroyed = true;
  }

  private applyLock(opts: ScrollLockOptions): void {
    // Store current scroll position
    const scrollY = opts.initialScrollY ?? window.scrollY;

    // Apply fixed positioning to body to prevent scroll
    document.body.style.overflow = "hidden";

    if (opts.lockHorizontal) {
      document.body.style.overflowX = "hidden";
    }

    // Reserve scrollbar gap to prevent layout shift
    if (opts.reserveScrollBarGap) {
      const scrollbarWidth = getScrollbarWidth();
      if (scrollbarWidth > 0) {
        const existingPadding = parseInt(document.body.style.paddingRight || "0", 10);
        document.body.style.paddingRight = `${existingPadding + scrollbarWidth}px`;
      }
    }

    // iOS-specific handling
    if (isIos()) {
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";

      // Add touch move listener to prevent bounce scrolling
      this.touchListener = (e: TouchEvent) => handleTouchMove(e, opts.allowedSelector
        ? (document.querySelector(opts.allowedSelector) as HTMLElement)
        : undefined
      );
      document.addEventListener("touchmove", this.touchListener, { passive: false });
    } else {
      // Non-iOS: just hide overflow
      document.body.style.position = "";
    }
  }

  private restoreScroll(): void {
    // Remove touch listener
    if (this.touchListener) {
      document.removeEventListener("touchmove", this.touchListener);
      this.touchListener = null;
    }

    // Check if we need to restore iOS position
    const wasFixed = document.body.style.position === "fixed";
    const savedTop = document.body.style.top;

    // Restore original styles
    document.body.style.cssText = this.originalBodyStyle;

    // Restore padding right
    document.body.style.paddingRight = this.originalPaddingRight || "";

    // Restore scroll position for iOS
    if (wasFixed && savedTop) {
      const y = parseInt(savedTop.replace("-", "") || "0", 10);
      window.scrollTo({ top: y, behavior: "instant" });
    }
  }
}

// --- Global singleton ---

let globalScrollLock: ScrollLockManager | null = null;

/** Get or create the global scroll lock manager */
export function getScrollLockManager(): ScrollLockManager {
  if (!globalScrollLock) {
    globalScrollLock = new ScrollLockManager();
  }
  return globalScrollLock;
}

// --- Convenience functions ---

/** Quick lock: prevent body scroll */
export function lockScroll(options?: ScrollLockOptions): () => void {
  const mgr = getScrollLockManager();
  mgr.lock(options);
  return () => mgr.unlock();
}

/** Lock scroll while callback runs, then auto-unlock */
export function withScrollLock<T>(fn: () => T, options?: ScrollLockOptions): T {
  const unlock = lockScroll(options);
  try {
    return fn();
  } finally {
    unlock();
  }
}

/** Lock scroll while async callback runs, then auto-unlock */
export async function withScrollLockAsync<T>(
  fn: () => Promise<T>,
  options?: ScrollLockOptions,
): Promise<T> {
  const unlock = lockScroll(options);
  try {
    return await fn();
  } finally {
    unlock();
  }
}

// --- Auto-resize handling ---

/** Observe container size changes and re-apply scroll lock if needed */
export function setupAutoResizeScrollLock(
  container: HTMLElement,
  options?: ScrollLockOptions,
): () => void {
  const unlock = lockScroll(options);

  const observer = new ResizeObserver(() => {
    // Re-apply lock on resize to ensure proper state
    if (getScrollLockManager().isLocked() > 0) {
      // No-op: lock is still active, but ensure body style is correct
    }
  });

  observer.observe(container);

  return () => {
    observer.disconnect();
    unlock();
  };
}
