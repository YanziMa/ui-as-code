/**
 * HTML Builder — Fluent API for building HTML strings and DOM elements
 * with type-safe attribute handling, event binding, and template support.
 */

// --- Types ---

export type Child = string | number | HTMLElement | Node | null | undefined | false | Child[];
export type AttrValue = string | number | boolean | null | undefined | (() => string);

interface BuildOptions {
  /** Self-closing tags (void elements) */
  voidElements?: Set<string>;
  /** Pretty-print with indentation */
  pretty?: boolean;
  /** Indentation size */
  indentSize?: number;
}

// --- Tag Builder ---

/**
 * Create an HTML element builder function.
 * Usage: const div = tag('div'); div({ class: 'foo' }, 'Hello')
 */
export function tag(name: string) {
  return (attrs?: Record<string, AttrValue>, ...children: Child[]): HTMLElement => {
    return buildElement(name, attrs ?? {}, children);
  };
}

/** Pre-built common tag builders */
export const html = {
  a: tag("a"),
  abbr: tag("abbr"),
  address: tag("address"),
  article: tag("article"),
  aside: tag("aside"),
  b: tag("b"),
  bdi: tag("bdi"),
  bdo: tag("bdo"),
  blockquote: tag("blockquote"),
  br: tag("br"),
  button: tag("button"),
  caption: tag("caption"),
  cite: tag("cite"),
  code: tag("code"),
  col: tag("col"),
  colgroup: tag("colgroup"),
  dd: tag("dd"),
  details: tag("details"),
  dfn: tag("dfn"),
  dialog: tag("dialog"),
  div: tag("div"),
  dl: tag("dl"),
  dt: tag("dt"),
  em: tag("em"),
  fieldset: tag("fieldset"),
  figcaption: tag("figcaption"),
  figure: tag("figure"),
  footer: tag("footer"),
  form: tag("form"),
  h1: tag("h1"),
  h2: tag("h2"),
  h3: tag("h3"),
  h4: tag("h4"),
  h5: tag("h5"),
  h6: tag("h6"),
  header: tag("header"),
  hr: tag("hr"),
  i: tag("i"),
  img: tag("img"),
  input: tag("input"),
  label: tag("label"),
  li: tag("li"),
  main: tag("main"),
  nav: tag("nav"),
  ol: tag("ol"),
  optgroup: tag("optgroup"),
  option: tag("option"),
  p: tag("p"),
  pre: tag("pre"),
  progress: tag("progress"),
  q: tag("q"),
  rp: tag("rp"),
  rt: tag("rt"),
  ruby: tag("ruby"),
  s: tag("s"),
  samp: tag("samp"),
  section: tag("section"),
  select: tag("select"),
  small: tag("small"),
  span: tag("span"),
  strong: tag("strong"),
  sub: tag("sub"),
  summary: tag("summary"),
  sup: tag("sup"),
  table: tag("table"),
  tbody: tag("tbody"),
  td: tag("td"),
  textarea: tag("textarea"),
  tfoot: tag("tfoot"),
  th: tag("th"),
  thead: tag("thead"),
  time: tag("time"),
  tr: tag("tr"),
  u: tag("u"),
  ul: tag("ul"),
  var_: tag("var"),
  video: tag("video"),
  wbr: tag("wbr"),

  // SVG
  svg: tag("svg"),
  circle: tag("circle"),
  ellipse: tag("ellipse"),
  line: tag("line"),
  path: tag("path"),
  polygon: tag("polygon"),
  polyline: tag("polyline"),
  rect: tag("rect"),
  text: tag("text"),
} as const;

// --- Element Building ---

function buildElement(
  tagName: string,
  attrs: Record<string, AttrValue>,
  children: Child[],
): HTMLElement {
  const el = document.createElement(tagName);
  applyAttributes(el, attrs);
  appendChildren(el, children);
  return el;
}

/** Apply attributes to an element */
export function applyAttributes(el: Element, attrs: Record<string, AttrValue>): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;

    if (key === "style" && typeof value === "object") {
      Object.assign((el as HTMLElement).style, value);
      continue;
    }

    if (key.startsWith("on") && typeof value === "function") {
      const eventName = key.slice(2).toLowerCase();
      el.addEventListener(eventName, value as EventListener);
      continue;
    }

    if (key === "dataset" && typeof value === "object") {
      Object.assign(el.dataset, value as Record<string, string>);
      continue;
    }

    if (key === "class" || key === "className") {
      if (Array.isArray(value)) {
        el.className = value.filter(Boolean).join(" ");
      } else if (typeof value === "object") {
        const classes = Object.entries(value)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(" ");
        el.className = classes;
      } else {
        el.setAttribute("class", String(value));
      }
      continue;
    }

    if (key === "ref" && typeof value === "function") {
      (value as (el: Element) => void)(el);
      continue;
    }

    if (key === "html" && typeof value === "string") {
      el.innerHTML = value;
      continue;
    }

    if (key === "text" && typeof value === "string") {
      el.textContent = value;
      continue;
    }

    if (typeof value === "boolean" && value) {
      el.setAttribute(key, "");
    } else if (typeof value === "function") {
      el.setAttribute(key, value());
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

/** Append children to an element */
export function appendChildren(parent: Element, children: Child[]): void {
  for (const child of children) {
    if (child == null || child === false) continue;

    if (Array.isArray(child)) {
      appendChildren(parent, child);
    } else if (child instanceof Node) {
      parent.appendChild(child);
    } else {
      parent.appendChild(document.createTextNode(String(child)));
    }
  }
}

// --- HTML String Builder ---

/**
 * Build an HTML string (for SSR or innerHTML use).
 * Returns a string instead of DOM elements.
 */
export function htmlString(
  tagName: string,
  attrs?: Record<string, AttrValue>,
  ...children: Child[]
): string {
  const VOID_ELEMENTS = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
  ]);

  const attrStr = attrs ? formatAttributes(attrs) : "";

  if (VOID_ELEMENTS.has(tagName)) {
    return `<${tagName}${attrStr}>`;
  }

  const childrenStr = children
    .filter((c) => c != null && c !== false)
    .map((c) => flattenChild(c))
    .join("");

  return `<${tagName}${attrStr}>${childrenStr}</${tagName}>`;
}

function formatAttributes(attrs: Record<string, AttrValue>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (typeof value === "boolean" && value) { parts.push(` ${key}`); continue; }
    parts.push(` ${key}="${escapeAttr(String(value))}"`);
  }
  return parts.join("");
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function flattenChild(child: Child): string {
  if (child == null || child === false) return "";
  if (Array.isArray(child)) return child.map(flattenChild).join("");
  if (child instanceof HTMLElement) return child.outerHTML;
  if (child instanceof Node) return child.textContent ?? "";
  return escapeHtml(String(child));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Fragment Builder ---

/** Create a DocumentFragment from children */
export function fragment(...children: Child[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  appendChildren(frag, children);
  return frag;
}

// --- Template Helpers ---

/** Repeat an element N times */
export function repeat<T>(
  items: T[],
  renderer: (item: T, index: number) => Child,
): Child[] {
  return items.flatMap((item, i) => {
    const result = renderer(item, i);
    return Array.isArray(result) ? result : [result];
  });
}

/** Conditionally render children */
export function when(condition: unknown, ...children: Child[]): Child[] {
  return condition ? children.filter((c) => c != null && c !== false) : [];
}

/** Render first truthy option */
export function switchOn<T>(value: T, cases: Array<[T | ((v: T) => boolean), Child]>): Child[] {
  for (const [match, result] of cases) {
    const matches = typeof match === "function"
      ? (match as (v: T) => boolean)(value)
      : match === value;
    if (matches) return Array.isArray(result) ? result : [result];
  }
  return [];
}

// --- DOM Query Shortcuts (builder context) ---

/** Find first matching element within a parent */
export function $<T extends Element = HTMLElement>(
  parent: Element | Document,
  selector: string,
): T | null {
  return parent.querySelector(selector) as T | null;
}

/** Find all matching elements within a parent */
export function $$<T extends Element = HTMLElement>(
  parent: Element | Document,
  selector: string,
): T[] {
  return Array.from(parent.querySelectorAll(selector)) as T[];
}
