/**
 * Overlay Manager: Modal/dialog/overlay system with stack management, focus trapping,
 * escape-to-close, backdrop handling, animation orchestration, portal rendering,
 * z-index management, nested modal support, and accessibility (ARIA).
 */

// --- Types ---

export type OverlayId = string;
export type OverlayRole = "dialog" | "alertdialog" | "menu" | "listbox" | "tooltip" | "drawer" | "sheet";

export interface OverlayOptions {
  /** Unique identifier */
  id?: OverlayId;
  /** ARIA role */
  role?: OverlayRole;
  /** Content element or HTML string */
  content: HTMLElement | string;
  /** Trigger element that opened this overlay */
  triggerElement?: HTMLElement;
  /** Close on Escape key (default: true) */
  closeOnEscape?: boolean;
  /** Close on backdrop click (default: true for dialogs) */
  closeOnBackdropClick?: boolean;
  /** Show backdrop overlay (default: true) */
  showBackdrop?: boolean;
  /** Backdrop click closes only if not clicking inside content */
  backdropClosesContent?: boolean;
  /** Custom backdrop style */
  backdropStyle?: Partial<CSSStyleDeclaration>;
  /** Animation type */
  animation?: "fade" | "slide-up" | "slide-down" | "slide-left" | "slide-right" | "scale" | "none";
  /** Animation duration in ms (default: 200) */
  animationDuration?: number;
  /** Portal target (default: document.body) */
  portalTarget?: HTMLElement;
  /** CSS class for the container */
  className?: string;
  /** Z-index (auto-managed by stack) */
  zIndex?: number;
  /** Focus trap mode: "content" (trap inside), "return" (return to trigger on close) */
  focusTrap?: "content" | "return" | "none";
  /** Initial focus selector within content */
  initialFocus?: string;
  /** Scroll lock (default: true for dialogs) */
  scrollLock?: boolean;
  /** Called when overlay opens */
  onOpen?: (overlay: OverlayInstance) => void;
  /** Called when overlay closes */
  onClose?: (overlay: OverlayInstance) => void;
  /** Called before close — return false to prevent */
  shouldClose?: () => boolean | Promise<boolean>;
  /** Centered position (default: true for dialogs) */
  centered?: boolean;
  /** Full screen */
  fullscreen?: boolean;
  /** Size constraints */
  width?: string | number;
  height?: string | number;
  /** Maximum width/height */
  maxWidth?: string | number;
  maxHeight?: string | number;
}

export interface OverlayInstance {
  id: OverlayId;
  element: HTMLElement;
  backdropElement: HTMLElement | null;
  isOpen: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  destroy(): void;
  updateContent(content: HTMLElement | string): void;
  setPosition(options: { top?: number; left?: number; right?: number; bottom?: number }): void;
}

export interface OverlayStackEntry {
  instance: OverlayInstance;
  options: Required<Pick<OverlayOptions, "closeOnEscape" | "closeOnBackdropClick" | "scrollLock">> & Omit<OverlayOptions, "closeOnEscape" | "closeOnBackdropClick" | "scrollLock">;
  previousActiveElement: HTMLElement | null;
  baseZIndex: number;
}

// --- Z-Index Manager ---

class ZIndexManager {
  private current = 1000;
  private reserved = new Set<number>();

  allocate(): number {
    this.current += 10;
    return this.current;
  }

  release(zIndex: number): void { this.reserved.delete(zIndex); }

  reserve(zIndex: number): void { this.reserved.add(zIndex); }
}

// --- Focus Trap ---

class FocusTrap {
  private container: HTMLElement;
  private handlers: Array<() => void> = [];

  constructor(container: HTMLElement) { this.container = container; }

  activate(initialFocus?: string): void {
    // Set initial focus
    if (initialFocus) {
      const el = this.container.querySelector(initialFocus) as HTMLElement | null;
      el?.focus();
    } else {
      this.focusFirst();
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      e.preventDefault();

      const focusable = this.getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) last.focus();
        else (focusable[focusable.indexOf(document.activeElement as HTMLElement) - 1] ?? first).focus();
      } else {
        if (document.activeElement === last) first.focus();
        else (focusable[focusable.indexOf(document.activeElement as HTMLElement) + 1] ?? last).focus();
      }
    };

    this.container.addEventListener("keydown", handler);
    this.handlers.push(() => this.container.removeEventListener("keydown", handler));
  }

  deactivate(): void {
    for (const h of this.handlers) h();
    this.handlers = [];
  }

  focusFirst(): void {
    this.getFocusableElements()[0]?.focus();
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(this.container.querySelectorAll(selector)) as HTMLElement[];
  }
}

// --- Scroll Lock ---

class ScrollLock {
  private lockedCount = 0;
  private overflowStyle = "";
  private paddingRight = "";

  lock(): void {
    if (this.lockedCount++ > 0) return;
    const body = document.body;
    this.overflowStyle = body.style.overflow;
    this.paddingRight = body.style.paddingRight;
    body.style.overflow = "hidden";
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
  }

  unlock(): void {
    if (--this.lockedCount > 0) return;
    document.body.style.overflow = this.overflowStyle;
    document.body.style.paddingRight = this.paddingRight;
  }
}

// --- Overlay Manager ---

export class OverlayManager {
  private stack: OverlayStackEntry[] = [];
  private zIndexManager = new ZIndexManager();
  private scrollLock = new ScrollLock();
  private globalListeners = new Map<string, (e: Event) => void>();
  private destroyed = false;

  // --- Public API ---

  /**
   * Create and open an overlay.
   */
  async open(options: OverlayOptions): Promise<OverlayInstance> {
    if (this.destroyed) throw new Error("OverlayManager is destroyed");

    const id = options.id ?? `overlay_${Date.now().toString(36)}`;
    const zIndex = options.zIndex ?? this.zIndexManager.allocate();

    // Create elements
    const portal = options.portalTarget ?? document.body;
    const backdropEl = options.showBackdrop !== false ? this.createBackdrop(options) : null;

    const container = document.createElement("div");
    container.id = id;
    container.className = `om-overlay ${options.animation ?? "fade"} ${options.className ?? ""}`;
    container.setAttribute("role", options.role ?? "dialog");
    container.setAttribute("aria-modal", "true");
    container.style.cssText = `
      position: fixed; inset: 0; display: flex;
      z-index: ${zIndex}; pointer-events: none;
      ${options.centered !== false ? "align-items: center; justify-content: center;" : ""}
      ${options.fullscreen ? "padding: 0;" : "padding: 16px;"}
    `;

    const contentEl = typeof options.content === "string"
      ? this.parseHtml(options.content)
      : options.content;

    contentEl.classList.add("om-overlay-content");
    contentEl.style.pointerEvents = "auto";
    if (options.width) contentEl.style.width = typeof options.width === "number" ? `${options.width}px` : options.width;
    if (options.height) contentEl.style.height = typeof options.height === "number" ? `${options.height}px` : options.height;
    if (options.maxWidth) contentEl.style.maxWidth = typeof options.maxWidth === "number" ? `${options.maxWidth}px` : options.maxWidth;
    if (options.maxHeight) contentEl.style.maxHeight = typeof options.maxHeight === "number" ? `${options.maxHeight}px` : options.maxHeight;

    container.appendChild(contentEl);

    if (backdropEl) portal.appendChild(backdropEl);
    portal.appendChild(container);

    // Build instance
    const entry: OverlayStackEntry = {
      instance: {} as OverlayInstance,
      options: {
        ...options,
        closeOnEscape: options.closeOnEscape ?? true,
        closeOnBackdropClick: options.closeOnBackdropClick ?? (options.role === "dialog" || !options.role),
        scrollLock: options.scrollLock ?? (options.role === "dialog" || options.role === "alertdialog"),
      },
      previousActiveElement: document.activeElement as HTMLElement,
      baseZIndex: zIndex,
    };

    const focusTrap = new FocusTrap(contentEl);

    const instance: OverlayInstance = {
      id,
      element: container,
      backdropElement: backdropEl,
      isOpen: false,

      async open() {
        // Apply scroll lock
        if (entry.options.scrollLock) this.scrollLock.lock();

        // Activate focus trap
        if (entry.options.focusTrap !== "none") {
          focusTrap.activate(entry.options.initialFocus);
        }

        // Animate in
        await this.animateIn(container, entry.options.animation ?? "fade", entry.options.animationDuration ?? 200);

        this.isOpen = true;
        entry.options.onOpen?.(instance);
      },

      async close() {
        // Check shouldClose
        if (entry.options.shouldClose) {
          const canClose = await entry.options.shouldClose();
          if (!canClose) return;
        }

        // Animate out
        await this.animateOut(container, entry.options.animation ?? "fade", entry.options.animationDuration ?? 200);

        // Cleanup
        focusTrap.deactivate();

        // Return focus
        if (entry.options.focusTrap === "return" && entry.previousActiveElement) {
          entry.previousActiveElement.focus();
        }

        // Release scroll lock
        if (entry.options.scrollLock) this.scrollLock.unlock();

        // Remove from DOM
        container.remove();
        backdropEl?.remove();

        // Release z-index
        this.zIndexManager.release(zIndex);

        // Remove from stack
        const idx = this.stack.findIndex((e) => e.instance.id === id);
        if (idx >= 0) this.stack.splice(idx, 1);

        this.isOpen = false;
        entry.options.onClose?.(instance);
      },

      destroy() {
        container.remove();
        backdropEl?.remove();
        this.zIndexManager.release(zIndex);
        const idx = this.stack.findIndex((e) => e.instance.id === id);
        if (idx >= 0) this.stack.splice(idx, 1);
      },

      updateContent(content: HTMLElement | string) {
        const newContent = typeof content === "string" ? this.parseHtml(content) : content;
        newContent.classList.add("om-overlay-content");
        newContent.style.pointerEvents = "auto";
        contentEl.replaceWith(newContent);
      },

      setPosition(opts) {
        if (opts.top !== undefined) container.style.alignItems = "flex-start";
        if (opts.left !== undefined) contentEl.style.marginLeft = `${opts.left}px`;
        Object.assign(contentEl.style, opts);
      },
    };

    entry.instance = instance;
    this.stack.push(entry);

    // Bind events
    this.bindEvents(instance, entry);

    // Open it
    await instance.open();

    return instance;
  }

  /**
   * Get the topmost (active) overlay.
   */
  getTopmost(): OverlayInstance | undefined {
    return this.stack[this.stack.length - 1]?.instance;
  }

  /**
   * Get all active overlays.
   */
  getAll(): OverlayInstance[] { return this.stack.map((e) => e.instance); }

  /**
   * Close all overlays (from top to bottom).
   */
  async closeAll(): Promise<void> {
    while (this.stack.length > 0) {
      const top = this.stack[this.stack.length - 1]?.instance;
      if (top?.isOpen) await top.close();
    }
  }

  /**
   * Close the topmost overlay.
   */
  async closeTopmost(): Promise<void> {
    const top = this.getTopmost();
    if (top?.isOpen) await top.close();
  }

  /** Check if any overlay is open */
  hasOpenOverlay(): boolean { return this.stack.some((e) => e.instance.isOpen); }

  /** Get stack depth */
  getDepth(): number { return this.stack.length; }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const entry of [...this.stack]) {
      entry.instance.element.remove();
      entry.instance.backdropElement?.remove();
    }
    this.stack = [];
    this.globalListeners.clear();
  }

  // --- Internal ---

  private createBackdrop(options: OverlayOptions): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "om-backdrop";
    el.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      z-index: -1; transition: opacity ${options.animationDuration ?? 200}ms ease;
    `;
    if (options.backdropStyle) Object.assign(el.style, options.backdropStyle);
    return el;
  }

  private parseHtml(html: string): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    return wrapper.firstElementChild as HTMLElement ?? wrapper;
  }

  private bindEvents(instance: OverlayInstance, entry: OverlayStackEntry): void {
    // Escape key
    if (entry.options.closeOnEscape) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape" && instance.isOpen && this.getTopmost()?.id === instance.id) {
          instance.close();
        }
      };
      document.addEventListener("keydown", handler);
      this.globalListeners.set(`${instance.id}:escape`, handler as unknown as (e: Event) => void);
    }

    // Backdrop click
    if (entry.options.closeOnBackdropClick && instance.backdropElement) {
      const handler = (_e: MouseEvent) => {
        if (instance.isOpen && this.getTopmost()?.id === instance.id) {
          instance.close();
        }
      };
      instance.backdropElement.addEventListener("click", handler);
      this.globalListeners.set(`${instance.id}:backdrop`, handler as unknown as (e: Event) => void);
    }
  }

  private animateIn(el: HTMLElement, animation: string, duration: number): Promise<void> {
    if (animation === "none") {
      el.style.opacity = "1";
      el.style.transform = "none";
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      el.style.opacity = "0";
      switch (animation) {
        case "slide-up": el.style.transform = "translateY(30px)"; break;
        case "slide-down": el.style.transform = "translateY(-30px)"; break;
        case "slide-left": el.style.transform = "translateX(30px)"; break;
        case "slide-right": el.style.transform = "translateX(-30px)"; break;
        case "scale": el.style.transform = "scale(0.95)"; break;
      }

      requestAnimationFrame(() => {
        el.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
        el.style.opacity = "1";
        el.style.transform = "none";
        setTimeout(resolve, duration);
      });
    });
  }

  private animateOut(el: HTMLElement, animation: string, duration: number): Promise<void> {
    if (animation === "none") return Promise.resolve();

    return new Promise((resolve) => {
      el.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
      el.style.opacity = "0";
      switch (animation) {
        case "slide-up": el.style.transform = "translateY(30px)"; break;
        case "slide-down": el.style.transform = "translateY(-30px)"; break;
        case "slide-left": el.style.transform = "translateX(30px)"; break;
        case "slide-right": el.style.transform = "translateX(-30px)"; break;
        case "scale": el.style.transform = "scale(0.95)"; break;
      }
      setTimeout(resolve, duration);
    });
  }
}
