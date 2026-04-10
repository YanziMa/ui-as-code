/**
 * Accessibility (a11y) utilities for screen readers, keyboard navigation, and ARIA.
 */

/** Announce a message to screen readers via live region */
export function announce(message: string, priority: "polite" | "assertive" = "polite"): void {
  if (typeof document === "undefined") return;

  const region = document.querySelector(`[aria-live="${priority}"]`);

  if (region) {
    region.textContent = message;
    // Clear after announcement
    setTimeout(() => { region.textContent = ""; }, 1000);
    return;
  }

  // Create temporary live region
  const liveRegion = document.createElement("div");
  liveRegion.setAttribute("role", "status");
  liveRegion.setAttribute("aria-live", priority);
  liveRegion.setAttribute("aria-atomic", "true");
  liveRegion.className = "sr-only";
  liveRegion.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
  document.body.appendChild(liveRegion);
  liveRegion.textContent = message;

  setTimeout(() => {
    document.body.removeChild(liveRegion);
  }, 1000);
}

/** Set focus to an element with scroll */
export function setFocus(element: HTMLElement, options?: { preventScroll?: boolean }): void {
  element.focus({ preventScroll: options?.preventScroll ?? false });
}

/** Move focus to first focusable element in a container */
export function focusFirst(container: Element): boolean {
  const focusable = getFocusableElements(container);
  if (focusable.length > 0) {
    focusable[0].focus();
    return true;
  }
  return false;
}

/** Move focus to last focusable element in a container */
export function focusLast(container: Element): boolean {
  const focusable = getFocusableElements(container);
  if (focusable.length > 0) {
    focusable[focusable.length - 1]!.focus();
    return true;
  }
  return false;
}

/** Get all focusable elements within a container */
function getFocusableElements(container: Element): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(", ");

  return Array.from(container.querySelectorAll<HTMLElement>(selector))
    .filter((el) => el.offsetParent !== null || getComputedStyle(el).position === "fixed")
    .sort((a, b) => {
      const tabA = parseInt(a.getAttribute("tabindex") ?? "0", 10);
      const tabB = parseInt(b.getAttribute("tabindex") ?? "0", 10);
      // Positive tabindex comes after tabindex=0
      if (tabA >= 0 && tabB < 0) return 1;
      if (tabB >= 0 && tabA < 0) return -1;
      return tabA - tabB;
    });
}

/** Trap focus within an element and return cleanup function */
export function createA11yFocusTrap(
  container: Element,
  options?: { initialFocus?: string; restoreFocus?: boolean; escapeDeactivates?: boolean },
): () => void {
  let previouslyFocused: HTMLElement | null = null;

  if (options?.restoreFocus !== false) {
    previouslyFocused = document.activeElement as HTMLElement;
  }

  // Set initial focus
  if (options?.initialFocus) {
    const initialEl = container.querySelector<HTMLElement>(options.initialFocus);
    if (initialEl) initialEl.focus();
  } else {
    focusFirst(container);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== "Tab") return;

    const focusable = getFocusableElements(container);

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }

    // Escape key handling
    if (options?.escapeDeactivates && e.key === "Escape") {
      deactivate();
    }
  }

  document.addEventListener("keydown", handleKeyDown);

  function deactivate() {
    document.removeEventListener("keydown", handleKeyDown);
    if (previouslyFocused) previouslyFocused.focus();
  }

  return deactivate;
}

/** Check if reduced motion is preferred */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Check if high contrast mode is active */
export function prefersHighContrast(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-contrast: high)").matches || window.matchMedia("(forced-colors: active)").matches;
}

/** Generate unique ID for ARIA attributes */
let idCounter = 0;
export function generateAriaId(prefix = "a11y"): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

/** Common ARIA attribute builders */
export const aria = {
  /** Label an element */
  labeledBy(id: string): Record<string, string> {
    return { "aria-labelledby": id };
  },

  /** Describe an element */
  describedBy(id: string): Record<string, string> {
    return { "aria-describedby": id };
  },

  /** Mark as hidden from screen readers but visible */
  visuallyHidden(): Record<string, string> {
    return { role: "presentation", "aria-hidden": "true" };
  },

  /** Mark as decorative (ignored by SR) */
  decorative(): Record<string, string> {
    return { role: "none", "aria-hidden": "true" };
  },

  /** Busy state */
  busy(isBusy: boolean): Record<string, string | boolean> {
    return { "aria-busy": isBusy };
  },

  /** Expanded/collapsed state */
  expanded(isExpanded: boolean): Record<string, string | boolean> {
    return { "aria-expanded": isExpanded };
  },

  /** Selected state */
  selected(isSelected: boolean): Record<string, string | boolean> {
    return { "aria-selected": isSelected };
  },

  /** Pressed state */
  pressed(isPressed: boolean): Record<string, string | boolean> {
    return { "aria-pressed": isPressed };
  },

  /** Current item in a list/set */
  current(isCurrent: boolean): Record<string, string | boolean> {
    return { "aria-current": isCurrent ? "page" as const : undefined };
  },

  /** Invalid/valid state */
  invalid(isInvalid: boolean, message?: string): Record<string, string | boolean | undefined> {
    return {
      "aria-invalid": isInvalid,
      ...(message ? { "errormessage": message } : {}),
    };
  },
};

/** Skip link component data */
export const SKIP_LINK_DEFAULTS = {
  id: "skip-link",
  href: "#main-content",
  text: "Skip to main content",
} as const;
