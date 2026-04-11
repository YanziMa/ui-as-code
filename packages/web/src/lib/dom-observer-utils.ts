/**
 * DOM Observer Utilities: MutationObserver wrappers for watching DOM changes,
 * attribute/child-list/character-data/subtree observation, size observer,
 * intersection observer helpers, debounced observers, and change aggregation.
 */

// --- Types ---

export interface MutationRecord {
  type: "attributes" | "childList" | "characterData" | "subtree";
  target: Node;
  oldValue?: string;
  newValue?: string;
  addedNodes?: Node[];
  removedNodes?: Node[];
  attributeName?: string;
}

export interface MutationSummary {
  totalMutations: number;
  byType: Record<string, number>;
  targets: Set<Node>;
  timestamp: number;
}

export interface SizeChange {
  entry: ResizeObserverEntry;
  width: number;
  height: number;
  contentRect: DOMRect;
  target: Element;
}

// --- Simple Mutation Observer ---

/**
 * Watch for DOM mutations with configurable options.
 *
 * @example
 * ```ts
 * const obs = observeMutations(document.body, { childList: true, attributes: true });
 * obs.onMutation((summary) => console.log(summary.totalMutations));
 * ```
 */
export function observeMutations(
  target: Node,
  options?: MutationObserverInit,
): {
  onMutation: (callback: (summary: MutationSummary) => void) => void;
  disconnect: () => void;
  getRecords: () => MutationRecord[];
  takeRecords: () => MutationRecord[];
} {
  let callback: ((summary: MutationSummary) => void) | null = null;
  const records: MutationRecord[] = [];

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      const record: MutationRecord = {
        type: m.type as MutationRecord["type"],
        target: m.target,
        oldValue: m.oldValue,
        newValue: m.target?.nodeValue,
        addedNodes: Array.from(m.addedNodes ?? []),
        removedNodes: Array.from(m.removedNodes ?? []),
        attributeName: m.attributeName,
      };
      records.push(record);
    }

    if (callback) {
      const summary = summarizeMutations(mutations);
      callback(summary);
    }
  });

  observer.observe(target, { subtree: true, characterData: true, ...options });

  return {
    onMutation: (cb) => { callback = cb; },
    disconnect: () => { observer.disconnect(); callback = null; },
    getRecords: () => [...records],
    takeRecords: () => { const r = [...records]; records.length = 0; return r; },
  };
}

/** Observe once and auto-disconnect after first batch */
export function observeOnce(
  target: Node,
  options?: MutationObserverInit,
  timeoutMs = 5000,
): Promise<MutationSummary> {
  return new Promise((resolve, reject) => {
    const { onMutation, disconnect } = observeMutations(target, options);
    onMutation((summary) => { disconnect(); resolve(summary); });
    setTimeout(() => { disconnect(); reject(new Error("Timeout")); }, timeoutMs);
  });
}

// --- Debounced Observer ---

/**
 * Mutation observer that batches rapid changes and fires at most once per interval.
 */
export function createDebouncedObserver(
  target: Node,
  options?: MutationObserverInit,
  debounceMs = 100,
): {
  onBatch: (summary: MutationSummary) => void;
  destroy: () => void;
} {
  let handler: ((summary: MutationSummary) => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending = false;

  const { onMutation, disconnect } = observeMutations(target, options);

  onMutation(() => {
    if (!pending) {
      pending = true;
      timer = setTimeout(() => {
        pending = false;
        const summary = onMutation.takeRecords();
        handler?.(summary);
      }, debounceMs);
    }
  });

  return {
    onBatch: (cb) => { handler = cb; },
    destroy: () => {
      disconnect();
      if (timer) clearTimeout(timer);
    },
  };
}

// --- Attribute Watcher ---

/** Watch specific attributes on an element for changes */
export function watchAttributes(
  element: Element,
  attrNames: string[],
  onChange: (attrName: string, oldValue: string, newValue: string) => void,
): () => void {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "attributes" && m.attributeName) {
        onChange(m.attributeName, m.oldValue ?? "", (m.target as Element).getAttribute(m.attributeName) ?? "");
      }
    }
  });

  observer.observe(element, { attributes: true, attributeFilter: attrNames });

  return () => observer.disconnect();
}

// --- Child List Watcher ---

/** Watch for added/removed children */
export function watchChildren(
  parent: Node,
  onAdded?: (node: Node) => void,
  onRemoved?: (node: Node) => void,
  options?: { deep?: boolean; onlyTags?: string[] },
): () => void {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "childList") {
        for (const node of m.addedNodes ?? []) {
          if (options?.onlyTags && !(node as Element).tagName?.toLowerCase().includes(options.onlyTags.join(","))) continue;
          onAdded?.(node);
        }
        for (const node of m.removedNodes ?? []) {
          onRemoved?.(node);
        }
      }
    }
  });

  observer.observe(parent, { childList: true, subtree: options?.deep ?? false });

  return () => observer.disconnect();
}

// --- Text Content Watcher ---

/** Watch text content changes within an element */
export function watchTextContent(
  element: HTMLElement,
  onChange: (oldText: string, newText: string) => void,
  debounceMs = 50,
): () => void {
  let lastText = element.textContent ?? "";
  let timer: ReturnType<typeof setTimeout> | null = null;

  const observer = new MutationObserver(() => {
    const currentText = element.textContent ?? "";
    if (currentText !== lastText) {
      clearTimeout(timer!);
      timer = setTimeout(() => {
        onChange(lastText, currentText);
        lastText = currentText;
      }, debounceMs);
    }
  });

  observer.observe(element, { childList: true, characterData: true, subtree: true });

  return () => { observer.disconnect(); if (timer) clearTimeout(timer); };
}

// --- Size Observer ---

/**
 * Watch element size changes.
 */
export function watchSize(
  element: Element,
  onChange: (size: SizeChange) => void,
  options?: ResizeObserverOptions,
): () => void {
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      onChange({
        entry,
        width: entry.contentRect.width,
        height: entry.contentRect.height,
        contentRect: entry.contentRect,
        target: element,
      });
    }
  });

  observer.observe(element, options);

  return () => observer.disconnect();
}

/** Get current size of an element */
export function getElementSize(element: Element): { width: number; height: number } {
  const rect = element.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

/** Check if element has non-zero dimensions */
export function hasSize(element: Element): boolean {
  const { width, height } = getElementSize(element);
  return width > 0 && height > 0;
}

// --- Visibility Observer Wrapper ---

/** Watch visibility changes with enter/leave callbacks */
export function watchVisibility(
  element: Element,
  onEnter?: (entry: IntersectionObserverEntry) => void,
  onLeave?: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit,
): () => void {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) onEnter?.(entry);
      else onLeave?.(entry);
    }
  }, options);

  observer.observe(element);

  return () => observer.disconnect();
}

/** Wait until an element becomes visible in the viewport */
export function whenVisible(
  element: Element,
  timeoutMs = 10000,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (hasSize(element) && isInViewport(element)) return resolve(true);

    const { destroy } = watchVisibility(element,
      () => resolve(true),
      undefined,
      { threshold: 0.1 },
    );

    setTimeout(() => { destroy(); resolve(false); }, timeoutMs);
  });
}

/** Check if element is currently in the viewport */
export function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0
  );
}

// --- Summary Helpers ---

function summarizeMutations(mutations: MutationRecord[]): MutationSummary {
  const byType: Record<string, number> = {};
  const targets = new Set<Node>();

  for (const m of mutations) {
    byType[m.type] = (byType[m.type] ?? 0) + 1;
    targets.add(m.target);
  }

  return {
    totalMutations: mutations.length,
    byType,
    targets,
    timestamp: Date.now(),
  };
}
