/**
 * Advanced DOM manipulation helpers: element creation with options,
 * query helpers, DOM diffing, class/style management, event delegation,
 * and safe HTML insertion.
 */

// --- Element Creation ---

export interface CreateElementOptions<K extends keyof HTMLElementTagNameMap> {
  /** Tag name */
  tag: K;
  /** CSS classes (space-separated or array) */
  className?: string | string[];
  /** Inline styles */
  style?: Record<string, string>;
  /** Attributes to set */
  attrs?: Record<string, string>;
  /** Dataset attributes */
  dataset?: Record<string, string>;
  /** Inner text content */
  text?: string;
  /** Inner HTML content */
  html?: string;
  /** Child elements */
  children?: HTMLElement[];
  /** Event listeners */
  events?: Record<string, EventListener>;
  /** ARIA attributes */
  aria?: Record<string, string>;
}

/** Create an element with a declarative options object */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  options: CreateElementOptions<K>,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(options.tag);

  if (options.className) {
    const classes = Array.isArray(options.className)
      ? options.className.join(" ")
      : options.className;
    el.className = classes;
  }

  if (options.style) {
    Object.assign(el.style, options.style);
  }

  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      el.setAttribute(key, value);
    }
  }

  if (options.dataset) {
    for (const [key, value] of Object.entries(options.dataset)) {
      el.dataset[key] = value;
    }
  }

  if (options.text) {
    el.textContent = options.text;
  } else if (options.html) {
    el.innerHTML = options.html;
  }

  if (options.children) {
    for (const child of options.children) {
      el.appendChild(child);
    }
  }

  if (options.events) {
    for (const [event, handler] of Object.entries(options.events)) {
      el.addEventListener(event, handler);
    }
  }

  if (options.aria) {
    for (const [key, value] of Object.entries(options.aria)) {
      el.setAttribute(`aria-${key}`, value);
    }
  }

  return el;
}

/** Shorthand: create a div */
export function div(options?: Omit<CreateElementOptions<"div">, "tag">): HTMLDivElement {
  return createElement({ ...options, tag: "div" });
}

/** Shorthand: create a span */
export function span(options?: Omit<CreateElementOptions<"span">, "tag">): HTMLSpanElement {
  return createElement({ ...options, tag: "span" });
}

/** Shorthand: create a button */
export function btn(options?: Omit<CreateElementOptions<"button">, "tag">): HTMLButtonElement {
  return createElement({ ...options, tag: "button" });
}

// --- Query Helpers ---

/** Query selector that returns typed element or null */
export function qs<K extends keyof HTMLElementTagNameMap>(
  selector: string,
  root?: Document | Element,
): HTMLElementTagNameMap[K] | null {
  return (root ?? document).querySelector(selector) as HTMLElementTagNameMap[K] | null;
}

/** Query selector all returning typed elements */
export function qsa<K extends keyof HTMLElementTagNameMap>(
  selector: string,
  root?: Document | Element,
): HTMLElementTagNameMap[K][] {
  return Array.from((root ?? document).querySelectorAll(selector)) as HTMLElementTagNameMap[K][];
}

/** Find closest ancestor matching selector (with type safety) */
export function closest<K extends keyof HTMLElementTagNameMap>(
  el: Element,
  selector: string,
): HTMLElementTagNameMap[K] | null {
  return el.closest(selector) as HTMLElementTagNameMap[K] | null;
}

/** Check if element matches any of the selectors */
export function matchesAny(el: Element, selectors: string[]): boolean {
  return selectors.some((s) => el.matches(s));
}

// --- Class Management ---

/** Toggle a class conditionally */
export function toggleClass(el: Element, className: string, force?: boolean): void {
  el.classList.toggle(className, force);
}

/** Add multiple classes at once */
export function addClasses(el: Element, ...classes: string[]): void {
  el.classList.add(...classes);
}

/** Remove multiple classes at once */
export function removeClasses(el: Element, ...classes: string[]): void {
  el.classList.remove(...classes);
}

/** Replace one class with another */
export function replaceClass(el: Element, oldClass: string, newClass: string): void {
  el.classList.remove(oldClass);
  el.classList.add(newClass);
}

/** Check if element has all specified classes */
export function hasClasses(el: Element, ...classes: string[]): boolean {
  return classes.every((c) => el.classList.contains(c));
}

// --- Style Helpers ---

/** Get computed style property value */
export function getStyle(el: Element, property: string): string {
  return window.getComputedStyle(el).getPropertyValue(property);
}

/** Set multiple styles at once */
export function setStyles(el: HTMLElement, styles: Record<string, string>): void {
  Object.assign(el.style, styles);
}

/** Show an element (display-aware) */
export function show(el: HTMLElement, display = ""): void {
  const prevDisplay = (el as any).__prevDisplay as string | undefined;
  el.style.display = prevDisplay ?? display;
  if (!el.style.display) el.style.removeProperty("display");
}

/** Hide an element (preserving original display) */
export function hide(el: HTMLElement): void {
  if (el.style.display !== "none") {
    (el as any).__prevDisplay = el.style.display || getStyle(el, "display");
  }
  el.style.display = "none";
}

/** Toggle visibility */
export function toggleVisibility(el: HTMLElement, show?: boolean): void {
  if (show === undefined) show = el.style.display === "none";
  show ? this.show(el) : this.hide(el);
}

// --- DOM Diffing ---

interface DiffOperation {
  type: "add" | "remove" | "replace" | "move" | "attr" | "text";
  target?: Node;
  node?: Node;
  oldNode?: Node;
  attrName?: string;
  oldValue?: string;
  newValue?: string;
}

/** Simple diff between two elements (shallow comparison) */
export function diffElements(oldEl: HTMLElement, newEl: HTMLElement): DiffOperation[] {
  const ops: DiffOperation[] = [];

  // Attribute diffs
  const oldAttrs = Array.from(oldEl.attributes);
  const newAttrs = Array.from(newEl.attributes);

  for (const attr of oldAttrs) {
    if (!newEl.hasAttribute(attr.name)) {
      ops.push({ type: "attr", target: oldEl, attrName: attr.name, oldValue: attr.value, newValue: "" });
    } else if (newEl.getAttribute(attr.name) !== attr.value) {
      ops.push({ type: "attr", target: oldEl, attrName: attr.name, oldValue: attr.value, newValue: newEl.getAttribute(attr.name)! });
    }
  }

  for (const attr of newAttrs) {
    if (!oldEl.hasAttribute(attr.name)) {
      ops.push({ type: "attr", target: oldEl, attrName: attr.name, oldValue: "", newValue: attr.value });
    }
  }

  // Child count diff
  if (oldEl.children.length !== newEl.children.length) {
    // Simplified: just note the difference
    ops.push({ type: "replace", target: oldEl, node: newEl, oldNode: oldEl });
  }

  return ops;
}

// --- Safe HTML ---

/** Safely set innerHTML (sanitizes dangerous tags) */
export function setSafeHTML(el: HTMLElement, html: string): void {
  const temp = document.createElement("div");
  temp.textContent = html; // Escapes HTML
  // For cases where you actually want HTML, use a sanitizer library
  // This is a basic XSS prevention measure
  el.innerHTML = sanitizeHTML(html);
}

/** Basic HTML sanitization (removes script tags and event handlers) */
export function sanitizeHTML(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "");
}

// --- Event Delegation ---

/**
 * Set up event delegation on a parent element.
 * Returns unsubscribe function.
 */
export function delegate<K extends keyof HTMLElementEventMap>(
  parent: HTMLElement,
  eventType: K,
  selector: string,
  handler: (e: HTMLElementEventMap[K], matchedEl: HTMLElement) => void,
): () => void {
  const listener = (event: Event) => {
    const target = (event.target as HTMLElement)?.closest(selector);
    if (target && parent.contains(target)) {
      handler(event as HTMLElementEventMap[K], target);
    }
  };

  parent.addEventListener(eventType, listener);
  return () => parent.removeEventListener(eventType, listener);
}

// --- Insertion Position ---

/** Insert element after reference element */
export function insertAfter(newEl: HTMLElement, refEl: HTMLElement): void {
  refEl.parentNode?.insertBefore(newEl, refEl.nextSibling);
}

/** Insert element before reference element */
export function insertBefore(newEl: HTMLElement, refEl: HTMLElement): void {
  refEl.parentNode?.insertBefore(newEl, refEl);
}

/** Replace an element with another, preserving position */
export function replaceEl(oldEl: HTMLElement, newEl: HTMLElement): void {
  oldEl.parentNode?.replaceChild(newEl, oldEl);
}

/** Wrap an element in a wrapper element */
export function wrap(el: HTMLElement, wrapper: HTMLElement): HTMLElement {
  el.parentNode?.insertBefore(wrapper, el);
  wrapper.appendChild(el);
  return wrapper;
}

/** Unwrap an element (replace it with its children) */
export function unwrap(el: HTMLElement): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
}
