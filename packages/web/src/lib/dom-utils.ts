/**
 * Advanced DOM manipulation and measurement utilities.
 */

/** Get computed style value with caching */
export function getComputedStyleValue(
  element: Element,
  property: string,
): string {
  return getComputedStyle(element).getPropertyValue(property);
}

/** Get element's bounding rect relative to viewport */
export function getElementRect(element: Element): DOMRect {
  return element.getBoundingClientRect();
}

/** Check if element is visible in viewport */
export function isInViewport(element: Element, threshold = 0): boolean {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

  return (
    rect.top <= viewportHeight - threshold &&
    rect.bottom >= threshold &&
    rect.left <= viewportWidth - threshold &&
    rect.right >= threshold
  );
}

/** Get percentage of element that is visible in viewport */
export function getVisibilityPercent(element: Element): number {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

  const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
  const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));

  const elementArea = rect.width * rect.height;
  if (elementArea === 0) return 0;

  return (visibleHeight * visibleWidth) / elementArea * 100;
}

/** Scroll element into view smoothly */
export function scrollIntoViewCentered(element: Element, options?: ScrollIntoViewOptions): void {
  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center",
    ...options,
  });
}

/** Measure text dimensions in a hidden container */
export function measureText(
  text: string,
  options?: {
    fontSize?: string;
    fontFamily?: string;
    fontWeight?: string;
    maxWidth?: number;
    lineHeight?: string;
  },
): { width: number; height: number; lines: number } {
  const {
    fontSize = "16px",
    fontFamily = "system-ui, sans-serif",
    fontWeight = "normal",
    maxWidth = Infinity,
    lineHeight = "1.5",
  } = options ?? {};

  if (typeof document === "undefined") {
    // Server-side fallback: rough estimation
    const charWidth = parseFloat(fontSize) * 0.6;
    const lines = maxWidth === Infinity ? 1 : Math.ceil(text.length / (maxWidth / charWidth));
    return { width: text.length * charWidth, height: lines * parseFloat(fontSize) * parseFloat(lineHeight), lines };
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { width: 0, height: 0, lines: 1 };

  ctx.font = `${fontWeight} ${fontSize} ${fontFamily}`;

  if (maxWidth === Infinity) {
    const metrics = ctx.measureText(text);
    return { width: metrics.width, height: parseFloat(fontSize) * parseFloat(lineHeight), lines: 1 };
  }

  // Multi-line measurement
  const words = text.split(/\s+/);
  let line = "";
  let lineWidth = 0;
  let maxLineWidth = 0;
  let lineCount = 1;

  for (const word of words) {
    const wordWidth = ctx.measureWord ? ctx.measureWord(word).width : ctx.measureText(word + " ").width;
    if (lineWidth + wordWidth > maxWidth && line !== "") {
      maxLineWidth = Math.max(maxLineWidth, lineWidth);
      line = word;
      lineWidth = ctx.measureText(word).width;
      lineCount++;
    } else {
      line += (line ? " " : "") + word;
      lineWidth = ctx.measureText(line).width;
    }
  }
  maxLineWidth = Math.max(maxLineWidth, lineWidth);

  return {
    width: maxLineWidth,
    height: lineCount * parseFloat(fontSize) * parseFloat(lineHeight),
    lines: lineCount,
  };
}

/** Find the closest ancestor matching a selector */
export function closestAncestor(
  element: Element,
  selector: string,
): Element | null {
  return element.closest(selector);
}

/** Get all ancestors up to (but not including) a stop element */
export function getAncestors(
  element: Element,
  stopAt?: Element | null,
): Element[] {
  const ancestors: Element[] = [];
  let current: Element | null = element.parentElement;

  while (current && current !== stopAt && current !== document.body) {
    ancestors.push(current);
    current = current.parentElement;
  }

  return ancestors;
}

/** Insert element after a reference element */
export function insertAfter(newNode: Node, referenceNode: Node): void {
  referenceNode.parentNode?.insertBefore(newNode, referenceNode.nextSibling);
}

/** Replace element with another, preserving event listeners via cloning pattern */
export function replaceElement(oldElement: Element, newElement: Element): void {
  oldElement.parentNode?.replaceChild(newElement, oldElement);
}

/** Check if element contains or is another element */
export function containsOrIs(parent: Element, child: Element): boolean {
  return parent === child || parent.contains(child);
}

/** Get all focusable elements within a container */
export function getFocusableElements(container: Element): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  return Array.from(container.querySelectorAll<HTMLElement>(selector))
    .filter((el) => el.offsetParent !== null || getComputedStyle(el).position === "fixed");
}

/** Trap focus within an element */
export function createFocusTrap(container: Element): { activate: () => void; deactivate: () => void } {
  let active = false;
  let previouslyFocused: HTMLElement | null = null;

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== "Tab" || !active) return;

    const focusable = getFocusableElements(container as HTMLElement);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

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
    activate() {
      if (active) return;
      active = true;
      previouslyFocused = document.activeElement as HTMLElement;
      container.addEventListener("keydown", handleKeyDown);
      const firstFocusable = getFocusableElements(container as HTMLElement)[0];
      firstFocusable?.focus();
    },
    deactivate() {
      if (!active) return;
      active = false;
      container.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    },
  };
}
