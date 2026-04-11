/**
 * DOM Utilities: Core DOM manipulation helpers including element creation,
 * query shortcuts, DOM traversal, event delegation, template rendering,
 * fragment operations, and DOM diffing utilities.
 */

// --- Types ---

export interface CreateElementOptions {
  tag?: string;
  id?: string;
  className?: string | string[];
  attrs?: Record<string, string>;
  styles?: Record<string, string>;
  text?: string;
  html?: string;
  children?: (HTMLElement | string)[];
  events?: Record<string, EventListener>;
  dataset?: Record<string, string>;
  aria?: Record<string, string>;
}

export interface QueryOptions {
  /** Scope search to a container */
  scope?: Element | Document;
  /** Return all matches or just first? */
  all?: boolean;
}

export interface DomDiffResult {
  /** Elements that were added */
  added: Element[];
  /** Elements that were removed */
  removed: Element[];
  /** Elements that changed attributes */
  modified: { el: Element; attr: string; oldValue: string; newValue: string }[];
}

// --- Element Creation ---

/**
 * Create an HTML element with a fluent options API.
 *
 * @example
 * createEl({ tag: "button", className: "btn", text: "Click", onClick: handler })
 */
export function createEl(options: CreateElementOptions = {}): HTMLElement {
  const {
    tag = "div",
    id,
    className,
    attrs = {},
    styles = {},
    text,
    html,
    children = [],
    events = {},
    dataset = {},
    aria = {},
  } = options;

  const el = document.createElement(tag);

  if (id) el.id = id;

  if (className) {
    if (Array.isArray(className)) {
      el.className = className.filter(Boolean).join(" ");
    } else {
      el.className = className;
    }
  }

  for (const [key, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined) {
      el.setAttribute(key, value);
    }
  }

  for (const [key, value] of Object.entries(styles)) {
    (el.style as Record<string, string>)[key] = value;
  }

  for (const [key, value] of Object.entries(dataset)) {
    el.dataset[key] = value;
  }

  for (const [key, value] of Object.entries(aria)) {
    el.setAttribute(`aria-${key}`, value);
  }

  if (text) el.textContent = text;
  if (html) el.innerHTML = html;

  for (const child of children) {
    if (typeof child === "string") {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(child);
    }
  }

  for (const [event, listener] of Object.entries(events)) {
    el.addEventListener(event, listener);
  }

  return el;
}

/** Shorthand to create a <div> with optional class and children */
export function div(
  className?: string | string[],
  ...children: (HTMLElement | string)[]
): HTMLElement {
  return createEl({ tag: "div", className, children });
}

/** Shorthand to create a <span> */
export function span(
  className?: string | string[],
  ...children: (HTMLElement | string)[]
): HTMLElement {
  return createEl({ tag: "span", className, children });
}

/** Shorthand to create a <p> */
export function p(text?: string, className?: string): HTMLElement {
  return createEl({ tag: "p", className, text });
}

/** Shorthand to create a button */
export function btn(
  text?: string,
  className?: string,
  onClick?: EventListener,
): HTMLButtonElement {
  const el = document.createElement("button");
  if (text) el.textContent = text;
  if (className) el.className = className;
  if (onClick) el.addEventListener("click", onClick);
  return el;
}

/** Create an SVG element */
export function createSvg(
  tagName: string,
  attrs: Record<string, string | number> = {},
): SVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(ns, tagName);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

// --- Query Shortcuts ---

/** Query selector shorthand — returns first match or null */
export function $<T extends Element = Element>(
  selector: string,
  scope?: Element | Document,
): T | null {
  return (scope ?? document).querySelector<T>(selector);
}

/** Query selector all shorthand — returns array */
export function $$<T extends Element = Element>(
  selector: string,
  scope?: Element | Document,
): T[] {
  return Array.from((scope ?? document).querySelectorAll<T>(selector));
}

/** Query with fallback — returns element or throws */
export function requireSelector<T extends Element = Element>(
  selector: string,
  scope?: Element | Document,
): T {
  const el = $(selector, scope);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

/** Get element by ID */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/** Get elements by class name */
export function byClass(className: string, scope?: Element): HTMLElement[] {
  return Array.from((scope ?? document).getElementsByClassName(className)) as HTMLElement[];
}

/** Get elements by tag name */
export function byTag(tag: string, scope?: Element): HTMLElement[] {
  return Array.from((scope ?? document).getElementsByTagName(tag)) as HTMLElement[];
}

// --- DOM Traversal ---

/** Walk up the DOM tree from an element, calling visitor for each ancestor */
export function walkUp(
  start: Element,
  visitor: (el: Element) => boolean | void,
  stopAt?: Element,
): void {
  let current: Element | null = start.parentElement;
  while (current && current !== stopAt && current !== document.documentElement) {
    const result = visitor(current);
    if (result === false) break; // Stop walking
    current = current.parentElement;
  }
}

/** Walk down the DOM tree (depth-first) */
export function walkDown(
  root: Element,
  visitor: (el: Element) => boolean | void,
): void {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        return visitor(node as Element) === false
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  let node = walker.nextNode();
  while (node) {
    node = walker.nextNode();
  }
}

/** Get the next sibling element (skipping text nodes) */
export function nextSibling(el: Element): Element | null {
  let sib = el.nextElementSibling;
  return sib;
}

/** Get the previous sibling element */
export function prevSibling(el: Element): Element | null {
  return el.previousElementSibling;
}

/** Get all siblings of an element (excluding itself) */
export function siblings(el: Element): Element[] {
  return Array.from(el.parentElement?.children ?? []).filter((c) => c !== el);
}

/** Get index of element among its siblings */
export function siblingIndex(el: Element): number {
  return Array.from(el.parentElement?.children ?? []).indexOf(el);
}

/** Check if an element is the last child */
export function isLastChild(el: Element): boolean {
  return el === el.parentElement?.lastElementChild;
}

/** Check if an element is the first child */
export function isFirstChild(el: Element): boolean {
  return el === el.parentElement?.firstElementChild;
}

// --- DOM Manipulation ---

/** Remove all children from an element */
export function empty(el: Element): void {
  el.textContent = "";
}

/** Replace all children of an element */
export function setChildren(el: Element, ...children: (Node | string)[]): void {
  el.textContent = "";
  for (const child of children) {
    el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
}

/** Insert an element at a specific index among parent's children */
export function insertAtIndex(parent: Element, child: Element, index: number): void {
  const ref = parent.children[index];
  if (ref) {
    parent.insertBefore(child, ref);
  } else {
    parent.appendChild(child);
  }
}

/** Move an element to a new position in its parent */
export function moveToIndex(el: Element, newIndex: number): void {
  const parent = el.parentElement;
  if (!parent) return;
  insertAtIndex(parent, el, newIndex);
}

/** Swap positions of two sibling elements */
export function swapElements(a: Element, b: Element): void {
  const parent = a.parentElement;
  if (!parent || parent !== b.parentElement) return;

  const aIdx = siblingIndex(a);
  const bIdx = siblingIndex(b);

  const placeholder = document.createElement("span");
  parent.replaceChild(placeholder, a);
  parent.replaceChild(a, b);
  parent.replaceChild(b, placeholder);
  parent.removeChild(placeholder);
}

/** Wrap an element with another element */
export function wrap(inner: Element, wrapper: HTMLElement): HTMLElement {
  inner.parentNode?.replaceChild(wrapper, inner);
  wrapper.appendChild(inner);
  return wrapper;
}

/** Unwrap an element (replace it with its children) */
export function unwrap(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
}

// --- Fragment Operations ---

/** Create a DocumentFragment from HTML string */
export function htmlToFragment(html: string): DocumentFragment {
  const range = document.createRange();
  range.selectNodeContents(document.body);
  return range.createContextualFragment(html);
}

/** Create multiple elements from HTML string and append to container */
export function appendHtml(container: Element, html: string): void {
  container.appendChild(htmlToFragment(html));
}

/** Prepend HTML to a container */
export function prependHtml(container: Element, html: string): void {
  const frag = htmlToFragment(html);
  container.insertBefore(frag, container.firstChild);
}

// --- Event Delegation ---

/**
 * Set up event delegation on a container.
 * Events on matching descendants will trigger the handler.
 *
 * @returns Unsubscribe function
 */
export function delegate<K extends keyof HTMLElementEventMap>(
  container: Element,
  eventType: K,
  selector: string,
  handler: (e: HTMLElementEventMap[K], target: HTMLElement) => void,
): () => void {
  const listener = (event: Event): void => {
    const target = (event.target as Element)?.closest<HTMLElement>(selector);
    if (target && container.contains(target)) {
      handler(event as HTMLElementEventMap[K], target);
    }
  };

  container.addEventListener(eventType, listener);
  return () => container.removeEventListener(eventType, listener);
}

/** Delegate click events */
export function delegateClick(
  container: Element,
  selector: string,
  handler: (e: MouseEvent, target: HTMLElement) => void,
): () => void {
  return delegate(container, "click", selector, handler);
}

// --- Template Rendering ---

/** Simple template engine: replace {{key}} placeholders with values */
export function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = data[key];
    return val !== undefined ? String(val) : "";
  });
}

/** Render a template into a container element */
export function renderInto(
  container: Element,
  template: string,
  data: Record<string, unknown>,
): void {
  container.innerHTML = renderTemplate(template, data);
}
