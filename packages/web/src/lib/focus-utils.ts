/**
 * Focus Utilities: Focus management, focus-visible detection, focus ring,
 * focus history, auto-focus strategies, and keyboard navigation helpers.
 */

// --- Types ---

export interface FocusRingOptions {
  /** Element to attach the focus ring to */
  element: HTMLElement;
  /** Ring color (default: #4f46e5) */
  color?: string;
  /** Ring width in px (default: 2) */
  width?: number;
  /** Ring offset/outline-offset in px (default: 2) */
  offset?: string;
  /** Border radius to match element (default: inherit) */
  borderRadius?: string;
  /** Animation duration in ms (default: 150) */
  duration?: number;
  /** Only show on keyboard focus (not mouse click)? */
  keyboardOnly?: boolean;
}

// --- Focus Detection ---

/** Check if an element currently has focus */
export function hasFocus(el: HTMLElement): boolean {
  return el === document.activeElement || el.contains(document.activeElement);
}

/** Check if any child of a container has focus */
export function hasFocusWithin(container: HTMLElement): boolean {
  return container.contains(document.activeElement);
}

/** Get the currently focused element */
export function getActiveElement(): HTMLElement | null {
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

/** Check if the user is using keyboard navigation (vs mouse/touch) */
let _usingKeyboard = false;

/** Track if last interaction was keyboard-based */
export function isKeyboardUser(): boolean {
  return _usingKeyboard;
}

/** Initialize keyboard detection listeners (call once at app startup) */
export function initKeyboardDetection(): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Tab" || e.key === "Arrow" + "" || e.key.startsWith("Arrow")) {
      _usingKeyboard = true;
    }
  };
  const onMouseDown = () => { _usingKeyboard = false; };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("mousedown", onMouseDown);

  return () => {
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("mousedown", onMouseDown);
  };
}

// --- Focus Ring ---

/**
 * Add a visible focus ring (outline replacement) to an element.
 * Uses CSS outline for performance with customizable appearance.
 *
 * @example
 * ```ts
 * const cleanup = addFocusRing(buttonEl, { color: "#3b82f6", width: 2 });
 * // Later: cleanup()
 * ```
 */
export function addFocusRing(options: FocusRingOptions): () => void {
  const {
    element,
    color = "#4f46e5",
    width = 2,
    offset = "2px",
    borderRadius,
    duration = 150,
    keyboardOnly = false,
  } = options;

  const originalOutline = element.style.outline;
  const originalOutlineOffset = element.style.outlineOffset;

  function apply(): void {
    if (keyboardOnly && !_usingKeyboard) return;
    element.style.outline = `${width}px solid ${color}`;
    element.style.outlineOffset = offset;
    if (borderRadius) element.style.borderRadius = borderRadius;
    element.style.transition = `outline-color ${duration}ms ease`;
  }

  function remove(): void {
    element.style.outline = originalOutline;
    element.style.outlineOffset = originalOutlineOffset;
  }

  element.addEventListener("focus", apply);
  element.addEventListener("blur", remove);

  return () => {
    element.removeEventListener("focus", apply);
    element.removeEventListener("blur", remove);
    remove();
  };
}

/** Apply focus rings to all focusable children of a container */
export function addFocusRings(
  container: HTMLElement,
  options?: Omit<FocusRingOptions, "element">,
): () => void {
  const cleanups: Array<() => void> = [];
  const focusable = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );

  for (const el of focusable) {
    cleanups.push(addFocusRing({ ...options!, element: el }));
  }

  return () => cleanups.forEach((fn) => fn());
}

// --- Focus Management ---

/** Focus an element with scroll prevention */
export function focus(el: HTMLElement | null, options?: { preventScroll?: boolean }): void {
  if (!el) return;
  el.focus({ preventScroll: options?.preventScroll ?? true });
}

/** Focus the first focusable child of a container */
export function focusFirst(container: HTMLElement): boolean {
  const focusable = getFocusableChildren(container);
  if (focusable.length === 0) return false;
  focus(focusable[0]);
  return true;
}

/** Focus the last focusable child of a container */
export function focusLast(container: HTMLElement): boolean {
  const focusable = getFocusableChildren(container);
  if (focusable.length === 0) return false;
  focus(focusable[focusable.length - 1]!);
  return true;
}

/** Get all focusable children of an element */
export function getFocusableChildren(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]:not([contenteditable="false"])',
  ].join(", ");

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(isVisible);
}

function isVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

/** Save current focus and restore it later */
export function saveFocus(): { restore: () => void } {
  const activeEl = document.activeElement as HTMLElement | null;
  return {
    restore: () => {
      if (activeEl && typeof activeEl.focus === "function") {
        activeEl.focus({ preventScroll: true });
      }
    },
  };
}

/** Temporarily move focus away and back (for screen reader announcements) */
export function announceToScreenReader(message: string): void {
  const liveRegion = document.createElement("div");
  liveRegion.setAttribute("role", "status");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.setAttribute("aria-atomic", "true");
  liveRegion.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;" +
    "clip:rect(0,0,0,0);white-space:nowrap;border:0;";
  liveRegion.textContent = message;
  document.body.appendChild(liveRegion);

  // Remove after announcement
  setTimeout(() => { liveRegion.remove(); }, 1000);
}

// --- Tab Index Management ---

/** Make all focusable children of a container focusable via Tab */
export function makeTabbable(container: HTMLElement, tabIndex = 0): void {
  const children = container.querySelectorAll<HTMLElement>(
    'a[href], button, input, select, textarea, [tabindex]',
  );
  for (const child of children) {
    if (!child.hasAttribute("tabindex") || child.getAttribute("tabindex") === "-1") {
      child.tabIndex = tabIndex;
    }
  }
}

/** Make elements unfocusable via Tab (but still programmatically focusable) */
export function makeUntabbable(container: HTMLElement): void {
  const children = container.querySelectorAll<HTMLElement>("[tabindex]");
  for (const child of children) {
    child.setAttribute("data-prev-tabindex", String(child.tabIndex));
    child.tabIndex = -1;
  }
}

/** Restore previous tab indices after makeUntabbable */
export function restoreTabbable(container: HTMLElement): void {
  const children = container.querySelectorAll<HTMLElement>("[data-prev-tabindex]");
  for (const child of children) {
    const prev = child.getAttribute("data-prev-tabindex");
    child.tabIndex = Number(prev ?? "-1");
    child.removeAttribute("data-prev-tabindex");
  }
}

// --- Sequential Focus Navigation ---

/**
 * Create arrow-key navigation within a list/grid of items.
 * Up/down/left/right arrows move focus between items.
 */
export function createArrowNavigation(
  container: HTMLElement,
  options?: {
    itemsSelector?: string;
    columns?: number; // For grid layout (auto-detect if omitted)
    loop?: boolean;
    onNavigate?: (from: HTMLElement, to: HTMLElement, direction: string) => void;
  },
): () => void {
  const { itemsSelector = "[data-nav-item]", columns: cols, loop = true, onNavigate } = options ?? {};

  let items: HTMLElement[] = [];

  function refreshItems(): void {
    items = Array.from(container.querySelectorAll<HTMLElement>(itemsSelector));
  }

  refreshItems();

  // Use MutationObserver to handle dynamic item changes
  const observer = new MutationObserver(refreshItems);
  observer.observe(container, { childList: true, subtree: true });

  function getCurrentIndex(): number {
    return items.indexOf(document.activeElement as HTMLElement);
  }

  function navigate(direction: "up" | "down" | "left" | "right"): void {
    const idx = getCurrentIndex();
    if (idx < 0) { focusFirst(container); return; }

    const columns = cols ?? detectColumns(items);
    let nextIdx: number;

    switch (direction) {
      case "up":
        nextIdx = idx - columns;
        break;
      case "down":
        nextIdx = idx + columns;
        break;
      case "left":
        nextIdx = idx - 1;
        break;
      case "right":
        nextIdx = idx + 1;
        break;
    }

    // Wrap around
    if (loop) {
      if (nextIdx < 0) nextIdx += items.length;
      if (nextIdx >= items.length) nextIdx -= items.length;
    } else {
      nextIdx = Math.max(0, Math.min(items.length - 1, nextIdx));
    }

    if (nextIdx >= 0 && nextIdx < items.length && nextIdx !== idx) {
      const from = items[idx]!;
      const to = items[nextIdx]!;
      onNavigate?.(from, to, direction);
      focus(to);
    }
  }

  const handler = (e: KeyboardEvent): void => {
    switch (e.key) {
      case "ArrowUp": e.preventDefault(); navigate("up"); break;
      case "ArrowDown": e.preventDefault(); navigate("down"); break;
      case "ArrowLeft": e.preventDefault(); navigate("left"); break;
      case "ArrowRight": e.preventDefault(); navigate("right"); break;
    }
  };

  container.addEventListener("keydown", handler);

  return () => {
    container.removeEventListener("keydown", handler);
    observer.disconnect();
  };
}

function detectColumns(items: HTMLElement[]): number {
  if (items.length <= 1) return 1;
  const firstTop = items[0]?.getBoundingClientRect().top;
  let count = 1;
  for (let i = 1; i < items.length; i++) {
    if (Math.abs(items[i]!.getBoundingClientRect().top - firstTop!) > 2) break;
    count++;
  }
  return count;
}
