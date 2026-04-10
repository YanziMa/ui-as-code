/**
 * Modal Manager: Full-featured modal/dialog management system with stacking,
 * focus trapping, backdrop handling, animations, keyboard navigation,
 * size variants, confirm dialogs, async operations, and accessibility.
 */

// --- Types ---

export type ModalSize = "xs" | "sm" | "md" | "lg" | "xl" | "full" | "auto";
export type ModalAnimation = "fade" | "slide-up" | "slide-down" | "scale" | "flip" | "none";

export interface ModalOptions {
  /** Modal title */
  title?: string;
  /** Modal body content (HTML string or element) */
  content: string | HTMLElement;
  /** Size preset */
  size?: ModalSize;
  /** Animation type */
  animation?: ModalAnimation;
  /** Show close button (default: true) */
  closable?: boolean;
  /** Click backdrop to close (default: true) */
  closeOnBackdrop?: boolean;
  /** Press Escape to close (default: true) */
  closeOnEscape?: boolean;
  /** Custom CSS class for the modal container */
  className?: string;
  /** Custom CSS for the backdrop */
  backdropClassName?: string;
  /** Footer content or action buttons */
  footer?: string | HTMLElement | ModalAction[];
  /** z-index override */
  zIndex?: number;
  /** Callback when modal opens */
  onOpen?: (modal: ModalInstance) => void;
  /** Callback when modal closes */
  onClose?: (modal: ModalInstance, reason: "close" | "escape" | "backdrop" | "action") => void;
  /** Prevent body scroll while open (default: true) */
  lockScroll?: boolean;
  /** Focus trap mode (default: true) */
  trapFocus?: boolean;
  /** Return focus to triggering element on close (default: true) */
  returnFocus?: boolean;
  /** Center vertically (default: true) */
  centered?: boolean;
  /** Destroy on close vs hide (default: false = reuse) */
  destroyOnClose?: boolean;
}

export interface ModalAction {
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  /** Auto-close modal after click (default: true for primary/danger) */
  autoClose?: boolean;
  action: () => void | Promise<void>;
  /** Disable button */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
}

export interface ModalInstance {
  id: string;
  element: HTMLDivElement;
  backdrop: HTMLDivElement;
  options: ModalOptions;
  /** Programmatically close the modal */
  close: (reason?: "close" | "escape" | "backdrop" | "action") => void;
  /** Update modal content */
  updateContent: (content: string | HTMLElement) => void;
  /** Update modal title */
  updateTitle: (title: string) => void;
  /** Update footer actions */
  updateFooter: (footer?: string | HTMLElement | ModalAction[]) => void;
  /** Set loading state on an action button */
  setActionLoading: (label: string, loading: boolean) => void;
  /** Check if modal is currently visible */
  isOpen: () => boolean;
  /** Get current z-index */
  getZIndex: () => number;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  /** Danger mode shows red confirm button */
  danger?: boolean;
}

// --- Global State ---

let globalZIndex = 1040;
const activeModals: ModalInstance[] = [];
let previouslyFocused: Element | null = null;

// --- Modal Manager ---

export class ModalManager {
  private container: HTMLDivElement | null = null;
  private defaultOptions: Partial<ModalOptions>;
  private listeners = new Set<(modal: ModalInstance, action: "open" | "close") => void>();

  constructor(defaultOptions: Partial<ModalOptions> = {}) {
    this.defaultOptions = defaultOptions;
    if (typeof document !== "undefined") this.initContainer();
  }

  /** Open a modal with given options */
  open(options: ModalOptions): ModalInstance {
    const merged = { ...this.defaultOptions, ...options };
    const id = `modal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const instance = this.createModal(id, merged);

    activeModals.push(instance);
    this.updateZIndices();

    if (merged.lockScroll !== false) this.lockBodyScroll();
    if (merged.trapFocus !== false) this.setupFocusTrap(instance);
    if (merged.returnFocus !== false && !previouslyFocused) {
      previouslyFocused = document.activeElement;
    }

    // Animate in
    requestAnimationFrame(() => {
      instance.backdrop.classList.add("mm-visible");
      instance.element.classList.add("mm-visible");
    });

    merged.onOpen?.(instance);
    this.listeners.forEach((l) => l(instance, "open"));

    return instance;
  }

  /** Quick confirmation dialog */
  async confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      const danger = options.danger ?? options.variant === "danger";
      this.open({
        title: options.title ?? (danger ? "Confirm Delete" : "Confirm"),
        content: `<p style="margin:0;color:#666;font-size:14px;line-height:1.6">${escapeHtml(options.message)}</p>`,
        size: "sm",
        closable: false,
        closeOnBackdrop: false,
        closeOnEscape: true,
        footer: [
          { label: options.cancelText ?? "Cancel", variant: "secondary", action: () => resolve(false), autoClose: true },
          {
            label: options.confirmText ?? (danger ? "Delete" : "Confirm"),
            variant: danger ? "danger" : "primary",
            action: () => resolve(true),
            autoClose: true,
          },
        ],
        onClose: (_m, _reason) => resolve(false),
      });
    });
  }

  /** Quick alert dialog */
  alert(message: string, title?: string): Promise<void> {
    return new Promise((resolve) => {
      this.open({
        title: title ?? "Notice",
        content: `<p style="margin:0;color:#666;font-size:14px;line-height:1.6">${escapeHtml(message)}</p>`,
        size: "sm",
        footer: [{ label: "OK", variant: "primary", action: () => resolve(), autoClose: true }],
      });
    });
  }

  /** Prompt dialog with text input */
  async prompt(message: string, defaultValue = "", title?: string): Promise<string | null> {
    return new Promise((resolve) => {
      const inputId = `prompt-input-${Date.now()}`;
      this.open({
        title: title ?? "Input",
        content: `
          <p style="margin:0 0 12px;color:#666;font-size:14px">${escapeHtml(message)}</p>
          <input id="${inputId}" type="text" value="${escapeAttr(defaultValue)}"
            style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;outline:none"
            autofocus />
        `,
        size: "sm",
        closable: true,
        footer: [
          { label: "Cancel", variant: "secondary", action: () => resolve(null), autoClose: true },
          {
            label: "OK", variant: "primary", action: () => {
              const input = document.getElementById(inputId) as HTMLInputElement;
              resolve(input?.value ?? defaultValue);
            }, autoClose: true,
          },
        ],
        onClose: () => resolve(null),
      });
    });
  }

  /** Close the topmost modal */
  closeTop(reason: "close" | "escape" | "backdrop" | "action" = "close"): boolean {
    const top = activeModals[activeModals.length - 1];
    if (top) { top.close(reason); return true; }
    return false;
  }

  /** Close all modals */
  closeAll(): void {
    while (activeModals.length > 0) {
      const top = activeModals[activeModals.length - 1];
      top?.close("close");
    }
  }

  /** Get number of open modals */
  getCount(): number { return activeModals.length; }

  /** Get the topmost modal */
  getTop(): ModalInstance | undefined { return activeModals[activeModals.length - 1]; }

  /** Listen to modal events */
  onEvent(listener: (modal: ModalInstance, action: "open" | "close") => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Clean up all modals and remove container */
  destroy(): void {
    this.closeAll();
    this.container?.remove();
    this.container = null;
  }

  // --- Internal ---

  private initContainer(): void {
    this.container = document.createElement("div");
    this.container.id = "modal-manager-root";
    document.body.appendChild(this.container);

    const style = document.createElement("style");
    style.textContent = `
      .mm-backdrop {
        position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1039;
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity 0.2s ease; pointer-events: none;
      }
      .mm-backdrop.mm-visible { opacity: 1; pointer-events: auto; }
      .mm-modal {
        background: #fff; border-radius: 16px; box-shadow: 0 25px 80px rgba(0,0,0,0.25);
        display: flex; flex-direction: column; max-height: calc(100vh - 48px);
        max-width: 520px; width: 100%; margin: 24px; overflow: hidden;
        transform: translateY(20px) scale(0.97); opacity: 0;
        transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
      }
      .mm-modal.mm-visible { transform: translateY(0) scale(1); opacity: 1; }
      /* Sizes */
      .mm-modal.mm-xs { max-width: 320px; } .mm-modal.mm-sm { max-width: 400px; }
      .mm-modal.mm-md { max-width: 520px; } .mm-modal.mm-lg { max-width: 720px; }
      .mm-modal.mm-xl { max-width: 960px; } .mm-modal.mm-full { max-width: calc(100vw - 48px); max-height: calc(100vh - 48px); }
      .mm-modal.mm-auto { max-width: fit-content; }
      /* Header */
      .mm-header { display: flex; align-items: center; justify-content: space-between;
        padding: 18px 24px 14px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
      .mm-title { font-size: 17px; font-weight: 600; color: #1a1a1a; margin: 0; }
      .mm-close-btn { width: 32px; height: 32px; border: none; background: transparent;
        border-radius: 8px; cursor: pointer; color: #999; font-size: 20px; display: flex;
        align-items: center; justify-content: center; transition: all 0.15s; }
      .mm-close-btn:hover { background: #f0f0f0; color: #333; }
      /* Body */
      .mm-body { padding: 20px 24px; overflow-y: auto; flex: 1; min-height: 40px; font-size: 14px; line-height: 1.6; color: #444; }
      /* Footer */
      .mm-footer { display: flex; align-items: center; justify-content: flex-end;
        gap: 10px; padding: 14px 24px; border-top: 1px solid #f0f0f0; flex-shrink: 0; }
      .mm-btn {
        padding: 8px 20px; border-radius: 8px; font-size: 14px; font-weight: 500;
        cursor: pointer; border: 1px solid transparent; transition: all 0.15s;
        display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
      }
      .mm-btn:hover:not(:disabled) { opacity: 0.88; }
      .mm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .mm-btn-primary { background: #007aff; color: #fff; }
      .mm-btn-secondary { background: #f0f0f0; color: #333; }
      .mm-btn-danger { background: #ff3b30; color: #fff; }
      .mm-btn-ghost { background: transparent; color: #007aff; border-color: #007aff; }
      .mm-btn-loading::after { content: ""; width: 14px; height: 14px; border: 2px solid transparent;
        border-top-color: currentColor; border-radius: 50%; animation: mm-spin 0.6s linear infinite; margin-left: 4px; }
      @keyframes mm-spin { to { transform: rotate(360deg); } }
      /* Animations */
      .mm-modal.mm-anim-slide-up { transform: translateY(30px); }
      .mm-modal.mm-anim-slide-up.mm-visible { transform: translateY(0); }
      .mm-modal.mm-anim-slide-down { transform: translateY(-30px); }
      .mm-modal.mm-anim-slide-down.mm-visible { transform: translateY(0); }
      .mm-modal.mm-anim-scale { transform: scale(0.9); }
      .mm-modal.mm-anim-scale.mm-visible { transform: scale(1); }
      .mm-modal.mm-anim-flip { transform: perspective(600px) rotateX(10deg); }
      .mm-modal.mm-anim-flip.mm-visible { transform: perspective(600px) rotateX(0); }
    `;
    this.container.appendChild(style);
  }

  private createModal(id: string, opts: Required<ModalOptions> & ModalOptions): ModalInstance {
    if (!this.container!) throw new Error("Modal container not initialized");

    const zIndex = ++globalZIndex;

    // Backdrop
    const backdrop = document.createElement("div");
    backdrop.className = "mm-backdrop";
    backdrop.style.zIndex = String(zIndex - 1);
    if (opts.backdropClassName) backdrop.className += ` ${opts.backdropClassName}`;

    // Modal element
    const modal = document.createElement("div");
    modal.className = `mm-modal mm-${opts.size ?? "md"}${opts.animation !== "none" ? ` mm-anim-${opts.animation ?? "fade"}` : ""}${opts.className ? ` ${opts.className}` : ""}`;
    modal.style.zIndex = String(zIndex);
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", `${id}-title`);
    if (opts.title) modal.setAttribute("aria-label", opts.title);

    // Build header
    if (opts.title || opts.closable !== false) {
      const header = document.createElement("div");
      header.className = "mm-header";
      if (opts.title) {
        const titleEl = document.createElement("h2");
        titleEl.id = `${id}-title`;
        titleEl.className = "mm-title";
        titleEl.textContent = opts.title;
        header.appendChild(titleEl);
      }
      if (opts.closable !== false) {
        const closeBtn = document.createElement("button");
        closeBtn.className = "mm-close-btn";
        closeBtn.innerHTML = "&times;";
        closeBtn.addEventListener("click", () => instance.close("close"));
        header.appendChild(closeBtn);
      }
      modal.appendChild(header);
    }

    // Body
    const body = document.createElement("div");
    body.className = "mm-body";
    if (typeof opts.content === "string") {
      body.innerHTML = opts.content;
    } else {
      body.appendChild(opts.content);
    }
    modal.appendChild(body);

    // Footer
    if (opts.footer) {
      const footer = document.createElement("div");
      footer.className = "mm-footer";
      this.renderFooter(footer, opts.footer);
      modal.appendChild(footer);
    }

    // Assemble
    backdrop.appendChild(modal);
    this.container!.appendChild(backdrop);

    // Event handlers
    if (opts.closeOnBackdrop !== false) {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) instance.close("backdrop");
      });
    }

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && opts.closeOnEscape !== false) {
        // Only close topmost
        if (activeModals[activeModals.length - 1] === instance) {
          instance.close("escape");
        }
      }
    };
    document.addEventListener("keydown", keyHandler);

    const instance: ModalInstance = {
      id,
      element: modal,
      backdrop,
      options: opts,
      isOpen: () => backdrop.classList.contains("mm-visible"),
      getZIndex: () => zIndex,

      close: (reason = "close") => {
        if (!instance.isOpen()) return;

        modal.classList.remove("mm-visible");
        backdrop.classList.remove("mm-visible");

        setTimeout(() => {
          backdrop.remove();
          const idx = activeModals.indexOf(instance);
          if (idx >= 0) activeModals.splice(idx, 1);
          document.removeEventListener("keydown", keyHandler);

          if (opts.destroyOnClose) {
            // Already removed
          }

          this.restoreBodyScroll();
          this.returnFocus();

          opts.onClose?.(instance, reason);
          this.listeners.forEach((l) => l(instance, "close"));
        }, 250);
      },

      updateContent: (content: string | HTMLElement) => {
        const bodyEl = modal.querySelector(".mm-body");
        if (bodyEl) {
          if (typeof content === "string") bodyEl.innerHTML = content;
          else { bodyEl.innerHTML = ""; bodyEl.appendChild(content); }
        }
      },

      updateTitle: (title: string) => {
        const titleEl = modal.querySelector(".mm-title");
        if (titleEl) titleEl.textContent = title;
        modal.setAttribute("aria-label", title);
      },

      updateFooter: (footer) => {
        const footerEl = modal.querySelector(".mm-footer");
        if (footerEl) {
          footerEl.remove();
        }
        if (footer) {
          const newFooter = document.createElement("div");
          newFooter.className = "mm-footer";
          this.renderFooter(newFooter, footer);
          modal.appendChild(newFooter);
        }
      },

      setActionLoading: (label: string, loading: boolean) => {
        const buttons = modal.querySelectorAll(".mm-btn");
        for (const btn of buttons) {
          if (btn.textContent?.includes(label)) {
            btn.classList.toggle("mm-btn-loading", loading);
            btn.disabled = loading;
          }
        }
      },
    };

    return instance;
  }

  private renderFooter(container: HTMLElement, footer: string | HTMLElement | ModalAction[]): void {
    if (typeof footer === "string") {
      container.innerHTML = footer;
    } else if (footer instanceof HTMLElement) {
      container.appendChild(footer);
    } else if (Array.isArray(footer)) {
      for (const action of footer) {
        const btn = document.createElement("button");
        btn.className = `mm-btn mm-btn-${action.variant ?? "secondary"}`;
        btn.textContent = action.label;
        btn.disabled = action.disabled ?? false;
        if (action.loading) btn.classList.add("mm-btn-loading");

        btn.addEventListener("click", async () => {
          if (action.autoClose !== false) {
            // Don't close yet — wait for action
          }
          await action.action();
          if (action.autoClose !== false) {
            const top = this.getTop();
            if (top) top.close("action");
          }
        });
        container.appendChild(btn);
      }
    }
  }

  private updateZIndices(): void {
    let base = globalZIndex - activeModals.length + 1;
    for (const m of activeModals) {
      m.element.style.zIndex = String(++base);
      m.backdrop.style.zIndex = String(base - 1);
    }
  }

  private lockBodyScroll(): void {
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollBarWidth}px`;
  }

  private restoreBodyScroll(): void {
    if (activeModals.length === 0) {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
  }

  private returnFocus(): void {
    if (activeModals.length === 0 && previouslyFocused && "focus" in previouslyFocused) {
      (previouslyFocused as HTMLElement).focus();
      previouslyFocused = null;
    }
  }

  private setupFocusTrap(instance: ModalInstance): void {
    const el = instance.element;
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !instance.isOpen()) return;
      e.preventDefault();

      const focusable = Array.from(el.querySelectorAll<HTMLElement>(focusable selectors));
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
    // Store for cleanup
    (instance as unknown as Record<string, unknown>)._focusHandler = handler;
  }
}

// --- Singleton ---

let defaultManager: ModalManager | null = null;

/** Get or create the global ModalManager singleton */
export function getModalManager(options?: Partial<ModalOptions>): ModalManager {
  if (!defaultManager) defaultManager = new ModalManager(options);
  return defaultManager;
}

// --- Utilities ---

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
