/**
 * DOM Diff Patcher — computes structural diffs between DOM trees and generates
 * minimal patch operations (add, remove, replace, update attributes, reorder)
 * for efficient DOM reconciliation without a full virtual DOM.
 */

// --- Types ---

export type PatchOp = "ADD" | "REMOVE" | "REPLACE" | "UPDATE_ATTRS" | "UPDATE_TEXT" | "REORDER" | "MOVE";

export interface Patch {
  op: PatchOp;
  /** Path to target node (array of child indices) */
  path: number[];
  /** For ADD: the node/HTML string to insert */
  node?: Node | string;
  /** For REPLACE: new node/HTML string */
  newNode?: Node | string;
  /** For UPDATE_ATTRS: map of attribute changes */
  attrs?: { set: Record<string, string>; remove: string[] };
  /** For UPDATE_TEXT: new text content */
  text?: string;
  /** For REORDER/MOVE: permutation or from/to indices */
  order?: number[];
  moveFrom?: number;
}

export interface DiffResult {
  patches: Patch[];
  stats: { added: number; removed: number; replaced: number; attrUpdates: number; textUpdates: number; reordered: number };
  durationMs: number;
}

export interface DomDiffOptions {
  /** Compare element data attributes (default: true) */
  compareDataAttrs?: boolean;
  /** Compare style attributes (default: false — expensive) */
  compareStyles?: boolean;
  /** Ignore certain attributes (e.g., ["id", "class"]) */
  ignoreAttrs?: string[];
  /** Only diff these specific children (by index range) */
  childFilter?: (index: number, el: HTMLElement) => boolean;
  /** Generate patches that preserve focus (default: true) */
  preserveFocus?: boolean;
  /** Max depth for recursive diffing (default: 20) */
  maxDepth?: number;
  /** Callback for each patch generated */
  onPatch?: (patch: Patch) => void;
}

// --- Node fingerprinting ---

interface NodeFingerprint {
  tagName?: string;
  id?: string;
  className?: string;
  type?: string;
  value?: string;
  textContent?: string;
  childCount?: number;
  dataAttrs?: Record<string, string>;
}

function fingerprint(node: Node): NodeFingerprint {
  if (node.nodeType === Node.TEXT_NODE) return { type: "text", textContent: node.textContent ?? "" };
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const fp: NodeFingerprint = {
      tagName: el.tagName.toLowerCase(),
      id: el.id || undefined,
      className: el.className ? (typeof el.className === "string" ? el.className : el.className.value) : undefined,
      childCount: el.children.length,
    };

    // Value for inputs
    if ("value" in el) fp.value = (el as HTMLInputElement).value;

    // Data attributes
    if (el.dataset && Object.keys(el.dataset).length > 0) {
      fp.dataAttrs = { ...el.dataset };
    }

    return fp;
  }
  return { type: "other", childCount: node.childNodes.length };
}

function fingerprintsEqual(a: NodeFingerprint, b: NodeFingerprint): boolean {
  return (
    a.tagName === b.tagName &&
    a.id === b.id &&
    a.type === b.type &&
    a.value === b.value
  );
}

// --- Attribute comparison ---

function getAttrMap(el: Element, ignore: string[], includeStyle: boolean): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i]!;
    if (ignore.includes(attr.name)) continue;
    if (!includeStyle && attr.name === "style") continue;
    map[attr.name] = attr.value;
  }
  return map;
}

function diffAttributes(
  oldEl: Element,
  newEl: Element,
  ignore: string[],
  includeStyle: boolean,
): { set: Record<string, string>; remove: string[] } | null {
  const oldAttrs = getAttrMap(oldEl, ignore, includeStyle);
  const newAttrs = getAttrMap(newEl, ignore, includeStyle);

  const set: Record<string, string> = {};
  const remove: string[] = [];

  // Find changed and added
  for (const [key, val] of Object.entries(newAttrs)) {
    if (oldAttrs[key] !== val) set[key] = val;
  }
  // Find removed
  for (const key of Object.keys(oldAttrs)) {
    if (!(key in newAttrs)) remove.push(key);
  }

  if (Object.keys(set).length === 0 && remove.length === 0) return null;
  return { set, remove };
}

// --- Main diff algorithm ---

export function diffDom(oldNode: Node, newNode: Node, options: DomDiffOptions = {}): DiffResult {
  const start = performance.now();
  const {
    compareDataAttrs = true,
    compareStyles = false,
    ignoreAttrs = [],
    maxDepth = 20,
    onPatch,
  } = options;

  const patches: Patch[] = [];
  let depth = 0;
  const stats = { added: 0, removed: 0, replaced: 0, attrUpdates: 0, textUpdates: 0, reordered: 0 };

  function emit(patch: Patch): void {
    patches.push(patch);
    onPatch?.(patch);
    switch (patch.op) {
      case "ADD": stats.added++; break;
      case "REMOVE": stats.removed++; break;
      case "REPLACE": stats.replaced++; break;
      case "UPDATE_ATTRS": stats.attrUpdates++; break;
      case "UPDATE_TEXT": stats.textUpdates++; break;
      case "REORDER": stats.reordered++; break;
    }
  }

  function doDiff(oldN: Node, newN: Node, path: number[]): void {
    if (depth > maxDepth) return;
    depth++;

    // Both text nodes
    if (oldN.nodeType === Node.TEXT_NODE && newN.nodeType === Node.TEXT_NODE) {
      if (oldN.textContent !== newN.textContent) {
        emit({ op: "UPDATE_TEXT", path, text: newN.textContent ?? "" });
      }
      depth--;
      return;
    }

    // Type mismatch
    if (oldN.nodeType !== newN.nodeType) {
      emit({ op: "REPLACE", path, newNode: newN });
      depth--;
      return;
    }

    // Text vs element
    if (oldN.nodeType === Node.TEXT_NODE || newN.nodeType === Node.TEXT_NODE) {
      emit({ op: "REPLACE", path, newNode: newN });
      depth--;
      return;
    }

    const oldEl = oldN as Element;
    const newEl = newN as Element;

    // Tag name change
    if (oldEl.tagName !== newEl.tagName) {
      emit({ op: "REPLACE", path, newNode: newEl });
      depth--;
      return;
    }

    // Attribute diff
    const attrDiff = diffAttributes(oldEl, newEl, ignoreAttrs, compareStyles);
    if (attrDiff) {
      emit({ op: "UPDATE_ATTRS", path, attrs: attrDiff });
    }

    // Child diffing with simple matching
    const oldChildren = Array.from(oldEl.childNodes);
    const newChildren = Array.from(newEl.childNodes);

    // Quick length check
    if (oldChildren.length === 0 && newChildren.length > 0) {
      for (let i = 0; i < newChildren.length; i++) {
        emit({ op: "ADD", path: [...path, i], node: newChildren[i] });
      }
    } else if (newChildren.length === 0 && oldChildren.length > 0) {
      for (let i = oldChildren.length - 1; i >= 0; i--) {
        emit({ op: "REMOVE", path: [...path, i] });
      }
    } else {
      // Try to match children by fingerprint
      const matchedOld = new Set<number>();
      const matchedNew = new Set<number>();

      for (let ni = 0; ni < newChildren.length; ni++) {
        if (matchedNew.has(ni)) continue;
        const newFp = fingerprint(newChildren[ni]!);
        let bestMatch = -1;
        let bestScore = -1;

        for (let oi = 0; oi < oldChildren.length; oi++) {
          if (matchedOld.has(oi)) continue;
          const oldFp = fingerprint(oldChildren[oi]!);
          let score = 0;
          if (fingerprintsEqual(oldFp, newFp)) score += 10;
          if (oldFp.id && oldFp.id === newFp.id) score += 50;
          if (oldFp.tagName === newFp.tagName) score += 5;
          if (oldFp.textContent === newFp.textContent) score += 3;
          if (score > bestScore) { bestScore = score; bestMatch = oi; }
        }

        if (bestScore >= 3) {
          // Recursively diff matched pair
          matchedOld.add(bestMatch);
          matchedNew.add(ni);
          doDiff(oldChildren[bestMatch]!, newChildren[ni]!, [...path, bestMatch]);
        } else {
          // No good match — add new node
          emit({ op: "ADD", path: [...path, ni], node: newChildren[ni] });
          matchedNew.add(ni);
        }
      }

      // Remove unmatched old nodes
      for (let oi = 0; oi < oldChildren.length; oi++) {
        if (!matchedOld.has(oi)) {
          emit({ op: "REMOVE", path: [...path, oi] });
        }
      }
    }

    depth--;
  }

  doDiff(oldNode, newNode, []);

  return {
    patches,
    stats,
    durationMs: Math.round((performance.now() - start) * 100) / 100,
  };
}

// --- Patch application ---

/** Apply computed patches to an actual DOM tree */
export function applyPatches(root: Element, patches: Patch[]): void {
  // Sort patches by path length (deepest first) then index (reverse)
  const sorted = [...patches].sort((a, b) => {
    if (a.path.length !== b.path.length) return b.path.length - a.path.length;
    for (let i = 0; i < Math.min(a.path.length, b.path.length); i++) {
      if (a.path[i]! !== b.path[i]!) return b.path[i]! - a.path[i]!;
    }
    return 0;
  });

  for (const patch of sorted) {
    let target: Node = root;

    // Navigate to target
    for (let i = 0; i < patch.path.length; i++) {
      const idx = patch.path[i]!;
      target = target.childNodes[idx];
      if (!target) break;
    }

    if (!target?.parentNode) continue;

    switch (patch.op) {
      case "ADD": {
        const node = typeof patch.node === "string"
          ? document.createRange().createContextualFragment(patch.node)
          : (patch.node instanceof Node ? patch.node.cloneNode(true) : document.createTextNode(String(patch.node)));
        const parent = target.parentNode as Element;
        const idx = patch.path[patch.path.length - 1] ?? 0;
        if (idx < parent.childNodes.length) {
          parent.insertBefore(node, parent.childNodes[idx]);
        } else {
          parent.appendChild(node);
        }
        break;
      }
      case "REMOVE":
        target.remove();
        break;
      case "REPLACE": {
        const newNode = typeof patch.newNode === "string"
          ? document.createRange().createContextualFragment(patch.newNode)
          : (patch.newNode instanceof Node ? patch.newNode.cloneNode(true) : document.createTextNode(String(patch.newNode)));
        target.parentNode?.replaceChild(newNode, target);
        break;
      }
      case "UPDATE_ATTRS":
        if (target instanceof Element && patch.attrs) {
          for (const [k, v] of Object.entries(patch.attrs.set)) target.setAttribute(k, v);
          for (const k of patch.attrs.remove) target.removeAttribute(k);
        }
        break;
      case "UPDATE_TEXT":
        target.textContent = patch.text ?? "";
        break;
      case "REORDER":
        // Reorder children based on permutation
        if (patch.order) {
          const children = Array.from(target.childNodes);
          const reordered = patch.order.map((i) => children[i]).filter(Boolean);
          target.textContent = "";
          for (const child of reversed) target.appendChild(child);
        }
        break;
    }
  }
}
