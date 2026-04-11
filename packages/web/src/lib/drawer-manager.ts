/**
 * Drawer Manager: Slide-out panel system with left/right/bottom/top positions,
 * multiple sizes, backdrop handling, nested drawer support, drag-to-resize,
 * keyboard navigation, animations, focus trapping, body scroll lock,
 * and accessibility.
 */

// --- Types ---

export type DrawerPosition = "left" | "right" | "bottom" | "top";
export type DrawerSize = "xs" | "sm" | "md" | "lg" | "xl" | "full" | number;
export type DrawerAnimation = "slide" | "fade" | "scale" | "none";

export interface DrawerOptions {
  /** Panel content (HTML string or element) */
  content: string | HTMLElement;
  /** Position of the drawer */
  position?: DrawerPosition;
  /** Size preset or pixel width/height */
  size?: DrawerSize;
  /** Animation type */
  animation?: DrawerAnimation;
  /** Show close button */
  closable?: boolean;
  /** Click backdrop to close */
  closeOnBackdrop?: boolean;
  /** Press Escape to close */
  closeOnEscape?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Backdrop CSS class */
  backdropClassName?: string;
  /** Header title */
  title?: string;
  /** Footer content or action buttons */
  footer?: string | HTMLElement | DrawerAction[];
  /** Z-index override */
  zIndex?: number;
  /** Callback when drawer opens */
  onOpen?: (drawer: DrawerInstance) => void;
  /** Callback when drawer closes */
  onClose?: (drawer: DrawerInstance, reason: "close" | "escape" | "backdrop") => void;
  /** Lock body scroll while open */
  lockScroll?: boolean;
  /** Trap focus inside drawer */
  trapFocus?: boolean;
  /** Return focus on close */
  returnFocus?: boolean;
  /** Allow drag-to-resize */
  resizable?: boolean;
  /** Minimum size when resizing (px) */
  minSize?: number;
  /** Maximum size when resizing (px) */
  maxSize?: number;
  /** Destroy on close vs hide */
  destroyOnClose?: boolean;
}

export interface DrawerAction {
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  autoClose?: boolean;
  action: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

export interface DrawerInstance {
  id: string;
  element: HTMLDivElement;
  backdrop: HTMLDivElement;
  options: DrawerOptions;
  /** Close the drawer */
  close: (reason?: "close" | "escape" | "backdrop") => void;
  /** Update content */
  updateContent: (content: string | HTMLElement) => void;
  /** Update title */
  updateTitle: (title: string) => void;
  /** Update footer */
  updateFooter: (footer?: string | HTMLElement | DrawerAction[]) => void;
  /** Set loading state on an action button */
  setActionLoading: (label: string, loading: boolean) => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Get current z-index */
  getZIndex: () => number;
  /** Get current size in px */
  getCurrentSize: () => number;
  /** Resize programmatically */
  resize: (size: number) => void;
}

// --- Global State ---

let globalZIndex = 10500;
const activeDrawers: DrawerInstance[] = [];
let previouslyFocused: Element | null = null;

// --- Size Map ---

const SIZE_MAP: Record<string, { width?: number; height?: number }> = {
  xs:  { width: 280 },
  sm:  { width: 360 },
  md:  { width: 480 },
  lg:  { width: 640 },
  xl:  { width: 800 },
  full: { width: 0 }, // 100%
};

// --- Main Class ---

export class DrawerManager {
  private container: HTMLDivElement | null = null;
  private defaultOptions: Partial<DrawerOptions> = {};
  private listeners = new Set<(drawer: DrawerInstance, action: "open" | "close") => void>();

  constructor(defaultOptions: Partial<DrawerOptions> = {}) {
    this.defaultOptions = defaultOptions;
    if (typeof document !== "undefined") this.initContainer();
  }

  /** Open a drawer */
  open(options: DrawerOptions): DrawerInstance {
    const merged = { ...this.defaultOptions, ...options };
    const id = `drawer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const instance = this.createDrawer(id, merged);

    activeDrawers.push(instance);
    this.updateZIndices();

    if (merged.lockScroll !== false) this.lockBodyScroll();
    if (merged.trapFocus !== false && merged.returnFocus !== false && !previouslyFocused) {
      previouslyFocused = document.activeElement;
    }

    // Animate in
    requestAnimationFrame(() => {
      instance.backdrop.classList.add("dm-visible");
      instance.element.classList.add("dm-visible");
    });

    merged.onOpen?.(instance);
    this.listeners.forEach((l) => l(instance, "open"));

    return instance;
  }

  /** Close the topmost drawer */
  closeTop(reason: "close" | "escape" | "backdrop" = "close"): boolean {
    const top = activeDrawers[activeDrawers.length - 1];
    if (top) { top.close(reason); return true; }
    return false;
  }

  /** Close all drawers */
  closeAll(): void {
    while (activeDrawers.length > 0) {
      const top = activeDrawers[activeDrawers.length - 1];
      top?.close("close");
    }
  }

  /** Get count of open drawers */
  getCount(): number { return activeDrawers.length; }

  /** Get the topmost drawer */
  getTop(): DrawerInstance | undefined { return activeDrawers[activeDrawers.length - 1]; }

  /** Listen to drawer events */
  onEvent(listener: (drawer: DrawerInstance, action: "open" | "close") => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Clean up everything */
  destroy(): void {
    this.closeAll();
    this.container?.remove();
    this.container = null;
  }

  // --- Internal ---

  private initContainer(): void {
    this.container = document.createElement("div");
    this.container.id = "drawer-manager-root";
    document.body.appendChild(this.container);

    const style = document.createElement("style");
    style.textContent = `
      .dm-backdrop {
        position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 10499;
        display: flex; opacity: 0; transition: opacity 0.25s ease;
        pointer-events: none;
      }
      .dm-backdrop.dm-visible { opacity: 1; pointer-events: auto; }
      .dm-drawer {
        background: #fff; display: flex; flex-direction: column;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
        overflow: hidden; flex-shrink: 0;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    opacity 0.25s ease;
      }
      /* Positions */
      .dm-drawer.dm-left   { position: fixed; top:0; bottom:0; left:0;
        transform: translateX(-100%); height:100vh; }
      .dm-drawer.dm-right  { position: fixed; top:0; bottom:0; right:0;
        transform: translateX(100%); height:100vh; }
      .dm-drawer.dm-bottom { position: fixed; left:0; right:0; bottom:0;
        transform: translateY(100%); width:100vw; }
      .dm-drawer.dm-top    { position: fixed; left:0; right:0; top:0;
        transform: translateY(-100%); width:100vw; }
      .dm-drawer.dm-visible { transform: none; }
      /* Sizes (left/right) */
      .dm-drawer.dm-left.dm-xs, .dm-drawer.dm-right.dm-xs { width: 280px; }
      .dm-drawer.dm-left.dm-sm, .dm-drawer.dm-right.dm-sm { width: 360px; }
      .dm-drawer.dm-left.dm-md, .dm-drawer.dm-right.dm-md { width: 480px; }
      .dm-drawer.dm-left.dm-lg, .dm-drawer.dm-right.dm-lg { width: 640px; }
      .dm-drawer.dm-left.dm-xl, .dm-drawer.dm-right.dm-xl { width: 800px; }
      .dm-drawer.dm-left.dm-full, .dm-drawer.dm-right.dm-full { width: 100vw; max-width: 100%; }
      /* Sizes (top/bottom) */
      .dm-drawer.dm-bottom.dm-xs, .dm-drawer.dm-top.dm-xs { height: 200px; }
      .dm-drawer.dm-bottom.dm-sm, .dm-drawer.dm-top.dm-sm { height: 300px; }
      .dm-drawer.dm-bottom.dm-md, .dm-drawer.dm-top.dm-md { height: 450px; }
      .dm-drawer.dm-bottom.dm-lg, .dm-drawer.dm-top.dm-lg { height: 600px; }
      .dm-drawer.dm-bottom.dm-xl, .dm-drawer.dm-top.dm-xl { height: 80vh; }
      .dm-drawer.dm-bottom.dm-full, .dm-drawer.dm-top.dm-full { height: 100vh; max-height: 100%; }
      /* Header */
      .dm-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 20px 12px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
      }
      .dm-title { font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0; }
      .dm-close-btn {
        width: 30px; height: 30px; border: none; background: transparent;
        border-radius: 6px; cursor: pointer; color: #999; font-size: 18px;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
      }
      .dm-close-btn:hover { background: #f0f0f0; color: #333; }
      /* Body */
      .dm-body {
        flex: 1; overflow-y: auto; padding: 16px 20px;
        font-size: 14px; line-height: 1.6; color: #444; min-height: 40px;
      }
      /* Footer */
      .dm-footer {
        display: flex; align-items: center; justify-content: flex-end;
        gap: 10px; padding: 12px 20px; border-top: 1px solid #f0f0f0; flex-shrink: 0;
      }
      .dm-btn {
        padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 500;
        cursor: pointer; border: 1px solid transparent; transition: all 0.15s;
        display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
      }
      .dm-btn:hover:not(:disabled) { opacity: 0.88; }
      .dm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .dm-btn-primary { background: #007aff; color: #fff; }
      .dm-btn-secondary { background: #f0f0f0; color: #333; }
      .dm-btn-danger { background: #ff3b30; color: #fff; }
      .dm-btn-ghost { background: transparent; color: #007aff; border-color: #007aff; }
      .dm-btn-loading::after {
        content: ""; width: 14px; height: 14px; border: 2px solid transparent;
        border-top-color: currentColor; border-radius: 50%;
        animation: dm-spin 0.6s linear infinite; margin-left: 4px;
      }
      @keyframes dm-spin { to { transform: rotate(360deg); } }
      /* Resize handle */
      .dm-resize-handle {
        position: absolute; background: transparent; z-index: 10;
      }
      .dm-left .dm-resize-handle, .dm-right .dm-resize-handle {
        top: 0; bottom: 0; width: 6px; cursor: ew-resize;
      }
      .dm-left .dm-resize-handle { right: -3px; }
      .dm-right .dm-resize-handle { left: -3px; }
      .dm-top .dm-resize-handle, .dm-bottom .dm-resize-handle {
        left: 0; right: 0; height: 6px; cursor: ns-resize;
      }
      .dm-top .dm-resize-handle { bottom: -3px; }
      .dm-bottom .dm-resize-handle { top: -3px; }
    `;
    this.container.appendChild(style);
  }

  private createDrawer(id: string, opts: Required<DrawerOptions> & DrawerOptions): DrawerInstance {
    if (!this.container!) throw new Error("Drawer container not initialized");

    const zIndex = ++globalZIndex;

    // Backdrop
    const backdrop = document.createElement("div");
    backdrop.className = "dm-backdrop";
    backdrop.style.zIndex = String(zIndex - 1);
    if (opts.backdropClassName) backdrop.className += ` ${opts.backdropClassName}`;

    // Resolve size
    let resolvedSize: number | undefined;
    if (typeof opts.size === "number") {
      resolvedSize = opts.size;
    } else if (SIZE_MAP[opts.size as string]) {
      // Use CSS class
    }

    // Drawer element
    const pos = opts.position ?? "right";
    const sizeClass = typeof opts.size === "number" ? "" : ` dm-${opts.size ?? "md"}`;
    const drawer = document.createElement("div");
    drawer.className = `dm-drawer dm-${pos}${sizeClass}${opts.animation !== "none" ? "" : ""}${opts.className ? ` ${opts.className}` : ""}`;
    drawer.style.zIndex = String(zIndex);
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");

    // Apply custom size
    if (resolvedSize) {
      if (pos === "left" || pos === "right") {
        drawer.style.width = `${resolvedSize}px`;
      } else {
        drawer.style.height = `${resolvedSize}px`;
      }
    }

    // Build header
    if (opts.title || opts.closable !== false) {
      const header = document.createElement("div");
      header.className = "dm-header";

      if (opts.title) {
        const titleEl = document.createElement("h2");
        titleEl.id = `${id}-title`;
        titleEl.className = "dm-title";
        titleEl.textContent = opts.title;
        header.appendChild(titleEl);
      }

      if (opts.closable !== false) {
        const closeBtn = document.createElement("button");
        closeBtn.className = "dm-close-btn";
        closeBtn.innerHTML = "&times;";
        closeBtn.addEventListener("click", () => instance.close("close"));
        header.appendChild(closeBtn);
      }

      drawer.appendChild(header);
    }

    // Body
    const body = document.createElement("div");
    body.className = "dm-body";
    if (typeof opts.content === "string") {
      body.innerHTML = opts.content;
    } else {
      body.appendChild(opts.content);
    }
    drawer.appendChild(body);

    // Footer
    if (opts.footer) {
      const footer = document.createElement("div");
      footer.className = "dm-footer";
      this.renderFooter(footer, opts.footer);
      drawer.appendChild(footer);
    }

    // Resize handle
    if (opts.resizable) {
      const handle = document.createElement("div");
      handle.className = "dm-resize-handle";
      drawer.appendChild(handle);

      let isResizing = false;
      let startX = 0;
      let startY = 0;
      let startSize = 0;

      const onMove = (e: MouseEvent) => {
        if (!isResizing) return;
        e.preventDefault();

        const min = opts.minSize ?? 200;
        const max = opts.maxSize ?? (pos === "left" || pos === "right" ? window.innerWidth : window.innerHeight);

        if (pos === "left") {
          const newSize = startSize + e.clientX - startX;
          drawer.style.width = `${Math.min(max, Math.max(min, newSize))}px`;
        } else if (pos === "right") {
          const newSize = startSize - e.clientX + startX;
          drawer.style.width = `${Math.min(max, Math.max(min, newSize))}px`;
        } else if (pos === "bottom") {
          const newSize = startSize - e.clientY + startY;
          drawer.style.height = `${Math.min(max, Math.max(min, newSize))}px`;
        } else if (pos === "top") {
          const newSize = startSize + e.clientY - startY;
          drawer.style.height = `${Math.min(max, Math.max(min, newSize))}px`;
        }
      };

      const onUp = () => {
        isResizing = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = drawer.getBoundingClientRect();
        startSize = pos === "left" || pos === "right" ? rect.width : rect.height;
        document.body.style.cursor = pos === "left" || pos === "right" ? "ew-resize" : "ns-resize";
        document.body.style.userSelect = "none";
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    }

    // Assemble
    backdrop.appendChild(drawer);
    this.container!.appendChild(backdrop);

    // Event handlers
    if (opts.closeOnBackdrop !== false) {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) instance.close("backdrop");
      });
    }

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && opts.closeOnEscape !== false) {
        if (activeDrawers[activeDrawers.length - 1] === instance) {
          instance.close("escape");
        }
      }
    };
    document.addEventListener("keydown", keyHandler);

    const instance: DrawerInstance = {
      id,
      element: drawer,
      backdrop,
      options: opts,
      isOpen: () => backdrop.classList.contains("dm-visible"),
      getZIndex: () => zIndex,

      getCurrentSize: () => {
        const rect = drawer.getBoundingClientRect();
        return pos === "left" || pos === "right" ? rect.width : rect.height;
      },

      resize(size: number) {
        if (pos === "left" || pos === "right") {
          drawer.style.width = `${size}px`;
        } else {
          drawer.style.height = `${size}px`;
        }
      },

      close: (reason = "close") => {
        if (!instance.isOpen()) return;

        drawer.classList.remove("dm-visible");
        backdrop.classList.remove("dm-visible");

        setTimeout(() => {
          backdrop.remove();
          const idx = activeDrawers.indexOf(instance);
          if (idx >= 0) activeDrawers.splice(idx, 1);
          document.removeEventListener("keydown", keyHandler);

          if (opts.destroyOnClose) {
            // Already removed
          }

          this.restoreBodyScroll();
          this.returnFocus();

          opts.onClose?.(instance, reason);
          this.listeners.forEach((l) => l(instance, "close"));
        }, 300);
      },

      updateContent: (content: string | HTMLElement) => {
        const bodyEl = drawer.querySelector(".dm-body");
        if (bodyEl) {
          if (typeof content === "string") bodyEl.innerHTML = content;
          else { bodyEl.innerHTML = ""; bodyEl.appendChild(content); }
        }
      },

      updateTitle: (title: string) => {
        const titleEl = drawer.querySelector(".dm-title");
        if (titleEl) titleEl.textContent = title;
        drawer.setAttribute("aria-label", title);
      },

      updateFooter: (footer) => {
        const footerEl = drawer.querySelector(".dm-footer");
        if (footerEl) footerEl.remove();
        if (footer) {
          const newFooter = document.createElement("div");
          newFooter.className = "dm-footer";
          this.renderFooter(newFooter, footer);
          drawer.appendChild(newFooter);
        }
      },

      setActionLoading: (label: string, loading: boolean) => {
        const buttons = drawer.querySelectorAll(".dm-btn");
        for (const btn of buttons) {
          if (btn.textContent?.includes(label)) {
            btn.classList.toggle("dm-btn-loading", loading);
            btn.disabled = loading;
          }
        }
      },
    };

    // Focus trap
    if (opts.trapFocus !== false) {
      this.setupFocusTrap(instance);
    }

    return instance;
  }

  private renderFooter(container: HTMLElement, footer: string | HTMLElement | DrawerAction[]): void {
    if (typeof footer === "string") {
      container.innerHTML = footer;
    } else if (footer instanceof HTMLElement) {
      container.appendChild(footer);
    } else if (Array.isArray(footer)) {
      for (const action of footer) {
        const btn = document.createElement("button");
        btn.className = `dm-btn dm-btn-${action.variant ?? "secondary"}`;
        btn.textContent = action.label;
        btn.disabled = action.disabled ?? false;
        if (action.loading) btn.classList.add("dm-btn-loading");

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
    let base = globalZIndex - activeDrawers.length + 1;
    for (const d of activeDrawers) {
      d.element.style.zIndex = String(++base);
      d.backdrop.style.zIndex = String(base - 1);
    }
  }

  private lockBodyScroll(): void {
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollBarWidth}px`;
  }

  private restoreBodyScroll(): void {
    if (activeDrawers.length === 0) {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
  }

  private returnFocus(): void {
    if (activeDrawers.length === 0 && previouslyFocused && "focus" in previouslyFocused) {
      (previouslyFocused as HTMLElement).focus();
      previouslyFocused = null;
    }
  }

  private setupFocusTrap(instance: DrawerInstance): void {
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
}

/** Convenience: create a drawer manager instance */
export function createDrawerManager(options?: Partial<DrawerOptions>): DrawerManager {
  return new DrawerManager(options);
}
