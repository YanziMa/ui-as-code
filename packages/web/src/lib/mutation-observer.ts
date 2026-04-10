/**
 * Mutation Observer: DOM change detection with configurable observation types,
 * batching, filtering, debouncing, subtree monitoring, and simplified API.
 */

// --- Types ---

export type MutationFilter =
  | "attributes"
  | "childList"
  | "characterData"
  | "subtree";

export interface MutationObserverOptions {
  /** Element to observe */
  target: HTMLElement;
  /** What to observe (default: all) */
  filter?: MutationFilter | MutationFilter[];
  /** Only watch specific attribute names? */
  attributeFilter?: string[];
  /** Old value for attribute records? */
  attributeOldValue?: boolean;
  /** Batch mutations within a timeframe? (ms, 0 = no batching) */
  batchDelay?: number;
  /** Debounce callback invocations (ms, 0 = no debounce) */
  debounceMs?: number;
  /** Custom filter to include/exclude mutations */
  customFilter?: (mutation: SimplifiedMutationRecord) => boolean;
  /** Callback on mutations */
  onMutate?: (mutations: SimplifiedMutationRecord[]) => void;
  /** Disconnect after first mutation? */
  once?: boolean;
}

export interface SimplifiedMutationRecord {
  type: "attributes" | "childList" | "characterData";
  target: HTMLElement;
  attributeName?: string;
  oldValue?: string | null;
  newValue?: string | null;
  addedNodes?: HTMLElement[];
  removedNodes?: HTMLElement[];
  timestamp: number;
}

export interface MutationObserverInstance {
  /** The raw browser MutationObserver */
  observer: MutationObserver;
  /** Start observing */
  start: () => void;
  /** Stop observing (keeps observer alive for resume) */
  stop: () => void;
  /** Resume observing after stop */
  resume: () => void;
  /** Take and flush buffered records */
  takeRecords: () => SimplifiedMutationRecord[];
  /** Disconnect permanently */
  disconnect: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
  /** Check if currently observing */
  isActive: () => boolean;
}

// --- Helpers ---

function normalizeFilters(filter: MutationFilter | MutationFilter[] | undefined): MutationObserverInit["attributeOldValue"] & MutationObserverInit {
  if (!filter || filter.length === 0) {
    return { attributes: true, childList: true, characterData: true, subtree: true };
  }

  if (typeof filter === "string") {
    const map: Record<MutationFilter, { attr: boolean; child: boolean; char: boolean; sub: boolean }> = {
      attributes: { attr: true, child: false, char: false, sub: false },
      childList:   { attr: false, child: true, char: false, sub: true },
      characterData:{ attr: false, child: false, char: true, sub: true },
      subtree:     { attr: true, child: true, char: true, sub: true },
    };
    return map[filter]!;
  }

  const filters = Array.isArray(filter) ? filter : [filter];
  const result: MutationObserverInit = {
    attributes: false,
    childList: false,
    characterData: false,
    subtree: false,
    attributeOldValue: false,
  };

  for (const f of filters) {
    switch (f) {
      case "attributes": result.attributes = true; break;
      case "childList": result.childList = true; break;
      case "characterData": result.characterData = true; break;
      case "subtree":
        result.attributes = true;
        result.childList = true;
        result.characterData = true;
        result.subtree = true;
        break;
    }
  }

  return result;
}

function simplifyRecord(record: MutationRecord): SimplifiedMutationRecord {
  const base: SimplifiedMutationRecord = {
    type: record.type as SimplifiedMutationRecord["type"],
    target: record.target as HTMLElement,
    timestamp: Date.now(),
  };

  if (record.type === "attributes") {
    base.attributeName = record.attributeName;
    base.oldValue = record.oldValue;
    base.newValue = (record.target as HTMLElement)[record.attributeName!];
  } else if (record.type === "childList") {
    base.addedNodes = Array.from(record.addedNodes) as HTMLElement[];
    base.removedNodes = Array.from(record.removedNodes) as HTMLElement[];
  } else if (record.type === "characterData") {
    base.oldValue = record.oldValue;
    base.newValue = (record.target as HTMLElement).textContent;
    base.target = record.target as HTMLElement;
  }

  return base;
}

// --- Main Class ---

export class MutationWatcher {
  create(options: MutationObserverOptions): MutationObserverInstance {
    let destroyed = false;
    let isActive = false;
    let batchTimer: ReturnType<typeof setTimeout> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let buffer: SimplifiedMutationRecord[] = [];

    // Resolve init options
    const initOpts = normalizeFilters(options.filter);
    if (options.attributeOldValue) initOpts.attributeOldValue = true;
    if (options.attributeFilter && options.attributeFilter.length > 0) {
      initOpts.attributeFilter = options.attributeFilter;
    }

    // Create observer
    const observer = new MutationObserver((records: MutationRecord[]) => {
      if (destroyed) return;

      const simplified = records.map(simplifyRecord);

      // Apply custom filter
      let filtered = options.customFilter
        ? simplified.filter(options.customFilter)
        : simplified;

      if (filtered.length === 0) return;

      // Batching
      if (options.batchDelay && options.batchDelay > 0) {
        buffer.push(...filtered);
        if (!batchTimer) {
          batchTimer = setTimeout(() => {
            flushBuffer();
          }, options.batchDelay);
        }
        return;
      }

      // Debouncing
      if (options.debounceMs && options.debounceMs > 0) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          options.onMutate?.(filtered);
        }, options.debounceMs);
        return;
      }

      // Direct dispatch
      options.onMutate?.(filtered);

      // Once mode
      if (options.once) {
        instance.stop();
      }
    });

    const instance: MutationObserverInstance = {
      observer,

      start() {
        if (destroyed || isActive) return;
        isActive = true;
        observer.observe(options.target, initOpts);
      },

      stop() {
        if (!isActive) return;
        isActive = false;
        observer.disconnect();
        // Don't clear buffer - allow takeRecords() after stop
      },

      resume() {
        instance.start();
      },

      takeRecords() {
        // Flush any pending batch
        if (batchTimer) {
          clearTimeout(batchTimer);
          batchTimer = null;
          const buf = buffer;
          buffer = [];
          return buf;
        }
        // Take from observer
        const records = observer.takeRecords();
        return records.map(simplifyRecord);
      },

      disconnect() {
        instance.stop();
        buffer = [];
        if (batchTimer) { clearTimeout(batchTimer); batchTimer = null; }
        if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
      },

      destroy() {
        if (destroyed) return;
        destroyed = true;
        instance.disconnect();
      },

      isActive() { return isActive; },
    };

    // Auto-start
    if (options.once !== false) {
      instance.start();
    }

    return instance;
  }
}

/** Convenience: create a mutation watcher */
export function createMutationObserver(options: MutationObserverOptions): MutationObserverInstance {
  return new MutationWatcher().create(options);
}

// --- Convenience: wait for element to exist in DOM ---

/** Wait until an element matching selector appears in DOM */
export function waitForElement(
  selector: string,
  options?: { timeout?: number; parent?: HTMLElement; interval?: number },
): Promise<HTMLElement | null> {
  const { timeout = 10000, parent = document.body, interval = 50 } = options ?? {};

  return new Promise((resolve, reject) => {
    const el = parent.querySelector<HTMLElement>(selector);
    if (el) { resolve(el); return; }

    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);

    const observer = new MutationObserver(() => {
      const found = parent.querySelector<HTMLElement>(selector);
      if (found) {
        clearTimeout(timer);
        observer.disconnect();
        resolve(found);
      }
    });

    observer.observe(parent, { childList: true, subtree: true });
  });
}

/** Wait until an element is removed from DOM */
export function waitForRemoval(
  element: HTMLElement,
  options?: { timeout?: number },
): Promise<void> {
  const { timeout = 30000 } = options ?? {};

  return new Promise((resolve, reject) => {
    if (!element.isConnected) { resolve(); return; }

    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(); // Timeout - assume removed
    }, timeout);

    const observer = new MutationObserver(() => {
      if (!element.isConnected) {
        clearTimeout(timer);
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}
