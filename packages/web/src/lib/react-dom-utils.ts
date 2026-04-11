/**
 * React DOM Utilities: DOM manipulation helpers, portal management,
 * event delegation, scroll utilities, measurement, and animation
 * helpers designed for React integration.
 */

// --- Portal Management ---

/** Create and manage a React portal container */
export function createPortalContainer(
  id: string,
  parent: HTMLElement = document.body,
): HTMLElement {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.setAttribute("data-portal", "true");
    parent.appendChild(el);
  }
  return el;
}

/** Remove a portal container by ID */
export function removePortalContainer(id: string): void {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// --- DOM Measurement ---

export interface ElementMeasurements {
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
  /** Scroll position relative to viewport */
  scrollTop: number;
  scrollLeft: number;
}

/** Measure an element's bounding rect + scroll info */
export function measureElement(el: HTMLElement | null): ElementMeasurements | null {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    scrollTop: window.scrollY || document.documentElement.scrollTop,
    scrollLeft: window.scrollX || document.documentElement.scrollLeft,
  };
}

/** Check if element is visible in the viewport */
export function isInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/** Check if element is partially visible in viewport */
export function isPartiallyInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
    rect.left < (window.innerWidth || document.documentElement.clientWidth)
  );
}

// --- Scroll Utilities ---

/** Smooth scroll an element into view */
export function scrollIntoViewIfNeeded(
  el: HTMLElement,
  options?: ScrollIntoViewOptions,
): void {
  if (!isPartiallyInViewport(el)) {
    el.scrollIntoView({ behavior: "smooth", block: "nearest", ...options });
  }
}

/** Get or set scroll position of an element or window */
export function getScrollPosition(target?: HTMLElement | Window): { x: number; y: number } {
  const t = target ?? window;
  if (t === window) {
    return { x: window.scrollX, y: window.scrollY };
  }
  const el = t as HTMLElement;
  return { x: el.scrollLeft, y: el.scrollTop };
}

/** Lock body scroll (useful for modals/drawers) */
export function lockBodyScroll(): () => void {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  const originalOverflow = document.body.style.overflow;
  const originalPaddingRight = document.body.style.paddingRight;

  document.body.style.overflow = "hidden";
  document.body.style.paddingRight = `${scrollbarWidth}px`;

  return (): void => {
    document.body.style.overflow = originalOverflow;
    document.body.style.paddingRight = originalPaddingRight;
  };
}

// --- Focus Management ---

/** Trap focus within a container element */
export function createFocusTrap(container: HTMLElement): { activate: () => void; deactivate: () => void } {
  let active = false;
  let previouslyFocused: HTMLElement | null = null;

  function getFocusableElements(): HTMLElement[] {
    return Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null); // Visible only
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== "Tab") return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return {
    activate(): void {
      if (active) return;
      active = true;
      previouslyFocused = document.activeElement as HTMLElement;
      container.addEventListener("keydown", handleKeyDown);

      // Focus first focusable element
      const focusable = getFocusableElements();
      if (focusable[0]) focusable[0].focus();
    },

    deactivate(): void {
      if (!active) return;
      active = false;
      container.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    },
  };
}

/** Focus the next/previous tabbable element */
export function focusNextTabbable(from: HTMLElement, direction: "next" | "prev" = "next"): HTMLElement | null {
  const allTabbable = Array.from(document.querySelectorAll<HTMLElement>(
    '[tabindex]:not([tabindex="-1"]), a[href], button, input, select, textarea',
  )).filter((el) => el.offsetParent !== null);

  const idx = allTabbable.indexOf(from);
  if (idx === -1) return null;

  const nextIdx = direction === "next"
    ? (idx + 1) % allTabbable.length
    : (idx - 1 + allTabbable.length) % allTabbable.length;

  const target = allTabbable[nextIdx];
  target?.focus();
  return target ?? null;
}

// --- Event Delegation ---

/** Create an event delegator for efficient event handling on dynamic children */
export function createEventDelegator<K extends keyof HTMLElementEventMap>(
  parent: HTMLElement,
  eventType: K,
  selector: string,
  handler: (e: HTMLElementEventMap[K], target: HTMLElement) => void,
): () => void {
  const listener = (e: Event): void => {
    const target = (e.target as HTMLElement)?.closest(selector);
    if (target && parent.contains(target)) {
      handler(e as HTMLElementEventMap[K], target);
    }
  };

  parent.addEventListener(eventType, listener);
  return (): void => parent.removeEventListener(eventType, listener);
}

// --- Animation Helpers ---

/** Animate between two states using WAAPI with cleanup */
export function animateTransition(
  el: HTMLElement,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options?: KeyframeAnimationOptions,
): Animation {
  return el.animate(keyframes, {
    duration: 200,
    easing: "ease-out",
    fill: "forwards",
    ...options,
  });
}

/** Fade in an element */
export function fadeIn(el: HTMLElement, duration = 200): Animation {
  return el.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration, easing: "ease-out", fill: "forwards" },
  );
}

/** Fade out an element */
export function fadeOut(el: HTMLElement, duration = 200): Animation {
  return el.animate(
    [{ opacity: 1 }, { opacity: 0 }],
    { duration, easing: "ease-out", fill: "forwards" },
  );
}

/** Slide up into view */
export function slideUp(el: HTMLElement, distance = 10, duration = 200): Animation {
  return el.animate(
    [{ transform: `translateY(${distance}px)`, opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
    { duration, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
  );
}

/** Scale pop-in effect */
export function scaleIn(el: HTMLElement, originScale = 0.95, duration = 150): Animation {
  return el.animate(
    [
      { transform: `scale(${originScale})`, opacity: 0 },
      { transform: "scale(1)", opacity: 1 },
    ],
    { duration, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
  );
}

// --- Style Utilities ---

/** Apply temporary styles to an element, returns restore function */
export function applyTempStyles(
  el: HTMLElement,
  styles: Partial<CSSStyleDeclaration>,
): () => void {
  const originals: Record<string, string> = {};
  for (const [key, value] of Object.entries(styles)) {
    originals[key] = el.style.getPropertyValue(key) || "";
    el.style.setProperty(key, value!);
  }

  return (): void => {
    for (const [key, value] of Object.entries(originals)) {
      el.style.setProperty(key, value);
    }
  };
}

/** Check if a CSS property is supported */
export function supportsCssProperty(property: string, value?: string): boolean {
  if (value !== undefined) {
    return CSS.supports(property, value);
  }
  return property in document.documentElement.style;
}

// --- Selection & Clipboard ---

/** Get selected text from the document */
export function getSelectionText(): string {
  return window.getSelection()?.toString() ?? "";
}

/** Select all text content within an element */
export function selectElementText(el: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/** Copy text to clipboard with fallback */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}
