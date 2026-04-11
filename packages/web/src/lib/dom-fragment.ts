/**
 * DOM Fragment utilities for efficient batch DOM operations, template cloning,
 * DocumentFragment management, range-based extraction, and safe HTML
 * construction without layout thrashing.
 */

// --- Types ---

export interface FragmentOptions {
  /** Clone nodes before inserting (default: true for templates) */
  clone?: boolean;
  /** Insert position: "beforebegin" | "afterbegin" | "beforeend" | "afterend" */
  position?: InsertPosition;
  /** Animate insertion (CSS transition class) */
  animateClass?: string;
  /** Callback after each node is inserted */
  onInsert?: (node: Node) => void;
}

export interface BatchInsertOptions {
  /** Delay between inserts in ms (0 = all at once, default: 0) */
  delayMs?: number;
  /** Chunk size for large batches (default: 50) */
  chunkSize?: number;
  /** Yield to main thread between chunks (default: true for >100 items) */
  yieldBetweenChunks?: boolean;
  /** Callback on each chunk completion */
  onChunk?: (inserted: number, total: number) => void;
  /** Callback when complete */
  onComplete?: (totalInserted: number) => void;
}

export interface RangeSelection {
  /** Start container */
  startContainer: Node;
  /** Start offset */
  startOffset: number;
  /** End container */
  endContainer: Node;
  /** End offset */
  endOffset: number;
}

// --- Main Utilities ---

/** Create a DocumentFragment from HTML string */
export function createFragment(html: string): DocumentFragment {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.cloneNode(true) as DocumentFragment;
}

/** Create a DocumentFragment from an array of nodes */
export function createFragmentFromNodes(nodes: Node[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const node of nodes) {
    frag.appendChild(node.nodeType === Node.ELEMENT_NODE ? (node as Element).cloneNode(true) : node.cloneNode(true));
  }
  return frag;
}

/** Insert a fragment into the DOM at a specific position */
export function insertFragment(
  target: HTMLElement,
  fragment: DocumentFragment | string,
  options: FragmentOptions = {},
): Node[] {
  const { position = "beforeend", animateClass, onInsert } = options;

  const frag = typeof fragment === "string"
    ? createFragment(fragment)
    : fragment;

  const insertedNodes: Node[] = [];

  // Use insertAdjacentHTML/Element for position support
  if (position !== "beforeend" || typeof fragment === "string") {
    // For non-default positions or string input, use a wrapper approach
    const temp = document.createElement("div");
    temp.appendChild(frag);
    const children = Array.from(temp.childNodes);

    // We need to actually insert at the right position
    let anchor: HTMLElement | null = null;
    switch (position) {
      case "beforebegin":
        target.insertAdjacentElement("beforebegin", temp);
        break;
      case "afterbegin":
        target.insertAdjacentElement("afterbegin", temp);
        break;
      case "beforeend":
        target.insertAdjacentElement("beforeend", temp);
        break;
      case "afterend":
        target.insertAdjacentElement("afterend", temp);
        break;
    }

    // Move children out of temp into actual location
    while (temp.firstChild) {
      const node = temp.removeChild(temp.firstChild);
      insertedNodes.push(node);
      onInsert?.(node);
      if (animateClass && node instanceof HTMLElement) {
        node.classList.add(animateClass);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => node.classList.remove(animateClass))
        );
      }
    }

    temp.remove();
    return insertedNodes;
  }

  // Default: append all children of fragment to target
  while (frag.firstChild) {
    const node = frag.removeChild(frag.firstChild);
    target.appendChild(node);
    insertedNodes.push(node);
    onInsert?.(node);

    if (animateClass && node instanceof HTMLElement) {
      node.classList.add(animateClass);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => node.classList.remove(animateClass))
      );
    }
  }

  return insertedNodes;
}

/** Batch-insert multiple fragments/nodes with optional yielding */
export async function batchInsert(
  target: HTMLElement,
  items: (Node | DocumentFragment | string)[],
  options: BatchInsertOptions = {},
): Promise<number> {
  const {
    delayMs = 0,
    chunkSize = 50,
    yieldBetweenChunks = true,
    onChunk,
    onComplete,
  } = options;

  let totalInserted = 0;
  const frag = document.createDocumentFragment();

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;

    if (typeof item === "string") {
      const temp = document.createElement("template");
      temp.innerHTML = item;
      while (temp.content.firstChild) {
        frag.appendChild(temp.content.firstChild);
        totalInserted++;
      }
    } else if (item instanceof DocumentFragment) {
      while (item.firstChild) {
        frag.appendChild(item.firstChild);
        totalInserted++;
      }
    } else {
      frag.appendChild(item);
      totalInserted++;
    }

    // Chunk processing
    if ((i + 1) % chunkSize === 0 || i === items.length - 1) {
      target.appendChild(frag);
      onChunk?.(totalInserted, items.length);

      if (yieldBetweenChunks && i < items.length - 1) {
        await new Promise((r) => setTimeout(r, 0)); // Yield to main thread
      }

      if (delayMs > 0 && i < items.length - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  // Flush remaining
  if (frag.childNodes.length > 0) {
    target.appendChild(frag);
  }

  onComplete?.(totalInserted);
  return totalInserted;
}

/** Extract content between two nodes (or positions) as a DocumentFragment */
export function extractRange(
  startNode: Node,
  endNode: Node,
): DocumentFragment {
  const range = document.createRange();
  range.setStartBefore(startNode);
  range.setEndAfter(endNode);
  return range.extractContents();
}

/** Extract content based on a RangeSelection spec */
export function extractFromSelection(sel: RangeSelection): DocumentFragment {
  const range = document.createRange();
  range.setStart(sel.startContainer, sel.startOffset);
  range.setEnd(sel.endContainer, sel.endOffset);
  return range.extractContents();
}

/** Move all children from source to target efficiently */
export function moveChildren(source: HTMLElement, target: HTMLElement): void {
  const frag = document.createDocumentFragment();
  while (source.firstChild) {
    frag.appendChild(source.firstChild);
  }
  target.appendChild(frag);
}

/** Replace element's contents with a fragment (no layout thrash) */
export function replaceContent(element: HTMLElement, htmlOrFrag: DocumentFragment | string): void {
  const frag = typeof htmlOrFrag === "string" ? createFragment(htmlOrFrag) : htmlOrFrag;
  element.textContent = ""; // Faster than innerHTML = "" for clearing
  element.appendChild(frag);
}

/** Create a reusable template that can be cloned repeatedly */
export function createTemplate<T extends HTMLElement>(
  html: string,
): { clone: () => T; original: T } {
  const template = document.createElement("template");
  template.innerHTML = html.trim();

  function clone(): T {
    const node = template.content.cloneNode(true) as DocumentFragment;
    return node.firstElementChild as T;
  }

  const original = template.content.firstElementChild as T;
  return { clone, original };
}

/** Safely build HTML by constructing elements programmatically */
export function buildElement(
  tag: string,
  attrs?: Record<string, string>,
  children?: (Node | string)[],
): HTMLElement {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "className") el.className = v;
      else if (k.startsWith("data")) el.dataset[k.slice(5).toLowerCase()] = v;
      else if (k.startsWith("on")) (el as unknown as Record<string, unknown>)[k] = v; // Event handlers need special handling
      else el.setAttribute(k, v);
    }
  }
  if (children) {
    for (const child of children) {
      if (typeof child === "string") el.appendChild(document.createTextNode(child));
      else el.appendChild(child);
    }
  }
  return el;
}

/** Measure DOM operation performance */
export function measureDomOperation(fn: () => void, iterations = 100): { avgMs: number; minMs: number; maxMs: number; totalMs: number } {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  const total = times.reduce((a, b) => a + b, 0);
  return {
    avgMs: Math.round((total / iterations) * 100) / 100,
    minMs: Math.round(Math.min(...times) * 100) / 100,
    maxMs: Math.round(Math.max(...times) * 100) / 100,
    totalMs: Math.round(total * 100) / 100,
  };
}
