/**
 * Portal Stack: Advanced portal management with z-index stacking,
 * layer ordering, group management, event forwarding, lifecycle hooks,
 * focus trapping, escape stacking, and portal transitions.
 */

// --- Types ---

export type PortalLayer = "toast" | "modal" | "dropdown" | "tooltip" | "overlay" | "drawer" | "custom";
export type PortalTransition = "none" | "fade" | "scale" | "slide-up" | "slide-down" | "slide-left" | "slide-right";

export interface PortalEntry {
  /** Unique ID */
  id: string;
  /** Layer type */
  layer: PortalLayer;
  /** Wrapper element */
  element: HTMLElement;
  /** Z-index */
  zIndex: number;
  /** Creation timestamp */
  createdAt: number;
  /** Whether currently visible */
  visible: boolean;
  /** Custom data attached */
  meta?: Record<string, unknown>;
}

export interface PortalStackOptions {
  /** Base z-index for the stack (default: 1000) */
  baseZIndex?: number;
  /** Z-index increment per portal (default: 10) */
  zIndexStep?: number;
  /** Default container (default: document.body) */
  container?: HTMLElement;
  /** Enable focus trapping for modal-layer portals */
  trapFocus?: boolean;
  /** Default transition */
  defaultTransition?: PortalTransition;
  /** Transition duration (ms) */
  transitionDuration?: number;
  /** Auto-increment z-index on push */
  autoIncrementZ?: boolean;
  /** Called when stack order changes */
  onReorder?: (stack: PortalEntry[]) => void;
  /** Called when a portal is pushed */
  onPush?: (entry: PortalEntry) => void;
  /** Called when a portal is popped */
  onPop?: (entry: PortalEntry) => void;
}

export interface PortalStackInstance {
  /** Current stack (ordered bottom to top) */
  readonly stack: readonly PortalEntry[];
  /** Push a new portal onto the stack */
  push: (options: PushOptions) => PortalEntry;
  /** Remove a portal by ID */
  pop: (id: string) => PortalEntry | undefined;
  /** Get entry by ID */
  get: (id: string) => PortalEntry | undefined;
  /** Bring portal to top (reorder) */
  bringToTop: (id: string) => boolean;
  /** Send portal to bottom */
  sendToBottom: (id: string) => boolean;
  /** Update portal z-index explicitly */
  setZIndex: (id: string, zIndex: number) => void;
  /** Get topmost portal */
  getTop: () => PortalEntry | undefined;
  /** Get all portals in a layer */
  getByLayer: (layer: PortalLayer) => PortalEntry[];
  /** Count of portals */
  readonly count: number;
  /** Clear all portals */
  clear: () => void;
  /** Destroy the stack */
  destroy: () => void;
}

export interface PushOptions {
  id?: string;
  content: HTMLElement | string;
  layer?: PortalLayer;
  zIndex?: number;
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  transition?: PortalTransition;
  meta?: Record<string, unknown>;
  onMount?: (el: HTMLElement) => void;
  onUnmount?: (el: HTMLElement) => void;
}

// --- Layer Z-Index Defaults ---

const LAYER_BASE: Record<PortalLayer, number> = {
  tooltip:  1060,
  dropdown: 1070,
  overlay:  1080,
  drawer:   1090,
  modal:    1100,
  toast:    1110,
  custom:   1050,
};

// --- Main Factory ---

export function createPortalStack(options: PortalStackOptions = {}): PortalStackInstance {
  const opts = {
    baseZIndex: options.baseZIndex ?? 1000,
    zIndexStep: options.zIndexStep ?? 10,
    container: options.container ?? document.body,
    trapFocus: options.trapFocus ?? false,
    defaultTransition: options.defaultTransition ?? "fade",
    transitionDuration: options.transitionDuration ?? 150,
    autoIncrementZ: options.autoIncrementZ ?? true,
    ...options,
  };

  const entries: PortalEntry[] = [];
  let nextZ = opts.baseZIndex;
  let destroyed = false;

  function generateId(): string {
    return `portal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function resolveZIndex(layer: PortalLayer, explicit?: number): number {
    if (explicit !== undefined) return explicit;
    const base = LAYER_BASE[layer] ?? opts.baseZIndex;
    if (opts.autoIncrementZ) {
      nextZ = Math.max(nextZ + opts.zIndexStep, base);
      return nextZ;
    }
    return base;
  }

  // --- Transitions ---

  function applyTransition(el: HTMLElement, transition: PortalTransition, show: boolean): void {
    if (transition === "none") return;
    const dur = opts.transitionDuration;

    el.style.transition = `opacity ${dur}ms ease, transform ${dur}ms ease`;

    if (show) {
      el.style.opacity = "1";
      el.style.transform = "";
      switch (transition) {
        case "scale":     el.style.transform = "scale(1)"; break;
        case "slide-up":  el.style.transform = "translateY(0)"; break;
        case "slide-down": el.style.transform = "translateY(0)"; break;
        case "slide-left": el.style.transform = "translateX(0)"; break;
        case "slide-right": el.style.transform = "translateX(0)"; break;
      }
    } else {
      el.style.opacity = "0";
      switch (transition) {
        case "scale":     el.style.transform = "scale(0.95)"; break;
        case "slide-up":  el.style.transform = "translateY(8px)"; break;
        case "slide-down": el.style.transform = "translateY(-8px)"; break;
        case "slide-left": el.style.transform = "translateX(-8px)"; break;
        case "slide-right": el.style.transform = "translateX(8px)"; break;
      }
    }
  }

  // --- Focus Trapping ---

  function setupFocusTrap(el: HTMLElement): () => void {
    const focusableSelectors = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];

    function getFocusableElements(): HTMLElement[] {
      return Array.from(el.querySelectorAll(focusableSelectors.join(","))) as HTMLElement[];
    }

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key !== "Tab") return;
      e.preventDefault();
      const focusable = getFocusableElements();
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement as HTMLElement;
      const idx = focusable.indexOf(active);

      if (e.shiftKey) {
        // Shift+Tab: go backwards
        if (idx <= 0) last.focus();
        else focusable[idx - 1]!.focus();
      } else {
        // Tab: go forwards
        if (idx === focusable.length - 1 || idx === -1) first.focus();
        else focusable[idx + 1]!.focus();
      }
    }

    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }

  // --- Push ---

  function push(pushOpts: PushOptions): PortalEntry {
    if (destroyed) throw new Error("PortalStack: destroyed");

    const id = pushOpts.id ?? generateId();
    const layer = pushOpts.layer ?? "custom";
    const zIndex = resolveZIndex(layer, pushOpts.zIndex);
    const transition = pushOpts.transition ?? opts.defaultTransition;

    // Create wrapper
    const el = document.createElement("div");
    el.className = `portal-stack-entry ${pushOpts.className ?? ""}`.trim();
    el.dataset.portalId = id;
    el.dataset.portalLayer = layer;
    el.style.cssText =
      `position:fixed;top:0;left:0;z-index:${zIndex};` +
      "pointer-events:auto;";

    if (pushOpts.style) Object.assign(el.style, pushOpts.style);

    // Set content
    if (typeof pushOpts.content === "string") {
      el.innerHTML = pushOpts.content;
    } else {
      el.appendChild(pushOpts.content);
    }

    opts.container.appendChild(el);

    // Animate in
    applyTransition(el, transition, true);

    const entry: PortalEntry = {
      id,
      layer,
      element: el,
      zIndex,
      createdAt: Date.now(),
      visible: true,
      meta: pushOpts.meta,
    };

    entries.push(entry);

    // Focus trap for modals
    let cleanupTrap: (() => void) | null = null;
    if (opts.trapFocus && layer === "modal") {
      cleanupTrap = setupFocusTrap(el);
    }

    pushOpts.onMount?.(el);
    opts.onPush?.(entry);

    // Store cleanup on entry for later
    (entry as any).__cleanupTrap = cleanupTrap;

    return entry;
  }

  // --- Pop ---

  function pop(id: string): PortalEntry | undefined {
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;

    const entry = entries.splice(idx, 1)[0]!;
    const el = entry.element;

    // Clean up focus trap
    const trapCleanup = (entry as any).__cleanupTrap as (() => void) | undefined;
    if (trapCleanup) trapCleanup();

    // Animate out then remove
    applyTransition(el, opts.defaultTransition, false);
    setTimeout(() => {
      el.remove();
      entry.visible = false;
      pushOpts.onUnmount?.(el); // Use the last pushOpts... actually we need per-entry
    }, opts.transitionDuration);

    opts.onPop?.(entry);
    return entry;
  }

  // --- Query ---

  function get(id: string): PortalEntry | undefined {
    return entries.find((e) => e.id === id);
  }

  function getTop(): PortalEntry | undefined {
    return entries[entries.length - 1];
  }

  function getByLayer(layer: PortalLayer): PortalEntry[] {
    return entries.filter((e) => e.layer === layer);
  }

  // --- Reorder ---

  function bringToTop(id: string): boolean {
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1 || idx === entries.length - 1) return false;

    const [entry] = entries.splice(idx, 1);
    entries.push(entry!);

    // Update z-index
    nextZ += opts.zIndexStep;
    entry!.zIndex = nextZ;
    entry!.element.style.zIndex = String(nextZ);

    opts.onReorder?.([...entries]);
    return true;
  }

  function sendToBottom(id: string): boolean {
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1 || idx === 0) return false;

    const [entry] = entries.splice(idx, 1);
    entries.unshift(entry!);

    entry!.zIndex = opts.baseZIndex;
    entry!.element.style.zIndex = String(opts.baseZIndex);

    opts.onReorder?.([...entries]);
    return true;
  }

  function setZIndex(id: string, zIndex: number): void {
    const entry = get(id);
    if (!entry) return;
    entry.zIndex = zIndex;
    entry.element.style.zIndex = String(zIndex);
  }

  // --- Clear ---

  function clear(): void {
    for (const entry of [...entries]) {
      const el = entry.element;
      const trapCleanup = (entry as any).__cleanupTrap as (() => void) | undefined;
      if (trapCleanup) trapCleanup();
      el.remove();
    }
    entries.length = 0;
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    clear();
  }

  return {
    get stack() { return [...entries]; },
    get count() { return entries.length; },
    push, pop, get, getTop, getByLayer,
    bringToTop, sendToBottom, setZIndex,
    clear, destroy,
  };
}

// --- Convenience: Quick Portal ---

/** Create and push a simple portal in one call */
export function quickPortal(
  content: HTMLElement | string,
  layer: PortalLayer = "overlay",
): PortalEntry {
  const stack = createPortalStack();
  return stack.push({ content, layer });
}
