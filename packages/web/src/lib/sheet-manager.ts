/**
 * Sheet Manager: Bottom-sheet / action-sheet panel system with
 * multiple sizes, drag-to-dismiss, snap points, backdrop handling,
 * nested sheets, keyboard navigation, animations, focus trapping,
 * and mobile-first design.
 */

// --- Types ---

export type SheetSize = "sm" | "md" | "lg" | "xl" | "full" | number;
export type SheetSnapPoint = "peek" | "half" | "full" | number;

export interface SheetOptions {
  /** Panel content (HTML string or element) */
  content: string | HTMLElement;
  /** Size preset or pixel height */
  size?: SheetSize;
  /** Snap points for drag interaction */
  snapPoints?: SheetSnapPoint[];
  /** Initial snap point index */
  initialSnap?: number;
  /** Show close button */
  closable?: boolean;
  /** Show drag handle at top */
  showHandle?: boolean;
  /** Click backdrop to close */
  closeOnBackdrop?: boolean;
  /** Swipe down to dismiss */
  swipeToDismiss?: boolean;
  /** Dismiss threshold (fraction of height, default: 0.3) */
  dismissThreshold?: number;
  /** Custom CSS class */
  className?: string;
  /** Backdrop CSS class */
  backdropClassName?: string;
  /** Header title */
  title?: string;
  /** Footer content or action buttons */
  footer?: string | HTMLElement | SheetAction[];
  /** Z-index override */
  zIndex?: number;
  /** Callback when sheet opens */
  onOpen?: (sheet: SheetInstance) => void;
  /** Callback when sheet closes */
  onClose?: (sheet: SheetInstance, reason: "close" | "backdrop" | "swipe" | "escape") => void;
  /** Callback when snap changes */
  onSnapChange?: (snapIndex: number, snapPoint: SheetSnapPoint) => void;
  /** Lock body scroll while open */
  lockScroll?: boolean;
  /** Trap focus inside sheet */
  trapFocus?: boolean;
  /** Return focus on close */
  returnFocus?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Destroy on close vs hide */
  destroyOnClose?: boolean;
}

export interface SheetAction {
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "cancel";
  autoClose?: boolean;
  action: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

export interface SheetInstance {
  id: string;
  element: HTMLDivElement;
  backdrop: HTMLDivElement;
  options: SheetOptions;
  /** Close the sheet */
  close: (reason?: "close" | "backdrop" | "swipe" | "escape") => void;
  /** Update content */
  updateContent: (content: string | HTMLElement) => void;
  /** Update title */
  updateTitle: (title: string) => void;
  /** Update footer */
  updateFooter: (footer?: string | HTMLElement | SheetAction[]) => void;
  /** Set loading state on an action button */
  setActionLoading: (label: string, loading: boolean) => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Get current z-index */
  getZIndex: () => number;
  /** Get current snap index */
  getSnapIndex: () => number;
  /** Snap to a specific point */
  snapTo: (index: number) => void;
  /** Destroy the instance */
  destroy: () => void;
}

// --- Global State ---

let globalZIndex = 10600;
const activeSheets: SheetInstance[] = [];
let previouslyFocused: Element | null = null;

// --- Size Map ---

const SIZE_MAP: Record<string, number> = {
  sm: 280,
  md: 450,
  lg: 600,
  xl: 780,
  full: 0, // 100vh
};

const SNAP_MAP: Record<string, (vh: number) => number> = {
  peek: (vh) => Math.min(vh * 0.25, 200),
  half: (vh) => vh * 0.5,
  full: (vh) => vh - 20,
};

// --- Main Class ---

export class SheetManager {
  private container: HTMLDivElement | null = null;
  private defaultOptions: Partial<SheetOptions> = {};
  private listeners = new Set<(sheet: SheetInstance, action: "open" | "close") => void>();

  constructor(defaultOptions: Partial<SheetOptions> = {}) {
    this.defaultOptions = defaultOptions;
    if (typeof document !== "undefined") this.initContainer();
  }

  /** Open a bottom sheet */
  open(options: SheetOptions): SheetInstance {
    const merged = { ...this.defaultOptions, ...options };
    const id = `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const instance = this.createSheet(id, merged);

    activeSheets.push(instance);
    this.updateZIndices();

    if (merged.lockScroll !== false) this.lockBodyScroll();
    if (merged.trapFocus !== false && merged.returnFocus !== false && !previouslyFocused) {
      previouslyFocused = document.activeElement;
    }

    // Animate in
    requestAnimationFrame(() => {
      instance.backdrop.classList.add("sm-visible");
      instance.element.classList.add("sm-visible");
    });

    merged.onOpen?.(instance);
    this.listeners.forEach((l) => l(instance, "open"));

    return instance;
  }

  /** Close the topmost sheet */
  closeTop(reason: "close" | "backdrop" | "swipe" | "escape" = "close"): boolean {
    const top = activeSheets[activeSheets.length - 1];
    if (top) { top.close(reason); return true; }
    return false;
  }

  /** Close all sheets */
  closeAll(): void {
    while (activeSheets.length > 0) {
      const top = activeSheets[activeSheets.length - 1];
      top?.close("close");
    }
  }

  /** Get count of open sheets */
  getCount(): number { return activeSheets.length; }

  /** Listen to events */
  onEvent(listener: (sheet: SheetInstance, action: "open" | "close") => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Clean up */
  destroy(): void {
    this.closeAll();
    this.container?.remove();
    this.container = null;
  }

  // --- Internal ---

  private initContainer(): void {
    this.container = document.createElement("div");
    this.container.id = "sheet-manager-root";
    document.body.appendChild(this.container);

    const style = document.createElement("style");
    style.textContent = `
      .sm-backdrop {
        position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 10599;
        display: flex; align-items: flex-end; justify-content: center;
        opacity: 0; transition: opacity 0.3s ease; pointer-events: none;
      }
      .sm-backdrop.sm-visible { opacity: 1; pointer-events: auto; }
      .sm-sheet {
        position: relative; width: 100%; max-width: 500px;
        margin: 0 auto; background: #fff;
        border-radius: 16px 16px 0 0;
        box-shadow: 0 -8px 40px rgba(0,0,0,0.15), 0 -2px 8px rgba(0,0,0,0.08);
        display: flex; flex-direction: column;
        max-height: calc(100vh - 20px);
        transform: translateY(100%); transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
        overflow: hidden;
      }
      .sm-sheet.sm-visible { transform: translateY(0); }
      /* Handle */
      .sm-handle-bar {
        display: flex; justify-content: center; padding: 10px 0 6px;
        cursor: grab; touch-action: none; user-select: none;
        flex-shrink: 0;
      }
      .sm-handle-bar:active { cursor: grabbing; }
      .sm-handle {
        width: 36px; height: 4px; border-radius: 2px;
        background: #d1d5db; transition: background 0.15s;
      }
      .sm-handle-bar:hover .sm-handle { background: #9ca3af; }
      /* Header */
      .sm-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 4px 20px 12px; flex-shrink: 0;
      }
      .sm-title { font-size: 17px; font-weight: 600; color: #1a1a1a; margin: 0; }
      .sm-close-btn {
        width: 30px; height: 30px; border: none; background: transparent;
        border-radius: 6px; cursor: pointer; color: #999; font-size: 18px;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
      }
      .sm-close-btn:hover { background: #f0f0f0; color: #333; }
      /* Body */
      .sm-body {
        flex: 1; overflow-y: auto; padding: 4px 20px 16px;
        font-size: 14px; line-height: 1.6; color: #444; min-height: 40px;
        -webkit-overflow-scrolling: touch;
      }
      /* Footer */
      .sm-footer {
        display: flex; flex-direction: column; gap: 6px;
        padding: 8px 20px 28px; flex-shrink: 0;
        border-top: 1px solid #f0f0f0; padding-top: 12px;
      }
      .sm-btn {
        width: 100%; padding: 13px 18px; border-radius: 11px; font-size: 16px;
        font-weight: 500; cursor: pointer; border: none; transition: all 0.15s;
        display: flex; align-items: center; justify-content: center; gap: 8px;
      }
      .sm-btn:hover:not(:disabled) { opacity: 0.88; }
      .sm-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      .sm-btn-primary { background: #007aff; color: #fff; }
      .sm-btn-secondary { background: #f2f2f7; color: #007aff; }
      .sm-btn-danger { background: #ff3b30; color: #fff; }
      .sm-btn-cancel { background: transparent; color: #ff3b30; }
      .sm-btn-ghost { background: transparent; color: #007aff; }
      .sm-btn-loading::after {
        content: ""; width: 16px; height: 16px; border: 2px solid transparent;
        border-top-color: currentColor; border-radius: 50%;
        animation: sm-spin 0.6s linear infinite; margin-left: 6px;
      }
      @keyframes sm-spin { to { transform: rotate(360deg); } }
      /* Destructive group */
      .sm-destructive-group { margin-top: 8px; border-top: 1px solid #f0f0f0; padding-top: 8px; }
    `;
    this.container.appendChild(style);
  }

  private createSheet(id: string, opts: Required<SheetOptions> & SheetOptions): SheetInstance {
    if (!this.container!) throw new Error("Sheet container not initialized");

    const zIndex = ++globalZIndex;
    const animDur = opts.animationDuration ?? 350;

    // Backdrop
    const backdrop = document.createElement("div");
    backdrop.className = "sm-backdrop";
    backdrop.style.zIndex = String(zIndex - 1);
    if (opts.backdropClassName) backdrop.className += ` ${opts.backdropClassName}`;

    // Resolve size
    let resolvedHeight: number;
    if (typeof opts.size === "number") {
      resolvedHeight = opts.size;
    } else {
      resolvedHeight = SIZE_MAP[opts.size as string] ?? SIZE_MAP.md;
    }

    // Snap points
    const snapPoints = opts.snapPoints ?? ["peek", "half", "full"];
    let currentSnapIndex = opts.initialSnap ?? Math.min(snapPoints.length - 1, 1);

    function resolveSnapHeight(snap: SheetSnapPoint): number {
      if (typeof snap === "number") return snap;
      const fn = SNAP_MAP[snap];
      return fn ? fn(window.innerHeight) : window.innerHeight * 0.5;
    }

    // Sheet element
    const sheet = document.createElement("div");
    sheet.className = `sm-sheet${opts.className ? ` ${opts.className}` : ""}`;
    sheet.style.zIndex = String(zIndex);
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");

    // Set initial height
    const initialHeight = resolveSnapHeight(snapPoints[currentSnapIndex]!);
    sheet.style.height = `${resolvedHeight > 0 && resolvedHeight !== SIZE_MAP.full ? resolvedHeight : initialHeight}px`;

    // Drag handle
    if (opts.showHandle !== false) {
      const handleBar = document.createElement("div");
      handleBar.className = "sm-handle-bar";
      handleBar.innerHTML = '<div class="sm-handle"></div>';
      sheet.appendChild(handleBar);

      // Drag-to-snap/dismiss logic
      let isDragging = false;
      let startY = 0;
      let startHeight = 0;
      let startTop = 0;

      const onTouchStart = (e: TouchEvent | MouseEvent) => {
        isDragging = true;
        startY = "touches" in e ? e.touches[0]!.clientY : e.clientY;
        startHeight = sheet.offsetHeight;
        startTop = sheet.getBoundingClientRect().top;
        sheet.style.transition = "none";
      };

      const onTouchMove = (e: TouchEvent | MouseEvent) => {
        if (!isDragging) return;
        const clientY = "touches" in e ? e.touches[0]!.clientY : e.clientY;
        const delta = clientY - startY;

        // Only allow dragging downward (to dismiss/snap down)
        if (delta > 0) {
          const newHeight = startHeight - delta;
          sheet.style.height = `${Math.max(80, newHeight)}px`;
        }
      };

      const onTouchEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        sheet.style.transition = `transform ${animDur}ms cubic-bezier(0.32, 0.72, 0, 1)`;

        const currentH = sheet.offsetHeight;
        const threshold = (opts.dismissThreshold ?? 0.3) * startHeight;

        if (startHeight - currentH > threshold && opts.swipeToDismiss !== false) {
          // Dismiss by swipe
          instance.close("swipe");
          return;
        }

        // Find nearest snap point
        let nearestIdx = 0;
        let nearestDist = Infinity;
        for (let i = 0; i < snapPoints.length; i++) {
          const snapH = resolveSnapHeight(snapPoints[i]!);
          const dist = Math.abs(currentH - snapH);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
          }
        }

        instance.snapTo(nearestIdx);
      };

      handleBar.addEventListener("touchstart", onTouchStart, { passive: true });
      handleBar.addEventListener("touchmove", onTouchMove, { passive: true });
      handleBar.addEventListener("touchend", onTouchEnd);
      handleBar.addEventListener("mousedown", onTouchStart);
      document.addEventListener("mousemove", onTouchMove);
      document.addEventListener("mouseup", onTouchEnd);
    }

    // Build header
    if (opts.title || opts.closable !== false) {
      const header = document.createElement("div");
      header.className = "sm-header";

      if (opts.title) {
        const titleEl = document.createElement("h2");
        titleEl.id = `${id}-title`;
        titleEl.className = "sm-title";
        titleEl.textContent = opts.title;
        header.appendChild(titleEl);
      }

      if (opts.closable !== false) {
        const closeBtn = document.createElement("button");
        closeBtn.className = "sm-close-btn";
        closeBtn.innerHTML = "&times;";
        closeBtn.addEventListener("click", () => instance.close("close"));
        header.appendChild(closeBtn);
      }

      sheet.appendChild(header);
    }

    // Body
    const body = document.createElement("div");
    body.className = "sm-body";
    if (typeof opts.content === "string") {
      body.innerHTML = opts.content;
    } else {
      body.appendChild(opts.content);
    }
    sheet.appendChild(body);

    // Footer
    if (opts.footer) {
      const footer = document.createElement("div");
      footer.className = "sm-footer";
      this.renderFooter(footer, opts.footer);
      sheet.appendChild(footer);
    }

    // Assemble
    backdrop.appendChild(sheet);
    this.container!.appendChild(backdrop);

    // Event handlers
    if (opts.closeOnBackdrop !== false) {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) instance.close("backdrop");
      });
    }

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && opts.swipeToDismiss !== false) {
        if (activeSheets[activeSheets.length - 1] === instance) {
          instance.close("escape");
        }
      }
    };
    document.addEventListener("keydown", keyHandler);

    const instance: SheetInstance = {
      id,
      element: sheet,
      backdrop,
      options: opts,
      isOpen: () => backdrop.classList.contains("sm-visible"),
      getZIndex: () => zIndex,

      getSnapIndex: () => currentSnapIndex,

      snapTo(index: number) {
        if (index < 0 || index >= snapPoints.length) return;
        currentSnapIndex = index;
        const h = resolveSnapHeight(snapPoints[index]!);
        sheet.style.transition = `height ${animDur}ms cubic-bezier(0.32, 0.72, 0, 1)`;
        sheet.style.height = `${h}px`;
        opts.onSnapChange?.(index, snapPoints[index]!);
      },

      close: (reason = "close") => {
        if (!instance.isOpen()) return;

        sheet.classList.remove("sm-visible");
        backdrop.classList.remove("sm-visible");

        setTimeout(() => {
          backdrop.remove();
          const idx = activeSheets.indexOf(instance);
          if (idx >= 0) activeSheets.splice(idx, 1);
          document.removeEventListener("keydown", keyHandler);

          if (opts.destroyOnClose) {
            // Already removed
          }

          this.restoreBodyScroll();
          this.returnFocus();

          opts.onClose?.(instance, reason);
          this.listeners.forEach((l) => l(instance, "close"));
        }, animDur + 50);
      },

      updateContent: (content: string | HTMLElement) => {
        const bodyEl = sheet.querySelector(".sm-body");
        if (bodyEl) {
          if (typeof content === "string") bodyEl.innerHTML = content;
          else { bodyEl.innerHTML = ""; bodyEl.appendChild(content); }
        }
      },

      updateTitle: (title: string) => {
        const titleEl = sheet.querySelector(".sm-title");
        if (titleEl) titleEl.textContent = title;
        sheet.setAttribute("aria-label", title);
      },

      updateFooter: (footer) => {
        const footerEl = sheet.querySelector(".sm-footer");
        if (footerEl) footerEl.remove();
        if (footer) {
          const newFooter = document.createElement("div");
          newFooter.className = "sm-footer";
          this.renderFooter(newFooter, footer);
          sheet.appendChild(newFooter);
        }
      },

      setActionLoading: (label: string, loading: boolean) => {
        const buttons = sheet.querySelectorAll(".sm-btn");
        for (const btn of buttons) {
          if (btn.textContent?.includes(label)) {
            btn.classList.toggle("sm-btn-loading", loading);
            btn.disabled = loading;
          }
        }
      },

      destroy() {
        instance.close();
      },
    };

    // Focus trap
    if (opts.trapFocus !== false) {
      this.setupFocusTrap(instance);
    }

    return instance;
  }

  private renderFooter(container: HTMLElement, footer: string | HTMLElement | SheetAction[]): void {
    if (typeof footer === "string") {
      container.innerHTML = footer;
    } else if (footer instanceof HTMLElement) {
      container.appendChild(footer);
    } else if (Array.isArray(footer)) {
      let inDestructive = false;

      for (const action of footer) {
        // Auto-detect destructive group
        if (action.variant === "danger" || action.variant === "cancel") {
          if (!inDestructive) {
            const div = document.createElement("div");
            div.className = "sm-destructive-group";
            container.appendChild(div);
            container = div;
            inDestructive = true;
          }
        } else if (inDestructive) {
          inDestructive = false;
          // Go back to original container
        }

        const btn = document.createElement("button");
        btn.className = `sm-btn sm-btn-${action.variant ?? "secondary"}`;
        btn.textContent = action.label;
        btn.disabled = action.disabled ?? false;
        if (action.loading) btn.classList.add("sm-btn-loading");

        btn.addEventListener("click", async () => {
          await action.action();
          if (action.autoClose !== false) {
            const top = this.getTop();
            if (top) top.close("action" as any);
          }
        });
        container.appendChild(btn);
      }
    }
  }

  private updateZIndices(): void {
    let base = globalZIndex - activeSheets.length + 1;
    for (const s of activeSheets) {
      s.element.style.zIndex = String(++base);
      s.backdrop.style.zIndex = String(base - 1);
    }
  }

  private lockBodyScroll(): void {
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollBarWidth}px`;
  }

  private restoreBodyScroll(): void {
    if (activeSheets.length === 0) {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
  }

  private returnFocus(): void {
    if (activeSheets.length === 0 && previouslyFocused && "focus" in previouslyFocused) {
      (previouslyFocused as HTMLElement).focus();
      previouslyFocused = null;
    }
  }

  private setupFocusTrap(instance: SheetInstance): void {
    const el = instance.element;
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !instance.isOpen()) return;
      e.preventDefault();

      const focusable = Array.from(el.querySelectorAll<HTMLElement>(focusableSelectors));
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        last.focus();
      } else {
        first.focus();
      }
    };

    el.addEventListener("keydown", handler);
    (instance as unknown as Record<string, unknown>)._focusHandler = handler;
  }

  private getTop(): SheetInstance | undefined {
    return activeSheets[activeSheets.length - 1];
  }
}

/** Convenience: create a sheet manager instance */
export function createSheetManager(options?: Partial<SheetOptions>): SheetManager {
  return new SheetManager(options);
}
