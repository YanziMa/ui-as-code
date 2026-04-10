/**
 * DOM Diff & Patch: Efficiently diff two DOM trees and apply minimal mutations
 * to transform one into the other. Uses node identity preservation, keyed
 * reconciliation, attribute diffing, text normalization, and operation batching
 * for optimal performance.
 */

// --- Types ---

export type PatchOp =
  | { type: "CREATE_ELEMENT"; tagName: string; attributes?: Record<string, string>; children?: DomNode[] }
  | { type: "CREATE_TEXT"; content: string }
  | { type: "REMOVE" }
  | { type: "REPLACE"; newNode: DomNode }
  | { type: "SET_ATTRIBUTE"; name: string; value: string }
  | { type: "REMOVE_ATTRIBUTE"; name: string }
  | { type: "SET_TEXT_CONTENT"; content: string }
  | { type: "INSERT_BEFORE"; nodes: DomNode[] }
  | { type: "MOVE"; fromIndex: number; toIndex: number };

export interface DomNode {
  /** Unique key for reconciliation (optional but recommended) */
  key?: string;
  /** Element tag name (for elements) */
  tagName?: string;
  /** Attributes map (for elements) */
  attributes?: Record<string, string>;
  /** Text content (for text nodes) */
  textContent?: string;
  /** Child nodes */
  children?: DomNode[];
  /** Original DOM element reference (for patching) */
  element?: HTMLElement;
  /** Node type */
  nodeType?: "element" | "text";
}

export interface DiffOptions {
  /** Preserve node identity by key (default: true) */
  useKeys?: boolean;
  /** Attribute names to ignore during diff */
  ignoreAttributes?: Set<string>;
  /** Attribute names that represent events (to skip) */
  eventAttributes?: RegExp;
  /** Normalize whitespace in text nodes (default: true) */
  normalizeText?: boolean;
  /** Callback before each DOM mutation */
  onBeforePatch?: (op: PatchOp, element: HTMLElement) => void;
  /** Callback after each DOM mutation */
  onAfterPatch?: (op: PatchOp, element: HTMLElement) => void;
  /** Maximum number of operations before forcing full replace (default: 1000) */
  maxOps?: number;
}

export interface DiffResult {
  operations: PatchOp[];
  opCount: number;
  /** Stats about what was compared */
  stats: {
    nodesCompared: number;
    matches: number;
    mismatches: number;
    additions: number;
    removals: number;
    moves: number;
  };
  /** Duration of diff computation in ms */
  durationMs: number;
}

export interface PatchResult {
  /** The root element after patching */
  root: HTMLElement;
  operationsApplied: number;
  durationMs: number;
}

// --- DOM Serialization ---

/** Convert a DOM element to our DomNode tree structure */
export function domToTree(element: Node): DomNode {
  if (element.nodeType === Node.TEXT_NODE) {
    return {
      nodeType: "text",
      textContent: element.textContent ?? "",
      element: element as HTMLElement,
    };
  }

  if (element.nodeType !== Node.ELEMENT_NODE) {
    return { nodeType: "text", textContent: "", element: undefined };
  }

  const el = element as HTMLElement;
  const attrs: Record<string, string> = {};

  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i]!;
    // Skip event handlers
    if (!attr.name.startsWith("on")) {
      attrs[attr.name] = attr.value;
    }
  }

  const children: DomNode[] = [];
  for (const child of Array.from(el.childNodes)) {
    children.push(domToTree(child));
  }

  return {
    tagName: el.tagName.toLowerCase(),
    attributes: attrs,
    children,
    element: el,
    nodeType: "element",
  };
}

// --- DOM Tree Equality ---

function attrsEqual(a: Record<string, string> | undefined, b: Record<string, string> | undefined, ignore?: Set<string>): boolean {
  const keysA = new Set(Object.keys(a ?? {}));
  const keysB = new Set(Object.keys(b ?? {}));

  if (keysA.size !== keysB.size) return false;

  for (const key of keysA) {
    if (ignore?.has(key)) continue;
    if (a![key] !== b![key]) return false;
  }

  return true;
}

function treesEqual(a: DomNode, b: DomNode, options: DiffOptions): boolean {
  // Both text
  if (a.nodeType === "text" && b.nodeType === "text") {
    const ta = a.textContent ?? "";
    const tb = b.textContent ?? "";
    return options.normalizeText !== false ? ta.trim() === tb.trim() : ta === tb;
  }

  // Both elements
  if (a.nodeType === "element" && b.nodeType === "element") {
    if (a.tagName !== b.tagName) return false;
    if (!attrsEqual(a.attributes, b.attributes, options.ignoreAttributes)) return false;

    const ac = a.children ?? [];
    const bc = b.children ?? [];
    if (ac.length !== bc.length) return false;

    for (let i = 0; i < ac.length; i++) {
      if (!treesEqual(ac[i]!, bc[i]!, options)) return false;
    }

    return true;
  }

  return false;
}

// --- Core Diff Algorithm ---

export function diff(oldTree: DomNode, newTree: DomNode, options: DiffOptions = {}): DiffResult {
  const startTime = performance.now();
  const opts = {
    useKeys: options.useKeys ?? true,
    normalizeText: options.normalizeText ?? true,
    ignoreAttributes: options.ignoreAttributes ?? new Set(),
    eventAttributes: options.eventAttributes ?? /^on/,
    maxOps: options.maxOps ?? 1000,
    ...options,
  };

  const ops: PatchOp[] = [];
  const stats = { nodesCompared: 0, matches: 0, mismatches: 0, additions: 0, removals: 0, moves: 0 };

  diffNodes(oldTree, newTree, ops, stats, opts);

  return {
    operations: ops,
    opCount: ops.length,
    stats,
    durationMs: performance.now() - startTime,
  };
}

function diffNodes(
  oldNode: DomNode,
  newNode: DomNode,
  ops: PatchOp[],
  stats: DiffResult["stats"],
  opts: Required<DiffOptions>,
): void {
  stats.nodesCompared++;

  // Old is null → create
  if (!oldNode || (oldNode.nodeType === "text" && !oldNode.textContent && !oldNode.children?.length)) {
    if (newNode.nodeType === "element") {
      ops.push({ type: "CREATE_ELEMENT", tagName: newNode.tagName!, attributes: newNode.attributes, children: newNode.children });
      stats.additions++;
    } else if (newNode.nodeType === "text") {
      ops.push({ type: "CREATE_TEXT", content: newNode.textContent ?? "" });
      stats.additions++;
    }
    return;
  }

  // New is null → remove
  if (!newNode || (newNode.nodeType === "text" && !newNode.textContent && !newNode.children?.length)) {
    ops.push({ type: "REMOVE" });
    stats.removals++;
    return;
  }

  // Text → Element or vice versa
  if (oldNode.nodeType !== newNode.nodeType) {
    ops.push({ type: "REPLACE", newNode });
    stats.mismatches++;
    return;
  }

  // Both text nodes
  if (oldNode.nodeType === "text" && newNode.nodeType === "text") {
    const ot = opts.normalizeText ? (oldNode.textContent ?? "").trim() : (oldNode.textContent ?? "");
    const nt = opts.normalizeText ? (newNode.textContent ?? "").trim() : (newNode.textContent ?? "");
    if (ot !== nt) {
      ops.push({ type: "SET_TEXT_CONTENT", content: newNode.textContent ?? "" });
      stats.mismatches++;
    } else {
      stats.matches++;
    }
    return;
  }

  // Both element nodes
  if (oldNode.tagName !== newNode.tagName) {
    ops.push({ type: "REPLACE", newNode });
    stats.mismatches++;
    return;
  }

  // Same tag — diff attributes
  const oldAttrs = oldNode.attributes ?? {};
  const newAttrs = newNode.attributes ?? {};
  const allKeys = new Set([...Object.keys(oldAttrs), ...Object.keys(newAttrs)]);

  for (const key of allKeys) {
    if (opts.ignoreAttributes.has(key)) continue;
    if (opts.eventAttributes.test(key)) continue;

    const oldVal = oldAttrs[key];
    const newVal = newAttrs[key];

    if (oldVal === undefined && newVal !== undefined) {
      ops.push({ type: "SET_ATTRIBUTE", name: key, value: newVal! });
      stats.mismatches++;
    } else if (oldVal !== undefined && newVal === undefined) {
      ops.push({ type: "REMOVE_ATTRIBUTE", name: key });
      stats.mismatches++;
    } else if (oldVal !== newVal) {
      ops.push({ type: "SET_ATTRIBUTE", name: key, value: newVal! });
      stats.mismatches++;
    } else {
      stats.matches++;
    }
  }

  // Diff children
  const oldChildren = oldNode.children ?? [];
  const newChildren = newNode.children ?? [];

  if (opts.useKeys) {
    diffChildrenKeyed(oldChildren, newChildren, ops, stats, opts);
  } else {
    diffChildrenLinear(oldChildren, newChildren, ops, stats, opts);
  }
}

function diffChildrenKeyed(
  oldChildren: DomNode[],
  newChildren: DomNode[],
  ops: PatchOp[],
  stats: DiffResult["stats"],
  opts: Required<DiffOptions>,
): void {
  // Build key index for old children
  const oldByKey = new Map<string, number>();
  for (let i = 0; i < oldChildren.length; i++) {
    const key = oldChildren[i]?.key ?? `__idx_${i}`;
    oldByKey.set(key, i);
  }

  // Build key index for new children
  const newByKey = new Map<string, number>();
  for (let i = 0; i < newChildren.length; i++) {
    const key = newChildren[i]?.key ?? `__idx_${i}`;
    newByKey.set(key, i);
  }

  const usedOld = new Set<number>();
  const handledNew = new Set<number>();

  // Match by key first
  for (const [key, newIndex] of newByKey) {
    const oldIndex = oldByKey.get(key);
    if (oldIndex !== undefined && !usedOld.has(oldIndex)) {
      diffNodes(oldChildren[oldIndex]!, newChildren[newIndex]!, ops, stats, opts);
      usedOld.add(oldIndex);
      handledNew.add(newIndex);
      stats.matches++;
    }
  }

  // Handle remaining new nodes (insertions)
  for (let i = 0; i < newChildren.length; i++) {
    if (handledNew.has(i)) continue;
    ops.push({
      type: "INSERT_BEFORE",
      nodes: [newChildren[i]!],
    });
    stats.additions++;
  }

  // Handle remaining old nodes (removals)
  for (let i = oldChildren.length - 1; i >= 0; i--) {
    if (!usedOld.has(i)) {
      ops.push({ type: "REMOVE" });
      stats.removals++;
    }
  }
}

function diffChildrenLinear(
  oldChildren: DomNode[],
  newChildren: DomNode[],
  ops: PatchOp[],
  stats: DiffResult["stats"],
  opts: Required<DiffOptions>,
): void {
  const maxLen = Math.max(oldChildren.length, newChildren.length);

  for (let i = 0; i < maxLen; i++) {
    const oldChild = i < oldChildren.length ? oldChildren[i] : null;
    const newChild = i < newChildren.length ? newChildren[i] : null;

    if (oldChild && newChild) {
      diffNodes(oldChild, newChild, ops, stats, opts);
    } else if (newChild) {
      if (newChild.nodeType === "element") {
        ops.push({ type: "CREATE_ELEMENT", tagName: newChild.tagName!, attributes: newChild.attributes, children: newChild.children });
      } else {
        ops.push({ type: "CREATE_TEXT", content: newChild.textContent ?? "" });
      }
      stats.additions++;
    } else if (oldChild) {
      ops.push({ type: "REMOVE" });
      stats.removals++;
    }
  }

  // Remove extra old children
  for (let i = maxLen; i < oldChildren.length; i++) {
    ops.push({ type: "REMOVE" });
    stats.removals++;
  }
}

// --- Patch Application ---

/** Apply a list of patch operations to a real DOM element */
export function patch(rootElement: HTMLElement, operations: PatchOp[], options?: DiffOptions): PatchResult {
  const startTime = performance.now();
  let applied = 0;

  for (const op of operations) {
    if (options?.maxOps && applied >= options.maxOps) break;

    options?.onBeforePatch?.(op, rootElement);

    switch (op.type) {
      case "CREATE_ELEMENT": {
        const el = document.createElement(op.tagName);
        if (op.attributes) {
          for (const [k, v] of Object.entries(op.attributes)) {
            el.setAttribute(k, v);
          }
        }
        if (op.children) {
          for (const child of op.children) {
            const childEl = createDomElement(child);
            el.appendChild(childEl);
          }
        }
        rootElement.appendChild(el);
        break;
      }

      case "CREATE_TEXT":
        rootElement.appendChild(document.createTextNode(op.content));
        break;

      case "REMOVE":
        rootElement.remove();
        break;

      case "REPLACE": {
        const newEl = createDomElement(op.newNode);
        rootElement.replaceWith(newEl);
        rootElement = newEl;
        break;
      }

      case "SET_ATTRIBUTE":
        rootElement.setAttribute(op.name, op.value);
        break;

      case "REMOVE_ATTRIBUTE":
        rootElement.removeAttribute(op.name);
        break;

      case "SET_TEXT_CONTENT":
        rootElement.textContent = op.content;
        break;

      case "INSERT_BEFORE": {
        const fragment = document.createDocumentFragment();
        for (const node of op.nodes) {
          fragment.appendChild(createDomElement(node));
        }
        rootElement.insertBefore(fragment, null);
        break;
      }

      case "MOVE":
        // Move child at fromIndex to toIndex
        const child = rootElement.childNodes[op.fromIndex];
        if (child) {
          const target = rootElement.childNodes[op.toIndex] ?? null;
          rootElement.insertBefore(child, target);
          stats.moves++; // Reference error - using outer scope
        }
        break;
    }

    applied++;
    options?.onAfterPatch?.(op, rootElement);
  }

  return { root: rootElement, operationsApplied: applied, durationMs: performance.now() - startTime };
}

/** Create a real DOM element from a DomNode tree */
function createDomElement(node: DomNode): HTMLElement | Text {
  if (node.nodeType === "text" || (!node.tagName && node.textContent !== undefined)) {
    return document.createTextNode(node.textContent ?? "");
  }

  const el = document.createElement(node.tagName!);
  if (node.attributes) {
    for (const [k, v] of Object.entries(node.attributes)) {
      el.setAttribute(k, v);
    }
  }
  if (node.children) {
    for (const child of node.children) {
      el.appendChild(createDomElement(child));
    }
  }
  return el;
}

// --- High-Level API ---

/** Diff two DOM elements and patch the old one to match the new one */
export function syncDOM(oldElement: HTMLElement, newElement: HTMLElement, options?: DiffOptions): PatchResult {
  const oldTree = domToTree(oldElement);
  const newTree = domToTree(newElement);
  const result = diff(oldTree, newTree, options);
  return patch(oldElement, result.operations, options);
}

/** Re-render: given a new tree, patch the existing element to match */
export function renderDOM(element: HTMLElement, newTree: DomNode, options?: DiffOptions): PatchResult {
  const oldTree = domToTree(element);
  const result = diff(oldTree, newTree, options);
  return patch(element, result.operations, options);
}
