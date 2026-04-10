/**
 * Accessibility (a11y) utilities.
 */

/** Generate accessible ARIA attributes for a progress bar */
export function progressBarAttrs(value: number, max: number, label?: string) {
  return {
    role: "progressbar" as const,
    "aria-valuenow": value,
    "aria-valuemin": 0,
    "aria-valuemax": max,
    "aria-label": label || `Progress: ${value} of ${max}`,
  };
}

/** Generate ARIA attributes for a switch/toggle */
export function switchAttrs(checked: boolean, label?: string) {
  return {
    role: "switch" as const,
    "aria-checked": checked,
    "aria-label": label || (checked ? "On" : "Off"),
  };
}

/** Generate ARIA live region options */
export function liveRegion(politeness: "polite" | "assertive" | "off" = "polite") {
  return {
    "aria-live": politeness,
    "atomic": false,
  };
}

/** Announce message to screen readers (returns attrs for a sr-only element) */
export function announce(message: string, politeness: "polite" | "assertive" = "polite") {
  return {
    role: "status" as const,
    "aria-live": politeness,
    "aria-atomic": true,
    children: message,
  };
}

/** Skip navigation link target ID */
export const SKIP_LINK_ID = "skip-to-main-content";

/** Generate skip link HTML attributes */
export function skipLinkAttrs() {
  return {
    id: SKIP_LINK_ID,
    className: "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded",
    href: "#main-content",
  };
}

/** Check if reduced motion is preferred */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Get appropriate animation duration based on motion preference */
export function animationDuration(normalMs: number): string {
  return prefersReducedMotion() ? "0ms" : `${normalMs}ms`;
}

/** Focus trap utilities for modals */
export function focusTrap(container: HTMLElement): { activate: () => void; deactivate: () => void } {
  let previouslyFocused: HTMLElement | null = null;
  let focusableSelectors = [
    'a[href]:not([disabled])',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])',
  ].join(', ');

  function getFocusableElements(): HTMLElement[] {
    return Array.from(container.querySelectorAll(focusableSelectors));
  }

  function handleTab(e: KeyboardEvent) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const elements = getFocusableElements();
    if (elements.length === 0) return;
    const currentIndex = elements.indexOf(document.activeElement as HTMLElement);
    const nextIndex = e.shiftKey
      ? (currentIndex <= 0 ? elements.length - 1 : currentIndex - 1)
      : (currentIndex >= elements.length - 1 ? 0 : currentIndex + 1);
    elements[nextIndex]?.focus();
  }

  return {
    activate() {
      previouslyFocused = document.activeElement as HTMLElement;
      container.addEventListener("keydown", handleTab);
      const firstFocusable = getFocusableElements()[0];
      firstFocusable?.focus();
    },
    deactivate() {
      container.removeEventListener("keydown", handleTab);
      previouslyFocused?.focus();
    },
  };
}

/** Create visually hidden but screen-reader-accessible class */
export const srOnly = "absolute w-[1px] h-[1px] p-0 -m-[1px] overflow-hidden whitespace-nowrap border-0 clip-[rect(0)]";

/** Common ARIA landmark roles */
export const ROLES = {
  main: "main",
  navigation: "navigation",
  banner: "banner",
  complementary: "complementary", // sidebar
  contentinfo: "contentinfo",   // footer/about
  search: "search",
  form: "form",
  alert: "alert",
  dialog: "dialog",
  alertdialog: "alertdialog",
} as const;
