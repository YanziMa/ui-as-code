/**
 * Renderer: DOM rendering engine, template rendering,
 * virtual DOM diffing (simplified), fragment management,
 * and rendering pipeline utilities.
 */

// --- Types ---

export interface RenderNode {
  /** Element type (tag name) */
  type: string;
  /** Attributes */
  props: Record<string, string>;
  /** Children (text or nested nodes) */
  children: Array<RenderNode | string>;
  /** Unique key for diffing */
  key?: string;
}

export interface RenderContext {
  /** Root container element */
  root: HTMLElement;
  /** Current scope for variable resolution */
  scope?: Record<string, unknown>;
  /** Component registry */
  components?: Map<string, (props: Record<string, string>) => RenderNode>;
}

// --- Template Renderer ---

/** Simple template renderer with {{variable}} interpolation */
export function renderTemplate(
  template: string,
  data: Record<string, unknown>,
  options?: {
    escapeHtml?: boolean;
    delimiters?: [string, string];
    fallback?: string;
  },
): string {
  const { escapeHtml = true, delimiters = ["{{", "}}"], fallback = "" } = options ?? {};
  const [open, close] = delimiters;

  const escapedOpen = open.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedClose = close.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escapedOpen}\\s*([\\w.]+)\\s*${escapedClose}`, "g");

  return template.replace(regex, (_, path) => {
    const value = resolvePath(data, path);
    if (value === undefined || value === null) return fallback;

    const str = String(value);
    return escapeHtml ? escapeHtmlEntities(str) : str;
  });
}

function resolvePath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function escapeHtmlEntities(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// --- Conditional Rendering ---

/** Render content only if condition is truthy */
export function renderIf(
  condition: unknown,
  content: string | (() => string),
  elseContent?: string | (() => string),
): string {
  if (condition) return typeof content === "function" ? content() : content;
  return elseContent ? (typeof elseContent === "function" ? elseContent() : elseContent) : "";
}

/** Render a list of items with a template */
export function renderList<T>(
  items: T[],
  template: (item: T, index: number) => string,
  options?: { separator?: string; emptyMessage?: string; maxItems?: number },
): string {
  const { separator = "", emptyMessage = "", maxItems } = options ?? {};

  if (items.length === 0) return emptyMessage;

  const sliced = maxItems ? items.slice(0, maxItems) : items;
  return sliced.map((item, i) => template(item, i)).join(separator);
}

// --- Fragment Management ---

/** Create a document fragment from HTML string */
export function createFragment(html: string): DocumentFragment {
  const range = document.createRange();
  range.selectNodeContents(document.body);
  return range.createContextualFragment(html);
}

/** Create multiple elements from an array of specs */
export function createElementBatch(specs: Array<{ tag: string; attrs?: Record<string, string>; innerHTML?: string }>): HTMLElement[] {
  return specs.map((spec) => {
    const el = document.createElement(spec.tag);
    if (spec.attrs) {
      for (const [k, v] of Object.entries(spec.attrs)) el.setAttribute(k, v);
    }
    if (spec.innerHTML) el.innerHTML = spec.innerHTML;
    return el;
  });
}

// --- Simple Virtual DOM Diff ---

/** Diff two sets of child elements and apply minimal updates */
export function diffChildren(
  parent: HTMLElement,
  oldChildren: HTMLElement[],
  newChildren: HTMLElement[],
): void {
  // Simple keyed diff algorithm
  const oldMap = new Map<string, number>();
  oldChildren.forEach((child, i) => {
    const key = child.dataset.key ?? `__idx_${i}`;
    oldMap.set(key, i);
  });

  const newMap = new Map<string, number>();
  newChildren.forEach((child, i) => {
    const key = child.dataset.key ?? `__idx_${i}`;
    newMap.set(key, i);
  });

  // Remove old nodes not in new set
  for (let i = oldChildren.length - 1; i >= 0; i--) {
    const child = oldChildren[i]!;
    const key = child.dataset.key ?? `__idx_${i}`;
    if (!newMap.has(key)) {
      child.remove();
    }
  }

  // Add or move new nodes
  let insertBefore: ChildNode | null = null;
  for (let i = newChildren.length - 1; i >= 0; i--) {
    const newChild = newChildren[i]!;
    const key = newChild.dataset.key ?? `__idx_${i}`;
    const oldIdx = oldMap.get(key);

    if (oldIdx !== undefined && oldChildren[oldIdx]) {
      // Move existing node
      const existing = oldChildren[oldIdx]!;
      if (existing.nextSibling !== insertBefore) {
        parent.insertBefore(existing, insertBefore);
      }
      insertBefore = existing;
    } else {
      // Insert new node
      parent.insertBefore(newChild, insertBefore);
      insertBefore = newChild;
    }
  }
}

// --- Render Pipeline ---

/** A composable rendering pipeline */
export class RenderPipeline {
  private stages: Array<(input: string) => string> = [];

  /** Add a transformation stage */
  use(transform: (input: string) => string): this {
    this.stages.push(transform);
    return this;
  }

  /** Run all stages on input */
  process(input: string): string {
    return this.stages.reduce((result, stage) => stage(result), input);
  }

  /** Clear all stages */
  clear(): void { this.stages = []; }
}

/** Common pipeline stages */
export const pipelineStages = {
  /** Trim whitespace */
  trim: (html: string) => html.trim(),

  /** Minify by removing unnecessary whitespace */
  minify: (html: string) =>
    html
      .replace(/\s+/g, " ")
      .replace(/>\s+</g, "><")
      .replace(/\s*({{|}})\s*/g, "$1"),

  /** Sanitize dangerous HTML tags */
  sanitize: (html: string) =>
    html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
      .replace(/on\w+\s*=\s*'[^']*'/gi, ""),

  /** Add data-rendered attribute to top-level element */
  markRendered: (html: string) =>
    html.replace(/^<(\w+)/, '<$1 data-rendered="true"'),
};
