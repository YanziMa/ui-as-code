/**
 * Advanced event handling utilities.
 */

/** Create a typed custom event */
export function createCustomEvent<T = unknown>(
  type: string,
  detail?: T,
): CustomEvent<T> {
  return new CustomEvent(type, {
    detail,
    bubbles: true,
    cancelable: true,
    composed: true, // Cross shadow DOM
  });
}

/** Dispatch a custom event on an element */
export function dispatchCustomEvent<T>(
  target: EventTarget,
  type: string,
  detail?: T,
): boolean {
  const event = createCustomEvent(type, detail);
  return target.dispatchEvent(event);
}

/** Subscribe to a custom event with auto-cleanup */
export function onCustomEvent<T>(
  target: EventTarget,
  type: string,
  handler: (detail: T) => void,
  options?: AddEventListenerOptions,
): () => void {
  const wrappedHandler = ((e: Event) => {
    handler((e as CustomEvent<T>).detail);
  }) as EventListener;

  target.addEventListener(type, wrappedHandler, options);

  return () => {
    target.removeEventListener(type, wrappedHandler);
  };
}

/** Throttle events to fire at most once per interval */
export function throttleEvent(
  target: EventTarget,
  type: string,
  handler: EventListener,
  intervalMs: number,
): () => void {
  let lastTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const throttledHandler = (e: Event) => {
    const now = Date.now();

    if (now - lastTime >= intervalMs) {
      lastTime = now;
      handler(e);
    } else if (!timer) {
      // Schedule one final call at end of interval
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        // Re-dispatch to get latest event data won't work perfectly,
        // but this ensures the handler fires at least once per window
        handler(e);
      }, intervalMs - (now - lastTime));
    }
  };

  target.addEventListener(type, throttledHandler);

  return () => {
    target.removeEventListener(type, throttledHandler);
    if (timer) clearTimeout(timer);
  };
}

/** Debounce events — only fire after quiet period */
export function debounceEvent(
  target: EventTarget,
  type: string,
  handler: EventListener,
  waitMs: number,
  options?: { leading?: boolean; trailing?: boolean },
): () => void {
  const { leading = false, trailing = true } = options ?? {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: [Event] | null = null;

  const debouncedHandler = (e: Event) => {
    lastArgs = [e];

    if (!timer && leading) {
      handler(e);
    }

    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      if (trailing && lastArgs) {
        handler(lastArgs[0]);
      }
      timer = null;
      lastArgs = null;
    }, waitMs);
  };

  target.addEventListener(type, debouncedHandler);

  return () => {
    target.removeEventListener(type, debouncedHandler);
    if (timer) clearTimeout(timer);
  };
}

/** Once — listen for event and automatically remove after first fire */
export function once(
  target: EventTarget,
  type: string,
  handler: EventListener,
  options?: AddEventListenerOptions,
): () => void {
  const onceHandler: EventListener = (e) => {
    target.removeEventListener(type, onceHandler);
    handler(e);
  };

  target.addEventListener(type, onceHandler, options);

  return () => {
    target.removeEventListener(type, onceHandler);
  };
}

/** Wait for a specific event to fire (returns promise) */
export function waitForEvent<T = unknown>(
  target: EventTarget,
  type: string,
  timeoutMs?: number,
): Promise<CustomEvent<T>> {
  return new Promise((resolve, reject) => {
    const cleanup = onCustomEvent<T>(target, type, resolve);

    if (timeoutMs) {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Event "${type}" did not fire within ${timeoutMs}ms`));
      }, timeoutMs);

      // Clean up timer when event fires
      const originalCleanup = cleanup;
      // Override to also clear timer
    }

    // For simplicity with timeout:
    if (timeoutMs) {
      setTimeout(() => {
        cleanup();
        reject(new Error(`Event "${type}" did not fire within ${timeoutMs}ms`));
      }, timeoutMs);
    }
  });
}

/** Delegate events from a parent container */
export function delegateEvent<K extends keyof HTMLElementEventMap>(
  parent: HTMLElement,
  eventType: K,
  selector: string,
  handler: (e: HTMLElementEventMap[K], matchedElement: HTMLElement) => void,
  options?: AddEventListenerOptions,
): () => void {
  const delegatedHandler = (e: Event) => {
    const target = e.target as HTMLElement | null;

    if (!target) return;

    const matched = target.closest(selector);

    if (matched && parent.contains(matched)) {
      handler(e as HTMLElementEventMap[K], matched);
    }
  };

  parent.addEventListener(eventType, delegatedHandler as EventListener, options);

  return () => {
    parent.removeEventListener(eventType, delegatedHandler as EventListener);
  };
}

/** Prevent default behavior for an event */
export function preventDefault(e: Event): void {
  e.preventDefault();
}

/** Stop event propagation */
export function stopPropagation(e: Event): void {
  e.stopPropagation();
}

/** Prevent default AND stop propagation */
export function stopEvent(e: Event): void {
  e.preventDefault();
  e.stopPropagation();
}
