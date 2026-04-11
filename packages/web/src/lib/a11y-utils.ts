/**
 * Accessibility (a11y) utilities: ARIA attribute management, focus trapping,
 * live region announcements, reduced motion detection, screen reader
 * optimization, keyboard navigation helpers, and color contrast checking.
 */

// --- Types ---

export interface A11yFocusableElements {
  /** Elements that can receive focus */
  focusable: HTMLElement[];
  /** The first focusable element */
  first: HTMLElement | null;
  /** The last focusable element */
  last: HTMLElement | null;
}

export interface ContrastResult {
  ratio: number;
  /** WCAG AA normal text (4.5:1) */
  aaNormal: boolean;
  /** WCAG AA large text (3:1) */
  aaLarge: boolean;
  /** WCAG AAA normal text (7:1) */
  aaaNormal: boolean;
  /** WCAG AAA large text (4.5:1) */
  aaaLarge: boolean;
}

// --- Focus Management ---

/** Get all focusable elements within a container */
export function getFocusableElements(container: HTMLElement): A11yFocusableElements {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
    'audio[controls]',
    'video[controls]',
    '[tabindex]:not([disabled])',
  ].join(", ");

  const elements = Array.from(container.querySelectorAll<HTMLElement>(selector))
    .filter((el) => {
      // Filter out hidden elements
      const style = getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    });

  return {
    focusable: elements,
    first: elements[0] ?? null,
    last: elements[elements.length - 1] ?? null,
  };
}

/** Trap focus within a container element (for modals, dialogs) */
export function createFocusTrap(container: HTMLElement): { activate: () => void; deactivate: () => void } {
  let active = false;
  let previousActiveElement: HTMLElement | null = null;

  function handleKeyDown(e: KeyboardEvent): void {
    if (!active || e.key !== "Tab") return;

    const { first, last } = getFocusableElements(container);

    if (e.shiftKey) {
      // Shift+Tab: if on first, wrap to last
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      // Tab: if on last, wrap to first
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }

  return {
    activate(): void {
      if (active) return;
      active = true;
      previousActiveElement = document.activeElement as HTMLElement;
      container.addEventListener("keydown", handleKeyDown);
      // Move focus to first focusable element
      const { first } = getFocusableElements(container);
      first?.focus();
    },
    deactivate(): void {
      if (!active) return;
      active = false;
      container.removeEventListener("keydown", handleKeyDown);
      // Restore focus
      previousActiveElement?.focus();
    },
  };
}

/** Focus an element with optional scroll-into-view behavior */
export function focusElement(
  el: HTMLElement,
  options?: { preventScroll?: boolean; selectText?: boolean },
): void {
  el.focus({
    preventScroll: options?.preventScroll ?? true,
  });
  if (options?.selectText && el instanceof HTMLInputElement) {
    el.select();
  }
}

/** Manage tab order by programmatically setting tabindex */
export function setTabOrder(elements: HTMLElement[], startIndex = 0): void {
  for (let i = 0; i < elements.length; i++) {
    elements[i]!.setAttribute("tabindex", String(startIndex + i));
  }
}

// --- Live Regions (Screen Reader Announcements) ---

let liveRegion: HTMLDivElement | null = null;

/** Get or create the shared live region for announcements */
function getLiveRegion(polite = true): HTMLDivElement {
  if (!liveRegion) {
    liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", polite ? "polite" : "assertive");
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.style.cssText =
      "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
    document.body.appendChild(liveRegion);
  }
  return liveRegion;
}

/** Announce a message to screen readers via ARIA live region */
export function announce(message: string, options?: { polite?: boolean; priority?: "high" }): void {
  const region = getLiveRegion(options?.priority === "high" ? false : options?.polite ?? true);

  // Clear and reset to ensure re-announcement of same message
  region.textContent = "";
  // Force reflow
  void region.offsetHeight;
  region.textContent = message;

  // Auto-clear after announcement
  setTimeout(() => {
    if (region.textContent === message) {
      region.textContent = "";
    }
  }, 1000);
}

/** Create a dedicated live region element for a specific component */
export function createLiveRegion(options?: {
  polite?: boolean;
  role?: "status" | "alert" | "log";
}): { announce: (msg: string) => void; destroy: () => void } {
  const el = document.createElement("div");
  el.setAttribute("aria-live", options?.polite !== false ? "polite" : "assertive");
  el.setAttribute("aria-atomic", "true");
  if (options?.role) el.setAttribute("role", options.role);
  el.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
  document.body.appendChild(el);

  let destroyed = false;

  return {
    announce(msg: string): void {
      if (destroyed) return;
      el.textContent = "";
      void el.offsetHeight;
      el.textContent = msg;
    },
    destroy(): void {
      destroyed = true;
      el.remove();
    },
  };
}

// --- Reduced Motion ---

/** Check if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Subscribe to reduced motion preference changes */
export function onReducedMotionChange(callback: (reduced: boolean) => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  callback(mq.matches);
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

/** Get animation duration respecting reduced motion preference */
export function getSafeDuration(normalMs: number, reducedMs = 0): number {
  return prefersReducedMotion() ? reducedMs : normalMs;
}

// --- ARIA Helpers ---

/** Set multiple ARIA attributes at once */
export function setAria(el: Element, attrs: Record<string, string>): void {
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(`aria-${key}`, value);
  }
}

/** Remove ARIA attributes */
export function removeAria(el: Element, ...keys: string[]): void {
  for (const key of keys) {
    el.removeAttribute(`aria-${key}`);
  }
}

/** Mark an element as visually hidden but accessible to screen readers */
export function srOnlyHide(el: HTMLElement): void {
  el.setAttribute("aria-hidden", "true");
  el.style.cssText +=
    ";position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
}

/** Restore a sr-only hidden element */
export function srOnlyShow(el: HTMLElement): void {
  el.removeAttribute("aria-hidden");
  el.style.cssText = el.style.cssText.replace(
    /position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect\(0,0,0,0\);white-space:nowrap;border:0;?/,
    "",
  );
}

/** Set up a dialog/modal role with proper ARIA attributes */
export function setupDialog(
  dialogEl: HTMLElement,
  titleEl?: HTMLElement,
  closeBtn?: HTMLElement,
): { trap: ReturnType<typeof createFocusTrap>; destroy: () => void } {
  dialogEl.setAttribute("role", "dialog");
  dialogEl.setAttribute("aria-modal", "true");

  if (titleEl) {
    dialogEl.setAttribute("aria-labelledby", titleEl.id || `dialog-title-${Date.now()}`);
    if (!titleEl.id) titleEl.id = `dialog-title-${Date.now()}`;
  }

  if (closeBtn) {
    closeBtn.setAttribute("aria-label", "Close dialog");
  }

  const trap = createFocusTrap(dialogEl);

  return {
    trap,
    destroy(): void {
      dialogEl.removeAttribute("role");
      dialogEl.removeAttribute("aria-modal");
      dialogEl.removeAttribute("aria-labelledby");
      trap.deactivate();
    },
  };
}

// --- Color Contrast (WCAG) ---

/**
 * Calculate relative luminance per WCAG 2.0.
 * @see https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Parse hex color to RGB */
function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6 && clean.length !== 3) return null;

  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;

  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

/** Calculate contrast ratio between two hex colors per WCAG 2.0 */
export function contrastRatio(foreground: string, background: string): ContrastResult {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  if (!fg || !bg) {
    return { ratio: 1, aaNormal: false, aaLarge: false, aaaNormal: false, aaaLarge: false };
  }

  const l1 = relativeLuminance(...fg);
  const l2 = relativeLuminance(...bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: Math.round(ratio * 100) / 100,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

/** Suggest a foreground color (black or white) for maximum contrast against a background */
export function suggestForegroundColor(backgroundHex: string): "#000000" | "#ffffff" {
  const bg = hexToRgb(backgroundHex);
  if (!bg) return "#000000";

  const luminance = relativeLuminance(...bg);
  return luminance > 0.179 ? "#000000" : "#ffffff";
}

// --- Skip Links ---

/** Create a "Skip to content" accessibility link */
export function createSkipLink(
  targetId = "main-content",
  label = "Skip to main content",
): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = `#${targetId}`;
  link.textContent = label;
  link.className = "skip-link";
  link.style.cssText = `
    position:fixed;top:-100%;left:0;z-index:99999;
    padding:8px 16px;background:#6366f1;color:#fff;
    text-decoration:none;font-size:14px;font-weight:600;
    transition:top 0.15s;
  `;

  // Show on focus
  link.addEventListener("focus", () => {
    link.style.top = "0";
  });
  link.addEventListener("blur", () => {
    link.style.top = "-100%";
  });

  document.body.prepend(link);
  return link;
}
