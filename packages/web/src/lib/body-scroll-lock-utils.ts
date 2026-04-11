/**
 * Body Scroll Lock Utilities: High-level API for locking body scroll during
 * modals, drawers, and overlays. Supports nested locks, queue-based management,
 * scroll position restoration, and cross-browser compatibility including
 * iOS Safari edge cases.
 */

// --- Types ---

export interface BodyScrollLockOptions {
  /** Reserve scrollbar gap to prevent layout shift */
  reserveScrollBarGap?: boolean;
  /** Allow scrolling inside specific elements */
  allowScrollIn?: HTMLElement[];
  /** Callback when lock is applied */
  onLock?: () => void;
  /** Callback when unlock is called */
  onUnlock?: () => void;
}

interface LockEntry {
  id: string;
  options: Required<BodyScrollLockOptions>;
  unlock: () => void;
}

// --- State ---

let lockIdCounter = 0;
const activeLocks: LockEntry[] = [];
let originalBodyStyle: Record<string, string> = {};
let isLocked = false;

// --- Public API ---

/**
 * Lock body scroll. Multiple calls stack — each needs its own unlock.
 *
 * @returns Unlock function for this specific lock
 *
 * @example
 * ```ts
 * const unlock = lockBodyScroll();
 * // ... modal is open ...
 * unlock(); // unlocks only this lock
 * ```
 */
export function lockBodyScroll(options: BodyScrollLockOptions = {}): () => void {
  const id = `bsl-${++lockIdCounter}`;
  const opts: Required<BodyScrollLockOptions> = {
    reserveScrollBarGap: options.reserveScrollBarGap ?? true,
    allowScrollIn: options.allowScrollIn ?? [],
    onLock: options.onLock ?? (() => {}),
    onUnlock: options.onUnlock ?? (() => {}),
  };

  // First lock — save original styles and apply
  if (activeLocks.length === 0) {
    _applyBodyLock(opts);
    isLocked = true;
  }

  const entry: LockEntry = {
    id,
    options: opts,
    unlock: () => _removeLock(id),
  };

  activeLocks.push(entry);
  opts.onLock();

  return entry.unlock;
}

/**
 * Check if body scroll is currently locked.
 */
export function isBodyScrollLocked(): boolean {
  return isLocked && activeLocks.length > 0;
}

/** Get the number of active body scroll locks */
export function getBodyScrollLockCount(): number {
  return activeLocks.length;
}

/**
 * Force-unlock all body scroll locks. Use with caution as this will
 * release locks held by other code.
 */
export function forceUnlockAll(): void {
  while (activeLocks.length > 0) {
    const entry = activeLocks.pop()!;
    entry.options.onUnlock();
  }
  _restoreBodyStyles();
  isLocked = false;
}

// --- Internal ---

function _removeLock(id: string): void {
  const idx = activeLocks.findIndex((l) => l.id === id);
  if (idx === -1) return;

  const entry = activeLocks.splice(idx, 1)[0]!;

  // If no more locks, restore body
  if (activeLocks.length === 0) {
    _restoreBodyStyles();
    isLocked = false;
  } else {
    // Re-apply with the remaining locks' merged options
    const mergedOpts = _mergeOptions(activeLocks.map((l) => l.options));
    _applyBodyLock(mergedOpts);
  }

  entry.options.onUnlock();
}

function _applyBodyLock(options: Required<BodyScrollLockOptions>): void {
  const body = document.body;
  const html = document.documentElement;

  // Save original styles on first lock
  if (Object.keys(originalBodyStyle).length === 0) {
    originalBodyStyle = {
      overflow: body.style.overflow,
      overflowX: body.style.overflowX,
      overflowY: body.style.overflowY,
      paddingRight: body.style.paddingRight,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
      height: body.style.height,
      touchAction: html.style.touchAction,
    };
  }

  // Calculate scrollbar width
  let scrollbarWidth = 0;
  if (options.reserveScrollBarGap) {
    scrollbarWidth = _getScrollbarWidth();
  }

  // Apply lock styles
  body.style.overflow = "hidden";
  body.style.overflowX = "hidden";
  body.style.overflowY = "hidden";

  // Reserve gap
  if (scrollbarWidth > 0) {
    const currentPR = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${currentPR + scrollbarWidth}px`;
  }

  // Fix iOS: position fixed to prevent background scroll
  body.style.position = "fixed";
  body.style.top = `-${window.scrollY}px`;
  body.style.left = "0";
  body.style.width = "100%";
  body.style.height = "";

  // Lock touch action
  html.style.touchAction = "none";

  // Set up allowed scroll containers
  _setupAllowedScroll(options.allowScrollIn);
}

function _restoreBodyStyles(): void {
  const body = document.body;
  const html = document.documentElement;

  // Get current scroll position before restoring (for iOS fix)
  const scrollY = body.style.top ? -parseInt(body.style.top, 10) : 0;

  // Restore saved styles
  for (const [key, value] of Object.entries(originalBodyStyle)) {
    if (value === "") {
      body.style.removeProperty(key);
      if (key === "touchAction") html.style.removeProperty(key);
    } else {
      if (key === "touchAction") {
        html.style.touchAction = value;
      } else {
        (body.style as Record<string, string>)[key] = value;
      }
    }
  }

  // Restore scroll position (iOS fix)
  if (scrollY > 0) {
    window.scrollTo(0, scrollY);
  }

  originalBodyStyle = {};
  _cleanupAllowedScroll();
}

function _mergeOptions(optionsList: Required<BodyScrollLockOptions>[]): Required<BodyScrollLockOptions> {
  // Merge allowScrollIn arrays
  const allowScrollIn = optionsList.flatMap((o) => o.allowScrollIn);

  return {
    reserveScrollBarGap: optionsList.some((o) => o.reserveScrollBarGap),
    allowScrollIn,
    onLock: () => {},
    onUnlock: () => {},
  };
}

// --- Allowed Scroll Containers ---

let allowedScrollHandlers: { el: HTMLElement; fn: (e: Event) => void }[] = [];

function _setupAllowedScroll(allowedElements: HTMLElement[]): void {
  _cleanupAllowedScroll();

  for (const el of allowedElements) {
    const handler = (e: Event): void => {
      // Only prevent if the event target isn't inside an allowed container
      const target = e.target as HTMLElement;
      const isInsideAllowed = allowedElements.some(
        (allowed) => allowed.contains(target) || allowed === target,
      );
      if (!isInsideAllowed) {
        e.preventDefault();
      }
    };
    allowedScrollHandlers.push({ el, fn: handler });
    document.addEventListener("wheel", handler, { passive: false });
    document.addEventListener("touchmove", handler, { passive: false });
  }
}

function _cleanupAllowedScroll(): void {
  for (const { fn } of allowedScrollHandlers) {
    document.removeEventListener("wheel", fn);
    document.removeEventListener("touchmove", fn);
  }
  allowedScrollHandlers = [];
}

// --- Scrollbar Width ---

function _getScrollbarWidth(): number {
  if (typeof document === "undefined") return 0;

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

  return Math.max(width, 0);
}
