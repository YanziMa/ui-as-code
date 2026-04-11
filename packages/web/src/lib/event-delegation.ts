/**
 * Event Delegation: Advanced event delegation system with selector matching,
 * namespace support, delegation pools, capture/bubble phase control,
 * passive listener optimization, and delegation tree management.
 */

// --- Types ---

export type DelegatedHandler<T extends Event = Event> = (event: T, target: HTMLElement) => void;

export interface DelegationEntry<T extends Event = Event> {
  id: string;
  eventType: string;
  selector: string;
  handler: DelegatedHandler<T>;
  options?: AddEventListenerOptions;
  namespace?: string;
}

export interface DelegationPoolOptions {
  /** Root element for delegation (default: document) */
  root?: HTMLElement | Document;
  /** Enable capture phase by default */
  useCapture?: boolean;
  /** Use passive listeners where possible */
  passive?: boolean;
  /** Auto-cleanup on root removal */
  autoCleanup?: boolean;
}

export interface DelegationPoolInstance {
  /** Register a delegated event listener */
  on<K extends keyof HTMLElementEventMap>(
    eventType: K,
    selector: string,
    handler: DelegatedHandler<HTMLElementEventMap[K]>,
    options?: AddEventListenerOptions & { namespace?: string },
  ): () => void;
  /** Remove all listeners for a namespace */
  offNamespace(namespace: string): void;
  /** Remove all listeners for an event type */
  off(eventType: string): void;
  /** Remove a specific listener by ID */
  offById(id: string): void;
  /** Get count of active delegations */
  get size(): number;
  /** Destroy the pool and remove all listeners */
  destroy(): void;
}

// --- Selector Matching Helpers ---

/**
 * Check if an element matches a CSS selector, with caching for performance.
 */
const selectorCache = new Map<string, (el: HTMLElement) => boolean>();

function matchesSelector(el: HTMLElement, selector: string): boolean {
  let matcher = selectorCache.get(selector);
  if (!matcher) {
    matcher = (elem: HTMLElement) => elem.matches(selector);
    selectorCache.set(selector, matcher);
  }
  return matcher(el);
}

/**
 * Find the closest ancestor of `target` that matches `selector`,
 * staying within the bounds of `root`.
 */
function findMatchedTarget(
  target: HTMLElement,
  selector: string,
  root: HTMLElement | Document,
): HTMLElement | null {
  let current: HTMLElement | null = target;
  const rootEl = root instanceof Document ? root.documentElement : root;

  while (current && current !== rootEl) {
    if (matchesSelector(current, selector)) return current;
    current = current.parentElement;
  }

  return null;
}

// --- Main Delegation Pool ---

/**
 * Create an event delegation pool.
 *
 * All event listeners are registered on a single root element (document by default).
 * Events are dispatched to handlers based on CSS selector matching against
 * the event target's ancestors.
 *
 * @example
 * ```ts
 * const pool = createDelegationPool({ root: document.getElementById("app")! });
 *
 * // Clicks on any .button inside #app
 * pool.on("click", ".button", (e, target) => {
 *   console.log("Clicked:", target.dataset.id);
 * });
 *
 * // Namespace-based cleanup
 * pool.on("click", ".modal-close", closeModal, { namespace: "modal" });
 * pool.offNamespace("modal"); // Removes all modal listeners
 * ```
 */
export function createDelegationPool(options: DelegationPoolOptions = {}): DelegationPoolInstance {
  const {
    root = typeof document !== "undefined" ? document : null,
    useCapture = false,
    passive = true,
    autoCleanup = true,
  } = options;

  if (!root) throw new Error("DelegationPool: no root element available");

  const entries = new Map<string, DelegationEntry>();
  const eventTypeMap = new Map<string, Set<string>>(); // eventType → Set<entryId>
  const namespaceMap = new Map<string, Set<string>>(); // namespace → Set<entryId>
  let destroyed = false;
  let idCounter = 0;

  /**
   * Internal dispatcher — called for every event on the root.
   * Finds matching entries and invokes their handlers.
   */
  function dispatchEvent(event: Event): void {
    if (destroyed || !(event.target instanceof HTMLElement)) return;

    const target = event.target as HTMLElement;
    const type = event.type;
    const entryIds = eventTypeMap.get(type);

    if (!entryIds || entryIds.size === 0) return;

    for (const entryId of entryIds) {
      const entry = entries.get(entryId);
      if (!entry) continue;

      const matched = findMatchedTarget(target, entry.selector, root);
      if (matched) {
        try {
          entry.handler(event, matched);
        } catch (err) {
          console.error(`[DelegationPool] Handler error on "${entry.eventType}" for "${entry.selector}":`, err);
        }
      }
    }
  }

  /**
   * Ensure a native listener exists for this event type on the root.
   */
  function ensureNativeListener(eventType: string): void {
    if (!eventTypeMap.has(eventType)) {
      eventTypeMap.set(eventType, new Set());
      root.addEventListener(eventType, dispatchEvent, { capture: useCapture, passive });
    }
  }

  function on<K extends keyof HTMLElementEventMap>(
    eventType: K,
    selector: string,
    handler: DelegatedHandler<HTMLElementEventMap[K]>,
    options?: AddEventListenerOptions & { namespace?: string },
  ): () => void {
    if (destroyed) return () => {};

    const id = `del_${++idCounter}`;
    const ns = options?.namespace;

    const entry: DelegatedHandler<Event> = handler as unknown as DelegatedHandler<Event>;
    const fullOptions: AddEventListenerOptions = {
      ...options,
      passive: options?.passive ?? passive,
    };
    delete (fullOptions as Record<string, unknown>).namespace;

    entries.set(id, {
      id,
      eventType: String(eventType),
      selector,
      handler: entry,
      options: fullOptions,
      namespace: ns,
    });

    ensureNativeListener(String(eventType));
    eventTypeMap.get(String(eventType))!.add(id);

    if (ns) {
      if (!namespaceMap.has(ns)) namespaceMap.set(ns, new Set());
      namespaceMap.get(ns)!.add(id);
    }

    // Return unsubscribe function
    return () => offById(id);
  }

  function offById(id: string): void {
    const entry = entries.get(id);
    if (!entry) return;

    entries.delete(id);

    const typeSet = eventTypeMap.get(entry.eventType);
    if (typeSet) {
      typeSet.delete(id);
      if (typeSet.size === 0) {
        eventTypeMap.delete(entry.eventType);
        root.removeEventListener(entry.eventType, dispatchEvent, { capture: useCapture, passive });
      }
    }

    if (entry.namespace) {
      const nsSet = namespaceMap.get(entry.namespace);
      if (nsSet) {
        nsSet.delete(id);
        if (nsSet.size === 0) namespaceMap.delete(entry.namespace);
      }
    }
  }

  function offNamespace(namespace: string): void {
    const ids = namespaceMap.get(namespace);
    if (!ids) return;
    for (const id of ids) offById(id);
  }

  function off(eventType: string): void {
    const ids = eventTypeMap.get(eventType);
    if (!ids) return;
    for (const id of new Set(ids)) offById(id); // Copy set since offById mutates it
  }

  function destroy(): void {
    destroyed = true;
    for (const eventType of eventTypeMap.keys()) {
      root.removeEventListener(eventType, dispatchEvent, { capture: useCapture, passive });
    }
    entries.clear();
    eventTypeMap.clear();
    namespaceMap.clear();
  }

  // Auto-cleanup when root is removed from DOM
  if (autoCleanup && root instanceof HTMLElement && typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.removedNodes) {
          if (node === root) {
            destroy();
            observer.disconnect();
            return;
          }
        }
      }
    });
    observer.observe(root.parentNode ?? document.documentElement, { childList: true });
  }

  return { on, offNamespace, off, offById, get size() { return entries.size; }, destroy };
}

// --- Standalone Delegate Function ---

/**
 * Simple one-off event delegation without creating a pool.
 *
 * @example
 * ```ts
 * const cleanup = delegate(document.body, "click", ".card", (e, card) => {
 *   card.classList.toggle("expanded");
 * });
 * // Later: cleanup()
 * ```
 */
export function delegate<K extends keyof HTMLElementEventMap>(
  parent: HTMLElement | Document,
  eventType: K,
  selector: string,
  handler: DelegatedHandler<HTMLElementEventMap[K]>,
  options?: AddEventListenerOptions,
): () => void {
  const root = parent instanceof Document ? parent.documentElement : parent;

  const wrappedHandler = (e: Event): void => {
    if (!(e.target instanceof HTMLElement)) return;
    const matched = findMatchedTarget(e.target, selector, parent);
    if (matched) {
      handler(e as HTMLElementEventMap[K], matched);
    }
  };

  parent.addEventListener(eventType, wrappedHandler as EventListener, options);

  return () => {
    parent.removeEventListener(eventType, wrappedHandler as EventListener);
  };
}

// --- Multi-Delegate Utility ---

/**
 * Register multiple delegated events at once.
 * Returns a single cleanup function that removes all listeners.
 *
 * @example
 * ```ts
 * const cleanup = multiDelegate(container, [
 *   ["click", ".btn-primary", handlePrimary],
 *   ["click", ".btn-secondary", handleSecondary],
 *   ["input", "input[type='text']", handleInput],
 * ]);
 * ```
 */
export function multiDelegate(
  parent: HTMLElement | Document,
  registrations: Array<[string, string, DelegatedHandler, AddEventListenerOptions?]>,
): () => void {
  const cleanups = registrations.map(([type, sel, handler, opts]) =>
    delegate(parent, type as keyof HTMLElementEventMap, sel, handler, opts),
  );
  return () => cleanups.forEach((fn) => fn());
}
