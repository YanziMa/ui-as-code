/**
 * DOM manipulation utilities: element selection/creation/manipulation,
 * positioning, scrolling, event delegation, viewport detection,
 * CSS class/style helpers, animation frame utilities, and DOM diffing.
 */

// --- Element Selection ---

/** Query a single element (null-safe) */
export function $<T extends Element = Element>(selector: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(selector);
}

/** Query all elements matching selector */
export function $$<T extends Element = Element>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/** Find element by ID */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/** Find elements by tag name */
export function byTag<T extends Element = Element>(tag: string, root: ParentNode = document): T[] {
  return Array.from(root.getElementsByTagName(tag)) as T[];
}

/** Find elements by class name */
export function byClass<T extends Element = Element>(cls: string, root: ParentNode = document): T[] {
  return Array.from(root.getElementsByClassName(cls)) as T[];
}

/** Find closest ancestor matching selector (or self) */
export function closest<T extends Element = Element>(el: Element, selector: string): T | null {
  return el.closest<T>(selector);
}

/** Check if element matches selector */
export function matches(el: Element, selector: string): boolean {
  return el.matches(selector);
}

/** Get or set an element's text content */
export function text(el: Element, value?: string): string {
  if (value !== undefined) { el.textContent = value; }
  return el.textContent ?? "";
}

/** Get or set inner HTML (with XSS safety option) */
export function html(el: Element, value?: string, sanitize = false): string {
  if (value !== undefined) {
    el.innerHTML = sanitize ? sanitizeHtml(value) : value;
  }
  return el.innerHTML;
}

// --- Element Creation ---

/** Create an element with attributes, children, and events */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: {
    attrs?: Record<string, string>;
    style?: Partial<CSSStyleDeclaration>;
    classes?: string[];
    children?: (string | Node)[];
    text?: string;
    html?: string;
    dataset?: Record<string, string>;
    on?: Record<string, EventListener>;
    ref?: (el: HTMLElementTagNameMap[K]) => void;
  },
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  if (options?.attrs) {
    for (const [k, v] of Object.entries(options.attrs)) {
      if (k === "className") {
        el.className = v;
      } else if (k.startsWith("data-")) {
        el.setAttribute(k, v);
      } else {
        el.setAttribute(k, v);
      }
    }
  }

  if (options?.classes) {
    el.classList.add(...options.classes);
  }

  if (options?.style) {
    Object.assign(el.style, options.style);
  }

  if (options?.dataset) {
    for (const [k, v] of Object.entries(options.dataset)) {
      el.dataset[k] = v;
    }
  }

  if (options?.text) {
    el.textContent = options.text;
  } else if (options?.html) {
    el.innerHTML = options.html;
  } else if (options?.children) {
    for (const child of options.children) {
      el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }
  }

  if (options?.on) {
    for (const [event, handler] of Object.entries(options.on)) {
      el.addEventListener(event, handler);
    }
  }

  options?.ref?.(el);

  return el;
}

/** Create a DocumentFragment from children */
export function createFragment(children: (string | Node)[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const child of children) {
    frag.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return frag;
}

/** Shorthand: create a <div> with options */
export function div(options?: Parameters<typeof createElement<"div">>[1]): HTMLDivElement {
  return createElement("div", options);
}

/** Shorthand: create a <span> with options */
export function span(options?: Parameters<typeof createElement<"span">>[1]): HTMLSpanElement {
  return createElement("span", options);
}

/** Shorthand: create a <button> with options */
export function button(options?: Parameters<typeof createElement<"button">>[1]): HTMLButtonElement {
  return createElement("button", options);
}

/** Shorthand: create an <input> with options */
export function input(options?: Parameters<typeof createElement<"input">>[1]): HTMLInputElement {
  return createElement("input", options);
}

/** Shorthand: create SVG element */
export function createSvgElement(
  tag: string,
  attrs?: Record<string, string>,
): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
  }
  return el;
}

// --- DOM Manipulation ---

/** Insert element after reference node */
export function insertAfter(newNode: Node, referenceNode: Node): void {
  referenceNode.parentNode?.insertBefore(newNode, referenceNode.nextSibling);
}

/** Insert element before reference node */
export function insertBefore(newNode: Node, referenceNode: Node): void {
  referenceNode.parentNode?.insertBefore(newNode, referenceNode);
}

/** Replace an element with another */
export function replaceElement(oldEl: Element, newEl: Element): void {
  oldEl.parentNode?.replaceChild(newEl, oldEl);
}

/** Remove element from DOM */
export function removeElement(el: Element): void {
  el.remove();
}

/** Remove all children of an element */
export function clearChildren(el: Element): void {
  el.textContent = "";
}

/** Wrap an element in a wrapper element */
export function wrapElement(el: Element, wrapper: Element): Element {
  el.parentNode?.replaceChild(wrapper, el);
  wrapper.appendChild(el);
  return wrapper;
}

/** Unwrap an element (replace it with its children) */
export function unwrapElement(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
}

/** Move element to new parent */
export function moveTo(el: Element, newParent: Element, position?: "start" | "end" | Element): void {
  if (position === "start") {
    newParent.prepend(el);
  } else if (position === "end") {
    newParent.appendChild(el);
  } else if (position instanceof Element) {
    newParent.insertBefore(el, position);
  } else {
    newParent.appendChild(el);
  }
}

/** Clone element deeply (optionally without events) */
export function cloneDeep(el: Element, withoutEvents = true): Element {
  const clone = el.cloneNode(true) as Element;
  if (withoutEvents) {
    // Clone doesn't copy event listeners, but clean up any refs
    clone.removeAttribute("onclick");
    clone.removeAttribute("onmouseover");
  }
  return clone;
}

/** Swap two elements in the DOM */
export function swapElements(a: Element, b: Element): void {
  const parentA = a.parentNode;
  const parentB = b.parentNode;
  if (!parentA || !parentB || parentA !== parentB) return;

  const nextA = a.nextSibling;
  const nextB = b.nextSibling;

  if (nextA === b) {
    parentB.insertBefore(a, b);
  } else if (nextB === a) {
    parentB.insertBefore(b, a);
  } else {
    parentB.insertBefore(a, nextB ?? null);
    parentA.insertBefore(b, nextA ?? null);
  }
}

// --- Class & Style Helpers ---

/** Add one or more CSS classes */
export function addClass(el: Element, ...classes: string[]): void {
  el.classList.add(...classes);
}

/** Remove one or more CSS classes */
export function removeClass(el: Element, ...classes: string[]): void {
  el.classList.remove(...classes);
}

/** Toggle a CSS class */
export function toggleClass(el: Element, cls: string, force?: boolean): boolean {
  return el.classList.toggle(cls, force);
}

/** Check if element has a class */
export function hasClass(el: Element, cls: string): boolean {
  return el.classList.contains(cls);
}

/** Replace one class with another */
export function replaceClass(el: Element, oldCls: string, newCls: string): void {
  el.classList.remove(oldCls);
  el.classList.add(newCls);
}

/** Set multiple styles at once */
export function setStyles(el: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  Object.assign(el.style, styles);
}

/** Get computed style property */
export function getStyle(el: Element, prop: keyof CSSStyleDeclaration): string {
  return window.getComputedStyle(el)[prop as string] ?? "";
}

/** Show an element (display default or specified) */
export function show(el: HTMLElement, display?: string): void {
  el.style.display = display ?? "";
}

/** Hide an element */
export function hide(el: HTMLElement): void {
  el.style.display = "none";
}

/** Toggle visibility */
export function toggleVisibility(el: HTMLElement, show?: boolean): void {
  el.style.display = (show ?? (el.style.display === "none")) ? "" : "none";
}

/** Check if element is visible (in layout, not just opacity) */
export function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return !!(
    rect.width ||
    rect.height ||
    el.getClientRects().length
  ) && window.getComputedStyle(el).visibility !== "hidden";
}

// --- Position & Geometry ---

/** Get element's bounding rect relative to viewport */
export function getRect(el: Element): DOMRect {
  return el.getBoundingClientRect();
}

/** Get element's center point relative to viewport */
export function getCenter(el: Element): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Get element offset relative to document */
export function getOffset(el: Element): { top: number; left: number } {
  let top = 0;
  let left = 0;
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    top += current.offsetTop;
    left += current.offsetLeft;
    current = current.offsetParent as Element | null;
  }
  return { top, left };
}

/** Check if point is inside element bounds */
export function containsPoint(el: Element, x: number, y: number): boolean {
  const rect = el.getBoundingClientRect();
  return (
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom
  );
}

/** Check if element A contains element B */
export function contains(parent: Element, child: Element): boolean {
  return parent.contains(child);
}

/** Get distance between centers of two elements */
export function distanceBetween(a: Element, b: Element): number {
  const ca = getCenter(a);
  const cb = getCenter(b);
  return Math.sqrt((ca.x - cb.x) ** 2 + (ca.y - cb.y) ** 2);
}

/** Position an element relative to a target (for popovers/tooltips/dropdowns) */
export function positionRelative(
  anchor: Element,
  floating: HTMLElement,
  placement: "top" | "bottom" | "left" | "right" = "bottom",
  gap = 4,
): { x: number; y: number } {
  const anchorRect = anchor.getBoundingClientRect();
  const floatRect = floating.getBoundingClientRect();

  let x = 0;
  let y = 0;

  switch (placement) {
    case "top":
      x = anchorRect.left + anchorRect.width / 2 - floatRect.width / 2;
      y = anchorRect.top - floatRect.height - gap;
      break;
    case "bottom":
      x = anchorRect.left + anchorRect.width / 2 - floatRect.width / 2;
      y = anchorRect.bottom + gap;
      break;
    case "left":
      x = anchorRect.left - floatRect.width - gap;
      y = anchorRect.top + anchorRect.height / 2 - floatRect.height / 2;
      break;
    case "right":
      x = anchorRect.right + gap;
      y = anchorRect.top + anchorRect.height / 2 - floatRect.height / 2;
      break;
  }

  // Clamp to viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  x = Math.max(0, Math.min(x, vw - floatRect.width));
  y = Math.max(0, Math.min(y, vh - floatRect.height));

  floating.style.position = "fixed";
  floating.style.left = `${x}px`;
  floating.style.top = `${y}px`;

  return { x, y };
}

// --- Scrolling ---

/** Smooth scroll to element */
export function scrollToElement(
  el: Element,
  options?: ScrollIntoViewOptions,
): void {
  el.scrollIntoView({ behavior: "smooth", block: "nearest", ...options });
}

/** Smooth scroll to position within container */
export function scrollContainerTo(
  container: HTMLElement,
  x: number,
  y: number,
  behavior: ScrollBehavior = "smooth",
): void {
  container.scrollTo({ left: x, top: y, behavior });
}

/** Scroll to bottom of container */
export function scrollToBottom(container: HTMLElement): void {
  container.scrollTop = container.scrollHeight;
}

/** Scroll to top of container */
export function scrollToTop(container: HTMLElement): void {
  container.scrollTop = 0;
}

/** Check if scrolled to bottom (within threshold) */
export function isScrolledBottom(container: HTMLElement, threshold = 50): boolean {
  return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
}

/** Check if scrolled to top */
export function isScrolledTop(container: HTMLElement): boolean {
  return container.scrollTop <= 0;
}

/** Get scroll percentage (0-1) */
export function getScrollProgress(container: HTMLElement): number {
  return container.scrollTop / (container.scrollHeight - container.clientHeight);
}

/** Disable body scroll (for modals/overlays) */
export function disableBodyScroll(): () => void {
  const overflow = document.body.style.overflow;
  const paddingRight = document.body.style.paddingRight;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  document.body.style.overflow = "hidden";
  document.body.style.paddingRight = `${scrollbarWidth}px`;

  return () => {
    document.body.style.overflow = overflow;
    document.body.style.paddingRight = paddingRight;
  };
}

// --- Viewport Detection ---

/** Check if element is in viewport */
export function isInViewport(el: Element, margin = 0): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= -margin &&
    rect.left >= -margin &&
    rect.bottom <= window.innerHeight + margin &&
    rect.right <= window.innerWidth + margin
  );
}

/** Check how much of element is visible (0-1 ratio) */
export function getVisibilityRatio(el: Element): number {
  const rect = el.getBoundingClientRect();
  const viewHeight = window.innerHeight;
  const viewWidth = window.innerWidth;

  const visibleHeight = Math.min(rect.bottom, viewHeight) - Math.max(rect.top, 0);
  const visibleWidth = Math.min(rect.right, viewWidth) - Math.max(rect.left, 0);

  const totalArea = rect.width * rect.height;
  if (totalArea === 0) return 0;

  return Math.max(0, (visibleHeight * visibleWidth) / totalArea);
}

/** Observe when element enters/exits viewport using IntersectionObserver */
export function observeViewport(
  el: Element,
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit,
): () => void {
  const observer = new IntersectionObserver(([entry]) => {
    callback(entry!);
  }, { threshold: 0.1, ...options });

  observer.observe(el);
  return () => observer.disconnect();
}

/** Observe when element becomes fully visible */
export function observeFullyVisible(
  el: Element,
  callback: () => void,
): () => void {
  return observeViewport(el, (entry) => {
    if (entry.isIntersecting && entry.intersectionRatio >= 0.99) {
      callback();
    }
  }, { threshold: 0.99 });
}

// --- Event Delegation ---

/**
 * Set up event delegation on a parent element.
 * Returns unsubscribe function.
 */
export function delegate<K extends keyof HTMLElementEventMap>(
  parent: Element,
  eventType: K,
  selector: string,
  handler: (e: HTMLElementEventMap[K], target: Element) => void,
): () => void {
  const listener = (e: Event) => {
    const target = (e.target as Element)?.closest(selector);
    if (target && parent.contains(target)) {
      handler(e as unknown as HTMLElementEventMap[K], target);
    }
  };

  parent.addEventListener(eventType, listener);
  return () => parent.removeEventListener(eventType, listener);
}

/** Once-only event delegation */
export function delegateOnce<K extends keyof HTMLElementEventMap>(
  parent: Element,
  eventType: K,
  selector: string,
  handler: (e: HTMLElementEventMap[K], target: Element) => void,
): () => void {
  const unsub = delegate(parent, eventType, selector, (e, target) => {
    unsub();
    handler(e, target);
  });
  return unsub;
}

// --- Animation Frame Utilities ---

/** Request animation frame with cancellation support */
export function raf(callback: FrameRequestCallback): () => void {
  const id = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(id);
}

/** Run callback on next animation frame (returns promise) */
export function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/** Run callback after N frames */
export function afterFrames(n: number): Promise<void> {
  return new Promise((resolve) => {
    let count = 0;
    const tick = () => {
      count++;
      if (count >= n) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Throttle using requestAnimationFrame */
export function rafThrottle<T extends (...args: unknown[]) => void>(
  fn: T,
): (...args: Parameters<T>) => void {
  let pending = false;
  let lastArgs: Parameters<T>;

  return ((...args: Parameters<T>) => {
    lastArgs = args;
    if (!pending) {
      pending = true;
      requestAnimationFrame(() => {
        fn(...lastArgs);
        pending = false;
      });
    }
  }) as unknown as (...args: Parameters<T>) => void;
}

/** Debounce using requestAnimationFrame */
export function rafDebounce<T extends (...args: unknown[]) => void>(
  fn: T,
): (...args: Parameters<T>) => void {
  let id: number;

  return ((...args: Parameters<T>) => {
    cancelAnimationFrame(id);
    id = requestAnimationFrame(() => fn(...args));
  }) as unknown as (...args: Parameters<T>) => void;
}

// --- Focus Management ---

/** Trap focus within an element (for modals/dialogs) */
export function trapFocus(container: HTMLElement): () => void {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    const focusable = container.querySelectorAll<HTMLElement>(focusableSelectors);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };

  container.addEventListener("keydown", handleKeyDown);

  // Focus first focusable element
  const firstFocusable = container.querySelector<HTMLElement>(focusableSelectors);
  firstFocusable?.focus();

  return () => {
    container.removeEventListener("keydown", handleKeyDown);
  };
}

/** Move focus to an element */
export function focusElement(el: HTMLElement, options?: FocusOptions): void {
  el.focus(options);
}

/** Check if element is focused */
export function isFocused(el: Element): boolean {
  return document.activeElement === el;
}

/** Save and restore focus */
export function saveFocus(): () => void {
  const active = document.activeElement as HTMLElement | null;
  return () => active?.focus();
}

// --- Selection & Clipboard ---

/** Get selected text */
export function getSelectionText(): string {
  return window.getSelection()?.toString() ?? "";
}

/** Select all text in an element */
export function selectAll(el: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/** Clear selection */
export function clearSelection(): void {
  window.getSelection()?.removeAllRanges();
}

/** Copy text to clipboard */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.cssText = "position:fixed;left:-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

/** Read text from clipboard */
export async function readFromClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return "";
  }
}

// --- Form Helpers ---

/** Serialize form data to object */
export function serializeForm(form: HTMLFormElement): Record<string, string> {
  const data: Record<string, string> = {};
  const formData = new FormData(form);
  for (const [key, value] of formData.entries()) {
    data[key] = String(value);
  }
  return data;
}

/** Populate form from object */
export function populateForm(form: HTMLFormElement, data: Record<string, string>): void {
  for (const [key, value] of Object.entries(data)) {
    const field = form.elements.namedItem(key) as HTMLElement | RadioNodeList | null;
    if (field instanceof HTMLElement) {
      if ("value" in field) {
        (field as HTMLInputElement).value = value;
      }
    } else if (field) {
      // Radio/checkbox group
      for (const item of field) {
        if ((item as HTMLInputElement).value === value) {
          (item as HTMLInputElement).checked = true;
        }
      }
    }
  }
}

/** Reset form fields */
export function resetForm(form: HTMLFormElement): void {
  form.reset();
}

// --- Misc Utilities ---

/** Simple HTML sanitizer (basic XSS prevention) */
function sanitizeHtml(html: string): string {
  const temp = document.createElement("div");
  temp.textContent = html;
  return temp.innerHTML;
}

/** Wait for DOM ready */
export function domReady(): Promise<void> {
  if (document.readyState !== "loading") return Promise.resolve();
  return new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", resolve, { once: true });
  });
}

/** Wait for an element to exist in DOM */
export function waitForElement(
  selector: string,
  root: ParentNode = document,
  timeout = 10000,
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const existing = root.querySelector(selector);
    if (existing) { resolve(existing); return; }

    const timer = setTimeout(() => {
      obs.disconnect();
      reject(new Error(`waitForElement timed out: ${selector}`));
    }, timeout);

    const obs = new MutationObserver(() => {
      const el = root.querySelector(selector);
      if (el) {
        clearTimeout(timer);
        obs.disconnect();
        resolve(el);
      }
    });

    obs.observe(root instanceof Document ? document.documentElement : root, {
      childList: true,
      subtree: true,
    });
  });
}

/** Measure text dimensions in a virtual container */
export function measureText(
  text: string,
  options?: {
    font?: string;
    maxWidth?: number;
    container?: HTMLElement;
  },
): { width: number; height: number } {
  const container = options?.container ?? document.createElement("div");
  const wasAttached = !!container.parentNode;

  if (!wasAttached) {
    Object.assign(container.style, {
      position: "absolute",
      visibility: "hidden",
      pointerEvents: "none",
      whiteSpace: options?.maxWidth ? "pre-wrap" : "nowrap",
      font: options?.font ?? "14px system-ui",
      maxWidth: options?.maxWidth ? `${options.maxWidth}px` : undefined,
    });
    document.body.appendChild(container);
  }

  container.textContent = text;
  const rect = container.getBoundingClientRect();
  const result = { width: rect.width, height: rect.height };

  if (!wasAttached) {
    document.body.removeChild(container);
  }

  return result;
}

/** Detect if running inside an iframe */
export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // Cross-origin iframe
  }
}

/** Get viewport dimensions */
export function getViewportSize(): { width: number; height: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/** Get device pixel ratio */
export function getDevicePixelRatio(): number {
  return window.devicePixelRatio ?? 1;
}
