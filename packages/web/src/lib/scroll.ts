/**
 * Scroll utilities.
 */

/** Smooth scroll to element by ID */
export function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/** Smooth scroll to top of page */
export function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Get current scroll position */
export function getScrollPosition(): { x: number; y: number } {
  return {
    x: window.scrollX || document.documentElement.scrollLeft,
    y: window.scrollY || document.documentElement.scrollTop,
  };
}

/** Check if element is in viewport */
export function isInViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
