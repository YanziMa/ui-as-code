/**
 * Event delegation system — attach listeners to a parent element
 * and handle events on children via CSS selector matching.
 * Supports lifecycle management, once semantics, and delegation chains.
 */

// --- Types ---

export interface DelegateOptions {
  /** CSS selector to match target elements */
  selector: string;
  /** Event handler */
  handler: (e: Event, target: Element) => void;
  /** Event type(s) — string or array */
  events: string | string[];
  /** Use capture phase? (default: false) */
  capture?: boolean;
  /** Passive listener? (default: true for scroll/touch) */
  passive?: boolean;
  /** Only fire once per element? */
  once?: boolean;
  /** Prevent default? */
  preventDefault?: boolean;
  /** Stop propagation? */
  stopPropagation?: boolean;
  /** Debounce handler calls (ms) */
  debounceMs?: number;
  /** Throttle handler calls (ms) */
  throttleMs?: number;
}

export interface DelegatedEvent {
  /** The original DOM event */
  originalEvent: Event;
  /** The matched target element */
  target: Element;
  /** The delegate root element */
  delegateTarget: Element;
  /** Selector that matched */
  selector: string;
  /** Whether this was the first match in the delegation chain */
  isFirstMatch: boolean;
}

export type DelegateHandler = (delegated: DelegatedEvent) => void;

export interface EventDelegateInstance {
  /** The root element this delegate is attached to */
  root: Element;
  /** Number of active delegations */
  count: number;
  /** Add a new delegation rule */
  on: (options: DelegateOptions | DelegateOptions[]) => EventDelegateInstance;
  /** Remove specific delegation by selector + event */
  off: (selector: string, event?: string) => EventDelegateInstance;
  /** Remove all delegations */
  destroy: () => void;
  /** Trigger an event programmatically on matching elements */
  trigger: (eventType: string, selector?: string, detail?: unknown) => void;
}

// --- Main Class ---

/**
 * Create an event delegation manager on a root element.
 * All delegated listeners are attached to the root, not individual children.
 */
export class EventDelegate {
  create(root: Element): EventDelegateInstance {
    const rules = new Map<string, Array<{
      selector: string;
      handler: DelegateHandler;
      options: Omit<DelegateOptions, "selector" | "handler">;
      seen: Set<Element>;
    }>>();

    let destroyed = false;

    function getKey(eventType: string, selector: string): string {
      return `${eventType}::${selector}`;
    }

    function handleEvent(e: Event): void {
      if (destroyed) return;

      const eventType = e.type;
      const target = e.target as Element;
      if (!target) return;

      // Find all matching rules for this event type
      const matchingRules: Array<{ rule: typeof rules extends Map<string, infer A> ? A : never; matchedEl: Element }> = [];

      for (const [key, handlers] of rules) {
        if (!key.startsWith(`${eventType}::`)) continue;

        for (const h of handlers) {
          // Check if target or any ancestor matches selector
          const matchedEl = target.closest(h.selector);
          if (matchedEl && root.contains(matchedEl)) {
            // Once check
            if (h.options.once && h.seen.has(matchedEl)) continue;

            matchingRules.push({ rule: h, matchedEl });
          }
        }
      }

      // Process matches
      for (const { rule, matchedEl } of matchingRules) {
        const opts = rule.options;

        if (opts.preventDefault) e.preventDefault();
        if (opts.stopPropagation) e.stopPropagation();

        const delegated: DelegatedEvent = {
          originalEvent: e,
          target: matchedEl,
          delegateTarget: root,
          selector: rule.selector,
          isFirstMatch: true,
        };

        if (opts.once) rule.seen.add(matchedEl);

        // Apply debounce/throttle wrapper
        if (opts.debounceMs || opts.throttleMs) {
          applyRateLimit(rule.handler, delegated, opts);
        } else {
          rule.handler(delegated);
        }
      }
    }

    // Rate limiting map
    const rateLimitMap = new Map<string, { lastCall: number; timer: ReturnType<typeof setTimeout> | null }>();

    function applyRateLimit(handler: DelegateHandler, delegated: DelegatedEvent, opts: Omit<DelegateOptions, "selector" | "handler">): void {
      const key = `${opts.selector}-${delegated.originalEvent.type}`;

      if (opts.debounceMs) {
        const existing = rateLimitMap.get(key);
        if (existing?.timer) clearTimeout(existing.timer);

        const timer = setTimeout(() => {
          handler(delegated);
          rateLimitMap.delete(key);
        }, opts.debounceMs);

        rateLimitMap.set(key, { lastCall: Date.now(), timer });
      }

      if (opts.throttleMs) {
        const existing = rateLimitMap.get(key);
        const now = Date.now();

        if (existing && now - existing.lastCall < opts.throttleMs!) return; // Skip

        handler(delegated);
        rateLimitMap.set(key, { lastCall: now, timer: null });
      }
    }

    function addRule(options: DelegateOptions | DelegateOptions[]): EventDelegateInstance {
      const optsArray = Array.isArray(options) ? options : [options];

      for (const opt of optsArray) {
        const events = Array.isArray(opt.events) ? opt.events : [opt.events];

        for (const eventType of events) {
          const key = getKey(eventType, opt.selector);

          if (!rules.has(key)) {
            rules.set(key, []);

            // Attach listener to root (once per unique event type)
            root.addEventListener(eventType, handleEvent, {
              capture: opt.capture ?? false,
              passive: opt.passive ?? shouldBePassive(eventType),
            });
          }

          const handler: DelegateHandler = (e) => {
            opt.handler(e.originalEvent, e.target);
          };

          rules.get(key)!.push({
            selector: opt.selector,
            handler,
            options: {
              capture: opt.capture,
              passive: opt.passive,
              once: opt.once,
              preventDefault: opt.preventDefault,
              stopPropagation: opt.stopPropagation,
              debounceMs: opt.debounceMs,
              throttleMs: opt.throttleMs,
            },
            seen: new Set(),
          });
        }
      }

      return instance;
    }

    function removeRule(selector: string, event?: string): EventDelegateInstance {
      const keysToRemove: string[] = [];

      for (const [key, handlers] of rules) {
        const [eventType, sel] = key.split("::");
        if (sel === selector && (!event || eventType === event)) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        const [eventType] = key.split("::");
        rules.delete(key);

        // Check if any other rules still use this event type
        let stillUsed = false;
        for (const [k] of rules) {
          if (k.startsWith(`${eventType}::`)) {
            stillUsed = true;
            break;
          }
        }

        if (!stillUsed) {
          root.removeEventListener(eventType, handleEvent);
        }
      }

      return instance;
    }

    function destroyDelegate(): void {
      if (destroyed) return;
      destroyed = true;

      // Remove all listeners
      const eventTypes = new Set<string>();
      for (const [key] of rules) {
        const [eventType] = key.split("::");
        eventTypes.add(eventType);
      }

      for (const et of eventTypes) {
        root.removeEventListener(et, handleEvent);
      }

      rules.clear();
      rateLimitMap.clear();
    }

    function trigger(eventType: string, selector?: string, detail?: unknown): void {
      const customEvent = new CustomEvent(eventType, {
        bubbles: true,
        cancelable: true,
        detail,
      });

      if (selector) {
        const targets = root.querySelectorAll(selector);
        for (const t of targets) t.dispatchEvent(customEvent);
      } else {
        root.dispatchEvent(customEvent);
      }
    }

    const instance: EventDelegateInstance = {
      get root() { return root; },
      get count() { let c = 0; for (const [, v] of rules) c += v.length; return c; },
      on: addRule,
      off: removeRule,
      destroy: destroyDelegate,
      trigger,
    };

    return instance;
  }
}

/** Convenience: create event delegate on document body */
export function createBodyDelegate(): EventDelegateInstance {
  return new EventDelegate().create(document.body);
}

/** Convenience: create event delegate on a specific element */
export function createDelegate(element: HTMLElement | string): EventDelegateInstance {
  const el = typeof element === "string"
    ? document.querySelector<HTMLElement>(element)!
    : element;
  return new EventDelegate().create(el);
}

// --- Helpers ---

function shouldBePassive(eventType: string): boolean {
  return ["scroll", "touchstart", "touchmove", "wheel"].includes(eventType);
}
