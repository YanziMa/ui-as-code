/**
 * DOM manipulation utilities v2: query helpers, element creation, class/style management,
 * animation helpers, event delegation, mutation observer wrapper, DOM diffing.
 */

// --- Query Helpers ---

/** Query selector with null safety and type narrowing */
export function $<T extends Element = HTMLElement>(
  selector: string,
  parent: Element | Document = document,
): T | null {
  return parent.querySelector(selector) as T | null;
}

/** Query selector all with type safety */
export function $$<T extends Element = HTMLElement>(
  selector: string,
  parent: Element | Document = document,
): T[] {
  return Array.from(parent.querySelectorAll(selector)) as T[];
}

/** Find closest ancestor matching selector */
export function closest<T extends Element = HTMLElement>(
  el: Element,
  selector: string,
): T | null {
  return el.closest(selector) as T | null;
}

/** Check if element matches selector */
export function matches(el: Element, selector: string): boolean {
  return el.matches?.(selector) ?? false;
}

/** Find elements by data attribute */
export function findByDataAttr<T extends Element = HTMLElement>(
  parent: Element | Document,
  attr: string,
  value?: string,
): T[] {
  const selector = value !== undefined
    ? `[${attr}="${value}"]`
    : `[${attr}]`;
  return $$<T>(selector, parent);
}

/** Get all focusable elements within a container */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return $$<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]',
    container,
  ).filter((el) => el.offsetParent !== null || el.tagName === "INPUT");
}

/** Get first visible ancestor */
export function getVisibleParent(el: Element): Element | null {
  let current: Element | null = el;
  while (current && current !== document.body) {
    const style = getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity || "1") === 0) {
      return current.parentElement;
    }
    current = current.parentElement;
  }
  return null;
}

// --- Element Creation ---

/** Create element with attributes and children in one call */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Partial<HTMLElementTagNameMap[K]> & Record<string, string>,
  ...children: (string | Node)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "className") {
        el.className = value as string;
      } else if (key === "style" && typeof value === "object") {
        Object.assign(el.style, value);
      } else if (key.startsWith("on") && typeof value === "function") {
        (el as unknown as Record<string, unknown>)[key] = value;
      } else if (key.startsWith("data-")) {
        el.setAttribute(key, String(value));
      } else {
        (el as unknown as Record<string, unknown>)[key] = value;
      }
    }
  }

  for (const child of children) {
    if (typeof child === "string") {
      el.appendChild(document.createTextNode(child));
    } else if (child) {
      el.appendChild(child);
    }
  }

  return el;
}

/** Shorthand: create div */
export function div(
  attrs?: Record<string, unknown>,
  ...children: (string | Node)[]
): HTMLDivElement {
  return createElement("div", attrs as Record<string, string>, ...children);
}

/** Shorthand: create span */
export function span(
  attrs?: Record<string, unknown>,
  ...children: (string | Node)[]
): HTMLSpanElement {
  return createElement("span", attrs as Record<string, string>, ...children);
}

/** Create fragment from children */
export function fragment(...children: (string | Node)[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const child of children) {
    frag.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return frag;
}

/** Create SVG element */
export function createSvgElement(
  tag: string,
  attrs?: Record<string, string | number>,
): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, String(value));
    }
  }
  return el;
}

// --- Class Management ---

/** Add one or more classes */
export function addClass(el: Element, ...classes: string[]): void {
  el.classList.add(...classes);
}

/** Remove one or more classes */
export function removeClass(el: Element, ...classes: string[]): void {
  el.classList.remove(...classes);
}

/** Toggle a class */
export function toggleClass(el: Element, className: string, force?: boolean): void {
  el.classList.toggle(className, force);
}

/** Check if element has class */
export function hasClass(el: Element, className: string): boolean {
  return el.classList.contains(className);
}

/** Replace a class with another */
export function replaceClass(el: Element, oldClass: string, newClass: string): void {
  el.classList.remove(oldClass);
  el.classList.add(newClass);
}

/** Toggle between two classes */
export function swapClasses(el: Element, classA: string, classB: string): void {
  if (el.classList.contains(classA)) {
    replaceClass(el, classA, classB);
  } else {
    replaceClass(el, classB, classA);
  }
}

// --- Style Management ---

/** Set multiple styles at once */
export function setStyles(el: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  Object.assign(el.style, styles);
}

/** Get computed style value */
export function getStyle(el: Element, property: string): string {
  return getComputedStyle(el).getPropertyValue(property);
}

/** Show element (set display to previous or block) */
export function show(el: HTMLElement, display = ""): void {
  if (!display) {
    // Try to restore from data attribute
    const saved = (el as unknown as Record<string, string>).dataOriginalDisplay;
    el.style.display = saved ?? "";
  } else {
    el.style.display = display;
  }
}

/** Hide element */
export function hide(el: HTMLElement): void {
  if (el.style.display !== "none") {
    (el as unknown as Record<string, string>).dataOriginalDisplay = el.style.display || getComputedStyle(el).display;
  }
  el.style.display = "none";
}

/** Toggle visibility */
export function toggleVisibility(el: HTMLElement): void {
  if (getComputedStyle(el).display === "none") show(el);
  else hide(el);
}

/** Check if element is visible */
export function isVisible(el: Element): boolean {
  const style = getComputedStyle(el);
  return style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    el.offsetParent !== null; // Not strictly correct but good enough
}

/** Get element's bounding rect relative to viewport */
export function getRect(el: Element): DOMRect {
  return el.getBoundingClientRect();
}

/** Get element's position relative to offset parent */
export function getPosition(el: Element): { top: number; left: number } {
  return { top: el.offsetTop, left: el.offsetLeft };
}

/** Scroll element into view smoothly */
export function scrollIntoView(
  el: Element,
  options?: ScrollIntoViewOptions & { center?: boolean },
): void {
  if (options?.center) {
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  } else {
    el.scrollIntoView({ behavior: "smooth", ...options });
  }
}

/** Scroll to top of page */
export function scrollToTop(smooth = true): void {
  window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
}

/** Scroll to bottom of page */
export function scrollToBottom(smooth = true): void {
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth ? "smooth" : "auto" });
}

// --- Attribute Management ---

/** Set attribute only if value is not null/undefined */
export function setAttr(el: Element, name: string, value: string | number | boolean | null): void {
  if (value == null) el.removeAttribute(name);
  else if (typeof value === "boolean") value ? el.setAttribute(name, "") : el.removeAttribute(name);
  else el.setAttribute(name, String(value));
}

/** Get data attribute value */
export function getData<T = string>(el: Element, key: string): T | null {
  return el.dataset[key] as T | null;
}

/** Set data attribute */
export function setData(el: Element, key: string, value: string | number | boolean): void {
  el.dataset[key] = String(value);
}

// --- Event Delegation ---

/** Delegate events to a parent container */
export function delegate<K extends keyof HTMLElementEventMap>(
  container: Element,
  eventType: K,
  selector: string,
  handler: (e: HTMLElementEventMap[K], target: HTMLElement) => void,
  options?: AddEventListenerOptions,
): () => void {
  const listener = (event: Event) => {
    const target = (event.target as Element)?.closest(selector) as HTMLElement | null;
    if (target && container.contains(target)) {
      handler(event as HTMLElementEventMap[K], target);
    }
  };

  container.addEventListener(eventType, listener as EventListener, options);

  return () => container.removeEventListener(eventType, listener as EventListener, options);
}

/** One-time delegation */
export function delegateOnce<K extends keyof HTMLElementEventMap>(
  container: Element,
  eventType: K,
  selector: string,
  handler: (e: HTMLElementEventMap[K], target: HTMLElement) => void,
): () => void {
  const off = delegate(container, eventType, selector, (e, target) => {
    handler(e, target);
    off();
  });
  return off;
}

// --- Mutation Observer Wrapper ---

export interface ObserveOptions {
  attributes?: boolean;
  childList?: boolean;
  subtree?: boolean;
  characterData?: boolean;
  attributeFilter?: string[];
  /** Debounce callback (ms) */
  debounceMs?: number;
}

/** Observe DOM mutations with convenience API */
export function observeMutations(
  target: Element,
  callback: (mutations: MutationRecord[], observer: MutationObserver) => void,
  options: ObserveOptions = {},
): () => void {
  const { debounceMs, ...observeOptions } = options;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const wrappedCallback = (mutations: MutationRecord[], obs: MutationObserver) => {
    if (debounceMs) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => callback(mutations, obs), debounceMs);
    } else {
      callback(mutations, obs);
    }
  };

  const observer = new MutationObserver(wrappedCallback);
  observer.observe(target, {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true,
    ...observeOptions,
  });

  return () => { observer.disconnect(); if (timeoutId) clearTimeout(timeoutId); };
}

/** Wait for an element to appear in DOM */
export function waitForElement(
  selector: string,
  parent: Element | Document = document,
  timeout = 10000,
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const existing = $(selector, parent);
    if (existing) { resolve(existing); return; }

    const observer = new MutationObserver(() => {
      const el = $(selector, parent);
      if (el) { observer.disconnect(); resolve(el); }
    });

    observer.observe(parent === document ? document.documentElement : parent, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
    }, timeout);
  });
}

/** Wait for element to be removed from DOM */
export function waitForRemoval(
  element: Element,
  timeout = 10000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!document.contains(element)) { resolve(); return; }

    const observer = new MutationObserver(() => {
      if (!document.contains(element)) { observer.disconnect(); resolve(); }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error("Element still in DOM after timeout"));
    }, timeout);
  });
}

// --- Dimension Utilities ---

/** Get full element dimensions including margins */
export function getFullSize(el: HTMLElement): {
  width: number;
  height: number;
  marginBox: { top: number; right: number; bottom: number; left: number };
  paddingBox: { top: number; right: number; bottom: number; left: number };
} {
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  return {
    width: rect.width,
    height: rect.height,
    marginBox: {
      top: parseFloat(style.marginTop),
      right: parseFloat(style.marginRight),
      bottom: parseFloat(style.marginBottom),
      left: parseFloat(style.marginLeft),
    },
    paddingBox: {
      top: parseFloat(style.paddingTop),
      right: parseFloat(style.paddingRight),
      bottom: parseFloat(style.paddingBottom),
      left: parseFloat(style.paddingLeft),
    },
  };
}

/** Check if point is inside element */
export function isPointInside(
  el: Element,
  x: number,
  y: number,
): boolean {
  const rect = el.getBoundingClientRect();
  return (
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom
  );
}

/** Check if two elements overlap */
export function doElementsOverlap(a: Element, b: Element): boolean {
  const ra = a.getBoundingClientRect();
  const rb = b.getBoundingClientRect();
  return !(
    rb.left > ra.right ||
    rb.right < ra.left ||
    rb.top > ra.bottom ||
    rb.bottom < ra.top
  );
}

/** Insert element after reference */
export function insertAfter(newNode: Node, referenceNode: Node): void {
  referenceNode.parentNode?.insertBefore(newNode, referenceNode.nextSibling);
}

/** Insert element before reference */
export function insertBefore(newNode: Node, referenceNode: Node): void {
  referenceNode.parentNode?.insertBefore(newNode, referenceNode);
}

/** Replace element with another */
export function replaceElement(oldEl: Element, newEl: Element): void {
  oldEl.parentNode?.replaceChild(newEl, oldEl);
}

/** Remove element from DOM */
export function removeElement(el: Element): void {
  el.remove();
}

/** Empty all children from element */
export function empty(el: Element): void {
  el.innerHTML = "";
}

/** Clone element deeply */
export function cloneDeep<T extends Node>(el: T, events = false): T {
  return el.cloneNode(events ? undefined : true) as T;
}

/** Wrap element with another element */
export function wrap(inner: Element, outer: Element): void {
  inner.parentNode?.insertBefore(outer, inner);
  outer.appendChild(inner);
}

/** Unwrap element (replace with its children) */
export function unwrap(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) {
    parent.insertBefore(el.firstChild!, el);
  }
  parent.removeChild(el);
}
