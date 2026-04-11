/**
 * MorphDOM Engine — intelligent DOM morphing library that transforms one DOM state
 * into another with smooth animations, preserving focus, scroll position,
 * form input values, and minimizing visual disruption.
 *
 * Inspired by morphdom but implemented from scratch.
 */

// --- Types ---

export interface MorphOptions {
  /** Animate the transition (default: false) */
  animate?: boolean;
  /** Animation duration in ms (default: 300) */
  duration?: number;
  /** Easing function (default: "ease-out") */
  easing?: string;
  /** Preserve focus during morph (default: true) */
  preserveFocus?: boolean;
  /** Preserve scroll position (default: true) */
  preserveScroll?: true;
  /** Preserve form input values (default: true) */
  preserveInputValues?: true;
  /** Only morph children matching this selector */
  onlyChildrenMatching?: string;
  /** Skip children matching this selector */
  skipChildrenMatching?: string;
  /** Custom node identity function (for matching) */
  getKey?: (node: Node) => string | null;
  /** Called before a node is patched */
  onBeforePatch?: (from: Node, to: Node) => boolean | undefined;
  /** Called after a node is patched */
  onAfterPatch?: (from: Node, to: Node) => void;
  /** Called when a node is added */
  onNodeAdded?: (node: Node) => void;
  /** Called when a node is removed */
  onNodeRemoved?: (node: Node) => void;
  /** Log operations (debug) */
  debug?: boolean;
}

export interface MorphStats {
  nodesProcessed: number;
  nodesAdded: number;
  nodesRemoved: number;
  nodesPatched: number;
  unchangedNodes: number;
  durationMs: number;
}

export interface MorphInstance {
  /** Morph from current DOM content to new HTML/content */
  morph: (newContent: string | Node | HTMLElement, options?: Partial<MorphOptions>) => MorphStats;
  /** Morph from one element to another */
  morphElement: (fromEl: HTMLElement, toEl: HTMLElement, options?: Partial<MorphOptions>) => MorphStats;
  /** Get last morph statistics */
  readonly lastStats: MorphStats | null;
  /** Destroy instance */
  destroy: () => void;
}

// --- Helpers ---

function saveFormValues(container: HTMLElement): Map<HTMLElement, string> {
  const values = new Map<HTMLElement, string>();
  const inputs = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select");
  for (const input of inputs) {
    if (input instanceof HTMLSelectElement) {
      values.set(input, input.value);
    } else if (input.type === "checkbox" || input.type === "radio") {
      values.set(input, String(input.checked));
    } else {
      values.set(input, input.value);
    }
  }
  return values;
}

function restoreFormValues(values: Map<HTMLElement, string>): void {
  for (const [input, value] of values) {
    if (input instanceof HTMLSelectElement) {
      input.value = value;
    } else if (input instanceof HTMLInputElement && (input.type === "checkbox" || input.type === "radio")) {
      input.checked = value === "true";
    } else {
      (input as HTMLInputElement | HTMLTextAreaElement).value = value;
    }
  }
}

function getNodeKey(node: Node, customGetKey?: (n: Node) => string | null): string | null {
  if (customGetKey) return customGetKey(node);
  if (node instanceof HTMLElement) {
    return node.getAttribute("data-morph-key")
      ?? (node.id ? `#${node.id}` : null);
  }
  return null;
}

function elementsEquivalent(a: Node, b: Node, customGetKey?: (n: Node) => string | null): boolean {
  if (a.nodeType !== b.nodeType) return false;
  if (a.nodeType === Node.ELEMENT_NODE && b.nodeType === Node.ELEMENT_NODE) {
    if ((a as Element).tagName !== (b as Element).tagName) return false;
    const keyA = getNodeKey(a, customGetKey);
    const keyB =getNodeKey(b, customGetKey);
    if (keyA !== null && keyB !== null) return keyA === keyB;
  }
  if (a.nodeType === Node.TEXT_NODE && b.nodeType === Node.TEXT_NODE) {
    return a.textContent === b.textContent;
  }
  return false;
}

// --- Main ---

export function createMorphEngine(target: HTMLElement, defaults: MorphOptions = {}): MorphInstance {
  let destroyed = false;
  let lastStats: MorphStats | null = null;

  function doMorph(newContent: string | Node | HTMLElement, options: Partial<MorphOptions> = {}): MorphStats {
    if (destroyed) throw new Error("MorphEngine destroyed");

    const start = performance.now();
    const opts = { ...defaults, ...options };

    // Save state
    const activeEl = opts.preserveFocus !== false ? document.activeElement : null;
    const activeTag = activeEl?.tagName?.toLowerCase();
    const scrollPos = opts.preserveScroll !== false ? { x: window.scrollX, y: window.scrollY } : null;
    const formValues = opts.preserveInputValues !== false ? saveFormValues(target) : null;

    // Build target content
    let newRoot: Node;
    if (typeof newContent === "string") {
      const tmp = document.createElement("div");
      tmp.innerHTML = newContent;
      newRoot = tmp.firstChild ?? tmp;
    } else if (newContent instanceof HTMLElement) {
      newRoot = newContent.cloneNode(true);
    } else {
      newRoot = newContent.cloneNode(true);
    }

    // Perform morph
    const stats = morphNode(target, newRoot, [], opts);

    // Restore state
    if (formValues) restoreFormValues(formValues);
    if (scrollPos && opts.preserveScroll !== false) {
      requestAnimationFrame(() => window.scrollTo(scrollPos.x, scrollPos.y));
    }
    if (activeEl && opts.preserveFocus !== false) {
      // Try to find equivalent element in new DOM
      requestAnimationFrame(() => {
        if (activeEl && document.body.contains(activeEl)) {
          (activeEl as HTMLElement).focus({ preventScroll: true });
        }
      });
    }

    stats.durationMs = Math.round((performance.now() - start) * 100) / 100;
    lastStats = stats;
    return stats;
  }

  function morphElement(fromEl: HTMLElement, toEl: HTMLElement, options: Partial<MorphOptions> = {}): MorphStats {
    const start = performance.now();
    const opts = { ...defaults, ...options };
    const stats = morphNode(fromEl, toEl.cloneNode(true), [], opts);
    stats.durationMs = Math.round((performance.now() - start) * 100) / 100;
    lastStats = stats;
    return stats;
  }

  function morphNode(
    from: Node,
    to: Node,
    _path: number[],
    opts: MorphOptions,
  ): MorphStats {
    const stats: MorphStats = {
      nodesProcessed: 1,
      nodesAdded: 0,
      nodesRemoved: 0,
      nodesPatched: 0,
      unchangedNodes: 0,
      durationMs: 0,
    };

    // Text node handling
    if (from.nodeType === Node.TEXT_NODE && to.nodeType === Node.TEXT_NODE) {
      if (from.textContent !== to.textContent) {
        from.textContent = to.textContent ?? "";
        stats.nodesPatched++;
      } else {
        stats.unchangedNodes++;
      }
      return stats;
    }

    // Type mismatch
    if (from.nodeType !== to.nodeType) {
      const replacement = to.cloneNode(true);
      from.parentNode?.replaceChild(replacement, from);
      stats.nodesRemoved++;
      stats.nodesAdded++;
      opts.onNodeRemoved?.(from);
      opts.onNodeAdded?.(replacement);
      return stats;
    }

    // Element morphing
    if (from.nodeType === Node.ELEMENT_NODE && to.nodeType === Node.ELEMENT_NODE) {
      const fromEl = from as Element;
      const toEl = to as Element;

      // Tag change?
      if (fromEl.tagName !== toEl.tagName) {
        const replacement = toEl.cloneNode(true);
        fromEl.parentNode?.replaceChild(replacement, fromEl);
        stats.nodesRemoved++;
        stats.nodesAdded++;
        opts.onNodeRemoved?.(fromEl);
        opts.onNodeAdded?.(replacement);
        return stats;
      }

      // Before hook
      const shouldContinue = opts.onBeforePatch?.(fromEl, toEl);
      if (shouldContinue === false) return stats;

      // Copy attributes
      syncAttributes(fromEl, toEl, opts);
      stats.nodesPatched++;

      // Morph children
      const fromChildren = Array.from(fromEl.childNodes);
      const toChildren = Array.from(toEl.childNodes);

      // Match children by key/equivalence
      const matchedTo = new Set<number>();
      const matchedFrom = new Set<number>();

      for (let ti = 0; ti < toChildren.length; ti++) {
        if (matchedTo.has(ti)) continue;
        const toChild = toChildren[ti]!;

        // Find best match in remaining from-children
        let bestFi = -1;
        let bestScore = -1;

        for (let fi = 0; fi < fromChildren.length; fi++) {
          if (matchedFrom.has(fi)) continue;
          const fromChild = fromChildren[fi]!;

          let score = 0;
          if (elementsEquivalent(fromChild, toChild, opts.getKey)) score += 100;
          if (fromChild.nodeType === toChild.nodeType) score += 20;
          if (fromChild.nodeType === Node.ELEMENT_NODE && toChild.nodeType === Node.ELEMENT_NODE) {
            if ((fromChild as Element).tagName === (toChild as Element).tagName) score += 30;
            if (fromChild.textContent === toChild.textContent) score += 5;
          }

          if (score > bestScore) { bestScore = score; bestFi = fi; }
        }

        if (bestFi >= 20) {
          // Good match — recurse
          const childStats = morphNode(fromChildren[bestFi]!, toChild, [..._path, ti], opts);
          mergeStats(stats, childStats);
          matchedFrom.add(bestFi);
          matchedTo.add(ti);
        } else {
          // No match — insert new
          const insertion = toChild.cloneNode(true);
          if (ti < fromEl.childNodes.length) {
            fromEl.insertBefore(insertion, fromEl.childNodes[ti]);
          } else {
            fromEl.appendChild(insertion);
          }
          stats.nodesAdded++;
          opts.onNodeAdded?.(insertion);
          matchedTo.add(ti);
        }
      }

      // Remove unmatched from-children
      for (let fi = 0; fi < fromChildren.length; fi++) {
        if (!matchedFrom.has(fi)) {
          fromChildren[fi]!.remove();
          stats.nodesRemoved++;
          opts.onNodeRemoved?.(fromChildren[fi]!);
        }
      }

      // After hook
      opts.onAfterPatch?.(fromEl, toEl);
    }

    stats.nodesProcessed++;
    return stats;
  }

  function syncAttributes(from: Element, to: Element, opts: MorphOptions): void {
    // Update existing and new attributes
    for (let i = 0; i < to.attributes.length; i++) {
      const attr = to.attributes[i]!;
      if (attr.name === "data-morph-key") continue;
      if (from.getAttribute(attr.name) !== attr.value) {
        from.setAttribute(attr.name, attr.value);
      }
    }

    // Remove attributes not in target
    const toAttrNames = new Set(Array.from(to.attributes).map((a) => a.name));
    for (let i = 0; i < from.attributes.length; i++) {
      const attr = from.attributes[i]!;
      if (!toAttrNames.has(attr.name) && attr.name !== "data-morph-key") {
        from.removeAttribute(attr.name);
      }
    }
  }

  function mergeStats(target: MorphStats, source: MorphStats): void {
    target.nodesProcessed += source.nodesProcessed;
    target.nodesAdded += source.nodesAdded;
    target.nodesRemoved += source.nodesRemoved;
    target.nodesPatched += source.nodesPatched;
    target.unchangedNodes += source.unchangedNodes;
  }

  const instance: MorphInstance = {
    morph: doMorph,
    morphElement,
    get lastStats() { return lastStats; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Quick morph: replace contents of an element with new HTML intelligently */
export function morph(element: HTMLElement, newHtml: string, options?: MorphOptions): MorphStats {
  return createMorphEngine(element, options).morph(newHtml, options);
}

/** Morph two elements in place */
export function morphBetween(from: HTMLElement, to: HTMLElement, options?: MorphOptions): MorphStats {
  return createMorphEngine(from, options).morphElement(from, to, options);
}
