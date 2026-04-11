/**
 * Overlay Manager Utilities: Stacked overlay management with priority levels,
 * modal stacking, backdrop handling, focus trapping, escape key routing,
 * body scroll locking, and lifecycle hooks.
 */

// --- Types ---

export type OverlayPriority = "low" | "normal" | "high" | "critical";
export type OverlayState = "opening" | "open" | "closing" | "closed";

export interface OverlayEntry {
  /** Unique ID */
  id: string;
  /** The overlay element */
  el: HTMLElement;
  /** Priority level */
  priority?: OverlayPriority;
  /** Closes on escape? */
  closeOnEscape?: boolean;
  /** Closes on outside click? */
  closeOnOutside?: boolean;
  /** Locks body scroll while open? */
  lockScroll?: boolean;
  /** Show backdrop? */
  backdrop?: boolean;
  /** Backdrop opacity (0-1) */
  backdropOpacity?: number;
  /** Backdrop color */
  backdropColor?: string;
  /** Trap focus inside overlay? */
  trapFocus?: boolean;
  /** Return focus to trigger element on close? */
  returnFocus?: boolean;
  /** On open callback */
  onOpen?: (entry: OverlayEntry) => void;
  /** On close callback */
  onClose?: (entry: OverlayEntry) => void;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Custom class name */
  className?: string;
}

export interface OverlayManagerOptions {
  /** Root container for overlays */
  container?: HTMLElement;
  /** Default backdrop settings */
  defaultBackdropOpacity?: number;
  /** Default backdrop color */
  defaultBackdropColor?: string;
  /** Default close-on-outside behavior */
  closeOnOutsideDefault?: boolean;
  /** Default close-on-escape behavior */
  closeOnEscapeDefault?: boolean;
  /** Maximum simultaneous overlays */
  maxOverlays?: number;
  /** Called when any overlay opens */
  onOverlayOpen?: (id: string) => void;
  /** Called when any overlay closes */
  onOverlayClose?: (id: string) => void;
  /** Custom class name */
  className?: string;
}

export interface OverlayManagerInstance {
  /** Open an overlay */
  open(entry: OverlayEntry): Promise<void>;
  /** Close an overlay by ID */
  close(id: string): Promise<void>;
  /** Close all overlays */
  closeAll(): Promise<void>;
  /** Get active overlay count */
  getCount(): number;
  /** Get topmost overlay ID */
  getTopId(): string | null;
  /** Check if an overlay is open */
  isOpen(id: string): boolean;
  /** Set loading state on an overlay */
  setLoading(id: string, loading: boolean): void;
  /** Destroy manager */
  destroy(): void;
}

// --- Priority weights ---

const PRIORITY_WEIGHTS: Record<OverlayPriority, number> = {
  "low": 10,
  "normal": 50,
  "high": 100,
  "critical": 200,
};

// --- Core Factory ---

/**
 * Create an overlay manager for controlling stacked modals/dialogs/tooltips.
 *
 * @example
 * ```ts
 * const manager = createOverlayManager({
 *   defaultBackdropOpacity: 0.5,
 *   closeOnOutsideDefault: true,
 *   closeOnEscapeDefault: true,
 * });
 *
 * await manager.open({
 *   id: "my-modal",
 *   el: modalElement,
 *   priority: "high",
 *   backdrop: true,
 *   trapFocus: true,
 * });
 * ```
 */
export function createOverlayManager(options: OverlayManagerOptions = {}): OverlayManagerInstance {
  const {
    container,
    defaultBackdropOpacity = 0.5,
    defaultBackdropColor = "rgba(0,0,0,0.5)",
    closeOnOutsideDefault = true,
    closeOnEscapeDefault = true,
    maxOverlays = 10,
    onOverlayOpen,
    onOverlayClose,
  } = options;

  const overlays = new Map<string, OverlayEntry & { state: OverlayState; backdropEl?: HTMLElement; savedFocus?: HTMLElement }>();
  const cleanupFns = new Map<string, Array<() => void>>();

  function getRootContainer(): HTMLElement {
    return container ?? document.body;
  }

  async function open(entry: OverlayEntry): Promise<void> {
    if (overlays.size >= maxOverlays) {
      // Close lowest priority overlay
      const lowest = findLowestPriority();
      if (lowest) await close(lowest.id);
    }

    const enriched = { ...entry, state: "opening" as OverlayState };
    overlays.set(entry.id, enriched);

    // Save current focus
    if (entry.returnFocus !== false) {
      enriched.savedFocus = document.activeElement as HTMLElement;
    }

    // Create backdrop if needed
    if (entry.backdrop !== false) {
      const backdrop = document.createElement("div");
      backdrop.className = `overlay-backdrop ${entry.className ?? ""}`;
      backdrop.dataset.overlayId = entry.id;
      backdrop.style.cssText =
        "position:fixed;inset:0;z-index:auto;" +
        `background:${entry.backdropColor ?? defaultBackdropColor};` +
        `opacity:0;transition:opacity ${entry.animationDuration ?? 200}ms ease;` +
        "pointer-events:none;";
      getRootContainer().appendChild(backdrop);
      enriched.backdropEl = backdrop;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => { backdrop.style.opacity = String(entry.backdropOpacity ?? defaultBackdropOpacity); });
      });

      // Click outside to close
      if (entry.closeOnOutside ?? closeOnOutsideDefault) {
        const handler = (e: MouseEvent) => {
          if (e.target === backdrop || (enriched.el.contains(e.target as Node))) return;
          close(entry.id);
        };
        backdrop.addEventListener("click", handler);
        setCleanup(entry.id, () => backdrop.removeEventListener("click", handler));
      }
    }

    // Lock body scroll
    if (entry.lockScroll) {
      document.body.style.overflow = "hidden";
    }

    // Focus trap
    if (entry.trapFocus) {
      setupFocusTrap(entry.id, enriched.el);
    }

    // Escape handler
    if (entry.closeOnEscape ?? closeOnEscapeDefault) {
      const escHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape" && getTopId() === entry.id) {
          close(entry.id);
        }
      };
      document.addEventListener("keydown", escHandler);
      setCleanup(entry.id, () => document.removeEventListener("keydown", escHandler));
    }

    // Mount element
    getRootContainer().appendChild(enriched.el);

    // Animate in
    enriched.state = "open";
    enriched.el.style.opacity = "0";
    enriched.el.style.transform = "scale(0.96)";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        enriched.el.style.transition = `opacity ${entry.animationDuration ?? 200}ms ease, transform ${entry.animationDuration ?? 200}ms ease`;
        enriched.el.style.opacity = "1";
        enriched.el.style.transform = "scale(1)";
        enriched.state = "open";
      });
    });

    onOverlayOpen?.(entry.id);
    entry.onOpen?.(enriched);
  }

  async function close(id: string): Promise<void> {
    const entry = overlays.get(id);
    if (!entry || entry.state === "closed") return;

    entry.state = "closing";

    // Animate out
    const duration = entry.animationDuration ?? 200;
    entry.el.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
    entry.el.style.opacity = "0";
    entry.el.style.transform = "scale(0.96)";

    if (entry.backdropEl) {
      entry.backdropEl.style.transition = `opacity ${duration}ms ease`;
      entry.backdropEl.style.opacity = "0";
    }

    await new Promise((r) => setTimeout(r, duration));

    // Cleanup
    entry.el.remove();
    entry.backdropEl?.remove();
    entry.state = "closed";

    // Restore body scroll
    if (overlays.size <= 1 && [...overlays.values()].some((o) => o.lockScroll)) {
      // Only restore if no other overlay needs scroll locked
      const anyLocked = [...overlays.values()].filter((o) => o.id !== id && o.lockScroll).length > 0;
      if (!anyLocked) document.body.style.overflow = "";
    }

    // Restore focus
    if (entry.savedFocus && typeof entry.savedFocus.focus === "function") {
      entry.savedFocus.focus();
    }

    // Run cleanup functions
    const fns = cleanupFns.get(id);
    if (fns) { for (const fn of fns) fn(); cleanupFns.delete(id); }

    overlays.delete(id);
    onOverlayClose?.(id);
    entry.onClose?.(entry);
  }

  async function closeAll(): Promise<void> {
    const ids = [...overlays.keys()];
    for (const id of ids) await close(id);
  }

  function getCount(): number { return overlays.size; }

  function getTopId(): string | null {
    let topId: string | null = null;
    let topWeight = -1;
    for (const [id, entry] of overlays) {
      const w = PRIORITY_WEIGHTS[entry.priority ?? "normal"];
      if (w > topWeight) { topWeight = w; topId = id; }
    }
    return topId;
  }

  function isOpen(id: string): boolean {
    return overlays.has(id) && overlays.get(id)!.state === "open";
  }

  function setLoading(id: string, loading: boolean): void {
    const entry = overlays.get(id);
    if (!entry) return;
    // Could show/hide a spinner inside the overlay
  }

  function destroy(): void {
    closeAll().then(() => {});
    overlays.clear();
    cleanupFns.clear();
  }

  // --- Internal Helpers ---

  function findLowestPriority(): OverlayEntry | undefined {
    let lowest: OverlayEntry | undefined;
    let lowWeight = Infinity;
    for (const [, entry] of overlays) {
      const w = PRIORITY_WEIGHTS[entry.priority ?? "normal"];
      if (w < lowWeight) { lowWeight = w; lowest = entry; }
    }
    return lowest;
  }

  function setCleanup(id: string, fn: () => void): void {
    if (!cleanupFns.has(id)) cleanupFns.set(id, []);
    cleanupFns.get(id)!.push(fn);
  }

  function setupFocusTrap(id: string, el: HTMLElement): void {
    const focusableSelectors = [
      'a[href]:not([disabled])',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
    ].join(", ");

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      e.preventDefault();

      const focusable = Array.from(el.querySelectorAll(focusableSelectors)) as HTMLElement[];
      if (focusable.length === 0) return;

      const active = document.activeElement;
      const currentIndex = focusable.indexOf(active as HTMLElement);
      const nextIndex = e.shiftKey
        ? (currentIndex + 1) % focusable.length
        : (currentIndex - 1 + focusable.length) % focusable.length;

      focusable[nextIndex]?.focus();
    };

    el.addEventListener("keydown", handleKeyDown);
    setCleanup(id, () => el.removeEventListener("keydown", handleKeyDown));
  }

  return { open, close, closeAll, getCount, getTopId, isOpen, setLoading, destroy };
}
