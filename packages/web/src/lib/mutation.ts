/**
 * MutationObserver wrapper — observe DOM changes with filtering,
 * batching, throttling, and structured change reporting.
 */

// --- Types ---

export type MutationFilter = "childList" | "attributes" | "characterData" | "subtree";

export interface MutationObserverOptions {
  /** Element to observe */
  target: HTMLElement | string;
  /** What to observe */
  filter?: MutationFilter[];
  /** Attribute names to watch (default: all) */
  attributeFilter?: string[];
  /** Also record old values? */
  recordOldValues?: boolean;
  /** Callback on mutations */
  onMutate?: (changes: MutationChange[]) => void;
  /** Throttle callback (ms) */
  throttleMs?: number;
  /** Debounce callback (ms) */
  debounceMs?: number;
  /** Only report specific types of changes */
  onlyTypes?: Array<"added" | "removed" | "changed" | "moved">;
  /** Maximum number of changes to report per batch (0 = unlimited) */
  maxChangesPerBatch?: number;
}

export interface MutationChange {
  type: "added" | "removed" | "changed" | "moved" | "attribute" | "text";
  target: HTMLElement | Text | CharacterData;
  /** For added/removed: the element */
  element?: HTMLElement;
  /** For attributes: attribute name and values */
  attributeName?: string;
  oldValue?: string;
  newValue?: string;
  /** Timestamp of this change */
  timestamp: number;
}

export interface MutationObserverInstance {
  /** The observed element */
  target: HTMLElement;
  /** Current observer state */
  isObserving: boolean;
  /** Total mutations observed since creation */
  totalMutations: number;
  /** Start observing */
  start: () => void;
  /** Stop observing */
  stop: () => void;
  /** Disconnect and cleanup */
  destroy: () => void;
  /** Take a snapshot of current state for comparison */
  snapshot: () => string;
  /** Get recent changes (since last poll) */
  getChanges: () => MutationChange[];
  /** Manually trigger a check */
  flush: () => MutationChange[];
}

// --- Main Class ---

export class DOMMutationObserver {
  create(options: MutationObserverOptions): MutationObserverInstance {
    const target = typeof options.target === "string"
      ? document.querySelector<HTMLElement>(options.target)!
      : options.target;

    if (!target) throw new Error("MutationObserver: target not found");

    const opts = {
      filter: options.filter ?? ["childList", "subtree"],
      attributeFilter: options.attributeFilter,
      recordOldValues: options.recordOldValues ?? false,
      throttleMs: options.throttleMs ?? 0,
      debounceMs: options.debounceMs ?? 0,
      onlyTypes: options.onlyTypes,
      maxChangesPerBatch: options.maxChangesPerBatch ?? 0,
      ...options,
    };

    let totalMutations = 0;
    let observing = false;
    let destroyed = false;
    let lastFlushTime = Date.now();
    const recentChanges: MutationChange[] = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;

    // Build MutationObserver config
    const config: MutationObserverInit = {};
    if (opts.filter.includes("childList")) config.childList = true;
    if (opts.filter.includes("attributes")) {
      config.attributes = true;
      if (opts.attributeFilter) config.attributeFilter = opts.attributeFilter;
    }
    if (opts.filter.includes("characterData")) config.characterData = true;
    if (opts.filter.includes("subtree")) config.subtree = true;

    // Track previous state for move detection
    const prevChildren = new Map<Element, number>(); // element -> index

    function updatePrevChildren(): void {
      prevChildren.clear();
      const children = target.children;
      for (let i = 0; i < children.length; i++) {
        prevChildren.set(children[i], i);
      }
    }

    function processMutations(records: MutationRecord[]): MutationChange[] {
      const changes: MutationChange[] = [];

      for (const record of records) {
        // Added nodes
        for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) continue;
          if (opts.onlyTypes && !opts.onlyTypes.includes("added")) continue;

          changes.push({
            type: "added",
            target: node as HTMLElement | Text,
            element: node.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : undefined,
            timestamp: Date.now(),
          });
        }

        // Removed nodes
        for (const node of record.removedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) continue;
          if (opts.onlyTypes && !opts.onlyTypes.includes("removed")) continue;

          changes.push({
            type: "removed",
            target: node as HTMLElement | Text,
            element: node.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : undefined,
            timestamp: Date.now(),
          });
        }

        // Attribute changes
        if (record.type === "attributes") {
          if (opts.onlyTypes && !opts.onlyTypes.includes("changed") && !opts.onlyTypes.includes("attribute")) continue;

          changes.push({
            type: "attribute",
            target: record.target as HTMLElement,
            attributeName: record.attributeName!,
            oldValue: record.oldValue ?? undefined,
            newValue: (record.target as HTMLElement).getAttribute(record.attributeName!) ?? undefined,
            timestamp: Date.now(),
          });
        }

        // Character data changes
        if (record.type === "characterData") {
          if (opts.onlyTypes && !opts.onlyTypes.includes("changed") && !opts.onlyTypes.includes("text")) continue;

          changes.push({
            type: "text",
            target: record.target as Text,
            oldValue: record.oldValue ?? undefined,
            newValue: record.target.textContent ?? undefined,
            timestamp: Date.now(),
          });
        }
      }

      // Detect moves (element was removed and re-added at different position)
      if (!opts.onlyTypes || opts.onlyTypes.includes("moved")) {
        const currentChildren = new Map<Element, number>();
        const children = target.children;
        for (let i = 0; i < children.length; i++) {
          currentChildren.set(children[i], i);
        }

        for (const [el, oldIdx] of prevChildren) {
          const newIdx = currentChildren.get(el);
          if (newIdx !== undefined && newIdx !== oldIdx) {
            changes.push({
              type: "moved",
              target: el as HTMLElement,
              element: el as HTMLElement,
              timestamp: Date.now(),
            });
          }
        }

        updatePrevChildren();
      } else {
        updatePrevChildren();
      }

      // Apply max batch limit
      if (opts.maxChangesPerBatch > 0 && changes.length > opts.maxChangesPerBatch) {
        changes.length = opts.maxChangesPerBatch;
      }

      return changes;
    }

    const observer = new MutationObserver((records) => {
      if (destroyed) return;

      totalMutations += records.length;
      const changes = processMutations(records);

      // Store in recent
      recentChanges.push(...changes);

      // Throttle / Debounce handling
      const deliver = () => {
        opts.onMutate?.(recentChanges.splice(0));
      };

      if (opts.debounceMs > 0) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(deliver, opts.debounceMs);
      } else if (opts.throttleMs > 0) {
        const now = Date.now();
        if (now - lastFlushTime >= opts.throttleMs) {
          deliver();
          lastFlushTime = now;
        } else if (!throttleTimer) {
          throttleTimer = setTimeout(() => {
            deliver();
            lastFlushTime = Date.now();
            throttleTimer = null;
          }, opts.throttleMs - (now - lastFlushTime));
        }
      } else {
        deliver();
      }
    });

    updatePrevChildren();

    // Auto-start
    observer.observe(target, config);
    observing = true;

    const instance: MutationObserverInstance = {
      get target() { return target; },
      get isObserving() { return observing; },
      get totalMutations() { return totalMutations; },

      start() {
        if (destroyed || observing) return;
        observer.observe(target, config);
        observing = true;
      },

      stop() {
        if (!observing) return;
        observer.disconnect();
        observing = false;
      },

      destroy() {
        if (destroyed) return;
        destroyed = true;
        observer.disconnect();
        if (debounceTimer) clearTimeout(debounceTimer);
        if (throttleTimer) clearTimeout(throttleTimer);
        recentChanges.length = 0;
        prevChildren.clear();
      },

      snapshot(): string {
        return target.innerHTML;
      },

      getChanges(): MutationChange[] {
        return [...recentChanges];
      },

      flush(): MutationChange[] {
        const changes = [...recentChanges];
        recentChanges.length = 0;
        return changes;
      },
    };

    return instance;
  }
}

/** Convenience: create a mutation observer */
export function observeMutations(options: MutationObserverOptions): MutationObserverInstance {
  return new DOMMutationObserver().create(options);
}

/**
 * Wait for an element matching selector to appear in the DOM.
 * Returns promise that resolves when found.
 */
export function waitForElement(
  selector: string,
  options?: { root?: HTMLElement | Document; timeout?: number },
): Promise<Element | null> {
  const root = options?.root ?? document;
  const timeout = options?.timeout ?? 10000;

  return new Promise((resolve) => {
    // Check immediately
    const existing = root.querySelector(selector);
    if (existing) { resolve(existing); return; }

    // Set up observer
    const obs = new MutationObserver((records, obsInstance) => {
      const el = root.querySelector(selector);
      if (el) {
        obsInstance.disconnect();
        resolve(el);
      }
    });

    obs.observe(root === document ? document.documentElement : root, {
      childList: true,
      subtree: true,
    });

    // Timeout
    setTimeout(() => {
      obs.disconnect();
      resolve(null);
    }, timeout);
  });
}
