/**
 * Will-Change property manager for GPU layer promotion optimization,
 * with automatic cleanup, memory pressure awareness, scroll-linked
 * management, and abuse prevention.
 *
 * WARNING: Overuse of will-change causes excessive memory usage.
 * This module enforces disciplined usage patterns.
 */

// --- Types ---

export type WillChangeProperty =
  | "contents"
  | "scroll-position"
  | "transform"
  | "opacity"
  | "top"
  | "left"
  | "right"
  | "bottom"
  | string;

export interface WillChangeRule {
  /** Target element */
  element: HTMLElement;
  /** Properties to promote */
  properties: WillChangeProperty[];
  /** Duration to keep promotion active (ms, default: 0 = indefinite until manually removed) */
  durationMs?: number;
  /** Reason for promotion (for debugging) */
  reason?: string;
}

export interface WillChangeManagerOptions {
  /** Maximum simultaneous promoted elements (default: 20) */
  maxPromoted?: number;
  /** Automatically remove will-change after animation ends (default: true) */
  autoCleanup?: boolean;
  /** Warn when exceeding max promoted (default: true) */
  warnOnOverflow?: boolean;
  /** Default duration for timed promotions (ms, default: 3000) */
  defaultDurationMs?: number;
  /** Log all promotions/demotions (default: false) */
  debug?: boolean;
  /** Called when an element is promoted */
  onPromote?: (rule: WillChangeRule) => void;
  /** Called when an element is demoted */
  onDemote?: (element: HTMLElement) => void;
}

export interface WillChangeManagerInstance {
  /** Promote an element with GPU layer hints */
  promote: (rule: WillChangeRule) => void;
  /** Demote an element (remove will-change) */
  demote: (element: HTMLElement) => void;
  /** Promote for a specific duration then auto-demote */
  promoteFor: (element: HTMLElement, properties: WillChangeProperty[], durationMs?: number) => void;
  /** Promote during scroll, demote after scroll stops */
  promoteDuringScroll: (element: HTMLElement, properties: WillChangeProperty[], scrollEndDelay?: number) => void;
  /** Check if an element is currently promoted */
  isPromoted: (element: HTMLElement) => boolean;
  /** Get current promoted count */
  get promotedCount(): number;
  /** Demote all promoted elements */
  demoteAll: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main ---

export function createWillChangeManager(options: WillChangeManagerOptions = {}): WillChangeManagerInstance {
  const {
    maxPromoted = 20,
    autoCleanup = true,
    warnOnOverflow = true,
    defaultDurationMs = 3000,
    debug = false,
    onPromote,
    onDemote,
  } = options;

  let destroyed = false;
  const promoted = new Map<HTMLElement, { properties: WillChangeProperty[]; timer?: ReturnType<typeof setTimeout>; reason?: string }>();
  const scrollListeners = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

  function log(msg: string): void {
    if (debug) console.log(`[will-change] ${msg}`);
  }

  function buildValue(props: WillChangeProperty[]): string {
    return props.join(", ");
  }

  function doPromote(rule: WillChangeRule): void {
    if (destroyed) return;

    const { element, properties, durationMs, reason } = rule;

    // Enforce limit
    if (promoted.size >= maxPromoted && !promoted.has(element)) {
      if (warnOnOverflow) {
        console.warn(`[will-change] Max promoted (${maxPromoted}) exceeded. Consider demoting unused elements.`);
      }
      // Demote oldest entry
      const oldest = promoted.keys().next().value;
      if (oldest) doDemote(oldest);
    }

    const value = buildValue(properties);
    element.style.willChange = value;
    promoted.set(element, { properties, reason });

    log(`Promoted ${properties.join(", ")} on <${element.tagName.toLowerCase()}>${reason ? ` (${reason})` : ""}`);
    onPromote?.(rule);

    // Timed auto-cleanup
    const dur = durationMs ?? defaultDurationMs;
    if (dur > 0) {
      const existing = promoted.get(element);
      if (existing?.timer) clearTimeout(existing.timer);
      const timer = setTimeout(() => {
        doDemote(element);
      }, dur);
      promoted.set(element, { ...promoted.get(element)!, timer });
    }
  }

  function doDemote(element: HTMLElement): void {
    if (destroyed) return;

    const info = promoted.get(element);
    if (!info?.timer) {
      element.style.willChange = "";
    } else {
      clearTimeout(info.timer);
      element.style.willChange = "";
    }

    promoted.delete(element);
    log(`Demoted <${element.tagName.toLowerCase()}>`);
    onDemote?.(element);
  }

  function doPromoteFor(element: HTMLElement, properties: WillChangeProperty[], durationMs?: number): void {
    doPromote({ element, properties, durationMs: durationMs ?? defaultDurationMs, reason: "timed-promotion" });
  }

  function doPromoteDuringScroll(
    element: HTMLElement,
    properties: WillChangeProperty[],
    scrollEndDelay = 150,
  ): void {
    if (destroyed) return;

    // Initial promotion
    doPromote({ element, properties, reason: "scroll-active" });

    let scrollTimer: ReturnType<typeof setTimeout>;

    function onScroll(): void {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        // Scroll ended — demote after delay
        window.removeEventListener("scroll", onScroll, { passive: true });
        doDemote(element);
      }, scrollEndDelay);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    scrollListeners.set(element, scrollTimer);
  }

  const instance: WillChangeManagerInstance = {
    promote: doPromote,
    demote: doDemote,
    promoteFor: doPromoteFor,
    promoteDuringScroll: doPromoteDuringScroll,

    isPromoted(element: HTMLElement): boolean {
      return promoted.has(element) && element.style.willChange !== "" && element.style.willChange !== "auto";
    },

    get promotedCount() { return promoted.size; },

    demoteAll() {
      for (const el of promoted.keys()) {
        doDemote(el);
      }
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      instance.demoteAll();
      for (const [, timer] of scrollListeners) clearTimeout(timer);
      scrollListeners.clear();
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Quick one-shot: promote for animation, auto-cleanup after duration */
export function gpuPromote(
  element: HTMLElement,
  properties: WillChangeProperty[] = ["transform", "opacity"],
  durationMs = 3000,
): () => void {
  const mgr = createWillChangeManager({ defaultDurationMs: durationMs });
  mgr.promoteFor(element, properties, durationMs);
  return () => mgr.destroy();
}

/** Check browser support for will-change */
export function isWillChangeSupported(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.createElement("div");
  return "willChange" in el.style;
}
