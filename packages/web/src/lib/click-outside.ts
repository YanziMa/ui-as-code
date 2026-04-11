/**
 * Click Outside: Detect clicks outside a target element(s) with configurable
 * behavior, multiple target support, exclusion zones, touch handling,
 * debounce, and lifecycle management.
 */

// --- Types ---

export interface ClickOutsideOptions {
  /** Target element(s) to watch */
  targets: HTMLElement | HTMLElement[] | string | string[];
  /** Callback when outside click detected */
  onClickOutside: (event: MouseEvent | TouchEvent) => void;
  /** Also listen for touch events? */
  touch?: boolean;
  /** Debounce rapid successive calls (ms) */
  debounceMs?: number;
  /** Elements to exclude from "outside" check */
  exclude?: HTMLElement | HTMLElement[] | string | string[];
  /** Only trigger once then auto-cleanup? */
  once?: boolean;
  /** Disable detection temporarily */
  disabled?: boolean;
  /** Capture phase? (fires before bubbling) */
  capture?: boolean;
  /** Ignore clicks on elements with this attribute */
  ignoreAttribute?: string;
}

export interface ClickOutsideInstance {
  /** Enable detection */
  enable: () => void;
  /** Disable detection */
  disable: () => void;
  /** Update target elements */
  setTargets: (targets: HTMLElement | HTMLElement[] | string | string[]) => void;
  /** Update excluded elements */
  setExclude: (exclude: HTMLElement | HTMLElement[] | string | string[]) => void;
  /** Manually trigger the callback */
  trigger: () => void;
  /** Check if currently enabled */
  isEnabled: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function resolveElements(input: HTMLElement | HTMLElement[] | string | string[]): HTMLElement[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    const results: HTMLElement[] = [];
    for (const item of input) {
      if (typeof item === "string") {
        document.querySelectorAll(item).forEach((el) => results.push(el as HTMLElement));
      } else {
        results.push(item);
      }
    }
    return results;
  }
  if (typeof input === "string") {
    return Array.from(document.querySelectorAll(input)) as HTMLElement[];
  }
  return [input];
}

function isInsideTargets(eventTarget: EventTarget | null, targets: HTMLElement[]): boolean {
  if (!eventTarget) return false;
  const el = eventTarget as Node;
  for (const target of targets) {
    if (target === el || target.contains(el)) return true;
  }
  return false;
}

function isExcluded(eventTarget: EventTarget | null, exclude: HTMLElement[]): boolean {
  if (!eventTarget || exclude.length === 0) return false;
  const el = eventTarget as Node;
  for (const ex of exclude) {
    if (ex === el || ex.contains(el)) return true;
  }
  return false;
}

// --- Main Factory ---

export function createClickOutside(options: ClickOutsideOptions): ClickOutsideInstance {
  let targets = resolveElements(options.targets);
  let exclude = resolveElements(options.exclude);
  let enabled = !options.disabled;
  let destroyed = false;
  let triggered = false;

  // Debounce state
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function handleClick(e: MouseEvent): void {
    if (destroyed || !enabled || triggered) return;

    // Check ignore attribute
    const target = e.target as HTMLElement;
    if (options.ignoreAttribute && target?.closest(`[${options.ignoreAttribute}]`)) return;

    // Check if inside any target
    if (isInsideTargets(e.target, targets)) return;

    // Check if in exclusion zone
    if (isExcluded(e.target, exclude)) return;

    // Fire callback
    fireCallback(e);
  }

  function handleTouch(e: TouchEvent): void {
    if (destroyed || !enabled || triggered) return;
    if (isInsideTargets(e.target, targets)) return;
    if (isExcluded(e.target, exclude)) return;
    fireCallback(e);
  }

  function fireCallback(event: MouseEvent | TouchEvent): void {
    if (options.debounceMs && options.debounceMs > 0) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        options.onClickOutside(event);
      }, options.debounceMs);
    } else {
      options.onClickOutside(event);
    }

    if (options.once) {
      triggered = true;
      // Auto cleanup after a tick
      setTimeout(() => instance.destroy(), 0);
    }
  }

  // Attach listeners
  const capture = options.capture ?? false;
  document.addEventListener("mousedown", handleClick, { capture });
  if (options.touch !== false) {
    document.addEventListener("touchstart", handleTouch, { capture, passive: true });
  }

  const instance: ClickOutsideInstance = {
    enable() {
      if (destroyed) return;
      enabled = true;
    },

    disable() {
      enabled = false;
    },

    setTargets(newTargets: HTMLElement | HTMLElement[] | string | string[]) {
      targets = resolveElements(newTargets);
    },

    setExclude(newExclude: HTMLElement | HTMLElement[] | string | string[]) {
      exclude = resolveElements(newExclude);
    },

    trigger() {
      options.onClickOutside(new MouseEvent("click") as MouseEvent);
    },

    isEnabled: () => enabled,

    destroy() {
      if (destroyed) return;
      destroyed = true;
      enabled = false;
      if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
      document.removeEventListener("mousedown", handleClick, { capture });
      document.removeEventListener("touchstart", handleTouch, { capture } as EventListenerOptions);
    },
  };

  return instance;
}

// --- Convenience: auto-cleanup when element is removed ---

export function onClickOutsideAuto(
  element: HTMLElement,
  handler: (event: MouseEvent | TouchEvent) => void,
  options?: Partial<Omit<ClickOutsideOptions, "targets" | "onClickOutside">>,
): ClickOutsideInstance {
  const instance = createClickOutside({
    targets: [element],
    onClickOutside: handler,
    ...options,
  });

  // Auto-destroy when element removed from DOM
  const observer = new MutationObserver(() => {
    if (!element.isConnected) {
      observer.disconnect();
      instance.destroy();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Store original destroy and wrap it
  const originalDestroy = instance.destroy;
  instance.destroy = () => {
    observer.disconnect();
    originalDestroy();
  };

  return instance;
}

// --- Multi-target with context menu support ---

export interface ContextClickOptions extends Omit<ClickOutsideOptions, "targets"> {
  /** The context menu / popup element */
  popup: HTMLElement;
  /** The trigger button that opened it */
  trigger?: HTMLElement;
  /** Close on Escape key too? */
  closeOnEscape?: boolean;
}

/** Create click-outside specifically for context menus/popups */
export function createPopupClose(
  options: ContextClickOptions,
): { instance: ClickOutsideInstance; open: () => void; close: () => void; isOpen: () => boolean } {
  let openState = false;

  const instance = createClickOutside({
    targets: [options.popup, ...(options.trigger ? [options.trigger] : [])],
    onClickOutside: (_e) => {
      if (openState) close();
    },
    touch: true,
    ...options,
  });

  function open() {
    openState = true;
    instance.enable();
  }

  function close() {
    openState = false;
    // Don't disable immediately to avoid immediate re-trigger
    setTimeout(() => { if (!openState) instance.disable(); }, 50);
  }

  function isOpen(): boolean {
    return openState;
  }

  // Escape key handler
  if (options.closeOnEscape !== false) {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openState) close();
    };
    document.addEventListener("keydown", escHandler);

    // Wrap destroy
    const origDestroy = instance.destroy;
    instance.destroy = () => {
      document.removeEventListener("keydown", escHandler);
      origDestroy();
    };
  }

  return { instance, open, close, isOpen };
}
