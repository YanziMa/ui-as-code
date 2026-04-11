/**
 * DOM element creation helpers: createElement with attributes, event listeners,
 * children management, SVG support, fragment building, template literals,
 * and declarative DOM construction.
 */

// --- Types ---

export interface CreateElementOptions {
  /** HTML tag name */
  tag: string;
  /** Attributes to set */
  attrs?: Record<string, string | number | boolean>;
  /** Event listeners */
  events?: Record<string, EventListener | EventListenerObject>;
  /** Style properties (camelCase) */
  style?: Record<string, string | number>;
  /** CSS class names (space-separated or array) */
  className?: string | string[];
  /** ID attribute */
  id?: string;
  /** Inner text content (escaped) */
  text?: string;
  /** Inner HTML content (raw) */
  html?: string;
  /** Child elements or strings */
  children?: (Element | string | null | undefined)[];
  /** Data attributes (data-* prefix auto-added) */
  data?: Record<string, string>;
  /** ARIA attributes */
  aria?: Record<string, string>;
  /** Ref callback with created element */
  ref?: (el: Element) => void;
  /** Namespace URI (e.g., "http://www.w3.org/2000/svg" for SVG) */
  namespaceURI?: string;
}

export interface DomBuilder {
  /** Add an attribute */
  attr(name: string, value: string | number | boolean): this;
  /** Set ID */
  id(value: string): this;
  /** Add class(es) */
  cls(...names: string[]): this;
  /** Set style property */
  style(prop: string, value: string | number): this;
  /** Set multiple styles at once */
  styles(styles: Record<string, string | number>): this;
  /** Add event listener */
  on(event: string, handler: EventListener): this;
  /** Add child element or text */
  child(el: Element | string | null): this;
  /** Add multiple children */
  children(els: (Element | string | null | undefined)[]): this;
  /** Set inner text */
  text(content: string): this;
  /** Set inner HTML */
  html(content: string): this;
  /** Set data attribute */
  data(key: string, value: string): this;
  /** Set ARIA attribute */
  aria(key: string, value: string): this;
  /** Append to a parent element */
  appendTo(parent: Element): Element;
  /** Prepend to a parent element */
  prependTo(parent: Element): Element;
  /** Insert before a reference element */
  insertBefore(ref: Element): Element;
  /** Insert after a reference element */
  insertAfter(ref: Element): Element;
  /** Replace an existing element */
  replace(target: Element): Element;
  /** Build and return the element (without inserting) */
  build(): Element;
  /** Build and return as HTMLElement cast */
  buildAs<T extends Element = HTMLElement>(): T;
}

// --- Main Functions ---

/**
 * Create a DOM element with full configuration.
 *
 * @example
 * ```ts
 * const btn = createElement({
 *   tag: "button",
 *   className: ["btn", "btn-primary"],
 *   attrs: { type: "button", disabled: false },
 *   events: { click: handleClick },
 *   style: { padding: "8px 16px" },
 *   text: "Click me",
 * });
 * ```
 */
export function createElement(options: CreateElementOptions): Element {
  const {
    tag,
    attrs = {},
    events = {},
    style: styleObj = {},
    className,
    id,
    text,
    html,
    children = [],
    data = {},
    aria = {},
    ref,
    namespaceURI,
  } = options;

  // Determine namespace
  let el: Element;
  if (namespaceURI || tag === "svg") {
    el = document.createElementNS(namespaceURI ?? "http://www.w3.org/2000/svg", tag);
  } else {
    el = document.createElement(tag);
  }

  // ID
  if (id) el.id = id;

  // Class name(s)
  if (className) {
    if (Array.isArray(className)) {
      el.className = className.filter(Boolean).join(" ");
    } else {
      el.className = className;
    }
  }

  // Attributes (skip falsy boolean values)
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === undefined || value === null) continue;
    if (value === true) {
      el.setAttribute(key, "");
    } else if (typeof value === "number") {
      el.setAttribute(key, String(value));
    } else {
      el.setAttribute(key, value);
    }
  }

  // Data attributes
  for (const [key, value] of Object.entries(data)) {
    el.setAttribute(`data-${key}`, value);
  }

  // ARIA attributes
  for (const [key, value] of Object.entries(aria)) {
    el.setAttribute(`aria-${key}`, value);
  }

  // Style properties
  if (el instanceof HTMLElement && Object.keys(styleObj).length > 0) {
    Object.assign(el.style, styleObj);
  }

  // Event listeners
  for (const [event, handler] of Object.entries(events)) {
    el.addEventListener(event, handler);
  }

  // Text content
  if (text !== undefined) {
    el.textContent = text;
  }

  // Inner HTML
  if (html !== undefined) {
    el.innerHTML = html;
  }

  // Children
  for (const child of children) {
    if (child === null || child === undefined) continue;
    if (typeof child === "string") {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(child);
    }
  }

  // Ref callback
  if (ref) ref(el);

  return el;
}

/** Shorthand: create a <div> */
export function div(options?: Omit<CreateElementOptions, "tag">): HTMLDivElement {
  return createElement({ ...options, tag: "div" }) as HTMLDivElement;
}

/** Shorthand: create a <span> */
export function span(options?: Omit<CreateElementOptions, "tag">): HTMLSpanElement {
  return createElement({ ...options, tag: "span" }) as HTMLSpanElement;
}

/** Shorthand: create a <button> */
export function button(options?: Omit<CreateElementOptions, "tag">): HTMLButtonElement {
  return createElement({ ...options, tag: "button" }) as HTMLButtonElement;
}

/** Shorthand: create an <input> */
export function input(options?: Omit<CreateElementOptions, "tag"> & { type?: string }): HTMLInputElement {
  const opts = { ...options, tag: "input" as const };
  if (!opts.attrs) opts.attrs = {};
  if ((options as { type?: string })?.type) {
    opts.attrs.type = (options as { type?: string }).type!;
  }
  return createElement(opts) as HTMLInputElement;
}

/** Shorthand: create an <a> anchor */
export function anchor(options?: Omit<CreateElementOptions, "tag"> & { href?: string }): HTMLAnchorElement {
  const opts = { ...options, tag: "a" as const };
  if (!opts.attrs) opts.attrs = {};
  if ((options as { href?: string })?.href) {
    opts.attrs.href = (options as { href?: string }).href!;
  }
  return createElement(opts) as HTMLAnchorElement;
}

/** Shorthand: create an <img> */
export function img(options?: Omit<CreateElementOptions, "tag"> & { src?: string; alt?: string }): HTMLImageElement {
  const opts = { ...options, tag: "img" as const };
  if (!opts.attrs) opts.attrs = {};
  if ((options as { src?: string })?.src) opts.attrs.src = (options as { src?: string }).src!;
  if ((options as { alt?: string })?.alt) opts.attrs.alt = (options as { alt?: string }).alt!;
  return createElement(opts) as HTMLImageElement;
}

/** Shorthand: create a <p> paragraph */
export function p(options?: Omit<CreateElementOptions, "tag">): HTMLParagraphElement {
  return createElement({ ...options, tag: "p" }) as HTMLParagraphElement;
}

/** Shorthand: create an <ul> list */
export function ul(options?: Omit<CreateElementOptions, "tag">): HTMLUListElement {
  return createElement({ ...options, tag: "ul" }) as HTMLUListElement;
}

/** Shorthand: create an <ol> ordered list */
export function ol(options?: Omit<CreateElementOptions, "tag">): HTMLOListElement {
  return createElement({ ...options, tag: "ol" }) as HTMLOListElement;
}

/** Shorthand: create an <li> list item */
export function li(options?: Omit<CreateElementOptions, "tag">): HTMLLIElement {
  return createElement({ ...options, tag: "li" }) as HTMLLIElement;
}

/** Shorthand: create a <form> */
export function form(options?: Omit<CreateElementOptions, "tag">): HTMLFormElement {
  return createElement({ ...options, tag: "form" }) as HTMLFormElement;
}

/** Shorthand: create a <select> */
export function select(options?: Omit<CreateElementOptions, "tag">): HTMLSelectElement {
  return createElement({ ...options, tag: "select" }) as HTMLSelectElement;
}

/** Shorthand: create a <textarea> */
export function textarea(options?: Omit<CreateElementOptions, "tag">): HTMLTextAreaElement {
  return createElement({ ...options, tag: "textarea" }) as HTMLTextAreaElement;
}

/** Shorthand: create a <table> */
export function table(options?: Omit<CreateElementOptions, "tag">): HTMLTableElement {
  return createElement({ ...options, tag: "table" }) as HTMLTableElement;
}

// --- Builder Pattern ---

/**
 * Chainable DOM builder for fluent element creation.
 *
 * @example
 * ```ts
 * builder("div")
 *   .cls("container", "flex")
 *   .attr("role", "main")
 *   .style("display", "flex")
 *   .child(span({ text: "Hello" }))
 *   .appendTo(document.body);
 * ```
 */
export function builder(tag: string, namespaceURI?: string): DomBuilder {
  let el: Element;

  return {
    attr(name, value) {
      if (value === false) el.removeAttribute(name);
      else if (value === true) el.setAttribute(name, "");
      else el.setAttribute(name, String(value));
      return this;
    },

    id(value) {
      el.id = value;
      return this;
    },

    cls(...names) {
      for (const n of names) {
        if (n) el.classList.add(n);
      }
      return this;
    },

    style(prop, value) {
      if (el instanceof HTMLElement) {
        (el.style as Record<string, string>)[prop] = String(value);
      }
      return this;
    },

    styles(styles) {
      if (el instanceof HTMLElement) {
        Object.assign(el.style, styles);
      }
      return this;
    },

    on(event, handler) {
      el.addEventListener(event, handler);
      return this;
    },

    child(childEl) {
      if (childEl === null) return this;
      if (typeof childEl === "string") {
        el.appendChild(document.createTextNode(childEl));
      } else {
        el.appendChild(childEl);
      }
      return this;
    },

    children(children) {
      for (const c of children) {
        if (c === null || c === undefined) continue;
        if (typeof c === "string") {
          el.appendChild(document.createTextNode(c));
        } else {
          el.appendChild(c);
        }
      }
      return this;
    },

    text(content) {
      el.textContent = content;
      return this;
    },

    html(content) {
      el.innerHTML = content;
      return this;
    },

    data(key, value) {
      el.setAttribute(`data-${key}`, value);
      return this;
    },

    aria(key, value) {
      el.setAttribute(`aria-${key}`, value);
      return this;
    },

    appendTo(parent) {
      parent.appendChild(el);
      return el;
    },

    prependTo(parent) {
      parent.prepend(el);
      return el;
    },

    insertBefore(ref) {
      ref.parentNode?.insertBefore(el, ref);
      return el;
    },

    insertAfter(ref) {
      ref.parentNode?.insertBefore(el, ref.nextSibling);
      return el;
    },

    replace(target) {
      target.parentNode?.replaceChild(el, target);
      return el;
    },

    build() {
      if (!el) {
        el = namespaceURI
          ? document.createElementNS(namespaceURI, tag)
          : document.createElement(tag);
      }
      return el;
    },

    buildAs<T extends Element = HTMLElement>() {
      return this.build() as unknown as T;
    },
  } as unknown as DomBuilder; // Cast needed because `el` is used before assignment in type system
}

// Corrected builder that initializes el immediately
export function domBuilder(tag: string, namespaceURI?: string): DomBuilder {
  const element = namespaceURI
    ? document.createElementNS(namespaceURI, tag)
    : document.createElement(tag);

  return {
    attr(name, value) {
      if (value === false) element.removeAttribute(name);
      else if (value === true) element.setAttribute(name, "");
      else element.setAttribute(name, String(value));
      return this;
    },

    id(value) {
      element.id = value;
      return this;
    },

    cls(...names) {
      for (const n of names) {
        if (n) element.classList.add(n);
      }
      return this;
    },

    style(prop, value) {
      if (element instanceof HTMLElement) {
        (element.style as Record<string, string>)[prop] = String(value);
      }
      return this;
    },

    styles(styles) {
      if (element instanceof HTMLElement) {
        Object.assign(element.style, styles);
      }
      return this;
    },

    on(event, handler) {
      element.addEventListener(event, handler);
      return this;
    },

    child(childEl) {
      if (childEl === null) return this;
      if (typeof childEl === "string") {
        element.appendChild(document.createTextNode(childEl));
      } else {
        element.appendChild(childEl);
      }
      return this;
    },

    children(children) {
      for (const c of children) {
        if (c === null || c === undefined) continue;
        if (typeof c === "string") {
          element.appendChild(document.createTextNode(c));
        } else {
          element.appendChild(c);
        }
      }
      return this;
    },

    text(content) {
      element.textContent = content;
      return this;
    },

    html(content) {
      element.innerHTML = content;
      return this;
    },

    data(key, value) {
      element.setAttribute(`data-${key}`, value);
      return this;
    },

    aria(key, value) {
      element.setAttribute(`aria-${key}`, value);
      return this;
    },

    appendTo(parent) {
      parent.appendChild(element);
      return element;
    },

    prependTo(parent) {
      parent.prepend(element);
      return element;
    },

    insertBefore(ref) {
      ref.parentNode?.insertBefore(element, ref);
      return element;
    },

    insertAfter(ref) {
      ref.parentNode?.insertBefore(element, ref.nextSibling);
      return element;
    },

    replace(target) {
      target.parentNode?.replaceChild(element, target);
      return element;
    },

    build() {
      return element;
    },

    buildAs<T extends Element = HTMLElement>() {
      return element as unknown as T;
    },
  };
}

// --- Fragment Helpers ---

/** Create a DocumentFragment from children */
export function fragment(children: (Element | string | null | undefined)[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const child of children) {
    if (child === null || child === undefined) continue;
    if (typeof child === "string") {
      frag.appendChild(document.createTextNode(child));
    } else {
      frag.appendChild(child);
    }
  }
  return frag;
}

/** Replace all children of an element */
export function replaceChildren(el: Element, newChildren: (Element | string | null | undefined)[]): void {
  el.replaceChildren(
    ...newChildren.filter((c): c is Element | string => c !== null && c !== undefined),
  );
}

/** Remove all children of an element */
export function clearChildren(el: Element): void {
  el.replaceChildren();
}

/** Clone an element (deep clone by default) */
export function cloneElement<T extends Element>(el: T, deep = true): T {
  return el.cloneNode(deep) as T;
}

/** Wrap an element with a wrapper element */
export function wrapElement(el: Element, wrapperTag: string = "div"): Element {
  const wrapper = document.createElement(wrapperTag);
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

/** Insert element at index position among siblings */
export function insertAtIndex(parent: Element, child: Element, index: number): void {
  const children = Array.from(parent.children);
  if (index >= children.length) {
    parent.appendChild(child);
  } else {
    parent.insertBefore(child, children[index]!);
  }
}

/** Get index of element among its siblings */
export function getElementIndex(el: Element): number {
  const parent = el.parentElement;
  if (!parent) return -1;
  return Array.from(parent.children).indexOf(el);
}
