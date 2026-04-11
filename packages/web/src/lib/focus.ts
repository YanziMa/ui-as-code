/**
 * Focus management: focus trap, focus ring styling, auto-focus,
 * restore focus, tab order management, visible focus indicators,
 * and skip-to-content links.
 */

// --- Types ---

export interface FocusTrapOptions {
  /** Container element to trap focus within */
  container: HTMLElement;
  /** Enable initially? (default: true) */
  active?: boolean;
  /** Return focus to this element on deactivate */
  returnFocusTo?: HTMLElement;
  /** Include container itself in tab order? */
  includeContainer?: boolean;
  /** Allow Escape key to deactivate? */
  escapeDeactivates?: boolean;
  /** Callback on activate */
  onActivate?: () => void;
  /** Callback on deactivate */
  onDeactivate?: () => void;
  /** Initial element to focus */
  initialFocus?: HTMLElement | string;
}

export interface FocusTrapInstance {
  /** Activate the trap */
  activate: () => void;
  /** Deactivate the trap */
  deactivate: () => void;
  /** Check if currently active */
  isActive: () => void;
  /** Update the container (e.g., after DOM changes) */
  updateContainerElements: () => void;
  /** Destroy completely */
  destroy: () => void;
}

export interface FocusRingOptions {
  /** Offset from the element in px (default: 2) */
  offset?: number;
  /** Border radius (default: inherit from element) */
  borderRadius?: string;
  /** Ring color (default: currentColor at 30% opacity) */
  color?: string;
  /** Ring width in px (default: 2) */
  width?: number;
  /** Show ring only on keyboard navigation (not mouse click)? */
  showOnlyOnKeyboard?: boolean;
  /** Custom CSS class instead of inline styles */
  className?: string;
}

export interface SkipLinkOptions {
  /** Target element ID or selector */
  target: string;
  /** Link text (default: "Skip to main content") */
  text?: string;
  /** Custom class name */
  className?: string;
  /** Insert at start of body automatically? */
  autoInsert?: boolean;
}

// --- Focus Trap ---

/** Create a focus trap within a container */
export function createFocusTrap(options: FocusTrapOptions): FocusTrapInstance {
  const {
    container,
    active = true,
    includeContainer = false,
    escapeDeactivates = true,
    initialFocus,
  } = options;

  let isActiveState = active;
  let previouslyFocused: HTMLElement | null = null;
  let destroyed = false;

  function getFocusableElements(): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(", ");

    const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));

    if (includeContainer && container.matches(selector)) {
      elements.unshift(container);
    }

    return elements.filter((el) => {
      // Filter out hidden elements
      const style = window.getComputedStyle(el);
      return style.display !== "none" &&
             style.visibility !== "hidden" &&
             style.visibility !== "collapse" &&
             el.offsetParent !== null; // Not in a hidden ancestor
    });
  }

  function getFirstFocusable(): HTMLElement | null {
    if (initialFocus) {
      if (typeof initialFocus === "string") {
        const el = container.querySelector<HTMLElement>(initialFocus);
        if (el) return el;
      } else if (container.contains(initialFocus)) {
        return initialFocus;
      }
    }

    const elements = getFocusableElements();
    return elements[0] ?? null;
  }

  function getLastFocusable(): HTMLElement | null {
    const elements = getFocusableElements();
    return elements[elements.length - 1] ?? null;
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (!isActiveState || destroyed) return;

    if (e.key === "Escape" && escapeDeactivates) {
      e.preventDefault();
      deactivate();
      return;
    }

    if (e.key !== "Tab") return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    if (e.shiftKey) {
      // Shift+Tab: wrap to last
      if (document.activeElement === first || !container.contains(document.activeElement)) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      }
    } else {
      // Tab: wrap to first
      if (document.activeElement === last || !container.contains(document.activeElement)) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    }
  }

  function activate(): void {
    if (isActiveState || destroyed) return;
    isActiveState = true;
    previouslyFocused = document.activeElement as HTMLElement;
    document.addEventListener("keydown", handleKeyDown);

    const first = getFirstFocusable();
    if (first) first.focus({ preventScroll: true });

    options.onActivate?.();
  }

  function deactivate(): void {
    if (!isActiveState || destroyed) return;
    isActiveState = false;
    document.removeEventListener("keydown", handleKeyDown);

    const returnEl = options.returnFocusTo ?? previouslyFocused;
    if (returnEl?.focus) {
      returnEl.focus({ preventScroll: true });
    }

    options.onDeactivate?.();
  }

  // Auto-activate
  if (active) activate();

  return {
    activate,
    deactivate,
    isActive: () => { /* no-op for compat */ },
    updateContainerElements() {
      // Re-scan for focusable elements on next tick
      requestAnimationFrame(() => {
        if (isActiveState && !destroyed) {
          const focused = document.activeElement;
          if (!focused || !container.contains(focused)) {
            const first = getFirstFocusable();
            if (first) first.focus({ preventScroll: true });
          }
        }
      });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      deactivate();
    },
  };
}

// --- Focus Ring Styling ---

/** Apply visible focus ring styling to an element */
export function applyFocusRing(element: HTMLElement, options: FocusRingOptions = {}): () => void {
  const {
    offset = 2,
    width = 2,
    color = undefined,
    showOnlyOnKeyboard = true,
    className,
  } = options;

  let isKeyboardNav = false;
  let originalOutline = element.style.outline;
  let originalOutlineOffset = element.style.outlineOffset;

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "Tab") isKeyboardNav = true;
  }

  function handleMouseDown(): void {
    isKeyboardNav = false;
    removeRing();
  }

  function addRing(): void {
    if (className) {
      element.classList.add(className);
    } else {
      element.style.outline = `${width}px solid ${color ?? "currentColor"}`;
      element.style.outlineOffset = `${offset}px`;
    }
  }

  function removeRing(): void {
    if (className) {
      element.classList.remove(className);
    } else {
      element.style.outline = originalOutline;
      element.style.outlineOffset = originalOutlineOffset;
    }
  }

  function handleFocus(): void {
    if (!showOnlyOnKeyboard || isKeyboardNav) {
      addRing();
    }
  }

  function handleBlur(): void {
    removeRing();
  }

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("mousedown", handleMouseDown);
  element.addEventListener("focusin", handleFocus);
  element.addEventListener("focusout", handleBlur);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("mousedown", handleMouseDown);
    element.removeEventListener("focusin", handleFocus);
    element.removeEventListener("focusout", handleBlur);
    removeRing();
  };
}

// --- Auto-Focus & Restore ---

/** Save current focus, run callback, then restore focus */
export async function withRestoredFocus<T>(fn: () => Promise<T>): Promise<T> {
  const previousFocus = document.activeElement as HTMLElement | null;
  try {
    return await fn();
  } finally {
    // Wait a tick for DOM updates
    await nextMicrotask();
    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus({ preventScroll: true });
    }
  }
}

function nextMicrotask(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(resolve));
}

/** Focus the first focusable descendant of an element */
export function autofocusDescendant(container: HTMLElement): HTMLElement | null {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(", ");

  const first = container.querySelector<HTMLElement>(selector);
  if (first) first.focus({ preventScroll: true });
  return first;
}

// --- Tab Order Helpers ---

/** Get all focusable elements in tab order */
export function getTabOrder(root: Element = document.body): HTMLElement[] {
  const selector = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]:not([tabindex="-1"])',
  ].join(", ");

  return Array.from(root.querySelectorAll<HTMLElement>(selector))
    .sort((a, b) => {
      const ta = parseInt(a.getAttribute("tabindex") ?? "0");
      const tb = parseInt(b.getAttribute("tabindex") ?? "0");
      if (ta !== tb) return ta - tb;
      // Same tabindex: use DOM order
      const position = a.compareDocumentPosition(b);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
}

/** Move an element's position in the tab order (by adjusting tabindex) */
export function setTabOrderIndex(element: HTMLElement, index: number): void {
  element.setAttribute("tabindex", String(index));
}

/** Disable all focusable elements outside a container (for modals) */
export function disableOutsideFocus(
  container: HTMLElement,
): Map<HTMLElement, string> {
  const allFocusable = getTabOrder();
  const inertMap = new Map<HTMLElement, string>();

  for (const el of allFocusable) {
    if (!container.contains(el)) {
      const prev = el.getAttribute("tabindex") ?? "";
      inertMap.set(el, prev);
      el.setAttribute("tabindex", "-1");
    }
  }

  return inertMap;
}

/** Restore focus state after disabling outside focus */
export function restoreFocusState(map: Map<HTMLElement, string>): void {
  for (const [el, prev] of map) {
    if (prev === "") {
      el.removeAttribute("tabindex");
    } else {
      el.setAttribute("tabindex", prev);
    }
  }
}

// --- Skip Links ---

/** Create a "skip to content" accessibility link */
export function createSkipLink(options: SkipLinkOptions): HTMLAnchorElement {
  const { target, text = "Skip to main content", className = "skip-link", autoInsert = true } = options;

  const link = document.createElement("a");
  link.href = `#${target}`;
  link.textContent = text;
  link.className = className;
  link.style.cssText = `
    position:absolute;top:-40px;left:6px;background:#000;color:#fff;padding:8px 16px;
    text-decoration:none;z-index:9999;border-radius:4px;font-size:14px;
    transition:top 0.2s ease;
  `;

  link.addEventListener("focus", () => { link.style.top = "6px"; });
  link.addEventListener("blur", () => { link.style.top = "-40px"; });

  if (autoInsert) {
    document.body.insertBefore(link, document.body.firstChild);
  }

  return link;
}
