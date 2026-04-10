/**
 * DOM Builder: Declarative, chainable DOM construction API with element
 * creation, attribute/style/class management, event binding, safe HTML
 * escaping, DOM diff patching, fragment building, SVG support, and
 * builder pattern for efficient DOM tree construction.
 */

// --- Types ---

export type DomNode = Element | DocumentFragment | Text | Comment;

export interface AttributeMap {
  [key: string]: string | number | boolean | null | undefined;
}

export interface StyleMap {
  [property: string]: string | number | null | undefined;
}

export interface EventMap {
  [event: string]: EventListenerOrEventListenerObject;
}

export interface BuilderOptions {
  /** Namespace URI (e.g., "http://www.w3.org/2000/svg") */
  namespace?: string;
  /** Auto-escape text content */
  escapeHtml?: boolean;
  /** Default document target */
  document?: Document;
}

export interface DomPatch {
  type: "add" | "remove" | "replace" | "attr" | "text" | "move";
  selector?: string;
  node?: DomNode;
  attributes?: AttributeMap;
  textContent?: string;
  referenceNode?: DomNode;
  position?: InsertPosition;
}

export interface DiffResult {
  patches: DomPatch[];
  stats: { added: number; removed: number; modified: number; moved: number };
}

// --- HTML Escape ---

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
};

const HTML_UNESCAPE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(HTML_ESCAPE_MAP).map(([k, v]) => [v, k])
);

/** Escape HTML special characters */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'/]/g, (ch) => HTML_ESCAPE_MAP[ch]!);
}

/** Unescape HTML entities */
export function unescapeHtml(str: string): string {
  return str.replace(/&(amp|lt|gt|quot|&#39;|&#x2F);/g, (_, entity) =>
    HTML_UNESCAPE_MAP[`&${entity}`] ?? `&${entity}`
  );
}

// --- Main Builder Class ---

/**
 * Chainable DOM builder for efficient element creation and manipulation.
 *
 * ```ts
 * const el = new DomBuilder("div")
 *   .id("container")
 *   .class("wrapper", "active")
 *   .attr({ role: "main", "aria-label": "Main content" })
 *   .style({ display: "flex", gap: "1rem" })
 *   .on("click", handleClick)
 *   .append(
 *     new DomBuilder("h1").text("Hello World").element,
 *     new DomBuilder("p").html("<em>Nice</em>").element,
 *   )
 *   .element;
 *
 * document.body.appendChild(el);
 * ```
 */
export class DomBuilder {
  readonly element: Element;
  private doc: Document;

  constructor(tagName: string, options?: BuilderOptions) {
    this.doc = options?.document ?? document;
    const ns = options?.namespace;
    this.element = ns
      ? this.doc.createElementNS(ns, tagName)
      : this.doc.createElement(tagName);
  }

  // --- Identity ---

  /** Set element ID */
  id(value: string): this {
    this.element.id = value;
    return this;
  }

  /** Add CSS classes (variadic) */
  class(...names: (string | false | null | undefined)[]): this {
    for (const name of names) {
      if (name) this.element.classList.add(name);
    }
    return this;
  }

  /** Remove CSS classes (variadic) */
  removeClass(...names: string[]): this {
    this.element.classList.remove(...names);
    return this;
  }

  /** Toggle a CSS class */
  toggleClass(name: string, force?: boolean): this {
    this.element.classList.toggle(name, force);
    return this;
  }

  /** Check if has class */
  hasClass(name: string): boolean {
    return this.element.classList.contains(name);
  }

  // --- Attributes ---

  /** Set multiple attributes from an object */
  attr(attrs: AttributeMap): this {
    for (const [key, val] of Object.entries(attrs)) {
      if (val === undefined || val === null) {
        this.element.removeAttribute(key);
      } else if (val === false || val === "") {
        this.element.removeAttribute(key);
      } else if (val === true) {
        // Boolean attribute (e.g., disabled, checked)
        if (key in this.element || /^(data-|aria-)/.test(key)) {
          this.element.setAttribute(key, "");
        }
      } else {
        this.element.setAttribute(key, String(val));
      }
    }
    return this;
  }

  /** Get an attribute value */
  getAttr(name: string): string | null {
    return this.element.getAttribute(name);
  }

  /** Remove an attribute */
  removeAttr(name: string): this {
    this.element.removeAttribute(name);
    return this;
  }

  /** Set data attribute (data-*) */
  data(key: string, value: string | number | boolean): this {
    this.element.dataset[key] = String(value);
    return this;
  }

  /** Get data attribute */
  getData(key: string): string | undefined {
    return this.element.dataset[key];
  }

  // --- Style ---

  /** Set inline styles from an object */
  style(styles: StyleMap): this {
    for (const [prop, val] of Object.entries(styles)) {
      if (val === null || val === undefined) {
        this.element.style.removeProperty(prop);
      } else {
        this.element.style.setProperty(prop, String(val));
      }
    }
    return this;
  }

  /** Get computed style value */
  getStyle(property: string): string {
    return getComputedStyle(this.element).getPropertyValue(property);
  }

  /** Show element (display default or specified) */
  show(displayValue?: string): this {
    this.element.style.display = displayValue ?? "";
    return this;
  }

  /** Hide element */
  hide(): this {
    this.element.style.display = "none";
    return this;
  }

  /** Toggle visibility */
  toggleVisible(show?: boolean): this {
    if (show === undefined) {
      this.toggleClass("hidden");
    } else if (show) {
      this.removeClass("hidden");
      this.show();
    } else {
      this.addClass("hidden");
      this.hide();
    }
    return this;
  }

  // --- Content ---

  /** Set text content (auto-escaped) */
  text(content: string): this {
    this.element.textContent = content;
    return this;
  }

  /** Set innerHTML (use with caution — only for trusted content) */
  html(markup: string): this {
    this.element.innerHTML = markup;
    return this;
  }

  /** Append child nodes (variadic) */
  append(...nodes: DomNode[]): this {
    for (const node of nodes) {
      this.element.appendChild(node);
    }
    return this;
  }

  /** Prepend child nodes */
  prepend(...nodes: DomNode[]): this {
    for (const node of nodes.reverse()) {
      this.element.prepend(node);
    }
    return this;
  }

  /** Insert after the current element's last child */
  appendTo(parent: Element | string): this {
    const p = typeof parent === "string" ? this.doc.querySelector(parent)! : parent;
    if (p) p.appendChild(this.element);
    return this;
  }

  /** Insert before a reference node */
  insertBefore(reference: DomNode): this {
    reference.parentNode?.insertBefore(this.element, reference);
    return this;
  }

  /** Insert after a reference node */
  insertAfter(reference: DomNode): this {
    reference.parentNode?.insertBefore(this.element, reference.nextSibling);
    return this;
  }

  /** Replace current element with another */
  replaceWith(replacement: DomNode): this {
    this.element.parentNode?.replaceChild(replacement, this.element);
    return this;
  }

  /** Remove element from DOM */
  remove(): this {
    this.element.remove();
    return this;
  }

  /** Clear all children */
  empty(): this {
    this.element.innerHTML = "";
    return this;
  }

  /** Clone the element (deep clone by default) */
  clone(deep = true): DomBuilder {
    const cloned = this.element.cloneNode(deep) as Element;
    return new DomBuilder(cloned.tagName.toLowerCase(), {
      document: this.doc,
      namespace: this.element.namespaceURI ?? undefined,
    }).replaceElement(cloned);
  }

  // --- Events ---

  /** Attach event listeners from a map */
  on(events: EventMap): this {
    for (const [event, handler] of Object.entries(events)) {
      this.element.addEventListener(event, handler);
    }
    return this;
  }

  /** Attach a single event listener */
  addEventListener(type: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): this {
    this.element.addEventListener(type, handler, options);
    return this;
  }

  /** Remove event listener */
  off(type: string, handler: EventListenerOrEventListenerObject): this {
    this.element.removeEventListener(type, handler);
    return this;
  }

  /** Trigger a custom/dispatched event */
  trigger(type: string, detail?: unknown, bubbles = true): this {
    const event = new CustomEvent(type, { detail, bubbles, composed: true });
    this.element.dispatchEvent(event);
    return this;
  }

  // --- Traversal ---

  /** Find first matching descendant */
  find<T extends Element = Element>(selector: string): T | null {
    return this.element.querySelector(selector) as T | null;
  }

  /** Find all matching descendants */
  findAll<T extends Element = Element>(selector: string): NodeListOf<T> {
    return this.element.querySelectorAll(selector);
  }

  /** Get parent element */
  parent(): Element | null {
    return this.element.parentElement;
  }

  /** Get children as array */
  children(): Element[] {
    return Array.from(this.element.children);
  }

  /** Get first child element */
  firstChildEl(): Element | null {
    return this.element.firstElementChild;
  }

  /** Get last child element */
  lastChildEl(): Element | null {
    return this.element.lastElementChild;
  }

  /** Get next sibling */
  nextSibling(): Element | null {
    return this.element.nextElementSibling;
  }

  /** Get previous sibling */
  prevSibling(): Element | null {
    return this.element.previousElementSibling;
  }

  /** Check if matches selector */
  is(selector: string): boolean {
    return this.element.matches(selector);
  }

  /** Check if contains another element */
  contains(other: Element | DomNode): boolean {
    return this.element.contains(other as Node);
  }

  // --- State & ARIA ---

  /** Enable/disable element */
  enabled(val: boolean): this {
    (this.element as HTMLElement).disabled = !val;
    return this;
  }

  /** Set/read checked state */
  checked(val?: boolean): this | boolean {
    if (val !== undefined) {
      (this.element as HTMLInputElement).checked = val;
      return this;
    }
    return (this.element as HTMLInputElement).checked;
  }

  /** Set ARIA attributes */
  aria(attrs: Partial<Record<string, string>>): this {
    for (const [key, val] of Object.entries(attrs)) {
      this.element.setAttribute(`aria-${key}`, val);
    }
    return this;
  }

  /** Set role */
  role(role: string): this {
    this.element.setAttribute("role", role);
    return this;
  }

  /** Set tabindex */
  tabIndex(index: number): this {
    (this.element as HTMLElement).tabIndex = index;
    return this;
  }

  /** Focus element */
  focus(options?: FocusOptions): this {
    (this.element as HTMLElement).focus(options);
    return this;
  }

  /** Blur element */
  blur(): this {
    (this.element as HTMLElement).blur();
    return this;
  }

  // --- Animation ---

  /** Apply CSS transition */
  animateTo(styles: StyleMap, duration = 300, easing = "ease"): Promise<void> {
    return new Promise((resolve) => {
      const el = this.element as HTMLElement;
      el.style.transitionProperty = Object.keys(styles).join(", ");
      el.style.transitionDuration = `${duration}ms`;
      el.style.transitionTimingFunction = easing;

      requestAnimationFrame(() => {
        this.style(styles);

        const onEnd = () => {
          el.removeEventListener("transitionend", onEnd);
          el.style.transitionProperty = "";
          el.style.transitionDuration = "";
          el.style.transitionTimingFunction = "";
          resolve();
        };
        el.addEventListener("transitionend", onEnd);
      });
    });
  }

  /** Fade in */
  fadeIn(duration = 300): Promise<void> {
    (this.element as HTMLElement).style.opacity = "0";
    this.show();
    return this.animateTo({ opacity: "1" }, duration);
  }

  /** Fade out */
  fadeOut(duration = 300): Promise<void> {
    return this.animateTo({ opacity: "0" }, duration).then(() => this.hide());
  }

  // --- Internal ---

  private replaceElement(el: Element): DomBuilder {
    (this as unknown as { element: Element }).element = el;
    return this;
  }
}

// --- Factory Functions ---

/** Create an element quickly without chaining */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: AttributeMap,
  children?: DomNode[],
  events?: EventMap,
): HTMLElementTagNameMap[K] {
  const builder = new DomBuilder(tag);
  if (attrs) builder.attr(attrs);
  if (children) builder.append(...children);
  if (events) builder.on(events);
  return builder.element as HTMLElementTagNameMap[K];
}

/** Create a DocumentFragment from multiple nodes */
export function createFragment(...nodes: DomNode[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const node of nodes) {
    frag.appendChild(node);
  }
  return frag;
}

/** Create a text node */
export function createText(content: string, escape = true): Text {
  return document.createTextNode(escape ? escapeHtml(content) : content);
}

/** Create a comment node */
export function createComment(text: string): Comment {
  return document.createComment(text);
}

/** Create an SVG element */
export function createSvgElement(
  tag: string,
  attrs?: AttributeMap,
): SVGElement {
  const builder = new DomBuilder(tag, { namespace: "http://www.w3.org/2000/svg" });
  if (attrs) builder.attr(attrs);
  return builder.element as SVGElement;
}

/** Build a complete HTML string from a builder (for SSR / template use) */
export function builderToString(builder: DomBuilder): string {
  return builder.element.outerHTML;
}

// --- DOM Diff Patching ---

/**
 * Compute diff between two DOM trees and generate patches.
 */
export function domDiff(oldRoot: Element, newRoot: Element): DiffResult {
  const patches: DomPatch[] = [];
  const stats = { added: 0, removed: 0, modified: 0, moved: 0 };

  const oldChildren = Array.from(oldRoot.children);
  const newChildren = Array.from(newRoot.children);

  // Simple O(n*m) comparison keyed by tag + id/class signature
  const oldSignatures = oldChildren.map((el) => getNodeSignature(el));
  const newSignatures = newChildren.map((el) => getNodeSignature(el));

  const matchedOld = new Set<number>();
  const matchedNew = new Set<number>();

  // Match identical signatures
  for (let ni = 0; ni < newChildren.length; ni++) {
    if (matchedNew.has(ni)) continue;
    for (let oi = 0; oi < oldChildren.length; oi++) {
      if (matchedOld.has(oi)) continue;
      if (oldSignatures[oi] === newSignatures[ni]) {
        // Check for attribute changes
        const attrDiff = diffAttributes(oldChildren[oi]!, newChildren[ni]!);
        if (attrDiff.changed) {
          patches.push({
            type: "attr",
            selector: `:scope > :nth-child(${ni + 1})`,
            attributes: attrDiff.attributes,
            node: newChildren[ni],
          });
          stats.modified++;
        }

        // Check for text content changes
        if (oldChildren[oi]!.textContent !== newChildren[ni]!.textContent) {
          patches.push({
            type: "text",
            selector: `:scope > :nth-child(${ni + 1})`,
            textContent: newChildren[ni]!.textContent ?? undefined,
            node: newChildren[ni],
          });
          stats.modified++;
        }

        matchedOld.add(oi);
        matchedNew.add(ni);
        break;
      }
    }
    // Position change detection would go here
  }

  // Find removed nodes
  for (let oi = 0; oi < oldChildren.length; oi++) {
    if (!matchedOld.has(oi)) {
      patches.push({
        type: "remove",
        node: oldChildren[oi],
      });
      stats.removed++;
    }
  }

  // Find added nodes
  for (let ni = 0; ni < newChildren.length; ni++) {
    if (!matchedNew.has(ni)) {
      patches.push({
        type: "add",
        node: newChildren[ni]!,
        position: "beforeend",
      });
      stats.added++;
    }
  }

  return { patches, stats };
}

/**
 * Apply a set of DOM patches to a root element.
 */
export function applyPatches(root: Element, patches: DomPatch[]): void {
  for (const patch of patches) {
    switch (patch.type) {
      case "add":
        if (patch.node && patch.position) {
          root.insertAdjacentElement(patch.position, patch.node as Element);
        }
        break;
      case "remove":
        patch.node?.remove();
        break;
      case "replace":
        if (patch.node && patch.referenceNode) {
          patch.referenceNode.replaceWith(patch.node);
        }
        break;
      case "attr":
        if (patch.node instanceof Element && patch.attributes) {
          for (const [key, val] of Object.entries(patch.attributes)) {
            if (val == null) {
              (patch.node as Element).removeAttribute(key);
            } else {
              (patch.node as Element).setAttribute(key, String(val));
            }
          }
        }
        break;
      case "text":
        if (patch.node) {
          patch.node.textContent = patch.textContent ?? "";
        }
        break;
      case "move":
        if (patch.node && patch.referenceNode && patch.position) {
          patch.referenceNode.insertAdjacentElement(patch.position, patch.node as Element);
        }
        break;
    }
  }
}

// --- Internal Utilities ---

function getNodeSignature(el: Element): string {
  const id = el.id ? `#${el.id}` : "";
  const classes = el.className && typeof el.className === "string"
    ? "." + el.className.split(/\s+/).filter(Boolean).join(".")
    : "";
  return `${el.tagName.toLowerCase()}${id}${classes}`;
}

interface AttrDiffResult {
  changed: boolean;
  attributes: AttributeMap;
}

function diffAttributes(oldEl: Element, newEl: Element): AttrDiffResult {
  const changes: AttributeMap = {};
  let changed = false;

  // Check all new attributes
  for (const attr of newEl.attributes) {
    const oldVal = oldEl.getAttribute(attr.name);
    if (oldVal !== attr.value) {
      changes[attr.name] = attr.value;
      changed = true;
    }
  }

  // Check removed attributes
  for (const attr of oldEl.attributes) {
    if (!newEl.hasAttribute(attr.name)) {
      changes[attr.name] = null as unknown as undefined;
      changed = true;
    }
  }

  return { changed, attributes: changes };
}
